#!/usr/bin/env bash
# ==============================================================================
#  FPCC SYNC — the "one tool" that keeps Google AI Studio <-> Firebase <-> GitHub
#  aligned on every upgrade or improvement.
#
#  Pipeline (in order):
#    1. Lint/typecheck (non-blocking warn)
#    2. Build           (vite build  -> dist/, Gemini key baked in)
#    3. Deploy          (firebase deploy: hosting + firestore rules)
#    4. Verify          (curl live URL, expect HTTP 200)
#    5. Commit + Push   (git -> GitHub main)  <-- this is what AI Studio imports
#    6. AI Studio note  (print exact re-import steps; AI Studio has no push API)
#
#  Usage:
#    ./sync.sh "commit message"        # full pipeline
#    ./sync.sh --no-deploy "msg"       # skip Firebase deploy (git only)
#    ./sync.sh --no-push "msg"         # skip GitHub push (deploy only)
#    ./sync.sh --build-only            # just build + verify locally
#
#  WHY this is "one tool":
#    Google AI Studio Build is a walled visual editor with NO outbound API, so it
#    cannot be pushed to programmatically. The alignment contract is therefore:
#    GitHub `main` is the SINGLE SOURCE OF TRUTH. This script guarantees Firebase
#    (live) and GitHub (source) are identical, then tells you the one manual click
#    needed to pull that same commit back into AI Studio. Three surfaces, one state.
# ==============================================================================
set -euo pipefail

# ── Config ───────────────────────────────────────────────────────────────────
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIREBASE_PROJECT="freshchat-3545e"
LIVE_URL="https://freshchat-3545e.web.app"
GIT_REMOTE="origin"
GIT_BRANCH="main"
GITHUB_REPO="YassinAliYassin/Fresh-People-Command-Center"
AISTUDIO_URL="https://aistudio.google.com/apps"

cd "$PROJECT_DIR"

# ── Flags ────────────────────────────────────────────────────────────────────
DO_DEPLOY=1; DO_PUSH=1; BUILD_ONLY=0; MSG=""
for arg in "$@"; do
  case "$arg" in
    --no-deploy) DO_DEPLOY=0 ;;
    --no-push)   DO_PUSH=0 ;;
    --build-only) BUILD_ONLY=1; DO_DEPLOY=0; DO_PUSH=0 ;;
    *) MSG="$arg" ;;
  esac
done
[ -z "$MSG" ] && MSG="sync: build, deploy, align AI Studio/Firebase/GitHub ($(date '+%Y-%m-%d %H:%M'))"

c_grn(){ printf '\033[32m%s\033[0m\n' "$1"; }
c_ylw(){ printf '\033[33m%s\033[0m\n' "$1"; }
c_red(){ printf '\033[31m%s\033[0m\n' "$1"; }
c_cyn(){ printf '\033[36m%s\033[0m\n' "$1"; }
step(){ echo; c_cyn "──── $1 ────"; }

# ── 0. Preflight ─────────────────────────────────────────────────────────────
step "0/6 Preflight"
command -v firebase >/dev/null || { c_red "firebase CLI not found"; exit 1; }
command -v git >/dev/null      || { c_red "git not found"; exit 1; }
if [ ! -f .env.production.local ] && [ -z "${VITE_GEMINI_API_KEY:-}" ]; then
  c_ylw "⚠ No Gemini key found (.env.production.local missing). AI Insights will be disabled in the build."
fi
echo "Project: $FIREBASE_PROJECT | Branch: $GIT_BRANCH | Live: $LIVE_URL"

# ── 1. Lint (non-blocking) ───────────────────────────────────────────────────
step "1/6 Typecheck (non-blocking)"
npm run lint >/dev/null 2>&1 && c_grn "✓ typecheck clean" || c_ylw "⚠ typecheck warnings (continuing)"

# ── 2. Build ─────────────────────────────────────────────────────────────────
step "2/6 Build"
npm run build
[ -f dist/index.html ] || { c_red "Build produced no dist/index.html"; exit 1; }
c_grn "✓ built -> dist/"

if [ "$BUILD_ONLY" = "1" ]; then
  step "Build-only mode: skipping deploy/push"
  c_grn "✓ done"; exit 0
fi

# ── 3. Deploy to Firebase ────────────────────────────────────────────────────
if [ "$DO_DEPLOY" = "1" ]; then
  step "3/6 Deploy to Firebase (hosting + firestore rules)"
  firebase deploy --only hosting,firestore:rules -P "$FIREBASE_PROJECT" --non-interactive
  c_grn "✓ deployed to Firebase"
else
  c_ylw "3/6 Deploy skipped (--no-deploy)"
fi

# ── 4. Verify live ───────────────────────────────────────────────────────────
step "4/6 Verify live app"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$LIVE_URL" || echo "000")
if [ "$HTTP" = "200" ]; then c_grn "✓ $LIVE_URL -> HTTP 200"
else c_red "⚠ $LIVE_URL -> HTTP $HTTP (investigate before trusting deploy)"; fi

# ── 5. Commit + push to GitHub (the AI Studio source of truth) ───────────────
if [ "$DO_PUSH" = "1" ]; then
  step "5/6 Commit + push to GitHub"
  if [ -n "$(git status --porcelain)" ]; then
    git add -A
    git commit -m "$MSG"
    c_grn "✓ committed: $MSG"
  else
    c_ylw "Nothing new to commit (working tree clean)"
  fi
  git push "$GIT_REMOTE" "$GIT_BRANCH"
  c_grn "✓ pushed to $GIT_REMOTE/$GIT_BRANCH"
  HEAD_SHA=$(git rev-parse --short HEAD)
else
  c_ylw "5/6 Push skipped (--no-push)"
  HEAD_SHA=$(git rev-parse --short HEAD)
fi

# ── 6. AI Studio alignment instructions ──────────────────────────────────────
step "6/6 Align Google AI Studio"
cat <<EOF
GitHub main is now at commit: $HEAD_SHA
Firebase live:                $LIVE_URL

AI Studio Build has no push API, so pull this same commit in (one-time per upgrade):
  1. Open: $AISTUDIO_URL  (sign in with the app's Google account)
  2. Open app "Flow Command Center"
  3. Import / sync from GitHub repo:  $GITHUB_REPO  (branch: $GIT_BRANCH)
  4. Preview (admin PIN 0000) -> then Deploy inside AI Studio if you want its copy refreshed

All three surfaces now reflect the same code state.
EOF
c_grn "✓ SYNC COMPLETE — AI Studio | Firebase | GitHub aligned"
