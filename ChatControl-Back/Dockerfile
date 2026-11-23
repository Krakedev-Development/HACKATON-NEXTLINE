# Imagen de producción de ChatControl-Back (NestJS + Prisma).
# El seed NO se ejecuta aquí: lo lanza el pipeline una sola vez sobre una base vacía.

FROM node:22-bookworm-slim

WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y --no-install-recommends \
  openssl \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Gestor de paquetes del proyecto (lockfile v9.0).
RUN npm install -g pnpm@9

# Manifiestos primero para aprovechar la caché de capas.
# pnpm-workspace.yaml queda fuera del contexto (ver .dockerignore): su clave
# `allowBuilds` es de pnpm 10/11 y esta imagen instala pnpm 9, que la ignora.
COPY package.json pnpm-lock.yaml ./
# El esquema debe existir antes del install: el postinstall de @prisma/client
# intenta generar el cliente y sin schema falla en algunas versiones.
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN pnpm install --frozen-lockfile

# Prisma necesita el resto del directorio antes de generar el cliente.
COPY prisma ./prisma
RUN npx prisma generate

# Código de la aplicación.
COPY . .
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

RUN pnpm run build

# NODE_ENV se fija después del build: si se define antes, pnpm omite
# devDependencies y el build falla. En runtime sí es obligatorio.
ENV NODE_ENV=production

EXPOSE 3001

ENTRYPOINT ["/usr/src/app/docker-entrypoint.sh"]
# Equivalente a `pnpm run start:prod`, sin pnpm en el arranque: mejor propagación de señales.
CMD ["node", "dist/main.js"]
