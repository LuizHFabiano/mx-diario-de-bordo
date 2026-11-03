#!/usr/bin/env bash
set -euo pipefail

: "${BACKUP_DATABASE:?BACKUP_DATABASE não configurado}"
: "${BACKUP_USER:?BACKUP_USER não configurado}"
: "${BACKUP_DIRECTORY:?BACKUP_DIRECTORY não configurado}"

umask 077
mkdir -p "$BACKUP_DIRECTORY"

timestamp="$(date +%F_%H-%M-%S)"
temporary_file="$BACKUP_DIRECTORY/.${BACKUP_DATABASE}_${timestamp}.dump.tmp"
final_file="$BACKUP_DIRECTORY/${BACKUP_DATABASE}_${timestamp}.dump"

pg_dump \
  --host=127.0.0.1 \
  --username="$BACKUP_USER" \
  --format=custom \
  --file="$temporary_file" \
  "$BACKUP_DATABASE"

mv "$temporary_file" "$final_file"
find "$BACKUP_DIRECTORY" -type f -name '*.dump' -mtime +7 -delete
