# Evaluation

## Primary metric
State ONE primary metric that reflects what success means to the
*intended user* (not to you as the builder). Examples from the brief:
tests passing (developer), time/cost saved (ops), calibration
(forecasting). Pick the one that best captures the improvement your
solution promises — resist tracking five metrics equally.

**Primary metric:** Escalation-class F1 score (precision + recall on
the "should this go to a human" decision), with recall weighted as the
more important half.

**Why this metric:** The support team's actual cost structure is
asymmetric — a missed escalation (false negative) means an angry
customer gets a bot response when they needed a human, which is the
exact failure this system exists to prevent. A false-positive escalation
just costs a bit of unnecessary human review time. Recall matters more
than precision here, so F1 alone isn't quite sufficient — report recall
alongside it, and treat any recall regression as a blocking issue
regardless of what happens to precision.

## Baseline definition
Pick ONE, and be honest/fair about it — a crippled strawman baseline
costs credibility:
- [x] One direct prompt with basic instructions
- [ ] One general-purpose agent with basic tools
- [ ] A simple script or template
- [ ] The manual process people use today

**Chosen baseline:** A single LLM call (`src/baseline.ts`) given the
full transcript, asked to decide escalate/bot_continue directly — no
separate classification step, no verification/action-guard layer, no
explicit trajectory reasoning beyond what's implicit in one prompt. This
is a fair comparison because it has the same input (full transcript) and
the same model — the only difference is the agent pipeline's structure
(classify → decide → guard), which is exactly the thing being evaluated.

## Eval set
- Target: 10+ cases where the task allows it.
- Same cases run against baseline AND final solution — no exceptions.
- Include **at least one deliberately challenging/edge case** and explain
  what it revealed in the writeup.
- Note any meaningful difference in resources available to baseline vs.
  agent (e.g. agent has retrieval, baseline doesn't) — the brief requires
  explaining this, not hiding it.

## Results

| Metric | Simple Baseline | Agent Solution | Change |
|---|---|---|---|
| Primary outcome | | | |
| Human time per task | | | |
| Cost per task | | | |

If this table format doesn't fit the task well, replace it with your own
scoring rubric and explain it here — the brief explicitly allows this,
but you must propose the rubric so judges can use it.

## The challenging case
Three cases in the eval set are deliberately adversarial:
- **c06 / c12** — negative-sounding language where the customer
  explicitly waves off any action ("don't worry about it", "just wanted
  you to know"). Tests whether the agent over-escalates on sentiment
  words alone vs. reading actual intent. Both agent and baseline got
  these right in dry-run.
- **c08** — tone escalates gradually across four turns rather than
  being obvious from the first message; tests whether the agent
  considers the whole trajectory or just scores the latest message.
- **c10** (not originally flagged as "challenging" but turned out to be
  one) — revealed a real gap: the classifier's keyword match on
  "discount" triggered an unnecessary escalation for a routine,
  bot-answerable pricing question. See `notes/hot-take.md` for the full
  writeup — this is the most useful finding from the dry run.
