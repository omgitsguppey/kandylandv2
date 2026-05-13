import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const SNAPSHOT_ADMIN_VENDOR_COST_REPORT_KEY = "snapshot-admin-vendor-cost-rewire" as const;
export const SNAPSHOT_ADMIN_VENDOR_COST_REPORT_PATH = "agent/state/snapshot-admin-vendor-cost-rewire.generated.json";
export const PHASE_ONE_REPORT_PATH = "agent/state/analytics-rewire-phase-one.generated.json" as const;
export const PHASE_TWO_REPORT_PATH = "agent/state/identity-privacy-raw-ledger-rewire.generated.json" as const;
export const PHASE_THREE_REPORT_PATH = "agent/state/lost-data-recovery-dry-run.generated.json" as const;

export const CANONICAL_SNAPSHOT_AUTHORITY = "analytics_admin_metric_snapshots" as const;
export const LEGACY_REALTIME_SUMMARY_AUTHORITY = "analytics_aggregate_stats/realtime_summary" as const;

export const RAW_DISPLAY_RISK_COLLECTIONS = [
  "analytics_event_facts",
  "analytics_guest_batches",
  "analytics_sessions",
  "analytics_watch_sessions",
  "behavioral_timeline_facts",
] as const;

export const REQUIRED_VENDOR_BOUNDARIES = ["GA4", "PostHog", "BigQuery"] as const;

export type Severity = "P0" | "P1" | "P2" | "P3";
export type Risk = "high" | "medium" | "low" | "unknown";
export type SnapshotAuthorityStatus =
  | "canonical"
  | "fallback"
  | "legacy"
  | "evidence_only"
  | "debug_only"
  | "deprecated_candidate"
  | "needs_review";
export type VendorKey = typeof REQUIRED_VENDOR_BOUNDARIES[number];
export type VendorAllowedRole = "evidence_only" | "export_only" | "estimate_only" | "debug_parity";
export type RecoverySurfaceTarget = "Admin Debug" | "Admin Analytics" | "archive_only" | "needs_review";

export type SnapshotAuthority = {
  authorityKey: string;
  title: string;
  pathOrCollection: string;
  status: SnapshotAuthorityStatus;
  recommendedOwner: string;
  displayAllowed: boolean;
  debugAllowed: boolean;
  fallbackAllowed: boolean;
  freshnessRule: string;
  fakeZeroProtectionRequired: boolean;
  sourceLabelRequired: boolean;
  demoteBehind?: string;
  recommendedAction: string;
};

export type AdminDisplayRule = {
  ruleKey: string;
  appliesTo: string[];
  allowedSources: string[];
  forbiddenSources: string[];
  requiredLabels: string[];
  recommendedAction: string;
};

export type AdminDebugRule = {
  ruleKey: string;
  appliesTo: string[];
  requiredEvidence: string[];
  requiredLabels: string[];
  recoveryUse: string;
  recommendedAction: string;
};

export type VendorBoundary = {
  vendorKey: VendorKey;
  allowedRole: VendorAllowedRole;
  forbiddenRole: string;
  requiredLabels: string[];
  costRisk: Risk;
  recommendedAction: string;
};

export type CostSimplificationCandidate = {
  candidateKey: string;
  title: string;
  currentPattern: string;
  preferredPattern: string;
  files: string[];
  costRisk: Risk;
  runtimeChangeNeededLater: boolean;
  recommendedAction: string;
};

export type RecoverySurfacingPlanItem = {
  laneKey: string;
  firstSurfaceTarget: RecoverySurfaceTarget;
  requiredBeforeAdminAnalytics: string[];
  targetSnapshotAuthority: string;
  sourceTruthLabel: string;
  confidenceLabelRequired: boolean;
  recommendedAction: string;
};

export type SnapshotAdminVendorCostIssue = {
  issueKey: string;
  severity: Severity;
  title: string;
  description: string;
  files: string[];
  blocksRuntimeSimplification: boolean;
  blocksPhaseOneFreeze: boolean;
  recommendedAction: string;
};

export type SnapshotAdminVendorCostRewireReport = {
  generatedAtUtc: string;
  reportKey: typeof SNAPSHOT_ADMIN_VENDOR_COST_REPORT_KEY;
  currentHead?: string;
  sourceReports: {
    phaseOneInventory: {
      path: typeof PHASE_ONE_REPORT_PATH;
      generatedAtUtc?: string;
      currentHead?: string;
      laneCount?: number;
      duplicateAuthorityCount?: number;
      rawDisplayFallbackCount?: number;
      vendorTruthBoundaryIssueCount?: number;
    };
    phaseTwoIdentityPrivacy: {
      path: typeof PHASE_TWO_REPORT_PATH;
      generatedAtUtc?: string;
      currentHead?: string;
      privacyRuleCount?: number;
      recoveryEligibilityRuleCount?: number;
    };
    phaseThreeRecoveryDryRun: {
      path: typeof PHASE_THREE_REPORT_PATH;
      generatedAtUtc?: string;
      currentHead?: string;
      recoverableLaneCount?: number;
      debugFirstCount?: number;
      adminAnalyticsEligibleCount?: number;
      highValueRecoveryCount?: number;
    };
  };
  phasesCovered: string[];
  summary: {
    snapshotAuthorityCount: number;
    duplicateAuthorityCount: number;
    rawDisplayFallbackCount: number;
    vendorBoundaryIssueCount: number;
    costRiskCount: number;
    adminDebugFirstRecoveryCount: number;
    adminAnalyticsEligibleRecoveryCount: number;
    issueCount: number;
    p0Count: number;
    p1Count: number;
  };
  snapshotAuthorities: SnapshotAuthority[];
  adminDisplayRules: AdminDisplayRule[];
  adminDebugRules: AdminDebugRule[];
  vendorBoundaries: VendorBoundary[];
  costSimplificationCandidates: CostSimplificationCandidate[];
  recoverySurfacingPlan: RecoverySurfacingPlanItem[];
  issues: SnapshotAdminVendorCostIssue[];
};

type BuildOptions = {
  root?: string;
  now?: Date;
};

type PhaseOneReport = {
  generatedAtUtc?: string;
  currentHead?: string;
  summary?: {
    laneCount?: number;
    duplicateAuthorityCount?: number;
    rawDisplayFallbackCount?: number;
    vendorTruthBoundaryIssueCount?: number;
  };
};

type PhaseTwoReport = {
  generatedAtUtc?: string;
  currentHead?: string;
  summary?: {
    privacyRuleCount?: number;
    recoveryEligibilityRuleCount?: number;
  };
};

type PhaseThreeReport = {
  generatedAtUtc?: string;
  currentHead?: string;
  summary?: {
    recoverableLaneCount?: number;
    debugFirstCount?: number;
    adminAnalyticsEligibleCount?: number;
    highValueRecoveryCount?: number;
  };
  recoveryLanes?: Array<{
    laneKey?: string;
    title?: string;
    sourceType?: string;
    consentRequirement?: string;
    canSurfaceInAdminAnalytics?: boolean;
    canSurfaceInAdminDebug?: boolean;
    canBackfillLater?: boolean;
    firstSurfaceTarget?: RecoverySurfaceTarget;
    recoveryValue?: Risk;
    recommendedAction?: string;
  }>;
};

const FRESHNESS_RULE =
  "Admin display sources must carry live, verified_cache, stale_cache, estimated, fallback, unavailable, or debug_only labels and must not show zero without source sample evidence.";

export const SNAPSHOT_AUTHORITIES: SnapshotAuthority[] = [
  {
    authorityKey: CANONICAL_SNAPSHOT_AUTHORITY,
    title: "Canonical Admin Analytics metric snapshots",
    pathOrCollection: CANONICAL_SNAPSHOT_AUTHORITY,
    status: "canonical",
    recommendedOwner: "admin metric snapshot",
    displayAllowed: true,
    debugAllowed: true,
    fallbackAllowed: false,
    freshnessRule: FRESHNESS_RULE,
    fakeZeroProtectionRequired: true,
    sourceLabelRequired: true,
    recommendedAction: "Make this the canonical compact Admin Analytics display snapshot layer for module display truth.",
  },
  {
    authorityKey: "analytics_aggregate_stats_realtime_summary",
    title: "Legacy realtime summary aggregate",
    pathOrCollection: LEGACY_REALTIME_SUMMARY_AUTHORITY,
    status: "fallback",
    recommendedOwner: "admin debug parity",
    displayAllowed: false,
    debugAllowed: true,
    fallbackAllowed: true,
    freshnessRule: "May support live-pulse or fallback evidence only when labeled and demoted behind analytics_admin_metric_snapshots.",
    fakeZeroProtectionRequired: true,
    sourceLabelRequired: true,
    demoteBehind: CANONICAL_SNAPSHOT_AUTHORITY,
    recommendedAction: "Demote behind analytics_admin_metric_snapshots for Admin Analytics module truth; keep as labeled fallback/evidence only.",
  },
  {
    authorityKey: "raw_ledger_collections",
    title: "Raw analytics ledger collections",
    pathOrCollection: RAW_DISPLAY_RISK_COLLECTIONS.join(", "),
    status: "debug_only",
    recommendedOwner: "raw event ledger",
    displayAllowed: false,
    debugAllowed: true,
    fallbackAllowed: true,
    freshnessRule: "Raw collections are materializer inputs and Debug evidence; bounded fallback requires source labels and fake-zero protection.",
    fakeZeroProtectionRequired: true,
    sourceLabelRequired: true,
    demoteBehind: CANONICAL_SNAPSHOT_AUTHORITY,
    recommendedAction: "Keep raw collections out of compact Admin Analytics display truth and route details through Admin Debug or snapshot materializers.",
  },
  {
    authorityKey: "vendor_evidence_lanes",
    title: "GA4/PostHog/BigQuery vendor evidence lanes",
    pathOrCollection: "GA4, PostHog, BigQuery",
    status: "evidence_only",
    recommendedOwner: "vendor evidence",
    displayAllowed: false,
    debugAllowed: true,
    fallbackAllowed: false,
    freshnessRule: "Vendor values must be labeled estimated, export_only, or debug_parity and must never override first-party snapshot truth.",
    fakeZeroProtectionRequired: true,
    sourceLabelRequired: true,
    demoteBehind: CANONICAL_SNAPSHOT_AUTHORITY,
    recommendedAction: "Use vendor lanes for estimates, export evidence, and Debug parity only.",
  },
];

export const ADMIN_DISPLAY_RULES: AdminDisplayRule[] = [
  {
    ruleKey: "snapshot-first-compact-operator-truth",
    appliesTo: ["Admin Analytics", "module summary cards", "module charts"],
    allowedSources: [CANONICAL_SNAPSHOT_AUTHORITY, "stale verified snapshots when labeled", "bounded labeled fallback"],
    forbiddenSources: [
      ...RAW_DISPLAY_RISK_COLLECTIONS,
      "GA4 product truth",
      "PostHog product truth",
      "BigQuery product truth",
      "unlabeled estimate",
      "missing sample as zero",
      "stale snapshot as live",
    ],
    requiredLabels: ["live", "verified_cache", "stale_cache", "estimated", "fallback", "unavailable"],
    recommendedAction: "Admin Analytics should stay compact and snapshot-first, with Debug links for formulas and source detail.",
  },
  {
    ruleKey: "raw-collection-display-ban",
    appliesTo: [...RAW_DISPLAY_RISK_COLLECTIONS],
    allowedSources: ["materializer input", "Admin Debug evidence", "bounded fallback with labels and fake-zero protection"],
    forbiddenSources: ["direct Admin Analytics display truth", "raw guest batch display", "raw session display", "raw watch session display"],
    requiredLabels: ["debug_only", "fallback", "unavailable"],
    recommendedAction: "Replace raw display fallbacks in later runtime phases with verified snapshots or Debug-only evidence.",
  },
  {
    ruleKey: "fake-zero-and-live-state-protection",
    appliesTo: ["Admin Analytics counts", "guest metrics", "watch/session metrics", "conversion metrics"],
    allowedSources: ["snapshots with source sample evidence", "labeled unavailable/stale states"],
    forbiddenSources: ["zero without denominator evidence", "absence of errors as healthy", "missing samples as live"],
    requiredLabels: ["live", "stale_cache", "unavailable", "needs_review", "estimated"],
    recommendedAction: "A zero value is displayable only after the source denominator or sample evidence is known.",
  },
  {
    ruleKey: "vendor-comparison-labels",
    appliesTo: ["GA-derived guest estimate", "PostHog comparison", "BigQuery export evidence"],
    allowedSources: ["labeled estimate", "debug parity", "export evidence"],
    forbiddenSources: ["first-party product truth override", "readiness source without cached evidence"],
    requiredLabels: ["estimated", "vendor_evidence", "debug_parity", "export_only"],
    recommendedAction: "Vendor comparison may explain drift but must not replace first-party snapshot truth.",
  },
];

export const ADMIN_DEBUG_RULES: AdminDebugRule[] = [
  {
    ruleKey: "debug-first-recovery-evidence",
    appliesTo: ["high-value recovery lanes", "legacy recovered events", "identity-linked data"],
    requiredEvidence: ["source path", "identity keys", "consent requirement", "mapping warnings", "confidence label"],
    requiredLabels: ["debug_only", "needs_review", "source_confidence"],
    recoveryUse: "Admin Debug is the first surface for recovered analytics evidence before compact Admin Analytics promotion.",
    recommendedAction: "Surface recovered data details in Debug with blockers and confidence before any Admin Analytics rollup.",
  },
  {
    ruleKey: "debug-source-formula-parity",
    appliesTo: ["snapshot formulas", "raw collection inputs", "vendor parity", "duplicate authorities"],
    requiredEvidence: ["formula", "source collections", "freshness", "fallback reason", "drift notes"],
    requiredLabels: ["verified_cache", "stale_cache", "fallback", "estimated", "unavailable"],
    recoveryUse: "Debug explains why compact Admin Analytics values are live, stale, unavailable, estimated, or fallback.",
    recommendedAction: "Keep formulas, source counts, drift, and cost warnings in Debug rather than expanding Admin Analytics cards.",
  },
  {
    ruleKey: "debug-cost-and-authority-warnings",
    appliesTo: ["admin raw reads", "realtime listeners", "BigQuery references", "stale generated reports"],
    requiredEvidence: ["cost risk", "authority owner", "source label", "runtime change needed"],
    requiredLabels: ["cost_risk", "evidence_only", "deprecated_candidate", "needs_review"],
    recoveryUse: "Debug should retain the detailed reason a lane is demoted, costly, stale, or not yet eligible for display.",
    recommendedAction: "Route cost and authority drift to Debug until a runtime simplification patch removes the underlying pattern.",
  },
];

export const VENDOR_BOUNDARIES: VendorBoundary[] = [
  {
    vendorKey: "GA4",
    allowedRole: "estimate_only",
    forbiddenRole: "product/Admin Analytics display truth override",
    requiredLabels: ["estimated", "vendor_evidence", "debug_parity", "intraday_directional"],
    costRisk: "medium",
    recommendedAction: "Use GA4 for directional evidence and Debug parity only; intraday/realtime values must stay labeled.",
  },
  {
    vendorKey: "PostHog",
    allowedRole: "evidence_only",
    forbiddenRole: "product truth override or readiness dependency",
    requiredLabels: ["vendor_evidence", "debug_parity"],
    costRisk: "medium",
    recommendedAction: "Keep PostHog as optional vendor evidence and do not make readiness depend on live PostHog data.",
  },
  {
    vendorKey: "BigQuery",
    allowedRole: "export_only",
    forbiddenRole: "runtime/Admin Analytics display truth or broad scan cost control by LIMIT",
    requiredLabels: ["export_only", "evidence_only", "debug_parity"],
    costRisk: "high",
    recommendedAction: "Keep BigQuery as export/evidence; no runtime display path should query it or claim LIMIT controls raw scan cost.",
  },
];

export const COST_SIMPLIFICATION_CANDIDATES: CostSimplificationCandidate[] = [
  {
    candidateKey: "admin-raw-realtime-listeners",
    title: "Admin realtime listeners over raw analytics collections",
    currentPattern: "Admin display or hooks can observe raw analytics collections directly.",
    preferredPattern: "Snapshot-first Admin Analytics with raw collection detail routed to Admin Debug.",
    files: ["src/app/admin/analytics/**", "src/app/admin/debug/**"],
    costRisk: "high",
    runtimeChangeNeededLater: true,
    recommendedAction: "Replace direct display listeners with verified snapshot reads in a later runtime simplification pass.",
  },
  {
    candidateKey: "admin-raw-display-fallback-routes",
    title: "Admin routes reading raw guest/event/watch collections as display fallback",
    currentPattern: "Admin routes may query raw collections when snapshot evidence is missing.",
    preferredPattern: "Unavailable/stale/needs_review state unless a bounded labeled fallback already exists.",
    files: ["src/app/api/admin/analytics/realtime/route.ts", "src/app/api/admin/analytics/historical/route.ts", "src/lib/server/*analytics*"],
    costRisk: "high",
    runtimeChangeNeededLater: true,
    recommendedAction: "Collapse raw route fallbacks behind analytics_admin_metric_snapshots and Debug-only source evidence.",
  },
  {
    candidateKey: "duplicate-snapshot-authority",
    title: "Duplicate snapshot authority between realtime summary and admin metric snapshots",
    currentPattern: "analytics_aggregate_stats/realtime_summary and analytics_admin_metric_snapshots both look like display authorities.",
    preferredPattern: "analytics_admin_metric_snapshots is canonical; realtime_summary is fallback/live-pulse/evidence only.",
    files: ["functions/src/analytics-realtime-summary.ts", "src/lib/server/admin-analytics-snapshots.ts", "src/lib/analytics/admin-metric-snapshot.ts"],
    costRisk: "medium",
    runtimeChangeNeededLater: true,
    recommendedAction: "Make Admin Analytics modules read the canonical snapshot layer and demote realtime_summary in labels/docs.",
  },
  {
    candidateKey: "vendor-guest-estimates-without-source-confidence",
    title: "Vendor-derived guest estimates without source/confidence labels",
    currentPattern: "GA/PostHog/BigQuery evidence can be blended into user-facing operator counts.",
    preferredPattern: "First-party snapshots win; vendor values are labeled estimated/debug parity.",
    files: ["src/app/admin/analytics/**", "src/app/admin/debug/**", "src/lib/analytics/**"],
    costRisk: "medium",
    runtimeChangeNeededLater: true,
    recommendedAction: "Require source/confidence labels and prevent vendor estimates from overriding first-party snapshots.",
  },
  {
    candidateKey: "stale-generated-reports-as-authority",
    title: "Stale generated reports used as authority",
    currentPattern: "Generated reports older than 24 hours can look authoritative in docs or Debug evidence.",
    preferredPattern: "Generated reports are snapshots and stale after 24 hours unless an explicit contract says otherwise.",
    files: ["agent/state/*.generated.json", "docs/agent-truth/*.md"],
    costRisk: "low",
    runtimeChangeNeededLater: false,
    recommendedAction: "Keep generated reports labeled as evidence snapshots and rerun validators before using them as inputs.",
  },
  {
    candidateKey: "watch-session-page-duration-duplication",
    title: "Watch/session metrics duplicating page duration or event counts",
    currentPattern: "Watch truth can drift if page duration or event counts are treated as canonical.",
    preferredPattern: "Watch-session rollups are canonical; legacy page duration is fallback/legacy evidence only.",
    files: ["src/lib/analytics/**", "src/app/api/admin/analytics/**", "functions/src/*analytics*"],
    costRisk: "medium",
    runtimeChangeNeededLater: true,
    recommendedAction: "Keep watch/session display behind rollups and label page duration as legacy fallback where used.",
  },
  {
    candidateKey: "support-recovery-facts-raw-only-invisible",
    title: "Support/recovery facts stay raw-only and invisible",
    currentPattern: "Support recovery evidence may be written but not surfaced in operator Debug recovery views.",
    preferredPattern: "Debug-first support/recovery evidence with labels before any compact Admin Analytics rollup.",
    files: ["src/app/admin/debug/**", "src/lib/analytics/**"],
    costRisk: "low",
    runtimeChangeNeededLater: true,
    recommendedAction: "Plan a Debug-first surfacing pass that keeps support/recovery facts operational, not behavioral personalization.",
  },
  {
    candidateKey: "notification-delivery-read-facts-split",
    title: "Notification delivery/read facts split across raw paths",
    currentPattern: "Notification delivery, read, and engagement evidence can stay split across raw lanes.",
    preferredPattern: "Debug-first delivery/read source labels before optional Admin Analytics aggregate surfacing.",
    files: ["src/lib/analytics/**", "src/app/admin/debug/**"],
    costRisk: "medium",
    runtimeChangeNeededLater: true,
    recommendedAction: "Unify notification evidence through labeled Debug parity before promoting aggregate health metrics.",
  },
];

const BASE_ISSUES: SnapshotAdminVendorCostIssue[] = [
  {
    issueKey: "duplicate-snapshot-authority-collapse-needed",
    severity: "P0",
    title: "Duplicate snapshot authorities need runtime collapse",
    description: "analytics_admin_metric_snapshots should own compact Admin Analytics display truth while realtime_summary becomes fallback/live-pulse/evidence.",
    files: ["src/lib/server/admin-analytics-snapshots.ts", "functions/src/analytics-realtime-summary.ts"],
    blocksRuntimeSimplification: true,
    blocksPhaseOneFreeze: false,
    recommendedAction: "In a later runtime phase, make module display reads snapshot-first through analytics_admin_metric_snapshots.",
  },
  {
    issueKey: "raw-display-fallback-runtime-simplification-needed",
    severity: "P0",
    title: "Raw display fallback risks need runtime simplification",
    description: "Raw event, guest, session, watch, and behavioral facts must not be compact Admin Analytics display truth.",
    files: ["src/app/api/admin/analytics/realtime/route.ts", "src/app/api/admin/analytics/historical/route.ts", "src/app/admin/analytics/**"],
    blocksRuntimeSimplification: true,
    blocksPhaseOneFreeze: false,
    recommendedAction: "Replace raw display fallback with unavailable/stale/needs_review or bounded labeled fallback after the contract is accepted.",
  },
  {
    issueKey: "vendor-boundary-runtime-labeling-needed",
    severity: "P1",
    title: "Vendor evidence must stay labeled and non-authoritative",
    description: "GA4, PostHog, and BigQuery can support estimates/export/debug parity, but first-party snapshots must win display truth.",
    files: ["src/lib/analytics/**", "src/app/admin/analytics/**", "src/app/admin/debug/**"],
    blocksRuntimeSimplification: true,
    blocksPhaseOneFreeze: false,
    recommendedAction: "Add or verify source/confidence labels in later Admin Analytics/Admin Debug runtime passes.",
  },
  {
    issueKey: "admin-debug-recovery-surfacing-required",
    severity: "P1",
    title: "Recovered analytics evidence must surface in Debug before Admin Analytics",
    description: "Phase 3 high-value lanes require Debug-first evidence, mapping warnings, consent labels, and confidence before compact rollup promotion.",
    files: ["agent/state/lost-data-recovery-dry-run.generated.json", "src/app/admin/debug/**"],
    blocksRuntimeSimplification: true,
    blocksPhaseOneFreeze: false,
    recommendedAction: "Implement Debug-first recovery evidence in a later runtime phase before Admin Analytics promotion.",
  },
  {
    issueKey: "cost-simplification-runtime-pass-required",
    severity: "P1",
    title: "Cost simplification needs a separate runtime pass",
    description: "This static contract identifies cost-risk patterns but does not remove raw reads, listeners, duplicate materializers, or broad fallback work.",
    files: ["src/app/api/admin/analytics/**", "src/app/admin/analytics/**", "functions/src/*analytics*"],
    blocksRuntimeSimplification: true,
    blocksPhaseOneFreeze: false,
    recommendedAction: "Use the costSimplificationCandidates list as the scope for the next runtime simplification prompt.",
  },
];

function readJson<T>(root: string, repoPath: string): T | null {
  const fullPath = path.join(root, repoPath);
  if (!existsSync(fullPath)) return null;
  try {
    return JSON.parse(readFileSync(fullPath, "utf8")) as T;
  } catch {
    return null;
  }
}

function readText(root: string, repoPath: string) {
  const fullPath = path.join(root, repoPath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function currentHead(root: string) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return undefined;
  }
}

function count<T>(values: T[], predicate: (value: T) => boolean) {
  return values.filter(predicate).length;
}

function getPhaseOneSummary(phaseOne: PhaseOneReport | null) {
  return {
    path: PHASE_ONE_REPORT_PATH,
    generatedAtUtc: phaseOne?.generatedAtUtc,
    currentHead: phaseOne?.currentHead,
    laneCount: phaseOne?.summary?.laneCount,
    duplicateAuthorityCount: phaseOne?.summary?.duplicateAuthorityCount,
    rawDisplayFallbackCount: phaseOne?.summary?.rawDisplayFallbackCount,
    vendorTruthBoundaryIssueCount: phaseOne?.summary?.vendorTruthBoundaryIssueCount,
  };
}

function getPhaseTwoSummary(phaseTwo: PhaseTwoReport | null) {
  return {
    path: PHASE_TWO_REPORT_PATH,
    generatedAtUtc: phaseTwo?.generatedAtUtc,
    currentHead: phaseTwo?.currentHead,
    privacyRuleCount: phaseTwo?.summary?.privacyRuleCount,
    recoveryEligibilityRuleCount: phaseTwo?.summary?.recoveryEligibilityRuleCount,
  };
}

function getPhaseThreeSummary(phaseThree: PhaseThreeReport | null) {
  return {
    path: PHASE_THREE_REPORT_PATH,
    generatedAtUtc: phaseThree?.generatedAtUtc,
    currentHead: phaseThree?.currentHead,
    recoverableLaneCount: phaseThree?.summary?.recoverableLaneCount,
    debugFirstCount: phaseThree?.summary?.debugFirstCount,
    adminAnalyticsEligibleCount: phaseThree?.summary?.adminAnalyticsEligibleCount,
    highValueRecoveryCount: phaseThree?.summary?.highValueRecoveryCount,
  };
}

function buildSourceFreshnessIssues(root: string, phaseOne: PhaseOneReport | null, phaseTwo: PhaseTwoReport | null, phaseThree: PhaseThreeReport | null) {
  const head = currentHead(root);
  const issues: SnapshotAdminVendorCostIssue[] = [];
  const sources = [
    { key: "phase-one", path: PHASE_ONE_REPORT_PATH, currentHead: phaseOne?.currentHead, title: "Phase One inventory report is not current with HEAD" },
    { key: "phase-two", path: PHASE_TWO_REPORT_PATH, currentHead: phaseTwo?.currentHead, title: "Phase Two identity/privacy report is not current with HEAD" },
    { key: "phase-three", path: PHASE_THREE_REPORT_PATH, currentHead: phaseThree?.currentHead, title: "Phase Three recovery dry-run report is not current with HEAD" },
  ];

  for (const source of sources) {
    if (!source.currentHead) continue;
    if (head && source.currentHead !== head) {
      issues.push({
        issueKey: `${source.key}-source-report-head-mismatch`,
        severity: "P1",
        title: source.title,
        description: `${source.path} currentHead=${source.currentHead}; current HEAD=${head}.`,
        files: [source.path],
        blocksRuntimeSimplification: true,
        blocksPhaseOneFreeze: false,
        recommendedAction: "Rerun Phase 1, Phase 2, and Phase 3 validators before using this Phase 4 contract.",
      });
    }
  }

  return issues;
}

function buildRuntimeAwareIssues(root: string) {
  const realtimeRoute = readText(root, "src/app/api/admin/analytics/realtime/route.ts");
  const historicalRoute = readText(root, "src/app/api/admin/analytics/historical/route.ts");
  const debugRoute = readText(root, "src/app/api/admin/debug/route.ts");

  const realtimeCollapsed = realtimeRoute.includes("ADMIN_ANALYTICS_REALTIME_CANONICAL_SNAPSHOT_SOURCE_LABEL")
    && realtimeRoute.includes("raw analytics collections are debug-only")
    && !realtimeRoute.includes("cold_route_refresh")
    && !realtimeRoute.includes("ga_realtime");
  const historicalCollapsed = historicalRoute.includes("readHistoricalSnapshotAuthorityPayload")
    && historicalRoute.includes("ADMIN_ANALYTICS_HISTORICAL_CANONICAL_SNAPSHOT_SOURCE")
    && historicalRoute.includes("Raw analytics collections are debug-only and were not used as compact historical display fallback.")
    && historicalRoute.includes("rawDisplayFallbackUsed: 0");
  const debugMetadataPresent = debugRoute.includes("historicalRouteAuthority")
    && debugRoute.includes("admin_debug_raw_evidence_only")
    && debugRoute.includes("compactRawDisplayFallbackRemoved");
  const debugRecoveryEvidencePresent = debugRoute.includes("adminAnalyticsRecoveryEvidence")
    && debugRoute.includes("buildAdminAnalyticsRecoveryEvidenceDebugMetadata")
    && debugRoute.includes("REQUIRED_ADMIN_DEBUG_RECOVERY_LANES")
    && debugRoute.includes("productionAllowedNow: false")
    && debugRoute.includes("adminAnalyticsPromotedNow: false")
    && debugRoute.includes("analytics_legacy_recovered_events")
    && debugRoute.includes("recovery_evidence_debug_first");

  return BASE_ISSUES.map((issue) => {
    if (issue.issueKey === "duplicate-snapshot-authority-collapse-needed" && realtimeCollapsed && historicalCollapsed) {
      return {
        ...issue,
        severity: "P1" as const,
        title: "Duplicate snapshot authority collapse partially landed for realtime and historical routes",
        description: "Realtime and historical Admin Analytics routes now prefer analytics_admin_metric_snapshots and demote legacy/raw sources; broader materializer/module cleanup remains.",
        recommendedAction: "Keep analytics_admin_metric_snapshots canonical, then collapse remaining module/materializer authority conflicts in later runtime passes.",
      };
    }

    if (issue.issueKey === "raw-display-fallback-runtime-simplification-needed" && realtimeCollapsed && historicalCollapsed) {
      return {
        ...issue,
        severity: "P1" as const,
        title: "Raw display fallback collapse partially landed for realtime and historical routes",
        description: "Realtime and historical compact display paths no longer rebuild display truth from raw analytics logs when verified snapshots are unavailable; Debug/raw recovery surfacing remains future work.",
        recommendedAction: "Audit remaining Admin Analytics modules and Debug recovery lanes for any raw display fallbacks outside the realtime/historical route arteries.",
      };
    }

    if (issue.issueKey === "vendor-boundary-runtime-labeling-needed" && realtimeCollapsed && historicalCollapsed) {
      return {
        ...issue,
        description: `${issue.description} Realtime and historical route authority checks now block vendor override in compact display paths; remaining vendor estimate labels still need module-level review.`,
      };
    }

    if (issue.issueKey === "admin-debug-recovery-surfacing-required" && debugRecoveryEvidencePresent) {
      return {
        ...issue,
        severity: "P2" as const,
        title: "Admin Debug recovery evidence surfacing partially landed",
        description: "Admin Debug now exposes Phase 3 recovery lanes with source, confidence, consent, blocker, productionAllowedNow=false, and no Admin Analytics promotion metadata. A later pass still needs module-level review before any compact Admin Analytics promotion.",
        blocksRuntimeSimplification: false,
        recommendedAction: "Use the Debug recovery evidence payload to drive the next module-level vendor/source label and recovery promotion review.",
      };
    }

    if (issue.issueKey === "admin-debug-recovery-surfacing-required" && debugMetadataPresent) {
      return {
        ...issue,
        description: "Admin Debug now carries historical route authority/source metadata, but recovered analytics lane rows still need a dedicated Debug surfacing pass before Admin Analytics promotion.",
        recommendedAction: "Implement the next Debug recovery evidence pass without promoting recovered data into compact Admin Analytics.",
      };
    }

    return issue;
  });
}

function sourceTruthLabelForLane(laneKey: string) {
  if (laneKey === "purchase_facts") return "required_operational_transaction_truth";
  if (laneKey === "unlock_facts") return "required_operational_entitlement_truth";
  if (laneKey === "analytics_watch_sessions") return "watch_session_rollup";
  if (laneKey === "analytics_legacy_recovered_events") return "legacy_mapped_debug_only";
  if (laneKey === "analytics_export_status") return "vendor_evidence";
  if (laneKey === "analytics_pipeline_daily") return "pipeline_status_debug_only";
  if (["analytics_event_facts", "analytics_guest_batches", "analytics_sessions"].includes(laneKey)) return "raw_ledger_debug_only";
  return "recovery_evidence_debug_first";
}

function requirementsForLane(lane: NonNullable<PhaseThreeReport["recoveryLanes"]>[number]) {
  const laneKey = lane.laneKey ?? "unknown";
  if (laneKey === "purchase_facts") {
    return ["server/payment transaction truth snapshot", "source sample evidence", "fake-zero protection", "source/confidence labels"];
  }
  if (laneKey === "unlock_facts") {
    return ["server entitlement truth snapshot", "source sample evidence", "fake-zero protection", "source/confidence labels"];
  }
  if (laneKey === "analytics_watch_sessions") {
    return ["watch-session rollup snapshot", "source sample evidence", "legacy duration fallback label", "fake-zero protection"];
  }
  if (lane.canSurfaceInAdminAnalytics) {
    return ["verified source truth snapshot", "source sample evidence", "fake-zero protection", "source/confidence labels"];
  }
  return ["Admin Debug source evidence", "identity/consent eligibility", "mapping warnings", "confidence labels", "manual promotion approval"];
}

function buildRecoverySurfacingPlan(phaseThree: PhaseThreeReport | null): RecoverySurfacingPlanItem[] {
  const lanes = phaseThree?.recoveryLanes ?? [];
  return lanes.map((lane) => {
    const laneKey = lane.laneKey ?? "unknown";
    const canDisplay = lane.canSurfaceInAdminAnalytics === true;
    return {
      laneKey,
      firstSurfaceTarget: lane.firstSurfaceTarget ?? (canDisplay ? "Admin Analytics" : "Admin Debug"),
      requiredBeforeAdminAnalytics: requirementsForLane(lane),
      targetSnapshotAuthority: canDisplay ? CANONICAL_SNAPSHOT_AUTHORITY : "Admin Debug recovery evidence",
      sourceTruthLabel: sourceTruthLabelForLane(laneKey),
      confidenceLabelRequired: true,
      recommendedAction:
        lane.recommendedAction ??
        (canDisplay
          ? "Promote through a verified server/source truth snapshot only after Debug confidence exists."
          : "Keep Debug-first until identity, consent, mapping confidence, and source labels are proven."),
    };
  });
}

export function buildSnapshotAdminVendorCostRewireReport(options: BuildOptions = {}): SnapshotAdminVendorCostRewireReport {
  const root = options.root ?? process.cwd();
  const now = options.now ?? new Date();
  const phaseOne = readJson<PhaseOneReport>(root, PHASE_ONE_REPORT_PATH);
  const phaseTwo = readJson<PhaseTwoReport>(root, PHASE_TWO_REPORT_PATH);
  const phaseThree = readJson<PhaseThreeReport>(root, PHASE_THREE_REPORT_PATH);
  const recoverySurfacingPlan = buildRecoverySurfacingPlan(phaseThree);
  const issues = [...buildRuntimeAwareIssues(root), ...buildSourceFreshnessIssues(root, phaseOne, phaseTwo, phaseThree)];

  return {
    generatedAtUtc: now.toISOString(),
    reportKey: SNAPSHOT_ADMIN_VENDOR_COST_REPORT_KEY,
    currentHead: currentHead(root),
    sourceReports: {
      phaseOneInventory: getPhaseOneSummary(phaseOne),
      phaseTwoIdentityPrivacy: getPhaseTwoSummary(phaseTwo),
      phaseThreeRecoveryDryRun: getPhaseThreeSummary(phaseThree),
    },
    phasesCovered: [
      "8. Snapshot Authority Collapse",
      "Admin Analytics Display Source Rules",
      "Admin Debug Recovery Evidence Rules",
      "Vendor Evidence Boundary",
      "Cloud/Firebase Cost Simplification Planning",
    ],
    summary: {
      snapshotAuthorityCount: SNAPSHOT_AUTHORITIES.length,
      duplicateAuthorityCount: phaseOne?.summary?.duplicateAuthorityCount ?? 0,
      rawDisplayFallbackCount: phaseOne?.summary?.rawDisplayFallbackCount ?? 0,
      vendorBoundaryIssueCount: phaseOne?.summary?.vendorTruthBoundaryIssueCount ?? 0,
      costRiskCount: count(COST_SIMPLIFICATION_CANDIDATES, (candidate) => candidate.costRisk === "high" || candidate.costRisk === "medium"),
      adminDebugFirstRecoveryCount: count(recoverySurfacingPlan, (entry) => entry.firstSurfaceTarget === "Admin Debug"),
      adminAnalyticsEligibleRecoveryCount: count(recoverySurfacingPlan, (entry) => entry.targetSnapshotAuthority === CANONICAL_SNAPSHOT_AUTHORITY),
      issueCount: issues.length,
      p0Count: count(issues, (issue) => issue.severity === "P0"),
      p1Count: count(issues, (issue) => issue.severity === "P1"),
    },
    snapshotAuthorities: SNAPSHOT_AUTHORITIES,
    adminDisplayRules: ADMIN_DISPLAY_RULES,
    adminDebugRules: ADMIN_DEBUG_RULES,
    vendorBoundaries: VENDOR_BOUNDARIES,
    costSimplificationCandidates: COST_SIMPLIFICATION_CANDIDATES,
    recoverySurfacingPlan,
    issues,
  };
}

export function validateSnapshotAdminVendorCostRewireReport(report: SnapshotAdminVendorCostRewireReport) {
  const failures: string[] = [];

  if (report.reportKey !== SNAPSHOT_ADMIN_VENDOR_COST_REPORT_KEY) failures.push("reportKey is incorrect.");
  if (!report.generatedAtUtc || Number.isNaN(Date.parse(report.generatedAtUtc))) failures.push("generatedAtUtc must be parseable.");
  if (!report.sourceReports?.phaseOneInventory || report.sourceReports.phaseOneInventory.path !== PHASE_ONE_REPORT_PATH) failures.push("phaseOneInventory source report is missing.");
  if (!report.sourceReports?.phaseTwoIdentityPrivacy || report.sourceReports.phaseTwoIdentityPrivacy.path !== PHASE_TWO_REPORT_PATH) failures.push("phaseTwoIdentityPrivacy source report is missing.");
  if (!report.sourceReports?.phaseThreeRecoveryDryRun || report.sourceReports.phaseThreeRecoveryDryRun.path !== PHASE_THREE_REPORT_PATH) failures.push("phaseThreeRecoveryDryRun source report is missing.");
  if (!Array.isArray(report.phasesCovered) || report.phasesCovered.length < 4) failures.push("phasesCovered is incomplete.");

  const canonical = report.snapshotAuthorities?.find((entry) => entry.authorityKey === CANONICAL_SNAPSHOT_AUTHORITY);
  if (!canonical || canonical.status !== "canonical" || !canonical.displayAllowed || !canonical.fakeZeroProtectionRequired || !canonical.sourceLabelRequired) {
    failures.push("analytics_admin_metric_snapshots must be the canonical display snapshot authority with fake-zero/source-label requirements.");
  }

  const realtime = report.snapshotAuthorities?.find((entry) => entry.pathOrCollection === LEGACY_REALTIME_SUMMARY_AUTHORITY);
  if (!realtime || realtime.status === "canonical" || realtime.displayAllowed || realtime.demoteBehind !== CANONICAL_SNAPSHOT_AUTHORITY) {
    failures.push("analytics_aggregate_stats/realtime_summary must be demoted behind analytics_admin_metric_snapshots.");
  }

  const rawBan = report.adminDisplayRules?.find((rule) => rule.ruleKey === "raw-collection-display-ban");
  for (const collection of RAW_DISPLAY_RISK_COLLECTIONS) {
    if (!rawBan?.appliesTo.includes(collection)) failures.push(`raw display ban missing ${collection}.`);
    if (!report.snapshotAuthorities?.some((entry) => entry.pathOrCollection.includes(collection))) failures.push(`snapshot authority list missing raw collection ${collection}.`);
  }

  const vendorKeys = new Set(report.vendorBoundaries?.map((boundary) => boundary.vendorKey));
  for (const vendor of REQUIRED_VENDOR_BOUNDARIES) {
    if (!vendorKeys.has(vendor)) failures.push(`missing vendor boundary for ${vendor}.`);
  }
  for (const boundary of report.vendorBoundaries ?? []) {
    if (boundary.forbiddenRole.toLowerCase().includes("product") === false && boundary.forbiddenRole.toLowerCase().includes("runtime") === false) {
      failures.push(`${boundary.vendorKey} boundary must forbid product/runtime truth override.`);
    }
  }

  const candidateKeys = new Set(report.costSimplificationCandidates?.map((candidate) => candidate.candidateKey));
  for (const required of ["admin-raw-realtime-listeners", "admin-raw-display-fallback-routes", "duplicate-snapshot-authority"]) {
    if (!candidateKeys.has(required)) failures.push(`missing cost simplification candidate: ${required}`);
  }

  const planKeys = new Set(report.recoverySurfacingPlan?.map((entry) => entry.laneKey));
  for (const required of ["analytics_identity_links", "guest_tracking_indexes", "user_journey_indexes", "behavioral_timeline_facts", "analytics_watch_sessions", "purchase_facts", "unlock_facts", "analytics_legacy_recovered_events"]) {
    if (!planKeys.has(required)) failures.push(`missing recovery surfacing plan lane: ${required}`);
  }

  for (const laneKey of ["analytics_identity_links", "guest_tracking_indexes", "user_journey_indexes", "behavioral_timeline_facts", "analytics_legacy_recovered_events"]) {
    const item = report.recoverySurfacingPlan?.find((entry) => entry.laneKey === laneKey);
    if (!item || item.firstSurfaceTarget !== "Admin Debug" || !item.confidenceLabelRequired) {
      failures.push(`${laneKey} must remain Debug-first with confidence labels.`);
    }
  }

  for (const laneKey of ["purchase_facts", "unlock_facts"]) {
    const item = report.recoverySurfacingPlan?.find((entry) => entry.laneKey === laneKey);
    if (!item || item.targetSnapshotAuthority !== CANONICAL_SNAPSHOT_AUTHORITY || !item.requiredBeforeAdminAnalytics.some((requirement) => requirement.includes("server"))) {
      failures.push(`${laneKey} must be Admin Analytics eligible only through server/source truth snapshots.`);
    }
  }

  if (report.summary.snapshotAuthorityCount !== report.snapshotAuthorities.length) failures.push("summary.snapshotAuthorityCount mismatch.");
  if (report.summary.issueCount !== report.issues.length) failures.push("summary.issueCount mismatch.");
  if (report.summary.adminDebugFirstRecoveryCount !== count(report.recoverySurfacingPlan, (entry) => entry.firstSurfaceTarget === "Admin Debug")) failures.push("summary.adminDebugFirstRecoveryCount mismatch.");
  if (report.summary.adminAnalyticsEligibleRecoveryCount !== count(report.recoverySurfacingPlan, (entry) => entry.targetSnapshotAuthority === CANONICAL_SNAPSHOT_AUTHORITY)) failures.push("summary.adminAnalyticsEligibleRecoveryCount mismatch.");

  return failures;
}

export function writeSnapshotAdminVendorCostRewireReport(report: SnapshotAdminVendorCostRewireReport, root = process.cwd()) {
  const absolutePath = path.join(root, SNAPSHOT_ADMIN_VENDOR_COST_REPORT_PATH);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}
