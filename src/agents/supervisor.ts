import { Turn, PipelineResult } from "../types.js";
import { classify } from "./classifierAgent.js";
import { decideEscalation } from "./escalationAgent.js";
import { guardAction } from "./actionGuardAgent.js";

/**
 * SUPERVISOR — orchestrates the three-agent pipeline:
 *   classify -> decide escalation -> guard consequential actions
 *
 * Kept as three narrow agents rather than one do-everything prompt
 * because (a) the escalation decision needs to be auditable on its own
 * (traceable reasoning, per Ground Rule 09: connect every claim to
 * evidence) and (b) the action guard must be a deterministic gate that
 * can't be reasoned around by an LLM having a bad turn.
 */
export async function runSupportTriage(
  caseId: string,
  transcript: Turn[]
): Promise<PipelineResult> {
  const classification = await classify(transcript);
  const escalation = await decideEscalation(classification);
  const guard = guardAction(classification, escalation);

  return { caseId, classification, escalation, guard };
}
