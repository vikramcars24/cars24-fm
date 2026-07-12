#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TODAY="${1:-$(TZ=Asia/Kolkata date +%F)}"
cd "$ROOT"

node scripts/sync-celebrations-from-darwinbox.mjs --date "$TODAY"
node scripts/generate-birthday-block.mjs --date "$TODAY"

if [[ -n "${BUSINESS_UPDATE_SLACK_LINK:-}" ]]; then
  node scripts/generate-business-update-block.mjs \
    --slack-link "$BUSINESS_UPDATE_SLACK_LINK" --start-date "$TODAY" --days "${BUSINESS_UPDATE_DAYS:-3}"
else
  echo "BUSINESS_UPDATE_SLACK_LINK is unset; leaving the current business update unchanged."
fi
