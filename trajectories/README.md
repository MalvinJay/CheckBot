# Agent Trajectories

Deliverable #4 per the brief: a representative trajectory for **every
agent you used**, easy to follow from instructions → actions → result.
Must show: the agent's instructions, what it did, how its tools
responded, the feedback that shaped its next step, and any retries or
human checkpoints.

This is evidence for the 30% "Agent Solution & Engineering" score and
the ground rules around human approval on consequential actions — don't
skip it or hand-wave it as "see the logs."

## What to capture per agent
One file per agent (or per agent-per-representative-case if behavior
varies meaningfully), named `<agent-name>-trajectory.md`:

1. **Agent instructions** — the actual system prompt used, verbatim.
2. **Input** — the task/context it received.
3. **Steps** — each tool call, its arguments, and the raw response.
4. **Feedback loop** — what changed the agent's next action (a tool
   result, a verification failure, a retry).
5. **Checkpoints** — any point a human approval gate fired (per Ground
   Rule 04) and what the human decided.
6. **Final output**.

## How to capture it mechanically
Cheapest option: log every LLM call and tool call to a JSON file
(prompt, response, tool name, tool args, tool result) and write a short
markdown narrative pointing at the relevant lines — don't try to
hand-transcribe from memory after the fact.

See `template.md` in this folder for the format to fill in per agent.
