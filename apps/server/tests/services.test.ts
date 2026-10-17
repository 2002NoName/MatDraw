import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { INVITE_CODE_ALPHABET } from '@matdraw/shared';
import { buildIceConfig } from '../src/services/turn.js';
import { generateInviteCode } from '../src/services/inviteCode.js';
import { testConfig } from './helpers.js';

describe('buildIceConfig', () => {
  it('generuje poświadczenia TURN REST (HMAC-SHA1)', () => {
    const cfg = testConfig({ turnUrls: ['turn:turn.example.org:3478'], turnSecret: 's3cr3t', turnTtl: 600 });
    const now = 1_700_000_000_000;
    const ice = buildIceConfig(cfg, 'user1', now);
    const turn = ice.iceServers[1]!;
    expect(turn.username).toBe(`${1_700_000_000 + 600}:user1`);
    expect(turn.credential).toBe(createHmac('sha1', 's3cr3t').update(turn.username!).digest('base64'));
  });

  it('używa stałych poświadczeń, gdy brak sekretu', () => {
    const cfg = testConfig({ turnUrls: ['turn:t:3478'], turnUsername: 'u', turnCredential: 'p' });
    expect(buildIceConfig(cfg, 'x').iceServers[1]).toEqual({ urls: ['turn:t:3478'], username: 'u', credential: 'p' });
  });

  it('pomija TURN bez poświadczeń', () => {
    expect(buildIceConfig(testConfig({ turnUrls: ['turn:t'] }), 'x').iceServers).toHaveLength(1);
  });
});

describe('generateInviteCode', () => {
  it('używa tylko dozwolonego alfabetu i ma 8 znaków', () => {
    const codes = new Set(Array.from({ length: 500 }, () => generateInviteCode()));
    expect(codes.size).toBe(500);
    for (const c of codes) {
      expect(c).toHaveLength(8);
      for (const ch of c) expect(INVITE_CODE_ALPHABET).toContain(ch);
    }
  });
});
