import { readFileSync, writeFileSync } from "node:fs";
import { runSupportTriage } from "../agents/supervisor.js";
import { runBaselineTriage } from "../baseline.js";
import { Turn, Decision } from "../types.js";
import { isLiveMode } from "../llm/client.js";

interface EvalCase {
  id: string;
  label: string;
  transcript: Turn[];
  expectedDecision: Decision;
  expectedAction: string;
  isChallengingCase: boolean;
  note: string;
}

interface CaseResult {
  id: string;
  label: string;
  expectedDecision: Decision;
  predictedDecision: Decision;
  correct: boolean;
  actionCaughtCorrectly?: boolean;
  isChallengingCase: boolean;
}

function loadCases(): EvalCase[] {
  const raw = readFileSync(
    new URL("../../data/conversations.json", import.meta.url),
    "utf-8"
  );
  return JSON.parse(raw).cases as EvalCase[];
}

function scoreDecisions(results: CaseResult[]) {
  const total = results.length;
  const correct = results.filter((r) => r.correct).length;
  const accuracy = correct / total;

  // Escalation-class precision/recall (the class that matters most — a
  // missed escalation is worse than an unnecessary one).
  const actualEscalate = results.filter((r) => r.expectedDecision === "escalate");
  const predictedEscalate = results.filter((r) => r.predictedDecision === "escalate");
  const truePositives = results.filter(
    (r) => r.expectedDecision === "escalate" && r.predictedDecision === "escalate"
  ).length;

  const recall = actualEscalate.length ? truePositives / actualEscalate.length : 1;
  const precision = predictedEscalate.length ? truePositives / predictedEscalate.length : 1;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;

  const challengingCases = results.filter((r) => r.isChallengingCase);
  const challengingCorrect = challengingCases.filter((r) => r.correct).length;

  return { total, correct, accuracy, precision, recall, f1, challengingCases: challengingCases.length, challengingCorrect };
}

async function runMode(mode: "baseline" | "agent", cases: EvalCase[]): Promise<CaseResult[]> {
  const results: CaseResult[] = [];
  for (const c of cases) {
    let predicted: Decision;
    if (mode === "baseline") {
      predicted = await runBaselineTriage(c.transcript);
    } else {
      const pipeline = await runSupportTriage(c.id, c.transcript);
      predicted = pipeline.escalation.decision;
    }
    results.push({
      id: c.id,
      label: c.label,
      expectedDecision: c.expectedDecision,
      predictedDecision: predicted,
      correct: predicted === c.expectedDecision,
      isChallengingCase: c.isChallengingCase,
    });
  }
  return results;
}

async function main() {
  const cases = loadCases();
  console.log(`[eval] mode: ${isLiveMode ? "LIVE (OpenAI)" : "DRY RUN (heuristic stub)"}`);
  console.log(`[eval] ${cases.length} cases loaded\n`);

  const baselineResults = await runMode("baseline", cases);
  const agentResults = await runMode("agent", cases);

  const baselineScore = scoreDecisions(baselineResults);
  const agentScore = scoreDecisions(agentResults);

  console.log("--- Baseline ---");
  console.table(baselineResults.map((r) => ({ id: r.id, expected: r.expectedDecision, got: r.predictedDecision, correct: r.correct })));
  console.log(`accuracy=${baselineScore.accuracy.toFixed(2)} precision=${baselineScore.precision.toFixed(2)} recall=${baselineScore.recall.toFixed(2)} f1=${baselineScore.f1.toFixed(2)}`);
  console.log(`challenging cases: ${baselineScore.challengingCorrect}/${baselineScore.challengingCases} correct\n`);

  console.log("--- Agent solution ---");
  console.table(agentResults.map((r) => ({ id: r.id, expected: r.expectedDecision, got: r.predictedDecision, correct: r.correct })));
  console.log(`accuracy=${agentScore.accuracy.toFixed(2)} precision=${agentScore.precision.toFixed(2)} recall=${agentScore.recall.toFixed(2)} f1=${agentScore.f1.toFixed(2)}`);
  console.log(`challenging cases: ${agentScore.challengingCorrect}/${agentScore.challengingCases} correct\n`);

  const timestamp = new Date().toISOString();

  writeFileSync(
    new URL("../../results/baseline.json", import.meta.url),
    JSON.stringify(
      {
        runLabel: "baseline",
        timestamp,
        taskDescription: "Single direct-prompt escalation triage, no orchestration/guard",
        metrics: baselineScore,
        sampleOutputs: baselineResults,
        notes: isLiveMode ? "" : "DRY RUN using offline heuristic stub — rerun with OPENAI_API_KEY set for real scoring.",
      },
      null,
      2
    )
  );

  writeFileSync(
    new URL("../../results/final.json", import.meta.url),
    JSON.stringify(
      {
        runLabel: "final",
        timestamp,
        taskDescription: "3-agent pipeline: classify -> decide escalation -> action guard",
        metrics: agentScore,
        sampleOutputs: agentResults,
        notes: isLiveMode ? "" : "DRY RUN using offline heuristic stub — rerun with OPENAI_API_KEY set for real scoring.",
      },
      null,
      2
    )
  );

  console.log("[eval] wrote results/baseline.json and results/final.json");
}

main().catch((err) => {
  console.error("[eval] fatal error:", err);
  process.exit(1);
});
