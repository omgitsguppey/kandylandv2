export type BillingSpikeSurfaceId =
  | "firestore_realtime_listeners"
  | "firestore_rules_dependent_reads"
  | "firestore_offset_pagination"
  | "firestore_unbounded_collection_reads"
  | "cloud_logging_debug_evidence_volume"
  | "four_xx_logging_volume"
  | "app_hosting_uncached_bandwidth"
  | "cloud_run_dynamic_route_requests"
  | "cloud_run_slow_route_cpu_memory"
  | "cloud_build_deploy_churn"
  | "artifact_registry_image_retention"
  | "secret_manager_access_churn"
  | "storage_media_egress"
  | "storage_upload_retries"
  | "image_optimization_variants"
  | "analytics_guest_ingest_volume"
  | "analytics_identified_ingest_volume"
  | "watch_session_tick_volume"
  | "daily_task_reset_materializer_loops"
  | "notification_fanout_retry_storms"
  | "creator_broadcast_fanout"
  | "admin_snapshot_refresh_cadence"
  | "behavioral_rebuild_jobs"
  | "import_export_bigquery_dataconnect_sync_jobs"
  | "release_note_version_update_loops";

export type BillingSpikeRiskTier = "low" | "watch" | "review" | "high" | "critical";
export type BillingSpikeSourcePatternClassification =
  | "real_missing_coverage"
  | "renamed_moved_source"
  | "intentionally_absent_feature"
  | "external_manual_evidence_required"
  | "stale_detector_pattern";

export type BillingSpikeSourcePatternFinding = {
  pattern: string;
  classification: BillingSpikeSourcePatternClassification;
  reason: string;
  nextAction: string;
  replacementPatterns?: string[];
};

export type BillingSpikeTierFinding = {
  declaredTier: BillingSpikeRiskTier;
  computedTier: BillingSpikeRiskTier;
  classification: "tier_calibration_review";
  reason: string;
  nextAction: string;
};

export type BillingSpikeSurfaceEntry = {
  surface: BillingSpikeSurfaceId;
  owner: string;
  sourceFiles: string[];
  billingProducts: string[];
  trigger: string;
  multiplierFormula: string;
  currentGuardrail: string;
  missingGuardrail: string;
  riskTier: BillingSpikeRiskTier;
  recommendedCap: string;
  validator: string;
  emergencyDisableSwitch: string;
};

export type BillingSpikeRadarEvaluation = BillingSpikeSurfaceEntry & {
  sourceFilesPresent: string[];
  sourceFilesMissing: string[];
  sourcePatternFindings: BillingSpikeSourcePatternFinding[];
  computedTier: BillingSpikeRiskTier;
  riskTierMatches: boolean;
  tierFinding: BillingSpikeTierFinding | null;
  hasOwner: boolean;
  hasRecommendedCap: boolean;
  hasEmergencySwitch: boolean;
  riskScore: number;
  status: "pass" | "warning" | "fail";
};

export type BillingSpikeRadarReport = {
  generatedAt: string;
  status: "pass" | "warning" | "fail";
  overallRiskScore: number;
  topSpikeRisks: BillingSpikeRadarEvaluation[];
  surfaces: BillingSpikeRadarEvaluation[];
  criticalBlockers: string[];
  warnings: string[];
  watchlist: string[];
  requiredCommands: string[];
  forbiddenCommands: string[];
  summary: string;
};

export const BILLING_SPIKE_RADAR_REPORT_PATH = "agent/state/billing-spike-radar.generated.json";
export const BILLING_SPIKE_RADAR_DOC_PATH = "docs/agent-truth/billing-spike-radar.md";

export const BILLING_SPIKE_REQUIRED_COMMANDS = [
  "npm run score:billing-spikes",
  "npm run check:billing-spikes",
  "npm run typecheck",
] as const;

export const BILLING_SPIKE_FORBIDDEN_COMMANDS = [
  "playwright",
  "lighthouse",
  "cypress",
  "npm run check",
  "firebase deploy",
  "gcloud",
] as const;

export const BILLING_SPIKE_SURFACES: BillingSpikeSurfaceEntry[] = [
  {
    surface: "firestore_realtime_listeners",
    owner: "admin-analytics/server-truth",
    sourceFiles: ["src/lib/server/admin-overview-users.ts", "src/app/api/admin/**", "src/app/admin/**"],
    billingProducts: ["Firestore document reads", "App Hosting/Cloud Run requests"],
    trigger: "High-frequency live listeners bound to broad collections or admin totals.",
    multiplierFormula: "risk = activeListeners * averageDocsPerSnapshot * reconnectRate * updateRate",
    currentGuardrail: "Admin business totals are snapshot/hot-cache oriented, not pure realtime.",
    missingGuardrail: "Listener budget and reconnect budget evidence by route.",
    riskTier: "high",
    recommendedCap: "No realtime listener for canonical admin business totals; prefer snapshot refresh >= 30s.",
    validator: "check:admin-analytics-no-pure-realtime",
    emergencyDisableSwitch: "Disable admin realtime mode and force snapshot lane.",
  },
  {
    surface: "firestore_rules_dependent_reads",
    owner: "security/cost",
    sourceFiles: ["firestore.rules", "src/lib/server/request-guard.ts", "src/lib/server/security-hardening-contract.ts"],
    billingProducts: ["Firestore rules evaluation reads"],
    trigger: "Rules that require dependent document reads on high-frequency client paths.",
    multiplierFormula: "risk = requestsPerMinute * dependentReadsPerRequest * hotPathFrequency",
    currentGuardrail: "Server truth routes and guarded access contracts are available.",
    missingGuardrail: "Per-route documentation for dependent-read rules in high-frequency paths.",
    riskTier: "review",
    recommendedCap: "Dependent reads on hot client paths must be documented and minimized to <=1.",
    validator: "check:speed-security",
    emergencyDisableSwitch: "Route through server gate with cached authorization assertions.",
  },
  {
    surface: "firestore_offset_pagination",
    owner: "server-data-access",
    sourceFiles: ["src/lib/server/**", "src/app/api/**"],
    billingProducts: ["Firestore read amplification"],
    trigger: "Offset pagination on growing collections.",
    multiplierFormula: "risk = pageDepth * offsetSkippedDocs * queryFrequency",
    currentGuardrail: "Cursor-based patterns exist in canonical materializers and admin routes.",
    missingGuardrail: "Explicit block on offset() usage in production paths.",
    riskTier: "critical",
    recommendedCap: "Use cursor pagination only; forbid offset pagination in growing collections.",
    validator: "check:4xx-cost",
    emergencyDisableSwitch: "Disable deep paging endpoint and require cursor token.",
  },
  {
    surface: "firestore_unbounded_collection_reads",
    owner: "analytics/materializers",
    sourceFiles: ["functions/src/**", "scripts/rebuild-analytics-truth.ts", "scripts/rebuild-behavioral-intelligence.ts"],
    billingProducts: ["Firestore reads", "Cloud Functions/Run compute"],
    trigger: "Collection scans without max rows/runtime/cursor.",
    multiplierFormula: "risk = usersScanned * docsReadPerUser * runsPerDay",
    currentGuardrail: "Materializer scripts include bounded runtime flags and limits.",
    missingGuardrail: "Hard fail on unbounded scan detection in all materializer entrypoints.",
    riskTier: "critical",
    recommendedCap: "Require maxRows, maxRuntimeMs, cursor resume, and dry-run before mutation.",
    validator: "check:global-cost",
    emergencyDisableSwitch: "Pause scheduled materializers and enforce dry-run-only mode.",
  },
  {
    surface: "cloud_logging_debug_evidence_volume",
    owner: "debug-control-tower",
    sourceFiles: ["src/lib/server/debug-evidence-store.ts", "src/lib/server/route-diagnostics.ts", "src/lib/server/server-diagnostics.ts"],
    billingProducts: ["Cloud Logging ingestion", "Firestore debug evidence writes"],
    trigger: "High-frequency logs/evidence events without dedupe.",
    multiplierFormula: "risk = eventsPerMinute * avgLogBytes * dedupeMissRate",
    currentGuardrail: "Fingerprint dedupe and suppressed write counts are present.",
    missingGuardrail: "Global route class budgeting for all noisy 4xx families.",
    riskTier: "high",
    recommendedCap: "Deduped/sampled logs only on repeated fingerprints with payload redaction.",
    validator: "check:debug-evidence-pipeline",
    emergencyDisableSwitch: "Set debug evidence write mode to dedupe-only summary.",
  },
  {
    surface: "four_xx_logging_volume",
    owner: "speed-security",
    sourceFiles: ["src/lib/server/route-4xx-dedupe.ts", "src/lib/server/route-4xx-classifier.ts", "src/lib/server/cheap-4xx-response.ts"],
    billingProducts: ["Cloud Logging", "Cloud Run compute"],
    trigger: "Repeated bot/stale/unauthorized requests logged as unique events.",
    multiplierFormula: "risk = eventsPerMinute * avgLogBytes * dedupeMissRate",
    currentGuardrail: "4xx classifier + dedupe contract exists.",
    missingGuardrail: "Consistent adoption in all high-volume API lanes.",
    riskTier: "high",
    recommendedCap: "Deduped/sampled 4xx logging with typed small responses and no payload logging.",
    validator: "check:4xx-cost",
    emergencyDisableSwitch: "Route all noisy 4xx classes through logPolicy:none/sampled.",
  },
  {
    surface: "app_hosting_uncached_bandwidth",
    owner: "platform-runtime",
    sourceFiles: ["next.config.ts", "firebase.json", "src/app/not-found.tsx"],
    billingProducts: ["App Hosting egress bandwidth", "Cloud CDN/cache miss bandwidth"],
    trigger: "Uncached static and dynamic responses with large payloads.",
    multiplierFormula: "risk = requestsPerMinute * avgResponseBytes * uncachedRate",
    currentGuardrail: "Route-specific cache modes exist and 4xx cost lane includes safe caching.",
    missingGuardrail: "Route-level cache policy inventory for top payload producers.",
    riskTier: "review",
    recommendedCap: "Cache safe static 404/asset responses and cap response body sizes.",
    validator: "check:4xx-cost",
    emergencyDisableSwitch: "Force conservative cache headers for safe static/public error routes.",
  },
  {
    surface: "cloud_run_dynamic_route_requests",
    owner: "server-runtime",
    sourceFiles: ["src/app/api/**", "src/lib/server/request-guard.ts", "src/lib/server/rate-limit.ts"],
    billingProducts: ["Cloud Run request count"],
    trigger: "Unbounded dynamic API traffic without early cheap reject.",
    multiplierFormula: "risk = requestsPerMinute * avgRouteCostUnits * unauthRejectMissRate",
    currentGuardrail: "Request guard ordering and typed 4xx route contracts.",
    missingGuardrail: "Complete route-level request class budgets.",
    riskTier: "review",
    recommendedCap: "Pre-auth/method/body reject before expensive reads and strict rate limits on hot routes.",
    validator: "check:speed-security",
    emergencyDisableSwitch: "Enable stricter global rate-limit profile for dynamic APIs.",
  },
  {
    surface: "cloud_run_slow_route_cpu_memory",
    owner: "server-runtime",
    sourceFiles: ["src/lib/server/route-runtime-health.ts", "src/lib/server/route-diagnostics.ts", "src/app/api/**"],
    billingProducts: ["Cloud Run CPU", "Cloud Run memory"],
    trigger: "Slow routes perform expensive logic prior to cheap validation.",
    multiplierFormula: "risk = slowRequestsPerMinute * avgCpuMs * avgMemMb",
    currentGuardrail: "Route runtime health diagnostics and security hardening contracts.",
    missingGuardrail: "Per-route p95 budget thresholds and auto-escalation tags.",
    riskTier: "review",
    recommendedCap: "Declare route runtime budgets and fail lanes when p95 exceeds threshold.",
    validator: "check:speed-security",
    emergencyDisableSwitch: "Switch heavy routes to maintenance-mode typed reject until budget restored.",
  },
  {
    surface: "cloud_build_deploy_churn",
    owner: "repo-governance",
    sourceFiles: [".github/workflows/**", "firebase.json", "package.json"],
    billingProducts: ["Cloud Build minutes", "App Hosting build minutes"],
    trigger: "Frequent deploy-triggering commits and looped release automation.",
    multiplierFormula: "risk = commitsPerDay * buildMinutesPerDeploy * deployTriggeredRate",
    currentGuardrail: "Default lanes avoid broad checks/deploy commands.",
    missingGuardrail: "Generated-only change skip guard across all deploy workflows.",
    riskTier: "high",
    recommendedCap: "Deploy gates should ignore generated-only churn and throttle release loops.",
    validator: "check:release-notes",
    emergencyDisableSwitch: "Pause auto-deploy workflows and require manual promotion.",
  },
  {
    surface: "artifact_registry_image_retention",
    owner: "repo-governance",
    sourceFiles: [".github/workflows/**", "firebase.json", "docs/agent-truth/cloudrun-sql-bigquery-guardrails.md"],
    billingProducts: ["Artifact Registry storage"],
    trigger: "Unbounded build image retention.",
    multiplierFormula: "risk = imagesPerDay * avgImageSizeGb * retentionDays",
    currentGuardrail: "No default publish flow in agent lanes.",
    missingGuardrail: "Repository-level retention policy evidence in code/docs.",
    riskTier: "watch",
    recommendedCap: "Retention policy <= 30 days for non-release images.",
    validator: "check:cloud-cost",
    emergencyDisableSwitch: "Stop image publishing for non-release branches.",
  },
  {
    surface: "secret_manager_access_churn",
    owner: "security/platform",
    sourceFiles: [".github/workflows/**", "src/lib/server/auth.ts", "docs/agent-truth/speed-security-hardening.md"],
    billingProducts: ["Secret Manager access operations"],
    trigger: "High-frequency secret fetch/version churn.",
    multiplierFormula: "risk = secretReadsPerMinute * versionsTouchedPerDay * rotateFrequency",
    currentGuardrail: "Cloud auth readiness and hardening lanes exist.",
    missingGuardrail: "Secret read caching guidance by runtime path.",
    riskTier: "watch",
    recommendedCap: "Cache secret material per process/runtime window and avoid per-request fetch.",
    validator: "check:codex-auth-readiness",
    emergencyDisableSwitch: "Freeze secret rotation jobs except security emergency windows.",
  },
  {
    surface: "storage_media_egress",
    owner: "content-protection",
    sourceFiles: ["src/app/api/drops/content/route.ts", "storage.rules", "src/lib/server/global-cost-surface-contract.ts"],
    billingProducts: ["Cloud Storage egress bandwidth"],
    trigger: "High media views with uncached/proxied delivery.",
    multiplierFormula: "risk = viewsPerMinute * avgMediaBytes * uncachedRate",
    currentGuardrail: "Entitlement, host allowlist, private/no-store safeguards on protected media.",
    missingGuardrail: "Per-surface egress budget with watchlist thresholds.",
    riskTier: "high",
    recommendedCap: "Byte caps per request and controlled cache policy by media class.",
    validator: "check:content-protection",
    emergencyDisableSwitch: "Temporarily disable high-egress media variants or enforce lower-resolution fallback.",
  },
  {
    surface: "storage_upload_retries",
    owner: "admin-cms",
    sourceFiles: ["src/lib/uploads/asset-upload-queue.ts", "src/components/Admin/AssetUploader.tsx", "src/lib/uploads/asset-upload-draft-contract.ts"],
    billingProducts: ["Cloud Storage upload bandwidth", "Cloud Run upload proxy compute"],
    trigger: "Retry loops or unstable batch queue causing repeated uploads.",
    multiplierFormula: "risk = filesPerBatch * avgFileBytes * retryCount",
    currentGuardrail: "Batch upload stability lock and queue retry controls.",
    missingGuardrail: "Global retry budget telemetry alerting by upload session.",
    riskTier: "high",
    recommendedCap: "Bound retries <= 3 and preserve durable queue state with explicit user retry action.",
    validator: "check:batch-upload-stability",
    emergencyDisableSwitch: "Disable auto-retry and force manual retry only.",
  },
  {
    surface: "image_optimization_variants",
    owner: "image-policy",
    sourceFiles: ["next.config.ts", "src/lib/image-loading-policy.ts", "src/components/**"],
    billingProducts: ["Image transformation/egress bandwidth"],
    trigger: "Excessive variant generation across breakpoints/sizes.",
    multiplierFormula: "risk = imageRequestsPerMinute * variantsPerAsset * avgVariantBytes",
    currentGuardrail: "Sitewide image policy and surface-based eager/lazy rules.",
    missingGuardrail: "Hard cap on allowed variant counts per asset class.",
    riskTier: "watch",
    recommendedCap: "Limit responsive widths to approved sets and avoid duplicate variant ladders.",
    validator: "check:sitewide-image-optimization",
    emergencyDisableSwitch: "Reduce generated image sizes to minimal approved set.",
  },
  {
    surface: "analytics_guest_ingest_volume",
    owner: "analytics",
    sourceFiles: ["src/app/api/analytics/ingest/route.ts", "src/lib/telemetry.ts", "src/components/Analytics/DeepTracker.tsx"],
    billingProducts: ["Firestore writes", "Cloud Run requests", "Cloud Logging"],
    trigger: "High guest session volume with noisy event streams.",
    multiplierFormula: "risk = sessionsPerMinute * eventsPerSession * writesPerEvent",
    currentGuardrail: "First-party event budgets and diagnostic-only event demotion.",
    missingGuardrail: "Per-event family hard caps surfaced in debug control tower.",
    riskTier: "review",
    recommendedCap: "Budget guest events/session and summarize diagnostic noise when capped.",
    validator: "check:guest-user-analytics",
    emergencyDisableSwitch: "Drop diagnostic-only guest events when budget exceeded.",
  },
  {
    surface: "analytics_identified_ingest_volume",
    owner: "analytics",
    sourceFiles: ["src/app/api/analytics/ingest-identified/route.ts", "src/lib/telemetry-catalog.ts", "src/lib/server/analytics-governance.ts"],
    billingProducts: ["Firestore writes", "Cloud Run requests"],
    trigger: "High identified event write fanout.",
    multiplierFormula: "risk = sessionsPerMinute * eventsPerSession * writesPerEvent",
    currentGuardrail: "Canonical timeline and governance lanes for identified events.",
    missingGuardrail: "High-frequency event checkpoint enforcement in every identified path.",
    riskTier: "review",
    recommendedCap: "Gate high-frequency identified events with per-session budgets and dedupe keys.",
    validator: "check:user-tracking-index-cutover",
    emergencyDisableSwitch: "Disable non-critical identified event families behind telemetry feature switch.",
  },
  {
    surface: "watch_session_tick_volume",
    owner: "watch-time",
    sourceFiles: ["src/hooks/useViewerWatchSession.ts", "src/app/dashboard/viewer/adapters/ViewerTelemetryAdapter.ts", "docs/agent-truth/runtime-watch-time-v2.md"],
    billingProducts: ["Firestore writes", "Analytics ingest writes"],
    trigger: "Tick interval too frequent or uncapped flush behavior.",
    multiplierFormula: "risk = activeWatchSessions * ticksPerMinute * writesPerTick",
    currentGuardrail: "5-second minimum visible tick policy and rollup-first doctrine.",
    missingGuardrail: "Automated cap check in every watch telemetry path.",
    riskTier: "watch",
    recommendedCap: "Ticks >= 5s; no 1s writes; flush summaries instead of per-second events.",
    validator: "check:watch-time-truth-v2",
    emergencyDisableSwitch: "Disable continuous tick events and keep end-of-session rollups only.",
  },
  {
    surface: "daily_task_reset_materializer_loops",
    owner: "tasks/runtime",
    sourceFiles: ["src/lib/server/daily-task-runtime.ts", "src/lib/tasks/daily-task-assignment-engine.ts", "scripts/agent/validate-daily-task-engine-rewrite.ts"],
    billingProducts: ["Firestore reads/writes", "Cloud Run/Functions compute"],
    trigger: "Malformed window/reset logic causing repeat rewrites.",
    multiplierFormula: "risk = usersScanned * docsReadPerUser * runsPerDay",
    currentGuardrail: "Daily task rewrite lane blocks early rotation and unstable resets.",
    missingGuardrail: "Loop-break counters exposed for scheduler monitoring.",
    riskTier: "review",
    recommendedCap: "One assignment set per active window; bounded repair passes only.",
    validator: "check:daily-task-engine-rewrite",
    emergencyDisableSwitch: "Pause scheduled task repair/materializer runs.",
  },
  {
    surface: "notification_fanout_retry_storms",
    owner: "notifications",
    sourceFiles: ["src/lib/server/fcm-utils.ts", "src/app/api/notifications/route.ts", "src/lib/server/notification-runtime.ts"],
    billingProducts: ["FCM operations", "Firestore writes", "Cloud Run compute"],
    trigger: "Broadcast/retry loops without strict dedupe caps.",
    multiplierFormula: "risk = recipients * writesPerRecipient * retryMultiplier",
    currentGuardrail: "Fanout limits, idempotency, and duplicate prevention counters.",
    missingGuardrail: "Global storm circuit breaker for cascading retries.",
    riskTier: "high",
    recommendedCap: "Bound recipients/batches/retries and enforce idempotency keys.",
    validator: "check:notification-quality",
    emergencyDisableSwitch: "Force retryMultiplier=1 and pause non-critical fanout lanes.",
  },
  {
    surface: "creator_broadcast_fanout",
    owner: "creator-dashboard",
    sourceFiles: [
      "src/app/api/creator/broadcasts/route.ts",
      "src/components/Creators/CreatorBroadcastManager.tsx",
      "src/lib/creator/broadcasts/broadcast-contract.ts",
      "src/lib/notifications/creator-broadcast-notifications.ts",
    ],
    billingProducts: ["Firestore writes", "FCM fanout", "Cloud Run compute"],
    trigger: "Large follower sends with limited dedupe/batch controls.",
    multiplierFormula: "risk = recipients * writesPerRecipient * retryMultiplier",
    currentGuardrail: "Creator broadcast manager is real/server-backed with status tracking.",
    missingGuardrail: "Explicit recipient cap and retry budget by broadcast.",
    riskTier: "high",
    recommendedCap: "Use bounded batches, per-broadcast idempotency, and retry caps <= 2.",
    validator: "check:settings-creator-dashboard-split",
    emergencyDisableSwitch: "Disable broadcast send action and allow draft-only mode.",
  },
  {
    surface: "admin_snapshot_refresh_cadence",
    owner: "admin-analytics",
    sourceFiles: ["src/app/admin/users/page.tsx", "src/lib/server/admin-overview-users.ts", "src/lib/server/analytics-metrics.ts"],
    billingProducts: ["Firestore reads", "Cloud Run requests"],
    trigger: "Over-frequent admin refresh loops across heavy snapshots.",
    multiplierFormula: "risk = adminsActive * refreshesPerMinute * docsPerSnapshot",
    currentGuardrail: "Snapshot/hot-cache doctrine replacing pure realtime totals.",
    missingGuardrail: "Unified refresh cadence cap across admin overview/detail surfaces.",
    riskTier: "review",
    recommendedCap: "Admin refresh cadence >= 30s for heavy totals unless manual refresh.",
    validator: "check:admin-analytics-hot-cache",
    emergencyDisableSwitch: "Force cached snapshot mode with manual refresh button only.",
  },
  {
    surface: "behavioral_rebuild_jobs",
    owner: "analytics/materializers",
    sourceFiles: ["scripts/rebuild-behavioral-intelligence.ts", "scripts/rebuild-analytics-truth.ts", "functions/src/behavioral-intelligence-runtime.ts"],
    billingProducts: ["Firestore reads/writes", "Cloud Functions/Run compute"],
    trigger: "Frequent or unbounded behavioral rebuild executions.",
    multiplierFormula: "risk = usersScanned * docsReadPerUser * runsPerDay",
    currentGuardrail: "Max rows/runtime and dry-run flags are in place.",
    missingGuardrail: "Rebuild run budget dashboard + cooldown enforcement.",
    riskTier: "high",
    recommendedCap: "Bounded windows, max users/rows/runtime, and no every-request rebuilds.",
    validator: "check:guest-user-analytics",
    emergencyDisableSwitch: "Disable scheduled rebuild triggers and allow manual dry-run only.",
  },
  {
    surface: "import_export_bigquery_dataconnect_sync_jobs",
    owner: "cloud-cost",
    sourceFiles: ["scripts/agent/sync-sql.ts", "dataconnect/dataconnect.yaml", "docs/agent-truth/cloudrun-sql-bigquery-guardrails.md"],
    billingProducts: ["Cloud SQL", "Data Connect", "BigQuery jobs", "Firestore import/export operations"],
    trigger: "Sync/import/export jobs that can mutate runtime truth without idempotency.",
    multiplierFormula: "risk = jobsPerDay * rowsPerJob * mutationRate",
    currentGuardrail: "Sidecar-only doctrine for SQL/Data Connect mirror unless explicitly promoted.",
    missingGuardrail: "Central idempotency registry for all import/export mutation jobs.",
    riskTier: "critical",
    recommendedCap: "Dry-run default, cursor limits, idempotency keys, and explicit approval for mutations.",
    validator: "check:cloud-cost",
    emergencyDisableSwitch: "Set import/export routes to read-only and pause mutation jobs.",
  },
  {
    surface: "release_note_version_update_loops",
    owner: "release-governance",
    sourceFiles: ["scripts/release/update-public-changelog.ts", "src/lib/release-notes/release-version-contract.ts", ".github/workflows/**"],
    billingProducts: ["Cloud Build minutes", "App Hosting deploy cycles"],
    trigger: "Release note/version automation repeatedly triggering new builds.",
    multiplierFormula: "risk = commitsPerDay * buildMinutesPerDeploy * deployTriggeredRate",
    currentGuardrail: "Release notes doctrine + generated artifact exclusions.",
    missingGuardrail: "Global deploy-skip rule for generated-only/public-note churn commits.",
    riskTier: "high",
    recommendedCap: "Prevent release-note/deploy loops; generated-only commits should not auto-deploy.",
    validator: "check:release-notes",
    emergencyDisableSwitch: "Pause release automation workflow and require manual acceptance.",
  },
];
