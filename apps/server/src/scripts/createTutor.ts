/**
 * Zakłada konto korepetytorki (lub zmienia rolę istniejącego konta nie jest wspierane – tylko nowe konta).
 * Użycie: npm run create-tutor -w @matdraw/server -- <email> <hasło> "<Imię Nazwisko>"
 */
import 'dotenv/config';
import { loadConfig } from '../config.js';
import { createStore } from '../server.js';
import { hashPassword } from '../auth/auth.js';

const [email, password, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(' ').trim();

if (!email || !password || password.length < 8 || name.length < 2) {
  console.error('Użycie: npm run create-tutor -- <email> <hasło (min. 8 znaków)> "<Imię Nazwisko>"');
  process.exit(1);
}

const config = loadConfig();
const store = await createStore(config);
try {
  const normalized = email.trim().toLowerCase();
  if (await store.findUserByEmail(normalized)) {
    console.error(`Konto ${normalized} już istnieje.`);
    process.exitCode = 1;
  } else {
    const user = await store.createUser({ email: normalized, name, displayName: name.slice(0, 60), role: 'TUTOR', passwordHash: await hashPassword(password) });
    console.log(`Utworzono konto korepetytorki: ${user.email} (id: ${user.id})`);
  }
} finally {
  await store.close();
}
