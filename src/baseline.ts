import { Turn, Decision } from "./types.js";
import { isLiveMode, callJson } from "./llm/client.js";

/**
 * BASELINE
 * --------
 * Per the brief: "one direct prompt with basic instructions." No
 * classification/escalation/guard separation, no verification gate,
 * no trajectory reasoning beyond whatever's implicit in one prompt.
 * This is what "a reasonable basic way to handle the task before using
 * your solution" looks like for this problem — a single competent
 * prompt, not a strawman.
 */

const BASELINE_PROMPT = `You are a WhatsApp customer support triage assistant.
Read this conversation and decide: should it be escalated to a human agent, or can
the bot keep handling it? Reply with ONLY JSON: { "decision": "bot_continue"|"escalate" }`;

function transcriptToText(transcript: Turn[]): string {
  return transcript.map((t) => `${t.from}: ${t.text}`).join("\n");
}

function heuristicBaseline(transcript: Turn[]): Decision {
  // Intentionally cruder than the agent pipeline's heuristic: reacts to
  // the LAST customer message only, no trajectory awareness, no
  // action-vs-tone distinction — this is what a single-prompt baseline
  // without orchestration would plausibly get wrong.
  const customerTurns = transcript.filter((t) => t.from === "customer");
  const lastMessage = customerTurns[customerTurns.length - 1]?.text.toLowerCase() ?? "";
  const negative = /refund|cancel|ridiculous|unacceptable|scam|useless|cracked|broken|theft/.test(
    lastMessage
  );
  return negative ? "escalate" : "bot_continue";
}

export async function runBaselineTriage(transcript: Turn[]): Promise<Decision> {
  if (!isLiveMode) {
    return heuristicBaseline(transcript);
  }
  const result = await callJson<{ decision: Decision }>(
    BASELINE_PROMPT,
    transcriptToText(transcript)
  );
  return result.decision;
}
