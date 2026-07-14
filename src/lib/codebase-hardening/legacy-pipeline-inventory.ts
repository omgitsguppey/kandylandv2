import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";

export type LegacyPipelineItemType =
  | "legacy_event_alias"
  | "legacy_metric_alias"
  | "old_direct_telemetry_path"
  | "duplicate_normalizer"
  | "duplicate_debug_lane"
  | "duplicate_score_input"
  | "stale_generated_artifact"
  | "stale_validator"
  | "stale_cost_logic"
  | "stale_math_logic"
  | "hardcoded_score_or_gap"
  | "unsafe_unknown";

export type LegacyPipelineOwner =
  | "central_normalizer"
  | "event_envelope"
  | "event_fact"
  | "person_metrics"
  | "journey"
  | "debug_brain"
  | "score"
  | "cost"
  | "source_of_funds"
  | "legacy_recovery"
  | "no_owner";

export type LegacyPipelineAction =
  | "remove"
  | "reinforce_into_pipeline"
  | "legacy_alias"
  | "dry_run_recovery"
  | "leave_in_flight"
  | "unsafe_unknown";

export type LegacyPipelineImpact = "none" | "low" | "medium" | "high";

export type LegacyPipelineInventoryItem = {
  id: string;
  path: string;
  symbol?: string;
  type: LegacyPipelineItemType;
  currentOwnerPipeline: LegacyPipelineOwner;
  action: LegacyPipelineAction;
  reason: string;
  scoreImpact: PublicBetaHealthDimension[];
  costImpact: LegacyPipelineImpact;
  accuracyImpact: LegacyPipelineImpact;
  risk: LegacyPipelineImpact;
  exactNextStep: string;
};

export const LEGACY_PIPELINE_INVENTORY_VERSION = "2026.05.mega-legacy-pipeline-inventory.1";

export const LEGACY_PIPELINE_INVENTORY: LegacyPipelineInventoryItem[] = [
  {
    id: "legacy-alias-page-duration",
    path: "src/lib/math/legacy-metric-canonicalization.ts",
    symbol: "watch/page duration aliases",
    type: "legacy_metric_alias",
    currentOwnerPipeline: "legacy_recovery",
    action: "legacy_alias",
    reason: "Legacy page-duration labels can explain historical data but must not become current watch-time truth.",
    scoreImpact: ["evidenceCompleteness"],
    costImpact: "low",
    accuracyImpact: "high",
    risk: "medium",
    exactNextStep: "Keep mapped through legacy metric canonicalization with confidence capped below exact unless deterministic event truth exists.",
  },
  {
    id: "legacy-alias-unlock-open-unwrap",
    path: "src/lib/math/drop-watch-unlock-math.ts",
    symbol: "classifyDropAction",
    type: "legacy_event_alias",
    currentOwnerPipeline: "event_fact",
    action: "legacy_alias",
    reason: "Old drop_opened, unlock, and unwrap aliases represent real historical behavior but require separation before metrics consume them.",
    scoreImpact: ["sourceHealth", "evidenceCompleteness"],
    costImpact: "none",
    accuracyImpact: "high",
    risk: "medium",
    exactNextStep: "Keep old event names mapped to canonical open, unlock, unwrap, and watch facts before person/global metrics hydrate.",
  },
  {
    id: "direct-telemetry-track-event",
    path: "src/lib/telemetry-catalog.ts",
    symbol: "TELEMETRY_EVENT_EXTENSION_METADATA",
    type: "old_direct_telemetry_path",
    currentOwnerPipeline: "central_normalizer",
    action: "reinforce_into_pipeline",
    reason: "Direct telemetry calls are valid only when cataloged and routed through envelope, event fact, metrics, debug, and score mappings.",
    scoreImpact: ["sourceHealth", "runtimeHealth", "evidenceCompleteness"],
    costImpact: "medium",
    accuracyImpact: "high",
    risk: "medium",
    exactNextStep: "Validate direct telemetry paths through product body map, central normalizer, event translation bridge, and person metrics hydration.",
  },
  {
    id: "behavioral-event-fact-normalizer-adapter",
    path: "src/lib/behavioral/normalize-event-fact.ts",
    symbol: "normalizeBehavioralEventFactWithDiagnostics",
    type: "duplicate_normalizer",
    currentOwnerPipeline: "central_normalizer",
    action: "reinforce_into_pipeline",
    reason: "Behavioral normalizer remains canonical for event facts but must be invoked as the central normalizer fact adapter.",
    scoreImpact: ["sourceHealth", "evidenceCompleteness"],
    costImpact: "low",
    accuracyImpact: "high",
    risk: "low",
    exactNextStep: "Keep normalizeToEventFact as the central adapter and forbid new product limbs from calling raw fact normalization without classification.",
  },
  {
    id: "product-brain-raw-debug-drilldown",
    path: "src/lib/debug/debug-backlog-builder.ts",
    symbol: "debug backlog lanes",
    type: "duplicate_debug_lane",
    currentOwnerPipeline: "debug_brain",
    action: "reinforce_into_pipeline",
    reason: "Raw debug lanes still provide evidence, but the interpretive brain owns summary-first root cause triage.",
    scoreImpact: ["evidenceCompleteness", "freshness"],
    costImpact: "medium",
    accuracyImpact: "medium",
    risk: "medium",
    exactNextStep: "Keep raw debug evidence behind drilldowns and route summary actionability through interpretive brain findings.",
  },
  {
    id: "score-artifact-freshness-locks",
    path: "agent/state/*.generated.json",
    symbol: "generated report snapshots",
    type: "stale_generated_artifact",
    currentOwnerPipeline: "score",
    action: "reinforce_into_pipeline",
    reason: "Generated reports are evidence snapshots and cannot override current source or doctrine after freshness expiry.",
    scoreImpact: ["freshness", "evidenceCompleteness"],
    costImpact: "none",
    accuracyImpact: "medium",
    risk: "medium",
    exactNextStep: "Regenerate active score-owned reports or retire superseded artifacts from score inputs when a newer lock owns the lane.",
  },
  {
    id: "person-metric-gap-math",
    path: "src/lib/analytics/person-metrics-hydration.ts",
    symbol: "gapCount/debugLane.gaps/scoreImpactByDimension",
    type: "hardcoded_score_or_gap",
    currentOwnerPipeline: "person_metrics",
    action: "reinforce_into_pipeline",
    reason: "The prior fake-zero smell is fixed and must stay locked so computed missing hydration gaps cannot report as zero.",
    scoreImpact: ["evidenceCompleteness", "runtimeHealth"],
    costImpact: "none",
    accuracyImpact: "high",
    risk: "high",
    exactNextStep: "Keep debugLane.gaps and score impact tied to unique metric IDs across missing hydration and blocking user-parity gaps.",
  },
  {
    id: "cloud-sql-data-connect-agent-mirror",
    path: "dataconnect/**",
    symbol: "sql_dataconnect_agent_context_mirror",
    type: "stale_cost_logic",
    currentOwnerPipeline: "cost",
    action: "legacy_alias",
    reason: "Data Connect/Cloud SQL exists as an agent mirror; it is not runtime payment, Drop, chat, support, or creator truth.",
    scoreImpact: ["costRisk"],
    costImpact: "high",
    accuracyImpact: "medium",
    risk: "high",
    exactNextStep: "Keep SQL/Data Connect sync manual and cost-approved; never promote mirror rows to runtime truth without an ApiCostContract.",
  },
  {
    id: "legacy-source-of-funds-labels",
    path: "src/lib/math/gumdrop-ledger-math.ts",
    symbol: "classifyGumdropSource",
    type: "legacy_metric_alias",
    currentOwnerPipeline: "source_of_funds",
    action: "dry_run_recovery",
    reason: "Old free/bonus labels can recover source context only as dry-run candidates and must not change GumDrop spend or pricing math.",
    scoreImpact: ["sourceHealth", "evidenceCompleteness"],
    costImpact: "none",
    accuracyImpact: "high",
    risk: "high",
    exactNextStep: "Map old free labels to reward_gd unless deterministic purchase package proof exists; keep unknown source as legacy_unknown.",
  },
  {
    id: "runtime-formal-evidence-gates",
    path: "agent/state/public-beta-score.generated.json",
    symbol: "formal runtime/provider/admin gates",
    type: "duplicate_score_input",
    currentOwnerPipeline: "score",
    action: "leave_in_flight",
    reason: "Source validators improve confidence but cannot clear formal deployed runtime, provider, or production admin sample gates.",
    scoreImpact: ["runtimeHealth", "evidenceCompleteness"],
    costImpact: "none",
    accuracyImpact: "medium",
    risk: "medium",
    exactNextStep: "Keep formal gates classified with exact manual/runtime artifact next actions instead of converting source evidence into proof.",
  },
];

export function listLegacyPipelineInventory() {
  return [...LEGACY_PIPELINE_INVENTORY];
}

export function classifyLegacyPipelineItem(item: LegacyPipelineInventoryItem): LegacyPipelineAction {
  if (item.action === "unsafe_unknown") return "unsafe_unknown";
  if (item.currentOwnerPipeline === "no_owner") return "unsafe_unknown";
  return item.action;
}

export function summarizeLegacyPipelineInventory(items: readonly LegacyPipelineInventoryItem[] = LEGACY_PIPELINE_INVENTORY) {
  const actions = items.reduce<Record<LegacyPipelineAction, number>>((output, item) => {
    output[item.action] += 1;
    return output;
  }, {
    remove: 0,
    reinforce_into_pipeline: 0,
    legacy_alias: 0,
    dry_run_recovery: 0,
    leave_in_flight: 0,
    unsafe_unknown: 0,
  });

  const byType = items.reduce<Record<LegacyPipelineItemType, number>>((output, item) => {
    output[item.type] = (output[item.type] ?? 0) + 1;
    return output;
  }, {} as Record<LegacyPipelineItemType, number>);

  return {
    version: LEGACY_PIPELINE_INVENTORY_VERSION,
    total: items.length,
    actions,
    byType,
    unsafeUnknownCount: actions.unsafe_unknown,
    sourceOnly: true,
  };
}
