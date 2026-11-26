#!/usr/bin/env bash
# Mac / Linux one-click launcher
cd "$(dirname "$0")"
command -v python3 >/dev/null || { echo "Python3 install karo"; exit 1; }
command -v node >/dev/null || { echo "Node.js install karo"; exit 1; }
if [ ! -d smarttalk_ai/.venv ]; then
  (cd smarttalk_ai && python3 -m venv .venv && . .venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt) || exit 1
fi
[ -d website/node_modules ] || (cd website && npm install) || exit 1
(cd smarttalk_ai && . .venv/bin/activate && python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000) &
B=$!
trap "kill $B 2>/dev/null" EXIT
echo "Website: http://127.0.0.1:5173"
cd website && npm run dev -- --host 127.0.0.1 --port 5173
