#!/usr/bin/env bash
set -euo pipefail

url="http://localhost:8080/health"

if ! command -v curl >/dev/null 2>&1; then
  printf 'ERROR: curl no esta disponible en esta terminal.\n' >&2
  exit 1
fi

if ! status=$(curl \
  --silent \
  --show-error \
  --connect-timeout 3 \
  --max-time 10 \
  --output /dev/null \
  --write-out '%{http_code}' \
  "$url"); then
  printf 'ERROR: no se pudo consultar %s.\n' "$url" >&2
  exit 1
fi

if [[ "$status" != "200" ]]; then
  printf 'ERROR: %s respondio HTTP %s; se esperaba 200.\n' "$url" "$status" >&2
  exit 1
fi

printf 'OK: %s respondio 200 OK.\n' "$url"
