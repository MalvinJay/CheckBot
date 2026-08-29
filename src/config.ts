import "dotenv/config";

export const config = {
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  runMode: (process.env.RUN_MODE ?? "agent") as "agent" | "baseline",
};

export function assertConfig() {
  if (!config.openaiApiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Copy .env.example to .env and fill it in."
    );
  }
}
