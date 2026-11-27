# Imagen de produccion de ChatControl-Front (Next.js con servidor Node).
# NEXT_PUBLIC_API_URL se incrusta en el build: cambiarla exige reconstruir.

# ---------- Dependencias ----------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN npm install -g pnpm@12.23.0
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---------- Build ----------
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN node node_modules/next/dist/bin/next build

# ---------- Runtime ----------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=80
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 80

# Se invoca Next directamente: pnpm no esta instalado en este stage.
# Host y puerto explícitos: Docker define HOSTNAME y no queremos depender de eso.
CMD ["node", "node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0", "-p", "80"]
