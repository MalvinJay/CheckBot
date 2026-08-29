import { Classification, EscalationResult, GuardResult } from "../types.js";

/**
 * ACTION GUARD
 * ------------
 * Deliberately NOT an LLM call. This is the verification layer required
 * by Ground Rule 04 ("keep consequential actions controlled through a
 * sandbox or simulation, add human approval before the action happens")
 * and Ground Rule 05 ("make a qualified human reviewer part of any
 * solution that could significantly affect someone").
 *
 * A refund/cancel/discount is never auto-executed by this system —
 * this gate is what makes that guarantee, deterministically, regardless
 * of what the upstream LLM agents decided. That's the point: purposeful
 * verification, not an extra LLM call for its own sake.
 */
export function guardAction(
  classification: Classification,
  escalation: EscalationResult
): GuardResult {
  if (classification.proposedAction === "none") {
    return { status: "not_required", note: "No consequential action proposed." };
  }

  if (escalation.decision !== "escalate") {
    // Should not happen if escalationAgent is working correctly — treat as a
    // safety violation and force escalation regardless of what upstream said.
    return {
      status: "pending_human_approval",
      note: `SAFETY OVERRIDE: proposedAction="${classification.proposedAction}" but escalation decision was "${escalation.decision}". Forcing human approval — this should be logged as a bug if it occurs.`,
    };
  }

  return {
    status: "pending_human_approval",
    note: `Action "${classification.proposedAction}" queued for human approval. Not executed automatically.`,
  };
}
