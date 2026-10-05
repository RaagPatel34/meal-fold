#!/bin/zsh
set -e
trap 'echo "\nMeal Fold could not start. Keep this window open and share the error above."; read "?Press Return to close."' ZERR
cd -- "$(dirname -- "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if curl --silent --fail --max-time 5 http://localhost:5173/ | /usr/bin/grep -q 'Meal Fold'; then
  echo 'Meal Fold is already running. Opening it in your browser.'
  open http://localhost:5173/
  exit 0
fi
if ! command -v node >/dev/null; then
  echo 'Install Node.js 22.13 or newer, then open this file again.'
  read '?Press Return to close.'
  exit 1
fi
if [[ ! -d node_modules ]]; then
  npm ci
fi
npm run db:init
echo '\nMeal Fold is starting. Open the Local address below in your browser.'
echo 'Keep this window open while using the app. Press Control-C to stop.\n'
if [[ ! -f dist/server/wrangler.json ]] || [[ -n "$(find app components lib data public build -type f -newer dist/server/wrangler.json -print -quit)" ]]; then
  npm run build
fi
node scripts/serve-local.mjs
