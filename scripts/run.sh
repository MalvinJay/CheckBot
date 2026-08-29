#!/usr/bin/env bash
# Reproduces the full result: baseline + agent pipeline over the eval set.
set -euo pipefail

echo "==> Running evaluation (baseline + agent pipeline)"
npm run eval

echo "==> Done. Compare results/baseline.json vs results/final.json"
