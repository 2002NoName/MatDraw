import { Router } from 'express';
import type { DevStatsResponse } from '@matdraw/shared';
import type { AppDeps } from '../app.js';
import { requireAuth, requireRole } from '../auth/auth.js';

const startedAt = new Date();

/** Panel developera: stan serwera sygnalizacyjnego, pokoi i konfiguracji ICE (tylko korepetytorka). */
export function devRouter({ store, config, hub, state }: AppDeps) {
  const r = Router();

  r.get('/stats', requireAuth(store, config.jwtSecret), requireRole('TUTOR'), async (_req, res) => {
    const { totals, rooms } = hub.realtimeStats();
    const titled = await Promise.all(
      rooms.map(async (room) => ({ ...room, title: (await store.findBoard(room.boardId))?.title ?? null })),
    );
    const mem = process.memoryUsage();
    const body: DevStatsResponse = {
      serverTime: new Date().toISOString(),
      startedAt: startedAt.toISOString(),
      uptimeSec: Math.round(process.uptime()),
      node: process.version,
      platform: `${process.platform}/${process.arch}`,
      store: config.store,
      memory: { rss: mem.rss, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal },
      ice: {
        stunUrls: config.stunUrls,
        turnUrls: config.turnUrls,
        turnAuth: config.turnSecret ? 'secret' : config.turnUsername && config.turnCredential ? 'static' : 'none',
        turnTtl: config.turnTtl,
      },
      realtime: totals,
      loadedDocs: state.loadedCount,
      rooms: titled,
    };
    res.json(body);
  });

  return r;
}
