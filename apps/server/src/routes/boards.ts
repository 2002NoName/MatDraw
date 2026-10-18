import { Router, type Request } from 'express';
import { z } from 'zod';
import type { BoardDetails, BoardMemberInfo, BoardSummary, InviteInfo } from '@matdraw/shared';
import type { AppDeps } from '../app.js';
import { requireAuth, requireRole } from '../auth/auth.js';
import { badRequest, forbidden, notFound } from '../errors.js';
import { resolveBoardAccess } from '../services/access.js';
import { generateInviteCode } from '../services/inviteCode.js';
import type { BoardRecord, InviteRecord, MemberWithUser, Store, UserRecord } from '../store/types.js';
import { parse } from './validate.js';

const TitleSchema = z.object({ title: z.string().trim().min(1, 'Podaj nazwę tablicy').max(200) });
const InviteSchema = z.object({
  label: z.string().trim().max(120).optional(),
  expiresInHours: z.number().positive().max(24 * 365).nullable().optional(),
  maxUses: z.number().int().positive().max(1000).nullable().optional(),
});
const MemberPatchSchema = z.object({ canEdit: z.boolean() });
const AddMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('Nieprawidłowy e-mail'),
  canEdit: z.boolean().default(true),
});

export function toInviteInfo(i: InviteRecord): InviteInfo {
  return {
    id: i.id,
    code: i.code,
    boardId: i.boardId,
    label: i.label,
    createdAt: i.createdAt.toISOString(),
    expiresAt: i.expiresAt?.toISOString() ?? null,
    maxUses: i.maxUses,
    uses: i.uses,
    revoked: i.revoked,
  };
}

function toMemberInfo(m: MemberWithUser): BoardMemberInfo {
  return {
    userId: m.userId,
    name: m.user.name,
    displayName: m.user.displayName,
    email: m.user.email,
    role: m.user.role,
    canEdit: m.canEdit,
    joinedAt: m.joinedAt.toISOString(),
  };
}

export async function summarizeBoards(store: Store, boards: BoardRecord[], viewer: UserRecord): Promise<BoardSummary[]> {
  const counts = await store.countMembers(boards.map((b) => b.id));
  const ownerNames = new Map<string, string>();
  for (const id of new Set(boards.map((b) => b.ownerId))) {
    ownerNames.set(id, (await store.findUserById(id))?.displayName ?? '—');
  }
  const out: BoardSummary[] = [];
  for (const b of boards) {
    let canEdit = viewer.role === 'TUTOR';
    if (!canEdit) canEdit = (await store.findMember(b.id, viewer.id))?.canEdit ?? false;
    out.push({
      id: b.id,
      title: b.title,
      ownerId: b.ownerId,
      ownerName: ownerNames.get(b.ownerId) ?? '—',
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
      memberCount: counts.get(b.id) ?? 0,
      canEdit,
    });
  }
  return out;
}

export function boardsRouter(deps: AppDeps) {
  const { store, config, hub, state } = deps;
  const r = Router();
  r.use(requireAuth(store, config.jwtSecret));
  const tutorOnly = requireRole('TUTOR');

  const access = async (req: Request) => {
    const a = await resolveBoardAccess(store, req.user!, String(req.params.id));
    if (!a) throw notFound('Tablica nie istnieje');
    if (!a.canView) throw forbidden('Nie masz dostępu do tej tablicy');
    return a;
  };

  r.get('/', async (req, res) => {
    const user = req.user!;
    const boards = user.role === 'TUTOR' ? await store.listAllBoards() : await store.listBoardsForMember(user.id);
    res.json(await summarizeBoards(store, boards, user));
  });

  r.post('/', tutorOnly, async (req, res) => {
    const { title } = parse(TitleSchema, req.body);
    const board = await store.createBoard({ title, ownerId: req.user!.id });
    const [summary] = await summarizeBoards(store, [board], req.user!);
    res.status(201).json(summary);
  });

  r.post('/:id/duplicate', tutorOnly, async (req, res) => {
    const a = await access(req);
    const existingTitles = new Set((await store.listAllBoards()).map((board) => board.title));
    let index = 1;
    let title = '';
    do {
      const suffix = ` duplikat ${index++}`;
      title = `${a.board.title.slice(0, 200 - suffix.length).trimEnd()}${suffix}`;
    } while (existingTitles.has(title));

    const board = await store.createBoard({ title, ownerId: req.user!.id });
    try {
      await store.saveBoardState(board.id, await state.getState(a.board.id));
    } catch (error) {
      await store.deleteBoard(board.id);
      throw error;
    }
    const [summary] = await summarizeBoards(store, [board], req.user!);
    res.status(201).json(summary);
  });

  r.get('/:id', async (req, res) => {
    const a = await access(req);
    const [summary] = await summarizeBoards(store, [a.board], req.user!);
    const members = (await store.listMembers(a.board.id)).map(toMemberInfo);
    const details: BoardDetails = { ...summary!, members };
    if (a.canManage) details.invites = (await store.listInvites(a.board.id)).map(toInviteInfo);
    res.json(details);
  });

  r.patch('/:id', tutorOnly, async (req, res) => {
    const a = await access(req);
    const { title } = parse(TitleSchema, req.body);
    const updated = await store.updateBoard(a.board.id, { title });
    const [summary] = await summarizeBoards(store, [updated], req.user!);
    res.json(summary);
  });

  r.delete('/:id', tutorOnly, async (req, res) => {
    const a = await access(req);
    hub.boardDeleted(a.board.id);
    state.discard(a.board.id);
    await store.deleteBoard(a.board.id);
    res.status(204).end();
  });

  // --- Kody zaproszeń ---
  r.post('/:id/invites', tutorOnly, async (req, res) => {
    const a = await access(req);
    const body = parse(InviteSchema, req.body ?? {});
    const expiresAt = body.expiresInHours ? new Date(Date.now() + body.expiresInHours * 3600_000) : null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const invite = await store.createInvite({
          code: generateInviteCode(),
          boardId: a.board.id,
          createdById: req.user!.id,
          label: body.label || null,
          expiresAt,
          maxUses: body.maxUses ?? null,
        });
        res.status(201).json(toInviteInfo(invite));
        return;
      } catch (err) {
        if ((err as { code?: string }).code !== 'P2002') throw err;
      }
    }
    throw new Error('Nie udało się wygenerować unikalnego kodu');
  });

  r.delete('/:id/invites/:inviteId', tutorOnly, async (req, res) => {
    const a = await access(req);
    const invite = await store.findInvite(String(req.params.inviteId));
    if (!invite || invite.boardId !== a.board.id) throw notFound('Kod nie istnieje');
    await store.revokeInvite(invite.id);
    res.status(204).end();
  });

  // --- Uczestnicy ---
  r.post('/:id/members', tutorOnly, async (req, res) => {
    const a = await access(req);
    const body = parse(AddMemberSchema, req.body);
    const user = await store.findUserByEmail(body.email);
    if (!user) throw notFound('Nie znaleziono konta o tym adresie e-mail');
    if (user.role !== 'STUDENT') throw badRequest('Korepetytorki mają dostęp do wszystkich tablic – nie trzeba ich dodawać');
    await store.upsertMember(a.board.id, user.id, body.canEdit);
    const member = (await store.listMembers(a.board.id)).find((m) => m.userId === user.id)!;
    res.status(201).json(toMemberInfo(member));
  });

  r.patch('/:id/members/:userId', tutorOnly, async (req, res) => {
    const a = await access(req);
    const userId = String(req.params.userId);
    const { canEdit } = parse(MemberPatchSchema, req.body);
    if (!(await store.findMember(a.board.id, userId))) throw notFound('Uczestnik nie należy do tablicy');
    await store.updateMember(a.board.id, userId, { canEdit });
    hub.memberUpdated(a.board.id, userId, canEdit);
    const member = (await store.listMembers(a.board.id)).find((m) => m.userId === userId)!;
    res.json(toMemberInfo(member));
  });

  r.delete('/:id/members/:userId', tutorOnly, async (req, res) => {
    const a = await access(req);
    const userId = String(req.params.userId);
    const removed = await store.removeMember(a.board.id, userId);
    if (!removed) throw notFound('Uczestnik nie należy do tablicy');
    hub.kickUser(a.board.id, userId, 'Korepetytorka usunęła Cię z tej tablicy');
    res.status(204).end();
  });

  /** Uczeń opuszcza tablicę. */
  r.post('/:id/leave', async (req, res) => {
    const a = await access(req);
    if (req.user!.role === 'TUTOR') throw badRequest('Korepetytorka nie może opuścić tablicy – może ją usunąć');
    await store.removeMember(a.board.id, req.user!.id);
    hub.kickUser(a.board.id, req.user!.id, 'Opuszczono tablicę');
    res.status(204).end();
  });

  /** Pełny stan dokumentu (Yjs, binarnie) – np. do eksportu/kopii zapasowej. */
  r.get('/:id/state', async (req, res) => {
    const a = await access(req);
    const data = await state.getState(a.board.id);
    res.type('application/octet-stream').send(Buffer.from(data));
  });

  return r;
}
