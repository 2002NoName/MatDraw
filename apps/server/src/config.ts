import { z } from 'zod';

const list = (v: string | undefined) =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  STORE: z.enum(['prisma', 'memory']).default('prisma'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET musi mieć co najmniej 32 znaki'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  TUTOR_REGISTRATION_SECRET: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),
  CLIENT_DIST: z.string().optional(),
  STUN_URLS: z.string().optional(),
  TURN_URLS: z.string().optional(),
  TURN_SECRET: z.string().optional(),
  TURN_USERNAME: z.string().optional(),
  TURN_CREDENTIAL: z.string().optional(),
  TURN_TTL: z.coerce.number().int().positive().default(86400),
});

export interface AppConfig {
  port: number;
  store: 'prisma' | 'memory';
  jwtSecret: string;
  jwtExpiresIn: string;
  tutorRegistrationSecret: string | null;
  corsOrigins: string[];
  clientDist: string | null;
  stunUrls: string[];
  turnUrls: string[];
  turnSecret: string | null;
  turnUsername: string | null;
  turnCredential: string | null;
  turnTtl: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const e = EnvSchema.parse(env);
  return {
    port: e.PORT,
    store: e.STORE,
    jwtSecret: e.JWT_SECRET,
    jwtExpiresIn: e.JWT_EXPIRES_IN,
    tutorRegistrationSecret: e.TUTOR_REGISTRATION_SECRET || null,
    corsOrigins: list(e.CORS_ORIGINS),
    clientDist: e.CLIENT_DIST || null,
    stunUrls: list(e.STUN_URLS ?? 'stun:stun.l.google.com:19302'),
    turnUrls: list(e.TURN_URLS),
    turnSecret: e.TURN_SECRET || null,
    turnUsername: e.TURN_USERNAME || null,
    turnCredential: e.TURN_CREDENTIAL || null,
    turnTtl: e.TURN_TTL,
  };
}
