#!/usr/bin/env bash
# Despliegue de ChatControl-Front en el VPS, invocado por el workflow de GitHub Actions.
# Uso: bash vps-deploy-web.sh /tmp/chatcontrol-front.tgz <release-id>
#
# Estructura esperada: /srv/docker/chatcontrol-front/{compose.yml,.env,web/}
# La primera vez hay que crear el stack a mano (ver docs/DESPLIEGUE-VPS.md).

set -Eeuo pipefail

TARBALL="${1:?falta tarball}"
RELEASE_ID="${2:-$(date +%Y%m%d%H%M%S)}"
STACK_DIR="/srv/docker/${VPS_STACK_NAME:-chatcontrol-front}"
COMPOSE_FILE="${STACK_DIR}/compose.yml"
WEB_DIR="${STACK_DIR}/web"
NEW_DIR="${STACK_DIR}/web.new"
OLD_DIR="${STACK_DIR}/web.old"
IMAGE="chatcontrol-web:latest"
HEALTH_URL="http://127.0.0.1:3003/"
HEALTH_EXPECT="${HEALTH_EXPECT:-200}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-120}"
HEALTH_INTERVAL=5
STAGE="inicio"

compose() {
  docker compose -f "$COMPOSE_FILE" --env-file "$STACK_DIR/.env" "$@"
}

on_error() {
  local exit_code=$?
  printf '[deploy-web] ERROR stage=%s line=%s exit=%s\n' "$STAGE" "$1" "$exit_code" >&2
  exit "$exit_code"
}
trap 'on_error "$LINENO"' ERR

STAGE="validaciones previas"
[ -f "$TARBALL" ] || { echo "No existe el tarball: $TARBALL" >&2; exit 2; }
[ -f "$COMPOSE_FILE" ] || { echo "No existe el compose: $COMPOSE_FILE" >&2; exit 3; }
[ -f "$STACK_DIR/.env" ] || { echo "No existe $STACK_DIR/.env (NEXT_PUBLIC_API_URL)" >&2; exit 3; }
docker info >/dev/null 2>&1 || { echo "Docker no responde" >&2; exit 3; }
command -v curl >/dev/null 2>&1 || { echo "curl no instalado" >&2; exit 3; }

STAGE="preparar rollback de imagen"
if docker image inspect "$IMAGE" >/dev/null 2>&1; then
  docker tag "$IMAGE" "chatcontrol-web:back-${RELEASE_ID}" || true
fi

STAGE="extraer release en web.new"
rm -rf "$NEW_DIR"
mkdir -p "$NEW_DIR"
tar -xzf "$TARBALL" -C "$NEW_DIR"

STAGE="intercambiar version web"
if [ -d "$WEB_DIR" ]; then rm -rf "$OLD_DIR"; mv "$WEB_DIR" "$OLD_DIR"; fi
mv "$NEW_DIR" "$WEB_DIR"

STAGE="construir y arrancar web"
if ! compose up -d --build web; then
  echo "Fallo build/arranque web" >&2
  if [ -d "$OLD_DIR" ]; then rm -rf "$WEB_DIR"; mv "$OLD_DIR" "$WEB_DIR"; fi
  compose up -d --force-recreate web || true
  exit 1
fi

STAGE="healthcheck web"
deadline=$(( $(date +%s) + HEALTH_TIMEOUT ))
healthy=0
last_code="000"
while [ "$(date +%s)" -lt "$deadline" ]; do
  last_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$HEALTH_URL" || true)
  if [ "$last_code" = "$HEALTH_EXPECT" ]; then
    healthy=1
    break
  fi
  sleep "$HEALTH_INTERVAL"
done
if [ "$healthy" -ne 1 ]; then
  echo "Healthcheck fallo web: $HEALTH_URL (ultimo codigo: $last_code)" >&2
  compose ps web || true
  curl -i --max-time 5 "$HEALTH_URL" || true
  compose logs --tail=100 web || true
  if [ -d "$OLD_DIR" ]; then rm -rf "$WEB_DIR"; mv "$OLD_DIR" "$WEB_DIR"; fi
  compose up -d --force-recreate web || true
  exit 1
fi

STAGE="limpiar version anterior"
rm -rf "$OLD_DIR"
echo "Front desplegado: $RELEASE_ID"
echo "Comprobacion: curl -s -o /dev/null -w '%{http_code}' $HEALTH_URL  -> $HEALTH_EXPECT"
