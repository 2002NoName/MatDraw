# MatDraw

Współdzielona **tablica matematyczna** dla korepetycji – **aplikacja webowa** działająca w przeglądarce na
**Windows 10/11** (Edge, Chrome), **macOS** (Safari, Chrome, Edge) i **iPadOS** (Safari). Nie wymaga instalacji.

- rysowanie piórem z obsługą **siły nacisku** (Apple Pencil, Surface Pen, Wacom), ekrany dotykowe, gesty,
- **wzory** (LaTeX/KaTeX) z paletą symboli, **wykresy funkcji**, **figury 2D** i **bryły 3D** (obracane),
- **rozpoznawanie pisma** – odręcznie napisany wzór → LaTeX (lokalnie, offline, z możliwością douczenia),
- **wspólna edycja w czasie rzeczywistym** (2+ osoby) przez **WebRTC P2P** (STUN/TURN – działa globalnie,
  nie tylko w LAN), z automatycznym przekazywaniem przez serwer, gdy P2P nie jest możliwe,
- **kody zaproszeń** generowane przez korepetytorkę, zarządzanie uczestnikami (usuwanie, tylko‑odczyt),
- **centralny zapis** tablic na serwerze (MySQL), konta **korepetytorki** i **ucznia**,
- **obrazy** na tablicy (plik, aparat iPada, schowek Ctrl+V, przeciągnięcie pliku),
- **tablice wzorów maturalnych CKE** dostępne dla wszystkich – wzór przeciąga się na tablicę jako obraz
  (panel na tablicy i strona `/wzory`); każdy wzór ma rozwijany **opis z zastosowaniem i przykładem**,
  w zestawie jest też **tablica wartości sin/cos/tg** dla kątów 0°–90°,
- **własne okna aplikacji** zamiast systemowych (potwierdzenia, zmiana nazwy, **wybór koloru** z paletą,
  suwakami HSV, polem HEX i ostatnio używanymi kolorami),
- strona **Moje konto** (`/konto`) – zmiana widocznej nazwy, imienia i nazwiska, e‑maila i hasła
  (dla korepetytorki i ucznia),
- **kursory uczestników jak w Figmie** – każda osoba ma swój kolor (korepetytorka różowy, uczeń niebieski)
  i etykietę z imieniem; własny kursor jest biały z czarną obwódką; kursor pióra/trackpada znika po 5 s,
- **diagnostyka połączeń** na żywo na tablicy (`Ctrl+Shift+D`) oraz **panel developera** `/dev`
  (testy WebSocket/STUN/TURN, statystyki P2P i serwera).

**Autorzy:** Michał Kozieński, [Weblance.pl](https://weblance.pl).
Oprogramowanie zastrzeżone – wyłącznie do użytku osób autoryzowanych przez twórców
(Weronika Janeczek i jej uczniowie). Szczegóły: [LICENSE](LICENSE).

Produkcja: <https://matdraw.weblance-devs.pl> (Coolify, [`docker-compose.yml`](docker-compose.yml)).

## Konto początkowe (seed)

Skrypt [`apps/server/src/scripts/seed.ts`](apps/server/src/scripts/seed.ts) tworzy konto korepetytorki:

| E‑mail | Hasło (domyślne) | Rola |
|---|---|---|
| `weronika@matdraw.weblance-devs.pl` | `Tablica#Matura2025` | korepetytorka (TUTOR) |

```bash
npm run seed -w @matdraw/server      # lokalnie (wymaga DATABASE_URL i STORE=prisma)
```

W kontenerze seed uruchamia się automatycznie przy starcie (`RUN_SEED=true`). Jest idempotentny –
istniejącego konta nie zmienia. Hasło można nadpisać przy pierwszym uruchomieniu zmienną
`SEED_TUTOR_PASSWORD`, a po zalogowaniu zmienić na stronie **Moje konto**.

## Struktura repozytorium

| Katalog | Opis |
|---|---|
| `packages/shared` | Wspólne typy TypeScript: API REST, protokół sygnalizacji, model elementów tablicy |
| `apps/server` | Node.js + Express 5 + WebSocket (sygnalizacja) + Prisma/MySQL |
| `apps/client` | React 19 + Vite – klient webowy (serwowany przez serwer pod `/`) |
| `docs/` | Dokumentacja |

## Szybki start (tryb deweloperski, bez MySQL)

Wymagany Node.js ≥ 20.19.

```bash
npm install
cp apps/server/.env.example apps/server/.env    # ustaw JWT_SECRET, STORE=memory, TUTOR_REGISTRATION_SECRET=...
npm run dev:server                               # http://localhost:4000 (API + /ws)
npm run dev:client                               # http://localhost:5173
```

Tryb `STORE=memory` przechowuje dane w pamięci (znikają po restarcie) – do produkcji użyj MySQL,
patrz [docs/WDROZENIE.md](docs/WDROZENIE.md). Lokalny MySQL + coturn: `docker compose -f docker-compose.dev.yml up -d`.

## Testy i kontrola typów

```bash
npm run typecheck
npm test
```

## Dokumentacja

- [Architektura (dokumentacja techniczna)](docs/ARCHITEKTURA.md)
- [Opis funkcjonalny](docs/FUNKCJONALNOSC.md)
- [Instrukcja obsługi](docs/INSTRUKCJA_OBSLUGI.md)
- [Wdrożenie (Coolify / Docker)](docs/WDROZENIE.md)
- [API REST i protokół WebSocket](docs/API.md)
