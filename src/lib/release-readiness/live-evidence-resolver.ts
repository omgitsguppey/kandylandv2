import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { ReleaseReadinessContext } from "./final-release-readiness";
import {
  BROAD_MANUAL_GATES_BEFORE,
  LIVE_EVIDENCE_PRIVACY_REDACTION_POLICY,
  type LiveEvidenceGateClass,
  type LiveEvidenceGateReplacementReport,
  type LiveEvidenceSource,
  type LiveEvidenceStatus,
  type LiveEvidenceSystemDecision,
  type LiveEvidenceSystemId,
  type ManualGateReduction,
} from "./live-evidence-gate-contract";

type ArtifactRecord = Record<string, unknown>;

type EvidenceSystemSeed = {
  systemId: LiveEvidenceSystemId;
  label: string;
  gateClass: LiveEvidenceGateClass;
  expectedLiveEvidenceSource: string;
  artifacts: Array<Pick<LiveEvidenceSource, "artifactPath" | "sourceKind">>;
  freshnessWindowHours: number;
  minimumAcceptableSignal: string;
  sourceOnlyFallback: string;
  scoreImpact: LiveEvidenceSystemDecision["scoreImpact"];
};

const SYSTEM_SEEDS: EvidenceSystemSeed[] = [
  {
    systemId: "auth_signup_login_session_restore",
    label: "Auth/signup/login/session restore",
    gateClass: "live_behavioral_evidence",
    expectedLiveEvidenceSource: "recent auth event facts or redacted session restore summary",
    artifacts: [
      { artifactPath: "agent/state/event-liveness-audit.generated.json", sourceKind: "event_fact" },
      { artifactPath: "agent/state/person-metrics-hydration.generated.json", sourceKind: "admin_debug_summary" },
    ],
    freshnessWindowHours: 24,
    minimumAcceptableSignal: "auth_session_established or auth_session_restored observed in bounded live window",
    sourceOnlyFallback: "source_missing auth liveness must replace manual screenshot proof",
    scoreImpact: { runtimeHealth: 1, evidenceCompleteness: 2, freshness: 1 },
  },
  {
    systemId: "wallet_payment_gumdrop_ledger",
    label: "Wallet/payment/GumDrop ledger",
    gateClass: "live_ledger_evidence",
    expectedLiveEvidenceSource: "redacted wallet ledger summary plus provider evidence for payment proof",
    artifacts: [
      { artifactPath: "agent/state/real-usage-confidence.generated.json", sourceKind: "ledger_summary" },
      { artifactPath: "agent/state/person-metrics-hydration.generated.json", sourceKind: "admin_debug_summary" },
    ],
    freshnessWindowHours: 24,
    minimumAcceptableSignal: "wallet/payment/ledger event facts with source buckets and no raw provider IDs",
    sourceOnlyFallback: "keep provider proof external and classify ledger live source as source_missing or source_only",
    scoreImpact: { runtimeHealth: 1, evidenceCompleteness: 2 },
  },
  {
    systemId: "drops_open_unlock_unwrap_watch",
    label: "Drops/open/unlock/unwrap/watch",
    gateClass: "live_behavioral_evidence",
    expectedLiveEvidenceSource: "drop event facts, watch summaries, and journey summaries",
    artifacts: [
      { artifactPath: "agent/state/person-metrics-hydration.generated.json", sourceKind: "event_fact" },
      { artifactPath: "agent/state/user-journey-behavioral-intelligence.generated.json", sourceKind: "journey_summary" },
      { artifactPath: "agent/state/event-liveness-audit.generated.json", sourceKind: "event_fact" },
    ],
    freshnessWindowHours: 24,
    minimumAcceptableSignal: "drop_opened/drop_unlocked/drop_unwrapped/watch_session event facts in bounded live window",
    sourceOnlyFallback: "classify live drop liveness as source_missing instead of asking screenshots to prove watch/unlock behavior",
    scoreImpact: { runtimeHealth: 1, evidenceCompleteness: 2, freshness: 1 },
  },
  {
    systemId: "creator_profile_discovery_follow",
    label: "Creator profile/discovery/follow",
    gateClass: "live_behavioral_evidence",
    expectedLiveEvidenceSource: "creator profile/follow/discovery event facts",
    artifacts: [
      { artifactPath: "agent/state/person-metrics-hydration.generated.json", sourceKind: "event_fact" },
      { artifactPath: "agent/state/event-liveness-audit.generated.json", sourceKind: "event_fact" },
    ],
    freshnessWindowHours: 24,
    minimumAcceptableSignal: "creator profile or follow event fact in bounded live window",
    sourceOnlyFallback: "source_missing creator liveness remains a live evidence blocker, not a visual QA item",
    scoreImpact: { evidenceCompleteness: 1, freshness: 1 },
  },
  {
    systemId: "creator_monetization_fan_pass_entitlements",
    label: "Creator monetization/Fan Pass/entitlements",
    gateClass: "live_ledger_evidence",
    expectedLiveEvidenceSource: "redacted entitlement/revenue ledger summary",
    artifacts: [
      { artifactPath: "agent/state/real-usage-confidence.generated.json", sourceKind: "ledger_summary" },
      { artifactPath: "agent/state/person-metrics-hydration.generated.json", sourceKind: "admin_debug_summary" },
    ],
    freshnessWindowHours: 24,
    minimumAcceptableSignal: "Fan Pass/entitlement access facts with confidence split and no provider IDs",
    sourceOnlyFallback: "do not let screenshots prove entitlement or revenue math",
    scoreImpact: { runtimeHealth: 1, evidenceCompleteness: 1 },
  },
  {
    systemId: "chat_open_thread_message_block_error",
    label: "Chat open/thread/message/block/error",
    gateClass: "live_behavioral_evidence",
    expectedLiveEvidenceSource: "chat event facts and redacted error summaries",
    artifacts: [
      { artifactPath: "agent/state/person-metrics-hydration.generated.json", sourceKind: "event_fact" },
      { artifactPath: "agent/state/debug-runtime-evidence.generated.json", sourceKind: "error_rate_summary" },
    ],
    freshnessWindowHours: 24,
    minimumAcceptableSignal: "chat open/message/block/error summary without raw chat content",
    sourceOnlyFallback: "redacted chat live evidence source is required; screenshots prove layout only",
    scoreImpact: { evidenceCompleteness: 1 },
  },
  {
    systemId: "daily_tasks_reward_reset",
    label: "Daily tasks/reward/reset",
    gateClass: "live_ledger_evidence",
    expectedLiveEvidenceSource: "daily task event facts and reward ledger summary",
    artifacts: [
      { artifactPath: "agent/state/person-metrics-hydration.generated.json", sourceKind: "event_fact" },
      { artifactPath: "agent/state/user-journey-behavioral-intelligence.generated.json", sourceKind: "journey_summary" },
    ],
    freshnessWindowHours: 24,
    minimumAcceptableSignal: "task start/complete/reward event facts with reset window",
    sourceOnlyFallback: "task reward proof stays in event/ledger summaries, not screenshots",
    scoreImpact: { evidenceCompleteness: 1 },
  },
  {
    systemId: "notifications_pwa_permission_token_intent",
    label: "Notifications/PWA permission/token/intent",
    gateClass: "live_behavioral_evidence",
    expectedLiveEvidenceSource: "notification prompt/token/intent summaries with raw tokens redacted",
    artifacts: [
      { artifactPath: "agent/state/event-liveness-audit.generated.json", sourceKind: "event_fact" },
      { artifactPath: "agent/state/person-metrics-hydration.generated.json", sourceKind: "admin_debug_summary" },
    ],
    freshnessWindowHours: 24,
    minimumAcceptableSignal: "permission/token/intent summary without raw FCM/push token",
    sourceOnlyFallback: "operator visual QA only checks prompt layout, not token registration truth",
    scoreImpact: { freshness: 1 },
  },
  {
    systemId: "account_settings_delete_export_support",
    label: "Account settings/delete/export/support",
    gateClass: "live_behavioral_evidence",
    expectedLiveEvidenceSource: "account/support action summaries with PII redacted",
    artifacts: [
      { artifactPath: "agent/state/person-metrics-hydration.generated.json", sourceKind: "event_fact" },
      { artifactPath: "agent/state/runtime-smoke-harness.generated.json", sourceKind: "source_contract" },
    ],
    freshnessWindowHours: 24,
    minimumAcceptableSignal: "settings/support/delete/export facts or route summaries with typed outcomes",
    sourceOnlyFallback: "screenshots do not prove support/account action backend behavior",
    scoreImpact: { evidenceCompleteness: 1 },
  },
  {
    systemId: "media_upload_access",
    label: "Media upload/access",
    gateClass: "live_runtime_evidence",
    expectedLiveEvidenceSource: "media upload/access block summaries without private URLs",
    artifacts: [
      { artifactPath: "agent/state/debug-runtime-evidence.generated.json", sourceKind: "error_rate_summary" },
      { artifactPath: "agent/state/runtime-smoke-harness.generated.json", sourceKind: "source_contract" },
    ],
    freshnessWindowHours: 24,
    minimumAcceptableSignal: "redacted upload/access summary with private media URL excluded",
    sourceOnlyFallback: "source contract can guide checks but cannot clear live media evidence",
    scoreImpact: { runtimeHealth: 1 },
  },
  {
    systemId: "search_discovery",
    label: "Search/discovery",
    gateClass: "live_behavioral_evidence",
    expectedLiveEvidenceSource: "search/discovery event facts",
    artifacts: [
      { artifactPath: "agent/state/person-metrics-hydration.generated.json", sourceKind: "event_fact" },
      { artifactPath: "agent/state/event-liveness-audit.generated.json", sourceKind: "event_fact" },
    ],
    freshnessWindowHours: 24,
    minimumAcceptableSignal: "search/discovery action event fact in bounded live window",
    sourceOnlyFallback: "source_missing search liveness remains a live evidence issue",
    scoreImpact: { freshness: 1 },
  },
  {
    systemId: "admin_debug_user_management",
    label: "Admin/debug/user management",
    gateClass: "live_admin_truth_evidence",
    expectedLiveEvidenceSource: "redacted admin truth summary or admin debug snapshot",
    artifacts: [
      { artifactPath: "agent/state/admin-truth-redaction-packet.generated.json", sourceKind: "admin_debug_summary" },
      { artifactPath: "agent/state/debug-runtime-evidence.generated.json", sourceKind: "admin_debug_summary" },
    ],
    freshnessWindowHours: 24,
    minimumAcceptableSignal: "redacted admin summary with environment/currentHead and no raw identifiers",
    sourceOnlyFallback: "admin truth remains source_missing/formal_missing unless a redacted summary is attached",
    scoreImpact: { evidenceCompleteness: 2 },
  },
  {
    systemId: "route_runtime_error_health",
    label: "Route runtime/error health",
    gateClass: "live_route_health_evidence",
    expectedLiveEvidenceSource: "deployed route health or runtime summary",
    artifacts: [
      { artifactPath: "agent/state/runtime-smoke-harness.generated.json", sourceKind: "route_health_summary" },
      { artifactPath: "agent/state/debug-runtime-evidence.generated.json", sourceKind: "error_rate_summary" },
    ],
    freshnessWindowHours: 1,
    minimumAcceptableSignal: "deployed route sample/error-rate summary; local harness is source-only",
    sourceOnlyFallback: "source-safe route harness cannot clear deployed route runtime gate",
    scoreImpact: { runtimeHealth: 2, evidenceCompleteness: 1 },
  },
  {
    systemId: "cost_runtime_4xx_summaries",
    label: "Cost/runtime/4xx summaries",
    gateClass: "live_error_rate_evidence",
    expectedLiveEvidenceSource: "cost and route 4xx rollup with external billing review separate",
    artifacts: [
      { artifactPath: "agent/state/cost-risk-exit-pass.generated.json", sourceKind: "error_rate_summary" },
      { artifactPath: "agent/state/global-cost-surfaces.generated.json", sourceKind: "error_rate_summary" },
    ],
    freshnessWindowHours: 24,
    minimumAcceptableSignal: "hourly route 4xx/cost summary and external billing status",
    sourceOnlyFallback: "cost source guards do not become billing proof",
    scoreImpact: { costRisk: 4 },
  },
];

function readJson(root: string, artifactPath: string): ArtifactRecord | null {
  const fullPath = join(root, artifactPath);
  if (!existsSync(fullPath)) return null;
  try {
    return JSON.parse(readFileSync(fullPath, "utf8")) as ArtifactRecord;
  } catch {
    return null;
  }
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function statusFromArtifact(root: string, artifactPath: string): LiveEvidenceSource["sourceStatus"] {
  const artifact = readJson(root, artifactPath);
  if (!artifact) return "missing";
  const reportKey = stringValue(artifact.reportKey);
  if (reportKey === "runtime-smoke-harness" || reportKey === "debug-runtime-evidence" || reportKey === "admin-truth-redaction-packet") return "source_only";
  if (reportKey === "real-usage-confidence") {
    const signals = artifact.signals as Record<string, { status?: string; operatorConfirmed?: boolean }> | undefined;
    if (signals && Object.values(signals).some((signal) => signal.operatorConfirmed || signal.status === "observed")) return "operator_confirmed";
    return "source_only";
  }
  if (reportKey === "event-liveness-audit") {
    return numberValue(artifact.observedRecentlyCount) > 0 ? "present" : "missing";
  }
  if (reportKey === "person-metrics-hydration") {
    const productionReadsRequired = artifact.productionReadsRequired === true;
    return productionReadsRequired ? "present" : "source_only";
  }
  if (reportKey === "user-journey-behavioral-intelligence") {
    const fakeJourneysUsed = artifact.fakeJourneysUsed === true;
    return fakeJourneysUsed ? "missing" : "source_only";
  }
  return "source_only";
}

function buildEvidenceSources(root: string, seed: EvidenceSystemSeed): LiveEvidenceSource[] {
  return seed.artifacts.map((artifact) => {
    const parsed = readJson(root, artifact.artifactPath);
    const sourceStatus = statusFromArtifact(root, artifact.artifactPath);
    return {
      ...artifact,
      clearsLiveGate: sourceStatus === "present",
      sourceStatus,
      currentHead: stringValue(parsed?.currentHead ?? parsed?.sourceCommit),
      generatedAtUtc: stringValue(parsed?.generatedAtUtc ?? parsed?.generatedAt),
    };
  });
}

function statusForSources(sources: LiveEvidenceSource[], gateClass: LiveEvidenceGateClass): LiveEvidenceStatus {
  if (gateClass === "external_provider_evidence") return "external_provider_required";
  if (gateClass === "external_billing_evidence") return "external_billing_required";
  if (gateClass === "visual_operator_evidence") return "visual_only_manual";
  if (sources.some((source) => source.clearsLiveGate)) return "live_evidence_replaced";
  if (sources.some((source) => source.sourceStatus === "operator_confirmed")) return "current_warning";
  if (sources.every((source) => source.sourceStatus === "source_only")) return "source_only_evidence";
  return "source_missing_live_evidence";
}

function confidenceForStatus(status: LiveEvidenceStatus): LiveEvidenceSystemDecision["confidence"] {
  switch (status) {
    case "live_evidence_replaced":
      return "exact";
    case "current_warning":
      return "linked";
    case "source_only_evidence":
      return "inferred";
    case "visual_only_manual":
    case "external_provider_required":
    case "external_billing_required":
      return "unknown";
    case "source_missing_live_evidence":
      return "unknown";
  }
}

function betaExitImpact(status: LiveEvidenceStatus, gateClass: LiveEvidenceGateClass): LiveEvidenceSystemDecision["betaExitImpact"] {
  if (status === "live_evidence_replaced") return "can_clear_live_gate";
  if (gateClass === "visual_operator_evidence") return "operator_visual_only";
  if (gateClass === "external_provider_evidence" || gateClass === "external_billing_evidence") return "external_required";
  if (status === "source_only_evidence" || status === "current_warning") return "source_confidence_only";
  return "blocks_until_live_source_connected";
}

export function findRecentActivityEvidence(input: { root: string; systemId?: LiveEvidenceSystemId }) {
  const eventLiveness = readJson(input.root, "agent/state/event-liveness-audit.generated.json");
  return {
    artifactPath: "agent/state/event-liveness-audit.generated.json",
    observedRecentlyCount: numberValue(eventLiveness?.observedRecentlyCount),
    sourceMissingCount: numberValue(eventLiveness?.sourceMissingCount),
    status: numberValue(eventLiveness?.observedRecentlyCount) > 0 ? "live_evidence_replaced" : "source_missing_live_evidence",
  };
}

export function findAdminDebugEvidence(input: { root: string }) {
  const admin = readJson(input.root, "agent/state/admin-truth-redaction-packet.generated.json");
  const debug = readJson(input.root, "agent/state/debug-runtime-evidence.generated.json");
  return {
    adminPacketPresent: Boolean(admin),
    debugPacketPresent: Boolean(debug),
    redactedProductionSampleAttached: admin?.sampleSource !== "none_attached",
    status: admin?.sampleSource !== "none_attached" ? "live_evidence_replaced" : "source_only_evidence",
  };
}

export function findEventFactEvidence(input: { root: string }) {
  return findRecentActivityEvidence(input);
}

export function findJourneyEvidence(input: { root: string }) {
  const journey = readJson(input.root, "agent/state/user-journey-behavioral-intelligence.generated.json");
  return {
    artifactPath: "agent/state/user-journey-behavioral-intelligence.generated.json",
    present: Boolean(journey),
    fakeJourneysUsed: journey?.fakeJourneysUsed === true,
    status: journey && journey.fakeJourneysUsed !== true ? "source_only_evidence" : "source_missing_live_evidence",
  };
}

export function findLedgerEvidence(input: { root: string }) {
  const usage = readJson(input.root, "agent/state/real-usage-confidence.generated.json");
  return {
    artifactPath: "agent/state/real-usage-confidence.generated.json",
    confidenceScore: numberValue(usage?.confidenceScore),
    status: statusFromArtifact(input.root, "agent/state/real-usage-confidence.generated.json"),
  };
}

export function classifyEvidenceFreshness(input: { generatedAtUtc?: string | null; nowUtc?: string; freshnessWindowHours: number }) {
  if (!input.generatedAtUtc) return "source_missing";
  const now = Date.parse(input.nowUtc ?? new Date().toISOString());
  const generatedAt = Date.parse(input.generatedAtUtc);
  if (!Number.isFinite(generatedAt) || !Number.isFinite(now)) return "source_missing";
  const ageHours = (now - generatedAt) / 36e5;
  return ageHours <= input.freshnessWindowHours ? "fresh" : "stale";
}

export function resolveLiveEvidenceForGate(input: { root: string; currentHead: string; generatedAtUtc: string; systemId: LiveEvidenceSystemId }): LiveEvidenceSystemDecision {
  const seed = SYSTEM_SEEDS.find((entry) => entry.systemId === input.systemId);
  if (!seed) throw new Error(`Unknown live evidence system: ${input.systemId}`);
  const evidenceSources = buildEvidenceSources(input.root, seed);
  const status = statusForSources(evidenceSources, seed.gateClass);
  return {
    systemId: seed.systemId,
    label: seed.label,
    gateClass: seed.gateClass,
    status,
    expectedLiveEvidenceSource: seed.expectedLiveEvidenceSource,
    evidenceSources,
    freshnessWindowHours: seed.freshnessWindowHours,
    minimumAcceptableSignal: seed.minimumAcceptableSignal,
    privacyRedactionPolicy: LIVE_EVIDENCE_PRIVACY_REDACTION_POLICY,
    confidence: confidenceForStatus(status),
    scoreImpact: seed.scoreImpact,
    betaExitImpact: betaExitImpact(status, seed.gateClass),
    fallbackIfMissing: seed.sourceOnlyFallback,
    reason: reasonForDecision(seed, status),
    nextExactAction: nextActionForDecision(seed, status),
  };
}

export function classifyManualGateReducibility(input: { gate: string; liveEvidenceBySystem: LiveEvidenceSystemDecision[] }): ManualGateReduction {
  const gate = input.gate;
  if (gate === "operator-final visual QA") {
    return {
      gate,
      beforeClass: "broad_manual",
      afterClass: "visual_operator_evidence",
      status: "visual_only_manual",
      replacement: "visual layout QA only: nav overlap, clipping, readable text, responsive layout, and visual loading/empty/error states",
      reason: "Screenshots cannot prove backend, runtime, payment, telemetry, or journey behavior.",
      blocksBetaExit: true,
    };
  }
  if (gate === "external billing review") {
    return {
      gate,
      beforeClass: "mixed_manual_formal",
      afterClass: "external_billing_evidence",
      status: "external_billing_required",
      replacement: "external billing review note separated from source cost guards",
      reason: "Source cost guards do not prove Cloud/Firebase/AI provider spend.",
      blocksBetaExit: true,
    };
  }
  if (gate === "runtime/provider smoke") {
    return {
      gate,
      beforeClass: "mixed_manual_formal",
      afterClass: "external_provider_evidence",
      status: "external_provider_required",
      replacement: "deployed route health/live runtime evidence plus external provider proof for PayPal/provider flows",
      reason: "Route/product behavior can use live summaries when available; PayPal/provider proof remains external.",
      blocksBetaExit: true,
    };
  }
  if (gate === "manual production smoke") {
    const missing = input.liveEvidenceBySystem.filter((system) => system.status === "source_missing_live_evidence").length;
    return {
      gate,
      beforeClass: "broad_manual",
      afterClass: "live_route_health_evidence",
      status: missing > 0 ? "source_missing_live_evidence" : "source_only_evidence",
      replacement: "split into live route/runtime evidence, live product journey evidence, external provider evidence, and visual-only QA",
      reason: "A single manual smoke gate is too broad; each product system must use its live evidence source or be marked source_missing.",
      blocksBetaExit: true,
    };
  }
  return {
    gate,
    beforeClass: "mixed_manual_formal",
    afterClass: "live_admin_truth_evidence",
    status: "source_missing_live_evidence",
    replacement: "redacted live admin truth summary or redaction packet; screenshots are not evidence for admin truth",
    reason: "Admin truth must come from redacted summaries or source_missing classification.",
    blocksBetaExit: true,
  };
}

export function explainEvidenceDecision(input: LiveEvidenceSystemDecision) {
  return `${input.label}: ${input.status}; ${input.reason} Next: ${input.nextExactAction}`;
}

function reasonForDecision(seed: EvidenceSystemSeed, status: LiveEvidenceStatus) {
  if (status === "live_evidence_replaced") return `${seed.minimumAcceptableSignal} is represented by a clearing live evidence source.`;
  if (status === "source_only_evidence") return "Only source-safe or validator-backed evidence is present; it raises confidence but cannot clear live/formal gates.";
  if (status === "current_warning") return "An operator-confirmed or bounded signal exists, but it is not formal provider/deployed-runtime proof.";
  if (status === "source_missing_live_evidence") return `No clearing live evidence source was found. ${seed.sourceOnlyFallback}.`;
  if (status === "external_provider_required") return "Provider/payment UI or webhook proof must come from external provider evidence.";
  if (status === "external_billing_required") return "Actual spend proof must come from external billing review.";
  return "Manual evidence is visual-only and cannot prove backend behavior.";
}

function nextActionForDecision(seed: EvidenceSystemSeed, status: LiveEvidenceStatus) {
  if (status === "live_evidence_replaced") return "Keep the live evidence source fresh and redacted.";
  if (status === "source_only_evidence" || status === "current_warning") return `Connect or attach ${seed.expectedLiveEvidenceSource}; keep source-only evidence labeled as source-only.`;
  if (status === "source_missing_live_evidence") return `Add or attach ${seed.expectedLiveEvidenceSource}; classify missing lanes as source_missing, not manual screenshot blockers.`;
  if (status === "external_provider_required") return "Attach redacted provider/payment proof without exposing raw provider IDs.";
  if (status === "external_billing_required") return "Attach external billing review for cost lanes.";
  return "Capture visual QA screenshots only for layout and responsive checks.";
}

export function buildLiveEvidenceGateReplacementReport(context: ReleaseReadinessContext, root = process.cwd()): LiveEvidenceGateReplacementReport {
  const liveEvidenceBySystem = SYSTEM_SEEDS.map((seed) =>
    resolveLiveEvidenceForGate({
      root,
      currentHead: context.currentHead,
      generatedAtUtc: context.generatedAtUtc,
      systemId: seed.systemId,
    }),
  );
  const reductions = BROAD_MANUAL_GATES_BEFORE.map((gate) => classifyManualGateReducibility({ gate, liveEvidenceBySystem }));
  const sourceMissingLiveEvidence = liveEvidenceBySystem.filter((system) => system.status === "source_missing_live_evidence");
  const remainingBlockers = [
    ...sourceMissingLiveEvidence.map((system) => `${system.label}: source_missing_live_evidence`),
    "external provider proof",
    "external billing review",
    "visual-only operator QA",
  ];
  const report: LiveEvidenceGateReplacementReport = {
    reportKey: "live-evidence-gate-replacement",
    generatedAtUtc: context.generatedAtUtc,
    currentHead: context.currentHead,
    broadManualGatesBefore: BROAD_MANUAL_GATES_BEFORE,
    broadManualGatesAfter: ["visual-only operator QA", "external provider proof", "external billing review", "source_missing live evidence lanes"],
    gatesReplacedByLiveEvidence: reductions.filter((reduction) => reduction.gate === "manual production smoke" || reduction.gate === "admin truth/sample evidence" || reduction.gate === "runtime/provider smoke"),
    visualOnlyManualGatesRemaining: reductions.filter((reduction) => reduction.afterClass === "visual_operator_evidence"),
    externalProviderGatesRemaining: reductions.filter((reduction) => reduction.afterClass === "external_provider_evidence"),
    externalBillingGatesRemaining: reductions.filter((reduction) => reduction.afterClass === "external_billing_evidence"),
    liveEvidenceBySystem,
    sourceMissingLiveEvidence,
    betaExitReadyBefore: context.betaExitReadyFromSource,
    betaExitReadyAfter: false,
    remainingBlockers,
    nextExactSteps: [
      "Connect safe lastSeen/live event summaries for source_missing product systems.",
      "Attach redacted deployed route/runtime evidence for route health.",
      "Attach redacted provider/payment proof for PayPal/provider flows.",
      "Attach external billing review for cost lanes.",
      "Limit operator screenshots to layout, clipping, readability, responsive, and visual state checks.",
    ],
    validationFailures: [],
  };
  report.validationFailures = validateLiveEvidenceGateReplacementReport(report);
  return report;
}

export function validateLiveEvidenceGateReplacementReport(report: LiveEvidenceGateReplacementReport) {
  const failures: string[] = [];
  if (!report.currentHead) failures.push("packet missing currentHead.");
  if (report.broadManualGatesAfter.some((gate) => /manual production smoke/iu.test(gate))) {
    failures.push("manual production smoke remains broad instead of split by evidence class.");
  }
  if (report.visualOnlyManualGatesRemaining.some((gate) => /backend|runtime|payment|telemetry|journey/iu.test(gate.replacement))) {
    failures.push("visual QA claims to prove backend/runtime/payment behavior.");
  }
  if (report.liveEvidenceBySystem.some((system) => system.status === "source_only_evidence" && system.betaExitImpact === "can_clear_live_gate")) {
    failures.push("source-only evidence clears live/formal gate.");
  }
  if (report.liveEvidenceBySystem.some((system) => !system.freshnessWindowHours)) failures.push("live evidence source lacks freshness window.");
  if (report.liveEvidenceBySystem.some((system) => system.privacyRedactionPolicy.length === 0)) failures.push("live evidence source lacks privacy redaction.");
  if (report.liveEvidenceBySystem.some((system) => system.status === "source_missing_live_evidence" && !system.reason)) {
    failures.push("real user activity lane is quiet but no liveness/source_missing classification exists.");
  }
  if (report.betaExitReadyAfter && (report.externalProviderGatesRemaining.length > 0 || report.externalBillingGatesRemaining.length > 0 || report.remainingBlockers.length > 0)) {
    failures.push("betaExitReady true while external provider/billing/formal blockers remain.");
  }
  if (report.gatesReplacedByLiveEvidence.some((gate) => gate.gate === "operator-final visual QA")) {
    failures.push("backend/product functionality still requires screenshots when live evidence exists.");
  }
  return Array.from(new Set(failures));
}
