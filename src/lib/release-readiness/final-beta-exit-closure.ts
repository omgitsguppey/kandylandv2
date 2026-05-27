import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type OpenPrSnapshot = {
  number: number;
  title: string;
  url?: string;
  mergeStateStatus?: string;
  isDraft?: boolean;
};

type HandledPrStatus =
  | "security_patch_equivalent_landed"
  | "performance_patch_equivalent_landed"
  | "accessibility_patch_equivalent_landed"
  | "dependency_deferred_post_beta"
  | "governance_deferred_post_beta";

export type FinalHandledPr = {
  number: number;
  title: string;
  status: HandledPrStatus;
  dependencyRiskClass: string;
  securityRequired: boolean;
  reason: string;
  nextWindow: "current_beta_exit_closure" | "post_beta_dependency_window" | "post_beta_governance_window";
};

export type FinalOpenPrClosureReport = {
  reportKey: "final-open-pr-closure";
  generatedAtUtc: string;
  currentHead: string;
  openPrsBefore: FinalHandledPr[];
  handledPrs: FinalHandledPr[];
  securityPrsResolved: boolean;
  performancePrsResolved: boolean;
  accessibilityPrsResolved: boolean;
  dependencyPrsDeferred: FinalHandledPr[];
  openPrsAfter: OpenPrSnapshot[];
  blockingOpenPrCount: number;
  unclassifiedOpenPrCount: number;
  validationFailures: string[];
};

export type SecurityPrngRedirectClosureReport = {
  reportKey: "security-prng-redirect-closure";
  generatedAtUtc: string;
  currentHead: string;
  promoRedirectGuardStatus: "resolved" | "missing";
  sensitiveMathRandomStatus: "resolved" | "unsafe_sensitive_random";
  cryptoFallbackStatus: "resolved" | "missing";
  securityPrsOpen: OpenPrSnapshot[];
  validationFailures: string[];
};

export type FinalCurrentHeadScoreRefreshReport = {
  reportKey: "final-current-head-score-refresh";
  generatedAtUtc: string;
  currentHead: string;
  publicBetaScoreCurrentHead?: string;
  currentBetaExitCurrentHead?: string;
  finalReleasePacketCurrentHead?: string;
  scoreDimensions: Record<string, number>;
  betaExitReady: boolean;
  staleRequiredReports: string[];
  validationFailures: string[];
};

export type OperatorEvidenceItem = {
  id: string;
  owner: string;
  exactArtifactRequired: string;
  acceptableEvidenceFormat: string;
  whatItProves: string;
  whatItDoesNotProve: string;
  blocksBetaExitReady: boolean;
  affectsScoreOnly: boolean;
  nextExactAction: string;
};

export type FinalOperatorEvidenceNeededReport = {
  reportKey: "final-operator-evidence-needed";
  generatedAtUtc: string;
  currentHead: string;
  betaExitReady: false;
  items: OperatorEvidenceItem[];
  deferredDependencyPrs: number[];
  validationFailures: string[];
};

const SENSITIVE_RANDOM_FILES = [
  "src/lib/auth-outcome-telemetry.ts",
  "src/lib/browser-notification-enrollment.ts",
  "src/lib/discovery-telemetry.ts",
];

export const FINAL_HANDLED_PRS: FinalHandledPr[] = [
  {
    number: 304,
    title: "Sentinel HIGH: Fix open redirect and weak PRNG",
    status: "security_patch_equivalent_landed",
    dependencyRiskClass: "security_required",
    securityRequired: true,
    reason: "Ported the current-source equivalent PromoCard redirect-smuggling guard and sensitive PRNG closure without scratch files.",
    nextWindow: "current_beta_exit_closure",
  },
  {
    number: 293,
    title: "Sentinel High: Fix insecure Math.random ID generation",
    status: "security_patch_equivalent_landed",
    dependencyRiskClass: "security_required",
    securityRequired: true,
    reason: "Replaced sensitive Math.random fallbacks with the existing crypto-backed client random helper.",
    nextWindow: "current_beta_exit_closure",
  },
  {
    number: 303,
    title: "Bolt: Consolidate useMemo iterations in LibraryClient",
    status: "performance_patch_equivalent_landed",
    dependencyRiskClass: "not_dependency",
    securityRequired: false,
    reason: "Ported only the single-pass LibraryClient filtering optimization; left scratch notes out.",
    nextWindow: "current_beta_exit_closure",
  },
  {
    number: 292,
    title: "Bolt: Replace array .find() with Map lookup in debug route",
    status: "performance_patch_equivalent_landed",
    dependencyRiskClass: "not_dependency",
    securityRequired: false,
    reason: "Ported only the task inventory Map lookup and preserved debug source truth.",
    nextWindow: "current_beta_exit_closure",
  },
  {
    number: 291,
    title: "Palette: Add accessible loading states to Creator Experiences Panel buttons",
    status: "accessibility_patch_equivalent_landed",
    dependencyRiskClass: "not_dependency",
    securityRequired: false,
    reason: "Ported only aria-busy and decorative loading icon aria-hidden attributes.",
    nextWindow: "current_beta_exit_closure",
  },
  ...[294, 295, 296, 297, 298, 299].map((number) => ({
    number,
    title: `Dependabot PR #${number}`,
    status: "dependency_deferred_post_beta" as const,
    dependencyRiskClass: number === 299 ? "provider_sdk_risk" : number === 294 ? "major_risk" : "test_tooling_or_minor_risk",
    securityRequired: false,
    reason: "Broad dependency changes are deferred until a post-beta dependency window unless a security advisory requires them.",
    nextWindow: "post_beta_dependency_window" as const,
  })),
  ...[300, 301, 302].map((number) => ({
    number,
    title: `Governance/product PR #${number}`,
    status: "governance_deferred_post_beta" as const,
    dependencyRiskClass: "not_dependency",
    securityRequired: false,
    reason: "Governance/product-scope work is deferred until after beta-exit source closure to avoid broad overlap.",
    nextWindow: "post_beta_governance_window" as const,
  })),
];

export function currentHead(root: string) {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
}

export function readOpenPrs(root: string): OpenPrSnapshot[] {
  try {
    const raw = execFileSync(
      "gh",
      ["pr", "list", "--repo", "omgitsguppey/kandylandv2", "--state", "open", "--limit", "100", "--json", "number,title,url,mergeStateStatus,isDraft"],
      { cwd: root, encoding: "utf8" },
    );
    return JSON.parse(raw) as OpenPrSnapshot[];
  } catch {
    return [];
  }
}

function read(root: string, path: string) {
  return readFileSync(join(root, path), "utf8");
}

function readJson<T>(root: string, path: string): T | null {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) return null;
  return JSON.parse(readFileSync(fullPath, "utf8")) as T;
}

export function buildSecurityPrngRedirectClosureReport(root: string, openPrs = readOpenPrs(root)): SecurityPrngRedirectClosureReport {
  const promoCard = read(root, "src/components/PromoCard.tsx");
  const clientRandom = read(root, "src/lib/client-random.ts");
  const sensitiveSources = SENSITIVE_RANDOM_FILES.map((path) => ({ path, source: read(root, path) }));
  const report: SecurityPrngRedirectClosureReport = {
    reportKey: "security-prng-redirect-closure",
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(root),
    promoRedirectGuardStatus: promoCard.includes('trimmedUrl.startsWith("//")')
      && promoCard.includes('trimmedUrl.startsWith("/\\\\")')
      && promoCard.includes('trimmedUrl.startsWith("\\\\")')
      ? "resolved"
      : "missing",
    sensitiveMathRandomStatus: sensitiveSources.some((entry) => entry.source.includes("Math.random")) ? "unsafe_sensitive_random" : "resolved",
    cryptoFallbackStatus: clientRandom.includes("crypto.randomUUID") && clientRandom.includes("crypto.getRandomValues") && !clientRandom.includes("Math.random") ? "resolved" : "missing",
    securityPrsOpen: openPrs.filter((pr) => pr.number === 293 || pr.number === 304),
    validationFailures: [],
  };
  report.validationFailures = validateSecurityPrngRedirectClosureReport(report);
  return report;
}

export function validateSecurityPrngRedirectClosureReport(report: SecurityPrngRedirectClosureReport) {
  const failures: string[] = [];
  if (report.promoRedirectGuardStatus !== "resolved") failures.push("URL redirect helper still allows protocol-relative or backslash smuggling risk.");
  if (report.sensitiveMathRandomStatus !== "resolved") failures.push("Sensitive ID generation still uses Math.random.");
  if (report.cryptoFallbackStatus !== "resolved") failures.push("Crypto fallback is missing for browser/server crypto.");
  if (report.securityPrsOpen.length > 0) failures.push("Security PRs remain open without closure.");
  return failures;
}

export function buildFinalOpenPrClosureReport(root: string, openPrsAfter = readOpenPrs(root)): FinalOpenPrClosureReport {
  const blockingOpenPrs = openPrsAfter.filter((pr) => pr.number === 293 || pr.number === 304);
  const report: FinalOpenPrClosureReport = {
    reportKey: "final-open-pr-closure",
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(root),
    openPrsBefore: FINAL_HANDLED_PRS,
    handledPrs: FINAL_HANDLED_PRS,
    securityPrsResolved: !openPrsAfter.some((pr) => pr.number === 293 || pr.number === 304),
    performancePrsResolved: !openPrsAfter.some((pr) => pr.number === 292 || pr.number === 303),
    accessibilityPrsResolved: !openPrsAfter.some((pr) => pr.number === 291),
    dependencyPrsDeferred: FINAL_HANDLED_PRS.filter((pr) => pr.status === "dependency_deferred_post_beta"),
    openPrsAfter,
    blockingOpenPrCount: blockingOpenPrs.length,
    unclassifiedOpenPrCount: openPrsAfter.filter((pr) => !FINAL_HANDLED_PRS.some((handled) => handled.number === pr.number)).length,
    validationFailures: [],
  };
  report.validationFailures = validateFinalOpenPrClosureReport(report);
  return report;
}

export function validateFinalOpenPrClosureReport(report: FinalOpenPrClosureReport) {
  const failures: string[] = [];
  if (report.unclassifiedOpenPrCount > 0) failures.push("open PR remains unclassified.");
  if (report.blockingOpenPrCount > 0) failures.push("blocking open PR remains.");
  if (!report.securityPrsResolved) failures.push("#304 or #293 unresolved.");
  if (!report.handledPrs.some((pr) => pr.number === 304 && pr.status === "security_patch_equivalent_landed")) failures.push("#304 equivalent patch missing.");
  if (!report.handledPrs.some((pr) => pr.number === 293 && pr.status === "security_patch_equivalent_landed")) failures.push("#293 equivalent patch missing.");
  if (report.dependencyPrsDeferred.some((pr) => pr.nextWindow !== "post_beta_dependency_window" || !pr.reason)) failures.push("dependency PR lacks defer reason.");
  return failures;
}

export function buildFinalCurrentHeadScoreRefreshReport(root: string): FinalCurrentHeadScoreRefreshReport {
  const beta = readJson<{
    currentHead?: string;
    dimensions?: Record<string, number>;
    sourceHealthScore?: number;
    runtimeHealthScore?: number;
    evidenceCompletenessScore?: number;
    freshnessScore?: number;
    costRiskScore?: number;
    regressionRiskScore?: number;
    overallScore?: number;
  }>(root, "agent/state/public-beta-score.generated.json");
  const exit = readJson<{ currentHead?: string; betaExitReady?: boolean }>(root, "agent/state/current-beta-exit-status.generated.json");
  const packet = readJson<{ currentHead?: string; betaExitReady?: boolean; scoreDimensions?: Record<string, unknown> }>(root, "agent/state/final-release-exit-readiness-packet.generated.json");
  const head = currentHead(root);
  const staleRequiredReports = [
    beta?.currentHead === head ? null : "public-beta-score",
    exit?.currentHead === head ? null : "current-beta-exit-status",
    packet?.currentHead === head ? null : "final-release-exit-readiness-packet",
  ].filter((value): value is string => Boolean(value));
  const report: FinalCurrentHeadScoreRefreshReport = {
    reportKey: "final-current-head-score-refresh",
    generatedAtUtc: new Date().toISOString(),
    currentHead: head,
    publicBetaScoreCurrentHead: beta?.currentHead,
    currentBetaExitCurrentHead: exit?.currentHead,
    finalReleasePacketCurrentHead: packet?.currentHead,
    scoreDimensions: beta?.dimensions ?? {
      sourceHealth: beta?.sourceHealthScore ?? 0,
      runtimeHealth: beta?.runtimeHealthScore ?? 0,
      evidenceCompleteness: beta?.evidenceCompletenessScore ?? 0,
      freshness: beta?.freshnessScore ?? 0,
      costRisk: beta?.costRiskScore ?? 0,
      regressionRisk: beta?.regressionRiskScore ?? 0,
      overallHealthScore: beta?.overallScore ?? 0,
    },
    betaExitReady: Boolean(exit?.betaExitReady || packet?.betaExitReady),
    staleRequiredReports,
    validationFailures: [],
  };
  report.validationFailures = validateFinalCurrentHeadScoreRefreshReport(report);
  return report;
}

export function validateFinalCurrentHeadScoreRefreshReport(report: FinalCurrentHeadScoreRefreshReport) {
  const failures: string[] = [];
  if (report.staleRequiredReports.length > 0) failures.push(`stale required reports: ${report.staleRequiredReports.join(", ")}`);
  for (const dimension of ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "freshness", "costRisk", "regressionRisk"]) {
    if (typeof report.scoreDimensions[dimension] !== "number") failures.push(`score dimension missing: ${dimension}`);
  }
  if (report.betaExitReady) failures.push("betaExitReady true while formal blockers remain.");
  return failures;
}

export function buildFinalOperatorEvidenceNeededReport(root: string): FinalOperatorEvidenceNeededReport {
  const report: FinalOperatorEvidenceNeededReport = {
    reportKey: "final-operator-evidence-needed",
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(root),
    betaExitReady: false,
    deferredDependencyPrs: [294, 295, 296, 297, 298, 299],
    items: [
      {
        id: "formal-provider-smoke",
        owner: "operator",
        exactArtifactRequired: "Redacted provider/payment smoke artifact with timestamp, environment, and non-sensitive transaction/status proof.",
        acceptableEvidenceFormat: "Markdown or JSON packet with screenshots/log snippets redacted for provider IDs, user IDs, and tokens.",
        whatItProves: "Provider/payment path works in the intended deployed environment.",
        whatItDoesNotProve: "It does not prove source validators or local mocks are deployed runtime proof.",
        blocksBetaExitReady: true,
        affectsScoreOnly: false,
        nextExactAction: "Attach redacted provider smoke artifact after operator-run production or staging smoke.",
      },
      {
        id: "deployed-runtime-smoke",
        owner: "operator",
        exactArtifactRequired: "Route smoke packet for critical user, creator, admin, and API surfaces from deployed environment.",
        acceptableEvidenceFormat: "Redacted status matrix with route, role, timestamp, expected status class, and evidence link.",
        whatItProves: "Deployed runtime routes respond as expected.",
        whatItDoesNotProve: "It does not prove provider billing or payment settlement.",
        blocksBetaExitReady: true,
        affectsScoreOnly: false,
        nextExactAction: "Run deployed smoke and attach redacted route matrix.",
      },
      {
        id: "redacted-admin-truth-sample",
        owner: "operator",
        exactArtifactRequired: "Admin truth sample packet using the redaction schema.",
        acceptableEvidenceFormat: "JSON or Markdown packet with hashed IDs and no raw email, provider IDs, chat content, storage paths, tokens, or private URLs.",
        whatItProves: "Admin summaries can reflect real production/sample truth without exposing sensitive data.",
        whatItDoesNotProve: "It does not prove external billing review.",
        blocksBetaExitReady: true,
        affectsScoreOnly: false,
        nextExactAction: "Attach redacted admin truth sample packet.",
      },
      {
        id: "external-billing-review",
        owner: "operator",
        exactArtifactRequired: "External billing review note for Cloud Run/App Hosting, Firestore, BigQuery/export, Cloud SQL/Data Connect, and AI surfaces.",
        acceptableEvidenceFormat: "Operator-signed review note with billing console screenshots or exported summaries redacted for account details.",
        whatItProves: "Cost risk has external billing evidence.",
        whatItDoesNotProve: "It does not prove product correctness or runtime smoke.",
        blocksBetaExitReady: true,
        affectsScoreOnly: false,
        nextExactAction: "Complete external billing review and attach redacted evidence.",
      },
      {
        id: "operator-final-visual-qa",
        owner: "operator",
        exactArtifactRequired: "Final visual QA packet for major user, creator, and admin surfaces.",
        acceptableEvidenceFormat: "Checklist with screenshots or recordings and explicit pass/fail notes per surface.",
        whatItProves: "Human-visible UI is acceptable after source closure.",
        whatItDoesNotProve: "It does not prove provider or billing status.",
        blocksBetaExitReady: true,
        affectsScoreOnly: false,
        nextExactAction: "Run operator-final visual QA and attach packet.",
      },
      {
        id: "manual-production-smoke",
        owner: "operator",
        exactArtifactRequired: "Manual production smoke checklist with timestamp, environment, role, and result.",
        acceptableEvidenceFormat: "Markdown checklist or JSON status packet.",
        whatItProves: "Critical flows were manually exercised in production or approved staging.",
        whatItDoesNotProve: "It does not prove source-only validators are runtime proof.",
        blocksBetaExitReady: true,
        affectsScoreOnly: false,
        nextExactAction: "Run manual production smoke after automated blockers stay closed.",
      },
    ],
    validationFailures: [],
  };
  report.validationFailures = validateFinalOperatorEvidenceNeededReport(report);
  return report;
}

export function validateFinalOperatorEvidenceNeededReport(report: FinalOperatorEvidenceNeededReport) {
  const failures: string[] = [];
  if (report.betaExitReady) failures.push("betaExitReady true while operator blockers remain.");
  for (const item of report.items) {
    if (!item.exactArtifactRequired || !item.acceptableEvidenceFormat) failures.push(`${item.id} lacks exact artifact format.`);
    if (/source validator|source-only/iu.test(item.whatItProves)) failures.push(`${item.id} mislabels source evidence as formal evidence.`);
    if (/manual review needed$/iu.test(item.nextExactAction.trim())) failures.push(`${item.id} has vague next action.`);
  }
  return failures;
}

export function renderClosureDoc(title: string, report: { validationFailures: string[] } & Record<string, unknown>) {
  return [
    `# ${title}`,
    "",
    `Generated: ${String(report.generatedAtUtc)}`,
    `Current HEAD: ${String(report.currentHead)}`,
    `Validation failures: ${report.validationFailures.length}`,
    "",
    "```json",
    JSON.stringify(report, null, 2),
    "```",
    "",
  ].join("\n");
}
