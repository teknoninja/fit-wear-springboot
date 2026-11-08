#!/usr/bin/env bash
#
# Push local environment variables to Vercel.
#
#   ./scripts/push-env-to-vercel.sh
#
# Values are read from .env and client/.env and piped straight into
# `vercel env add`, so no secret is ever typed on the command line or left in
# your shell history.
#
# Requires: vercel CLI, logged in, and the project linked (`vercel link`).
# Safe to re-run: existing values are removed and re-added.

set -uo pipefail
cd "$(dirname "$0")/.."

if [ ! -d .vercel ]; then
  echo "This directory is not linked to a Vercel project yet."
  echo "Run:  vercel link"
  exit 1
fi

# Which file each variable should come from.
#   VITE_* are public and belong in client/.env
#   everything else is server-only and belongs in the root .env
CLIENT_VARS="VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY VITE_STRIPE_PUBLISHABLE_KEY"
SERVER_VARS="SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET"

read_var() {  # read_var <file> <name>  -> prints value, empty if unset
  [ -f "$1" ] || return 0
  grep -m1 "^$2=" "$1" 2>/dev/null | cut -d= -f2- | sed 's/^["'"'"']//; s/["'"'"']$//'
}

push() {  # push <name> <value>
  local name="$1" value="$2"
  for target in production preview development; do
    # Remove first so re-running updates rather than erroring on a duplicate.
    vercel env rm "$name" "$target" --yes >/dev/null 2>&1
    if printf '%s' "$value" | vercel env add "$name" "$target" >/dev/null 2>&1; then
      printf '.'
    else
      printf 'x'
    fi
  done
  echo "  $name"
}

missing=""

for name in $CLIENT_VARS; do
  value="$(read_var client/.env "$name")"
  if [ -z "$value" ]; then missing="$missing $name"; else push "$name" "$value"; fi
done

for name in $SERVER_VARS; do
  value="$(read_var .env "$name")"
  if [ -z "$value" ]; then missing="$missing $name"; else push "$name" "$value"; fi
done

echo
if [ -n "$missing" ]; then
  echo "NOT SET LOCALLY, so not pushed:"
  for m in $missing; do echo "  - $m"; done
  echo
  echo "Add them to the right local file and re-run, or set them in the"
  echo "Vercel dashboard directly:"
  echo "  VITE_*  -> client/.env      (public, compiled into the bundle)"
  echo "  others  -> .env             (secret, server only)"
else
  echo "All variables pushed."
fi

echo
echo "Verify with:   vercel env ls"
echo "Then redeploy: vercel --prod     (env changes need a fresh build)"
