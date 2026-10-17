import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { normalizeInviteCode } from '@matdraw/shared';
import type { AppDeps } from '../app.js';
import { requireAuth, requireRole, toPublicUser } from '../auth/auth.js';
import { HttpError, notFound } from '../errors.js';
import { buildIceConfig } from '../services/turn.js';
import { summarizeBoards } from './boards.js';
import { parse } from './validate.js';

const JoinSchema = z.object({ code: z.string().min(4).max(32) });

/** Dołączanie do tablicy kodem, konfiguracja ICE, lista uczniów. */
export function miscRouter({ store, config }: AppDeps) {
  const r = Router();
  const auth = requireAuth(store, config.jwtSecret);
  const joinLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });

  r.post('/join', joinLimiter, auth, async (req, res) => {
    const code = normalizeInviteCode(parse(JoinSchema, req.body).code);
    const user = req.user!;
    const invite = await store.findInviteByCode(code);
    const invalid = new HttpError(404, 'Kod jest nieprawidłowy, wygasł lub został wykorzystany');
    if (!invite || invite.revoked) throw invalid;
    const board = await store.findBoard(invite.boardId);
    if (!board) throw invalid;

    const alreadyMember = user.role === 'TUTOR' || (await store.findMember(board.id, user.id)) !== null;
    if (!alreadyMember) {
      if (!(await store.consumeInvite(invite.id, new Date()))) throw invalid;
      await store.upsertMember(board.id, user.id, true);
    }
    const [summary] = await summarizeBoards(store, [board], user);
    res.json(summary);
  });

  r.get('/rtc/ice', auth, (req, res) => {
    res.json(buildIceConfig(config, req.user!.id));
  });

  r.get('/users', auth, requireRole('TUTOR'), async (req, res) => {
    const role = req.query.role === 'TUTOR' || req.query.role === 'STUDENT' ? req.query.role : undefined;
    res.json((await store.listUsers(role)).map(toPublicUser));
  });

  r.use((_req, _res, next) => next(notFound('Nieznany endpoint')));
  return r;
}
