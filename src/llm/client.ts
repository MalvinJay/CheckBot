import { ChatOpenAI } from "@langchain/openai";
import { config } from "../config.js";

/**
 * Two modes:
 *  - LIVE: OPENAI_API_KEY is set → real model call.
 *  - DRY RUN: no key → deterministic heuristic stub, so the whole
 *    pipeline can be run and typechecked offline (e.g. in CI, or while
 *    prepping before the API key / budget is available). Swap to LIVE
 *    at the hackathon by just setting OPENAI_API_KEY — no code changes.
 *
 * This is a real feature worth keeping in the submission, not just a
 * dev convenience: it makes REPRODUCTION.md's "clean environment" bar
 * easier to clear for a judge who doesn't want to spend API credits
 * just to verify the wiring works.
 */

export const isLiveMode = Boolean(config.openaiApiKey);

let _model: ChatOpenAI | null = null;
export function getModel(): ChatOpenAI {
  if (!isLiveMode) {
    throw new Error("getModel() called in dry-run mode — use the heuristic path instead.");
  }
  if (!_model) {
    _model = new ChatOpenAI({
      apiKey: config.openaiApiKey,
      model: "gpt-4o-mini",
      temperature: 0,
    });
  }
  return _model;
}

export async function callJson<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const model = getModel();
  const response = await model.invoke([
    { role: "system", content: systemPrompt + "\nRespond with ONLY valid JSON, no prose, no markdown fences." },
    { role: "user", content: userPrompt },
  ]);
  const text = response.content.toString().trim();
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new Error(`Model did not return valid JSON: ${text.slice(0, 200)}`);
  }
}
