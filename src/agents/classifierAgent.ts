import { readFileSync } from "node:fs";
import { Turn, Classification, ConsequentialAction, Sentiment, Urgency } from "../types.js";
import { isLiveMode, callJson } from "../llm/client.js";

/**
 * ITERATION 2: classifier now receives policy context (data/policies.json)
 * instead of guessing proposedAction from keywords alone. This directly
 * fixes the c10 false-positive found in the dry run — see CHANGELOG.md
 * and notes/hot-take.md for the before/after story.
 */
const policyContext = readFileSync(
  new URL("../../data/policies.json", import.meta.url),
  "utf-8"
);

const SYSTEM_PROMPT = `You are a classification agent for a WhatsApp customer support system.
Job: read the full conversation transcript and classify it. Do not decide whether to escalate —
that is a different agent's job. Only classify.

You have access to this team's policy reference — use it to distinguish a ROUTINE question
(bot can already answer it, no approval needed) from a DISCRETIONARY request (needs a human):

${policyContext}

Return JSON: { "sentiment": "positive"|"neutral"|"negative"|"very_negative",
"urgency": "low"|"medium"|"high",
"proposedAction": "none"|"refund"|"cancel"|"discount",
"reasoning": "one sentence" }

Judge sentiment and urgency on the TRAJECTORY of the whole conversation, not just the last
message — tone can escalate gradually. proposedAction should reflect what the customer is
actually asking for AND whether it falls inside the pre-approved policy above — e.g. a
question about a published multi-item discount is proposedAction="none" (routine, bot can
answer it), while a discount request tied to a complaint is proposedAction="discount" even
if it's about the same topic. Refund requests are ALWAYS proposedAction="refund", no exceptions.`;

function transcriptToText(transcript: Turn[]): string {
  return transcript.map((t) => `${t.from}: ${t.text}`).join("\n");
}

/**
 * DRY-RUN heuristic — deliberately simple keyword/pattern rules, used only
 * when no API key is set. Now policy-aware: distinguishes a routine
 * multi-buy discount question from a discretionary discount request tied
 * to a complaint, instead of matching on the word "discount" alone.
 */
function heuristicClassify(transcript: Turn[]): Classification {
  const customerText = transcript
    .filter((t) => t.from === "customer")
    .map((t) => t.text.toLowerCase())
    .join(" ");

  const severeMarkers = /ridiculous|theft|scam|unacceptable|useless|cracked|broken|fraud/.test(customerText);
  const mildNegativeMarkers = /annoying|not happy|whatever|don't worry/.test(customerText);
  const explicitDismissal = /don't worry about it|it's fine|it's whatever|just wanted you to know/.test(customerText);

  let sentiment: Sentiment = "neutral";
  if (severeMarkers) sentiment = "very_negative";
  else if (mildNegativeMarkers && !explicitDismissal) sentiment = "negative";
  else if (mildNegativeMarkers && explicitDismissal) sentiment = "neutral";
  else if (/thank you|great|early|thanks/.test(customerText)) sentiment = "positive";

  const customerTurns = transcript.filter((t) => t.from === "customer");
  const laterTurnsHarsher =
    customerTurns.length >= 2 &&
    /unacceptable|disputing|today/.test(customerTurns[customerTurns.length - 1].text.toLowerCase());
  if (laterTurnsHarsher) sentiment = "very_negative";

  // Refund: unconditional, per policy.
  let proposedAction: ConsequentialAction = "none";
  if (/refund|money back|charged twice|dispute/.test(customerText)) {
    proposedAction = "refund";
  } else if (/cancel/.test(customerText)) {
    proposedAction = "cancel";
  } else if (/discount/.test(customerText)) {
    // POLICY-AWARE CHECK: a routine multi-buy discount question, with no
    // complaint/negative sentiment attached, is pre-approved -> not an action.
    const isRoutineMultiBuyQuestion = /buy\s*\d|multiple|3\+|bulk/.test(customerText);
    const tiedToComplaint = sentiment === "negative" || sentiment === "very_negative";
    proposedAction = isRoutineMultiBuyQuestion && !tiedToComplaint ? "none" : "discount";
  }

  let urgency: Urgency = "low";
  if (sentiment === "very_negative" || proposedAction === "refund") urgency = "high";
  else if (sentiment === "negative" || proposedAction !== "none") urgency = "medium";

  return {
    sentiment,
    urgency,
    proposedAction,
    reasoning: "[dry-run heuristic, policy-aware v2] keyword + trajectory + policy-context based classification",
  };
}

export async function classify(transcript: Turn[]): Promise<Classification> {
  if (!isLiveMode) {
    return heuristicClassify(transcript);
  }
  return callJson<Classification>(SYSTEM_PROMPT, transcriptToText(transcript));
}
