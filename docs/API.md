# MatDraw – API REST i protokół WebSocket

Adres bazowy: `https://<serwer>/api`. Treść żądań i odpowiedzi: JSON (UTF‑8).
Uwierzytelnienie: nagłówek `Authorization: Bearer <token JWT>` (token z logowania/rejestracji).
Błędy: kod HTTP 4xx/5xx i `{ "error": "komunikat", "details"?: ... }`.

Typy odpowiedzi (`PublicUser`, `BoardSummary`, `BoardDetails`, `InviteInfo`, `BoardMemberInfo`,
`IceConfigResponse`) są zdefiniowane w `packages/shared/src/api.ts`.

## Konta

| Metoda | Ścieżka | Dostęp | Treść | Odpowiedź |
|---|---|---|---|---|
| POST | `/auth/register` | publiczny | `{ email, password (≥8), name, displayName? (≤60), role?: "STUDENT"\|"TUTOR", tutorSecret? }` | `201 { token, user }` |
| POST | `/auth/login` | publiczny | `{ email, password }` | `{ token, user }` |
| GET | `/auth/me` | zalogowany | — | `PublicUser` |
| PATCH | `/auth/me` | zalogowany (obie role) | `UpdateAccountRequest`: `{ displayName? (1–60), name? (2–120), email?, newPassword? (≥8), currentPassword? }` | `{ token, user }` |

`PublicUser` = `{ id, email, name, displayName, role }` – `name` to imię i nazwisko, `displayName` to nazwa
widoczna dla innych (domyślnie przy rejestracji = `name`). `BoardMemberInfo` zawiera również `displayName`,
a `ownerName` w `BoardSummary` to widoczna nazwa właściciela.

`PATCH /auth/me`: zmiana `email` lub ustawienie `newPassword` wymaga poprawnego `currentPassword`
(inaczej `403`); zajęty e‑mail → `409`; błędy walidacji → `400`. Odpowiedź zawiera nowy token.

Rejestracja konta `TUTOR` wymaga `tutorSecret` równego `TUTOR_REGISTRATION_SECRET` (gdy zmienna jest pusta –
rejestracja korepetytorek jest wyłączona, `403`). Limit: 50 żądań / 15 min / IP.

## Tablice

| Metoda | Ścieżka | Dostęp | Treść | Odpowiedź |
|---|---|---|---|---|
| GET | `/boards` | zalogowany | — | `BoardSummary[]` (korepetytorka: wszystkie; uczeń: swoje) |
| POST | `/boards` | korepetytorka | `{ title }` | `201 BoardSummary` |
| GET | `/boards/:id` | z dostępem | — | `BoardDetails` (z `invites` tylko dla korepetytorki) |
| PATCH | `/boards/:id` | korepetytorka | `{ title }` | `BoardSummary` |
| DELETE | `/boards/:id` | korepetytorka | — | `204` (uczestnicy online dostają `board-deleted`) |
| GET | `/boards/:id/state` | z dostępem | — | binarny stan Yjs (`application/octet-stream`) – kopia zapasowa/eksport |
| POST | `/boards/:id/leave` | uczeń | — | `204` |

## Kody zaproszeń

| Metoda | Ścieżka | Dostęp | Treść | Odpowiedź |
|---|---|---|---|---|
| POST | `/boards/:id/invites` | korepetytorka | `{ label?, expiresInHours?: number\|null, maxUses?: number\|null }` | `201 InviteInfo` |
| DELETE | `/boards/:id/invites/:inviteId` | korepetytorka | — | `204` (unieważnienie) |
| POST | `/join` | zalogowany | `{ code }` (dowolna wielkość liter, myślniki ignorowane) | `BoardSummary` |

`/join` zwraca `404`, gdy kod nie istnieje, wygasł, został unieważniony lub wykorzystany. Limit: 30 prób / 10 min / IP.

## Uczestnicy

| Metoda | Ścieżka | Dostęp | Treść | Odpowiedź |
|---|---|---|---|---|
| POST | `/boards/:id/members` | korepetytorka | `{ email, canEdit?: boolean }` | `201 BoardMemberInfo` |
| PATCH | `/boards/:id/members/:userId` | korepetytorka | `{ canEdit }` | `BoardMemberInfo` (online: `peer-updated`) |
| DELETE | `/boards/:id/members/:userId` | korepetytorka | — | `204` (online: `kicked` + rozłączenie) |

## Pozostałe

| Metoda | Ścieżka | Dostęp | Odpowiedź |
|---|---|---|---|
| GET | `/rtc/ice` | zalogowany | `{ iceServers, ttl }` – STUN/TURN (poświadczenia TURN ważne `ttl` s) |
| GET | `/users?role=STUDENT` | korepetytorka | `PublicUser[]` |
| GET | `/health` | publiczny | `{ ok: true }` |
| GET | `/dev/stats` | korepetytorka | `DevStatsResponse` – panel developera: czas działania, pamięć, Node, baza, konfiguracja STUN/TURN (bez sekretów), liczniki serwera sygnalizacyjnego (`realtime`), liczba dokumentów w pamięci, aktywne tablice z uczestnikami i ich ruchem (`rooms[]`). Uczeń: 403. |

---

## WebSocket `/ws` (sygnalizacja i synchronizacja)

Połączenie: `wss://<serwer>/ws`. Wiadomości JSON. Pierwsza wiadomość klienta musi być `join`
(w ciągu 15 s). Definicje typów: `packages/shared/src/signaling.ts`.

### Klient → serwer

| `type` | Pola | Opis |
|---|---|---|
| `join` | `boardId`, `token` | Dołączenie do tablicy (weryfikacja JWT i dostępu) |
| `signal` | `to`, `payload` | SDP/ICE dla wskazanego uczestnika (`payload.kind`: `description` \| `candidate`) |
| `doc-update` | `update` (base64), `relayTo?` | Aktualizacja Yjs – zapisywana; przekazywana uczestnikom z `relayTo` (brak P2P) |
| `ephemeral` | `to[]`, `data` (JSON jako tekst) | Kursor / kreska na żywo dla uczestników bez P2P (maks. 32 kB) |
| `ping` | — | Utrzymanie połączenia; klient mierzy czas do `pong` (RTT w panelu diagnostyki). Działa także przed `join`. |

### Serwer → klient

| `type` | Pola | Opis |
|---|---|---|
| `joined` | `selfId`, `self`, `peers[]`, `state` (base64) | Potwierdzenie dołączenia i pełny stan dokumentu |
| `peer-joined` / `peer-left` | `peer` / `peerId` | Zmiana składu uczestników |
| `peer-updated` | `peer` | Zmiana uprawnień (`canEdit`) |
| `signal` | `from`, `payload` | Sygnalizacja WebRTC od uczestnika |
| `doc-update` | `from`, `update` | Aktualizacja przekazana przez serwer |
| `ephemeral` | `from`, `data` | Dane efemeryczne przekazane przez serwer |
| `kicked` | `reason` | Usunięcie z tablicy (po nim zamknięcie połączenia) |
| `board-deleted` | — | Tablica usunięta |
| `error` | `message` | Błąd (np. tryb tylko do odczytu) |
| `pong` | — | Odpowiedź na `ping` |

Kody zamknięcia: `4000` – brak `join`, `4001` – nieprawidłowy token, `4003` – brak dostępu,
`4004` – usunięcie z tablicy, `4005` – tablica usunięta.

Opis uczestnika (`self`, `peer`, `peers[]`) zawiera `name` = **widoczna nazwa** (`displayName`) konta
oraz `color` – kolor kursora przydzielony według roli (`pickPeerColor`): korepetytorki `#e64980` (różowy),
`#be4bdb`, `#c2255c`; uczniowie `#1c7ed6` (niebieski), `#2f9e44`, `#f76707`, `#7048e8`, … – unikalny w obrębie tablicy.

### Kanał danych WebRTC (P2P)

Kanał `matdraw` (uporządkowany, niezawodny):

- **binarnie** – ramki `[typ][dane]`: `SyncStep1` (wektor stanu), `SyncStep2` (brakujące zmiany),
  `Update` (zmiana); wiadomości > 16 KiB dzielone na fragmenty (`apps/client/src/sync/framing.ts`),
- **tekstowo** – JSON `PeerEphemeral`: `cursor`, `cursor-hide`, `live-stroke`, `live-stroke-end`, `hello`.
  Kursor: `{ "t": "cursor", "x": 120, "y": 340, "p": "pen" }` – współrzędne tablicy, `p` = `mouse` | `pen` |
  `touch` (opcjonalne); wysyłany maks. co 40 ms. `cursor-hide` wysyła tylko mysz po opuszczeniu tablicy;
  odbiorca wygasza kursor po 5 s bez ruchu.

### Elementy tablicy w dokumencie Yjs

Zawartość tablicy nie ma osobnego API – elementy (`BoardElement`, `packages/shared/src/elements.ts`)
są wpisami mapy `elements` dokumentu Yjs i przesyłane są wyłącznie jako aktualizacje Yjs (P2P lub `doc-update`).
Dotyczy to także **obrazów** (`type: "image"`) i **wzorów CKE** wstawionych z panelu – ich treść to
`src` w postaci `data:image/(png|jpeg|webp|gif|svg+xml);base64,…` (maks. `MAX_IMAGE_DATA_URL` ≈ 3 MB).
Klient wyświetla tylko takie adresy; inne wartości `src` są pomijane (bezpieczeństwo, brak zewnętrznych żądań).
Duże aktualizacje mieszczą się w limicie wiadomości WebSocket (32 MB) i są dzielone na ramki w kanale P2P.