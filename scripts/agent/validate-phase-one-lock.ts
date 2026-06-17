import { execFileSync } from "node:child_process";

import {
  ROOT,
  nowIso,
  readText,
  walkDirectoryFiles,
  writeJsonFile,
  type Json,
} from "./shared";
import {
  deriveGeneratedReportFreshness,
  type GeneratedReportFreshness,
} from "../../src/lib/agent-governance/generated-reports/generated-report-contract";

type SectionResult = {
  name: string;
  status: "pass" | "fail";
  failures: string[];
};

type PhaseOneLockReport = {
  reportKey: "phase-one-lock";
  generatedAt: string;
  sourceCommit: string;
  freshness: GeneratedReportFreshness;
  status: "pass" | "fail";
  summary: {
    sectionCount: number;
    passedSectionCount: number;
    failedSectionCount: number;
    criticalBlockerCount: number;
    warningCount: number;
    changedFileCount: number;
    requiredTargetedCheckCount: number;
    forbiddenBroadCheckCount: number;
  };
  criticalBlockers: string[];
  warnings: string[];
  changedFilesSinceLastPhaseLock: string[];
  requiredTargetedChecks: string[];
  forbiddenBroadChecks: string[];
  promoReadinessNotes: string[];
  validationResults: SectionResult[];
};

const REPORT_PATH = "agent/state/phase-one-lock.generated.json";
const failures: string[] = [];
const warnings: string[] = [];
const validationResults: SectionResult[] = [];

function gitOutput(args: string[]) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
}

function gitHeadCommit() {
  return gitOutput(["rev-parse", "HEAD"]);
}

function gitChangedFiles() {
  const output = execFileSync("git", ["status", "--porcelain=v1", "-z"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const entries = output.split("\0").filter(Boolean);
  const paths: string[] = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const status = entry.slice(0, 2);
    const filePath = entry.slice(3).replace(/\\/gu, "/");

    if (status[0] === "R" || status[0] === "C") {
      const renamedPath = entries[index + 1]?.replace(/\\/gu, "/");
      if (renamedPath) {
        paths.push(renamedPath);
      }
      index += 1;
      continue;
    }

    if (filePath.length > 0) {
      paths.push(filePath);
    }
  }

  return paths.sort((left, right) => left.localeCompare(right));
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    failures.push(message);
  }
}

function assertIncludes(source: string, expected: string, label: string) {
  assert(source.includes(expected), `${label} must include "${expected}".`);
}

function assertExcludes(source: string, forbidden: string, label: string) {
  assert(!source.includes(forbidden), `${label} must not include "${forbidden}".`);
}

function runSection(name: string, fn: () => void) {
  const start = failures.length;
  fn();
  validationResults.push({
    name,
    status: failures.length > start ? "fail" : "pass",
    failures: failures.slice(start),
  });
}

function readRequired(relativePath: string) {
  try {
    return readText(relativePath);
  } catch {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
}

const packageJson = readRequired("package.json");
const runtimeFactContract = readRequired("src/lib/runtime-facts/runtime-fact-contract.ts");
const runtimeFactNormalizer = readRequired("src/lib/runtime-facts/normalize-runtime-fact.ts");
const runtimeFactWriter = readRequired("src/lib/server/write-runtime-fact.ts");
const analyticsIngestIdentified = readRequired("src/app/api/analytics/ingest-identified/route.ts");
const analyticsIngestAnonymous = readRequired("src/app/api/analytics/ingest/route.ts");
const analyticsGovernance = readRequired("src/lib/server/analytics-governance.ts");
const analyticsMetrics = readRequired("src/lib/server/analytics-metrics.ts");
const materializerContract = readRequired("src/lib/analytics/materializers/materializer-contract.ts");
const materializerSourcePolicy = readRequired("src/lib/analytics/materializers/materializer-source-policy.ts");
const behavioralRuntime = readRequired("functions/src/behavioral-intelligence-runtime.ts");
const analyticsTruthRuntime = readRequired("functions/src/analytics-truth-runtime.ts");
const analyticsTruthCli = readRequired("functions/src/analytics-truth-cli.ts");
const behaviorRebuild = readRequired("scripts/rebuild-behavioral-intelligence.ts");
const analyticsRebuild = readRequired("scripts/rebuild-analytics-truth.ts");
const adminMaterializers = readRequired("src/lib/server/admin-analytics-materializers.ts");
const adminPageContract = readRequired("src/lib/admin/admin-page-data-contract.ts");
const adminPageLoader = readRequired("src/lib/server/admin-page-data-loader.ts");
const adminOverviewPage = readRequired("src/app/admin/page.tsx");
const adminUsersPage = readRequired("src/app/admin/users/page.tsx");
const adminUserPage = readRequired("src/app/admin/user/[userId]/page.tsx");
const adminAnalyticsPage = readRequired("src/app/admin/analytics/page.tsx");
const adminAnalyticsHelpers = readRequired("src/app/admin/analytics/AnalyticsHelpers.tsx");
const adminAnalyticsState = readRequired("src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx");
const adminAnalyticsAudienceTab = readRequired("src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx");
const adminAnalyticsCommerceTab = readRequired("src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx");
const adminAnalyticsOperationsTab = readRequired("src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx");
const adminOverviewContract = readRequired("src/lib/admin-overview.ts");
const adminAnalyticsContracts = readRequired("src/lib/admin-analytics-contracts.ts");
const adminTruthState = readRequired("src/lib/admin-truth-state.ts");
const adminTruthBadge = readRequired("src/components/Admin/AdminTruthBadge.tsx");
const adminMetricCard = readRequired("src/components/Admin/AdminMetricCard.tsx");
const adminStatsBar = readRequired("src/components/Admin/AdminStatsBar.tsx");
const adminModuleVerificationCard = readRequired("src/components/Admin/AdminModuleVerificationCard.tsx");
const debugPrimitives = readRequired("src/app/admin/debug/components/DebugPrimitives.tsx");
const aiHelpers = readRequired("src/app/admin/ai/AiHelpers.tsx");
const debugControlTowerTruth = readRequired("src/lib/admin/debug/control-tower-truth.ts");
const debugControlTowerLoader = readRequired("src/lib/server/admin-debug-control-tower-loader.ts");
const debugControlTowerRoute = readRequired("src/app/api/admin/debug/control-tower/route.ts");
const debugControlTower = readRequired("src/app/admin/debug/components/DebugControlTower.tsx");
const debugControlTowerTruthPanel = readRequired("src/app/admin/debug/components/DebugControlTowerBusinessTruth.tsx");
const debugRuntimeEvidenceGroups = readRequired("src/app/admin/debug/components/DebugRuntimeEvidenceGroups.tsx");
const debugTabNow = readRequired("src/app/admin/debug/components/DebugTabNow.tsx");
const debugApiRoute = readRequired("src/app/api/admin/debug/route.ts");
const adminDebugModelHelper = readRequired("src/lib/admin-debug-control-tower.ts");
const debugControlTowerCards = readRequired("src/app/admin/debug/components/DebugControlTowerCards.tsx");
const realtimePolicy = readRequired("src/lib/admin/admin-realtime-policy.ts");
const overviewRealtimeHook = readRequired("src/hooks/useAdminOverviewRealtime.ts");
const usersRealtimeHook = readRequired("src/hooks/useAdminUsersRealtime.ts");
const adminUsersRealtimeRoute = readRequired("src/app/api/admin/users/realtime/route.ts");
const adminAdminPage = readRequired("src/app/admin/page.tsx");
const adminLiveRuntime = readRequired("src/lib/admin-analytics-live-runtime.ts");
const generatedReportContract = readRequired("src/lib/agent-governance/generated-reports/generated-report-contract.ts");
const generatedReportAuthorityState = readRequired("agent/state/generated-report-authority.generated.json");
const generatedReportValidator = readRequired("scripts/agent/validate-generated-report-authority.ts");
const validatorAuthority = readRequired("agent/context/validator-authority.json");
const releaseNotesGenerator = readRequired("scripts/release/update-public-changelog.ts");
const releaseVersionContract = readRequired("src/lib/release-notes/release-version-contract.ts");
const releaseNoteClassifier = readRequired("src/lib/release-notes/release-note-classifier.ts");
const publicReleaseNotes = readRequired("src/lib/release-notes/public-release-notes.ts");
const publicReleaseNotesJson = readRequired("public/kandydrops-release-notes.json");
const privacyAwareScoring = readRequired("src/lib/behavioral/privacy-aware-scoring.ts");
const userBehaviorRollup = readRequired("src/lib/server/user-behavior-rollup.ts");
const userBehaviorTruthRollup = readRequired("src/lib/server/user-behavior-truth-rollup.ts");
const privacyConsent = readRequired("src/lib/privacy-consent.ts");
const telemetry = readRequired("src/lib/telemetry.ts");
const behavioralRuntimeFs = readRequired("functions/src/behavioral-intelligence-runtime.ts");
const importExportTruthPolicy = readRequired("src/lib/analytics/import-export-truth-policy.ts");
const rebuildAnalyticsTruthScript = readRequired("scripts/rebuild-analytics-truth.ts");
const rebuildBehavioralScript = readRequired("scripts/rebuild-behavioral-intelligence.ts");
const analyticsTruthCliFs = readRequired("functions/src/analytics-truth-cli.ts");
const bigQueryExport = readRequired("functions/src/analytics-bigquery-export.ts");
const chatLibrary = readRequired("src/lib/chat.ts");
const chatExperience = readRequired("src/components/Chat/ChatExperience.tsx");
const chatServer = readRequired("src/lib/server/chat.ts");
const paypalCapture = readRequired("src/app/api/paypal/capture/route.ts");
const dbTypes = readRequired("src/types/db.ts");
const telemetryCatalog = readRequired("src/lib/telemetry-catalog.ts");
const assetUploader = readRequired("src/components/Admin/AssetUploader.tsx");
const createDropModal = readRequired("src/components/Admin/CreateDropModal.tsx");
const storageRules = readRequired("storage.rules");
const uploadQueueHelper = readRequired("src/lib/uploads/asset-upload-queue.ts");
const uploadErrorCopy = readRequired("src/lib/uploads/upload-error-copy.ts");
const purchaseModal = readRequired("src/components/PurchaseModal.tsx");
const gumdropLedger = readRequired("src/lib/gumdrop-ledger.ts");
const gumdropEconomics = readRequired("src/lib/gumdrop-economics.ts");
const gumdropsPackages = readRequired("src/lib/gumdrops-packages.ts");
const platformEconomy = readRequired("src/lib/platform-economy.ts");
const paypalCreateRoute = readRequired("src/app/api/paypal/create/route.ts");
const paypalServer = readRequired("src/lib/server/paypal.ts");
const unlockRoute = readRequired("src/app/api/drops/unlock/route.ts");
const contentRoute = readRequired("src/app/api/drops/content/route.ts");
const requestGuard = readRequired("src/lib/server/request-guard.ts");
const requestOrigin = readRequired("src/lib/server/request-origin.ts");
const legacyRegistry = readRequired("src/lib/legacy/admin-analytics-legacy-registry.ts");
const canonicalUiFiles = [
  adminOverviewPage,
  adminUsersPage,
  adminUserPage,
  adminAnalyticsPage,
  adminAnalyticsHelpers,
  adminAnalyticsState,
  adminAnalyticsAudienceTab,
  adminAnalyticsCommerceTab,
  adminAnalyticsOperationsTab,
  adminOverviewContract,
  adminAnalyticsContracts,
  debugControlTower,
  debugControlTowerTruthPanel,
  debugRuntimeEvidenceGroups,
  debugTabNow,
  debugApiRoute,
  adminDebugModelHelper,
  debugControlTowerCards,
  chatExperience,
  purchaseModal,
  assetUploader,
  createDropModal,
  adminAdminPage,
  adminLiveRuntime,
  adminStatsBar,
  adminModuleVerificationCard,
  debugPrimitives,
  aiHelpers,
];

runSection("Runtime facts canonical", () => {
  assertIncludes(runtimeFactContract, "RuntimeFact", "Runtime fact contract");
  assertIncludes(runtimeFactContract, "actor: RuntimeFactActor", "Runtime fact contract");
  assertIncludes(runtimeFactContract, "target: RuntimeFactTarget", "Runtime fact contract");
  assertIncludes(runtimeFactContract, "sourceTruth", "Runtime fact contract");
  assertIncludes(runtimeFactContract, "confidence", "Runtime fact contract");
  assertIncludes(runtimeFactContract, "timestampMs", "Runtime fact contract");
  assertIncludes(runtimeFactContract, "route", "Runtime fact contract");
  assertIncludes(runtimeFactContract, "source_component", "Runtime fact contract");
  assertIncludes(runtimeFactContract, "normalizedAction", "Runtime fact contract");
  assertIncludes(runtimeFactNormalizer, "explainEventInclusion(", "Runtime fact normalizer");
  assertIncludes(runtimeFactNormalizer, "unknown_runtime_event", "Runtime fact normalizer");
  assertIncludes(runtimeFactNormalizer, "normalizeIdentifiedMetricEventFact", "Runtime fact normalizer");
  assertIncludes(runtimeFactNormalizer, "normalizeAnonymousRuntimeFact", "Runtime fact normalizer");
  assertIncludes(analyticsGovernance, 'runtimeFacts: "analytics_event_facts"', "Analytics governance");
  assertIncludes(analyticsIngestIdentified, "normalizeIdentifiedRuntimeFact", "Identified ingest");
  assertIncludes(analyticsIngestIdentified, "createRuntimeFactFirestoreDocument", "Identified ingest");
  assertIncludes(analyticsIngestIdentified, "ANALYTICS_CANONICAL_COLLECTIONS.runtimeFacts", "Identified ingest");
  assertExcludes(analyticsIngestIdentified, "normalizeIdentifiedMetricEventFact({", "Identified ingest");
  assertIncludes(analyticsIngestAnonymous, "normalizeAnonymousRuntimeFact", "Anonymous ingest");
  assertExcludes(analyticsIngestAnonymous, "event.semanticSurfaceKey || event.targetId || event.semanticScopeKey || event.type", "Anonymous ingest");
  assertIncludes(runtimeFactWriter, "rawEventName", "Runtime fact writer");
  assertIncludes(runtimeFactWriter, "actor: fact.actor", "Runtime fact writer");
  assertIncludes(runtimeFactWriter, "target: fact.target", "Runtime fact writer");
  assertIncludes(runtimeFactWriter, "normalizedActionName: fact.normalizedAction", "Runtime fact writer");
  assertIncludes(analyticsMetrics, "resolveFactActionName", "Analytics consumers");
  assertIncludes(analyticsMetrics, "fact.normalizedAction", "Analytics consumers");
  assertExcludes(analyticsMetrics, "rawEventName ===", "Analytics consumers");
  assertIncludes(packageJson, '"check:runtime-facts-cutover": "tsx scripts/agent/validate-runtime-facts-cutover.ts"', "package.json");
});

runSection("Materializers consume canonical facts", () => {
  assertIncludes(materializerContract, "CanonicalMaterializerEnvelope", "Materializer contract");
  assertIncludes(materializerContract, "generatedAt", "Materializer contract");
  assertIncludes(materializerContract, "freshnessState", "Materializer contract");
  assertIncludes(materializerContract, "sourceBreakdown", "Materializer contract");
  assertIncludes(materializerContract, "issues", "Materializer contract");
  assertIncludes(materializerSourcePolicy, "analytics_event_facts", "Materializer source policy");
  assertIncludes(materializerSourcePolicy, "analytics_metric_facts", "Materializer source policy");
  assertIncludes(materializerSourcePolicy, "legacy_page_duration", "Materializer source policy");
  assertIncludes(materializerSourcePolicy, "raw_client_event_names", "Materializer source policy");
  assertExcludes(behavioralRuntime, "switch (eventName)", "Behavioral materializer");
  assertIncludes(behavioralRuntime, 'return ""', "Behavioral materializer");
  assertIncludes(behavioralRuntime, "sourceBreakdown", "Behavioral materializer");
  assertIncludes(behavioralRuntime, "generatedAt", "Behavioral materializer");
  assertIncludes(behavioralRuntime, "freshnessState", "Behavioral materializer");
  assertIncludes(behavioralRuntime, "issues", "Behavioral materializer");
  assertIncludes(behavioralRuntime, 'recommendationCardState: "fallback-limited"', "Behavioral materializer");
  assertIncludes(behavioralRuntime, 'recommendationCardCap: 3', "Behavioral materializer");
  assertIncludes(analyticsTruthRuntime, "sourceBreakdown", "Analytics truth materializer");
  assertIncludes(analyticsTruthRuntime, "generatedAt", "Analytics truth materializer");
  assertIncludes(analyticsTruthRuntime, "freshnessState", "Analytics truth materializer");
  assertIncludes(analyticsTruthRuntime, "issues", "Analytics truth materializer");
  assertExcludes(analyticsTruthRuntime, 'rawEventName ===', "Analytics truth runtime");
  assertIncludes(analyticsTruthCli, "canonicalFactInputs", "Analytics truth CLI");
  assertIncludes(analyticsTruthCli, "analytics_metric_facts", "Analytics truth CLI");
  assertIncludes(analyticsTruthCli, "blockedInputs", "Analytics truth CLI");
  assertIncludes(behaviorRebuild, "materializerOutputContract", "Behavioral rebuild");
  assertIncludes(analyticsRebuild, "materializerOutputContract", "Analytics rebuild");
  assertIncludes(adminMaterializers, "sourcePolicy", "Admin analytics materializers");
  assertIncludes(packageJson, '"check:materializers-cutover": "tsx scripts/agent/validate-materializers-cutover.ts"', "package.json");
});

runSection("Admin pages use canonical snapshots/rollups", () => {
  assertIncludes(adminPageContract, "AdminOverviewPageData", "Admin page contract");
  assertIncludes(adminPageContract, "AdminUserDetailPageData", "Admin page contract");
  assertIncludes(adminPageLoader, "buildAdminOverviewPageData", "Admin page loader");
  assertIncludes(adminPageLoader, "buildAdminUsersPageData", "Admin page loader");
  assertIncludes(adminPageLoader, "buildAdminUserDetailPageData", "Admin page loader");
  assertIncludes(adminOverviewContract, "truthSnapshot?: AdminUserTruthSnapshot", "Admin overview contract");
  assertIncludes(readRequired("src/app/api/admin/overview/route.ts"), "truthSnapshot: userTruthSnapshot", "Admin overview route");
  assertIncludes(readRequired("src/app/api/admin/users/route.ts"), "truthSnapshot", "Admin users route");
  assertIncludes(readRequired("src/app/api/admin/user/[userId]/route.ts"), "behaviorTruthRollup", "Per-user route");
  assertIncludes(adminOverviewPage, "buildAdminOverviewPageData", "Admin overview page");
  assertIncludes(adminOverviewPage, "pageData.truthLabel", "Admin overview page");
  assertIncludes(adminOverviewPage, "pageData.platformPulse", "Admin overview page");
  assertExcludes(adminOverviewPage, "const serverUpdateLabel =", "Admin overview page");
  assertExcludes(adminOverviewPage, "const truthLabel =", "Admin overview page");
  assertIncludes(adminUsersPage, "buildAdminUsersPageData", "Admin users page");
  assertIncludes(adminUsersPage, "pageData.kpiCards", "Admin users page");
  assertIncludes(adminUsersPage, "pageData.subtitle", "Admin users page");
  assertIncludes(adminUsersPage, "summary?.truthSnapshot", "Admin users page");
  assertIncludes(adminUserPage, "buildAdminUserDetailPageData", "Admin user page");
  assertIncludes(adminUserPage, "pageData.commerce", "Admin user page");
  assertIncludes(adminUserPage, "pageData.behavior", "Admin user page");
  assertIncludes(adminUserPage, "behaviorTruthRollup", "Admin user page");
  for (const inlineFormula of [
    "const purchaseTransactions =",
    "purchaseTransactions.reduce(",
    "const totalSpentUsd =",
    "const adjustedProfitUsd =",
    "const bonusValueUsd =",
    "const bonusGumDrops =",
    "const paypalFeeUsd =",
    "const netRevenueUsd =",
    "const deliveredGumDrops =",
    "const effectiveUsdPer100Gd =",
    "const averageOrderUsd =",
  ]) {
    assertExcludes(adminUserPage, inlineFormula, "Per-user admin page");
  }
  assertIncludes(adminAnalyticsContracts, "ADMIN_ANALYTICS_MODULE_CONTRACT_REGISTRY", "Admin analytics contracts");
  assertIncludes(adminAnalyticsState, "resolveAdminAnalyticsDisplayState", "Admin analytics state");
  assertIncludes(adminAnalyticsState, "resolveAdminAnalyticsWaitingCopy", "Admin analytics state");
  assertIncludes(adminAnalyticsPage, "useAdminAnalyticsState", "Admin analytics page");
  for (const source of [adminAnalyticsHelpers, adminAnalyticsAudienceTab, adminAnalyticsCommerceTab, adminAnalyticsOperationsTab]) {
    assertExcludes(source, "const conversionRate =", "Admin analytics tab/helper");
    assertExcludes(source, "const returnedUsers =", "Admin analytics tab/helper");
    assertExcludes(source, "const watchTime", "Admin analytics tab/helper");
  }
  assertIncludes(packageJson, '"check:admin-pages-cutover": "tsx scripts/agent/validate-admin-pages-cutover.ts"', "package.json");
});

runSection("Admin UI primitives use shared badges and cards", () => {
  assertIncludes(adminMetricCard, "export function AdminMetricCard", "Admin metric card");
  assertIncludes(adminMetricCard, "truthState: AdminTruthState", "Admin metric card");
  assertIncludes(adminMetricCard, "hasUsableValue: boolean", "Admin metric card");
  assertIncludes(adminMetricCard, "AdminTruthBadge", "Admin metric card");
  assertExcludes(adminMetricCard, "?? 0", "Admin metric card");
  assertExcludes(adminMetricCard, "|| 0", "Admin metric card");
  assertIncludes(adminTruthState, "confidenceThreshold", "Admin truth state");
  assertIncludes(adminTruthState, "resolveAdminInputTruthState", "Admin truth state");
  assertIncludes(adminTruthState, "resolveAdminVerificationTruthState", "Admin truth state");
  assertIncludes(adminTruthBadge, "pendingInitialLoad", "Admin truth badge");
  assertIncludes(adminTruthBadge, "hasUsableValue", "Admin truth badge");
  for (const source of [adminStatsBar, adminModuleVerificationCard, debugPrimitives, aiHelpers]) {
    assertExcludes(source, "coerceAdminTruthState(", "Admin truth primitive consumer");
    assertExcludes(source, "resolveAdminTruthState(", "Admin truth primitive consumer");
  }
  assertIncludes(adminStatsBar, "AdminMetricCard", "Admin stats bar");
  assertIncludes(adminModuleVerificationCard, "resolveAdminVerificationTruthState", "Admin module verification card");
  assertIncludes(debugPrimitives, "resolveAdminInputTruthState", "Debug primitives");
  assertIncludes(aiHelpers, "resolveAdminInputTruthState", "AI helpers");
  assertIncludes(aiHelpers, "AdminMetricCard", "AI helpers");
  assertExcludes(adminAnalyticsHelpers, "resolveAdminTruthState(", "Admin analytics helpers");
  assertIncludes(packageJson, '"check:admin-ui-primitives-cutover": "tsx scripts/agent/validate-admin-ui-primitives-cutover.ts"', "package.json");
});

runSection("Debug control tower reads canonical truth only", () => {
  assertIncludes(debugControlTowerTruth, "resolveControlTowerBusinessTruthState", "Debug control tower truth");
  assertIncludes(debugControlTowerTruth, "groupRuntimeEvidenceByFingerprintAndSource", "Debug control tower truth");
  assertIncludes(debugControlTowerTruth, "CONTROL_TOWER_BUSINESS_CONFIDENCE_THRESHOLD = 80", "Debug control tower truth");
  assertIncludes(debugControlTowerLoader, "loadAdminDebugControlTower", "Debug control tower loader");
  assertIncludes(debugControlTowerLoader, "readAdminUserTruthSnapshot", "Debug control tower loader");
  assertIncludes(debugControlTowerLoader, "buildAdminDebugControlTowerModel", "Debug control tower loader");
  assertIncludes(debugControlTowerLoader, "businessSnapshot", "Debug control tower loader");
  assertIncludes(debugControlTowerLoader, "businessTruthState", "Debug control tower loader");
  assertIncludes(debugControlTowerLoader, "runtimeEvidenceGroups", "Debug control tower loader");
  assertIncludes(debugControlTowerLoader, "reportFreshnessState", "Debug control tower loader");
  assertIncludes(debugControlTowerRoute, "loadAdminDebugControlTower", "Debug control tower route");
  assertIncludes(debugControlTowerRoute, "const model = await loadAdminDebugControlTower({ evidenceLimit: 60 });", "Debug control tower route");
  assertExcludes(debugControlTowerRoute, "listRecentDebugEvidence({ limit: 60 })", "Debug control tower route");
  assertExcludes(debugControlTowerRoute, "buildAdminDebugControlTowerModel({", "Debug control tower route");
  assertIncludes(debugControlTower, "resolvedBusinessSnapshot = model?.businessSnapshot ?? businessSnapshot ?? null", "Debug control tower component");
  assertIncludes(debugControlTower, "resolveControlTowerBusinessTruthState", "Debug control tower component");
  assertIncludes(debugControlTower, 'data-debug-report-freshness={model?.reportFreshnessState ?? "unknown"}', "Debug control tower component");
  assertIncludes(debugControlTower, "DebugControlTowerBusinessTruth", "Debug control tower component");
  assertIncludes(debugControlTower, "DebugRuntimeEvidenceGroups", "Debug control tower component");
  assertIncludes(debugControlTowerTruthPanel, "Canonical Business Truth", "Debug business truth panel");
  assertIncludes(debugControlTowerTruthPanel, "do not inherit ops-health status", "Debug business truth panel");
  assertIncludes(debugControlTowerTruthPanel, "businessSnapshot.issues.length > 0", "Debug business truth panel");
  assertIncludes(debugRuntimeEvidenceGroups, "Runtime Evidence Groups", "Debug runtime evidence groups");
  assertIncludes(debugRuntimeEvidenceGroups, "grouped by fingerprint and source", "Debug runtime evidence groups");
  assertIncludes(debugRuntimeEvidenceGroups, "<details", "Debug runtime evidence groups");
  assertIncludes(debugTabNow, "resolveControlTowerBusinessTruthState(adminUserTruthSnapshot)", "Debug tab now");
  assertIncludes(debugTabNow, "<DebugControlTower businessSnapshot={adminUserTruthSnapshot} />", "Debug tab now");
  assertExcludes(debugTabNow, "function businessTruthState", "Debug tab now");
  assertIncludes(debugApiRoute, "readAdminUserTruthSnapshot", "Debug route");
  assertIncludes(debugApiRoute, "const adminUserTruthSnapshot = await readAdminUserTruthSnapshot({", "Debug route");
  assertIncludes(debugApiRoute, "adminUserTruthSnapshot,", "Debug route");
  assertExcludes(debugApiRoute, "@/lib/server/analytics-metrics", "Debug route");
  assertExcludes(debugApiRoute, "@/lib/server/admin-analytics-shared", "Debug route");
  assertExcludes(debugApiRoute, "@/lib/admin-analytics-live-runtime", "Debug route");
  assertIncludes(adminDebugModelHelper, "businessSnapshot: AdminUserTruthSnapshot | null", "Debug model helper");
  assertIncludes(adminDebugModelHelper, "businessTruthState: AdminTruthState", "Debug model helper");
  assertIncludes(adminDebugModelHelper, "runtimeEvidenceGroups: AdminDebugRuntimeEvidenceGroup[]", "Debug model helper");
  assertIncludes(adminDebugModelHelper, "reportFreshnessState:", "Debug model helper");
  assertIncludes(debugControlTowerCards, "Raw support/user bodies stay redacted and collapsed.", "Debug control tower cards");
  assertIncludes(debugControlTowerCards, "<details", "Debug control tower cards");
  assertIncludes(debugControlTowerCards, "<summary", "Debug control tower cards");
  assertIncludes(packageJson, '"check:debug-control-tower-cutover": "tsx scripts/agent/validate-debug-control-tower-cutover.ts"', "package.json");
});

runSection("Realtime admin routes cannot override snapshot business metrics", () => {
  assertIncludes(realtimePolicy, "ADMIN_OVERVIEW_REALTIME_POLICY", "Realtime policy");
  assertIncludes(realtimePolicy, "ADMIN_USERS_REALTIME_POLICY", "Realtime policy");
  assertIncludes(realtimePolicy, "ADMIN_ANALYTICS_REALTIME_POLICY", "Realtime policy");
  assertIncludes(realtimePolicy, 'purpose: "operational_pulse_only"', "Realtime policy");
  assertIncludes(realtimePolicy, 'businessTruthSource: "refresh_based_hot_cache"', "Realtime policy");
  assertIncludes(realtimePolicy, "snapshotRefreshCadenceMs: 60_000", "Realtime policy");
  assertIncludes(realtimePolicy, "heartbeatIntervalMs: 25_000", "Realtime policy");
  assertIncludes(realtimePolicy, "costRisk:", "Realtime policy");
  assertIncludes(realtimePolicy, "explicitCostJustification", "Realtime policy");
  assertIncludes(overviewRealtimeHook, "refreshInterval: ADMIN_OVERVIEW_REALTIME_POLICY.snapshotRefreshCadenceMs", "Admin overview realtime hook");
  assertIncludes(overviewRealtimeHook, "stats: serverData.stats", "Admin overview realtime hook");
  assertIncludes(overviewRealtimeHook, "deltas: serverData.deltas", "Admin overview realtime hook");
  assertIncludes(overviewRealtimeHook, "topDrops: serverData.topDrops", "Admin overview realtime hook");
  for (const forbidden of ["grossRevenueCents:", "totalUnwraps:", "liveDrops:", "totalDrops:", "...realtimeData,"]) {
    assertExcludes(overviewRealtimeHook, forbidden, "Admin overview realtime hook");
  }
  assertIncludes(overviewRealtimeHook, "Operational transaction pulse is delayed. Showing verified snapshot totals.", "Admin overview realtime hook");
  assertIncludes(overviewRealtimeHook, "Operational commerce pulse is delayed. Showing verified snapshot totals.", "Admin overview realtime hook");
  assertIncludes(overviewRealtimeHook, "metricScope: ADMIN_OVERVIEW_REALTIME_POLICY.metricScope", "Admin overview realtime hook");
  assertIncludes(overviewRealtimeHook, "businessTruthSource: ADMIN_OVERVIEW_REALTIME_POLICY.businessTruthSource", "Admin overview realtime hook");
  assertIncludes(usersRealtimeHook, "payload.metricScope !== ADMIN_USERS_REALTIME_POLICY.metricScope", "Admin users realtime hook");
  assertIncludes(usersRealtimeHook, "Realtime pulse failed. Showing the last verified snapshot.", "Admin users realtime hook");
  assertIncludes(usersRealtimeHook, "Realtime pulse is delayed. Showing the last verified snapshot.", "Admin users realtime hook");
  for (const requiredRouteField of [
    "purpose: ADMIN_USERS_REALTIME_POLICY.purpose",
    "owner: ADMIN_USERS_REALTIME_POLICY.owner",
    "cadenceMs: ADMIN_USERS_REALTIME_POLICY.heartbeatIntervalMs",
    "cadenceMs: ADMIN_USERS_REALTIME_POLICY.snapshotRefreshCadenceMs",
    "costRisk: ADMIN_USERS_REALTIME_POLICY.costRisk",
    "metricScope: ADMIN_USERS_REALTIME_POLICY.metricScope",
  ]) {
    assertIncludes(adminUsersRealtimeRoute, requiredRouteField, "Admin users realtime route");
  }
  assertIncludes(adminUsersPage, "snapshotRefreshState", "Admin users page");
  assertIncludes(adminUsersPage, "useAdminUsersRealtime(", "Admin users page");
  assertIncludes(adminUsersPage, 'data-admin-users-snapshot-state', "Admin users page");
  assertIncludes(adminUsersPage, 'data-admin-users-pulse-state', "Admin users page");
  assertIncludes(adminAdminPage, "buildAdminOverviewPageData", "Admin overview page");
  assertIncludes(adminAdminPage, "useAdminOverview()", "Admin overview page");
  assertIncludes(adminLiveRuntime, "ADMIN_ANALYTICS_REALTIME_SCOPE = ADMIN_ANALYTICS_REALTIME_POLICY.metricScope", "Admin analytics live runtime");
  assertIncludes(adminLiveRuntime, "Canonical business totals stay on refresh-based snapshots.", "Admin analytics live runtime");
  assertIncludes(packageJson, '"check:admin-realtime-cutover": "tsx scripts/agent/validate-admin-realtime-cutover.ts"', "package.json");
});

runSection("Generated reports cannot be imported by runtime", () => {
  assertIncludes(generatedReportContract, "GENERATED_REPORT_DEFAULT_STALE_HOURS", "Generated report contract");
  assertIncludes(generatedReportContract, "GENERATED_REPORT_AUTHORITY_STATE_PATH", "Generated report contract");
  assertIncludes(generatedReportContract, "GENERATED_REPORT_RUNTIME_FORBIDDEN_ROOTS", "Generated report contract");
  assertIncludes(generatedReportContract, "GENERATED_REPORT_SCAN_ROOTS", "Generated report contract");
  assertIncludes(generatedReportValidator, "Generated reports are evidence snapshots only and never runtime business truth.", "Generated report validator");
  assertIncludes(generatedReportValidator, "Runtime src/app, src/components, and src/lib/server business logic must not import or read agent-generated report artifacts.", "Generated report validator");
  assertIncludes(generatedReportAuthorityState, '"runtimeViolationCount": 0', "Generated report authority state");
  assertIncludes(generatedReportAuthorityState, '"doctrineOverrideViolationCount": 0', "Generated report authority state");
  const runtimeImportPattern = /\b(?:import\s*\(\s*|require\(\s*|from\s+|readFileSync\(\s*|readText\(\s*|readJsonFile\(\s*)["'][^"']*agent\/(?:state|index|context)\//u;
  const runtimeRoots = ["src/app", "src/components", "src/lib/server"];
  const runtimeViolations: string[] = [];
  for (const root of runtimeRoots) {
    for (const repoPath of walkDirectoryFiles(root).filter((candidate) => /\.(?:ts|tsx|js|jsx|mjs|cjs)$/u.test(candidate))) {
      const source = readRequired(repoPath);
      if (runtimeImportPattern.test(source)) {
        runtimeViolations.push(`${repoPath} must not import or read generated report artifacts from agent/.`);
      }
    }
  }
  assert(runtimeViolations.length === 0, runtimeViolations.join(" | ") || "Runtime must not import generated reports.");
  assertIncludes(packageJson, '"check:generated-report-authority": "tsx scripts/agent/validate-generated-report-authority.ts"', "package.json");
  assertIncludes(packageJson, '"check:phase-one-lock": "tsx scripts/agent/validate-phase-one-lock.ts"', "package.json");
});

runSection("Validators are classified in validator authority", () => {
  assertIncludes(validatorAuthority, '"scripts/agent/validate-phase-one-lock.ts"', "Validator authority");
  assertIncludes(validatorAuthority, '"check:phase-one-lock"', "Validator authority");
  assertIncludes(validatorAuthority, '"scripts/agent/validate-generated-report-authority.ts"', "Validator authority");
  assertIncludes(validatorAuthority, '"scripts/agent/validate-validator-authority.ts"', "Validator authority");
  assertIncludes(validatorAuthority, '"check:generated-report-authority"', "Validator authority");
  assertIncludes(validatorAuthority, '"check:validator-authority"', "Validator authority");
});

runSection("Release notes skip generated/audit churn and cannot loop", () => {
  assertIncludes(releaseNotesGenerator, "release-note-classifier", "Release notes generator");
  assertIncludes(releaseNotesGenerator, "PUBLIC_BETA_ACCEPT_RELEASE", "Release notes generator");
  assertIncludes(releaseNotesGenerator, "\\[skip release-notes\\]", "Release notes generator");
  assertIncludes(releaseNotesGenerator, "No product-facing unreleased commits found for an accepted beta release.", "Release notes generator");
  assertIncludes(releaseNotesGenerator, "renderReleaseVersionContract", "Release notes generator");
  for (const forbidden of ["--numstat", "additions:", "deletions:", "effectiveChangeCount", "PublicReleaseBumpType", "bumpPublicVersion", "classifyPublicVersionBump"]) {
    assertExcludes(releaseNotesGenerator, forbidden, "Release notes generator");
  }
  assertIncludes(releaseNoteClassifier, "USER_FACING_RELEASE_SURFACE_CATEGORIES", "Release note classifier");
  assertIncludes(releaseNoteClassifier, "isInternalReliabilityPath", "Release note classifier");
  assertIncludes(releaseNoteClassifier, "Improved Beta updates and version visibility", "Release note classifier");
  assertIncludes(releaseNoteClassifier, "Reduced stale or repeated release-note copy in the visible Beta feed.", "Release note classifier");
  assertIncludes(publicReleaseNotes, "PUBLIC_RELEASE_NOTES_FALLBACK", "Public release notes fallback");
  assertIncludes(publicReleaseNotes, "betaReleaseCounter: PUBLIC_RELEASE_NOTES_FALLBACK.betaReleaseCounter", "Public release notes fallback");
  assertIncludes(publicReleaseNotesJson, '"channel": "beta"', "Public release notes JSON");
  assertIncludes(packageJson, '"check:release-notes-cutover": "tsx scripts/agent/validate-release-notes-cutover.ts"', "package.json");
});

runSection("Privacy-limited data is not scored as zero", () => {
  assertIncludes(privacyAwareScoring, "PRIVACY_LIMITED_ENGAGEMENT_SCORE_FLOOR = 24", "Privacy-aware scoring");
  assertIncludes(privacyAwareScoring, "PRIVACY_LIMITED_VALUE_SCORE_FLOOR = 22", "Privacy-aware scoring");
  assertIncludes(privacyAwareScoring, "PRIVACY_LIMITED_RECOMMENDATION_CONFIDENCE_CAP = 0.34", "Privacy-aware scoring");
  assertIncludes(privacyAwareScoring, "capRecommendationConfidenceByDataAvailability", "Privacy-aware scoring");
  assertIncludes(privacyConsent, '"privacy_limited_identified_analytics_denied"', "Privacy consent");
  assertIncludes(privacyConsent, '"privacy_limited_global_privacy_control"', "Privacy consent");
  assertIncludes(userBehaviorRollup, "applyPrivacyAwareEngagementFloor", "User behavior rollup");
  assertIncludes(userBehaviorRollup, "applyPrivacyAwareValueFloor", "User behavior rollup");
  assertIncludes(userBehaviorRollup, '"Privacy limited"', "User behavior rollup");
  assertIncludes(userBehaviorRollup, "dataAvailabilityReason: privacyAvailabilityReason", "User behavior rollup");
  assertIncludes(userBehaviorTruthRollup, "capRecommendationConfidenceByDataAvailability", "User behavior truth rollup");
  assertIncludes(userBehaviorTruthRollup, "dataAvailabilityReason: rollup.dataAvailabilityReason", "User behavior truth rollup");
  assertIncludes(telemetry, "privacy_data_availability_reason", "Telemetry");
  assertIncludes(telemetry, "identified_analytics_allowed", "Telemetry");
  assertIncludes(telemetry, "metric_exclusion_reason", "Telemetry");
  assertIncludes(telemetry, "privacy_exclusion_reason", "Telemetry");
  assertIncludes(behavioralRuntimeFs, "PRIVACY_LIMITED_RECOMMENDATION_CONFIDENCE_CAP = 0.34", "Behavioral runtime");
  assertIncludes(behavioralRuntimeFs, 'recommendationState = !consentAvailability', "Behavioral runtime");
  assertIncludes(behavioralRuntimeFs, 'recommendationCardState: recommendationState === "profile-driven" ? "profile-driven" : "fallback-limited"', "Behavioral runtime");
  assertIncludes(behavioralRuntimeFs, "dataAvailabilityReason: consentAvailability === 0", "Behavioral runtime");
  assertIncludes(importExportTruthPolicy, 'ANALYTICS_IMPORT_EXPORT_TRUTH_CLASS = "analytics_evidence_only"', "Import/export truth policy");
  assertIncludes(importExportTruthPolicy, '"runtime_transactions"', "Import/export truth policy");
  assertIncludes(importExportTruthPolicy, '"runtime_subscriptions"', "Import/export truth policy");
  assertIncludes(importExportTruthPolicy, '"runtime_support_messages"', "Import/export truth policy");
  assertIncludes(importExportTruthPolicy, "idempotentImportRequired: true", "Import/export truth policy");
  assertIncludes(importExportTruthPolicy, "runtimeImportBlocked: true", "Import/export truth policy");
  assertIncludes(rebuildAnalyticsTruthScript, "CANONICAL_FACT_IMPORT_TARGETS", "Analytics rebuild script");
  assertIncludes(rebuildAnalyticsTruthScript, "FORBIDDEN_RUNTIME_MUTATION_SURFACES", "Analytics rebuild script");
  assertIncludes(rebuildBehavioralScript, "CANONICAL_FACT_IMPORT_TARGETS", "Behavioral rebuild script");
  assertIncludes(rebuildBehavioralScript, "FORBIDDEN_RUNTIME_MUTATION_SURFACES", "Behavioral rebuild script");
  assertIncludes(analyticsTruthCliFs, '"runtime_transactions"', "Analytics truth CLI");
  assertIncludes(analyticsTruthCliFs, '"runtime_subscriptions"', "Analytics truth CLI");
  assertIncludes(analyticsTruthCliFs, '"runtime_support_messages"', "Analytics truth CLI");
  assertIncludes(bigQueryExport, '"runtime_transactions"', "BigQuery export");
  assertIncludes(bigQueryExport, '"runtime_subscriptions"', "BigQuery export");
  assertIncludes(bigQueryExport, '"runtime_support_messages"', "BigQuery export");
  assertIncludes(packageJson, '"check:privacy-import-export-cutover": "tsx scripts/agent/validate-privacy-import-export-cutover.ts"', "package.json");
});

runSection("Chat paid-GD guidance is present and shell constants unchanged", () => {
  assertIncludes(chatExperience, 'export const CHAT_VIEWPORT_SHELL_CLASSNAME =', "Chat experience");
  assertIncludes(chatExperience, '"mx-auto box-border flex h-full max-h-full min-h-0 w-full max-w-6xl flex-1 overflow-hidden px-3 sm:px-4"', "Chat experience");
  assertIncludes(chatExperience, "const chatViewportShellStyle = useMemo", "Chat experience");
  assertIncludes(chatExperience, "const chatTranscriptStyle = useMemo", "Chat experience");
  assertIncludes(chatExperience, "CHAT_THREAD_COMPOSER_PADDING_BOTTOM", "Chat experience");
  assertIncludes(chatExperience, "Follow creators to start chatting", "Chat experience");
  assertIncludes(chatExperience, "Find creators", "Chat experience");
  assertIncludes(chatExperience, "Browse drops", "Chat experience");
  assertIncludes(chatExperience, "recommendedCreators", "Chat experience");
  assertIncludes(chatExperience, "buildChatPaidGdGateState", "Chat experience");
  assertIncludes(chatExperience, "chat_paid_gd_gate_viewed", "Chat experience");
  assertIncludes(chatExperience, "openPurchaseModal(resolveChatPaidGdPurchaseTarget", "Chat experience");
  assertIncludes(chatExperience, 'router.push("/drops")', "Chat experience");
  assertIncludes(chatExperience, 'placeholder={composerBlockedByPaidGdGate ? "Paid GumDrops required for creator messaging"', "Chat experience");
  assertIncludes(chatLibrary, "purchasedBalanceGd", "Chat library");
  assertExcludes(chatLibrary, "totalGd", "Chat library");
  assertIncludes(chatLibrary, "subscriberFreeChatApplies", "Chat library");
  assertIncludes(chatLibrary, "creatorViewerBypass", "Chat library");
  assertIncludes(dbTypes, "chatPaidGdLowBalanceReminder", "Database types");
  assertIncludes(chatServer, "chat_low_paid_gd_reminder_sent", "Chat server");
  assertIncludes(chatServer, "eligibleAgain", "Chat server");
  assertIncludes(paypalCapture, "chatPaidGdLowBalanceReminder", "PayPal capture");
  assertIncludes(paypalCapture, "chat_low_paid_gd_reminder_reset", "PayPal capture");
  assertIncludes(paypalCapture, "sourceAwareBalance.purchased < 100 && nextSourceAwareBalance.purchased >= 100", "PayPal capture");
  assertIncludes(chatServer, 'errorCode: "insufficient_paid_gumdrops"', "Chat server");
  for (const eventName of [
    "chat_no_followed_creators_prompt_viewed",
    "chat_no_followed_creators_cta_clicked",
    "chat_paid_gd_gate_viewed",
    "chat_paid_gd_gate_primary_clicked",
    "chat_paid_gd_gate_secondary_clicked",
    "chat_low_paid_gd_reminder_sent",
    "chat_low_paid_gd_reminder_reset",
    "chat_thread_auto_created_or_resolved",
  ]) {
    assertIncludes(telemetryCatalog, `eventName: "${eventName}"`, "Telemetry catalog");
  }
  assertIncludes(packageJson, '"check:chat-paid-gumdrops-guidance": "tsx scripts/agent/validate-chat-paid-gumdrops-guidance.ts"', "package.json");
});

runSection("Drop uploader uses uploadStatus/uploadProgress and no fake pending", () => {
  assertIncludes(assetUploader, "uploadStatus: UploadStatus", "AssetUploader");
  assertIncludes(assetUploader, "uploadProgress: number", "AssetUploader");
  assertIncludes(assetUploader, "uploadErrorCode?: string", "AssetUploader");
  assertIncludes(assetUploader, 'data-upload-mobile-density="compact-v2"', "AssetUploader");
  assertIncludes(assetUploader, 'data-upload-sprawl-reduction="target-50"', "AssetUploader");
  assertIncludes(assetUploader, "data-upload-status={asset.uploadStatus}", "AssetUploader");
  assertIncludes(assetUploader, "data-upload-progress-mode={asset.uploadProgressMode}", "AssetUploader");
  assertIncludes(assetUploader, 'data-upload-error-code={asset.uploadErrorCode || ""}', "AssetUploader");
  assertIncludes(assetUploader, "snapshot.bytesTransferred", "AssetUploader");
  assertIncludes(assetUploader, "state_changed", "AssetUploader");
  assertIncludes(assetUploader, "Uploading ${asset.uploadProgress}%", "AssetUploader");
  assertIncludes(assetUploader, 'trackEvent("asset_upload_progress_checkpoint"', "AssetUploader");
  assertIncludes(assetUploader, "filter(isUploadedAssetSuccess)", "AssetUploader");
  assertIncludes(assetUploader, "Retry", "AssetUploader");
  assertIncludes(assetUploader, "isDirectFirebaseUploadBlocked", "AssetUploader");
  assertExcludes(assetUploader, "uploading: boolean", "AssetUploader");
  assertExcludes(assetUploader, "Pending...", "AssetUploader");
  assertIncludes(createDropModal, "onUploadStateChange={onCoverUploadStateChange}", "CreateDropModal");
  assertIncludes(createDropModal, "onUploadStateChange={onContentUploadStateChange}", "CreateDropModal");
  assertIncludes(createDropModal, 'serverUploadEndpoint={mode === "creator" ? "/api/creator/drops/assets" : "/api/admin/content"}', "CreateDropModal");
  assertIncludes(storageRules, "match /drops/{allPaths=**}", "storage.rules");
  assertIncludes(storageRules, "allow write: if false", "storage.rules");
  assertExcludes(storageRules, "allow write: if isSignedIn()", "storage.rules");
  assertIncludes(uploadQueueHelper, "UPLOAD_PROGRESS_CHECKPOINTS = [25, 50, 75, 100]", "Upload queue helper");
  assertIncludes(uploadQueueHelper, "DEFAULT_UPLOAD_CONCURRENCY = 2", "Upload queue helper");
  assertIncludes(uploadQueueHelper, "DEFAULT_VIDEO_UPLOAD_CONCURRENCY = 1", "Upload queue helper");
  assertIncludes(uploadQueueHelper, "upload_queue_stalled", "Upload queue helper");
  assertIncludes(uploadQueueHelper, "upload_stalled", "Upload queue helper");
  assertIncludes(uploadErrorCopy, "upload_permission_denied", "Upload error copy");
  assertIncludes(uploadErrorCopy, "server_unauthorized", "Upload error copy");
  assertIncludes(uploadErrorCopy, "Upload stalled. Check connection and retry.", "Upload error copy");
  assertIncludes(telemetryCatalog, "asset_upload_queued", "Telemetry catalog");
  assertIncludes(telemetryCatalog, "asset_upload_progress_checkpoint", "Telemetry catalog");
  assertIncludes(telemetryCatalog, "asset_upload_retry_clicked", "Telemetry catalog");
  assertIncludes(telemetryCatalog, "asset_upload_canceled", "Telemetry catalog");
  assertIncludes(packageJson, '"check:drop-asset-upload-progress": "tsx scripts/agent/validate-drop-asset-upload-progress.ts"', "package.json");
});

runSection("Storage upload paths are rules-validated or server-uploaded", () => {
  assertIncludes(assetUploader, "resolveUploadPath(folder, serverUploadEndpoint)", "AssetUploader");
  assertIncludes(assetUploader, "uploadPath === \"server\"", "AssetUploader");
  assertIncludes(assetUploader, "isDirectFirebaseUploadBlocked(folder, uploadPath)", "AssetUploader");
  assertIncludes(assetUploader, "Direct upload is blocked for this folder. Use the guarded admin or creator upload route instead of Firebase client writes.", "AssetUploader");
  assertIncludes(storageRules, "allow read: if false", "storage.rules");
  assertIncludes(storageRules, "allow write: if false", "storage.rules");
});

runSection("Wallet paid/free source truth remains intact", () => {
  assertIncludes(purchaseModal, 'data-wallet-density="public-beta-compact"', "Purchase modal");
  assertIncludes(purchaseModal, 'data-wallet-balance-chip="split-source"', "Purchase modal");
  assertIncludes(purchaseModal, 'data-wallet-package-subcopy="removed"', "Purchase modal");
  assertIncludes(purchaseModal, 'data-wallet-bonus-chip-theme="brand-purple"', "Purchase modal");
  assertIncludes(purchaseModal, "resolveWalletBalanceSplit(userProfile)", "Purchase modal");
  assertIncludes(purchaseModal, "formatCompactGd(walletBalanceSplit.freeGd)} free GD", "Purchase modal");
  assertIncludes(purchaseModal, "formatCompactGd(walletBalanceSplit.paidGd)} paid GD", "Purchase modal");
  assertExcludes(purchaseModal, "paid +", "Purchase modal");
  assertIncludes(purchaseModal, "PayPalButtons", "Purchase modal");
  assertIncludes(purchaseModal, "fundingSource={FUNDING.PAYPAL}", "Purchase modal");
  assertIncludes(purchaseModal, "forceReRender={[selectedPriceKey, String(selectedPackage.drops), selectedPackage.label]}", "Purchase modal");
  assertIncludes(gumdropLedger, "paidGumDrops", "Gumdrop ledger");
  assertIncludes(gumdropLedger, "bonusGumDrops", "Gumdrop ledger");
  assertIncludes(gumdropLedger, "gumDropsRewardBalance", "Gumdrop ledger");
  assertIncludes(gumdropLedger, "readSourceAwareBalance", "Gumdrop ledger");
  assertIncludes(gumdropLedger, "buildSourceAwareBalancePatch", "Gumdrop ledger");
  assertIncludes(gumdropEconomics, "paidGumDrops", "Gumdrop economics");
  assertIncludes(gumdropEconomics, "bonusGumDrops", "Gumdrop economics");
  assertIncludes(gumdropEconomics, "grossRevenueCents", "Gumdrop economics");
  assertIncludes(gumdropsPackages, "FIXED_GUMDROP_PACKAGES", "Gumdrops packages");
  assertIncludes(gumdropsPackages, "resolveExpectedGumdropPrice", "Gumdrops packages");
  assertIncludes(platformEconomy, "paidBaseGd", "Platform economy");
  assertIncludes(platformEconomy, "paidBonusGd", "Platform economy");
  assertIncludes(platformEconomy, "rewardPromoGd", "Platform economy");
  assertIncludes(platformEconomy, "purchasedBalanceCreditGd", "Platform economy");
  assertIncludes(platformEconomy, "rewardBalanceCreditGd", "Platform economy");
  assertIncludes(paypalCreateRoute, "guardApiRequest", "PayPal create route");
  assertIncludes(paypalCreateRoute, "requireTrustedOrigin: true", "PayPal create route");
  assertIncludes(paypalCreateRoute, "resolveExpectedGumdropPrice", "PayPal create route");
  assertIncludes(paypalServer, "getPayPalAccessToken", "PayPal server");
  assertIncludes(paypalServer, "createPayPalOrder", "PayPal server");
  assertIncludes(paypalServer, "capturePayPalOrder", "PayPal server");
  assertIncludes(paypalCapture, "buildPaidPurchaseBalanceCredit", "PayPal capture");
  assertIncludes(paypalCapture, "purchaseCredit.purchasedCreditGumDrops", "PayPal capture");
  assertIncludes(paypalCapture, "paymentLocks", "PayPal capture");
  assertIncludes(packageJson, '"check:wallet-density": "tsx scripts/agent/validate-wallet-density.ts"', "package.json");
  assertIncludes(packageJson, '"check:wallet-single-paypal-button": "tsx scripts/agent/validate-wallet-single-paypal-button.ts"', "package.json");
  assertIncludes(packageJson, '"check:payment-unlock-security": "tsx scripts/agent/validate-payment-unlock-security.ts"', "package.json");
});

runSection("Server purchase/unlock truth remains primary", () => {
  assertIncludes(paypalCapture, 'sourceTruth: "server_purchase_transaction"', "PayPal capture");
  assertIncludes(paypalCapture, "sourceAwareBalance.purchased", "PayPal capture");
  assertIncludes(paypalCapture, "buildSourceAwareBalancePatch(nextSourceAwareBalance)", "PayPal capture");
  assertIncludes(paypalCapture, "chat_low_paid_gd_reminder_reset", "PayPal capture");
  assertIncludes(unlockRoute, "sourceTruth: \"server\"", "Unlock route");
  assertIncludes(unlockRoute, "entitlementId", "Unlock route");
  assertIncludes(unlockRoute, "buildCompletedGumdropTransaction", "Unlock route");
  assertIncludes(unlockRoute, "spendSourceAwareGumdrops", "Unlock route");
  assertIncludes(contentRoute, "Cache-Control\", \"private, no-store\"", "Content route");
  assertIncludes(contentRoute, "hasUnlockedDrop", "Content route");
  assertIncludes(contentRoute, "You do not own this content", "Content route");
  assertIncludes(requestGuard, "if (options.requireTrustedOrigin && !hasTrustedSiteOrigin(request))", "Request guard");
  assertIncludes(requestOrigin, "hasTrustedSiteOrigin", "Request origin");
  assertIncludes(requestOrigin, "trustedOrigins", "Request origin");
  assertIncludes(requestOrigin, "trustedHosts", "Request origin");
  assertIncludes(platformEconomy, "sourceTruth: \"platform_economy\"", "Platform economy");
  assertIncludes(gumdropLedger, "verifiedServerSide === false", "Gumdrop ledger");
  assertIncludes(gumdropLedger, "sourceTruth.startsWith(\"client\")", "Gumdrop ledger");
});

runSection("No blocked legacy path is imported by canonical UI", () => {
  const forbiddenLegacyPaths = [
    "src/lib/admin-overview.ts",
    "src/lib/admin-analytics-live-runtime.ts",
    "src/lib/server/analytics-metrics.ts",
  ];
  for (const source of canonicalUiFiles) {
    for (const blockedPath of forbiddenLegacyPaths) {
      assertExcludes(source, blockedPath, "Canonical UI");
    }
  }
  assertIncludes(legacyRegistry, 'classification: "blocked"', "Legacy registry");
  assertIncludes(legacyRegistry, "src/lib/admin-analytics-live-runtime.ts", "Legacy registry");
  assertIncludes(legacyRegistry, 'classification: "legacy_fallback"', "Legacy registry");
  assertIncludes(legacyRegistry, "src/lib/server/analytics-metrics.ts", "Legacy registry");
  assertIncludes(legacyRegistry, 'classification: "adapter"', "Legacy registry");
  assertIncludes(legacyRegistry, "src/lib/admin-overview.ts", "Legacy registry");
});

const generatedAt = nowIso();
const sourceCommit = gitHeadCommit();

function buildReport(changedFilesSinceLastPhaseLock: string[]): PhaseOneLockReport {
  const status = failures.length > 0 ? "fail" : "pass";

  return {
    reportKey: "phase-one-lock",
    generatedAt,
    sourceCommit,
    freshness: deriveGeneratedReportFreshness({
      generatedAt,
      nowMs: Date.parse(generatedAt),
    }),
    status,
    summary: {
      sectionCount: validationResults.length,
      passedSectionCount: validationResults.filter((section) => section.status === "pass").length,
      failedSectionCount: validationResults.filter((section) => section.status === "fail").length,
      criticalBlockerCount: failures.length,
      warningCount: warnings.length,
      changedFileCount: changedFilesSinceLastPhaseLock.length,
      requiredTargetedCheckCount: 15,
      forbiddenBroadCheckCount: 6,
    },
    criticalBlockers: [...failures],
    warnings: [...warnings],
    changedFilesSinceLastPhaseLock,
    requiredTargetedChecks: [
      "npm run check:runtime-facts-cutover",
      "npm run check:materializers-cutover",
      "npm run check:admin-pages-cutover",
      "npm run check:admin-ui-primitives-cutover",
      "npm run check:debug-control-tower-cutover",
      "npm run check:admin-realtime-cutover",
      "npm run check:generated-report-authority",
      "npm run check:validator-authority",
      "npm run check:release-notes-cutover",
      "npm run check:privacy-import-export-cutover",
      "npm run check:chat-paid-gumdrops-guidance",
      "npm run check:drop-asset-upload-progress",
      "npm run check:wallet-density",
      "npm run check:wallet-single-paypal-button",
      "npm run check:payment-unlock-security",
    ],
    forbiddenBroadChecks: [
      "npm run check",
      "npx vitest run",
      "playwright",
      "cypress",
      "lighthouse",
      "firebase deploy",
    ],
    promoReadinessNotes:
      status === "pass"
        ? [
            "Phase 1 has one truth gate and it is sealed.",
            "Promote only after rerunning the targeted checks if any file in the covered surfaces changes again.",
            "Generated reports remain evidence snapshots; runtime must not import them.",
          ]
        : [
            "Phase 1 is not promo-ready until the critical blockers are cleared.",
          ],
    validationResults,
  };
}

const provisionalReport = buildReport([]);
writeJsonFile(REPORT_PATH, provisionalReport as unknown as Json);

const changedFilesSinceLastPhaseLock = gitChangedFiles();
const report = buildReport(changedFilesSinceLastPhaseLock);

writeJsonFile(REPORT_PATH, report as unknown as Json);

if (failures.length > 0) {
  console.error("Phase One lock validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Phase One lock validation passed.");
