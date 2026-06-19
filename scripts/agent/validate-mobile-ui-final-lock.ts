import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type Severity = "P0" | "P1" | "P2";
type DependencyStatus = "ready" | "missing" | "deferred";

export type MobileUiFinalLockDependency = {
  id: string;
  status: DependencyStatus;
  severity: Severity;
  detail: string;
};

export type MobileUiFinalLockReport = {
  generatedAtUtc: string;
  reportKey: "mobile-ui-final-lock";
  currentHead: string;
  summary: {
    scalingDoctrineReady: boolean;
    hardcodedCssScanReady: boolean;
    loadingHydrationReady: boolean;
    surfaceOrganizationReady: boolean;
    protectedNavUntouched: boolean;
    protectedChatUntouched: boolean;
    adminMobileReady: boolean;
    userMobileReady: boolean;
    creatorMobileReady: boolean;
    selfCheckGuardsReady: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  dependencyStatus: MobileUiFinalLockDependency[];
  protectedFileDiffs: string[];
  remainingMobileRisks: string[];
  agentSelfCheckRules: string[];
  nextExactSteps: string[];
};

export type MobileUiFinalLockPhaseSummaries = {
  scaling?: Record<string, unknown>;
  hardcoded?: Record<string, unknown>;
  loading?: Record<string, unknown>;
  organization?: Record<string, unknown>;
};

export type MobileUiFinalLockInputs = {
  currentHead: string;
  generatedAtUtc: string;
  changedFiles: string[];
  packageJson: string;
  dependencyStatus: MobileUiFinalLockDependency[];
  phaseSummaries: MobileUiFinalLockPhaseSummaries;
  selfCheckRules: string[];
};

export const SELF_CHECK_RULES = [
  "Before changing any UI, search for existing component/contracts first.",
  "Do not create a new component if a shared component exists.",
  "Mobile-first before desktop.",
  "If a desktop table/grid appears in a mobile path, create a compact summary/drilldown.",
  "If hardcoded p-6/text-4xl/min-h giant tokens appear, justify or refactor.",
  "If a loading state changes size after hydration, fix the skeleton.",
  "If an async loader can race, add a stale guard.",
  "If top nav, bottom nav, or chat is touched, fail unless explicitly requested.",
  "If route/surface doctrine conflicts, refactor doctrine first.",
  "If user/creator/admin surfaces share a component, add a density variant instead of a global shrink.",
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelativePath = "agent/state/mobile-ui-final-lock.generated.json";
const docsRelativePath = "docs/agent-truth/mobile-ui-final-lock.md";

const phaseFiles = {
  scaling: {
    artifact: "agent/state/mobile-ui-scaling-doctrine.generated.json",
    doc: "docs/agent-truth/mobile-ui-scaling-doctrine.md",
    validator: "scripts/agent/validate-mobile-ui-scaling-doctrine.ts",
  },
  hardcoded: {
    artifact: "agent/state/mobile-hardcoded-css-cleanup.generated.json",
    doc: "docs/agent-truth/mobile-hardcoded-css-cleanup.md",
    validator: "scripts/agent/validate-mobile-hardcoded-css-cleanup.ts",
  },
  loading: {
    artifact: "agent/state/mobile-loading-hydration-stability.generated.json",
    doc: "docs/agent-truth/mobile-loading-hydration-stability.md",
    validator: "scripts/agent/validate-mobile-loading-hydration-stability.ts",
  },
  organization: {
    artifact: "agent/state/mobile-surface-organization.generated.json",
    doc: "docs/agent-truth/mobile-surface-organization.md",
    validator: "scripts/agent/validate-mobile-surface-organization.ts",
  },
} as const;

const protectedNavPatterns = [
  /^src\/components\/Navigation\//u,
  /(^|\/)(Navbar|TopNav|BottomNav|MobileBottomBar)\.tsx$/u,
];

const protectedChatPatterns = [
  /^src\/components\/Chat\//u,
  /^src\/app\/chat\//u,
];

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function read(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function optionalRead(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJsonSummary(relativePath: string) {
  const source = optionalRead(relativePath);
  if (!source) return undefined;
  try {
    const parsed = JSON.parse(source) as { summary?: Record<string, unknown> };
    return parsed.summary ?? undefined;
  } catch {
    return undefined;
  }
}

function changedFiles() {
  const unstaged = execFileSync("git", ["diff", "--name-only"], { cwd: repoRoot, encoding: "utf8" })
    .split(/\r?\n/u)
    .filter(Boolean);
  const staged = execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: repoRoot, encoding: "utf8" })
    .split(/\r?\n/u)
    .filter(Boolean);
  return Array.from(new Set([...unstaged, ...staged])).map((file) => file.replaceAll("\\", "/"));
}

function hasAll(paths: string[]) {
  return paths.every((path) => existsSync(join(repoRoot, path)));
}

function isNavPath(file: string) {
  return protectedNavPatterns.some((pattern) => pattern.test(file));
}

function isChatPath(file: string) {
  return protectedChatPatterns.some((pattern) => pattern.test(file));
}

function bool(value: unknown) {
  return value === true;
}

function countStatus(dependencies: MobileUiFinalLockDependency[], severity: Severity) {
  return dependencies.filter((entry) => entry.status === "missing" && entry.severity === severity).length;
}

function buildDependencyStatus(phaseSummaries: MobileUiFinalLockPhaseSummaries): MobileUiFinalLockDependency[] {
  const scalingReady = hasAll(Object.values(phaseFiles.scaling))
    && bool(phaseSummaries.scaling?.doctrineCreated)
    && bool(phaseSummaries.scaling?.sharedMobileScaleContractCreated)
    && bool(phaseSummaries.scaling?.hardcodedCssScanCreated)
    && bool(phaseSummaries.scaling?.skeletonPolicyCreated)
    && bool(phaseSummaries.scaling?.hydrationPolicyCreated);
  const hardcodedReady = hasAll(Object.values(phaseFiles.hardcoded))
    && (bool(phaseSummaries.hardcoded?.hardcodedCssScanReady) || bool(phaseSummaries.hardcoded?.highRiskPatternsRemovedFromTouchedFiles))
    && bool(phaseSummaries.hardcoded?.highRiskPatternsRemovedFromTouchedFiles)
    && bool(phaseSummaries.hardcoded?.protectedNavChatUntouched);
  const loadingReady = hasAll(Object.values(phaseFiles.loading))
    && bool(phaseSummaries.loading?.loadingContractPresent)
    && bool(phaseSummaries.loading?.compactSkeletonsPresent)
    && bool(phaseSummaries.loading?.staleRequestProtectionApplied)
    && bool(phaseSummaries.loading?.loadingStateOverwriteGuarded);
  const organizationReady = hasAll(Object.values(phaseFiles.organization))
    && bool(phaseSummaries.organization?.adminSummaryFirst)
    && bool(phaseSummaries.organization?.userDashboardPreserved)
    && bool(phaseSummaries.organization?.creatorWorkflowsSeparated)
    && bool(phaseSummaries.organization?.drilldownPathsPresent);

  const status = (ready: boolean): DependencyStatus => (ready ? "ready" : "missing");
  const note = (ready: boolean, readyDetail: string, missingDetail: string) => (ready ? readyDetail : missingDetail);

  return [
    {
      id: "mobile-ui-scaling-doctrine",
      status: status(scalingReady),
      severity: "P0",
      detail: note(
        scalingReady,
        "Scaling doctrine, mobile scale contract, density helpers, hardcoded scan, skeleton policy, and hydration policy are present.",
        "Missing dependency: mobile scaling doctrine artifacts or required summary fields are absent.",
      ),
    },
    {
      id: "mobile-hardcoded-css-cleanup",
      status: status(hardcodedReady),
      severity: "P0",
      detail: note(
        hardcodedReady,
        "Hardcoded mobile sprawl scan is present and protected nav/chat remained untouched.",
        "Missing dependency: hardcoded mobile sprawl scan artifacts or summary fields are absent.",
      ),
    },
    {
      id: "mobile-loading-hydration-stability",
      status: status(loadingReady),
      severity: "P0",
      detail: note(
        loadingReady,
        "Loading/hydration scan, compact skeletons, and stale-request guards are represented.",
        "Missing dependency: mobile loading/hydration scan artifacts or summary fields are absent.",
      ),
    },
    {
      id: "mobile-surface-organization",
      status: status(organizationReady),
      severity: "P0",
      detail: note(
        organizationReady,
        "Admin, user, and creator mobile surface organization are represented.",
        "Missing dependency: mobile surface organization artifacts or summary fields are absent.",
      ),
    },
    {
      id: "mobile-ui-beta-source-readiness",
      status: scalingReady && hardcodedReady && loadingReady && organizationReady ? "ready" : "deferred",
      severity: "P1",
      detail: scalingReady && hardcodedReady && loadingReady && organizationReady
        ? "Mobile UI doctrine is source-ready only; visual/manual evidence is not claimed and beta exit remains false."
        : "Mobile UI source readiness remains deferred until missing mobile dependency phases are resolved; visual/manual evidence is not claimed.",
    },
  ];
}

function selfCheckGuardsReady(rules: string[]) {
  const requiredSnippets = [
    "existing component/contracts",
    "shared component exists",
    "Mobile-first",
    "desktop table/grid",
    "p-6/text-4xl/min-h",
    "loading state changes size",
    "async loader can race",
    "top nav, bottom nav, or chat",
    "route/surface doctrine conflicts",
    "density variant",
  ];
  return rules.length >= 10 && requiredSnippets.every((snippet) => rules.some((rule) => rule.includes(snippet)));
}

export function buildMobileUiFinalLockReport(inputs: MobileUiFinalLockInputs): MobileUiFinalLockReport {
  const protectedNavDiffs = inputs.changedFiles.filter(isNavPath);
  const protectedChatDiffs = inputs.changedFiles.filter(isChatPath);
  const protectedFileDiffs = [...protectedNavDiffs, ...protectedChatDiffs];
  const dependencyStatus = inputs.dependencyStatus;
  const dependencyReady = (id: string) => dependencyStatus.find((entry) => entry.id === id)?.status === "ready";
  const hardcodedCssScanReady = dependencyReady("mobile-hardcoded-css-cleanup")
    && (bool(inputs.phaseSummaries.hardcoded?.hardcodedCssScanReady) || bool(inputs.phaseSummaries.hardcoded?.highRiskPatternsRemovedFromTouchedFiles));
  const loadingHydrationReady = dependencyReady("mobile-loading-hydration-stability")
    && bool(inputs.phaseSummaries.loading?.compactSkeletonsPresent)
    && bool(inputs.phaseSummaries.loading?.staleRequestProtectionApplied);
  const surfaceOrganizationReady = dependencyReady("mobile-surface-organization")
    && bool(inputs.phaseSummaries.organization?.adminSummaryFirst)
    && bool(inputs.phaseSummaries.organization?.userDashboardPreserved)
    && bool(inputs.phaseSummaries.organization?.creatorWorkflowsSeparated);
  const scalingDoctrineReady = dependencyReady("mobile-ui-scaling-doctrine")
    && bool(inputs.phaseSummaries.scaling?.sharedMobileScaleContractCreated)
    && bool(inputs.phaseSummaries.scaling?.skeletonPolicyCreated);
  const packageScriptReady = inputs.packageJson.includes("check:mobile-ui-final-lock");
  const guardReady = selfCheckGuardsReady(inputs.selfCheckRules) && packageScriptReady;
  const coreDependencyFailures = dependencyStatus.filter((entry) => entry.status === "missing" && !entry.detail.trim().startsWith("Missing dependency:"));
  const p0Count = countStatus(dependencyStatus, "P0")
    + (protectedFileDiffs.length > 0 ? 1 : 0)
    + (coreDependencyFailures.length > 0 ? 1 : 0)
    + (guardReady ? 0 : 1);
  const p1Count = countStatus(dependencyStatus, "P1")
    + (surfaceOrganizationReady ? 0 : 1)
    + (hardcodedCssScanReady ? 0 : 1)
    + (loadingHydrationReady ? 0 : 1);
  const p2Count = countStatus(dependencyStatus, "P2");

  return {
    generatedAtUtc: inputs.generatedAtUtc,
    reportKey: "mobile-ui-final-lock",
    currentHead: inputs.currentHead,
    summary: {
      scalingDoctrineReady,
      hardcodedCssScanReady,
      loadingHydrationReady,
      surfaceOrganizationReady,
      protectedNavUntouched: protectedNavDiffs.length === 0,
      protectedChatUntouched: protectedChatDiffs.length === 0,
      adminMobileReady: surfaceOrganizationReady && bool(inputs.phaseSummaries.organization?.adminSummaryFirst),
      userMobileReady: surfaceOrganizationReady && bool(inputs.phaseSummaries.organization?.userDashboardPreserved),
      creatorMobileReady: surfaceOrganizationReady && bool(inputs.phaseSummaries.organization?.creatorWorkflowsSeparated),
      selfCheckGuardsReady: guardReady,
      p0Count,
      p1Count,
      p2Count,
    },
    dependencyStatus,
    protectedFileDiffs,
    remainingMobileRisks: [
      "Visual/manual mobile evidence is not claimed by this source lock.",
      "Beta exit remains blocked until formal evidence exists outside this source-readiness pass.",
      "Hardcoded sprawl inventory still feeds next-fix order for future touched surfaces.",
    ],
    agentSelfCheckRules: inputs.selfCheckRules,
    nextExactSteps: [
      "Run check:mobile-ui-final-lock before future mobile UI cleanup signoff.",
      "When a future UI pass touches admin, user, or creator screens, run the matching mobile phase check before release notes.",
      "Escalate to browser reproduction only after source readiness is green and the user requests visual evidence.",
    ],
  };
}

export function validateMobileUiFinalLockReport(report: MobileUiFinalLockReport | null) {
  const failures: string[] = [];
  if (!report) return ["mobile UI final lock report missing."];
  if (report.reportKey !== "mobile-ui-final-lock") failures.push("reportKey must be mobile-ui-final-lock.");
  if (!report.summary.protectedNavUntouched || !report.summary.protectedChatUntouched) failures.push("protected nav/chat files changed by this pass.");
  if (report.dependencyStatus.some((entry) => entry.status === "missing" && !entry.detail.trim().startsWith("Missing dependency:"))) {
    failures.push("mobile phase artifact missing without dependency note.");
  }
  if (!report.summary.selfCheckGuardsReady || report.agentSelfCheckRules.length === 0) failures.push("agent self-check rules missing.");
  if (!report.summary.hardcodedCssScanReady) failures.push("hardcoded mobile sprawl scan missing.");
  if (!report.summary.loadingHydrationReady) failures.push("loading/hydration scan missing.");
  if (!report.summary.adminMobileReady || !report.summary.userMobileReady || !report.summary.creatorMobileReady) {
    failures.push("admin/user/creator mobile readiness not represented.");
  }
  const betaStatus = report.dependencyStatus.find((entry) => entry.id === "mobile-ui-beta-source-readiness");
  if (!betaStatus || !betaStatus.detail.includes("source-ready only") || !betaStatus.detail.includes("visual/manual evidence is not claimed") || !betaStatus.detail.includes("beta exit remains false")) {
    failures.push("beta evidence/status ignores mobile UI source readiness.");
  }
  if (!Array.isArray(report.nextExactSteps) || report.nextExactSteps.length === 0) failures.push("nextExactSteps missing.");
  if (report.summary.p0Count > 0 || report.summary.p1Count > 0) failures.push("blocking mobile UI final lock findings remain.");
  return failures;
}

function writeJson(relativePath: string, value: unknown) {
  const fullPath = join(repoRoot, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function renderMarkdown(report: MobileUiFinalLockReport) {
  return [
    "# Mobile UI Final Lock",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current code version: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Scaling doctrine ready: ${report.summary.scalingDoctrineReady ? "yes" : "no"}`,
    `- Hardcoded CSS scan ready: ${report.summary.hardcodedCssScanReady ? "yes" : "no"}`,
    `- Loading and hydration ready: ${report.summary.loadingHydrationReady ? "yes" : "no"}`,
    `- Surface organization ready: ${report.summary.surfaceOrganizationReady ? "yes" : "no"}`,
    `- Protected nav untouched: ${report.summary.protectedNavUntouched ? "yes" : "no"}`,
    `- Protected chat untouched: ${report.summary.protectedChatUntouched ? "yes" : "no"}`,
    `- Admin mobile ready: ${report.summary.adminMobileReady ? "yes" : "no"}`,
    `- User mobile ready: ${report.summary.userMobileReady ? "yes" : "no"}`,
    `- Creator mobile ready: ${report.summary.creatorMobileReady ? "yes" : "no"}`,
    `- Self-check guards ready: ${report.summary.selfCheckGuardsReady ? "yes" : "no"}`,
    `- Blocking findings: P0=${report.summary.p0Count}, P1=${report.summary.p1Count}, P2=${report.summary.p2Count}`,
    "",
    "## Dependency Status",
    "",
    ...report.dependencyStatus.map((entry) => `- ${entry.status}: ${entry.id} - ${entry.detail}`),
    "",
    "## Agent Self-Check Rules",
    "",
    ...report.agentSelfCheckRules.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    "## Protected File Diffs",
    "",
    ...(report.protectedFileDiffs.length > 0 ? report.protectedFileDiffs.map((file) => `- ${file}`) : ["- None."]),
    "",
    "## Remaining Mobile Risks",
    "",
    ...report.remainingMobileRisks.map((risk) => `- ${risk}`),
    "",
    "## Next Exact Steps",
    "",
    ...report.nextExactSteps.map((step, index) => `${index + 1}. ${step}`),
    "",
  ].join("\n");
}

function readInputs(): MobileUiFinalLockInputs {
  const phaseSummaries: MobileUiFinalLockPhaseSummaries = {
    scaling: readJsonSummary(phaseFiles.scaling.artifact),
    hardcoded: readJsonSummary(phaseFiles.hardcoded.artifact),
    loading: readJsonSummary(phaseFiles.loading.artifact),
    organization: readJsonSummary(phaseFiles.organization.artifact),
  };

  return {
    currentHead: currentHead(),
    generatedAtUtc: new Date().toISOString(),
    changedFiles: changedFiles(),
    packageJson: read("package.json"),
    dependencyStatus: buildDependencyStatus(phaseSummaries),
    phaseSummaries,
    selfCheckRules: SELF_CHECK_RULES,
  };
}

function main() {
  const report = buildMobileUiFinalLockReport(readInputs());
  writeJson(artifactRelativePath, report);
  const docsPath = join(repoRoot, docsRelativePath);
  mkdirSync(dirname(docsPath), { recursive: true });
  writeFileSync(docsPath, renderMarkdown(report));
  const failures = validateMobileUiFinalLockReport(report);
  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`[mobile-ui-final-lock] ${failure}`);
    }
    process.exit(1);
  }
  console.log(`[mobile-ui-final-lock] ok: deps=${report.dependencyStatus.length} rules=${report.agentSelfCheckRules.length}`);
}

if (process.argv[1]?.endsWith("validate-mobile-ui-final-lock.ts")) {
  main();
}
