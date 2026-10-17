# MatDraw – wdrożenie

MatDraw jest **wyłącznie aplikacją webową** – klient (React) jest budowany razem z serwerem i
udostępniany przez niego pod `/`. Nie ma aplikacji natywnych ani instalatorów: użytkownicy na
Windows 10/11, macOS i iPadOS otwierają adres serwera w przeglądarce.

## 1. Wymagania

| Element | Wersja / uwagi |
|---|---|
| Node.js | ≥ 20.19 (zalecane 22 LTS) |
| MySQL | 8.x (lub MariaDB 10.6+) |
| Serwer TURN | coturn (zalecany) – do połączeń przez restrykcyjne NAT/firewalle |
| HTTPS | Wymagany produkcyjnie (WebRTC, dostęp do aparatu i schowka wymagają bezpiecznego kontekstu) |

## 2. Produkcja: Coolify – `matdraw.weblance-devs.pl`

Repozytorium zawiera komplet do wdrożenia w [Coolify](https://coolify.io):

| Plik | Rola |
|---|---|
| [`Dockerfile`](../Dockerfile) | Obraz wieloetapowy (node:22-bookworm-slim): build shared + server + client, obraz wynikowy tylko z zależnościami produkcyjnymi serwera i zbudowanym klientem |
| [`docker/entrypoint.sh`](../docker/entrypoint.sh) | Start kontenera: `prisma migrate deploy` (z ponawianiem, gdy baza jeszcze startuje) → seed (`RUN_SEED=true`) → `node dist/index.js` |
| [`docker-compose.yml`](../docker-compose.yml) | Usługi `matdraw` (aplikacja), `mysql` (8.4, wolumen `matdraw-mysql`), `coturn` (STUN/TURN) |
| [`docker-compose.dev.yml`](../docker-compose.dev.yml) | Tylko do pracy lokalnej: MySQL + coturn (aplikację uruchamia się przez `npm run dev:*`) |

```mermaid
flowchart LR
    subgraph NET["Internet"]
        C["Przeglądarki: Windows, macOS, iPad"]
    end
    subgraph HOST["Serwer Coolify"]
        TR["Traefik (Coolify)<br/>HTTPS :443, Let's Encrypt"]
        subgraph STACK["Stos docker-compose"]
            APP["matdraw :4000<br/>API + WebSocket /ws + klient webowy"]
            DB[("mysql:8.4<br/>wolumen matdraw-mysql")]
            CT["coturn<br/>3478 udp/tcp, 49160-49200 udp"]
        end
    end
    C -- "https://matdraw.weblance-devs.pl" --> TR
    TR -- "HTTP + WebSocket" --> APP
    APP --> DB
    C -- "STUN/TURN (UDP/TCP)" --> CT
```

```mermaid
sequenceDiagram
    participant CF as Coolify
    participant DB as mysql
    participant APP as matdraw (entrypoint.sh)
    CF->>DB: start + healthcheck (mysqladmin ping)
    DB-->>CF: healthy
    CF->>APP: start (depends_on: service_healthy)
    APP->>DB: prisma migrate deploy (do 10 prób)
    APP->>DB: seed – konto Weroniki Janeczek (jeśli nie istnieje)
    APP->>APP: node dist/index.js (port 4000)
    CF->>APP: healthcheck GET /api/health
```

### 2.1 Krok po kroku

1. **DNS:** rekord `A` (i ewentualnie `AAAA`) `matdraw.weblance-devs.pl` → publiczny adres IP serwera Coolify.
2. **Zapora serwera:** otwórz `80/tcp`, `443/tcp` (Traefik) oraz dla TURN `3478/udp`, `3478/tcp`,
   `49160–49200/udp`.
3. Coolify → *Projects → New Resource → Public/Private Git Repository* → wskaż repozytorium MatDraw.
   **Build Pack: Docker Compose**, *Docker Compose Location*: `/docker-compose.yml`.
4. W konfiguracji usługi **matdraw** ustaw domenę: `https://matdraw.weblance-devs.pl:4000`
   (`:4000` to port wewnętrzny kontenera – Coolify/Traefik wystawia aplikację na 443 z certyfikatem
   Let's Encrypt; WebSocket `/ws` działa bez dodatkowej konfiguracji). Pole domeny dla **coturn** zostaw
   puste. **Po zapisaniu domeny zawsze kliknij *Redeploy*** – etykiety Traefika powstają dopiero przy
   wdrożeniu. Objawy braku trasy: `404 page not found` po HTTP i `no available server` (503) po HTTPS.
5. **Sekrety są już wpisane w [`docker-compose.yml`](../docker-compose.yml)** (wygenerowane losowo):

   | Sekret | Gdzie w compose | Wartość |
   |---|---|---|
   | Hasło użytkownika MySQL `matdraw` | `DATABASE_URL`, `MYSQL_PASSWORD` | `e52b57cdddd7dd47054db54f299cebec` |
   | Hasło `root` MySQL | `MYSQL_ROOT_PASSWORD` | `e9f2b71afdbe2994ca2561f69e1475dc` |
   | Sekret JWT (128 znaków hex) | `JWT_SECRET` | patrz plik |
   | Sekret TURN (coturn `static-auth-secret`) | `TURN_SECRET`, `--static-auth-secret` | patrz plik |
   | Kod rejestracji korepetytorów | `TUTOR_REGISTRATION_SECRET` (domyślna wartość) | `vJd9vhtOtLM3` |

   **Nie zmieniaj hasła MySQL po pierwszym wdrożeniu** – baza w wolumenie zachowuje hasło z pierwszego
   startu. Zmiana `JWT_SECRET` wyloguje wszystkich użytkowników. Nowe wartości można wygenerować np.
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
6. Zakładka **Environment Variables** w Coolify – nic nie jest wymagane:
   - publiczny IPv4 serwera dla coturn (`--external-ip=54.38.53.158`, adres z rekordu A
     `matdraw.weblance-devs.pl`) jest wpisany na stałe w compose – zmień go tylko po przeniesieniu na inny serwer,
   - opcjonalnie: `SEED_TUTOR_PASSWORD` (hasło konta Weroniki Janeczek przy pierwszym starcie),
     `TUTOR_REGISTRATION_SECRET` (nadpisuje kod z compose), `STUN_URLS`, `TURN_URLS`,
     `JWT_EXPIRES_IN`, `TURN_TTL`, `RUN_SEED`.

   > Ostrzeżenie Coolify *„Make sure you have added the DNS records correctly … → host.docker.internal”*
   > przy serwerze `localhost` jest fałszywym alarmem (Coolify sprawdza DNS z wnętrza kontenera).
   > Wystarczy rekord A `matdraw.weblance-devs.pl → 54.38.53.158`; komunikat można zignorować.
7. **Deploy.** Po zakończeniu: `https://matdraw.weblance-devs.pl/api/health` → `{"ok":true}`.
8. Zaloguj się kontem korepetytorki (patrz niżej), zmień hasło na stronie **Moje konto** i przejdź
   weryfikację z [rozdziału 4](#4-weryfikacja-wdrożenia).

Aktualizacja aplikacji = nowy *Deploy* (migracje bazy wykonują się automatycznie przy starcie kontenera).
Dane bazy przetrwają ponowne wdrożenia (wolumen `matdraw-mysql`).

### 2.2 Konto początkowe (seed)

Skrypt [`apps/server/src/scripts/seed.ts`](../apps/server/src/scripts/seed.ts) zakłada konto korepetytorki:

| Pole | Wartość |
|---|---|
| Imię i nazwisko | Weronika Janeczek |
| E‑mail (login) | `weronika@matdraw.weblance-devs.pl` |
| Hasło domyślne | `Tablica#Matura2025` |
| Rola | korepetytorka (`TUTOR`) |

- Seed jest **idempotentny** – jeśli konto istnieje, niczego nie zmienia (nie resetuje hasła).
- Jeśli przy **pierwszym** wdrożeniu ustawiono `SEED_TUTOR_PASSWORD`, hasłem jest ta wartość, a nie domyślna.
- Nie tworzy danych demonstracyjnych.
- Ręcznie: `npm run seed -w @matdraw/server` (dev, z `apps/server/.env`) lub w kontenerze
  `node dist/scripts/seed.js`.
- Hasło zmienia się po zalogowaniu na stronie **Moje konto** (`/konto`) – zalecane zaraz po pierwszym
  wdrożeniu (albo ustaw wcześniej `SEED_TUTOR_PASSWORD`).

## 3. Serwer (instalacja ręczna, bez Coolify)

### 3.1 Baza danych i TURN

Lokalnie lub na własnym serwerze MySQL + coturn można uruchomić z
[`docker-compose.dev.yml`](../docker-compose.dev.yml). Po zmianie haseł i sekretów:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Porty do otwarcia na zaporze dla TURN: `3478/udp`, `3478/tcp` oraz zakres przekaźnikowy `49160–49200/udp`.
Dla sieci blokujących UDP warto dodatkowo uruchomić TURN po TLS na porcie `443`/`5349`
(`turns:`) z certyfikatem domeny.

### 3.2 Konfiguracja

```bash
cp apps/server/.env.example apps/server/.env
```

| Zmienna | Opis |
|---|---|
| `PORT` | Port HTTP (domyślnie 4000) |
| `STORE` | `prisma` (MySQL – produkcja) lub `memory` (dev/testy) |
| `DATABASE_URL` | np. `mysql://matdraw:haslo@localhost:3306/matdraw` |
| `JWT_SECRET` | Losowy ciąg ≥ 32 znaki, np. `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | Ważność sesji (domyślnie `7d`) |
| `TUTOR_REGISTRATION_SECRET` | Kod pozwalający założyć konto korepetytorki w formularzu; pusty = wyłączone |
| `CORS_ORIGINS` | Opcjonalnie: dodatkowe originy (np. `http://localhost:5173` – serwer deweloperski Vite). Klient serwowany przez serwer nie wymaga wpisu |
| `CLIENT_DIST` | Ścieżka do zbudowanego klienta (np. `../client/dist`) – serwer udostępnia go pod `/` |
| `STUN_URLS` | Serwery STUN, np. `stun:turn.twojadomena.pl:3478,stun:stun.l.google.com:19302` |
| `TURN_URLS` | Serwery TURN, np. `turn:turn.twojadomena.pl:3478?transport=udp,turn:turn.twojadomena.pl:3478?transport=tcp` |
| `TURN_SECRET` | Wspólny sekret z coturn (`static-auth-secret`) – zalecane, krótkotrwałe poświadczenia |
| `TURN_USERNAME`, `TURN_CREDENTIAL` | Alternatywnie: stałe poświadczenia TURN |
| `TURN_TTL` | Ważność poświadczeń TURN w sekundach (domyślnie 86400) |
| `SEED_TUTOR_PASSWORD` | Hasło konta Weroniki Janeczek tworzonego przez seed (puste = `Tablica#Matura2025`) |
| `RUN_SEED` | Tylko kontener Docker: `true` (domyślnie) = uruchom seed przy starcie |

### 3.3 Instalacja, migracja bazy, uruchomienie

```bash
npm ci
npm run build                                  # shared + server + client
npm run prisma:deploy -w @matdraw/server       # tworzy/aktualizuje tabele (prisma migrate deploy)
npm run seed -w @matdraw/server                # konto korepetytorki Weroniki Janeczek (patrz 2.2)
npm start                                      # serwer na porcie PORT
```

Repozytorium zawiera migrację początkową (`apps/server/prisma/migrations`). Po zmianie `schema.prisma`
utwórz nową migrację w środowisku deweloperskim: `npm run prisma:migrate -w @matdraw/server -- --name <opis>`.

Konto korepetytorki bez włączonej rejestracji:

```bash
npm run create-tutor -w @matdraw/server -- anna@szkola.pl "TajneHaslo123" "Anna Kowalska"
```

Usługa systemowa (systemd) – przykład:

```ini
[Unit]
Description=MatDraw
After=network.target mysql.service

[Service]
WorkingDirectory=/opt/matdraw/apps/server
ExecStart=/usr/bin/node dist/index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### 3.4 Reverse proxy (HTTPS + WebSocket)

Przykład dla nginx (certyfikat np. z Let's Encrypt):

```nginx
server {
  listen 443 ssl http2;
  server_name tablica.twojadomena.pl;
  ssl_certificate     /etc/letsencrypt/live/tablica.twojadomena.pl/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/tablica.twojadomena.pl/privkey.pem;

  client_max_body_size 5m;

  location /ws {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;
  }

  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Serwer ufa jednemu poziomowi proxy (`trust proxy = 1`) – limity żądań działają według adresu IP klienta.

### 3.5 Kopie zapasowe

Wszystkie dane (konta, tablice, kody, stan tablic) są w bazie MySQL – wystarczy regularny `mysqldump`.
Stan pojedynczej tablicy można też pobrać przez `GET /api/boards/:id/state`.

### 3.6 Klient webowy

Budowany razem z serwerem (`npm run build`) do `apps/client/dist` i udostępniany przez serwer pod `/`
(ten sam adres co API i WebSocket – bez konfiguracji CORS). Klient nie rejestruje Service Workera;
jeśli przeglądarka ma jeszcze worker ze starszej wersji (PWA), aplikacja usuwa go przy starcie.

## 4. Weryfikacja wdrożenia

1. `GET https://tablica.twojadomena.pl/api/health` → `{"ok":true}`.
2. Zaloguj się jako korepetytorka i uczeń na dwóch różnych urządzeniach w **różnych sieciach**
   (np. Wi‑Fi i LTE), utwórz tablicę, dołącz kodem.
3. W nagłówku tablicy ikona przy uczestniku powinna pokazywać „połączenie bezpośrednie (P2P)”
   lub „połączenie przez serwer TURN”. „Brak P2P – synchronizacja przez serwer” oznacza, że TURN
   nie jest dostępny – sprawdź `TURN_URLS`, `TURN_SECRET`, porty UDP i `--external-ip` coturn
   (test: <https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/>).
4. Wbudowany **panel developera**: zaloguj się jako korepetytorka, otwórz `https://matdraw.weblance-devs.pl/dev`
   i kliknij **Uruchom wszystkie testy** – oczekiwane: API i WebSocket „OK”, „srflx – STUN działa ✓”,
   „relay – TURN działa ✓” oraz test pętli TURN „OK ✓ – dane przeszły przez TURN”. Sekcja „Serwer – na żywo”
   pokazuje konfigurację TURN (`turnAuth: secret`), liczniki i aktywne tablice. Na samej tablicy panel
   `Ctrl+Shift+D` pokazuje trasę każdego połączenia (P2P / TURN / serwer) w czasie rzeczywistym.
