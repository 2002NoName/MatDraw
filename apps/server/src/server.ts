import http from 'node:http';
import type { AppConfig } from './config.js';
import { createApp } from './app.js';
import { MemoryStore } from './store/memoryStore.js';
import type { Store } from './store/types.js';
import { BoardStateManager } from './services/boardState.js';
import { SignalingServer } from './signaling/signalingServer.js';

export async function createStore(config: AppConfig): Promise<Store> {
  if (config.store === 'memory') {
    console.warn('[server] STORE=memory – dane NIE są trwałe (tylko do developmentu)');
    return new MemoryStore();
  }
  const { PrismaStore } = await import('./store/prismaStore.js');
  return new PrismaStore();
}

export async function startServer(config: AppConfig, store: Store) {
  const state = new BoardStateManager(store);
  const signaling = new SignalingServer(store, config, state);
  const app = createApp({ store, config, hub: signaling, state });
  const server = http.createServer(app);
  signaling.attach(server, '/ws');
  await new Promise<void>((resolve) => server.listen(config.port, resolve));
  return {
    server,
    async stop() {
      await signaling.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await store.close();
    },
  };
}
