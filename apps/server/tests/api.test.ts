import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import * as Y from 'yjs';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/memoryStore.js';
import { BoardStateManager } from '../src/services/boardState.js';
import { noopHub, type BoardHub } from '../src/services/hub.js';
import { testConfig } from './helpers.js';

let app: Express;
let hub: { [K in keyof BoardHub]: ReturnType<typeof vi.fn> };
let store: MemoryStore;

async function register(email: string, role: 'TUTOR' | 'STUDENT' = 'STUDENT') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123', name: email.split('@')[0], role, tutorSecret: role === 'TUTOR' ? 'tutor-secret' : undefined });
  expect(res.status).toBe(201);
  return { token: res.body.token as string, user: res.body.user as { id: string } };
}

beforeEach(() => {
  store = new MemoryStore();
  hub = { kickUser: vi.fn(), boardDeleted: vi.fn(), memberUpdated: vi.fn(), realtimeStats: vi.fn(() => noopHub.realtimeStats()) };
  app = createApp({ store, config: testConfig(), hub, state: new BoardStateManager(store, 10) });
});

describe('auth', () => {
  it('rejestruje ucznia i loguje', async () => {
    await register('ala@example.com');
    const login = await request(app).post('/api/auth/login').send({ email: 'ALA@example.com', password: 'password123' });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe('STUDENT');
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`);
    expect(me.body.email).toBe('ala@example.com');
    expect(me.body.passwordHash).toBeUndefined();
  });

  it('odrzuca złe hasło i duplikat e-mail', async () => {
    await register('ala@example.com');
    const bad = await request(app).post('/api/auth/login').send({ email: 'ala@example.com', password: 'nope' });
    expect(bad.status).toBe(401);
    const dup = await request(app).post('/api/auth/register').send({ email: 'ala@example.com', password: 'password123', name: 'Ala' });
    expect(dup.status).toBe(409);
  });

  it('wymaga sekretu do rejestracji korepetytorki', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 't@example.com', password: 'password123', name: 'Tutor', role: 'TUTOR', tutorSecret: 'wrong' });
    expect(res.status).toBe(403);
  });

  it('odrzuca żądania bez tokenu', async () => {
    expect((await request(app).get('/api/boards')).status).toBe(401);
    expect((await request(app).get('/api/boards').set('Authorization', 'Bearer garbage')).status).toBe(401);
  });
});

describe('edycja konta', () => {
  const patch = (token: string, body: object) => request(app).patch('/api/auth/me').set('Authorization', 'Bearer ' + token).send(body);

  it('domyślna widoczna nazwa = imię i nazwisko', async () => {
    const { user } = await register('ala@example.com');
    expect((user as { displayName?: string }).displayName).toBe('ala');
  });

  it('zmienia widoczną nazwę oraz imię i nazwisko bez hasła (uczeń i korepetytorka)', async () => {
    for (const [email, role] of [['uczen@example.com', 'STUDENT'], ['tutor@example.com', 'TUTOR']] as const) {
      const { token } = await register(email, role);
      const res = await patch(token, { displayName: '  Pani W.  ', name: 'Weronika Janeczek' });
      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ displayName: 'Pani W.', name: 'Weronika Janeczek', email, role });
      expect(res.body.token).toEqual(expect.any(String));
    }
  });

  it('zmiana e-maila i hasła wymaga poprawnego obecnego hasła', async () => {
    const { token } = await register('ala@example.com');
    expect((await patch(token, { email: 'nowy@example.com' })).status).toBe(403);
    expect((await patch(token, { newPassword: 'nowehaslo123', currentPassword: 'zle-haslo' })).status).toBe(403);
    expect((await patch(token, { newPassword: 'krotkie', currentPassword: 'password123' })).status).toBe(400);

    const ok = await patch(token, { email: 'Nowy@Example.com', newPassword: 'nowehaslo123', currentPassword: 'password123' });
    expect(ok.status).toBe(200);
    expect(ok.body.user.email).toBe('nowy@example.com');
    const login = (email: string, password: string) => request(app).post('/api/auth/login').send({ email, password });
    expect((await login('ala@example.com', 'password123')).status).toBe(401);
    expect((await login('nowy@example.com', 'password123')).status).toBe(401);
    expect((await login('nowy@example.com', 'nowehaslo123')).status).toBe(200);
  });

  it('nie pozwala przejąć zajętego e-maila', async () => {
    await register('zajety@example.com');
    const { token } = await register('ala@example.com');
    expect((await patch(token, { email: 'zajety@example.com', currentPassword: 'password123' })).status).toBe(409);
  });

  it('widoczna nazwa jest pokazywana na liście uczestników tablicy', async () => {
    const tutor = await register('tutorka@example.com', 'TUTOR');
    const student = await register('kasia@example.com');
    await patch(student.token, { displayName: 'Kasia' });
    const auth = 'Bearer ' + tutor.token;
    const board = await request(app).post('/api/boards').set('Authorization', auth).send({ title: 'T' });
    await request(app).post(`/api/boards/${board.body.id}/members`).set('Authorization', auth).send({ email: 'kasia@example.com' });
    const details = await request(app).get(`/api/boards/${board.body.id}`).set('Authorization', auth);
    expect(details.body.members[0]).toMatchObject({ displayName: 'Kasia', name: 'kasia' });
  });
});

describe('tablice, kody i uczestnicy', () => {
  it('duplikuje zawartość i tło bez uczestników ani kodów zaproszeń', async () => {
    const tutor = await register('duplicate@example.com', 'TUTOR');
    const student = await register('member@example.com');
    const auth = { Authorization: `Bearer ${tutor.token}` };
    const original = (await request(app).post('/api/boards').set(auth).send({ title: 'Algebra' })).body;
    await request(app).post(`/api/boards/${original.id}/members`).set(auth).send({ email: 'member@example.com' });
    await request(app).post(`/api/boards/${original.id}/invites`).set(auth).send({});

    const source = new Y.Doc();
    source.getMap('elements').set('sample', { type: 'text', text: 'zawartość' });
    source.getMap('meta').set('background', 'dots');
    await store.saveBoardState(original.id, Y.encodeStateAsUpdate(source));
    source.destroy();

    const first = await request(app).post(`/api/boards/${original.id}/duplicate`).set(auth).send();
    expect(first.status).toBe(201);
    expect(first.body.title).toBe('Algebra duplikat 1');
    expect(first.body.ownerId).toBe(tutor.user.id);
    expect(first.body.memberCount).toBe(0);
    expect((await request(app).post(`/api/boards/${original.id}/duplicate`).set({ Authorization: `Bearer ${student.token}` }).send()).status).toBe(403);

    const copied = await store.loadBoardState(first.body.id);
    expect(copied).not.toBeNull();
    const clone = new Y.Doc();
    Y.applyUpdate(clone, copied!);
    expect(clone.getMap('elements').get('sample')).toEqual({ type: 'text', text: 'zawartość' });
    expect(clone.getMap('meta').get('background')).toBe('dots');
    clone.destroy();

    const second = await request(app).post(`/api/boards/${original.id}/duplicate`).set(auth).send();
    expect(second.body.title).toBe('Algebra duplikat 2');
    expect((await request(app).get(`/api/boards/${second.body.id}`).set(auth)).body.invites).toEqual([]);
    expect((await request(app).get(`/api/boards/${first.body.id}`).set({ Authorization: `Bearer ${student.token}` })).status).toBe(403);
  });

  it('pełny scenariusz: tworzenie, zaproszenie, dołączenie, uprawnienia, usunięcie', async () => {
    const tutor = await register('tutor@example.com', 'TUTOR');
    const s1 = await register('s1@example.com');
    const s2 = await register('s2@example.com');
    const T = { Authorization: `Bearer ${tutor.token}` };
    const S1 = { Authorization: `Bearer ${s1.token}` };
    const S2 = { Authorization: `Bearer ${s2.token}` };

    expect((await request(app).post('/api/boards').set(S1).send({ title: 'x' })).status).toBe(403);
    const board = (await request(app).post('/api/boards').set(T).send({ title: 'Algebra' })).body;
    expect(board.title).toBe('Algebra');

    // uczeń nie widzi tablicy przed dołączeniem
    expect((await request(app).get('/api/boards').set(S1)).body).toHaveLength(0);
    expect((await request(app).get(`/api/boards/${board.id}`).set(S1)).status).toBe(403);

    const invite = (await request(app).post(`/api/boards/${board.id}/invites`).set(T).send({ maxUses: 1, label: 'Ala' })).body;
    expect(invite.code).toMatch(/^[A-Z2-9]{8}$/);

    const formatted = `${invite.code.slice(0, 4).toLowerCase()}-${invite.code.slice(4)}`;
    const join = await request(app).post('/api/join').set(S1).send({ code: formatted });
    expect(join.status).toBe(200);
    expect(join.body.id).toBe(board.id);

    // ponowne użycie przez tego samego ucznia nie zużywa limitu
    expect((await request(app).post('/api/join').set(S1).send({ code: invite.code })).status).toBe(200);
    // limit 1 wyczerpany dla innego ucznia
    expect((await request(app).post('/api/join').set(S2).send({ code: invite.code })).status).toBe(404);

    // drugi kod dla drugiej osoby
    const invite2 = (await request(app).post(`/api/boards/${board.id}/invites`).set(T).send({})).body;
    expect((await request(app).post('/api/join').set(S2).send({ code: invite2.code })).status).toBe(200);

    const details = (await request(app).get(`/api/boards/${board.id}`).set(T)).body;
    expect(details.members.map((m: { email: string }) => m.email)).toEqual(['s1@example.com', 's2@example.com']);
    expect(details.invites).toHaveLength(2);
    // uczeń nie widzi kodów
    expect((await request(app).get(`/api/boards/${board.id}`).set(S1)).body.invites).toBeUndefined();
    // uczeń nie może zarządzać
    expect((await request(app).delete(`/api/boards/${board.id}/members/${s2.user.id}`).set(S1)).status).toBe(403);
    expect((await request(app).post(`/api/boards/${board.id}/invites`).set(S1).send({})).status).toBe(403);

    // tylko do odczytu
    const patched = await request(app).patch(`/api/boards/${board.id}/members/${s1.user.id}`).set(T).send({ canEdit: false });
    expect(patched.body.canEdit).toBe(false);
    expect(hub.memberUpdated).toHaveBeenCalledWith(board.id, s1.user.id, false);
    expect((await request(app).get('/api/boards').set(S1)).body[0].canEdit).toBe(false);

    // unieważnienie kodu
    expect((await request(app).delete(`/api/boards/${board.id}/invites/${invite2.id}`).set(T)).status).toBe(204);
    const s3 = await register('s3@example.com');
    expect((await request(app).post('/api/join').set({ Authorization: `Bearer ${s3.token}` }).send({ code: invite2.code })).status).toBe(404);

    // usunięcie ucznia
    expect((await request(app).delete(`/api/boards/${board.id}/members/${s2.user.id}`).set(T)).status).toBe(204);
    expect(hub.kickUser).toHaveBeenCalledWith(board.id, s2.user.id, expect.any(String));
    expect((await request(app).get(`/api/boards/${board.id}`).set(S2)).status).toBe(403);
    expect((await request(app).get('/api/boards').set(S2)).body).toHaveLength(0);

    // dodanie ucznia po e-mailu
    const added = await request(app).post(`/api/boards/${board.id}/members`).set(T).send({ email: 's2@example.com' });
    expect(added.status).toBe(201);
    expect((await request(app).get('/api/boards').set(S2)).body).toHaveLength(1);

    // uczeń opuszcza tablicę
    expect((await request(app).post(`/api/boards/${board.id}/leave`).set(S2)).status).toBe(204);
    expect((await request(app).get('/api/boards').set(S2)).body).toHaveLength(0);

    // usunięcie tablicy
    expect((await request(app).delete(`/api/boards/${board.id}`).set(T)).status).toBe(204);
    expect(hub.boardDeleted).toHaveBeenCalledWith(board.id);
    expect((await request(app).get(`/api/boards/${board.id}`).set(T)).status).toBe(404);
  });

  it('korepetytorka widzi wszystkie tablice, także innych korepetytorek', async () => {
    const t1 = await register('t1@example.com', 'TUTOR');
    const t2 = await register('t2@example.com', 'TUTOR');
    await request(app).post('/api/boards').set({ Authorization: `Bearer ${t1.token}` }).send({ title: 'A' });
    const list = await request(app).get('/api/boards').set({ Authorization: `Bearer ${t2.token}` });
    expect(list.body).toHaveLength(1);
    expect(list.body[0].canEdit).toBe(true);
  });

  it('kod z datą ważności wygasa', async () => {
    const tutor = await register('tutor@example.com', 'TUTOR');
    const s1 = await register('s1@example.com');
    const T = { Authorization: `Bearer ${tutor.token}` };
    const board = (await request(app).post('/api/boards').set(T).send({ title: 'B' })).body;
    const invite = (await request(app).post(`/api/boards/${board.id}/invites`).set(T).send({ expiresInHours: 1 })).body;
    vi.useFakeTimers({ now: Date.now() + 2 * 3600_000, toFake: ['Date'] });
    try {
      const res = await request(app).post('/api/join').set({ Authorization: `Bearer ${s1.token}` }).send({ code: invite.code });
      expect(res.status).toBe(404);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('ICE', () => {
  it('zwraca serwery STUN', async () => {
    const t = await register('student@example.com');
    const res = await request(app).get('/api/rtc/ice').set({ Authorization: `Bearer ${t.token}` });
    expect(res.body.iceServers[0].urls).toEqual(['stun:stun.example.org:3478']);
  });
});

describe('panel developera', () => {
  it('statystyki tylko dla korepetytorki, bez sekretów TURN', async () => {
    const tutor = await register('tutor@example.com', 'TUTOR');
    const student = await register('student@example.com');
    const ok = await request(app).get('/api/dev/stats').set('Authorization', 'Bearer ' + tutor.token);
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ store: 'memory', loadedDocs: 0, rooms: [], realtime: { connectionsOpen: 0 } });
    expect(ok.body.ice.stunUrls).toEqual(['stun:stun.example.org:3478']);
    expect(JSON.stringify(ok.body)).not.toMatch(/credential|secret"/i);
    expect(hub.realtimeStats).toHaveBeenCalled();
    expect((await request(app).get('/api/dev/stats').set('Authorization', 'Bearer ' + student.token)).status).toBe(403);
    expect((await request(app).get('/api/dev/stats')).status).toBe(401);
  });
});