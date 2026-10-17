import { randomUUID } from 'node:crypto';
import type { Role } from '@matdraw/shared';
import type { BoardRecord, InviteRecord, MemberRecord, MemberWithUser, Store, UserRecord, UserUpdate } from './types.js';

/** Magazyn w pamięci – do testów i szybkiego uruchomienia bez bazy. Dane nie są trwałe. */
export class MemoryStore implements Store {
  private users = new Map<string, UserRecord>();
  private boards = new Map<string, BoardRecord>();
  private members = new Map<string, MemberRecord>();
  private invites = new Map<string, InviteRecord>();
  private states = new Map<string, Uint8Array>();

  private key(boardId: string, userId: string) {
    return `${boardId}:${userId}`;
  }

  async createUser(data: Omit<UserRecord, 'id' | 'createdAt'>) {
    if ([...this.users.values()].some((u) => u.email === data.email)) {
      throw Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    }
    const user: UserRecord = { ...data, id: randomUUID(), createdAt: new Date() };
    this.users.set(user.id, user);
    return { ...user };
  }

  async findUserByEmail(email: string) {
    const u = [...this.users.values()].find((x) => x.email === email);
    return u ? { ...u } : null;
  }

  async findUserById(id: string) {
    const u = this.users.get(id);
    return u ? { ...u } : null;
  }

  async updateUser(id: string, data: UserUpdate) {
    const u = this.users.get(id);
    if (!u) throw new Error('User not found');
    if (data.email !== undefined && [...this.users.values()].some((x) => x.id !== id && x.email === data.email)) {
      throw Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    }
    for (const [k, v] of Object.entries(data)) if (v !== undefined) Object.assign(u, { [k]: v });
    return { ...u };
  }

  async listUsers(role?: Role) {
    return [...this.users.values()].filter((u) => !role || u.role === role).map((u) => ({ ...u }));
  }

  async createBoard(data: { title: string; ownerId: string }) {
    const now = new Date();
    const board: BoardRecord = { id: randomUUID(), title: data.title, ownerId: data.ownerId, createdAt: now, updatedAt: now };
    this.boards.set(board.id, board);
    return { ...board };
  }

  async findBoard(id: string) {
    const b = this.boards.get(id);
    return b ? { ...b } : null;
  }

  async updateBoard(id: string, data: { title?: string }) {
    const b = this.boards.get(id);
    if (!b) throw new Error('Board not found');
    if (data.title !== undefined) b.title = data.title;
    b.updatedAt = new Date();
    return { ...b };
  }

  async touchBoard(id: string) {
    const b = this.boards.get(id);
    if (b) b.updatedAt = new Date();
  }

  async deleteBoard(id: string) {
    this.boards.delete(id);
    this.states.delete(id);
    for (const [k, m] of this.members) if (m.boardId === id) this.members.delete(k);
    for (const [k, i] of this.invites) if (i.boardId === id) this.invites.delete(k);
  }

  private sortBoards(list: BoardRecord[]) {
    return list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).map((b) => ({ ...b }));
  }

  async listAllBoards() {
    return this.sortBoards([...this.boards.values()]);
  }

  async listBoardsForMember(userId: string) {
    const ids = new Set([...this.members.values()].filter((m) => m.userId === userId).map((m) => m.boardId));
    return this.sortBoards([...this.boards.values()].filter((b) => ids.has(b.id)));
  }

  async upsertMember(boardId: string, userId: string, canEdit: boolean) {
    const k = this.key(boardId, userId);
    const existing = this.members.get(k);
    if (existing) return { ...existing };
    const m: MemberRecord = { boardId, userId, canEdit, joinedAt: new Date() };
    this.members.set(k, m);
    return { ...m };
  }

  async findMember(boardId: string, userId: string) {
    const m = this.members.get(this.key(boardId, userId));
    return m ? { ...m } : null;
  }

  async updateMember(boardId: string, userId: string, data: { canEdit: boolean }) {
    const m = this.members.get(this.key(boardId, userId));
    if (!m) throw new Error('Member not found');
    m.canEdit = data.canEdit;
    return { ...m };
  }

  async removeMember(boardId: string, userId: string) {
    return this.members.delete(this.key(boardId, userId));
  }

  async listMembers(boardId: string): Promise<MemberWithUser[]> {
    return [...this.members.values()]
      .filter((m) => m.boardId === boardId)
      .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())
      .map((m) => ({ ...m, user: { ...this.users.get(m.userId)! } }));
  }

  async countMembers(boardIds: string[]) {
    const result = new Map<string, number>(boardIds.map((id) => [id, 0]));
    for (const m of this.members.values()) {
      if (result.has(m.boardId)) result.set(m.boardId, result.get(m.boardId)! + 1);
    }
    return result;
  }

  async createInvite(data: Omit<InviteRecord, 'id' | 'createdAt' | 'uses' | 'revoked'>) {
    if ([...this.invites.values()].some((i) => i.code === data.code)) {
      throw Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    }
    const inv: InviteRecord = { ...data, id: randomUUID(), createdAt: new Date(), uses: 0, revoked: false };
    this.invites.set(inv.id, inv);
    return { ...inv };
  }

  async findInviteByCode(code: string) {
    const i = [...this.invites.values()].find((x) => x.code === code);
    return i ? { ...i } : null;
  }

  async findInvite(id: string) {
    const i = this.invites.get(id);
    return i ? { ...i } : null;
  }

  async listInvites(boardId: string) {
    return [...this.invites.values()]
      .filter((i) => i.boardId === boardId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((i) => ({ ...i }));
  }

  async revokeInvite(id: string) {
    const i = this.invites.get(id);
    if (i) i.revoked = true;
  }

  async consumeInvite(id: string, now: Date) {
    const i = this.invites.get(id);
    if (!i || i.revoked) return false;
    if (i.expiresAt && i.expiresAt <= now) return false;
    if (i.maxUses !== null && i.uses >= i.maxUses) return false;
    i.uses += 1;
    return true;
  }

  async loadBoardState(boardId: string) {
    return this.states.get(boardId) ?? null;
  }

  async saveBoardState(boardId: string, data: Uint8Array) {
    if (this.boards.has(boardId)) this.states.set(boardId, data);
  }

  async close() {}
}
