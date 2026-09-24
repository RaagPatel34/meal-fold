#!/bin/zsh
set -e
cd -- "$(dirname -- "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
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
npm run dev
