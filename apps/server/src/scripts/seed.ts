/**
 * Dane początkowe bazy MatDraw – konto korepetytorki Weroniki Janeczek.
 *
 * DOMYŚLNE DANE LOGOWANIA (opisane też w docs/WDROZENIE.md i README.md):
 *   e-mail: weronika@matdraw.weblance-devs.pl
 *   hasło:  Tablica#Matura2025
 *
 * Hasło można nadpisać przy pierwszym uruchomieniu zmienną SEED_TUTOR_PASSWORD (min. 8 znaków).
 * Skrypt jest idempotentny: jeśli konto już istnieje, nic nie zmienia (w szczególności nie resetuje hasła).
 * Nie tworzy żadnych danych demonstracyjnych (uczniów ani tablic).
 *
 * Użycie:
 *   npm run seed -w @matdraw/server          (deweloperskie, tsx)
 *   node dist/scripts/seed.js                (produkcyjne – uruchamiane automatycznie w kontenerze Docker)
 */
import 'dotenv/config';
import { loadConfig } from '../config.js';
import { createStore } from '../server.js';
import { hashPassword } from '../auth/auth.js';

const SEED_TUTOR = {
  email: 'weronika@matdraw.weblance-devs.pl',
  name: 'Weronika Janeczek',
  displayName: 'Weronika',
  defaultPassword: 'Tablica#Matura2025',
} as const;

const config = loadConfig();
const store = await createStore(config);
try {
  const existing = await store.findUserByEmail(SEED_TUTOR.email);
  if (existing) {
    console.log(`[seed] Konto ${SEED_TUTOR.email} już istnieje (rola: ${existing.role}) – bez zmian.`);
  } else {
    const password = process.env.SEED_TUTOR_PASSWORD?.trim() || SEED_TUTOR.defaultPassword;
    if (password.length < 8) throw new Error('SEED_TUTOR_PASSWORD musi mieć co najmniej 8 znaków.');
    const user = await store.createUser({
      email: SEED_TUTOR.email,
      name: SEED_TUTOR.name,
      displayName: SEED_TUTOR.displayName,
      role: 'TUTOR',
      passwordHash: await hashPassword(password),
    });
    console.log(`[seed] Utworzono konto korepetytorki: ${user.name} <${user.email}>`);
  }
} finally {
  await store.close();
}
