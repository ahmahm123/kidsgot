#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="${ROOT_DIR}/apps/web"
ENV_FILE="${WEB_DIR}/.env.local"

echo "HumanRent local setup starting..."

if [[ ! -f "${ENV_FILE}" ]]; then
  cp "${WEB_DIR}/.env.example" "${ENV_FILE}"
  DEV_SECRET="$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")"
  {
    echo ""
    echo "# Auto-added by scripts/setup-local.sh"
    echo "DATABASE_URL=\"postgresql://postgres:postgres@localhost:5432/humanrent?schema=public\""
    echo "NEXTAUTH_SECRET=\"${DEV_SECRET}\""
    echo "NEXTAUTH_URL=\"http://localhost:3000\""
    echo "NEXT_PUBLIC_APP_URL=\"http://localhost:3000\""
  } >> "${ENV_FILE}"
  echo "Created ${ENV_FILE} with dev defaults."
else
  echo "${ENV_FILE} already exists. Keeping current values."
fi

if command -v docker >/dev/null 2>&1; then
  echo "Starting local Postgres via docker compose..."
  docker compose -f "${ROOT_DIR}/docker-compose.yml" up -d postgres
  echo "Waiting for Postgres healthcheck..."
  for i in {1..30}; do
    STATUS="$(docker inspect --format='{{json .State.Health.Status}}' humanrent-postgres 2>/dev/null || echo "\"unknown\"")"
    if [[ "${STATUS}" == "\"healthy\"" ]]; then
      echo "Postgres is healthy."
      break
    fi
    sleep 2
  done
else
  echo "Docker not found. Ensure your DATABASE_URL points to a reachable Postgres instance."
fi

cd "${WEB_DIR}"
pnpm prisma generate
if ! pnpm prisma migrate deploy; then
  echo ""
  echo "Migration failed. Ensure Postgres is running and DATABASE_URL is reachable."
  echo "Current DATABASE_URL is read from ${ENV_FILE}."
  exit 1
fi
if ! pnpm db:seed; then
  echo ""
  echo "Seeding failed. Check database connectivity and prisma schema status."
  exit 1
fi

echo ""
echo "Setup complete."
echo "Run: pnpm --filter @humanrent/web dev"
