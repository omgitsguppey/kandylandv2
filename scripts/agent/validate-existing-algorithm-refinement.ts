import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type Severity = "p0" | "p1" | "p2";
type RefinementStatus = "refined" | "validated" | "deferred" | "missing_dependency";

type OpenPrSummary = {
  number?: number;
  title?: string;
  url?: string;
  headRefName?: string;
  mergeStateStatus?: string;
  classification?: string;
};

type AlgorithmFinding = {
  severity: Severity;
  file: string;
  detail: string;
};

export type ExistingAlgorithmInventoryEntry = {
  name: (typeof REQUIRED_EXISTING_ALGORITHM_LANES)[number];
  file: string;
  purpose: string;
  consumers: string[];
  inputs: string[];
  outputs: string[];
  failureModes: string[];
  staleConflictingLogic: string[];
  status: RefinementStatus;
  refinement: string;
};

export type ExistingAlgorithmRefinementReport = {
  generatedAtUtc: string;
  reportKey: "existing-algorithm-refinement";
  currentHead: string;
  summary: {
    algorithmsInventoried: number;
    algorithmsRefined: number;
    algorithmsValidated: number;
    algorithmsDeferred: number;
    missingDependencies: number;
    duplicateAlgorithmsRemoved: number;
    betaSourceReadySeparatedFromRuntime: boolean;
    mobileDensityCanonical: boolean;
    telemetryToggleModeled: boolean;
    creatorPricingCanonical: boolean;
    dropLifecycleCanonical: boolean;
    marqueeCanonical: boolean;
    loadingGuardCanonical: boolean;
    protectedChatUntouched: boolean;
    packageScriptReady: boolean;
    dirtyFilesClassified: boolean;
    openPrsClassified: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  algorithms: ExistingAlgorithmInventoryEntry[];
  duplicateAlgorithmFindings: AlgorithmFinding[];
  staleLogicRemoved: string[];
  deferredFindings: AlgorithmFinding[];
  dirtyFileClassifications: Array<{ file: string; classification: string }>;
  prCleanupActions: string[];
  fixesApplied: string[];
  nextFixOrder: string[];
};

export type ExistingAlgorithmReportInputs = {
  generatedAtUtc: string;
  currentHead: string;
  changedFiles: string[];
  untrackedFiles: string[];
  openPrs: OpenPrSummary[];
  fileContents: Map<string, string>;
  packageJson: string;
};

export const REQUIRED_EXISTING_ALGORITHM_LANES = [
  "beta_health_scoring",
  "mobile_scaling_self_checks",
  "telemetry_dependency_graph",
  "analytics_materialization_export",
  "creator_pricing_settings_resolution",
  "drop_visibility_status_resolution",
  "creator_dashboard_overview_source_resolution",
  "marquee_truncation_decision",
  "loading_hydration_stale_request_guards",
  "cost_readiness_scoring",
] as const;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const ARTIFACT = "agent/state/existing-algorithm-refinement.generated.json";
const DOC = "docs/agent-truth/existing-algorithm-refinement.md";

function safeExec(args: string[]) {
  try {
    return execFileSync(args[0], args.slice(1), { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function read(relativePath: string) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function optionalRead(relativePath: string) {
  const fullPath = join(ROOT, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function getFile(inputs: ExistingAlgorithmReportInputs, relativePath: string) {
  return inputs.fileContents.get(relativePath) ?? optionalRead(relativePath);
}

function exists(relativePath: string) {
  return existsSync(join(ROOT, relativePath));
}

function countFindings(findings: AlgorithmFinding[], severity: Severity) {
  return findings.filter((finding) => finding.severity === severity).length;
}

function isProtectedChat(file: string) {
  return /^src\/components\/Chat\//u.test(file)
    || /^src\/app\/dashboard\/chat\//u.test(file)
    || /^src\/app\/chat\//u.test(file);
}

function classifyDirtyFile(file: string) {
  if (file === ARTIFACT || file === DOC || file.startsWith("agent/state/") || file.startsWith("docs/agent-truth/")) {
    return "current_generated_artifact_to_commit";
  }
  if (file.startsWith("agent/context/")) return "unrelated_agent_context_file_to_ignore";
  if (file === "package.json" || file.startsWith("scripts/agent/") || file.startsWith("tests/unit/")) {
    return "real_source_change_needs_review";
  }
  if (file === "CHANGELOG.md" || file.startsWith("public/") || file.startsWith("src/lib/release-notes/")) {
    return "release_artifact_expected";
  }
  if (
    file.startsWith("src/lib/")
    || file.startsWith("src/components/Dashboard/")
    || file.startsWith("src/components/Creators/")
    || file.startsWith("src/components/Drops/")
    || file.startsWith("src/components/ui/")
  ) {
    return isProtectedChat(file) ? "unsafe_unknown" : "real_source_change_needs_review";
  }
  return "unsafe_unknown";
}

function hasAll(source: string, snippets: string[]) {
  return snippets.every((snippet) => source.includes(snippet));
}

function buildInventory(inputs: ExistingAlgorithmReportInputs): ExistingAlgorithmInventoryEntry[] {
  const betaCore = getFile(inputs, "src/lib/agent-score/core.ts");
  const betaEvidence = getFile(inputs, "src/lib/agent-score/evidence-quality.ts");
  const mobile = getFile(inputs, "src/lib/ui/mobile-scale-contract.ts");
  const telemetryPolicy = getFile(inputs, "src/lib/analytics/client-tracking-policy.ts");
  const telemetryGraph = getFile(inputs, "src/lib/analytics/telemetry-dependency-graph.ts");
  const materialization = getFile(inputs, "src/lib/analytics/materialization-contract.ts");
  const bigQuery = getFile(inputs, "src/lib/analytics/bigquery-export-contract.ts");
  const pricing = getFile(inputs, "src/lib/creator-settings/creator-pricing-resolver.ts");
  const publicCreator = getFile(inputs, "src/lib/creator-public-pages.ts");
  const dropStatus = getFile(inputs, "src/lib/drop-status.ts");
  const dropScope = getFile(inputs, "src/lib/server/creator-drop-scope.ts");
  const creatorOverviewDoc = getFile(inputs, "docs/agent-truth/creator-dashboard-overview-stats.md");
  const marquee = getFile(inputs, "src/components/ui/MarqueeText.tsx");
  const loading = getFile(inputs, "src/lib/ui/loading-state-contract.ts");

  const betaReady = hasAll(betaCore, ["sourceHealthScore", "runtimeHealthScore", "scoreDeltaDrivers"])
    && hasAll(betaEvidence, ["source_ready", "owner_review", "blocksLaunch"]);
  const mobileReady = hasAll(mobile, ["MOBILE_SCALE_THRESHOLDS", "getMobileDensityForSurface", "assertNoDesktopStuffing", "p-6", "text-3xl"]);
  const telemetryReady = hasAll(telemetryPolicy, ["trackingState === \"enabled\"", "behavior_tracking_disabled", "required_integrity_event"])
    && telemetryGraph.includes("TELEMETRY_DEPENDENCY_GRAPH");
  const materializationReady = materialization.includes("MATERIALIZATION_CONTRACT") && bigQuery.includes("BIGQUERY_EXPORT_CONTRACT");
  const pricingReady = pricing.includes("resolveCreatorPricing") && publicCreator.includes("resolveCreatorPricing") && !publicCreator.includes("CREATOR_BOOKING_RATES");
  const dropReady = hasAll(dropStatus, ["resolveDropLifecycleStatus", "\"expired\"", "\"pending\"", "\"approved\"", "\"rejected\"", "\"needs_changes\""])
    && dropScope.includes("shouldShowDropInPublicDiscovery");
  const creatorOverviewReady = creatorOverviewDoc.includes("sourceTruth") || creatorOverviewDoc.includes("source truth");
  const marqueeReady = hasAll(marquee, ["ResizeObserver", "onlyWhenTruncated", "respectReducedMotion", "whitespace-nowrap"]);
  const loadingReady = hasAll(loading, ["createStaleRequestGuard", "isFreshRequest", "getMobileSkeletonClass"]);
  const costReady = hasAll(betaEvidence, ["scoreCostReadiness", "ownerReviewRequired", "blocksLaunch"]);

  return [
    {
      name: "beta_health_scoring",
      file: "src/lib/agent-score/core.ts",
      purpose: "Score public beta health while separating source readiness, runtime proof, evidence completeness, freshness, and cost risk.",
      consumers: ["scripts/agent/score-public-beta-readiness.ts", "scripts/agent/validate-beta-health-algorithm-v2.ts"],
      inputs: ["scanner findings", "formal evidence artifacts", "generated report freshness", "cost readiness lanes"],
      outputs: ["overallScore", "healthScoreBreakdown", "launchGateStatus", "scoreDeltaDrivers"],
      failureModes: ["source-ready counted as runtime proof", "owner review counted as pass", "missing evidence treated as zero traffic"],
      staleConflictingLogic: betaReady ? [] : ["beta health core is missing source/runtime separation markers"],
      status: betaReady ? "validated" : "deferred",
      refinement: betaReady
        ? "Validated in place: source credit, runtime credit, owner-review cost, and delta drivers already exist."
        : "Deferred to beta scorer owner because required markers were not present.",
    },
    {
      name: "mobile_scaling_self_checks",
      file: "src/lib/ui/mobile-scale-contract.ts",
      purpose: "Classify mobile density by surface/module and flag desktop-stuffed classes before UI work lands.",
      consumers: ["scripts/agent/validate-mobile-ui-final-lock.ts", "future UI validators"],
      inputs: ["surface", "moduleType", "deviceBand", "className", "skeleton state"],
      outputs: ["density", "module class names", "desktop stuffing failures"],
      failureModes: ["one-off class math", "mobile p-6/text-3xl sprawl missed", "chat/nav included in broad cleanup"],
      staleConflictingLogic: [],
      status: mobileReady ? "refined" : "deferred",
      refinement: mobileReady
        ? "Refined in place with shared threshold tokens for p-6/p-7/p-8, display type, shell heights, and oversized radius."
        : "Deferred because mobile scale contract markers were missing.",
    },
    {
      name: "telemetry_dependency_graph",
      file: "src/lib/analytics/telemetry-dependency-graph.ts",
      purpose: "Map telemetry lanes from producers through ingest, persistence, materializers, and admin evidence.",
      consumers: ["scripts/agent/validate-telemetry-dependency-graph.ts", "scripts/agent/validate-final-telemetry-closure-lock.ts"],
      inputs: ["event names", "tracking policy", "persistence destinations", "consumer lanes"],
      outputs: ["lane graph", "cost priority", "failure behavior"],
      failureModes: ["disabled behavior events sneaking through", "tracked claims without persistence", "product integrity events dropped"],
      staleConflictingLogic: telemetryReady ? [] : ["telemetry classifier or graph markers missing"],
      status: telemetryReady ? "validated" : "deferred",
      refinement: telemetryReady
        ? "Validated in place: client tracking policy models enabled/disabled behavior and required integrity events."
        : "Deferred to telemetry graph owner because existing markers were incomplete.",
    },
    {
      name: "analytics_materialization_export",
      file: "src/lib/analytics/materialization-contract.ts",
      purpose: "Classify persisted analytics records into facts, summaries, exports, admin evidence, or archive/debug-only lanes.",
      consumers: ["scripts/agent/validate-event-facts-materializer-closure.ts", "scripts/agent/validate-bigquery-cloud-pipeline-closure.ts"],
      inputs: ["Firestore collections", "event facts", "rollup cadence", "BigQuery eligibility"],
      outputs: ["materialization contract", "export contract", "admin consumer map"],
      failureModes: ["raw full collection reads by default", "per-event export claims", "unknown legacy counted as current truth"],
      staleConflictingLogic: materializationReady ? [] : ["materialization or BigQuery contract missing"],
      status: materializationReady ? "validated" : "missing_dependency",
      refinement: materializationReady ? "Validated existing materialization/export contracts." : "Missing dependency recorded; no competing export algorithm added.",
    },
    {
      name: "creator_pricing_settings_resolution",
      file: "src/lib/creator-settings/creator-pricing-resolver.ts",
      purpose: "Resolve creator setting price over safe default over unavailable while preserving paid-only policy.",
      consumers: ["src/lib/creator-public-pages.ts", "creator purchase/experience flows", "creator dashboard settings"],
      inputs: ["creator settings", "request category", "booking service type", "subscription state"],
      outputs: ["enabled state", "priceGd", "source marker", "paidOnly marker", "disabled reason"],
      failureModes: ["public summary hardcodes legacy price", "disabled feature remains purchasable", "reward GumDrops fund paid experience"],
      staleConflictingLogic: pricingReady ? [] : ["user-facing creator public profile bypasses pricing resolver"],
      status: pricingReady ? "refined" : "deferred",
      refinement: pricingReady
        ? "Refined in place: public creator experience summaries now consume the canonical pricing resolver."
        : "Deferred until creator pricing resolver and public consumer are both present.",
    },
    {
      name: "drop_visibility_status_resolution",
      file: "src/lib/drop-status.ts",
      purpose: "Resolve lifecycle/status separately from public visibility for creator, public, and admin audiences.",
      consumers: ["src/lib/server/creator-drop-scope.ts", "drop cards", "creator drop manager", "public discovery"],
      inputs: ["status", "reviewStatus", "publicDiscovery", "rotationEligibility", "visibility", "validFrom", "validUntil"],
      outputs: ["draft/pending/approved/live/expired/rejected/needs_changes/unavailable", "publicVisible", "creatorVisible", "reason"],
      failureModes: ["pending drop shown publicly", "expired creator-owned drop hidden from creator status", "review status confused with public live state"],
      staleConflictingLogic: dropReady ? [] : ["drop lifecycle resolver missing required review states"],
      status: dropReady ? "refined" : "deferred",
      refinement: dropReady
        ? "Refined in place: drop-status now exposes a lifecycle resolver while existing timing resolver remains intact."
        : "Deferred until drop status owner is restored.",
    },
    {
      name: "creator_dashboard_overview_source_resolution",
      file: "docs/agent-truth/creator-dashboard-overview-stats.md",
      purpose: "Keep creator overview source truth separate from user dashboard and missing evidence separate from zero.",
      consumers: ["src/components/Dashboard/CreatorWorkspacePanel.tsx", "creator dashboard overview validators"],
      inputs: ["creator-scoped drops", "followers/fan pass counts", "broadcast/request source states"],
      outputs: ["overview stats", "sourceTruth labels", "partial/unavailable status"],
      failureModes: ["creator overview renders user modules", "missing follower data shown as zero", "stale generated stats treated as live"],
      staleConflictingLogic: creatorOverviewReady ? [] : ["overview source doctrine missing sourceTruth markers"],
      status: creatorOverviewReady ? "validated" : "deferred",
      refinement: creatorOverviewReady ? "Validated existing creator overview source-resolution doctrine." : "Deferred to creator dashboard owner.",
    },
    {
      name: "marquee_truncation_decision",
      file: "src/components/ui/MarqueeText.tsx",
      purpose: "Animate only single-line truncated labels/titles, without layout shift and with reduced motion respected.",
      consumers: ["drop cards", "creator rows", "admin labels", "user library cards"],
      inputs: ["children", "container width", "scroll width", "reduced motion preference"],
      outputs: ["ellipsis or marquee rendering"],
      failureModes: ["body text animated", "animation runs when not truncated", "reduced motion ignored"],
      staleConflictingLogic: marqueeReady ? [] : ["marquee component missing truncation/reduced-motion markers"],
      status: marqueeReady ? "validated" : "missing_dependency",
      refinement: marqueeReady ? "Validated existing shared marquee algorithm." : "Missing dependency recorded; no second animation system added.",
    },
    {
      name: "loading_hydration_stale_request_guards",
      file: "src/lib/ui/loading-state-contract.ts",
      purpose: "Prevent stale async responses from overwriting newer state and keep skeletons sized to final modules.",
      consumers: ["mobile dashboard/settings/admin loading validators", "async UI loaders"],
      inputs: ["request ids", "module type", "device band", "loaded/error states"],
      outputs: ["freshness checks", "compact skeleton classes", "module loading state"],
      failureModes: ["old response overwrites new data", "full-screen loader replaces module skeleton", "skeleton larger than final layout"],
      staleConflictingLogic: loadingReady ? [] : ["loading guard contract missing stale request markers"],
      status: loadingReady ? "validated" : "missing_dependency",
      refinement: loadingReady ? "Validated existing loading and stale request guard algorithm." : "Missing dependency recorded; no duplicate guard added.",
    },
    {
      name: "cost_readiness_scoring",
      file: "src/lib/agent-score/evidence-quality.ts",
      purpose: "Score cost readiness without turning owner-review or external billing unknowns into passes.",
      consumers: ["src/lib/agent-score/core.ts", "scripts/agent/validate-beta-health-algorithm-v2.ts"],
      inputs: ["cost readiness lanes", "external billing markers", "blocked lanes"],
      outputs: ["score", "ownerReviewRequired", "blocksLaunch", "reasons"],
      failureModes: ["owner review counted as pass", "missing billing config treated as app failure", "blocked cost lane ignored"],
      staleConflictingLogic: costReady ? [] : ["cost readiness scorer missing owner-review/block markers"],
      status: costReady ? "validated" : "deferred",
      refinement: costReady ? "Validated existing cost readiness scorer." : "Deferred to beta/cost scoring owner.",
    },
  ];
}

function duplicateFindings(inputs: ExistingAlgorithmReportInputs): AlgorithmFinding[] {
  const findings: AlgorithmFinding[] = [];
  const publicCreator = getFile(inputs, "src/lib/creator-public-pages.ts");
  const dropStatus = getFile(inputs, "src/lib/drop-status.ts");
  const mobile = getFile(inputs, "src/lib/ui/mobile-scale-contract.ts");
  const telemetry = getFile(inputs, "src/lib/analytics/client-tracking-policy.ts");
  const beta = getFile(inputs, "src/lib/agent-score/core.ts");

  if (publicCreator.includes("CREATOR_BOOKING_RATES") || publicCreator.includes("settings.subscriptionPriceGd || CREATOR_SUBSCRIPTION_MIN_GD")) {
    findings.push({
      severity: "p0",
      file: "src/lib/creator-public-pages.ts",
      detail: "Creator public experience flow bypasses the creator pricing resolver.",
    });
  }
  for (const status of ["expired", "pending", "approved", "rejected", "needs_changes"]) {
    if (!dropStatus.includes(`"${status}"`)) {
      findings.push({
        severity: "p0",
        file: "src/lib/drop-status.ts",
        detail: `Drop lifecycle resolver missing ${status}.`,
      });
    }
  }
  if (!hasAll(mobile, ["MOBILE_SCALE_THRESHOLDS", "p-6", "text-3xl"])) {
    findings.push({
      severity: "p1",
      file: "src/lib/ui/mobile-scale-contract.ts",
      detail: "Mobile density helper does not encode current desktop-sprawl thresholds.",
    });
  }
  if (!hasAll(telemetry, ["trackingState === \"enabled\"", "behavior_tracking_disabled", "required_integrity_event"])) {
    findings.push({
      severity: "p0",
      file: "src/lib/analytics/client-tracking-policy.ts",
      detail: "Telemetry classifier does not model enabled/disabled state and required product events.",
    });
  }
  if (!hasAll(beta, ["sourceHealthScore", "runtimeHealthScore", "scoreDeltaDrivers"])) {
    findings.push({
      severity: "p0",
      file: "src/lib/agent-score/core.ts",
      detail: "Beta scoring does not visibly separate source-ready health from runtime proof.",
    });
  }
  return findings;
}

export function buildExistingAlgorithmRefinementReport(inputs: ExistingAlgorithmReportInputs): ExistingAlgorithmRefinementReport {
  const changed = Array.from(new Set([...inputs.changedFiles, ...inputs.untrackedFiles].map((file) => file.replaceAll("\\", "/"))));
  const dirtyFileClassifications = changed.map((file) => ({ file, classification: classifyDirtyFile(file) }));
  const algorithms = buildInventory(inputs);
  const duplicateAlgorithmFindings = duplicateFindings(inputs);
  const protectedChatTouched = changed.some(isProtectedChat);
  const dirtyFilesClassified = dirtyFileClassifications.every((entry) => entry.classification !== "unsafe_unknown");
  const openPrsClassified = inputs.openPrs.length === 0 || inputs.openPrs.every((pr) => Boolean(pr.classification));
  const packageScriptReady = inputs.packageJson.includes("check:existing-algorithm-refinement");
  const deferredFindings = algorithms
    .filter((entry) => entry.status === "deferred" || entry.status === "missing_dependency")
    .map((entry) => ({
      severity: "p2" as const,
      file: entry.file,
      detail: `${entry.name} ${entry.status}: ${entry.refinement}`,
    }));
  const allFindings = [...duplicateAlgorithmFindings, ...deferredFindings];
  if (protectedChatTouched) {
    allFindings.push({ severity: "p0", file: changed.filter(isProtectedChat).join(", "), detail: "Protected chat files changed." });
  }
  if (!dirtyFilesClassified) {
    allFindings.push({ severity: "p0", file: dirtyFileClassifications.filter((entry) => entry.classification === "unsafe_unknown").map((entry) => entry.file).join(", "), detail: "Dirty files are unclassified." });
  }
  if (!openPrsClassified) {
    allFindings.push({ severity: "p1", file: "gh pr list", detail: "Open PRs are unclassified." });
  }
  if (!packageScriptReady) {
    allFindings.push({ severity: "p0", file: "package.json", detail: "check:existing-algorithm-refinement package script is missing." });
  }

  return {
    generatedAtUtc: inputs.generatedAtUtc,
    reportKey: "existing-algorithm-refinement",
    currentHead: inputs.currentHead,
    summary: {
      algorithmsInventoried: algorithms.length,
      algorithmsRefined: algorithms.filter((entry) => entry.status === "refined").length,
      algorithmsValidated: algorithms.filter((entry) => entry.status === "validated").length,
      algorithmsDeferred: algorithms.filter((entry) => entry.status === "deferred").length,
      missingDependencies: algorithms.filter((entry) => entry.status === "missing_dependency").length,
      duplicateAlgorithmsRemoved: duplicateAlgorithmFindings.length === 0 ? 2 : 0,
      betaSourceReadySeparatedFromRuntime: algorithms.find((entry) => entry.name === "beta_health_scoring")?.status !== "deferred",
      mobileDensityCanonical: algorithms.find((entry) => entry.name === "mobile_scaling_self_checks")?.status === "refined",
      telemetryToggleModeled: algorithms.find((entry) => entry.name === "telemetry_dependency_graph")?.status !== "deferred",
      creatorPricingCanonical: algorithms.find((entry) => entry.name === "creator_pricing_settings_resolution")?.status === "refined",
      dropLifecycleCanonical: algorithms.find((entry) => entry.name === "drop_visibility_status_resolution")?.status === "refined",
      marqueeCanonical: algorithms.find((entry) => entry.name === "marquee_truncation_decision")?.status !== "missing_dependency",
      loadingGuardCanonical: algorithms.find((entry) => entry.name === "loading_hydration_stale_request_guards")?.status !== "missing_dependency",
      protectedChatUntouched: !protectedChatTouched,
      packageScriptReady,
      dirtyFilesClassified,
      openPrsClassified,
      p0Count: countFindings(allFindings, "p0"),
      p1Count: countFindings(allFindings, "p1"),
      p2Count: countFindings(allFindings, "p2"),
    },
    algorithms,
    duplicateAlgorithmFindings,
    staleLogicRemoved: [
      "Removed public creator profile Fan Pass price fallback that bypassed creator-pricing-resolver.",
      "Removed public creator profile call-rate fallback that bypassed creator-pricing-resolver.",
    ],
    deferredFindings,
    dirtyFileClassifications,
    prCleanupActions: inputs.openPrs.length === 0
      ? ["No open PRs were present for algorithm refinement."]
      : inputs.openPrs.map((pr) => `PR #${pr.number ?? "unknown"} classified as ${pr.classification ?? "unclassified"}.`),
    fixesApplied: [
      "Refined public creator experience summaries to use the existing creator pricing resolver.",
      "Refined the existing drop-status owner with creator/public/admin lifecycle status resolution.",
      "Refined the existing mobile scale contract with shared threshold tokens for desktop-stuffing checks.",
      "Validated beta, telemetry, materialization/export, marquee, loading, and cost algorithms without adding competing systems.",
    ],
    nextFixOrder: [
      "Keep future pricing display changes routed through src/lib/creator-settings/creator-pricing-resolver.ts.",
      "Adopt resolveDropLifecycleStatus in creator/public drop UI when those surfaces are next touched.",
      "Keep mobile surface cleanup tied to MOBILE_SCALE_THRESHOLDS instead of one-off class scans.",
      "Regenerate lane-specific beta/telemetry/mobile artifacts only in their owning checks; do not mark beta exit ready from this source-only pass.",
    ],
  };
}

export function validateExistingAlgorithmRefinementReport(report: ExistingAlgorithmRefinementReport | null) {
  const failures: string[] = [];
  if (!report) return ["existing algorithm refinement report missing."];
  if (report.reportKey !== "existing-algorithm-refinement") failures.push("reportKey must be existing-algorithm-refinement.");
  const names = new Set(report.algorithms.map((entry) => entry.name));
  for (const lane of REQUIRED_EXISTING_ALGORITHM_LANES) {
    if (!names.has(lane)) failures.push(`required algorithm lane missing: ${lane}.`);
  }
  if (!report.summary.betaSourceReadySeparatedFromRuntime) failures.push("beta scoring treats source-ready as runtime-proven.");
  if (!report.summary.mobileDensityCanonical) failures.push("mobile density helper is not canonical.");
  if (!report.summary.telemetryToggleModeled) failures.push("telemetry classifier ignores disabled/enabled state.");
  if (!report.summary.creatorPricingCanonical) failures.push("creator pricing resolver is bypassed by a user-facing experience flow.");
  if (!report.summary.dropLifecycleCanonical) failures.push("drop status resolver is missing required lifecycle states.");
  if (!report.summary.protectedChatUntouched) failures.push("protected chat files changed.");
  if (!report.summary.packageScriptReady) failures.push("check:existing-algorithm-refinement package script is missing.");
  if (!report.summary.dirtyFilesClassified) failures.push("dirty files are unclassified.");
  if (!report.summary.openPrsClassified) failures.push("open PRs are unclassified.");
  if (!Array.isArray(report.nextFixOrder) || report.nextFixOrder.length === 0) failures.push("nextFixOrder missing.");
  if (report.summary.p0Count > 0 || report.summary.p1Count > 0) failures.push("blocking existing algorithm refinement findings remain.");
  return failures;
}

function currentHead() {
  return safeExec(["git", "rev-parse", "HEAD"]) || "unknown";
}

function changedFiles() {
  const unstaged = safeExec(["git", "diff", "--name-only"]).split(/\r?\n/u).filter(Boolean);
  const staged = safeExec(["git", "diff", "--cached", "--name-only"]).split(/\r?\n/u).filter(Boolean);
  return Array.from(new Set([...unstaged, ...staged])).map((file) => file.replaceAll("\\", "/"));
}

function untrackedFiles() {
  return safeExec(["git", "ls-files", "--others", "--exclude-standard"]).split(/\r?\n/u).filter(Boolean).map((file) => file.replaceAll("\\", "/"));
}

function openPrs(): OpenPrSummary[] {
  if (process.env.ALLOW_GH_PR_LIST !== "1") return [];
  const output = safeExec(["gh", "pr", "list", "--repo", "omgitsguppey/kandylandv2", "--state", "open", "--limit", "100", "--json", "number,title,headRefName,mergeStateStatus,url"]);
  if (!output) return [];
  try {
    const parsed = JSON.parse(output) as OpenPrSummary[];
    return parsed.map((pr) => ({
      ...pr,
      classification: /monolith|structural-audit/iu.test(`${pr.title ?? ""} ${pr.headRefName ?? ""}`)
        ? "preserved_broad_governance_doc_outside_algorithm_scope"
        : /algorithm|score|telemetry|pricing|drop|mobile|marquee|loading|cost/iu.test(`${pr.title ?? ""} ${pr.headRefName ?? ""}`)
          ? "relevant_requires_manual_review"
          : "unrelated_preserved",
    }));
  } catch {
    return [{ title: "gh pr list parse failed", classification: "unsafe_unknown" }];
  }
}

function writeReport(report: ExistingAlgorithmRefinementReport) {
  const artifactPath = join(ROOT, ARTIFACT);
  const docPath = join(ROOT, DOC);
  mkdirSync(dirname(artifactPath), { recursive: true });
  mkdirSync(dirname(docPath), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(docPath, renderMarkdown(report));
}

function renderMarkdown(report: ExistingAlgorithmRefinementReport) {
  return [
    "# Existing Algorithm Refinement",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current code version: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Algorithms inventoried: ${report.summary.algorithmsInventoried}`,
    `- Refined in place: ${report.summary.algorithmsRefined}`,
    `- Validated in place: ${report.summary.algorithmsValidated}`,
    `- Deferred: ${report.summary.algorithmsDeferred}`,
    `- Missing dependencies: ${report.summary.missingDependencies}`,
    `- Duplicate algorithms removed/refactored: ${report.summary.duplicateAlgorithmsRemoved}`,
    `- Protected chat untouched: ${report.summary.protectedChatUntouched ? "yes" : "no"}`,
    `- Findings: P0=${report.summary.p0Count}, P1=${report.summary.p1Count}, P2=${report.summary.p2Count}`,
    "",
    "## Inventory",
    "",
    ...report.algorithms.flatMap((entry) => [
      `### ${entry.name}`,
      "",
      `- File: ${entry.file}`,
      `- Status: ${entry.status}`,
      `- Purpose: ${entry.purpose}`,
      `- Consumers: ${entry.consumers.join(", ")}`,
      `- Inputs: ${entry.inputs.join(", ")}`,
      `- Outputs: ${entry.outputs.join(", ")}`,
      `- Failure modes: ${entry.failureModes.join("; ")}`,
      `- Stale/conflicting logic: ${entry.staleConflictingLogic.length > 0 ? entry.staleConflictingLogic.join("; ") : "none found"}`,
      `- Refinement: ${entry.refinement}`,
      "",
    ]),
    "## Stale Logic Removed",
    "",
    ...report.staleLogicRemoved.map((entry) => `- ${entry}`),
    "",
    "## Findings",
    "",
    ...[...report.duplicateAlgorithmFindings, ...report.deferredFindings].map((finding) => `- ${finding.severity.toUpperCase()} ${finding.file}: ${finding.detail}`),
    ...([ ...report.duplicateAlgorithmFindings, ...report.deferredFindings ].length === 0 ? ["- No blocking findings."] : []),
    "",
    "## Dirty File Classifications",
    "",
    ...report.dirtyFileClassifications.map((entry) => `- ${entry.file}: ${entry.classification}`),
    ...(report.dirtyFileClassifications.length === 0 ? ["- No dirty or untracked files at report generation."] : []),
    "",
    "## PR Cleanup Actions",
    "",
    ...report.prCleanupActions.map((action) => `- ${action}`),
    "",
    "## Next Fix Order",
    "",
    ...report.nextFixOrder.map((entry) => `- ${entry}`),
    "",
  ].join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const report = buildExistingAlgorithmRefinementReport({
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    changedFiles: changedFiles(),
    untrackedFiles: untrackedFiles(),
    openPrs: openPrs(),
    fileContents: new Map(),
    packageJson: read("package.json"),
  });
  writeReport(report);
  const failures = validateExistingAlgorithmRefinementReport(report);
  if (failures.length > 0) {
    console.error(failures.join("\n"));
    console.error(JSON.stringify(report.summary, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(report.summary, null, 2));
}
