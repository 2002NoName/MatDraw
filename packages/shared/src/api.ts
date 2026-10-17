export type Role = 'TUTOR' | 'STUDENT';

export interface PublicUser {
  id: string;
  email: string;
  /** Imię i nazwisko. */
  name: string;
  /** Nazwa widoczna dla innych uczestników tablicy. */
  displayName: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}

/** PATCH /api/auth/me – zmiana e-maila lub hasła wymaga podania bieżącego hasła. */
export interface UpdateAccountRequest {
  displayName?: string;
  name?: string;
  email?: string;
  newPassword?: string;
  currentPassword?: string;
}

export interface BoardSummary {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  /** Czy bieżący użytkownik może edytować tablicę. */
  canEdit: boolean;
}

export interface BoardMemberInfo {
  userId: string;
  name: string;
  displayName: string;
  email: string;
  role: Role;
  canEdit: boolean;
  joinedAt: string;
}

export interface InviteInfo {
  id: string;
  code: string;
  boardId: string;
  label: string | null;
  createdAt: string;
  expiresAt: string | null;
  maxUses: number | null;
  uses: number;
  revoked: boolean;
}

export interface BoardDetails extends BoardSummary {
  members: BoardMemberInfo[];
  /** Tylko dla korepetytorki. */
  invites?: InviteInfo[];
}

export interface IceConfigResponse {
  iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }>;
  /** Czas ważności poświadczeń TURN (sekundy). */
  ttl: number;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

/** Uczestnik połączony z serwerem sygnalizacyjnym (GET /api/dev/stats). */
export interface DevPeerStats {
  peerId: string;
  userId: string;
  name: string;
  role: Role;
  canEdit: boolean;
  color: string;
  connectedAt: string;
  lastMessageAt: string | null;
  msgsIn: number;
  msgsOut: number;
  bytesIn: number;
  bytesOut: number;
  /** Aktualizacje dokumentu, które serwer przekazał temu uczestnikowi (brak P2P). */
  relayedToPeer: number;
}

export interface DevRoomStats {
  boardId: string;
  title: string | null;
  peers: DevPeerStats[];
}

/** Liczniki serwera sygnalizacyjnego od startu procesu. */
export interface DevRealtimeTotals {
  connectionsOpened: number;
  connectionsOpen: number;
  joins: number;
  msgsIn: number;
  msgsOut: number;
  bytesIn: number;
  bytesOut: number;
  signalsRelayed: number;
  docUpdates: number;
  docUpdatesRelayed: number;
  ephemeralRelayed: number;
}

/** GET /api/dev/stats – panel developera (tylko korepetytorka). */
export interface DevStatsResponse {
  serverTime: string;
  startedAt: string;
  uptimeSec: number;
  node: string;
  platform: string;
  store: 'prisma' | 'memory';
  memory: { rss: number; heapUsed: number; heapTotal: number };
  ice: { stunUrls: string[]; turnUrls: string[]; turnAuth: 'secret' | 'static' | 'none'; turnTtl: number };
  realtime: DevRealtimeTotals;
  loadedDocs: number;
  rooms: DevRoomStats[];
}

/** Długość kodu zaproszenia (bez myślnika), alfabet bez znaków mylących (0/O, 1/I/L). */
export const INVITE_CODE_LENGTH = 8;
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Normalizuje kod wpisany przez użytkownika: wielkie litery, bez spacji i myślników. */
export function normalizeInviteCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Formatuje kod do wyświetlenia, np. ABCD-EFGH. */
export function formatInviteCode(code: string): string {
  const c = normalizeInviteCode(code);
  return c.length > 4 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}
