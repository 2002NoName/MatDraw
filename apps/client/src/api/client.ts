import type {
  AuthResponse,
  BoardDetails,
  BoardMemberInfo,
  BoardSummary,
  DevStatsResponse,
  IceConfigResponse,
  InviteInfo,
  PublicUser,
  Role,
  UpdateAccountRequest,
} from '@matdraw/shared';

const TOKEN_KEY = 'matdraw.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'Brak połączenia z serwerem');
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(res.status, data.error ?? `Błąd ${res.status}`);
  }
  return data as T;
}

export const api = {
  register: (data: { email: string; password: string; name: string; displayName?: string; role: Role; tutorSecret?: string }) =>
    request<AuthResponse>('POST', '/auth/register', data),
  login: (email: string, password: string) => request<AuthResponse>('POST', '/auth/login', { email, password }),
  me: () => request<PublicUser>('GET', '/auth/me'),
  updateAccount: (data: UpdateAccountRequest) => request<AuthResponse>('PATCH', '/auth/me', data),

  listBoards: () => request<BoardSummary[]>('GET', '/boards'),
  createBoard: (title: string) => request<BoardSummary>('POST', '/boards', { title }),
  duplicateBoard: (id: string) => request<BoardSummary>('POST', `/boards/${id}/duplicate`),
  getBoard: (id: string) => request<BoardDetails>('GET', `/boards/${id}`),
  renameBoard: (id: string, title: string) => request<BoardSummary>('PATCH', `/boards/${id}`, { title }),
  deleteBoard: (id: string) => request<void>('DELETE', `/boards/${id}`),
  leaveBoard: (id: string) => request<void>('POST', `/boards/${id}/leave`),

  createInvite: (id: string, opts: { label?: string; expiresInHours?: number | null; maxUses?: number | null }) =>
    request<InviteInfo>('POST', `/boards/${id}/invites`, opts),
  revokeInvite: (id: string, inviteId: string) => request<void>('DELETE', `/boards/${id}/invites/${inviteId}`),

  addMember: (id: string, email: string, canEdit = true) => request<BoardMemberInfo>('POST', `/boards/${id}/members`, { email, canEdit }),
  setMemberEdit: (id: string, userId: string, canEdit: boolean) =>
    request<BoardMemberInfo>('PATCH', `/boards/${id}/members/${userId}`, { canEdit }),
  removeMember: (id: string, userId: string) => request<void>('DELETE', `/boards/${id}/members/${userId}`),

  join: (code: string) => request<BoardSummary>('POST', '/join', { code }),
  ice: () => request<IceConfigResponse>('GET', '/rtc/ice'),
  devStats: () => request<DevStatsResponse>('GET', '/dev/stats'),
};
