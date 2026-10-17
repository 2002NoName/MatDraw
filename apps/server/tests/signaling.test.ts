import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import * as Y from 'yjs';
import request from 'supertest';
import type { AddressInfo } from 'node:net';
import { STUDENT_COLORS, TUTOR_COLORS, type ServerToClient } from '@matdraw/shared';
import { MemoryStore } from '../src/store/memoryStore.js';
import { startServer } from '../src/server.js';
import { testConfig } from './helpers.js';

type Started = Awaited<ReturnType<typeof startServer>>;
let srv: Started;
let store: MemoryStore;
let base: string;

class Client {
  ws: WebSocket;
  messages: ServerToClient[] = [];
  private waiters: Array<{ type: string; resolve: (m: ServerToClient) => void }> = [];
  closed: Promise<number>;

  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.ws.on('message', (d) => {
      const m = JSON.parse(d.toString()) as ServerToClient;
      const idx = this.waiters.findIndex((w) => w.type === m.type);
      if (idx >= 0) this.waiters.splice(idx, 1)[0]!.resolve(m);
      else this.messages.push(m);
    });
    this.closed = new Promise((r) => this.ws.on('close', (code) => r(code)));
  }

  open() {
    return new Promise<void>((r) => this.ws.once('open', () => r()));
  }

  send(m: unknown) {
    this.ws.send(JSON.stringify(m));
  }

  next<T extends ServerToClient['type']>(type: T, timeout = 3000): Promise<Extract<ServerToClient, { type: T }>> {
    const idx = this.messages.findIndex((m) => m.type === type);
    if (idx >= 0) return Promise.resolve(this.messages.splice(idx, 1)[0] as Extract<ServerToClient, { type: T }>);
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`timeout waiting for ${type}`)), timeout);
      this.waiters.push({ type, resolve: (m) => (clearTimeout(t), resolve(m as Extract<ServerToClient, { type: T }>)) });
    });
  }
}

async function register(email: string, role: 'TUTOR' | 'STUDENT') {
  const res = await request(base)
    .post('/api/auth/register')
    .send({ email, password: 'password123', name: email, role, tutorSecret: 'tutor-secret' });
  return res.body as { token: string; user: { id: string } };
}

beforeEach(async () => {
  store = new MemoryStore();
  srv = await startServer(testConfig(), store);
  base = `http://127.0.0.1:${(srv.server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  await srv.stop();
});

describe('sygnalizacja WebSocket', () => {
  it('łączy uczestników, przekazuje sygnały, zapisuje dokument i wyrzuca usuniętego ucznia', async () => {
    const tutor = await register('t@example.com', 'TUTOR');
    const student = await register('s@example.com', 'STUDENT');
    const board = (await request(base).post('/api/boards').set('Authorization', `Bearer ${tutor.token}`).send({ title: 'X' })).body;
    const invite = (await request(base).post(`/api/boards/${board.id}/invites`).set('Authorization', `Bearer ${tutor.token}`).send({})).body;
    await request(base).post('/api/join').set('Authorization', `Bearer ${student.token}`).send({ code: invite.code });

    const wsUrl = base.replace('http', 'ws') + '/ws';
    const a = new Client(wsUrl);
    await a.open();
    a.send({ type: 'join', boardId: board.id, token: tutor.token });
    const joinedA = await a.next('joined');
    expect(joinedA.peers).toHaveLength(0);

    const b = new Client(wsUrl);
    await b.open();
    b.send({ type: 'join', boardId: board.id, token: student.token });
    const joinedB = await b.next('joined');
    expect(joinedB.peers.map((p) => p.peerId)).toEqual([joinedA.selfId]);
    expect(joinedB.self.color).not.toBe(joinedA.self.color);
    expect(joinedA.self.color).toBe(TUTOR_COLORS[0]);
    expect(joinedB.self.color).toBe(STUDENT_COLORS[0]);
    const pj = await a.next('peer-joined');
    expect(pj.peer.userId).toBe(student.user.id);

    // przekazywanie sygnałów WebRTC
    b.send({ type: 'signal', to: joinedA.selfId, payload: { kind: 'description', description: { type: 'offer', sdp: 'x' } } });
    const sig = await a.next('signal');
    expect(sig.from).toBe(joinedB.selfId);

    // aktualizacja dokumentu + przekazanie (fallback bez P2P)
    const doc = new Y.Doc();
    doc.getMap('elements').set('e1', { id: 'e1', type: 'text', text: 'hi' });
    const update = Buffer.from(Y.encodeStateAsUpdate(doc)).toString('base64');
    b.send({ type: 'doc-update', update, relayTo: [joinedA.selfId] });
    const relayed = await a.next('doc-update');
    expect(relayed.from).toBe(joinedB.selfId);

    // dane efemeryczne (kursor) przez serwer, gdy brak P2P
    b.send({ type: 'ephemeral', to: [joinedA.selfId], data: JSON.stringify({ t: 'cursor', x: 1, y: 2 }) });
    const eph = await a.next('ephemeral');
    expect(eph.from).toBe(joinedB.selfId);
    expect(JSON.parse(eph.data)).toEqual({ t: 'cursor', x: 1, y: 2 });

    // panel developera widzi pokój, uczestników i liczniki przekazywania
    const stats = await request(base).get('/api/dev/stats').set('Authorization', `Bearer ${tutor.token}`);
    expect(stats.status).toBe(200);
    expect(stats.body.realtime).toMatchObject({ connectionsOpen: 2, signalsRelayed: 1, docUpdatesRelayed: 1, ephemeralRelayed: 1 });
    const room = stats.body.rooms.find((r: { boardId: string }) => r.boardId === board.id);
    expect(room.title).toBe('X');
    expect(room.peers).toHaveLength(2);
    expect(room.peers.find((p: { userId: string }) => p.userId === tutor.user.id).relayedToPeer).toBe(1);
    expect((await request(base).get('/api/dev/stats').set('Authorization', `Bearer ${student.token}`)).status).toBe(403);

    // wyrzucenie ucznia
    await request(base).delete(`/api/boards/${board.id}/members/${student.user.id}`).set('Authorization', `Bearer ${tutor.token}`);
    expect((await b.next('kicked')).reason).toMatch(/usunęła/);
    expect(await b.closed).toBe(4004);
    expect((await a.next('peer-left')).peerId).toBe(joinedB.selfId);

    // po rozłączeniu wszystkich stan trafia do magazynu
    a.ws.close();
    await a.closed;
    await new Promise((r) => setTimeout(r, 50));
    const saved = await store.loadBoardState(board.id);
    const restored = new Y.Doc();
    Y.applyUpdate(restored, saved!);
    expect(restored.getMap('elements').get('e1')).toMatchObject({ text: 'hi' });

    // ponowne wejście zwraca zapisany stan
    const c = new Client(wsUrl);
    await c.open();
    c.send({ type: 'join', boardId: board.id, token: tutor.token });
    const joinedC = await c.next('joined');
    const d2 = new Y.Doc();
    Y.applyUpdate(d2, new Uint8Array(Buffer.from(joinedC.state, 'base64')));
    expect(d2.getMap('elements').size).toBe(1);
    c.ws.close();
  });

  it('odrzuca ucznia bez członkostwa i blokuje zapis w trybie tylko do odczytu', async () => {
    const tutor = await register('t@example.com', 'TUTOR');
    const student = await register('s@example.com', 'STUDENT');
    const board = (await request(base).post('/api/boards').set('Authorization', `Bearer ${tutor.token}`).send({ title: 'X' })).body;
    const wsUrl = base.replace('http', 'ws') + '/ws';

    const outsider = new Client(wsUrl);
    await outsider.open();
    outsider.send({ type: 'join', boardId: board.id, token: student.token });
    expect((await outsider.next('error')).message).toMatch(/dostępu/);
    expect(await outsider.closed).toBe(4003);

    await request(base).post(`/api/boards/${board.id}/members`).set('Authorization', `Bearer ${tutor.token}`).send({ email: 's@example.com', canEdit: false });
    const ro = new Client(wsUrl);
    await ro.open();
    ro.send({ type: 'join', boardId: board.id, token: student.token });
    expect((await ro.next('joined')).self.canEdit).toBe(false);
    const doc = new Y.Doc();
    doc.getMap('elements').set('x', 1);
    ro.send({ type: 'doc-update', update: Buffer.from(Y.encodeStateAsUpdate(doc)).toString('base64') });
    expect((await ro.next('error')).message).toMatch(/odczytu/);

    // nadanie uprawnień w trakcie sesji
    await request(base).patch(`/api/boards/${board.id}/members/${student.user.id}`).set('Authorization', `Bearer ${tutor.token}`).send({ canEdit: true });
    expect((await ro.next('peer-updated')).peer.canEdit).toBe(true);
    ro.ws.close();
  });
});
