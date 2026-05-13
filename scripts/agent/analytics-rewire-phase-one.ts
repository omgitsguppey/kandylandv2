import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

export const ANALYTICS_REWIRE_REPORT_KEY = "analytics-rewire-phase-one" as const;
export const ANALYTICS_REWIRE_REPORT_PATH = "agent/state/analytics-rewire-phase-one.generated.json";
export const STALE_GENERATED_REPORT_WINDOW_MS = 24 * 60 * 60 * 1000;

export const RAW_DISPLAY_RISK_COLLECTIONS = [
  "analytics_event_facts",
  "analytics_guest_batches",
  "analytics_sessions",
  "analytics_watch_sessions",
  "behavioral_timeline_facts",
] as const;

export const DUPLICATE_SNAPSHOT_AUTHORITY_RULE = {
  metricOrLane: "admin_analytics_snapshot_authority",
  competingAuthorities: [
    "analytics_aggregate_stats/realtime_summary",
    "analytics_admin_metric_snapshots",
  ],
  recommendedAuthority: "analytics_admin_metric_snapshots",
  demoteToEvidenceOrFallback: ["analytics_aggregate_stats/realtime_summary"],
} as const;

export const VENDOR_EVIDENCE_ONLY_RULE = {
  vendors: ["GA4", "PostHog", "BigQuery"],
  allowedRoles: ["evidence", "export", "estimate", "validation", "debug parity"],
  forbiddenRole: "product/admin display truth without a source label",
} as const;

export type RewireLaneCategory =
  | "raw_ledger"
  | "identity_graph"
  | "snapshot_authority"
  | "admin_display"
  | "admin_debug"
  | "vendor_evidence"
  | "score_report"
  | "release_version"
  | "cloud_cost"
  | "unknown";

export type SourceOfTruthStatus =
  | "canonical"
  | "evidence_only"
  | "fallback"
  | "debug_only"
  | "deprecated_candidate"
  | "needs_review"
  | "unknown";

export type RewireIssueSeverity = "P0" | "P1" | "P2" | "P3";

export type RewireLane = {
  laneKey: string;
  title: string;
  category: RewireLaneCategory;
  currentOwner: string;
  recommendedOwner: string;
  sourceOfTruthStatus: SourceOfTruthStatus;
  writers: string[];
  readers: string[];
  collectionsOrPaths: string[];
  validators: string[];
  costRisks: string[];
  freshnessRule?: string;
  recommendedAction: string;
};

export type RewireIssue = {
  issueKey: string;
  severity: RewireIssueSeverity;
  title: string;
  description: string;
  files: string[];
  recommendedOwner?: string;
  recommendedAction: string;
  blocksScreenshotQA: boolean;
  blocksPhaseOneFreeze: boolean;
};

export type OrphanCandidate = {
  key: string;
  writtenPath: string;
  writerFiles: string[];
  consumerFiles: string[];
  validatorFiles: string[];
  recoveryValue: "high" | "medium" | "low" | "unknown";
  recommendedAction: "surface" | "debug_only" | "archive" | "deprecate" | "needs_review";
};

export type DuplicateAuthority = {
  metricOrLane: string;
  competingAuthorities: string[];
  recommendedAuthority: string;
  demoteToEvidenceOrFallback: string[];
  files: string[];
};

export type AnalyticsRewirePhaseOneReport = {
  generatedAtUtc: string;
  reportKey: typeof ANALYTICS_REWIRE_REPORT_KEY;
  currentHead?: string;
  phasesCovered: string[];
  summary: {
    laneCount: number;
    issueCount: number;
    duplicateAuthorityCount: number;
    rawDisplayFallbackCount: number;
    staleAuthorityReportCount: number;
    orphanCandidateCount: number;
    vendorTruthBoundaryIssueCount: number;
    recommendedBlockers: number;
  };
  lanes: RewireLane[];
  issues: RewireIssue[];
  orphanCandidates: OrphanCandidate[];
  duplicateAuthorities: DuplicateAuthority[];
};

type LaneDefinition = Omit<RewireLane, "writers" | "readers" | "validators"> & {
  tokens: string[];
  writerHints: string[];
  readerHints: string[];
  validatorHints: string[];
};

type OrphanDefinition = Omit<OrphanCandidate, "writerFiles" | "consumerFiles" | "validatorFiles"> & {
  tokens: string[];
};

type BuildOptions = {
  root?: string;
  now?: Date;
};

const sourceCache = new Map<string, string>();

const OWNER = {
  rawLedger: "raw event ledger",
  identityGraph: "identity graph",
  snapshot: "admin metric snapshot",
  debug: "admin debug parity",
  vendor: "vendor evidence",
  release: "release/version truth",
  readiness: "readiness score/evidence",
  cost: "cloud/Firebase cost truth",
} as const;

export const REQUIRED_LANE_DEFINITIONS: LaneDefinition[] = [
  {
    laneKey: "ga4",
    title: "GA4",
    category: "vendor_evidence",
    currentOwner: "client telemetry vendor lane",
    recommendedOwner: OWNER.vendor,
    sourceOfTruthStatus: "evidence_only",
    collectionsOrPaths: ["gtag", "GA4", "Google Analytics"],
    costRisks: ["Vendor counts can drift from first-party facts if treated as display truth."],
    freshnessRule: "Vendor evidence must be labeled by extract or realtime/intraday state.",
    recommendedAction: "Keep as labeled validation evidence; never promote to product truth without reconciliation.",
    tokens: ["gtag", "GA4", "google analytics"],
    writerHints: ["src/lib/telemetry.ts", "src/components/Analytics/DeepTracker.tsx"],
    readerHints: ["src/app/admin/analytics", "src/app/api/admin"],
    validatorHints: ["scripts", "tests"],
  },
  {
    laneKey: "posthog",
    title: "PostHog",
    category: "vendor_evidence",
    currentOwner: "client telemetry vendor lane",
    recommendedOwner: OWNER.vendor,
    sourceOfTruthStatus: "evidence_only",
    collectionsOrPaths: ["posthog-js", "$pageview"],
    costRisks: ["Duplicate vendor emission can increase telemetry noise if compared as product truth."],
    freshnessRule: "Vendor evidence only; no product readiness status should depend on live PostHog.",
    recommendedAction: "Keep as vendor evidence and label any Debug comparison as directional.",
    tokens: ["posthog", "$pageview"],
    writerHints: ["src/components/Analytics/CSPostHogProvider.tsx"],
    readerHints: ["src/app/admin", "docs/agent-truth"],
    validatorHints: ["scripts", "tests"],
  },
  {
    laneKey: "deeptracker_raw_events",
    title: "DeepTracker raw events",
    category: "raw_ledger",
    currentOwner: "client raw telemetry",
    recommendedOwner: OWNER.rawLedger,
    sourceOfTruthStatus: "canonical",
    collectionsOrPaths: ["/api/analytics/ingest", "analytics_guest_batches"],
    costRisks: ["Retry or batching defects can duplicate guest raw events."],
    freshnessRule: "Client batches are raw inputs; display truth requires materialized sample evidence.",
    recommendedAction: "Keep as raw ingest; display only through snapshots or Debug evidence.",
    tokens: ["DeepTracker", "/api/analytics/ingest", "analytics_guest_batches"],
    writerHints: ["src/components/Analytics/DeepTracker.tsx"],
    readerHints: ["src/app/api/analytics/ingest/route.ts", "src/app/api/admin", "functions/src"],
    validatorHints: ["scripts/agent", "tests/unit"],
  },
  {
    laneKey: "first_party_semantic_telemetry",
    title: "First-party semantic telemetry",
    category: "raw_ledger",
    currentOwner: "telemetry catalog and identified ingest",
    recommendedOwner: OWNER.rawLedger,
    sourceOfTruthStatus: "canonical",
    collectionsOrPaths: ["src/lib/telemetry.ts", "src/lib/telemetry-catalog.ts", "analytics_event_facts"],
    costRisks: ["Vendor-first semantic paths can create parity drift if not mirrored into first-party facts."],
    freshnessRule: "Event names must be cataloged before ingest.",
    recommendedAction: "Keep event contract as write boundary; snapshots own display calculations.",
    tokens: ["trackEvent", "telemetry-catalog", "analytics_event_facts"],
    writerHints: ["src/lib/telemetry.ts", "src/app/api/analytics/ingest-identified/route.ts"],
    readerHints: ["src/lib/analytics", "src/app/api/admin", "functions/src"],
    validatorHints: ["scripts/agent/validate-analytics-event-contract.ts", "tests/unit/analytics-event-contract.spec.ts"],
  },
  {
    laneKey: "guest_ingest",
    title: "Guest ingest",
    category: "raw_ledger",
    currentOwner: "guest analytics ingest route",
    recommendedOwner: OWNER.rawLedger,
    sourceOfTruthStatus: "canonical",
    collectionsOrPaths: ["analytics_guest_batches", "analytics_sessions", "/api/analytics/ingest"],
    costRisks: ["Guest envelopes become expensive if admin display scans them repeatedly."],
    freshnessRule: "Guest counts require source sample evidence before zero/live display.",
    recommendedAction: "Keep as raw envelope and materializer input; route display through guest snapshot.",
    tokens: ["analytics_guest_batches", "analytics_sessions", "anonymousVisitorId"],
    writerHints: ["src/app/api/analytics/ingest/route.ts"],
    readerHints: ["functions/src", "src/app/api/admin", "src/lib/analytics"],
    validatorHints: ["scripts/agent/validate-guest-user-analytics-cutover.ts", "tests/unit"],
  },
  {
    laneKey: "identified_ingest",
    title: "Identified ingest",
    category: "raw_ledger",
    currentOwner: "identified analytics ingest route",
    recommendedOwner: OWNER.rawLedger,
    sourceOfTruthStatus: "canonical",
    collectionsOrPaths: ["analytics_event_facts", "/api/analytics/ingest-identified"],
    costRisks: ["Identified facts can be double-counted if vendor events are treated as equal truth."],
    freshnessRule: "Event facts are raw ledger inputs until a snapshot proves a metric.",
    recommendedAction: "Keep as canonical first-party facts; avoid direct admin display aggregation.",
    tokens: ["analytics_event_facts", "ingest-identified"],
    writerHints: ["src/app/api/analytics/ingest-identified/route.ts", "functions/src/analytics-event-facts.ts"],
    readerHints: ["src/app/api/admin", "functions/src", "src/lib/server"],
    validatorHints: ["scripts/agent/validate-analytics-event-contract.ts", "tests/unit"],
  },
  {
    laneKey: "identity_links",
    title: "Identity links",
    category: "identity_graph",
    currentOwner: "analytics identity linking",
    recommendedOwner: OWNER.identityGraph,
    sourceOfTruthStatus: "canonical",
    collectionsOrPaths: ["analytics_identity_links", "identity_linked"],
    costRisks: ["Guest history is lost from UI if links are not consumed by journey snapshots."],
    freshnessRule: "Links preserve guest lineage; old facts must not be rewritten.",
    recommendedAction: "Use identity links for recovery/debug continuity and future journey snapshots.",
    tokens: ["analytics_identity_links", "identity_linked"],
    writerHints: ["src/lib/server/analytics-identity-linking.ts", "src/lib/analytics/identity-link-contract.ts"],
    readerHints: ["src/lib/server", "src/app/api/admin", "docs/agent-truth"],
    validatorHints: ["scripts/agent", "tests/unit"],
  },
  {
    laneKey: "analytics_event_facts",
    title: "analytics_event_facts",
    category: "raw_ledger",
    currentOwner: "first-party event fact ledger",
    recommendedOwner: OWNER.rawLedger,
    sourceOfTruthStatus: "canonical",
    collectionsOrPaths: ["analytics_event_facts"],
    costRisks: ["Broad admin reads and client listeners over raw event facts are expensive."],
    freshnessRule: "Raw facts are authoritative inputs, not final display metrics.",
    recommendedAction: "Keep as ledger; remove display fallback authority in later rewire phases.",
    tokens: ["analytics_event_facts"],
    writerHints: ["src/app/api/analytics/ingest-identified/route.ts", "functions/src/analytics-event-facts.ts"],
    readerHints: ["src/app/api/admin", "src/lib/server", "functions/src"],
    validatorHints: ["scripts", "tests"],
  },
  {
    laneKey: "analytics_guest_batches",
    title: "analytics_guest_batches",
    category: "raw_ledger",
    currentOwner: "guest batch ledger",
    recommendedOwner: OWNER.rawLedger,
    sourceOfTruthStatus: "canonical",
    collectionsOrPaths: ["analytics_guest_batches"],
    costRisks: ["Admin raw scans of guest batches bypass bounded guest snapshots."],
    freshnessRule: "Display zero/live only after source sample evidence exists.",
    recommendedAction: "Keep as source input; consume through guest snapshot and Debug details.",
    tokens: ["analytics_guest_batches"],
    writerHints: ["src/app/api/analytics/ingest/route.ts", "functions/src/analytics-guest-batches.ts"],
    readerHints: ["src/app/api/admin", "functions/src", "src/lib/analytics"],
    validatorHints: ["scripts", "tests"],
  },
  {
    laneKey: "analytics_sessions",
    title: "analytics_sessions",
    category: "raw_ledger",
    currentOwner: "guest/session ingest",
    recommendedOwner: OWNER.rawLedger,
    sourceOfTruthStatus: "needs_review",
    collectionsOrPaths: ["analytics_sessions"],
    costRisks: ["Session truth splits from GA sessions and watch sessions if not normalized."],
    freshnessRule: "Session metrics require a declared session definition.",
    recommendedAction: "Keep as transport/session evidence until a session snapshot owns display counts.",
    tokens: ["analytics_sessions"],
    writerHints: ["src/app/api/analytics/ingest/route.ts"],
    readerHints: ["src/app/api/admin", "src/lib/server", "docs/agent-truth"],
    validatorHints: ["scripts", "tests"],
  },
  {
    laneKey: "behavioral_timeline_facts",
    title: "behavioral_timeline_facts",
    category: "raw_ledger",
    currentOwner: "behavioral timeline materializer",
    recommendedOwner: OWNER.rawLedger,
    sourceOfTruthStatus: "canonical",
    collectionsOrPaths: ["behavioral_timeline_facts"],
    costRisks: ["Timeline facts are costly if used directly by admin display instead of indexes."],
    freshnessRule: "Timeline facts feed indexes and snapshots; display must declare derived model.",
    recommendedAction: "Keep as behavior spine and surface only via indexes/snapshots/debug.",
    tokens: ["behavioral_timeline_facts", "BEHAVIORAL_TIMELINE_COLLECTION"],
    writerHints: ["src/lib/server", "functions/src"],
    readerHints: ["src/lib/server", "src/app/api/admin", "docs/agent-truth"],
    validatorHints: ["scripts", "tests"],
  },
  {
    laneKey: "guest_tracking_indexes",
    title: "guest_tracking_indexes",
    category: "identity_graph",
    currentOwner: "user tracking index materializer",
    recommendedOwner: OWNER.identityGraph,
    sourceOfTruthStatus: "canonical",
    collectionsOrPaths: ["guest_tracking_indexes"],
    costRisks: ["Recovered guest continuity stays hidden if indexes are never consumed by admin/debug."],
    freshnessRule: "Indexes are read models derived from timeline facts.",
    recommendedAction: "Use as guest continuity read model for recovery and future Admin journey modules.",
    tokens: ["guest_tracking_indexes"],
    writerHints: ["src/lib/server/user-index-writer.ts"],
    readerHints: ["src/lib/server/user-index-reader.ts", "src/app/api/admin", "docs/agent-truth"],
    validatorHints: ["scripts", "tests"],
  },
  {
    laneKey: "user_journey_indexes",
    title: "user_journey_indexes",
    category: "identity_graph",
    currentOwner: "user journey index materializer",
    recommendedOwner: OWNER.identityGraph,
    sourceOfTruthStatus: "canonical",
    collectionsOrPaths: ["user_journey_indexes"],
    costRisks: ["Funnel metrics can duplicate raw event ratios if this read model is ignored."],
    freshnessRule: "Journey indexes own ordered journey read models when materialized.",
    recommendedAction: "Promote as future journey/funnel source; demote raw ratios to Debug evidence.",
    tokens: ["user_journey_indexes"],
    writerHints: ["src/lib/server/user-index-writer.ts"],
    readerHints: ["src/lib/server/user-index-reader.ts", "src/app/api/admin", "docs/agent-truth"],
    validatorHints: ["scripts", "tests"],
  },
  {
    laneKey: "analytics_watch_sessions",
    title: "analytics_watch_sessions",
    category: "raw_ledger",
    currentOwner: "watch-time ledger",
    recommendedOwner: OWNER.rawLedger,
    sourceOfTruthStatus: "canonical",
    collectionsOrPaths: ["analytics_watch_sessions", "analytics_watch_assets"],
    costRisks: ["Watch metrics duplicate page-duration and event counts if not snapshot-owned."],
    freshnessRule: "Watch time must be foreground visible engagement, not page duration.",
    recommendedAction: "Keep as watch source; display through watch/session rollups and snapshots.",
    tokens: ["analytics_watch_sessions", "analytics_watch_assets"],
    writerHints: ["src/lib/server", "functions/src"],
    readerHints: ["src/app/api/admin", "src/lib/server", "docs/agent-truth"],
    validatorHints: ["scripts", "tests"],
  },
  {
    laneKey: "purchase_facts",
    title: "Purchase facts",
    category: "raw_ledger",
    currentOwner: "commerce transaction truth",
    recommendedOwner: OWNER.rawLedger,
    sourceOfTruthStatus: "canonical",
    collectionsOrPaths: ["transactions", "analytics_commerce_rollup", "purchase"],
    costRisks: ["GA ecommerce must not override backend purchase records."],
    freshnessRule: "Revenue uses backend transaction/server purchase facts first.",
    recommendedAction: "Keep commerce snapshot backed by transaction truth; GA is drift evidence only.",
    tokens: ["analytics_commerce_rollup", "transactions", "purchase"],
    writerHints: ["src/app/api", "src/lib/server"],
    readerHints: ["src/app/api/admin", "src/lib/analytics", "docs/agent-truth"],
    validatorHints: ["scripts", "tests"],
  },
  {
    laneKey: "unlock_facts",
    title: "Unlock facts",
    category: "raw_ledger",
    currentOwner: "entitlement/unlock truth",
    recommendedOwner: OWNER.rawLedger,
    sourceOfTruthStatus: "canonical",
    collectionsOrPaths: ["unlock", "entitlement", "gumdrop"],
    costRisks: ["Telemetry unlock events cannot become entitlement truth."],
    freshnessRule: "Unlock metrics count server entitlement facts only.",
    recommendedAction: "Keep unlock snapshot backed by entitlement/server facts.",
    tokens: ["unlock", "entitlement"],
    writerHints: ["src/app/api", "src/lib/server"],
    readerHints: ["src/app/api/admin", "docs/agent-truth", "scripts"],
    validatorHints: ["scripts/agent/validate-unlock-telemetry-truth.ts", "tests"],
  },
  {
    laneKey: "notification_facts",
    title: "Notification facts",
    category: "raw_ledger",
    currentOwner: "notification delivery/read truth",
    recommendedOwner: OWNER.rawLedger,
    sourceOfTruthStatus: "needs_review",
    collectionsOrPaths: ["notifications", "notification_funnel", "user_notification_indexes"],
    costRisks: ["Delivery/read metrics can split between push logs, user records, and telemetry."],
    freshnessRule: "Notification metrics need delivery/read source labels.",
    recommendedAction: "Consolidate delivery/read snapshots; keep raw logs in Debug.",
    tokens: ["notification_funnel", "user_notification_indexes", "notifications"],
    writerHints: ["src/lib", "functions/src"],
    readerHints: ["src/app/api/admin", "src/lib/server", "docs/agent-truth"],
    validatorHints: ["scripts/check-notification-pipeline.ts", "tests"],
  },
  {
    laneKey: "support_recovery_facts",
    title: "Support and recovery facts",
    category: "raw_ledger",
    currentOwner: "support/debug evidence lane",
    recommendedOwner: OWNER.debug,
    sourceOfTruthStatus: "debug_only",
    collectionsOrPaths: ["support", "platform_feedback", "recovery"],
    costRisks: ["Recovery signals can stay invisible if only raw support/debug lanes read them."],
    freshnessRule: "Support/recovery evidence must label source and confidence.",
    recommendedAction: "Surface recovery summaries in Debug before compact Admin Analytics.",
    tokens: ["platform_feedback", "support", "recovery"],
    writerHints: ["src/app/api", "src/lib/server"],
    readerHints: ["src/app/api/admin/debug/route.ts", "docs/agent-truth", "scripts"],
    validatorHints: ["scripts/agent/validate-support-recovery-flows.ts", "tests"],
  },
  {
    laneKey: "admin_debug_route_diagnostics",
    title: "Admin debug route diagnostics",
    category: "admin_debug",
    currentOwner: "Admin Debug",
    recommendedOwner: OWNER.debug,
    sourceOfTruthStatus: "debug_only",
    collectionsOrPaths: ["server_diagnostics", "analytics_pipeline_daily", "admin debug route"],
    costRisks: ["Debug broad reads must stay bounded and must not be promoted to display truth."],
    freshnessRule: "Debug shows source formulas, drift, missing samples, and route freshness.",
    recommendedAction: "Keep as Debug-only parity/recovery surface.",
    tokens: ["server_diagnostics", "analytics_pipeline_daily", "adminDebug"],
    writerHints: ["src/lib/server", "functions/src"],
    readerHints: ["src/app/api/admin/debug/route.ts", "src/app/admin/debug"],
    validatorHints: ["scripts/agent", "tests"],
  },
  {
    laneKey: "analytics_aggregate_stats_realtime_summary",
    title: "analytics_aggregate_stats/realtime_summary",
    category: "snapshot_authority",
    currentOwner: "legacy realtime summary",
    recommendedOwner: OWNER.snapshot,
    sourceOfTruthStatus: "fallback",
    collectionsOrPaths: ["analytics_aggregate_stats/realtime_summary"],
    costRisks: ["One-minute rebuild/read model can duplicate admin snapshot registry authority."],
    freshnessRule: "Use as legacy/fallback/evidence unless a route explicitly owns live pulse.",
    recommendedAction: "Demote behind analytics_admin_metric_snapshots in future authority collapse.",
    tokens: ["analytics_aggregate_stats", "realtime_summary"],
    writerHints: ["functions/src/analytics-realtime-summary.ts"],
    readerHints: ["src/app/api/admin/analytics/realtime/route.ts", "src/app/api/admin/debug/route.ts"],
    validatorHints: ["scripts/agent/validate-admin-analytics-hot-cache.ts", "tests"],
  },
  {
    laneKey: "analytics_admin_metric_snapshots",
    title: "analytics_admin_metric_snapshots",
    category: "snapshot_authority",
    currentOwner: "Admin metric snapshot registry",
    recommendedOwner: OWNER.snapshot,
    sourceOfTruthStatus: "canonical",
    collectionsOrPaths: ["analytics_admin_metric_snapshots"],
    costRisks: ["Display truth splits if raw routes or realtime_summary bypass this registry."],
    freshnessRule: "Verified snapshots require lastVerifiedAt, source metadata, and fake-zero protection.",
    recommendedAction: "Make the canonical Admin Analytics display snapshot authority.",
    tokens: ["analytics_admin_metric_snapshots", "AdminMetricSnapshot"],
    writerHints: ["src/lib/server/admin-analytics-snapshots.ts", "src/lib/server/admin-analytics-materializers.ts"],
    readerHints: ["src/hooks/useAdminAnalyticsSnapshot.ts", "src/app/api/admin/debug/route.ts"],
    validatorHints: ["scripts/agent/validate-admin-analytics-hot-cache.ts", "tests"],
  },
  {
    laneKey: "bigquery_exports",
    title: "BigQuery exports",
    category: "vendor_evidence",
    currentOwner: "analytics export lane",
    recommendedOwner: OWNER.vendor,
    sourceOfTruthStatus: "evidence_only",
    collectionsOrPaths: ["functions/src/analytics-bigquery-export.ts", "BigQuery raw_events"],
    costRisks: ["BigQuery scans are expensive and must not be runtime/admin display truth."],
    freshnessRule: "Completed-day exports are evidence; intraday/current-day is directional.",
    recommendedAction: "Keep export-only; reconcile and label in Debug when used.",
    tokens: ["BigQuery", "raw_events", "analytics-bigquery-export"],
    writerHints: ["functions/src/analytics-bigquery-export.ts"],
    readerHints: ["src/app/api/admin/debug/route.ts", "docs/agent-truth", "scripts"],
    validatorHints: ["scripts/agent", "tests"],
  },
  {
    laneKey: "generated_readiness_score_reports",
    title: "Generated readiness and score reports",
    category: "score_report",
    currentOwner: "generated evidence snapshots",
    recommendedOwner: OWNER.readiness,
    sourceOfTruthStatus: "evidence_only",
    collectionsOrPaths: ["agent/state/*.generated.json"],
    costRisks: ["Stale reports can create false launch confidence if treated as doctrine."],
    freshnessRule: "Generated reports are stale after 24 hours unless a contract says otherwise.",
    recommendedAction: "Keep freshness caps and mark stale/unknown evidence explicitly.",
    tokens: ["generatedAtUtc", "public-beta-score", "launch-readiness"],
    writerHints: ["scripts/agent/score-public-beta-readiness.ts", "scripts/agent/validate-launch-readiness-final.ts"],
    readerHints: ["scripts/agent", "docs/agent-truth"],
    validatorHints: ["scripts/agent/validate-generated-report-authority.ts", "tests/unit/public-beta-score.spec.ts"],
  },
  {
    laneKey: "public_beta_release_notes",
    title: "Public beta release notes / Beta badge version truth",
    category: "release_version",
    currentOwner: "public release-note artifacts",
    recommendedOwner: OWNER.release,
    sourceOfTruthStatus: "canonical",
    collectionsOrPaths: ["public/kandydrops-release-notes.json", "src/lib/release-notes/public-release-notes.ts", "CHANGELOG.md"],
    costRisks: ["Badge can become stale if accepted patches do not publish a note."],
    freshnessRule: "Every accepted Phase 1 patch batch increments the badge counter exactly once.",
    recommendedAction: "Keep as version/evidence marker; do not claim smoke or provider proof.",
    tokens: ["kandydrops-release-notes", "betaReleaseCounter", "PUBLIC_RELEASE_NOTES_FALLBACK"],
    writerHints: ["scripts/release/update-public-changelog.ts"],
    readerHints: ["src/lib/release-notes", "docs/agent-truth/public-beta-release-notes.md"],
    validatorHints: ["scripts/agent/validate-public-beta-changelog.ts", "tests"],
  },
  {
    laneKey: "cloud_firebase_cost_truth",
    title: "Cloud/Firebase cost truth",
    category: "cloud_cost",
    currentOwner: "cost guardrail validators",
    recommendedOwner: OWNER.cost,
    sourceOfTruthStatus: "needs_review",
    collectionsOrPaths: ["cloud cost contracts", "Firebase reads/listeners", "Cloud Run routes"],
    costRisks: ["Admin raw scans, realtime listeners, and scheduled rebuilds can create hidden cost."],
    freshnessRule: "Cost evidence is local/static unless an authenticated cloud smoke is explicitly requested.",
    recommendedAction: "Keep static cost guardrails near rewire planning; do not add provider checks by default.",
    tokens: ["cloud-cost", "google-cost", "global-cost", "Firestore"],
    writerHints: ["src/lib/server/cloud-cost-contract.ts", "src/lib/server/global-cost-surface-contract.ts"],
    readerHints: ["scripts/agent", "docs/agent-truth"],
    validatorHints: ["scripts/agent/validate-cloudrun-sql-bigquery-guardrails.ts", "scripts/agent/validate-google-cost-bleed.ts"],
  },
];

const ORPHAN_DEFINITIONS: OrphanDefinition[] = [
  {
    key: "identity_links",
    writtenPath: "analytics_identity_links",
    recoveryValue: "high",
    recommendedAction: "surface",
    tokens: ["analytics_identity_links", "identity_linked"],
  },
  {
    key: "guest_tracking_indexes",
    writtenPath: "guest_tracking_indexes",
    recoveryValue: "high",
    recommendedAction: "surface",
    tokens: ["guest_tracking_indexes"],
  },
  {
    key: "user_journey_indexes",
    writtenPath: "user_journey_indexes",
    recoveryValue: "high",
    recommendedAction: "surface",
    tokens: ["user_journey_indexes"],
  },
  {
    key: "user_entity_affinity_indexes",
    writtenPath: "user_entity_affinity_indexes",
    recoveryValue: "medium",
    recommendedAction: "debug_only",
    tokens: ["user_entity_affinity_indexes"],
  },
  {
    key: "user_value_indexes",
    writtenPath: "user_value_indexes",
    recoveryValue: "medium",
    recommendedAction: "debug_only",
    tokens: ["user_value_indexes"],
  },
  {
    key: "user_notification_indexes",
    writtenPath: "user_notification_indexes",
    recoveryValue: "medium",
    recommendedAction: "debug_only",
    tokens: ["user_notification_indexes"],
  },
  {
    key: "user_content_consumption_indexes",
    writtenPath: "user_content_consumption_indexes",
    recoveryValue: "medium",
    recommendedAction: "debug_only",
    tokens: ["user_content_consumption_indexes"],
  },
  {
    key: "behavioral_timeline_facts",
    writtenPath: "behavioral_timeline_facts",
    recoveryValue: "high",
    recommendedAction: "surface",
    tokens: ["behavioral_timeline_facts", "BEHAVIORAL_TIMELINE_COLLECTION"],
  },
  {
    key: "analytics_legacy_recovered_events",
    writtenPath: "analytics_legacy_recovered_events",
    recoveryValue: "high",
    recommendedAction: "needs_review",
    tokens: ["analytics_legacy_recovered_events"],
  },
  {
    key: "analytics_pipeline_daily",
    writtenPath: "analytics_pipeline_daily",
    recoveryValue: "medium",
    recommendedAction: "debug_only",
    tokens: ["analytics_pipeline_daily"],
  },
  {
    key: "analytics_export_status",
    writtenPath: "analytics_export_status",
    recoveryValue: "medium",
    recommendedAction: "debug_only",
    tokens: ["analytics_export_status"],
  },
  {
    key: "server_diagnostics",
    writtenPath: "server_diagnostics",
    recoveryValue: "medium",
    recommendedAction: "debug_only",
    tokens: ["server_diagnostics"],
  },
  {
    key: "platform_feedback",
    writtenPath: "platform_feedback",
    recoveryValue: "medium",
    recommendedAction: "debug_only",
    tokens: ["platform_feedback"],
  },
  {
    key: "security_events",
    writtenPath: "security_events",
    recoveryValue: "medium",
    recommendedAction: "debug_only",
    tokens: ["security_events"],
  },
  {
    key: "analytics_watch_assets",
    writtenPath: "analytics_watch_assets",
    recoveryValue: "medium",
    recommendedAction: "surface",
    tokens: ["analytics_watch_assets"],
  },
];

const DUPLICATE_AUTHORITY_DEFINITIONS: Omit<DuplicateAuthority, "files">[] = [
  {
    metricOrLane: DUPLICATE_SNAPSHOT_AUTHORITY_RULE.metricOrLane,
    competingAuthorities: [...DUPLICATE_SNAPSHOT_AUTHORITY_RULE.competingAuthorities],
    recommendedAuthority: DUPLICATE_SNAPSHOT_AUTHORITY_RULE.recommendedAuthority,
    demoteToEvidenceOrFallback: [...DUPLICATE_SNAPSHOT_AUTHORITY_RULE.demoteToEvidenceOrFallback],
  },
  {
    metricOrLane: "active_users",
    competingAuthorities: ["GA4 realtime", "analytics_active_users", "analytics_event_facts", "analytics_watch_sessions"],
    recommendedAuthority: "analytics_admin_metric_snapshots",
    demoteToEvidenceOrFallback: ["GA4 realtime", "analytics_active_users", "raw event/watch facts"],
  },
  {
    metricOrLane: "guest_users",
    competingAuthorities: ["analytics_guest_batches", "analytics_sessions", "GA-derived estimates", "guestAnalyticsSnapshot"],
    recommendedAuthority: "analytics_admin_metric_snapshots",
    demoteToEvidenceOrFallback: ["GA-derived estimates", "raw guest envelopes"],
  },
  {
    metricOrLane: "journey_funnel",
    competingAuthorities: ["analytics_event_facts ratios", "user_journey_indexes", "GA funnel evidence"],
    recommendedAuthority: "user_journey_indexes -> analytics_admin_metric_snapshots",
    demoteToEvidenceOrFallback: ["raw event ratios", "GA funnel evidence"],
  },
  {
    metricOrLane: "watch_time",
    competingAuthorities: ["analytics_watch_sessions", "analytics_watch_assets", "GA/page duration"],
    recommendedAuthority: "watch session rollup -> analytics_admin_metric_snapshots",
    demoteToEvidenceOrFallback: ["GA/page duration"],
  },
];

function normalizeRepoPath(value: string) {
  return value.replace(/\\/gu, "/");
}

function readIfExists(root: string, repoPath: string) {
  const cacheKey = `${root}\u0000${repoPath}`;
  const cached = sourceCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const absolutePath = path.join(root, repoPath);
  const source = existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
  sourceCache.set(cacheKey, source);
  return source;
}

function listFiles(root: string) {
  try {
    return execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
      .split(/\r?\n/u)
      .map((entry) => normalizeRepoPath(entry.trim()))
      .filter(Boolean)
      .sort();
  } catch {
    const results: string[] = [];
    function walk(relativeDir: string) {
      const absoluteDir = path.join(root, relativeDir);
      if (!existsSync(absoluteDir)) return;
      for (const entry of readdirSync(absoluteDir)) {
        const nextRelative = normalizeRepoPath(path.join(relativeDir, entry));
        const nextAbsolute = path.join(root, nextRelative);
        const stats = statSync(nextAbsolute);
        if (stats.isDirectory()) {
          if (entry !== "node_modules" && entry !== ".next") walk(nextRelative);
        } else {
          results.push(nextRelative);
        }
      }
    }
    walk(".");
    return results.sort();
  }
}

function safeCurrentHead(root: string) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return undefined;
  }
}

function includesToken(source: string, tokens: readonly string[]) {
  const normalizedSource = source.toLowerCase();
  return tokens.some((token) => normalizedSource.includes(token.toLowerCase()));
}

function isLikelySourceFile(repoPath: string) {
  return /\.(?:ts|tsx|js|jsx|mjs|cjs|json|md)$/u.test(repoPath);
}

function findFilesMentioning(root: string, files: string[], tokens: readonly string[], pathHints: readonly string[] = []) {
  const normalizedHints = pathHints.map((hint) => normalizeRepoPath(hint));
  const candidates = files.filter((repoPath) => {
    if (!isLikelySourceFile(repoPath)) return false;
    if (normalizedHints.length === 0) return true;
    return normalizedHints.some((hint) => repoPath === hint || repoPath.startsWith(hint.replace(/\/?$/u, "/")));
  });

  return candidates
    .filter((repoPath) => includesToken(readIfExists(root, repoPath), tokens))
    .sort();
}

function findExistingHints(root: string, hints: readonly string[], tokens: readonly string[]) {
  return hints
    .map(normalizeRepoPath)
    .filter((hint) => {
      const absolutePath = path.join(root, hint);
      if (!existsSync(absolutePath)) return false;
      if (statSync(absolutePath).isDirectory()) return false;
      const source = readIfExists(root, hint);
      return source.length > 0 && includesToken(source, tokens);
    })
    .sort();
}

function limitFiles(files: string[], limit = 8) {
  return files.slice(0, limit);
}

function buildLanes(root: string, files: string[]) {
  return REQUIRED_LANE_DEFINITIONS.map(({ tokens, writerHints, readerHints, validatorHints, ...lane }) => {
    const writers = findExistingHints(root, writerHints, tokens);
    const readers = findFilesMentioning(root, files, tokens, readerHints);
    const validators = findFilesMentioning(root, files, tokens, validatorHints);

    return {
      ...lane,
      writers: limitFiles(writers),
      readers: limitFiles(readers.filter((repoPath) => !writers.includes(repoPath)), 6),
      validators: limitFiles(validators),
    };
  });
}

function buildRawDisplayIssues(root: string, files: string[]) {
  const issues: RewireIssue[] = [];
  const adminRealtimeHook = "src/app/admin/analytics/hooks/useAdminAnalyticsRealtime.ts";
  const adminRealtimeSource = readIfExists(root, adminRealtimeHook);
  const listenerCollections = RAW_DISPLAY_RISK_COLLECTIONS.filter((collection) =>
    adminRealtimeSource.includes("onSnapshot") && adminRealtimeSource.includes(collection),
  );

  if (listenerCollections.length > 0) {
    issues.push({
      issueKey: "admin-analytics-raw-realtime-listeners",
      severity: "P0",
      title: "Admin Analytics still has raw realtime listener display risks",
      description: `Raw listener references found for: ${listenerCollections.join(", ")}. Realtime is an upgrade path, not display truth.`,
      files: [adminRealtimeHook],
      recommendedOwner: OWNER.snapshot,
      recommendedAction: "Later rewire phases should route display through analytics_admin_metric_snapshots and keep raw listeners as optional upgrades or Debug evidence.",
      blocksScreenshotQA: false,
      blocksPhaseOneFreeze: true,
    });
  }

  const adminRouteFiles = files.filter((repoPath) =>
    repoPath.startsWith("src/app/api/admin/analytics/")
    || repoPath === "src/app/api/admin/debug/route.ts"
    || repoPath.startsWith("src/lib/analytics/")
    || repoPath.startsWith("src/lib/admin-analytics"),
  );
  const rawFallbackFiles = adminRouteFiles.filter((repoPath) => {
    const source = readIfExists(root, repoPath);
    return RAW_DISPLAY_RISK_COLLECTIONS.some((collection) => source.includes(collection))
      && /\b(fallback|cold|historical|overview|display|summary|snapshot)\b/iu.test(source);
  });

  if (rawFallbackFiles.length > 0) {
    issues.push({
      issueKey: "admin-routes-raw-display-fallback",
      severity: "P0",
      title: "Admin routes/helpers still reference raw guest/event/watch data as fallback display inputs",
      description: "Snapshot-first display exists, but route/helper fallback paths still mention raw analytics collections.",
      files: limitFiles(rawFallbackFiles, 8),
      recommendedOwner: OWNER.snapshot,
      recommendedAction: "Later phases should keep bounded Debug reads but move compact Admin Analytics display fallback to verified snapshots.",
      blocksScreenshotQA: false,
      blocksPhaseOneFreeze: true,
    });
  }

  return issues;
}

function buildDuplicateAuthorities(root: string, files: string[]) {
  return DUPLICATE_AUTHORITY_DEFINITIONS.map((definition) => {
    const filesForAuthority = findFilesMentioning(root, files, definition.competingAuthorities, [
      "src/app/api/admin",
      "src/app/admin/analytics",
      "src/lib",
      "functions/src",
      "docs/agent-truth",
      "scripts",
    ]);

    return {
      ...definition,
      files: limitFiles(filesForAuthority, 6),
    };
  });
}

function buildDuplicateAuthorityIssues(duplicateAuthorities: DuplicateAuthority[]) {
  return duplicateAuthorities.map<RewireIssue>((entry) => ({
    issueKey: `duplicate-authority-${entry.metricOrLane}`,
    severity: entry.metricOrLane === DUPLICATE_SNAPSHOT_AUTHORITY_RULE.metricOrLane ? "P0" : "P1",
    title: `Duplicate authority: ${entry.metricOrLane}`,
    description: `${entry.competingAuthorities.join(" vs ")} currently compete. Recommended authority: ${entry.recommendedAuthority}.`,
    files: entry.files,
    recommendedOwner: OWNER.snapshot,
    recommendedAction: `Demote ${entry.demoteToEvidenceOrFallback.join(", ")} to evidence/fallback/debug paths.`,
    blocksScreenshotQA: false,
    blocksPhaseOneFreeze: entry.metricOrLane === DUPLICATE_SNAPSHOT_AUTHORITY_RULE.metricOrLane,
  }));
}

function buildVendorIssues(root: string, files: string[]) {
  const candidateFiles = findFilesMentioning(root, files, VENDOR_EVIDENCE_ONLY_RULE.vendors, [
    "src/app/api/admin",
    "src/app/admin/analytics",
    "src/lib/analytics",
    "docs/agent-truth",
    "scripts",
  ]);
  const riskyFiles = candidateFiles.filter((repoPath) => {
    const source = readIfExists(root, repoPath);
    if (!/\b(ga4|bigquery|posthog)\b/iu.test(source)) return false;
    return /\b(source|truth|display|admin|fallback|overview|summary)\b/iu.test(source);
  });

  if (riskyFiles.length === 0) return [];

  return [{
    issueKey: "vendor-evidence-boundary-review",
    severity: "P1",
    title: "Vendor evidence boundary needs explicit labels",
    description: "GA4, BigQuery, or PostHog references appear near admin/display/source logic. They must remain evidence, export, estimate, validation, or Debug parity only.",
    files: limitFiles(riskyFiles, 8),
    recommendedOwner: OWNER.vendor,
    recommendedAction: "Later phases should label vendor-derived values as estimates/evidence and ensure first-party snapshots win display truth.",
    blocksScreenshotQA: false,
    blocksPhaseOneFreeze: false,
  } satisfies RewireIssue];
}

function readGeneratedAt(root: string, repoPath: string) {
  try {
    const parsed = JSON.parse(readIfExists(root, repoPath)) as { generatedAtUtc?: unknown; generatedAt?: unknown };
    const value = typeof parsed.generatedAtUtc === "string" ? parsed.generatedAtUtc : parsed.generatedAt;
    if (typeof value !== "string") return null;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
  } catch {
    return null;
  }
}

function findStaleGeneratedReports(root: string, files: string[], now: Date) {
  const nowMs = now.getTime();
  return files
    .filter((repoPath) => /^agent\/state\/.*\.generated\.json$/u.test(repoPath))
    .filter((repoPath) => {
      const generatedAt = readGeneratedAt(root, repoPath);
      return generatedAt === null || nowMs - generatedAt > STALE_GENERATED_REPORT_WINDOW_MS;
    })
    .sort();
}

function buildStaleReportIssue(staleReports: string[]) {
  if (staleReports.length === 0) return [];
  return [{
    issueKey: "stale-generated-report-authority",
    severity: "P1",
    title: "Generated report evidence has stale authority risk",
    description: `${staleReports.length} generated report(s) are older than 24 hours or have no parseable generatedAtUtc. Generated reports are snapshots, not doctrine.`,
    files: limitFiles(staleReports, 8),
    recommendedOwner: OWNER.readiness,
    recommendedAction: "Keep stale reports capped as stale/unknown evidence until their owning generator refreshes them.",
    blocksScreenshotQA: false,
    blocksPhaseOneFreeze: false,
  } satisfies RewireIssue];
}

function buildOrphanCandidates(root: string, files: string[]) {
  return ORPHAN_DEFINITIONS.map((definition) => {
    const writerFiles = findFilesMentioning(root, files, definition.tokens, [
      "src/app/api",
      "src/lib/server",
      "functions/src",
      "scripts/analytics",
    ]);
    const consumerFiles = findFilesMentioning(root, files, definition.tokens, [
      "src/app/admin",
      "src/app/api/admin",
      "src/lib/analytics",
      "src/lib/admin",
      "docs/agent-truth",
    ]);
    const validatorFiles = findFilesMentioning(root, files, definition.tokens, ["scripts", "tests"]);

    return {
      key: definition.key,
      writtenPath: definition.writtenPath,
      writerFiles: limitFiles(writerFiles, 5),
      consumerFiles: limitFiles(consumerFiles, 5),
      validatorFiles: limitFiles(validatorFiles, 5),
      recoveryValue: definition.recoveryValue,
      recommendedAction: definition.recommendedAction,
    };
  });
}

function buildOrphanIssues(orphanCandidates: OrphanCandidate[]) {
  const highValue = orphanCandidates.filter((candidate) =>
    candidate.recoveryValue === "high" && candidate.consumerFiles.length === 0,
  );
  if (highValue.length === 0) return [];

  return [{
    issueKey: "high-value-orphan-candidates",
    severity: "P1",
    title: "High-value analytics data has no obvious consumer",
    description: `${highValue.length} high-value written path(s) need recovery review before deletion or consolidation.`,
    files: limitFiles(highValue.flatMap((candidate) => candidate.writerFiles), 8),
    recommendedOwner: OWNER.debug,
    recommendedAction: "Surface high-value candidates in Admin Debug recovery inventory before any runtime refactor.",
    blocksScreenshotQA: false,
    blocksPhaseOneFreeze: false,
  } satisfies RewireIssue];
}

export function buildAnalyticsRewirePhaseOneReport(options: BuildOptions = {}): AnalyticsRewirePhaseOneReport {
  const root = options.root ?? process.cwd();
  const now = options.now ?? new Date();
  const files = listFiles(root);
  const lanes = buildLanes(root, files);
  const duplicateAuthorities = buildDuplicateAuthorities(root, files);
  const orphanCandidates = buildOrphanCandidates(root, files);
  const staleReports = findStaleGeneratedReports(root, files, now);
  const rawIssues = buildRawDisplayIssues(root, files);
  const duplicateIssues = buildDuplicateAuthorityIssues(duplicateAuthorities);
  const vendorIssues = buildVendorIssues(root, files);
  const staleReportIssues = buildStaleReportIssue(staleReports);
  const orphanIssues = buildOrphanIssues(orphanCandidates);
  const issues = [
    ...rawIssues,
    ...duplicateIssues,
    ...vendorIssues,
    ...staleReportIssues,
    ...orphanIssues,
  ];

  return {
    generatedAtUtc: now.toISOString(),
    reportKey: ANALYTICS_REWIRE_REPORT_KEY,
    currentHead: safeCurrentHead(root),
    phasesCovered: [
      "0. Rewire Inventory Contract",
      "1. Truth-Lane Inventory Implementation",
      "2. Lost Data Discovery",
      "3. Truth Source Selection",
      "8. Snapshot Authority Collapse",
    ],
    summary: {
      laneCount: lanes.length,
      issueCount: issues.length,
      duplicateAuthorityCount: duplicateAuthorities.length,
      rawDisplayFallbackCount: rawIssues.length,
      staleAuthorityReportCount: staleReports.length,
      orphanCandidateCount: orphanCandidates.length,
      vendorTruthBoundaryIssueCount: vendorIssues.length,
      recommendedBlockers: issues.filter((issue) => issue.blocksPhaseOneFreeze).length,
    },
    lanes,
    issues,
    orphanCandidates,
    duplicateAuthorities,
  };
}

function validateLane(lane: RewireLane, failures: string[]) {
  if (!lane.laneKey) failures.push("lane is missing laneKey.");
  if (!lane.title) failures.push(`${lane.laneKey} is missing title.`);
  if (!lane.currentOwner) failures.push(`${lane.laneKey} is missing currentOwner.`);
  if (!lane.recommendedOwner) failures.push(`${lane.laneKey} is missing recommendedOwner.`);
  if (!lane.recommendedAction) failures.push(`${lane.laneKey} is missing recommendedAction.`);
  if (!Array.isArray(lane.collectionsOrPaths)) failures.push(`${lane.laneKey} collectionsOrPaths must be an array.`);
  if (!Array.isArray(lane.costRisks)) failures.push(`${lane.laneKey} costRisks must be an array.`);
}

export function validateAnalyticsRewirePhaseOneReport(report: AnalyticsRewirePhaseOneReport) {
  const failures: string[] = [];
  if (report.reportKey !== ANALYTICS_REWIRE_REPORT_KEY) failures.push("reportKey is incorrect.");
  if (!report.generatedAtUtc || Number.isNaN(Date.parse(report.generatedAtUtc))) failures.push("generatedAtUtc must be parseable UTC.");
  if (!Array.isArray(report.phasesCovered) || report.phasesCovered.length < 5) failures.push("phasesCovered is incomplete.");
  if (!Array.isArray(report.lanes) || report.lanes.length < REQUIRED_LANE_DEFINITIONS.length) failures.push("lanes are incomplete.");
  if (!Array.isArray(report.issues)) failures.push("issues must be an array.");
  if (!Array.isArray(report.orphanCandidates)) failures.push("orphanCandidates must be an array.");
  if (!Array.isArray(report.duplicateAuthorities)) failures.push("duplicateAuthorities must be an array.");

  for (const lane of report.lanes ?? []) validateLane(lane, failures);

  const laneKeys = new Set((report.lanes ?? []).map((lane) => lane.laneKey));
  for (const required of REQUIRED_LANE_DEFINITIONS) {
    if (!laneKeys.has(required.laneKey)) failures.push(`required lane missing: ${required.laneKey}`);
  }

  const snapshotDuplicate = report.duplicateAuthorities.find((entry) =>
    entry.metricOrLane === DUPLICATE_SNAPSHOT_AUTHORITY_RULE.metricOrLane
    && entry.recommendedAuthority === DUPLICATE_SNAPSHOT_AUTHORITY_RULE.recommendedAuthority
    && DUPLICATE_SNAPSHOT_AUTHORITY_RULE.competingAuthorities.every((authority) => entry.competingAuthorities.includes(authority)),
  );
  if (!snapshotDuplicate) failures.push("duplicate snapshot authority rule is missing.");

  for (const collection of RAW_DISPLAY_RISK_COLLECTIONS) {
    const known = report.lanes.some((lane) => lane.collectionsOrPaths.includes(collection))
      || report.issues.some((issue) => issue.description.includes(collection));
    if (!known) failures.push(`raw display risk collection is not represented: ${collection}`);
  }

  const vendorLaneCount = report.lanes.filter((lane) => lane.category === "vendor_evidence" && lane.sourceOfTruthStatus === "evidence_only").length;
  if (vendorLaneCount < 3) failures.push("vendor evidence-only rule is incomplete.");

  if (STALE_GENERATED_REPORT_WINDOW_MS !== 24 * 60 * 60 * 1000) failures.push("stale generated report rule must remain 24 hours.");

  for (const candidate of report.orphanCandidates) {
    if (!candidate.key || !candidate.writtenPath) failures.push("orphan candidate is missing key or writtenPath.");
    if (!Array.isArray(candidate.writerFiles)) failures.push(`${candidate.key} writerFiles must be an array.`);
    if (!Array.isArray(candidate.consumerFiles)) failures.push(`${candidate.key} consumerFiles must be an array.`);
    if (!Array.isArray(candidate.validatorFiles)) failures.push(`${candidate.key} validatorFiles must be an array.`);
    if (!candidate.recommendedAction) failures.push(`${candidate.key} recommendedAction is missing.`);
  }

  if (report.summary.laneCount !== report.lanes.length) failures.push("summary.laneCount does not match lanes.length.");
  if (report.summary.issueCount !== report.issues.length) failures.push("summary.issueCount does not match issues.length.");
  if (report.summary.duplicateAuthorityCount !== report.duplicateAuthorities.length) failures.push("summary.duplicateAuthorityCount does not match duplicateAuthorities.length.");
  if (report.summary.orphanCandidateCount !== report.orphanCandidates.length) failures.push("summary.orphanCandidateCount does not match orphanCandidates.length.");

  return failures;
}

export function writeAnalyticsRewirePhaseOneReport(report: AnalyticsRewirePhaseOneReport, root = process.cwd()) {
  const absolutePath = path.join(root, ANALYTICS_REWIRE_REPORT_PATH);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}
