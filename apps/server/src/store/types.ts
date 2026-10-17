import type { Role } from '@matdraw/shared';

export interface UserRecord {
  id: string;
  email: string;
  /** Imię i nazwisko. */
  name: string;
  /** Nazwa widoczna dla innych uczestników. */
  displayName: string;
  role: Role;
  passwordHash: string;
  createdAt: Date;
}

export type UserUpdate = Partial<Pick<UserRecord, 'email' | 'name' | 'displayName' | 'passwordHash'>>;

export interface BoardRecord {
  id: string;
  title: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberRecord {
  boardId: string;
  userId: string;
  canEdit: boolean;
  joinedAt: Date;
}

export interface InviteRecord {
  id: string;
  code: string;
  boardId: string;
  createdById: string;
  label: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  maxUses: number | null;
  uses: number;
  revoked: boolean;
}

export interface MemberWithUser extends MemberRecord {
  user: UserRecord;
}

/**
 * Abstrakcja warstwy danych. Implementacje: PrismaStore (MySQL) i MemoryStore (testy/dev).
 */
export interface Store {
  createUser(data: Omit<UserRecord, 'id' | 'createdAt'>): Promise<UserRecord>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  /** Zmienia dane konta. Zajęty e-mail → błąd z kodem P2002. */
  updateUser(id: string, data: UserUpdate): Promise<UserRecord>;
  listUsers(role?: Role): Promise<UserRecord[]>;

  createBoard(data: { title: string; ownerId: string }): Promise<BoardRecord>;
  findBoard(id: string): Promise<BoardRecord | null>;
  updateBoard(id: string, data: { title?: string }): Promise<BoardRecord>;
  touchBoard(id: string): Promise<void>;
  deleteBoard(id: string): Promise<void>;
  listAllBoards(): Promise<BoardRecord[]>;
  listBoardsForMember(userId: string): Promise<BoardRecord[]>;

  upsertMember(boardId: string, userId: string, canEdit: boolean): Promise<MemberRecord>;
  findMember(boardId: string, userId: string): Promise<MemberRecord | null>;
  updateMember(boardId: string, userId: string, data: { canEdit: boolean }): Promise<MemberRecord>;
  removeMember(boardId: string, userId: string): Promise<boolean>;
  listMembers(boardId: string): Promise<MemberWithUser[]>;
  countMembers(boardIds: string[]): Promise<Map<string, number>>;

  createInvite(data: Omit<InviteRecord, 'id' | 'createdAt' | 'uses' | 'revoked'>): Promise<InviteRecord>;
  findInviteByCode(code: string): Promise<InviteRecord | null>;
  findInvite(id: string): Promise<InviteRecord | null>;
  listInvites(boardId: string): Promise<InviteRecord[]>;
  revokeInvite(id: string): Promise<void>;
  /** Atomowo zwiększa licznik użyć, o ile kod jest nadal ważny. Zwraca false, gdy limit/ważność zostały przekroczone. */
  consumeInvite(id: string, now: Date): Promise<boolean>;

  loadBoardState(boardId: string): Promise<Uint8Array | null>;
  saveBoardState(boardId: string, data: Uint8Array): Promise<void>;

  close(): Promise<void>;
}
