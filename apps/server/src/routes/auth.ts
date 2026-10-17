import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import type { AuthResponse } from '@matdraw/shared';
import type { AppDeps } from '../app.js';
import { hashPassword, requireAuth, signToken, toPublicUser, verifyPassword } from '../auth/auth.js';
import { badRequest, conflict, forbidden, unauthorized } from '../errors.js';
import { parse } from './validate.js';

const RegisterSchema = z.object({
  email: z.string().trim().toLowerCase().email('Nieprawidłowy e-mail').max(191),
  password: z.string().min(8, 'Hasło musi mieć min. 8 znaków').max(200),
  name: z.string().trim().min(2, 'Podaj imię i nazwisko (min. 2 znaki)').max(120),
  displayName: z.string().trim().max(60).optional(),
  role: z.enum(['TUTOR', 'STUDENT']).default('STUDENT'),
  tutorSecret: z.string().optional(),
});

const UpdateAccountSchema = z.object({
  displayName: z.string().trim().min(1, 'Podaj widoczną nazwę').max(60, 'Widoczna nazwa może mieć maks. 60 znaków').optional(),
  name: z.string().trim().min(2, 'Podaj imię i nazwisko (min. 2 znaki)').max(120).optional(),
  email: z.string().trim().toLowerCase().email('Nieprawidłowy e-mail').max(191).optional(),
  newPassword: z.string().min(8, 'Nowe hasło musi mieć min. 8 znaków').max(200).optional(),
  currentPassword: z.string().max(200).optional(),
});

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export function authRouter({ store, config }: AppDeps) {
  const r = Router();
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: 'draft-7', legacyHeaders: false });

  const respond = (user: Parameters<typeof toPublicUser>[0]): AuthResponse => ({
    token: signToken(user, config.jwtSecret, config.jwtExpiresIn),
    user: toPublicUser(user),
  });

  r.post('/register', limiter, async (req, res) => {
    const body = parse(RegisterSchema, req.body);
    if (body.role === 'TUTOR') {
      if (!config.tutorRegistrationSecret) throw forbidden('Rejestracja korepetytorek jest wyłączona');
      if (body.tutorSecret !== config.tutorRegistrationSecret) throw forbidden('Nieprawidłowy kod korepetytorki');
    }
    if (await store.findUserByEmail(body.email)) throw conflict('Konto z tym adresem e-mail już istnieje');
    const user = await store.createUser({
      email: body.email,
      name: body.name,
      displayName: body.displayName || body.name.slice(0, 60),
      role: body.role,
      passwordHash: await hashPassword(body.password),
    });
    res.status(201).json(respond(user));
  });

  r.post('/login', limiter, async (req, res) => {
    const body = parse(LoginSchema, req.body);
    const user = await store.findUserByEmail(body.email);
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw unauthorized('Nieprawidłowy e-mail lub hasło');
    }
    res.json(respond(user));
  });

  r.get('/me', requireAuth(store, config.jwtSecret), (req, res) => {
    if (!req.user) throw badRequest('Brak użytkownika');
    res.json(toPublicUser(req.user));
  });

  r.patch('/me', limiter, requireAuth(store, config.jwtSecret), async (req, res) => {
    const user = req.user;
    if (!user) throw badRequest('Brak użytkownika');
    const body = parse(UpdateAccountSchema, req.body);
    const emailChanged = body.email !== undefined && body.email !== user.email;
    if (emailChanged || body.newPassword) {
      // 403 zamiast 401 – klient nie może zostać wylogowany przez pomyłkę w haśle.
      if (!body.currentPassword) throw forbidden('Podaj obecne hasło, aby zmienić e-mail lub hasło');
      if (!(await verifyPassword(body.currentPassword, user.passwordHash))) throw forbidden('Nieprawidłowe obecne hasło');
    }
    if (emailChanged && (await store.findUserByEmail(body.email!))) throw conflict('Konto z tym adresem e-mail już istnieje');
    const updated = await store.updateUser(user.id, {
      displayName: body.displayName,
      name: body.name,
      email: emailChanged ? body.email : undefined,
      passwordHash: body.newPassword ? await hashPassword(body.newPassword) : undefined,
    });
    res.json(respond(updated));
  });

  return r;
}
