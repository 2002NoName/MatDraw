import type { AppConfig } from '../src/config.js';

export const testConfig = (overrides: Partial<AppConfig> = {}): AppConfig => ({
  port: 0,
  store: 'memory',
  jwtSecret: 'test-secret-test-secret-test-secret-123',
  jwtExpiresIn: '7d',
  tutorRegistrationSecret: 'tutor-secret',
  corsOrigins: ['http://localhost:5173'],
  clientDist: null,
  stunUrls: ['stun:stun.example.org:3478'],
  turnUrls: [],
  turnSecret: null,
  turnUsername: null,
  turnCredential: null,
  turnTtl: 3600,
  ...overrides,
});
