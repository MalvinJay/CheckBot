import https from "node:https";
import { ChatOpenAI } from "@langchain/openai";
import { config } from "../config.js";

/**
 * Two modes:
 *  - LIVE: an LLM key is set (OpenAI or Gemini) → real model call.
 *  - DRY RUN: no key → deterministic heuristic stub, so the whole
 *    pipeline can be run and typechecked offline.
 *
 * Provider selection:
 *  - LLM_PROVIDER=openai  → uses OPENAI_API_KEY  + gpt-4o-mini
 *  - LLM_PROVIDER=gemini  → uses GEMINI_API_KEY  + gemini-3.6-flash (free tier)
 *  - If LLM_PROVIDER is unset, auto-detect: prefer Gemini if its key
 *    is present, else fall back to OpenAI.
 *
 * Swap providers at the hackathon by changing one env var — no code changes.
 */

type Provider = "openai" | "gemini";

function detectProvider(): Provider {
  const explicit = config.llmProvider;
  if (explicit === "openai" || explicit === "gemini") return explicit;
  // Auto-detect: prefer gemini (free tier) when both keys are present.
  if (config.geminiApiKey) return "gemini";
  if (config.openaiApiKey) return "openai";
  return "gemini"; // default (will fail at runtime if no key, but isLiveMode will be false)
}

export const provider: Provider = detectProvider();
export const isLiveMode = Boolean(
  provider === "gemini" ? config.geminiApiKey : config.openaiApiKey
);

// ── OpenAI (LangChain) ──────────────────────────────────────────────
let _openaiModel: ChatOpenAI | null = null;
function getOpenAIModel(): ChatOpenAI {
  if (!_openaiModel) {
    _openaiModel = new ChatOpenAI({
      apiKey: config.openaiApiKey,
      model: "gpt-4o-mini",
      temperature: 0,
    });
  }
  return _openaiModel;
}

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const model = getOpenAIModel();
  const response = await model.invoke([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);
  return response.content.toString().trim();
}

// ── Gemini (raw HTTPS, IPv4-forced) ─────────────────────────────────
// Node.js 24's undici/fetch tries IPv6 first for googleapis.com and
// hangs indefinitely on some networks. Using the built-in `https`
// module with `family: 4` forces IPv4 and avoids the issue entirely.

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message: string; code: number };
}

function geminiRequest(body: object): Promise<GeminiResponse> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const url = new URL(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${config.geminiApiKey}`
    );

    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: "POST",
        family: 4,                               // ← force IPv4
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: 60_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString();
          try {
            resolve(JSON.parse(raw) as GeminiResponse);
          } catch {
            reject(new Error(`Gemini returned non-JSON: ${raw.slice(0, 300)}`));
          }
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Gemini API request timed out (60 s)"));
    });
    req.write(payload);
    req.end();
  });
}

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: { temperature: 0 },
  };

  let maxRetries = 3;
  let delayMs = 1500;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const data = await geminiRequest(body);

      if (data.error) {
        // Retry on transient 503 (High Demand) or 429 (Rate Limit)
        if ((data.error.code === 503 || data.error.code === 429) && attempt < maxRetries) {
          const waitSec = data.error.code === 429 ? 12 : delayMs / 1000;
          console.warn(`[gemini] ${data.error.code === 429 ? "Rate limit (429)" : "Transient error 503"}, waiting ${waitSec}s before retry (attempt ${attempt}/${maxRetries})...`);
          await new Promise((res) => setTimeout(res, waitSec * 1000));
          delayMs *= 2;
          continue;
        }
        throw new Error(`Gemini API error ${data.error.code}: ${data.error.message}`);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error(`Gemini returned no text: ${JSON.stringify(data).slice(0, 300)}`);
      }
      return text.trim();
    } catch (err: any) {
      if (attempt < maxRetries && err.message?.includes("503")) {
        console.warn(`[gemini] Network/503 error, retrying in ${delayMs}ms...`);
        await new Promise((res) => setTimeout(res, delayMs));
        delayMs *= 2;
        continue;
      }
      throw err;
    }
  }
  throw new Error("Gemini API max retries exceeded");
}

// ── Unified public API ──────────────────────────────────────────────

export async function callJson<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  if (!isLiveMode) {
    throw new Error("callJson() called in dry-run mode — use the heuristic path instead.");
  }

  const fullSystem = systemPrompt + "\nRespond with ONLY valid JSON, no prose, no markdown fences.";

  const text =
    provider === "gemini"
      ? await callGemini(fullSystem, userPrompt)
      : await callOpenAI(fullSystem, userPrompt);

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new Error(`Model did not return valid JSON: ${text.slice(0, 200)}`);
  }
}
