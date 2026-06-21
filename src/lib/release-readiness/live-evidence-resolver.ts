import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import type { ReleaseReadinessContext } from "./final-release-readiness";
import {
  BROAD_MANUAL_GATES_BEFORE,
  LIVE_EVIDENCE_PRIVACY_REDACTION_POLICY,
  type LiveEvidenceGateClass,
  type LiveEvidenceGateReplacementReport,
  type LiveEvidenceSource,
  type LiveEvidenceStatus,
  type LiveRuntimeEvidenceStatus,
  type LiveEvidenceSystemDecision,
  type LiveEvidenceSystemId,
  type ManualGateReduction,
} from "./live-evidence-gate-contract";

type ArtifactRecord = Record<string, unknown>;

type EvidenceSystemSeed = {
  systemId: LiveEvidenceSystemId;
  label: string;
  gateClass: LiveEvidenceGateClass;
  liveActivityEvents: string[];
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
    liveActivityEvents: ["auth_session_established", "auth_session_restored", "auth_sign_in_success", "auth_sign_up_success"],
    expectedLiveEvidenceSource: "recent auth event facts or redacted session restore summary",
    artifacts: [
      { artifactPath: "agent/state/event-liveness-audit.generated.json", sourceKind: "event_fact" },
      { artifactPath: "agent/state/person-metrics-hydration.generated.json", sourceKind: "admin_debug_summary" },
    ],
    freshnessWindowHours: 24,
    minimumAcceptableSignal: "auth_session_established or auth_session_restored observed in bounded live window",
    sourceOnlyFallback: "source_missing auth liveness must replace browser-diagnostic shortcuts",
    scoreImpact: { runtimeHealth: 1, evidenceCompleteness: 2, freshness: 1 },
  },
  {
    systemId: "wallet_payment_gumdrop_ledger",
    label: "Wallet/payment/GumDrop ledger",
    gateClass: "live_ledger_evidence",
    liveActivityEvents: ["wallet_opened", "purchase_package_selected", "begin_checkout", "server_purchase_verified", "gumdrops_purchase_completed"],
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
    liveActivityEvents: ["drop_preview_opened", "drop_clicked", "drop_unwrapped", "watch_session_started", "watch_session_completed"],
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
    liveActivityEvents: ["creator_profile_viewed", "creator_followed", "creator_card_clicked"],
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
    liveActivityEvents: ["creator_fan_pass_viewed", "creator_fan_pass_started", "creator_entitlement_checked"],
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
    liveActivityEvents: ["chat_surface_viewed", "chat_thread_opened", "chat_message_send_attempted", "chat_message_sent", "chat_message_blocked"],
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
    liveActivityEvents: ["daily_task_surface_viewed", "daily_task_started", "daily_task_completed", "daily_task_reward_granted"],
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
    liveActivityEvents: ["notification_prompt_viewed", "notification_permission_prompted", "notification_opened"],
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
    liveActivityEvents: ["user_settings_viewed", "setting_toggle_changed", "support_ticket_created", "data_export_requested", "account_delete_clicked"],
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
    liveActivityEvents: ["media_upload_started", "media_upload_completed", "media_access_blocked"],
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
    liveActivityEvents: ["search_performed", "search_result_clicked", "discovery_surface_viewed"],
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
    liveActivityEvents: ["admin_debug_viewed", "admin_user_summary_viewed"],
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
    liveActivityEvents: ["route_runtime_sampled", "route_runtime_error_rate_sampled"],
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
    liveActivityEvents: ["route_4xx_rollup_sampled", "cost_runtime_rollup_sampled"],
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

const DAILY_ACTIVITY_EXPECTED_PATH = "agent/evidence/live-runtime-activity/recent-activity.export.json";
const DAILY_ACTIVITY_SCHEMA = [
  "reportKey=live-runtime-activity-export",
  "generatedAtUtc=<ISO timestamp>",
  "sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>",
  "privacy.piiRedacted=true",
  "privacy.aggregateOnly=true",
  "privacy.rawProviderIdsExcluded=true",
  "privacy.rawPaymentDataExcluded=true",
  "activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
].join("; ");

type LiveRuntimeActivityRecord = {
  eventName: string;
  count: number;
  lastSeenAtUtc?: string | null;
  source: string;
  identityScope: string;
  identityConfidence: LiveEvidenceSystemDecision["confidence"] | "anonymous_aggregate";
  countsGlobal: boolean;
  countsForExactUser: boolean;
};

type LiveRuntimeActivityExport = {
  artifactPath: string;
  generatedAtUtc: string | null;
  activity: LiveRuntimeActivityRecord[];
};

function readJson(root: string, artifactPath: string): ArtifactRecord | null {
  const fullPath = join(root, artifactPath);
  if (!existsSync(fullPath)) return null;
  try {
    return JSON.parse(readFileSync(fullPath, "utf8")) as ArtifactRecord;
  } catch {
    return null;
  }
}

function stringValue(value: unknown, fallback: string | null = null): string | null {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function parseUtc(value: unknown) {
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function withinHours(value: unknown, nowUtc: string, hours: number) {
  const timestamp = parseUtc(value);
  const now = parseUtc(nowUtc);
  if (timestamp === null || now === null) return false;
  return now - timestamp >= 0 && now - timestamp <= hours * 36e5;
}

function listDailyActivityArtifactPaths(root: string) {
  const folder = join(root, "agent/evidence/live-runtime-activity");
  const paths = new Set<string>();
  if (existsSync(join(root, DAILY_ACTIVITY_EXPECTED_PATH))) paths.add(DAILY_ACTIVITY_EXPECTED_PATH);
  if (!existsSync(folder)) return [...paths];
  for (const entry of readdirSync(folder)) {
    if (entry.endsWith(".json")) paths.add(`agent/evidence/live-runtime-activity/${entry}`);
  }
  return [...paths].sort();
}

function hasSafePrivacyEnvelope(artifact: ArtifactRecord) {
  const privacy = recordValue(artifact.privacy);
  return booleanValue(privacy.piiRedacted)
    && booleanValue(privacy.aggregateOnly)
    && booleanValue(privacy.rawProviderIdsExcluded)
    && booleanValue(privacy.rawPaymentDataExcluded);
}

function normalizeActivityRecord(value: unknown): LiveRuntimeActivityRecord | null {
  const record = recordValue(value);
  const eventName = stringValue(record.eventName);
  const count = numberValue(record.count);
  const source = stringValue(record.source);
  const identityScope = stringValue(record.identityScope, "unknown") ?? "unknown";
  const identityConfidence = stringValue(record.identityConfidence, "unknown") as LiveRuntimeActivityRecord["identityConfidence"];
  if (!eventName || count <= 0 || !source) return null;
  return {
    eventName,
    count,
    lastSeenAtUtc: stringValue(record.lastSeenAtUtc),
    source,
    identityScope,
    identityConfidence,
    countsGlobal: booleanValue(record.countsGlobal),
    countsForExactUser: booleanValue(record.countsForExactUser),
  };
}

function readDailyActivityExports(root: string): LiveRuntimeActivityExport[] {
  return listDailyActivityArtifactPaths(root)
    .map((artifactPath) => {
      const artifact = readJson(root, artifactPath);
      if (!artifact || artifact.reportKey !== "live-runtime-activity-export" || !hasSafePrivacyEnvelope(artifact)) return null;
      const activity = arrayValue(artifact.activity)
        .map(normalizeActivityRecord)
        .filter((record): record is LiveRuntimeActivityRecord => Boolean(record));
      return {
        artifactPath,
        generatedAtUtc: stringValue(artifact.generatedAtUtc),
        activity,
      };
    })
    .filter((artifact): artifact is LiveRuntimeActivityExport => Boolean(artifact));
}

function eventLivenessClassifications(root: string) {
  const artifact = readJson(root, "agent/state/event-liveness-audit.generated.json");
  return arrayValue(artifact?.classifications).map(recordValue);
}

function matchingActivity(input: {
  root: string;
  seed: EvidenceSystemSeed;
  generatedAtUtc: string;
}) {
  const events = new Set(input.seed.liveActivityEvents);
  const exports = readDailyActivityExports(input.root);
  const matches = exports.flatMap((artifact) =>
    artifact.activity
      .filter((activity) =>
        events.has(activity.eventName)
        && withinHours(activity.lastSeenAtUtc ?? artifact.generatedAtUtc, input.generatedAtUtc, input.seed.freshnessWindowHours)
        && activity.countsGlobal,
      )
      .map((activity) => ({ artifact, activity })),
  );
  return { exports, matches };
}

function isAggregateActivity(match: ReturnType<typeof matchingActivity>["matches"][number]) {
  return match.activity.identityScope === "anonymous_aggregate"
    || match.activity.identityConfidence === "anonymous_aggregate"
    || match.activity.identityConfidence === "weak";
}

function confirmedActivityStatus(matches: ReturnType<typeof matchingActivity>["matches"]): LiveRuntimeEvidenceStatus {
  if (matches.length === 0) return "runtime_export_required";
  return matches.every(isAggregateActivity) ? "aggregate_activity_confirmed" : "live_activity_confirmed";
}

function livenessStatusesForSeed(root: string, seed: EvidenceSystemSeed) {
  const events = new Set(seed.liveActivityEvents);
  return eventLivenessClassifications(root)
    .filter((classification) => events.has(stringValue(classification.eventName, "") ?? ""))
    .map((classification) => stringValue(classification.livenessStatus, "") ?? "");
}

function statusFromLiveRuntimeEvidence(input: {
  root: string;
  seed: EvidenceSystemSeed;
  generatedAtUtc: string;
}): LiveRuntimeEvidenceStatus {
  if (input.seed.gateClass === "external_provider_evidence") return "provider_required";
  if (input.seed.gateClass === "external_billing_evidence") return "billing_required";
  if (input.seed.gateClass === "live_admin_truth_evidence") return "admin_truth_source_required";
  if (input.seed.systemId === "wallet_payment_gumdrop_ledger" || input.seed.systemId === "creator_monetization_fan_pass_entitlements") {
    return "provider_required";
  }
  if (input.seed.systemId === "cost_runtime_4xx_summaries") return "billing_required";
  if (input.seed.gateClass === "live_route_health_evidence" || input.seed.gateClass === "live_runtime_evidence") {
    const { matches } = matchingActivity(input);
    return matches.length > 0 ? confirmedActivityStatus(matches) : "runtime_export_required";
  }

  const { matches } = matchingActivity(input);
  if (matches.length > 0) return confirmedActivityStatus(matches);

  const statuses = livenessStatusesForSeed(input.root, input.seed);
  if (statuses.includes("observed_recently")) return "live_activity_confirmed";
  if (statuses.includes("not_observed_but_expected") || statuses.includes("observed_stale")) return "not_observed_but_expected";
  if (statuses.includes("source_ready_waiting_for_activity")) return "source_ready_waiting_for_activity";
  if (statuses.length > 0 && statuses.every((status) => status === "future_only_quiet" || status === "not_observed_and_not_expected")) {
    return "future_only_quiet";
  }
  if (statuses.includes("source_missing")) return "source_missing";
  return "runtime_export_required";
}

function liveStatusFromRuntimeStatus(status: LiveRuntimeEvidenceStatus, sources: LiveEvidenceSource[], gateClass: LiveEvidenceGateClass): LiveEvidenceStatus {
  if (status === "live_activity_confirmed" || status === "aggregate_activity_confirmed") return "live_evidence_replaced";
  if (status === "source_ready_waiting_for_activity" || status === "future_only_quiet") return "source_only_evidence";
  if (status === "provider_required") return "external_provider_required";
  if (status === "billing_required") return "external_billing_required";
  if (status === "admin_truth_source_required") return "source_missing_live_evidence";
  if (sources.some((source) => source.sourceStatus === "operator_confirmed")) return "current_warning";
  if (gateClass === "live_route_health_evidence" && sources.some((source) => source.sourceStatus === "source_only")) return "source_only_evidence";
  return "source_missing_live_evidence";
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

function buildDailyActivityEvidenceSources(input: {
  root: string;
  seed: EvidenceSystemSeed;
  generatedAtUtc: string;
  status: LiveRuntimeEvidenceStatus;
}): LiveEvidenceSource[] {
  const { exports, matches } = matchingActivity(input);
  return exports.map((artifact) => ({
    artifactPath: artifact.artifactPath,
    sourceKind: "event_fact" as const,
    clearsLiveGate: (input.status === "live_activity_confirmed" || input.status === "aggregate_activity_confirmed") && matches.some((match) => match.artifact.artifactPath === artifact.artifactPath),
    sourceStatus: (input.status === "live_activity_confirmed" || input.status === "aggregate_activity_confirmed") && matches.some((match) => match.artifact.artifactPath === artifact.artifactPath)
      ? "present"
      : "source_only",
    currentHead: null,
    generatedAtUtc: artifact.generatedAtUtc,
  }));
}

function statusForSources(sources: LiveEvidenceSource[], gateClass: LiveEvidenceGateClass): LiveEvidenceStatus {
  if (gateClass === "external_provider_evidence") return "external_provider_required";
  if (gateClass === "external_billing_evidence") return "external_billing_required";
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
    case "external_provider_required":
    case "external_billing_required":
      return "unknown";
    case "source_missing_live_evidence":
      return "unknown";
  }
}

function confidenceForRuntimeStatus(input: {
  status: LiveRuntimeEvidenceStatus;
  root: string;
  seed: EvidenceSystemSeed;
  generatedAtUtc: string;
}): LiveEvidenceSystemDecision["confidence"] {
  if (input.status !== "live_activity_confirmed" && input.status !== "aggregate_activity_confirmed") return confidenceForStatus(liveStatusFromRuntimeStatus(input.status, [], input.seed.gateClass));
  if (input.status === "aggregate_activity_confirmed") return "weak";
  const { matches } = matchingActivity(input);
  if (matches.some((match) => match.activity.identityConfidence === "linked")) return "linked";
  if (matches.some((match) => match.activity.identityConfidence === "inferred" || match.activity.identityConfidence === "exact")) return "inferred";
  return "weak";
}

function betaExitImpact(status: LiveEvidenceStatus, gateClass: LiveEvidenceGateClass): LiveEvidenceSystemDecision["betaExitImpact"] {
  if (status === "live_evidence_replaced") return "can_clear_live_gate";
  if (gateClass === "external_provider_evidence" || gateClass === "external_billing_evidence") return "external_required";
  if (status === "source_only_evidence" || status === "current_warning") return "source_confidence_only";
  return "blocks_until_live_source_connected";
}

function betaExitImpactForRuntimeStatus(status: LiveRuntimeEvidenceStatus, liveStatus: LiveEvidenceStatus, gateClass: LiveEvidenceGateClass): LiveEvidenceSystemDecision["betaExitImpact"] {
  if (status === "live_activity_confirmed" || status === "aggregate_activity_confirmed") return "can_clear_live_gate";
  if (status === "provider_required" || status === "billing_required") return "external_required";
  if (status === "source_ready_waiting_for_activity" || status === "future_only_quiet") return "source_confidence_only";
  if (status === "admin_truth_source_required" || status === "runtime_export_required" || status === "not_observed_but_expected" || status === "source_missing") {
    return "blocks_until_live_source_connected";
  }
  return betaExitImpact(liveStatus, gateClass);
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
  const liveRuntimeEvidenceStatus = statusFromLiveRuntimeEvidence({ root: input.root, seed, generatedAtUtc: input.generatedAtUtc });
  const evidenceSources = [
    ...buildEvidenceSources(input.root, seed),
    ...buildDailyActivityEvidenceSources({ root: input.root, seed, generatedAtUtc: input.generatedAtUtc, status: liveRuntimeEvidenceStatus }),
  ];
  const status = liveStatusFromRuntimeStatus(liveRuntimeEvidenceStatus, evidenceSources, seed.gateClass) ?? statusForSources(evidenceSources, seed.gateClass);
  const dailyActivityPaths = listDailyActivityArtifactPaths(input.root);
  const hasRecentActivity = liveRuntimeEvidenceStatus === "live_activity_confirmed" || liveRuntimeEvidenceStatus === "aggregate_activity_confirmed";
  return {
    systemId: seed.systemId,
    label: seed.label,
    gateClass: seed.gateClass,
    status,
    expectedLiveEvidenceSource: seed.expectedLiveEvidenceSource,
    evidenceSources,
    liveRuntimeEvidenceStatus,
    dailyActivityImport: {
      expectedPath: DAILY_ACTIVITY_EXPECTED_PATH,
      foundPaths: dailyActivityPaths,
      schema: DAILY_ACTIVITY_SCHEMA,
      hasRecentActivity,
    },
    freshnessWindowHours: seed.freshnessWindowHours,
    minimumAcceptableSignal: seed.minimumAcceptableSignal,
    privacyRedactionPolicy: LIVE_EVIDENCE_PRIVACY_REDACTION_POLICY,
    confidence: confidenceForRuntimeStatus({ status: liveRuntimeEvidenceStatus, root: input.root, seed, generatedAtUtc: input.generatedAtUtc }),
    scoreImpact: seed.scoreImpact,
    betaExitImpact: betaExitImpactForRuntimeStatus(liveRuntimeEvidenceStatus, status, seed.gateClass),
    fallbackIfMissing: seed.sourceOnlyFallback,
    reason: reasonForDecision(seed, status),
    nextExactAction: nextActionForDecision(seed, status),
  };
}

export function classifyManualGateReducibility(input: { gate: string; liveEvidenceBySystem: LiveEvidenceSystemDecision[] }): ManualGateReduction {
  const gate = input.gate;
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
      replacement: "split into live route/runtime evidence, live product journey evidence, external provider evidence, and source UI coverage",
      reason: "A single manual smoke gate is too broad; each product system must use its live evidence source or be marked source_missing.",
      blocksBetaExit: true,
    };
  }
  return {
    gate,
    beforeClass: "mixed_manual_formal",
    afterClass: "live_admin_truth_evidence",
    status: "source_missing_live_evidence",
    replacement: "redacted live admin truth summary or redaction packet; browser reproduction is not evidence for admin truth",
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
  return "Optional browser reproduction cannot prove backend behavior.";
}

function nextActionForDecision(seed: EvidenceSystemSeed, status: LiveEvidenceStatus) {
  if (status === "live_evidence_replaced") return "Keep the live evidence source fresh and redacted.";
  if (status === "source_only_evidence" || status === "current_warning") return `Connect or attach ${seed.expectedLiveEvidenceSource}; keep source-only evidence labeled as source-only.`;
  if (status === "source_missing_live_evidence") return `Add or attach ${seed.expectedLiveEvidenceSource}; classify missing lanes as source_missing, not browser-diagnostic blockers.`;
  if (status === "external_provider_required") return "Attach redacted provider/payment proof without exposing raw provider IDs.";
  if (status === "external_billing_required") return "Attach external billing review for cost lanes.";
  return "Use browser reproduction only after source coverage reports a concrete UI issue.";
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
  const sourceMissingLiveEvidence = liveEvidenceBySystem.filter((system) =>
    system.status === "source_missing_live_evidence"
    || system.liveRuntimeEvidenceStatus === "not_observed_but_expected"
    || system.liveRuntimeEvidenceStatus === "runtime_export_required"
    || system.liveRuntimeEvidenceStatus === "admin_truth_source_required"
    || system.liveRuntimeEvidenceStatus === "source_missing");
  const remainingBlockers = [
    ...liveEvidenceBySystem
      .filter((system) =>
        system.betaExitImpact === "blocks_until_live_source_connected"
        || system.betaExitImpact === "external_required")
      .map((system) => `${system.label}: ${system.liveRuntimeEvidenceStatus}`),
    "external provider proof",
    "external billing review",
  ];
  const report: LiveEvidenceGateReplacementReport = {
    reportKey: "live-evidence-gate-replacement",
    generatedAtUtc: context.generatedAtUtc,
    currentHead: context.currentHead,
    broadManualGatesBefore: BROAD_MANUAL_GATES_BEFORE,
    broadManualGatesAfter: ["external provider proof", "external billing review", "source_missing live evidence lanes"],
    gatesReplacedByLiveEvidence: reductions.filter((reduction) => reduction.gate === "manual production smoke" || reduction.gate === "admin truth/sample evidence" || reduction.gate === "runtime/provider smoke"),
    visualOnlyManualGatesRemaining: [],
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
      "Keep deterministic UI source coverage current; use browser reproduction only for source-reported issues.",
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
  if (report.liveEvidenceBySystem.some((system) => !system.liveRuntimeEvidenceStatus)) failures.push("live runtime evidence status missing.");
  if (report.liveEvidenceBySystem.some((system) => !system.dailyActivityImport?.expectedPath || !system.dailyActivityImport?.schema)) {
    failures.push("daily activity import path/schema missing.");
  }
  if (report.liveEvidenceBySystem.some((system) =>
    (system.liveRuntimeEvidenceStatus === "live_activity_confirmed" || system.liveRuntimeEvidenceStatus === "aggregate_activity_confirmed")
    && system.confidence === "exact")) {
    failures.push("anonymous or aggregate live activity must not become exact user proof.");
  }
  if (report.liveEvidenceBySystem.some((system) =>
    ["provider_required", "admin_truth_source_required", "billing_required"].includes(system.liveRuntimeEvidenceStatus)
    && system.betaExitImpact === "can_clear_live_gate")) {
    failures.push("provider/admin/billing lanes cannot be cleared by generic live activity.");
  }
  if (report.liveEvidenceBySystem.some((system) => system.privacyRedactionPolicy.length === 0)) failures.push("live evidence source lacks privacy redaction.");
  if (report.liveEvidenceBySystem.some((system) => system.status === "source_missing_live_evidence" && !system.reason)) {
    failures.push("real user activity lane is quiet but no liveness/source_missing classification exists.");
  }
  if (report.betaExitReadyAfter && (report.externalProviderGatesRemaining.length > 0 || report.externalBillingGatesRemaining.length > 0 || report.remainingBlockers.length > 0)) {
    failures.push("betaExitReady true while external provider/billing/formal blockers remain.");
  }
  return Array.from(new Set(failures));
}
