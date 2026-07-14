export type GlobalCostSurfaceId =
  | "telemetry_event_volume"
  | "posthog_event_volume"
  | "ga_event_volume"
  | "session_replay_future"
  | "cloud_logging_volume"
  | "debug_evidence_volume"
  | "firebase_storage_egress"
  | "media_signed_url_access"
  | "image_optimization"
  | "firebase_auth_abuse"
  | "phone_auth_sms_future"
  | "fcm_notification_fanout"
  | "cloud_build_minutes"
  | "app_hosting_bandwidth"
  | "artifact_registry_storage"
  | "visual_snapshot_testing"
  | "browser_audit_tooling"
  | "scheduled_rebuild_jobs"
  | "analytics_materializers"
  | "dependency_tooling"
  | "admin_export_import_jobs";

export type GlobalCostRisk = "low" | "medium" | "high" | "critical";

export type GlobalCostScoreBucket =
  | "telemetryEventVolume"
  | "loggingDebugEvidence"
  | "mediaStorageImage"
  | "authNotificationAbuse"
  | "ciBuildTestTooling"
  | "rebuildMaterializersImportExport"
  | "thirdPartyAnalyticsTooling";

export type GlobalCostSurfaceContract = {
  surface: GlobalCostSurfaceId;
  owner: string;
  sourceFiles: string[];
  costRisk: GlobalCostRisk;
  defaultAllowedInCI: boolean;
  defaultAllowedOnPageLoad: boolean;
  maxEventsPerUserPerMinute: number | null;
  maxEventsPerSession: number | null;
  maxBytesPerRequest: number | null;
  maxRowsPerRun: number | null;
  maxRuntimeMs: number | null;
  maxRetries: number;
  cachePolicy: string;
  samplingPolicy: string;
  requiredRateLimit: string;
  requiredDebugEvidence: string;
  requiredKillSwitch: string;
  validator: string;
};

export type GlobalCostFindingSeverity = "info" | "minor" | "moderate" | "major" | "critical";

export type GlobalCostFinding = {
  id: string;
  surface: GlobalCostSurfaceId;
  severity: GlobalCostFindingSeverity;
  bucket: GlobalCostScoreBucket;
  title: string;
  filePath: string;
  evidence: string[];
  expectedRule: string;
  actualPattern: string;
  scoreImpact: number;
  suggestedFix: string;
};

export type GlobalCostSurfaceEvaluation = GlobalCostSurfaceContract & {
  bucket: GlobalCostScoreBucket;
  sourceFilesPresent: string[];
  sourceFilesMissing: string[];
  hasOwner: boolean;
  hasLimits: boolean;
  hasRatePolicy: boolean;
  hasDebugEvidencePolicy: boolean;
  hasKillSwitchPolicy: boolean;
  status: "pass" | "warning" | "fail";
};

export type GlobalCostSurfaceReport = {
  generatedAt: string;
  overallScore: number;
  status: "clean" | "pass" | "warning" | "fail";
  bucketScores: Record<GlobalCostScoreBucket, number>;
  bucketWeights: Record<GlobalCostScoreBucket, number>;
  surfaces: GlobalCostSurfaceEvaluation[];
  findings: GlobalCostFinding[];
  criticalFindings: GlobalCostFinding[];
  hardLimits: string[];
  minimalVerificationCommands: string[];
  forbiddenCommands: string[];
  summary: string;
};

export const GLOBAL_COST_REPORT_PATH = "agent/state/global-cost-surfaces.generated.json";
export const GLOBAL_COST_DOC_PATH = "docs/agent-truth/global-cost-surfaces.md";

export const GLOBAL_COST_BUCKET_WEIGHTS: Record<GlobalCostScoreBucket, number> = {
  telemetryEventVolume: 20,
  loggingDebugEvidence: 15,
  mediaStorageImage: 15,
  authNotificationAbuse: 15,
  ciBuildTestTooling: 15,
  rebuildMaterializersImportExport: 15,
  thirdPartyAnalyticsTooling: 5,
};

export const GLOBAL_COST_SURFACE_BUCKETS: Record<GlobalCostSurfaceId, GlobalCostScoreBucket> = {
  telemetry_event_volume: "telemetryEventVolume",
  posthog_event_volume: "thirdPartyAnalyticsTooling",
  ga_event_volume: "telemetryEventVolume",
  session_replay_future: "thirdPartyAnalyticsTooling",
  cloud_logging_volume: "loggingDebugEvidence",
  debug_evidence_volume: "loggingDebugEvidence",
  firebase_storage_egress: "mediaStorageImage",
  media_signed_url_access: "mediaStorageImage",
  image_optimization: "mediaStorageImage",
  firebase_auth_abuse: "authNotificationAbuse",
  phone_auth_sms_future: "authNotificationAbuse",
  fcm_notification_fanout: "authNotificationAbuse",
  cloud_build_minutes: "ciBuildTestTooling",
  app_hosting_bandwidth: "ciBuildTestTooling",
  artifact_registry_storage: "ciBuildTestTooling",
  visual_snapshot_testing: "ciBuildTestTooling",
  browser_audit_tooling: "ciBuildTestTooling",
  scheduled_rebuild_jobs: "rebuildMaterializersImportExport",
  analytics_materializers: "rebuildMaterializersImportExport",
  dependency_tooling: "thirdPartyAnalyticsTooling",
  admin_export_import_jobs: "rebuildMaterializersImportExport",
};

export const GLOBAL_COST_FORBIDDEN_DEFAULT_COMMANDS = [
  "playwright",
  "cypress",
  "lighthouse",
  "npm run check",
  "npm run check:ui:audits",
  "npm run check:ui:lighthouse",
  "firebase deploy",
  "gcloud",
  "paid AI calls",
  "visual snapshot tests without explicit budget",
] as const;

export const GLOBAL_COST_MINIMAL_COMMANDS = [
  "npm run score:global-cost",
  "npm run check:global-cost",
  "npm run typecheck",
] as const;

export const GLOBAL_COST_HARD_LIMITS = [
  "No 1s watch/session telemetry ticks; visible ticks must be 5s or slower and flush at end/visibility hidden.",
  "Debug evidence dedupes by fingerprint and caps event document writes per fingerprint per hour while rolling up repeats.",
  "Cloud/server logging redacts sensitive fields, caps detail previews, and avoids full request/response payloads.",
  "Media and signed-url routes require entitlement, MEDIA_PROXY-style rate policy, no-store/private cache, TTL or proxy policy, and no raw asset URL telemetry.",
  "Auth/signup/login/reset surfaces require trusted-origin and abuse/rate policies; future phone auth requires an SMS budget guard.",
  "Notification fan-out requires idempotency, batch caps, recipient caps, retry caps, and duplicate prevention.",
  "Browser audits and visual snapshots are default-off in CI unless explicitly requested with a budget.",
  "Rebuild/materializer/import/export jobs require dry-run, maxRows, maxRuntimeMs, bounded retries, and cost estimates before mutation.",
  "PostHog/GA/session replay use route/session budgets; session replay remains disabled unless explicitly enabled with a budget.",
] as const;

export const GLOBAL_COST_SURFACE_CONTRACTS: GlobalCostSurfaceContract[] = [
  {
    surface: "telemetry_event_volume",
    owner: "analytics/telemetry",
    sourceFiles: [
      "src/lib/telemetry.ts",
      "src/components/Analytics/DeepTracker.tsx",
      "src/app/api/analytics/ingest/route.ts",
      "src/app/api/analytics/ingest-identified/route.ts",
      "src/hooks/useViewerWatchSession.ts",
    ],
    costRisk: "high",
    defaultAllowedInCI: true,
    defaultAllowedOnPageLoad: true,
    maxEventsPerUserPerMinute: 30,
    maxEventsPerSession: 300,
    maxBytesPerRequest: 128 * 1024,
    maxRowsPerRun: null,
    maxRuntimeMs: 10_000,
    maxRetries: 1,
    cachePolicy: "analytics ingest is force-dynamic/no-store; client batches in memory and flushes on schedule/end.",
    samplingPolicy: "High-frequency interactions are batched; watch ticks are 5s minimum; semantic page summaries flush on exit.",
    requiredRateLimit: "ANALYTICS_WRITE",
    requiredDebugEvidence: "recordClientDiagnostic, recordServerDiagnostic, analytics pipeline failure rollups",
    requiredKillSwitch: "privacy consent gates anonymous and identified analytics before dispatch.",
    validator: "check:global-cost",
  },
  {
    surface: "posthog_event_volume",
    owner: "analytics/telemetry",
    sourceFiles: [
      "package.json",
      "src/lib/telemetry.ts",
      "src/components/Analytics/DeepTracker.tsx",
    ],
    costRisk: "medium",
    defaultAllowedInCI: false,
    defaultAllowedOnPageLoad: false,
    maxEventsPerUserPerMinute: 20,
    maxEventsPerSession: 200,
    maxBytesPerRequest: 64 * 1024,
    maxRowsPerRun: null,
    maxRuntimeMs: 5_000,
    maxRetries: 0,
    cachePolicy: "third-party analytics is client-only and consent-gated; no backend replay of PostHog payloads.",
    samplingPolicy: "High-frequency events must be sampled or routed through canonical backend rollups.",
    requiredRateLimit: "client session budget plus privacy-consent gate",
    requiredDebugEvidence: "debug evidence only for failed integration wiring, not per-event logs",
    requiredKillSwitch: "analytics provider env/feature flag must be absent-safe.",
    validator: "check:global-cost",
  },
  {
    surface: "ga_event_volume",
    owner: "analytics/telemetry",
    sourceFiles: [
      "src/lib/telemetry.ts",
      "src/components/Analytics/DeepTracker.tsx",
      "src/app/api/admin/analytics/**",
    ],
    costRisk: "medium",
    defaultAllowedInCI: false,
    defaultAllowedOnPageLoad: true,
    maxEventsPerUserPerMinute: 20,
    maxEventsPerSession: 200,
    maxBytesPerRequest: 64 * 1024,
    maxRowsPerRun: null,
    maxRuntimeMs: 5_000,
    maxRetries: 0,
    cachePolicy: "GA admin reads must use hot-cache/snapshot routes when quota-bearing.",
    samplingPolicy: "Only canonical semantic events and funnel milestones go to GA; dense interactions stay batched first-party context.",
    requiredRateLimit: "GA Data API admin routes require admin analytics rate policies.",
    requiredDebugEvidence: "quota/failure evidence rolls into analytics pipeline health.",
    requiredKillSwitch: "GA measurement id absence disables dispatch.",
    validator: "check:global-cost",
  },
  {
    surface: "session_replay_future",
    owner: "analytics/privacy",
    sourceFiles: [
      "package.json",
      "src/lib/privacy-consent.ts",
      "src/lib/telemetry.ts",
    ],
    costRisk: "critical",
    defaultAllowedInCI: false,
    defaultAllowedOnPageLoad: false,
    maxEventsPerUserPerMinute: 0,
    maxEventsPerSession: 0,
    maxBytesPerRequest: 0,
    maxRowsPerRun: null,
    maxRuntimeMs: 0,
    maxRetries: 0,
    cachePolicy: "disabled until a separate replay budget and privacy contract exists.",
    samplingPolicy: "0% by default.",
    requiredRateLimit: "not allowed until explicit replay budget guard exists",
    requiredDebugEvidence: "activation must emit admin-visible budget evidence.",
    requiredKillSwitch: "hard disabled by default; feature flag must be explicit.",
    validator: "check:global-cost",
  },
  {
    surface: "cloud_logging_volume",
    owner: "speed/security/cost",
    sourceFiles: [
      "src/lib/server/server-diagnostics.ts",
      "src/lib/server/route-diagnostics.ts",
      "src/lib/server/route-runtime-health.ts",
      "functions/src/**",
    ],
    costRisk: "high",
    defaultAllowedInCI: true,
    defaultAllowedOnPageLoad: false,
    maxEventsPerUserPerMinute: 10,
    maxEventsPerSession: 100,
    maxBytesPerRequest: 16 * 1024,
    maxRowsPerRun: null,
    maxRuntimeMs: 5_000,
    maxRetries: 0,
    cachePolicy: "diagnostic writes are append/rollup only and never cached into public payloads.",
    samplingPolicy: "Warnings/errors only; detail is capped to 20 fields and 500 chars per field.",
    requiredRateLimit: "route-level guardApiRequest where diagnostics are user-triggerable",
    requiredDebugEvidence: "recordRouteDiagnostic mirrors sanitized debug evidence for actionable route failures.",
    requiredKillSwitch: "diagnostic write failures are swallowed and must not block user flows.",
    validator: "check:global-cost",
  },
  {
    surface: "debug_evidence_volume",
    owner: "admin-debug",
    sourceFiles: [
      "src/lib/server/debug-evidence-store.ts",
      "src/lib/debug-evidence-contract.ts",
      "src/app/api/debug/evidence/route.ts",
    ],
    costRisk: "high",
    defaultAllowedInCI: true,
    defaultAllowedOnPageLoad: false,
    maxEventsPerUserPerMinute: 10,
    maxEventsPerSession: 60,
    maxBytesPerRequest: 32 * 1024,
    maxRowsPerRun: null,
    maxRuntimeMs: 5_000,
    maxRetries: 0,
    cachePolicy: "rollup by fingerprint with bounded event document writes.",
    samplingPolicy: "same-fingerprint repeats roll up after per-hour event-write cap.",
    requiredRateLimit: "ANALYTICS_WRITE on /api/debug/evidence",
    requiredDebugEvidence: "fingerprint rollups plus redacted audit summaries",
    requiredKillSwitch: "debug evidence write failures return null and never block user flows.",
    validator: "check:global-cost",
  },
  {
    surface: "firebase_storage_egress",
    owner: "content-protection",
    sourceFiles: [
      "storage.rules",
      "src/app/api/drops/content/route.ts",
      "src/app/api/admin/content/route.ts",
      "src/app/api/creator/drops/assets/route.ts",
    ],
    costRisk: "critical",
    defaultAllowedInCI: true,
    defaultAllowedOnPageLoad: false,
    maxEventsPerUserPerMinute: null,
    maxEventsPerSession: null,
    maxBytesPerRequest: 250 * 1024 * 1024,
    maxRowsPerRun: null,
    maxRuntimeMs: 20_000,
    maxRetries: 0,
    cachePolicy: "private/no-store for protected content; static public covers use image-loading policy.",
    samplingPolicy: "track approximate access counts, not raw URLs.",
    requiredRateLimit: "MEDIA_PROXY or admin/creator equivalent rate policy",
    requiredDebugEvidence: "content-protection failures feed route diagnostics without leaking asset URLs.",
    requiredKillSwitch: "admin/content routes must stay admin-only; locked media path must fail closed.",
    validator: "check:global-cost",
  },
  {
    surface: "media_signed_url_access",
    owner: "content-protection",
    sourceFiles: [
      "src/app/api/drops/content/route.ts",
      "src/app/api/admin/creator-agreements/route.ts",
      "src/app/api/creator/onboarding/agreement-document/route.ts",
      "src/lib/media-hosts.ts",
    ],
    costRisk: "critical",
    defaultAllowedInCI: true,
    defaultAllowedOnPageLoad: false,
    maxEventsPerUserPerMinute: null,
    maxEventsPerSession: null,
    maxBytesPerRequest: 250 * 1024 * 1024,
    maxRowsPerRun: null,
    maxRuntimeMs: 20_000,
    maxRetries: 0,
    cachePolicy: "signed URL redirects require explicit expiration; proxy streams must be no-store/private.",
    samplingPolicy: "telemetry stores assetKey/fileId/mediaIndex only, never raw content URLs.",
    requiredRateLimit: "MEDIA_PROXY for viewer media and admin/user scoped guards for document URLs",
    requiredDebugEvidence: "media access failures record redacted route evidence.",
    requiredKillSwitch: "allowed media host check and entitlement check before redirect/proxy.",
    validator: "check:global-cost",
  },
  {
    surface: "image_optimization",
    owner: "image-policy",
    sourceFiles: [
      "next.config.ts",
      "next.config.js",
      "src/components/**",
      "src/app/**",
      "src/lib/image-loading-policy.ts",
    ],
    costRisk: "medium",
    defaultAllowedInCI: true,
    defaultAllowedOnPageLoad: true,
    maxEventsPerUserPerMinute: null,
    maxEventsPerSession: null,
    maxBytesPerRequest: 2 * 1024 * 1024,
    maxRowsPerRun: null,
    maxRuntimeMs: 5_000,
    maxRetries: 0,
    cachePolicy: "above-fold images are eager/preloaded sparingly; grids and below-fold assets are lazy.",
    samplingPolicy: "image diagnostics are source-level by default, not browser snapshots.",
    requiredRateLimit: "image proxy/media routes use existing route guard policies",
    requiredDebugEvidence: "image loading failures should use capped diagnostics.",
    requiredKillSwitch: "remote image domains must stay allowlisted.",
    validator: "check:global-cost",
  },
  {
    surface: "firebase_auth_abuse",
    owner: "auth/security",
    sourceFiles: [
      "src/app/api/auth/**",
      "src/app/api/user/register/route.ts",
      "src/lib/server/auth.ts",
      "src/lib/server/request-guard.ts",
      "src/lib/server/rate-limit.ts",
    ],
    costRisk: "critical",
    defaultAllowedInCI: true,
    defaultAllowedOnPageLoad: false,
    maxEventsPerUserPerMinute: 5,
    maxEventsPerSession: 30,
    maxBytesPerRequest: 32 * 1024,
    maxRowsPerRun: null,
    maxRuntimeMs: 10_000,
    maxRetries: 0,
    cachePolicy: "auth mutation routes are no-store/dynamic.",
    samplingPolicy: "fake/bot signup velocity rolls into admin review, not per-attempt noisy logs.",
    requiredRateLimit: "STRICT/STANDARD/RELAXED auth route policies with trusted origin",
    requiredDebugEvidence: "auth abuse/failure evidence is sanitized and capped.",
    requiredKillSwitch: "expected auth failures return typed safe errors without expensive retries.",
    validator: "check:global-cost",
  },
  {
    surface: "phone_auth_sms_future",
    owner: "auth/security",
    sourceFiles: [
      "src/lib/server/auth.ts",
      "src/app/api/auth/**",
      ".env.example",
      "docs/agent-truth/global-cost-surfaces.md",
    ],
    costRisk: "critical",
    defaultAllowedInCI: false,
    defaultAllowedOnPageLoad: false,
    maxEventsPerUserPerMinute: 0,
    maxEventsPerSession: 0,
    maxBytesPerRequest: 0,
    maxRowsPerRun: null,
    maxRuntimeMs: 0,
    maxRetries: 0,
    cachePolicy: "disabled until SMS budget contract exists.",
    samplingPolicy: "QA must use fictional test numbers only.",
    requiredRateLimit: "SMS budget guard plus strict per-IP/per-account abuse limit before enablement",
    requiredDebugEvidence: "SMS budget and abuse evidence must be admin-visible.",
    requiredKillSwitch: "hard feature flag disabled by default.",
    validator: "check:global-cost",
  },
  {
    surface: "fcm_notification_fanout",
    owner: "notifications",
    sourceFiles: [
      "src/lib/server/fcm-utils.ts",
      "src/app/api/notifications/route.ts",
      "src/app/api/cron/notify-active-drops/route.ts",
    ],
    costRisk: "high",
    defaultAllowedInCI: true,
    defaultAllowedOnPageLoad: false,
    maxEventsPerUserPerMinute: 5,
    maxEventsPerSession: 20,
    maxBytesPerRequest: 64 * 1024,
    maxRowsPerRun: 5_000,
    maxRuntimeMs: 60_000,
    maxRetries: 0,
    cachePolicy: "notification reads use private revalidate; writes are admin-only and idempotent.",
    samplingPolicy: "broadcasts dedupe by idempotency key and cap recipients/batches.",
    requiredRateLimit: "STANDARD/HEAVY_READ route policies plus admin guard for fan-out",
    requiredDebugEvidence: "broadcast report includes success, failure, skipped, duplicate, and invalid-token counts.",
    requiredKillSwitch: "browser push disabled per user by preference and fan-out caps stop unbounded sends.",
    validator: "check:global-cost",
  },
  {
    surface: "cloud_build_minutes",
    owner: "repo-governance",
    sourceFiles: [
      ".github/workflows/**",
      "firebase.json",
      "package.json",
    ],
    costRisk: "high",
    defaultAllowedInCI: true,
    defaultAllowedOnPageLoad: false,
    maxEventsPerUserPerMinute: null,
    maxEventsPerSession: null,
    maxBytesPerRequest: null,
    maxRowsPerRun: null,
    maxRuntimeMs: 20 * 60 * 1000,
    maxRetries: 0,
    cachePolicy: "CI uses npm cache and lightweight source checks by default.",
    samplingPolicy: "browser/full-suite jobs are default-off and explicit only.",
    requiredRateLimit: "GitHub workflow concurrency and least permissions where possible",
    requiredDebugEvidence: "CI failures are workflow artifacts, not runtime debug writes.",
    requiredKillSwitch: "heavy jobs must be workflow_dispatch or explicit command only.",
    validator: "check:global-cost",
  },
  {
    surface: "app_hosting_bandwidth",
    owner: "repo-governance",
    sourceFiles: [
      "firebase.json",
      "next.config.ts",
      "next.config.js",
      ".github/workflows/**",
    ],
    costRisk: "medium",
    defaultAllowedInCI: true,
    defaultAllowedOnPageLoad: true,
    maxEventsPerUserPerMinute: null,
    maxEventsPerSession: null,
    maxBytesPerRequest: 5 * 1024 * 1024,
    maxRowsPerRun: null,
    maxRuntimeMs: 10_000,
    maxRetries: 0,
    cachePolicy: "public stable assets cache intentionally; private/user routes stay no-store.",
    samplingPolicy: "source validators before browser traffic generation.",
    requiredRateLimit: "API routes behind hosting use route-level guards.",
    requiredDebugEvidence: "hosting bandwidth warnings stay in docs/report evidence.",
    requiredKillSwitch: "deployment commands are forbidden by default agent lane.",
    validator: "check:global-cost",
  },
  {
    surface: "artifact_registry_storage",
    owner: "repo-governance",
    sourceFiles: [
      ".github/workflows/**",
      "firebase.json",
      "package.json",
    ],
    costRisk: "medium",
    defaultAllowedInCI: true,
    defaultAllowedOnPageLoad: false,
    maxEventsPerUserPerMinute: null,
    maxEventsPerSession: null,
    maxBytesPerRequest: null,
    maxRowsPerRun: null,
    maxRuntimeMs: 20 * 60 * 1000,
    maxRetries: 0,
    cachePolicy: "build artifacts are not committed and are cleaned before completion.",
    samplingPolicy: "no automatic image/build artifact publication from validators.",
    requiredRateLimit: "workflow permissions are read-only except explicit release-note update workflow.",
    requiredDebugEvidence: "artifact cost notes live in generated reports/docs.",
    requiredKillSwitch: "deploy/publish commands are forbidden by default.",
    validator: "check:global-cost",
  },
  {
    surface: "visual_snapshot_testing",
    owner: "device-ui",
    sourceFiles: [
      "tests/ui-audits/**",
      "tests/visual.spec.ts",
      "package.json",
      ".github/workflows/**",
    ],
    costRisk: "high",
    defaultAllowedInCI: false,
    defaultAllowedOnPageLoad: false,
    maxEventsPerUserPerMinute: null,
    maxEventsPerSession: null,
    maxBytesPerRequest: null,
    maxRowsPerRun: 100,
    maxRuntimeMs: 10 * 60 * 1000,
    maxRetries: 0,
    cachePolicy: "snapshots are explicit-command only and must declare a snapshot budget.",
    samplingPolicy: "source dry audits run before visual snapshots.",
    requiredRateLimit: "command budget requires explicit user request or critical uncertainty.",
    requiredDebugEvidence: "snapshot reports are local artifacts and must not be committed unless intentional.",
    requiredKillSwitch: "forbidden in default CI and default agent verification lane.",
    validator: "check:global-cost",
  },
  {
    surface: "browser_audit_tooling",
    owner: "device-ui",
    sourceFiles: [
      "package.json",
      "scripts/run-lighthouse-audits.mjs",
      "tests/ui-audits/**",
      ".github/workflows/**",
    ],
    costRisk: "high",
    defaultAllowedInCI: false,
    defaultAllowedOnPageLoad: false,
    maxEventsPerUserPerMinute: null,
    maxEventsPerSession: null,
    maxBytesPerRequest: null,
    maxRowsPerRun: null,
    maxRuntimeMs: 15 * 60 * 1000,
    maxRetries: 0,
    cachePolicy: "browser audit artifacts are local and cleaned before completion.",
    samplingPolicy: "deterministic source validators first; browser audits only by explicit escalation.",
    requiredRateLimit: "affected audit command budget",
    requiredDebugEvidence: "browser audit failures are report artifacts, not runtime telemetry.",
    requiredKillSwitch: "not present in lightweight CI default commands.",
    validator: "check:global-cost",
  },
  {
    surface: "scheduled_rebuild_jobs",
    owner: "analytics/materializers",
    sourceFiles: [
      "functions/src/analytics-truth-schedule.ts",
      "scripts/rebuild-analytics-truth.ts",
      "scripts/rebuild-behavioral-intelligence.ts",
      "functions/src/**",
    ],
    costRisk: "high",
    defaultAllowedInCI: false,
    defaultAllowedOnPageLoad: false,
    maxEventsPerUserPerMinute: null,
    maxEventsPerSession: null,
    maxBytesPerRequest: null,
    maxRowsPerRun: 12_000,
    maxRuntimeMs: 10 * 60 * 1000,
    maxRetries: 0,
    cachePolicy: "scheduled runs use bounded source windows and status documents.",
    samplingPolicy: "hourly schedule has retryCount 0; manual wrappers expose dry-run/max rows/runtime budgets.",
    requiredRateLimit: "cron/manual execution only, no every-commit rebuild",
    requiredDebugEvidence: "status docs and logger summaries record bounded results.",
    requiredKillSwitch: "dry-run flag and maxRuntimeMs stop local/manual runs from mutating unexpectedly.",
    validator: "check:global-cost",
  },
  {
    surface: "analytics_materializers",
    owner: "analytics/materializers",
    sourceFiles: [
      "functions/src/analytics-truth-contract.ts",
      "functions/src/analytics-truth-runtime.ts",
      "functions/src/behavioral-intelligence-runtime.ts",
      "functions/src/user-index-materializer-schedule.ts",
      "src/app/api/internal/analytics/materialize-user-index/route.ts",
      "src/lib/server/behavioral-timeline-writer.ts",
      "src/lib/server/user-index-materializer.ts",
      "src/lib/server/user-index-writer.ts",
      "scripts/rebuild-analytics-truth.ts",
      "scripts/rebuild-behavioral-intelligence.ts",
    ],
    costRisk: "high",
    defaultAllowedInCI: false,
    defaultAllowedOnPageLoad: false,
    maxEventsPerUserPerMinute: null,
    maxEventsPerSession: null,
    maxBytesPerRequest: null,
    maxRowsPerRun: 1_000,
    maxRuntimeMs: 10 * 60 * 1000,
    maxRetries: 0,
    cachePolicy: "materialized analytics snapshots are bounded by max event/watch/guest/feedback limits; the user-index consumer is no-store and lease-idempotent.",
    samplingPolicy: "materializers process recent bounded windows and write capped user/drop/session docs; user indexes cap each run at 5 subjects and 200 facts per subject, with lineage queries capped at 50 records.",
    requiredRateLimit: "manual/scheduled only; no default CI or every-commit rebuild",
    requiredDebugEvidence: "materializer status/failure docs and logs are capped.",
    requiredKillSwitch: "dry-run/max rows/max runtime source-visible wrappers; USER_INDEX_MATERIALIZER_MODE defaults to off and requires shadow evidence before active.",
    validator: "check:global-cost",
  },
  {
    surface: "dependency_tooling",
    owner: "repo-governance",
    sourceFiles: [
      "package.json",
      "functions/package.json",
      ".github/dependabot.yml",
      ".github/workflows/dependency-review.yml",
      ".github/workflows/openssf-scorecard.yml",
    ],
    costRisk: "medium",
    defaultAllowedInCI: true,
    defaultAllowedOnPageLoad: false,
    maxEventsPerUserPerMinute: null,
    maxEventsPerSession: null,
    maxBytesPerRequest: null,
    maxRowsPerRun: null,
    maxRuntimeMs: 10 * 60 * 1000,
    maxRetries: 0,
    cachePolicy: "dependency tooling uses GitHub/npm caches; no auto-merge.",
    samplingPolicy: "minor/patch grouping and report-only scorecard.",
    requiredRateLimit: "Dependabot grouping and PR review gates",
    requiredDebugEvidence: "dependency review output remains CI evidence.",
    requiredKillSwitch: "no auto-merge or deploy from dependency updates.",
    validator: "check:global-cost",
  },
  {
    surface: "admin_export_import_jobs",
    owner: "admin-debug",
    sourceFiles: [
      "src/app/api/admin/**",
      "scripts/**",
      "docs/runbooks/**",
    ],
    costRisk: "high",
    defaultAllowedInCI: false,
    defaultAllowedOnPageLoad: false,
    maxEventsPerUserPerMinute: null,
    maxEventsPerSession: null,
    maxBytesPerRequest: 512 * 1024,
    maxRowsPerRun: 1_000,
    maxRuntimeMs: 5 * 60 * 1000,
    maxRetries: 0,
    cachePolicy: "exports/imports are admin-only and must be dry-run/idempotent before mutation.",
    samplingPolicy: "bounded rows, resumable cursor, explicit mutation estimate.",
    requiredRateLimit: "ADMIN/HEAVY_READ or stricter route policy",
    requiredDebugEvidence: "admin-visible import/export status, failures, and cost estimate.",
    requiredKillSwitch: "dry-run default and explicit owner approval before mutation.",
    validator: "check:global-cost",
  },
];

export const GLOBAL_COST_SURFACE_BY_ID = Object.fromEntries(
  GLOBAL_COST_SURFACE_CONTRACTS.map((contract) => [contract.surface, contract]),
) as Record<GlobalCostSurfaceId, GlobalCostSurfaceContract>;
