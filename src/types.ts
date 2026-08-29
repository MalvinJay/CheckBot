export interface Turn {
  from: "customer" | "bot";
  text: string;
}

export type Sentiment = "positive" | "neutral" | "negative" | "very_negative";
export type Urgency = "low" | "medium" | "high";
export type ConsequentialAction = "none" | "refund" | "cancel" | "discount";

export interface Classification {
  sentiment: Sentiment;
  urgency: Urgency;
  proposedAction: ConsequentialAction;
  reasoning: string;
}

export type Decision = "bot_continue" | "escalate";

export interface EscalationResult {
  decision: Decision;
  reasoning: string;
}

export type ApprovalStatus = "not_required" | "pending_human_approval" | "approved" | "rejected";

export interface GuardResult {
  status: ApprovalStatus;
  note: string;
}

export interface PipelineResult {
  caseId: string;
  classification: Classification;
  escalation: EscalationResult;
  guard: GuardResult;
}
