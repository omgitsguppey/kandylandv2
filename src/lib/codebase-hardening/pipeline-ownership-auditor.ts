import {
  PIPELINE_OWNERSHIP_ORDER,
  type PipelineOwnershipAuditReport,
  type PipelineOwnershipRecord,
} from "./pipeline-ownership-contract";

const OWNERSHIP_RECORDS: PipelineOwnershipRecord[] = [
  {
    id: "routes-surfaces-feature-registry",
    subject: "routes and user-facing surfaces",
    stage: "feature_surface_registry",
    canonicalOwner: "src/lib/features/feature-registration-registry.ts + src/lib/product-integrity/product-body-map.ts",
    sourceFiles: ["src/lib/features/feature-registration-registry.ts", "src/lib/product-integrity/product-body-map.ts"],
    status: "owned",
    severity: "info",
    scoreImpact: ["sourceHealth", "evidenceCompleteness"],
    exemption: "none",
    reason: "Major limbs are mapped to body systems before normalizer/debug/score consumption.",
    exactNextAction: "Require every new route or surface to declare feature, body system, telemetry, debug, score, and cost mapping.",
  },
  {
    id: "raw-actions-central-normalizer",
    subject: "raw product signals",
    stage: "central_normalizer",
    canonicalOwner: "src/lib/product-integrity/central-normalizer.ts",
    sourceFiles: ["src/lib/product-integrity/central-normalizer.ts"],
    status: "owned",
    severity: "info",
    scoreImpact: ["sourceHealth", "evidenceCompleteness"],
    exemption: "none",
    reason: "Signals route through central normalizer adapters before metrics, journey, debug, score, and export facts.",
    exactNextAction: "Classify any direct pathway as adapter, documented exemption, or unsafe_unknown.",
  },
  {
    id: "telemetry-event-envelope",
    subject: "telemetry event envelopes",
    stage: "event_envelope",
    canonicalOwner: "src/lib/analytics/event-envelope-builder.ts",
    sourceFiles: ["src/lib/analytics/event-envelope-builder.ts", "src/lib/analytics/event-envelope-contract.ts"],
    status: "owned",
    severity: "info",
    scoreImpact: ["sourceHealth"],
    exemption: "none",
    reason: "Canonical envelopes preserve who/what/when/where/source/dedupe fields before fact normalization.",
    exactNextAction: "Do not add telemetry events without catalog and envelope validation.",
  },
  {
    id: "normalized-event-facts",
    subject: "behavioral event facts",
    stage: "event_fact",
    canonicalOwner: "src/lib/behavioral/normalize-event-fact.ts",
    sourceFiles: ["src/lib/behavioral/normalize-event-fact.ts", "src/lib/behavioral/event-fact-contract.ts"],
    status: "owned",
    severity: "info",
    scoreImpact: ["sourceHealth", "evidenceCompleteness"],
    exemption: "none",
    reason: "Event facts are normalized once before metrics, journeys, and exports consume them.",
    exactNextAction: "Keep alias mappings inside legacy/canonical recovery and event fact normalizer.",
  },
  {
    id: "person-global-metrics",
    subject: "global/user/person metrics",
    stage: "person_global_metrics",
    canonicalOwner: "src/lib/analytics/person-metrics-hydration.ts + src/lib/math/global-user-counting-math.ts",
    sourceFiles: ["src/lib/analytics/person-metrics-hydration.ts", "src/lib/math/global-user-counting-math.ts"],
    status: "owned",
    severity: "info",
    scoreImpact: ["evidenceCompleteness"],
    exemption: "none",
    reason: "Metrics count through canonical dedupe and linked-person rules with real gap reporting.",
    exactNextAction: "Block scattered count logic unless it calls the canonical math module.",
  },
  {
    id: "duration-journey-watch-math",
    subject: "session, watch, bounce, and journey duration",
    stage: "session_watch_journey_math",
    canonicalOwner: "src/lib/math/session-journey-math.ts + src/lib/math/drop-watch-unlock-math.ts",
    sourceFiles: ["src/lib/math/session-journey-math.ts", "src/lib/math/drop-watch-unlock-math.ts"],
    status: "owned",
    severity: "info",
    scoreImpact: ["sourceHealth", "evidenceCompleteness"],
    exemption: "none",
    reason: "Page duration, hidden time, active time, watch time, and unknown duration are separated.",
    exactNextAction: "Reject pageDurationMs as watch time and hidden time as active time.",
  },
  {
    id: "source-funds-revenue-entitlements",
    subject: "GumDrop source-of-funds, revenue, Fan Pass, entitlements",
    stage: "source_of_funds_revenue_entitlement_math",
    canonicalOwner: "src/lib/math/gumdrop-ledger-math.ts + src/lib/math/creator-revenue-entitlement-math.ts",
    sourceFiles: ["src/lib/math/gumdrop-ledger-math.ts", "src/lib/math/creator-revenue-entitlement-math.ts"],
    status: "owned",
    severity: "info",
    scoreImpact: ["sourceHealth", "evidenceCompleteness"],
    exemption: "none",
    reason: "Source classification and entitlement truth are separated from payment runtime and payout formulas.",
    exactNextAction: "Keep reward, paid, bonus, refund, and unknown legacy buckets explicit without changing runtime math.",
  },
  {
    id: "debug-product-brain",
    subject: "debug and root-cause triage",
    stage: "debug_interpretive_brain",
    canonicalOwner: "src/lib/product-integrity/interpretive-brain.ts",
    sourceFiles: ["src/lib/product-integrity/interpretive-brain.ts", "src/lib/debug/debug-backlog-builder.ts"],
    status: "owned",
    severity: "info",
    scoreImpact: ["evidenceCompleteness", "freshness"],
    exemption: "none",
    reason: "Debug summaries route through interpreted findings while raw lanes stay drilldown evidence.",
    exactNextAction: "Do not introduce new default debug lanes without root cause, owner, score impact, and next action.",
  },
  {
    id: "score-evidence-cost",
    subject: "score evidence and cost readiness",
    stage: "score_evidence_cost",
    canonicalOwner: "src/lib/agent-score/* + src/lib/math/cost-export-parity-math.ts",
    sourceFiles: ["src/lib/agent-score/core.ts", "src/lib/math/cost-export-parity-math.ts"],
    status: "owned",
    severity: "info",
    scoreImpact: ["freshness", "costRisk", "regressionRisk"],
    exemption: "none",
    reason: "Source guards improve cost/source readiness but external billing and formal runtime gates remain separate.",
    exactNextAction: "Keep cost owner-review lanes exact and never claim provider billing proof from source validators.",
  },
  {
    id: "display-state-accuracy",
    subject: "user, creator, and admin metric display",
    stage: "display_state",
    canonicalOwner: "src/lib/math/metric-display-accuracy.ts",
    sourceFiles: ["src/lib/math/metric-display-accuracy.ts"],
    status: "owned",
    severity: "info",
    scoreImpact: ["evidenceCompleteness"],
    exemption: "none",
    reason: "Display states prevent missing or weak data from looking like exact zero.",
    exactNextAction: "Require provenZero, confidence, freshness, and source truth before displaying exact-looking numbers.",
  },
];

export function auditPipelineOwnership(input?: { generatedAtUtc?: string; records?: readonly PipelineOwnershipRecord[] }): PipelineOwnershipAuditReport {
  const ownershipStages = [...(input?.records ?? OWNERSHIP_RECORDS)];
  const duplicateOwners = findDuplicateOwners({ ownershipStages });
  const missingOwners = findMissingOwners({ ownershipStages });
  const bypassedPipelines = findBypassedPipelines({ ownershipStages });
  const hasBlocking = [...duplicateOwners, ...missingOwners, ...bypassedPipelines].some((entry) => entry.severity === "blocking" || entry.exemption === "none");

  return {
    reportKey: "pipeline-ownership-audit",
    generatedAtUtc: input?.generatedAtUtc ?? new Date().toISOString(),
    status: hasBlocking ? "fail" : duplicateOwners.length || missingOwners.length || bypassedPipelines.length ? "review" : "pass",
    ownershipStages,
    duplicateOwners,
    missingOwners,
    bypassedPipelines,
    productionReadsPerformed: false,
    providerCallsPerformed: false,
  };
}

export function findDuplicateOwners(input: Pick<PipelineOwnershipAuditReport, "ownershipStages">): PipelineOwnershipRecord[] {
  const byStage = new Map<string, PipelineOwnershipRecord[]>();
  for (const record of input.ownershipStages) {
    const key = `${record.subject}:${record.stage}`;
    byStage.set(key, [...(byStage.get(key) ?? []), record]);
  }
  return [...byStage.values()].flatMap((records) => records.length > 1 ? records : [])
    .filter((record) => record.status === "duplicate_owner");
}

export function findMissingOwners(input: Pick<PipelineOwnershipAuditReport, "ownershipStages">): PipelineOwnershipRecord[] {
  return input.ownershipStages.filter((record) => record.status === "missing_owner");
}

export function findBypassedPipelines(input: Pick<PipelineOwnershipAuditReport, "ownershipStages">): PipelineOwnershipRecord[] {
  return input.ownershipStages.filter((record) => record.status === "bypassed");
}

export function explainOwnershipDecision(record: PipelineOwnershipRecord) {
  return `${record.subject} is ${record.status} at ${record.stage}; owner=${record.canonicalOwner}; next=${record.exactNextAction}`;
}

export function expectedOwnershipStagesPresent(records: readonly PipelineOwnershipRecord[] = OWNERSHIP_RECORDS) {
  const present = new Set(records.map((record) => record.stage));
  return PIPELINE_OWNERSHIP_ORDER.every((stage) => present.has(stage));
}
