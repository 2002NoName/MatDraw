import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import type { PublicUser, Role } from '@matdraw/shared';
import type { Store, UserRecord } from '../store/types.js';
import { unauthorized, forbidden } from '../errors.js';

const BCRYPT_ROUNDS = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

interface TokenPayload {
  sub: string;
  role: Role;
}

export function signToken(user: { id: string; role: Role }, secret: string, expiresIn: string) {
  return jwt.sign({ role: user.role } satisfies Omit<TokenPayload, 'sub'>, secret, {
    subject: user.id,
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string, secret: string): TokenPayload | null {
  try {
    const p = jwt.verify(token, secret) as jwt.JwtPayload;
    if (typeof p.sub !== 'string' || (p.role !== 'TUTOR' && p.role !== 'STUDENT')) return null;
    return { sub: p.sub, role: p.role };
  } catch {
    return null;
  }
}

export function toPublicUser(u: UserRecord): PublicUser {
  return { id: u.id, email: u.email, name: u.name, displayName: u.displayName, role: u.role };
}

/** Pobiera użytkownika na podstawie tokenu – aktualną rolę zawsze bierzemy z bazy. */
export async function userFromToken(token: string, secret: string, store: Store) {
  const payload = verifyToken(token, secret);
  if (!payload) return null;
  return store.findUserById(payload.sub);
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: UserRecord;
  }
}

export function requireAuth(store: Store, secret: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next(unauthorized());
    const user = await userFromToken(token, secret, store);
    if (!user) return next(unauthorized('Sesja wygasła – zaloguj się ponownie'));
    req.user = user;
    next();
  };
}

export function requireRole(role: Role) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.user?.role !== role) return next(forbidden());
    next();
  };
}
