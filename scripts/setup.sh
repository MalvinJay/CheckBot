#!/usr/bin/env bash
# One-command setup from a clean clone.
# Judges are scored on whether they can reach the main result from a
# clean environment — this script IS part of your reproducibility score.
set -euo pipefail

echo "==> Installing dependencies"
npm install

if [ ! -f .env ]; then
  echo "==> Creating .env from .env.example (fill in OPENAI_API_KEY before running)"
  cp .env.example .env
fi

echo "==> Setup complete."
echo "Next: fill in .env, then run ./scripts/run.sh"
