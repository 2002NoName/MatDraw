import { PrismaClient } from '@prisma/client';
import type { Role } from '@matdraw/shared';
import type { InviteRecord, Store, UserRecord, UserUpdate } from './types.js';

/** Implementacja magazynu na MySQL przez Prisma. */
export class PrismaStore implements Store {
  constructor(private prisma = new PrismaClient()) {}

  createUser(data: Omit<UserRecord, 'id' | 'createdAt'>) {
    return this.prisma.user.create({ data });
  }

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  updateUser(id: string, data: UserUpdate) {
    return this.prisma.user.update({ where: { id }, data });
  }

  listUsers(role?: Role) {
    return this.prisma.user.findMany({ where: role ? { role } : {}, orderBy: { name: 'asc' } });
  }

  createBoard(data: { title: string; ownerId: string }) {
    return this.prisma.board.create({ data });
  }

  findBoard(id: string) {
    return this.prisma.board.findUnique({ where: { id } });
  }

  updateBoard(id: string, data: { title?: string }) {
    return this.prisma.board.update({ where: { id }, data });
  }

  async touchBoard(id: string) {
    await this.prisma.board.updateMany({ where: { id }, data: { updatedAt: new Date() } });
  }

  async deleteBoard(id: string) {
    await this.prisma.board.deleteMany({ where: { id } });
  }

  listAllBoards() {
    return this.prisma.board.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  listBoardsForMember(userId: string) {
    return this.prisma.board.findMany({
      where: { members: { some: { userId } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  upsertMember(boardId: string, userId: string, canEdit: boolean) {
    return this.prisma.boardMember.upsert({
      where: { boardId_userId: { boardId, userId } },
      create: { boardId, userId, canEdit },
      update: {},
    });
  }

  findMember(boardId: string, userId: string) {
    return this.prisma.boardMember.findUnique({ where: { boardId_userId: { boardId, userId } } });
  }

  updateMember(boardId: string, userId: string, data: { canEdit: boolean }) {
    return this.prisma.boardMember.update({ where: { boardId_userId: { boardId, userId } }, data });
  }

  async removeMember(boardId: string, userId: string) {
    const r = await this.prisma.boardMember.deleteMany({ where: { boardId, userId } });
    return r.count > 0;
  }

  listMembers(boardId: string) {
    return this.prisma.boardMember.findMany({
      where: { boardId },
      include: { user: true },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async countMembers(boardIds: string[]) {
    const rows = await this.prisma.boardMember.groupBy({
      by: ['boardId'],
      where: { boardId: { in: boardIds } },
      _count: { _all: true },
    });
    const result = new Map<string, number>(boardIds.map((id) => [id, 0]));
    for (const r of rows) result.set(r.boardId, r._count._all);
    return result;
  }

  createInvite(data: Omit<InviteRecord, 'id' | 'createdAt' | 'uses' | 'revoked'>) {
    return this.prisma.invite.create({ data });
  }

  findInviteByCode(code: string) {
    return this.prisma.invite.findUnique({ where: { code } });
  }

  findInvite(id: string) {
    return this.prisma.invite.findUnique({ where: { id } });
  }

  listInvites(boardId: string) {
    return this.prisma.invite.findMany({ where: { boardId }, orderBy: { createdAt: 'desc' } });
  }

  async revokeInvite(id: string) {
    await this.prisma.invite.updateMany({ where: { id }, data: { revoked: true } });
  }

  async consumeInvite(id: string, now: Date) {
    // Warunkowa inkrementacja w jednym zapytaniu – odporna na wyścigi przy równoczesnym użyciu kodu.
    const affected = await this.prisma.$executeRaw`
      UPDATE invites SET uses = uses + 1
      WHERE id = ${id} AND revoked = false
        AND (expiresAt IS NULL OR expiresAt > ${now})
        AND (maxUses IS NULL OR uses < maxUses)`;
    return affected > 0;
  }

  async loadBoardState(boardId: string) {
    const row = await this.prisma.boardState.findUnique({ where: { boardId } });
    return row ? new Uint8Array(row.data) : null;
  }

  async saveBoardState(boardId: string, data: Uint8Array) {
    const exists = await this.prisma.board.count({ where: { id: boardId } });
    if (!exists) return;
    const buf = Buffer.from(data);
    await this.prisma.boardState.upsert({
      where: { boardId },
      create: { boardId, data: buf },
      update: { data: buf },
    });
  }

  async close() {
    await this.prisma.$disconnect();
  }
}
