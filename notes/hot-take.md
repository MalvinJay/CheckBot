# Hot Take / Insights (5% of score)

Rubric: "Turns an observed failure mode into a practical lesson for
building more reliable agents."

Jot down real failures AS THEY HAPPEN during the build — don't try to
invent an insight after the fact. The best entries here are usually:
- A place the agent confidently did the wrong thing, and why
- A place your routing/supervisor logic broke down under a case you
  hadn't anticipated
- A place more orchestration made things worse, not better (also a
  valid insight — judges are assessing purposeful agent use, not
  agent-maximalism)

## Log

- [dry-run, pre-kickoff prep] Observed:
  - Failure mode: the classifier agent flagged a "discount" proposedAction purely
    from keyword matching on a routine, bot-answerable pricing question ("any
    chance of a discount if I buy 3?"), which forced an unnecessary escalation
    through the action guard.
  - Likely cause: the classifier conflated "topic mentions discount" with
    "customer is requesting a discretionary exception that needs approval." A
    routine question about a published promotion is not the same as a customer
    demanding a one-off deal.
  - Lesson for building reliable agents: verification/guard layers are only as
    good as the classification feeding them — a deterministic action guard
    (Ground Rule 04 compliance) can still misfire if the upstream classifier is
    too blunt. The fix isn't to loosen the guard, it's to make the classifier
    distinguish "action within existing policy" from "action requiring
    discretion," e.g. by giving it the actual promo rules as context rather than
    asking it to guess from keywords alone.
  - Caveat: this was observed with the offline heuristic stub, not a live LLM
    call — re-test once LIVE mode is running at the actual event to see if a
    real model makes the same mistake or resolves it correctly on its own.
