export type AiAssistantRuntimeStatus =
  | "live_model_ready"
  | "deterministic_fallback_accepted"
  | "fallback_due_to_feed_failure"
  | "model_runtime_unavailable"
  | "preflight_failed"
  | "disabled_by_cost_policy"
  | "unknown";

export interface AiAssistantRuntimeStatusInput {
  hasSummary?: boolean;
  hasError?: boolean;
  enabled?: boolean;
  runtimeReady?: boolean;
  fallbackUsed?: boolean;
  responseState?: "live" | "saved" | "fallback" | null;
  feedStatus?: string | null;
  latencyMs?: number | null;
  configuredModel?: string | null;
  fallbackInputStale?: boolean;
}

export interface AiAssistantRuntimeStatusDecision {
  status: AiAssistantRuntimeStatus;
  modelRuntimeStatus: "model_config_ready" | "model_runtime_ready" | "model_runtime_unavailable" | "disabled" | "unknown";
  feedStatus: string;
  fallbackStatus: "none" | "deterministic_fallback_accepted" | "fallback_input_stale";
  providerCallAttempted: boolean;
  degradesSystemState: boolean;
  displayValue: string;
  operatorSummary: string;
  technicalEvidence: string;
  nextAction: string;
}

export function classifyAiAssistantRuntimeStatus(input: AiAssistantRuntimeStatusInput): AiAssistantRuntimeStatusDecision {
  const feedStatus = input.feedStatus || "polled";
  const configuredModel = input.configuredModel || "unknown model";
  const latencyMs = typeof input.latencyMs === "number" && Number.isFinite(input.latencyMs) ? Math.max(0, Math.trunc(input.latencyMs)) : null;
  const providerCallAttempted = input.responseState === "live" && latencyMs !== 0 && input.fallbackUsed !== true;
  const modelRuntimeStatus = input.enabled === false
    ? "disabled"
    : input.runtimeReady === false
      ? "model_runtime_unavailable"
      : input.runtimeReady === true
        ? "model_runtime_ready"
        : configuredModel !== "unknown model"
          ? "model_config_ready"
          : "unknown";
  const baseEvidence = `${configuredModel} configured | feedStatus=${feedStatus} | ${latencyMs === null ? "latency unknown" : `${latencyMs}ms`}`;

  if (input.enabled === false) {
    return {
      status: "disabled_by_cost_policy",
      modelRuntimeStatus,
      feedStatus,
      fallbackStatus: "none",
      providerCallAttempted: false,
      degradesSystemState: false,
      displayValue: "Off",
      operatorSummary: "AI summaries are turned off by cost policy.",
      technicalEvidence: `${baseEvidence} | disabled by cost policy`,
      nextAction: "Turn the assistant on only if live summaries are needed.",
    };
  }

  if (input.hasError || input.runtimeReady === false) {
    return {
      status: "model_runtime_unavailable",
      modelRuntimeStatus,
      feedStatus,
      fallbackStatus: "none",
      providerCallAttempted: false,
      degradesSystemState: false,
      displayValue: "Runtime unavailable",
      operatorSummary: "AI summary runtime is unavailable.",
      technicalEvidence: `${baseEvidence} | model runtime unavailable`,
      nextAction: "Check the assistant route response and configured model.",
    };
  }

  if (input.fallbackUsed) {
    const fallbackStatus = input.fallbackInputStale ? "fallback_input_stale" : "deterministic_fallback_accepted";
    const status: AiAssistantRuntimeStatus = input.fallbackInputStale
      ? "deterministic_fallback_accepted"
      : feedStatus === "failed"
        ? "fallback_due_to_feed_failure"
        : "deterministic_fallback_accepted";
    return {
      status,
      modelRuntimeStatus,
      feedStatus,
      fallbackStatus,
      providerCallAttempted: false,
      degradesSystemState: input.fallbackInputStale === true,
      displayValue: "Fallback",
      operatorSummary: feedStatus === "failed"
        ? "Deterministic fallback is active because assistant feed preflight failed."
        : "Deterministic fallback is active without a live model call.",
      technicalEvidence: `${baseEvidence} | ${feedStatus === "failed" ? "preflight observers failed" : `${feedStatus} preflight lane`} | runtime ready | deterministic fallback output`,
      nextAction: feedStatus === "failed"
        ? "Check assistant feed preflight; do not call the AI provider from this validation lane."
        : "No provider action needed unless live guidance is explicitly requested.",
    };
  }

  if (feedStatus === "failed") {
    return {
      status: "preflight_failed",
      modelRuntimeStatus,
      feedStatus,
      fallbackStatus: "none",
      providerCallAttempted,
      degradesSystemState: false,
      displayValue: "Delayed",
      operatorSummary: "AI feed preflight failed; latest summary may be delayed.",
      technicalEvidence: `${baseEvidence} | preflight observers failed | ${providerCallAttempted ? "live model output" : "no live model call"}`,
      nextAction: "Check assistant feed preflight before treating the live AI lane as current.",
    };
  }

  if (input.responseState === "live") {
    return {
      status: "live_model_ready",
      modelRuntimeStatus,
      feedStatus,
      fallbackStatus: "none",
      providerCallAttempted,
      degradesSystemState: false,
      displayValue: "Live",
      operatorSummary: "AI summary is current.",
      technicalEvidence: `${baseEvidence} | live model output`,
      nextAction: "No action needed.",
    };
  }

  return {
    status: "unknown",
    modelRuntimeStatus,
    feedStatus,
    fallbackStatus: "none",
    providerCallAttempted,
    degradesSystemState: false,
    displayValue: "Unknown",
    operatorSummary: "AI assistant status needs source classification.",
    technicalEvidence: `${baseEvidence} | responseState=${input.responseState ?? "unknown"}`,
    nextAction: "Refresh assistant status and classify feed/runtime/fallback lanes.",
  };
}
