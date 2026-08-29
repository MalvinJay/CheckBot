import { Turn, Classification, ConsequentialAction, Sentiment, Urgency } from "../types.js";
import { isLiveMode, callJson } from "../llm/client.js";

const SYSTEM_PROMPT = `You are a classification agent for a WhatsApp customer support system.
Job: read the full conversation transcript and classify it. Do not decide whether to escalate —
that is a different agent's job. Only classify.

Return JSON: { "sentiment": "positive"|"neutral"|"negative"|"very_negative",
"urgency": "low"|"medium"|"high",
"proposedAction": "none"|"refund"|"cancel"|"discount",
"reasoning": "one sentence" }

Judge sentiment and urgency on the TRAJECTORY of the whole conversation, not just the last
message — tone can escalate gradually. proposedAction should reflect what the customer is
actually asking for, not just what topic they raised (e.g. asking a shipping-time FAQ is not
a refund request even if annoyed).`;

function transcriptToText(transcript: Turn[]): string {
  return transcript.map((t) => `${t.from}: ${t.text}`).join("\n");
}

/**
 * DRY-RUN heuristic — deliberately simple keyword/pattern rules, used only
 * when no API key is set. This is NOT the real classifier; it exists so
 * the pipeline can run end-to-end offline. The real scoring should always
 * use the LIVE path.
 */
function heuristicClassify(transcript: Turn[]): Classification {
  const fullText = transcriptToText(transcript).toLowerCase();
  const customerText = transcript
    .filter((t) => t.from === "customer")
    .map((t) => t.text.toLowerCase())
    .join(" ");

  let proposedAction: ConsequentialAction = "none";
  if (/refund|money back|charged twice|dispute/.test(customerText)) proposedAction = "refund";
  else if (/cancel/.test(customerText)) proposedAction = "cancel";
  else if (/discount/.test(customerText)) proposedAction = "discount";

  const severeMarkers = /ridiculous|theft|scam|unacceptable|useless|cracked|broken|fraud/.test(customerText);
  const mildNegativeMarkers = /annoying|not happy|whatever|don't worry/.test(customerText);
  const explicitDismissal = /don't worry about it|it's fine|it's whatever|just wanted you to know/.test(customerText);

  let sentiment: Sentiment = "neutral";
  if (severeMarkers) sentiment = "very_negative";
  else if (mildNegativeMarkers && !explicitDismissal) sentiment = "negative";
  else if (mildNegativeMarkers && explicitDismissal) sentiment = "neutral"; // customer waved it off
  else if (/thank you|great|early|thanks/.test(customerText)) sentiment = "positive";

  // Trajectory check: multiple customer turns with escalating negative language
  const customerTurns = transcript.filter((t) => t.from === "customer");
  const laterTurnsHarsher =
    customerTurns.length >= 2 &&
    /unacceptable|disputing|today/.test(customerTurns[customerTurns.length - 1].text.toLowerCase());
  if (laterTurnsHarsher) sentiment = "very_negative";

  let urgency: Urgency = "low";
  if (sentiment === "very_negative" || proposedAction === "refund") urgency = "high";
  else if (sentiment === "negative" || proposedAction !== "none") urgency = "medium";

  return {
    sentiment,
    urgency,
    proposedAction,
    reasoning: "[dry-run heuristic] keyword + trajectory based classification",
  };
}

export async function classify(transcript: Turn[]): Promise<Classification> {
  if (!isLiveMode) {
    return heuristicClassify(transcript);
  }
  return callJson<Classification>(SYSTEM_PROMPT, transcriptToText(transcript));
}
