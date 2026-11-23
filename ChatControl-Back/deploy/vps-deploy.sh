#!/usr/bin/env bash
# Despliegue de ChatControl-Back en el VPS, invocado por el workflow de GitHub Actions.
# Uso: SEED_IF_EMPTY=1 bash vps-deploy.sh /tmp/chatcontrol-back.tgz <release-id>
#
# Estructura esperada: /srv/docker/chatcontrol-back/{compose.yml,.env,api/}
# La primera vez hay que crear el stack a mano (ver docs/DESPLIEGUE-VPS.md).

set -Eeuo pipefail

TARBALL="${1:?falta tarball}"
RELEASE_ID="${2:-$(date +%Y%m%d%H%M%S)}"
STACK_DIR="/srv/docker/${VPS_STACK_NAME:-chatcontrol-back}"
COMPOSE_FILE="${STACK_DIR}/compose.yml"
API_DIR="${STACK_DIR}/api"
NEW_DIR="${STACK_DIR}/api.new"
OLD_DIR="${STACK_DIR}/api.old"
IMAGE="chatcontrol-api:latest"
# No existe /health: una ruta autenticada debe responder 401 cuando la API esta sana.
HEALTH_URL="http://127.0.0.1:4003/api/auth/me"
HEALTH_EXPECT="${HEALTH_EXPECT:-401}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-150}"
HEALTH_INTERVAL=5
# Seed automatico solo cuando la tabla User esta vacia (primer despliegue).
SEED_IF_EMPTY="${SEED_IF_EMPTY:-1}"
DB_USER="chatcontrol"
DB_NAME="chatcontrol"
STAGE="inicio"

compose() {
  docker compose -f "$COMPOSE_FILE" --env-file "$STACK_DIR/.env" "$@"
}

on_error() {
  local exit_code=$?
  printf '[deploy-api] ERROR stage=%s line=%s exit=%s\n' "$STAGE" "$1" "$exit_code" >&2
  exit "$exit_code"
}
trap 'on_error "$LINENO"' ERR

STAGE="validaciones previas"
[ -f "$TARBALL" ] || { echo "No existe el tarball: $TARBALL" >&2; exit 2; }
[ -f "$COMPOSE_FILE" ] || { echo "No existe el compose: $COMPOSE_FILE" >&2; exit 3; }
[ -f "$STACK_DIR/.env" ] || { echo "No existe $STACK_DIR/.env (POSTGRES_PASSWORD)" >&2; exit 3; }
docker info >/dev/null 2>&1 || { echo "Docker no responde" >&2; exit 3; }
command -v curl >/dev/null 2>&1 || { echo "curl no instalado" >&2; exit 3; }

STAGE="preparar rollback de imagen"
if docker image inspect "$IMAGE" >/dev/null 2>&1; then
  docker tag "$IMAGE" "chatcontrol-api:back-${RELEASE_ID}" || true
fi

STAGE="extraer release en api.new"
rm -rf "$NEW_DIR"
mkdir -p "$NEW_DIR"
tar -xzf "$TARBALL" -C "$NEW_DIR"

STAGE="conservar configuracion local"
if [ -f "$API_DIR/.env" ]; then cp -a "$API_DIR/.env" "$NEW_DIR/.env"; fi

STAGE="intercambiar version API"
if [ -d "$API_DIR" ]; then rm -rf "$OLD_DIR"; mv "$API_DIR" "$OLD_DIR"; fi
mv "$NEW_DIR" "$API_DIR"

STAGE="construir y arrancar API"
if ! compose up -d --build api; then
  echo "Fallo build/arranque API" >&2
  if [ -d "$OLD_DIR" ]; then rm -rf "$API_DIR"; mv "$OLD_DIR" "$API_DIR"; fi
  compose up -d --force-recreate api || true
  exit 1
fi

STAGE="healthcheck API"
deadline=$(( $(date +%s) + HEALTH_TIMEOUT ))
healthy=0
last_code="000"
while [ "$(date +%s)" -lt "$deadline" ]; do
  last_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$HEALTH_URL" || true)
  if [ "$last_code" = "$HEALTH_EXPECT" ] || [ "$last_code" = "200" ]; then
    healthy=1
    break
  fi
  sleep "$HEALTH_INTERVAL"
done
if [ "$healthy" -ne 1 ]; then
  echo "Healthcheck fallo API: $HEALTH_URL (ultimo codigo: $last_code, esperado: $HEALTH_EXPECT)" >&2
  compose ps api || true
  curl -i --max-time 5 "$HEALTH_URL" || true
  compose logs --tail=100 api || true
  if [ -d "$OLD_DIR" ]; then rm -rf "$API_DIR"; mv "$OLD_DIR" "$API_DIR"; fi
  compose up -d --force-recreate api || true
  exit 1
fi

STAGE="seed inicial (solo si la base esta vacia)"
if [ "$SEED_IF_EMPTY" = "1" ]; then
  count=$(compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -tAc 'select count(*) from "User";' 2>/dev/null | tr -d '[:space:]' || true)
  if [ -z "$count" ]; then
    echo "AVISO: no se pudo consultar la tabla User; se omite el seed." >&2
  elif [ "$count" = "0" ]; then
    echo "Base vacia: sembrando usuarios iniciales..."
    if ! compose exec -T api npx prisma db seed; then
      echo "ERROR: el seed fallo. La API responde, pero no hay usuarios." >&2
      echo "Reintenta: docker compose -f $COMPOSE_FILE --env-file $STACK_DIR/.env exec api npx prisma db seed" >&2
      exit 1
    fi
  else
    echo "La base ya tiene $count usuarios: seed omitido."
  fi
fi

STAGE="limpieza posterior al despliegue"
# Mantener solo la imagen actual (latest) y la anterior en prod (back-${RELEASE_ID}).
# Se borran contenedores parados, imagenes antiguas del proyecto, volumenes huorfanos,
# tarballs/scripts de /tmp y la build cache no usada.
if command -v docker >/dev/null 2>&1; then
  docker container prune -f >/dev/null 2>&1 || true

  while IFS= read -r img; do
    [ -z "$img" ] && continue
    if [ "$img" != "chatcontrol-api:latest" ] && [ "$img" != "chatcontrol-api:back-${RELEASE_ID}" ]; then
      docker rmi -f "$img" >/dev/null 2>&1 || true
    fi
  done < <(docker images --format '{{.Repository}}:{{.Tag}}' | grep '^chatcontrol-api:' || true)

  while IFS= read -r vol; do
    [ -z "$vol" ] && continue
    docker volume rm "$vol" >/dev/null 2>&1 || true
  done < <(docker volume ls -q -f dangling=true 2>/dev/null || true)

  rm -f "$TARBALL" /tmp/chatcontrol-back-deploy.sh

  docker builder prune -f >/dev/null 2>&1 || true
fi

STAGE="limpiar version anterior"
rm -rf "$OLD_DIR"
echo "API desplegada: $RELEASE_ID"
echo "Comprobacion: curl -s -o /dev/null -w '%{http_code}' $HEALTH_URL  -> $HEALTH_EXPECT"
