import { Classification, EscalationResult } from "../types.js";
import { isLiveMode, callJson } from "../llm/client.js";

const SYSTEM_PROMPT = `You are the escalation-decision agent for a WhatsApp customer support system.
You receive a classification (sentiment, urgency, proposed action, reasoning) for a conversation.
Decide: should this go to a human ("escalate") or can the bot continue handling it ("bot_continue")?

Rules of thumb:
- ANY proposedAction other than "none" should escalate — a bot should not unilaterally execute
  refunds/cancellations/discounts. This is true even if the customer's tone is calm.
- very_negative sentiment or high urgency should escalate even with no explicit action requested.
- Negative sentiment the customer explicitly waves off (no action requested, low urgency) should
  NOT escalate — over-escalating on tone alone defeats the point of automation.

Return JSON: { "decision": "bot_continue"|"escalate", "reasoning": "one sentence" }`;

export async function decideEscalation(classification: Classification): Promise<EscalationResult> {
  if (!isLiveMode) {
    const shouldEscalate =
      classification.proposedAction !== "none" ||
      classification.sentiment === "very_negative" ||
      classification.urgency === "high";

    return {
      decision: shouldEscalate ? "escalate" : "bot_continue",
      reasoning: `[dry-run heuristic] action=${classification.proposedAction}, sentiment=${classification.sentiment}, urgency=${classification.urgency}`,
    };
  }

  return callJson<EscalationResult>(SYSTEM_PROMPT, JSON.stringify(classification));
}
