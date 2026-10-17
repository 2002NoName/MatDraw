import 'dotenv/config';
import { loadConfig } from './config.js';
import { createStore, startServer } from './server.js';

const config = loadConfig();
const store = await createStore(config);
const { stop } = await startServer(config, store);
console.log(`[server] MatDraw dzia³a na http://localhost:${config.port}`);

let stopping = false;
const shutdown = async () => {
  if (stopping) return;
  stopping = true;
  console.log('[server] zamykanie…');
  await stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);