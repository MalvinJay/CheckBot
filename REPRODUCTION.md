# Reproduction Guide

Written for a judge starting from a clean environment with zero context
beyond this document. Per the brief: exact commands, required data,
expected output, versions, and approximate runtime/cost.

## Environment
- Node.js version: _[fill in, e.g. 20.x]_
- OS tested on: _[fill in]_
- Other required services (Postgres/Redis) and their versions, if used: _[fill in]_

## Setup
```bash
git clone <repo-url>
cd frontier-scaffold
./scripts/setup.sh
# fill in .env — see .env.example for required keys
```

## Required data
_[Where the eval set / seed data lives, how it's generated or sourced,
and confirmation it's public/synthetic/approved per Ground Rule 07.]_

## Running the baseline and agent solution together
```bash
npm run eval
```
This runs both the baseline (`src/baseline.ts`) and the agent pipeline
(`src/agents/supervisor.ts`) over every case in `data/conversations.json`,
prints a results table + accuracy/precision/recall/F1 for each, and
writes `results/baseline.json` and `results/final.json`.

Expected output: a console table per mode, ending with
`[eval] wrote results/baseline.json and results/final.json`.

Approximate runtime: dry-run (no API key) ~1s. LIVE mode: ~1-2 min for
12 cases × 2 modes, dominated by API latency.
Approximate cost: LIVE mode, gpt-4o-mini, ~24 short calls ≈ a few cents.

## Dry-run vs. live mode
Leave `OPENAI_API_KEY` unset in `.env` to run entirely offline against
deterministic heuristic stubs (`src/llm/client.ts`) — fast, free, useful
for verifying the pipeline runs at all. **Submission numbers must come
from LIVE mode** — set `OPENAI_API_KEY` before the run that produces the
numbers cited in `EVALUATION.md`.

## Viewing the results as a dashboard
```bash
npm run dashboard
```
Writes `dashboard/index.html` — a single self-contained file, no server,
no external network calls (fonts/icons are all system-native). Open it
directly in a browser. Regenerate it any time after re-running `npm run
eval` to pick up new results.

## Known issues / flakiness
_[Anything a judge should know before re-running — nondeterminism,
rate limits, etc. Silence here reads as untested, not as "it's fine."]_
