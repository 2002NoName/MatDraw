#!/bin/sh
# Start kontenera MatDraw: migracje bazy -> dane początkowe (seed) -> serwer.
set -e
cd /app/apps/server

if [ "${STORE:-prisma}" = "prisma" ]; then
  # Baza może jeszcze startować – kilka prób migracji.
  attempt=1
  until npx prisma migrate deploy; do
    if [ "$attempt" -ge 10 ]; then
      echo "[entrypoint] Nie udało się wykonać migracji bazy danych." >&2
      exit 1
    fi
    echo "[entrypoint] Baza niedostępna, ponowna próba za 5 s ($attempt/10)…"
    attempt=$((attempt + 1))
    sleep 5
  done

  if [ "${RUN_SEED:-true}" = "true" ]; then
    node dist/scripts/seed.js
  fi
fi

exec node dist/index.js
