#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────
# Prerequisites
# ─────────────────────────────────────────────────────────
# - Node 20+         (for Supabase CLI)
# - npm or pnpm      (package manager)
# - git              (for push/deployment)
# - curl             (webhooks, health checks)
# - supabase PAT     (exported as SUPABASE_TOKEN)
#
# Run once per machine:
#   npm i -g supabase@latest

# ─────────────────────────────────────────────────────────
# 1. Log in to Supabase (with personal access token)
# ─────────────────────────────────────────────────────────
supabase login --access-token "$SUPABASE_TOKEN"

# ─────────────────────────────────────────────────────────
# 2. Link local project to remote
# ─────────────────────────────────────────────────────────
supabase link --project-ref oorsjbxaywqxqachvrqt

# ─────────────────────────────────────────────────────────
# 3. Push the schema (tables + RLS)
# ─────────────────────────────────────────────────────────
supabase db push

# ─────────────────────────────────────────────────────────
# 4. Inject environment variables
# ─────────────────────────────────────────────────────────
# Local .env
cat >> .env <<EOF
SUPABASE_URL=https://oorsjbxaywqxqachvrqt.supabase.co
SUPABASE_ANON_KEY=$(supabase status --output json | jq -r '.anon_key')
SUPABASE_SERVICE_ROLE_KEY=$(supabase status --output json | jq -r '.service_role_key')
EOF

# Vercel (set via CLI or dashboard)
vercel env add SUPABASE_URL               production < .env
vercel env add SUPABASE_ANON_KEY          production < <(echo "$SUPABASE_ANON_KEY")
vercel env add SUPABASE_SERVICE_ROLE_KEY   production < <(echo "$SUPABASE_SERVICE_ROLE_KEY")

# ─────────────────────────────────────────────────────────
# 5. Deploy
# ─────────────────────────────────────────────────────────
git add .env
git commit -m "chore: add Supabase env vars"
git push origin main

# ─────────────────────────────────────────────────────────
# 6. Verify
# ─────────────────────────────────────────────────────────
curl -sf https://fresh-people-command-center.vercel.app/api/health \
  -o /dev/null && echo "✅ API reachable"

curl -sf "${SUPABASE_URL}/rest/v1/staff" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -o /dev/null && echo "✅ Supabase connected"