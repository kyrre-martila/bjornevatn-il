#!/usr/bin/env bash
set -euo pipefail

operation="${1:-}"

require_env() {
  local key="$1"
  if [[ -z "${!key:-}" ]]; then
    echo "Missing required env var: ${key}" >&2
    exit 1
  fi
}

for key in LIVE_DATABASE_URL STAGING_DATABASE_URL LIVE_UPLOADS_PATH STAGING_UPLOADS_PATH; do
  require_env "$key"
done

copy_database() {
  local source_url="$1"
  local target_url="$2"
  pg_dump --clean --if-exists --no-owner --no-privileges "$source_url" | psql "$target_url"
}

sync_uploads() {
  local source_path="$1"
  local target_path="$2"

  mkdir -p "$target_path"
  rsync -a --delete "$source_path"/ "$target_path"/
}

reset_staging_schema() {
  psql "$STAGING_DATABASE_URL" -c 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;'
}

case "$operation" in
  copy-live-db-to-staging)
    copy_database "$LIVE_DATABASE_URL" "$STAGING_DATABASE_URL"
    ;;
  copy-staging-db-to-live)
    copy_database "$STAGING_DATABASE_URL" "$LIVE_DATABASE_URL"
    ;;
  sync-uploads-live-to-staging)
    sync_uploads "$LIVE_UPLOADS_PATH" "$STAGING_UPLOADS_PATH"
    ;;
  sync-uploads-staging-to-live)
    sync_uploads "$STAGING_UPLOADS_PATH" "$LIVE_UPLOADS_PATH"
    ;;
  delete-staging)
    reset_staging_schema
    rm -rf "$STAGING_UPLOADS_PATH"
    ;;
  *)
    echo "Unknown operation: $operation" >&2
    exit 1
    ;;
esac
