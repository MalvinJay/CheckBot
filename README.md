# CheckBot

One-line pitch: *An SME support team running a WhatsApp bot needs to know, per conversation, whether the bot can keep handling it or a human needs to step in — and CheckBot never lets the bot auto-execute a refund/cancellation/discount.*

## Status
Core pipeline built and verified end-to-end in dry-run mode (deterministic
offline heuristics, no API cost). Not yet run LIVE against the real model —
that's the next step once the hackathon clock starts and API budget is
confirmed. `npm run eval` reproduces everything below.

## Quickstart (reproducibility)
```bash
git clone <repo-url>
cd checkbot
./scripts/setup.sh   # installs deps, creates .env
npm run eval          # runs baseline + agent pipeline, writes results/*.json
npm run dashboard     # generates dashboard/index.html from results/*.json
open dashboard/index.html   # or just double-click it — no server needed
```
Leave `OPENAI_API_KEY` unset in `.env` to run in DRY-RUN mode (fast, free,
deterministic — good for verifying wiring). Set it for LIVE scoring, which
is what the submission numbers must come from.

Requires Node.js >= 20. No Postgres/Redis needed for this design — the
problem doesn't require retrieval or async queueing.

## What problem this solves
Who: an SME support team (e.g. small e-commerce, service businesses)
running a WhatsApp customer support bot. Bottleneck: deciding which
conversations the bot can keep handling versus which need a human, right
now, without a person reading every single message. Get this wrong in
either direction and it costs the business: over-escalate and the
automation stops saving anyone time; under-escalate and an angry
customer — or a refund/cancellation request — gets handled by a bot that
has no authority to actually resolve it, which is worse than no bot at
all.

## How the agent system works
Three narrow agents, each auditable on its own:
- `src/agents/classifierAgent.ts` — reads the full conversation
  trajectory (not just the last message) and classifies sentiment,
  urgency, and any proposed consequential action, using a small policy
  reference (`data/policies.json`) to tell a routine, pre-approved
  request apart from a genuinely discretionary one.
- `src/agents/escalationAgent.ts` — takes the classification and decides
  bot_continue vs. escalate, with stated reasoning.
- `src/agents/actionGuardAgent.ts` — a **deterministic, non-LLM**
  verification gate: any proposed refund/cancel/discount is always
  routed to pending human approval, regardless of what the upstream
  agents decided. This is what satisfies Ground Rule 04 (human approval
  before consequential actions) and Ground Rule 05 (qualified human
  reviewer in the loop) — as a hard guarantee, not a hope.

`src/agents/supervisor.ts` orchestrates the three in sequence.

## Measured improvement
See [`EVALUATION.md`](EVALUATION.md) for the metric definition and
[`CHANGELOG.md`](CHANGELOG.md) for the iteration record. Numbers in both
right now are from a DRY RUN (offline heuristic stubs) — real numbers
need a LIVE run with an API key before they can be cited in the
submission.

## The queue dashboard
`npm run dashboard` turns `results/final.json` and `results/baseline.json`
into a self-contained `dashboard/index.html` — a queue view for a support
team lead: which conversations are pending human approval, why the agent
made each call, and how it compares to the baseline on the same case.
This is the artifact worth showing in the solution video, not raw JSON.

## Reproducing the main result
See [`REPRODUCTION.md`](REPRODUCTION.md).

## Hot take
See [`notes/hot-take.md`](notes/hot-take.md) — one real failure mode
observed during the build, and the lesson drawn from it.

## Changelog
See [`CHANGELOG.md`](CHANGELOG.md) for the iteration-by-iteration record
tying each change to evidence.

## The four deliverables (per the official brief)
1. **Solution code + changelog** — this repo + `CHANGELOG.md`, README
   states the intended user, bottleneck, and why it's valuable.
2. **Reproduction guide** — [`REPRODUCTION.md`](REPRODUCTION.md).
3. **Solution video (≤5 min)** — problem → baseline → one full
   execution → final comparison → changelog highlight → one removed
   experiment. Script this in `notes/video-script.md` before recording.
4. **Agent trajectories** — [`trajectories/`](trajectories/), one file
   per agent used.

## Ground rules checklist (self-check before submitting)
- [ ] Clear what existed before the hackathon vs. what was built during it
- [ ] Every tool/component used within its license/service terms
- [ ] Consequential actions run in a sandbox/simulation with human approval before execution
- [ ] A qualified human reviewer is part of the loop for anything that could significantly affect a real person
- [ ] Use case and data handling are legal and ethical
- [ ] Data is public, synthetic, or approved-anonymous only — no scraped/private data
- [ ] No credentials or secrets in the submission (check `.env` is gitignored)
- [ ] Every claim in the writeup traces to evidence in the submission
- [ ] Judges can run the project and reach the main result from a clean environment
