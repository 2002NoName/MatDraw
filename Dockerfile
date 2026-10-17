# MatDraw – obraz produkcyjny (serwer API + sygnalizacja WebSocket + klient webowy).
# Autorzy: Michał Kozieński, Weblance.pl

# ---------- Etap 1: budowanie ----------
FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV CI=1

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
COPY apps/client/package.json apps/client/
RUN npm ci --no-audit --no-fund -w @matdraw/shared -w @matdraw/server -w @matdraw/client --include-workspace-root

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/server apps/server
COPY apps/client apps/client
RUN npm run build

# ---------- Etap 2: obraz uruchomieniowy ----------
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
COPY apps/client/package.json apps/client/
RUN npm ci --omit=dev --no-audit --no-fund -w @matdraw/shared -w @matdraw/server && npm cache clean --force

COPY apps/server/prisma apps/server/prisma
RUN cd apps/server && npx prisma generate

COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/server/dist apps/server/dist
COPY --from=build /app/apps/client/dist apps/client/dist
COPY docker/entrypoint.sh /usr/local/bin/matdraw-entrypoint
RUN sed -i 's/\r$//' /usr/local/bin/matdraw-entrypoint && chmod +x /usr/local/bin/matdraw-entrypoint

ENV PORT=4000 \
    STORE=prisma \
    CLIENT_DIST=/app/apps/client/dist

USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

ENTRYPOINT ["matdraw-entrypoint"]
