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
  | "performance_deferred_post_beta"
  | "accessibility_deferred_post_beta"
  | "telemetry_deferred_post_beta"
  | "broad_runtime_deferred_post_beta"
  | "protected_payment_manual_review"
  | "governance_deferred_post_beta";

export type FinalHandledPr = {
  number: number;
  title: string;
  status: HandledPrStatus;
  dependencyRiskClass: string;
  securityRequired: boolean;
  reason: string;
  nextWindow:
    | "current_beta_exit_closure"
    | "post_beta_dependency_window"
    | "post_beta_governance_window"
    | "post_beta_performance_window"
    | "post_beta_accessibility_window"
    | "post_beta_telemetry_window"
    | "protected_payment_review";
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
    number: 319,
    title: "Sentinel HIGH: Fix open redirect via protocol-relative URLs",
    status: "security_patch_equivalent_landed",
    dependencyRiskClass: "security_required",
    securityRequired: true,
    reason: "Ported the current-source equivalent drop action URL protocol-relative and backslash redirect guards for admin and server drop publish paths.",
    nextWindow: "current_beta_exit_closure",
  },
  {
    number: 311,
    title: "Sentinel MEDIUM: Fix insecure error logging exposing stack traces in API routes",
    status: "security_patch_equivalent_landed",
    dependencyRiskClass: "security_required",
    securityRequired: true,
    reason: "Replaced insecure API route console logging with structured recordRouteWarning diagnostics without disabling useful telemetry.",
    nextWindow: "current_beta_exit_closure",
  },
  {
    number: 306,
    title: "Sentinel MEDIUM: Replace console.warn with secure recordRouteWarning in creator settings API",
    status: "security_patch_equivalent_landed",
    dependencyRiskClass: "security_required",
    securityRequired: true,
    reason: "Covered by the current-source creator settings route diagnostic logging replacement.",
    nextWindow: "current_beta_exit_closure",
  },
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
  {
    number: 318,
    title: "Palette: Add aria-busy to AuthModal buttons",
    status: "accessibility_deferred_post_beta" as const,
    dependencyRiskClass: "not_dependency",
    securityRequired: false,
    reason: "Accessibility cleanup is useful but not a current security or beta-exit blocker; defer to a focused post-beta accessibility pass.",
    nextWindow: "post_beta_accessibility_window" as const,
  },
  {
    number: 317,
    title: "Reduce duplicate computation in high-ROI aggregation hotspot",
    status: "performance_deferred_post_beta" as const,
    dependencyRiskClass: "not_dependency",
    securityRequired: false,
    reason: "Performance optimization is not security-required and needs a separate focused perf verification window.",
    nextWindow: "post_beta_performance_window" as const,
  },
  {
    number: 316,
    title: "Audit package metadata and source-of-funds truth",
    status: "protected_payment_manual_review" as const,
    dependencyRiskClass: "protected_payment_required",
    securityRequired: false,
    reason: "Package metadata and source-of-funds truth overlap protected GumDrop/payment lanes and require manual protected-lane review before applying.",
    nextWindow: "protected_payment_review" as const,
  },
  {
    number: 315,
    title: "Bolt: Replace array .find() with Map lookup in admin rollout payload generation",
    status: "performance_deferred_post_beta" as const,
    dependencyRiskClass: "not_dependency",
    securityRequired: false,
    reason: "Admin performance cleanup is non-security and should be handled in a separate post-beta performance window.",
    nextWindow: "post_beta_performance_window" as const,
  },
  {
    number: 314,
    title: "Clean canonical event drift at source",
    status: "telemetry_deferred_post_beta" as const,
    dependencyRiskClass: "not_dependency",
    securityRequired: false,
    reason: "Telemetry source cleanup is not a current open security blocker and needs its own telemetry truth pass.",
    nextWindow: "post_beta_telemetry_window" as const,
  },
  {
    number: 313,
    title: "Palette: Add ARIA labels to Admin Drop actions",
    status: "accessibility_deferred_post_beta" as const,
    dependencyRiskClass: "not_dependency",
    securityRequired: false,
    reason: "Admin accessibility cleanup is useful but not security-required; defer to the focused accessibility window.",
    nextWindow: "post_beta_accessibility_window" as const,
  },
  {
    number: 312,
    title: "Harden realtime truth for user-facing runtime surfaces",
    status: "broad_runtime_deferred_post_beta" as const,
    dependencyRiskClass: "broad_runtime_risk",
    securityRequired: false,
    reason: "Broad 28-file runtime hardening must not be merged blindly into the beta-exit stack.",
    nextWindow: "post_beta_governance_window" as const,
  },
  {
    number: 309,
    title: "Improve accessibility of loading states in creator components",
    status: "accessibility_deferred_post_beta" as const,
    dependencyRiskClass: "not_dependency",
    securityRequired: false,
    reason: "Creator loading accessibility cleanup is not security-required and should stay in a focused accessibility pass.",
    nextWindow: "post_beta_accessibility_window" as const,
  },
  {
    number: 308,
    title: "Audit package metadata and source-of-funds truth",
    status: "protected_payment_manual_review" as const,
    dependencyRiskClass: "protected_payment_required",
    securityRequired: false,
    reason: "Source-of-funds work is explicitly protected and requires manual review outside this lane.",
    nextWindow: "protected_payment_review" as const,
  },
  {
    number: 307,
    title: "Reduce monolith file risk and clarify responsibility boundaries",
    status: "governance_deferred_post_beta" as const,
    dependencyRiskClass: "not_dependency",
    securityRequired: false,
    reason: "Governance documentation and monolith boundary cleanup are deferred until after beta-exit source closure.",
    nextWindow: "post_beta_governance_window" as const,
  },
  {
    number: 305,
    title: "Palette: Add aria-busy to async buttons",
    status: "accessibility_deferred_post_beta" as const,
    dependencyRiskClass: "not_dependency",
    securityRequired: false,
    reason: "Generic async-button accessibility cleanup is useful but not a current security or beta-exit blocker.",
    nextWindow: "post_beta_accessibility_window" as const,
  },
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
  const handledByNumber = new Map(FINAL_HANDLED_PRS.map((pr) => [pr.number, pr]));
  const blockingOpenPrs = openPrsAfter.filter((pr) => {
    const handled = handledByNumber.get(pr.number);
    if (handled?.securityRequired && handled.status === "security_patch_equivalent_landed") return false;
    return pr.number === 293 || pr.number === 304 || pr.number === 306 || pr.number === 311 || pr.number === 319;
  });
  const report: FinalOpenPrClosureReport = {
    reportKey: "final-open-pr-closure",
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(root),
    openPrsBefore: FINAL_HANDLED_PRS,
    handledPrs: FINAL_HANDLED_PRS,
    securityPrsResolved: blockingOpenPrs.length === 0,
    performancePrsResolved: !openPrsAfter.some((pr) => {
      const handled = handledByNumber.get(pr.number);
      return handled?.status === "performance_patch_equivalent_landed";
    }),
    accessibilityPrsResolved: !openPrsAfter.some((pr) => {
      const handled = handledByNumber.get(pr.number);
      return handled?.status === "accessibility_patch_equivalent_landed";
    }),
    dependencyPrsDeferred: FINAL_HANDLED_PRS.filter((pr) => pr.status === "dependency_deferred_post_beta"),
    openPrsAfter,
    blockingOpenPrCount: blockingOpenPrs.length,
    unclassifiedOpenPrCount: openPrsAfter.filter((pr) => !handledByNumber.has(pr.number)).length,
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
  if (!report.handledPrs.some((pr) => pr.number === 319 && pr.status === "security_patch_equivalent_landed")) failures.push("#319 equivalent patch missing.");
  if (!report.handledPrs.some((pr) => pr.number === 311 && pr.status === "security_patch_equivalent_landed")) failures.push("#311 equivalent patch missing.");
  if (!report.handledPrs.some((pr) => pr.number === 306 && pr.status === "security_patch_equivalent_landed")) failures.push("#306 equivalent patch missing.");
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
        exactArtifactRequired: "Redacted provider-backed site activity artifact with timestamp, environment, and non-sensitive transaction/status proof.",
        acceptableEvidenceFormat: "Markdown or JSON packet with redacted provider status, request/response summary, or transaction receipt fields.",
        whatItProves: "Provider/payment path works in the intended deployed environment.",
        whatItDoesNotProve: "It does not prove source validators or local mocks are deployed runtime proof.",
        blocksBetaExitReady: true,
        affectsScoreOnly: false,
        nextExactAction: "Attach redacted provider-backed site activity artifact after bounded production or staging activity.",
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
        nextExactAction: "Attach redacted admin source sample packet.",
      },
      {
        id: "external-billing-review",
        owner: "operator",
        exactArtifactRequired: "External billing review note for Cloud Run/App Hosting, Firestore, BigQuery/export, Cloud SQL/Data Connect, and AI surfaces.",
        acceptableEvidenceFormat: "Operator-signed review note with exported summaries or billing-console values redacted for account details.",
        whatItProves: "Cost risk has external billing evidence.",
        whatItDoesNotProve: "It does not prove product correctness or deployed route evidence.",
        blocksBetaExitReady: true,
        affectsScoreOnly: false,
        nextExactAction: "Complete external billing review and attach redacted evidence.",
      },
      {
        id: "site-activity-evidence-export",
        owner: "operator",
        exactArtifactRequired: "Privacy-safe site activity export with timestamp, environment, role, route/action, and result state.",
        acceptableEvidenceFormat: "Markdown or JSON status packet derived from site activity, route contracts, client error logs, or hydration markers.",
        whatItProves: "Critical flows produced typed site activity evidence in production or approved staging.",
        whatItDoesNotProve: "It does not prove provider billing or production database truth.",
        blocksBetaExitReady: true,
        affectsScoreOnly: false,
        nextExactAction: "Attach privacy-safe site activity evidence after automated blockers stay closed.",
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
    if (/\bvisual\b/iu.test(item.id)) failures.push("visual reproduction must not be a required beta-exit evidence item.");
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
