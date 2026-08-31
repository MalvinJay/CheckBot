import { assertConfig } from "./config.js";
import { runSupportTriage } from "./agents/supervisor.js";
import { isLiveMode } from "./llm/client.js";

/**
 * CLI entry point — runs a single conversation through the triage
 * pipeline. Pass the customer's message(s) as args, one per arg.
 * For the full evaluation, use `npm run eval` instead.
 */
async function main() {
  if (isLiveMode) assertConfig();

  const args = process.argv.slice(2);
  const customerText = args.length
    ? args.join(" ")
    : "I want a refund right now, this is ridiculous.";

  console.log(`[checkbot] mode: ${isLiveMode ? "LIVE" : "DRY RUN"}`);
  console.log(`[checkbot] input: "${customerText}"\n`);

  const result = await runSupportTriage("cli-run", [
    { from: "customer", text: customerText },
  ]);

  console.log("Classification:", result.classification);
  console.log("Escalation:", result.escalation);
  console.log("Guard:", result.guard);
}

main().catch((err) => {
  console.error("[checkbot] fatal error:", err);
  process.exit(1);
});
