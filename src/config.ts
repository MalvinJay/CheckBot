import "dotenv/config";

export const config = {
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  llmProvider: process.env.LLM_PROVIDER ?? "",      // "openai" | "gemini" | "" (auto)
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  runMode: (process.env.RUN_MODE ?? "agent") as "agent" | "baseline",
};

export function assertConfig() {
  const hasKey = config.openaiApiKey || config.geminiApiKey;
  if (!hasKey) {
    throw new Error(
      "No LLM API key is set. Set GEMINI_API_KEY (free) or OPENAI_API_KEY in .env."
    );
  }
}
