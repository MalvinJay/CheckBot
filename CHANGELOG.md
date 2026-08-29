# Improvement Changelog

Official format (from the brief): one row per meaningful experiment,
including experiments you tried and removed. Explain what you tried,
why, the evidence (same eval method every time), and what you decided
next. This table + the baseline/final comparison together are the
"Measured Improvement" evidence (15%) — write rows as you go, not
after the fact.

| Stage | What you tried and why | Evidence | Decision / Learning |
|---|---|---|---|
| Baseline | Single direct prompt: one LLM call, decide escalate/bot_continue on the last customer message | (dry-run heuristic) accuracy=1.00, F1=1.00 on 12 synthetic cases | Established the starting point. NOTE: dry-run heuristic is deliberately crude (last-message-only) — this score is an artifact of small/easy eval set matching the heuristic's blind spots, not evidence the baseline is actually strong. Re-run LIVE before drawing real conclusions. |
| Iteration 1 | 3-agent pipeline: classify (sentiment/urgency/proposedAction) → decide escalation → deterministic action guard | (dry-run heuristic) accuracy=0.92, precision=0.83, recall=1.00, F1=0.91. Failed case: c10 (discount_request_minor) — classifier's keyword match on "discount" flagged a proposedAction even though the customer was asking a routine, bot-answerable pricing question, forcing an unnecessary escalation. | Kept the 3-agent structure — recall=1.00 (never misses a real escalation) matters more than one false positive for this problem. But the *classifier's* action-detection needs to distinguish "routine, bot-approved discount question" from "customer demanding a one-off exception," not just keyword-match on "discount". This is dry-run-heuristic-specific; verify whether a real LLM classifier makes the same mistake once LIVE. |
| Iteration 2 | _[fill in once live-mode results are in]_ | | |
| Iteration 3 | | | |
| Final | | | |

## Kept vs removed
List anything you tried and then removed — the brief explicitly wants
these, not just what shipped. "What it taught you about the problem"
is often worth more to a judge than another kept feature.

- [Removed] ... — why removed, what it taught you:

## Important caveat on the dry-run numbers above
The offline heuristic stubs (used when `OPENAI_API_KEY` is unset) are
deliberately crude approximations, not the real classifier/decision
logic — see `src/llm/client.ts`. The baseline scoring *higher* than the
agent pipeline in dry-run is very likely an artifact of the baseline
heuristic and eval set overlapping by luck, not evidence the simple
approach beats the agent design. Re-run `npm run eval` with a real
`OPENAI_API_KEY` before citing these numbers in the submission — the
dry-run's only real purpose was proving the pipeline wiring works.
