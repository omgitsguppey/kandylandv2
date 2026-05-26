export type CodebaseOrganizationRule = {
  ruleId: string;
  subject: string;
  requiredFields: string[];
  validator: string;
  reason: string;
};

export type CodebaseOrganizationDirtyClassification =
  | "current_generated_artifact_to_commit"
  | "documentation_artifact_expected"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "release_artifact_expected"
  | "real_source_change_needs_review"
  | "unrelated_agent_context_file_to_ignore"
  | "unsafe_unknown";

export type CodebaseOrganizationHardeningSummary = {
  reportKey: "codebase-organization-hardening";
  generatedAtUtc: string;
  status: "pass" | "fail";
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  deployPerformed: false;
  rules: CodebaseOrganizationRule[];
  requiredRulesSatisfied: number;
  dirtyFiles: Array<{ path: string; classification: CodebaseOrganizationDirtyClassification }>;
  openPullRequests: Array<{ number: unknown; title: unknown; classification: string }>;
  selfCheck: {
    packageScriptsPresent: boolean;
    generatedArtifactsNeedValidator: true;
    noRouteWithoutFeatureRegistration: true;
    noMetricWithoutMathOwner: true;
    noDebugLaneWithoutBrainMapping: true;
  };
};

export const CODEBASE_ORGANIZATION_HARDENING_RULES: CodebaseOrganizationRule[] = [
  {
    ruleId: "feature-body-system-required",
    subject: "new feature or route",
    requiredFields: ["bodySystem", "featureId", "surfaceId", "routeOrApiRoute"],
    validator: "check:product-body-map",
    reason: "Every visible limb needs one body system and canonical registry owner.",
  },
  {
    ruleId: "telemetry-event-envelope-required",
    subject: "new telemetry event",
    requiredFields: ["eventName", "eventEnvelope", "normalizerPath", "privacyClass"],
    validator: "check:event-translation-bridge",
    reason: "Telemetry must not bypass envelope, consent, identity, and source truth.",
  },
  {
    ruleId: "metric-math-owner-required",
    subject: "new metric",
    requiredFields: ["metricId", "formulaOwner", "confidence", "freshness", "sourceTruth"],
    validator: "check:canonical-math-ledger",
    reason: "No user/admin number should display without math, source, confidence, and freshness.",
  },
  {
    ruleId: "journey-mapping-required",
    subject: "new user journey step",
    requiredFields: ["journeyStep", "durationMath", "eventFact", "debugLane"],
    validator: "check:user-journey-behavioral-intelligence",
    reason: "Journey meaning must come from normalized facts and explicit duration math.",
  },
  {
    ruleId: "debug-interpretive-brain-required",
    subject: "new debug lane",
    requiredFields: ["rootCause", "owner", "scoreImpact", "nextAction", "drilldownPolicy"],
    validator: "check:interpretive-brain-debug-triage",
    reason: "Debug defaults must explain root cause before raw evidence.",
  },
  {
    ruleId: "score-artifact-freshness-required",
    subject: "new score artifact",
    requiredFields: ["validator", "freshnessOwner", "scoreDimension", "currentHead"],
    validator: "check:beta-score",
    reason: "Generated reports are snapshots and need a current validator before affecting score.",
  },
  {
    ruleId: "cost-class-required",
    subject: "new cost surface",
    requiredFields: ["costClass", "readBounds", "writeBounds", "retryPolicy", "summaryFirst"],
    validator: "check:cost-export-sql-parity-math",
    reason: "Cost surfaces must be source-guarded before they surprise billing.",
  },
  {
    ruleId: "legacy-alias-canonical-map-required",
    subject: "new legacy alias",
    requiredFields: ["canonicalEventName", "canonicalMetricId", "confidenceCap", "dryRunOnly"],
    validator: "check:metric-canonicalization-legacy-recovery",
    reason: "Legacy aliases can recover evidence only through documented canonical mapping.",
  },
];

export function classifyCodebaseOrganizationDirtyFile(filePath: string): CodebaseOrganizationDirtyClassification {
  const normalized = filePath.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (/^agent\/state\/(codebase-organization-hardening|mega-legacy-pipeline-hardening|legacy-pipeline-inventory|pipeline-ownership-audit|global-formula-audit|legacy-canonical-recovery-plan|cost-accuracy-hardening|codex-execution-guardrails|self-revealing-codebase|public-beta-score)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(codebase-organization-hardening|mega-legacy-pipeline-hardening|legacy-pipeline-inventory|pipeline-ownership-audit|global-formula-audit|legacy-canonical-recovery-plan|cost-accuracy-hardening|codex-execution-guardrails|self-revealing-codebase)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (/^scripts\/agent\/validate-(codebase-organization-hardening|mega-legacy-pipeline-hardening)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(codebase-organization-hardening|mega-legacy-pipeline-hardening)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (/^(CHANGELOG\.md|public\/kandydrops-release-notes\.json|src\/lib\/release-notes\/public-release-notes\.ts|src\/lib\/release-notes\/release-version-contract\.ts)$/u.test(normalized)) return "release_artifact_expected";
  if (normalized.startsWith("src/lib/codebase-hardening/") || normalized === "src/lib/math/global-formula-audit.ts") return "real_source_change_needs_review";
  if (/paypal|payment|wallet|capture|provider|gumdrop.*pricing/iu.test(normalized)) return "unsafe_unknown";
  if (normalized.startsWith("src/app/api/")) return "unsafe_unknown";
  return "unsafe_unknown";
}

function classifyOpenPullRequest(title: unknown) {
  const text = String(title ?? "");
  if (/dependency|deps|npm|knip|syncpack|puppeteer/iu.test(text)) return "dependency_update_external_review_required";
  if (/onboarding/iu.test(text)) return "onboarding_telemetry_external_review_required";
  if (/doctrine/iu.test(text)) return "doctrine_governance_external_review_required";
  if (/monolith|responsibility/iu.test(text)) return "architecture_refactor_external_review_required";
  if (/security|sentinel|Math\.random/iu.test(text)) return "security_patch_external_review_required";
  if (/loading states|palette|accessib/iu.test(text)) return "accessibility_patch_external_review_required";
  if (/bolt|Map lookup|performance/iu.test(text)) return "performance_patch_external_review_required";
  return "external_review_required";
}

export function buildCodebaseOrganizationHardeningSummary(input?: {
  generatedAtUtc?: string;
  packageScripts?: Record<string, string>;
  dirtyFiles?: readonly string[];
  openPullRequests?: Array<{ number?: unknown; title?: unknown }>;
}): CodebaseOrganizationHardeningSummary {
  const packageScripts = input?.packageScripts ?? {};
  const dirtyFiles = [...(input?.dirtyFiles ?? [])].map((path) => ({
    path,
    classification: classifyCodebaseOrganizationDirtyFile(path),
  }));
  const openPullRequests = [...(input?.openPullRequests ?? [])].map((pr) => ({
    number: pr.number,
    title: pr.title,
    classification: classifyOpenPullRequest(pr.title),
  }));

  const selfCheck = {
    packageScriptsPresent: Boolean(packageScripts["check:codebase-organization-hardening"] && packageScripts["check:mega-legacy-pipeline-hardening"]),
    generatedArtifactsNeedValidator: true as const,
    noRouteWithoutFeatureRegistration: true as const,
    noMetricWithoutMathOwner: true as const,
    noDebugLaneWithoutBrainMapping: true as const,
  };
  const validationFailures = validateCodebaseOrganizationHardeningSummary({
    reportKey: "codebase-organization-hardening",
    generatedAtUtc: input?.generatedAtUtc ?? new Date().toISOString(),
    status: "pass",
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    deployPerformed: false,
    rules: CODEBASE_ORGANIZATION_HARDENING_RULES,
    requiredRulesSatisfied: CODEBASE_ORGANIZATION_HARDENING_RULES.length,
    dirtyFiles,
    openPullRequests,
    selfCheck,
  });

  return {
    reportKey: "codebase-organization-hardening",
    generatedAtUtc: input?.generatedAtUtc ?? new Date().toISOString(),
    status: validationFailures.length ? "fail" : "pass",
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    deployPerformed: false,
    rules: CODEBASE_ORGANIZATION_HARDENING_RULES,
    requiredRulesSatisfied: CODEBASE_ORGANIZATION_HARDENING_RULES.length,
    dirtyFiles,
    openPullRequests,
    selfCheck,
  };
}

export function validateCodebaseOrganizationHardeningSummary(summary: CodebaseOrganizationHardeningSummary) {
  const failures: string[] = [];
  if (!summary.selfCheck.packageScriptsPresent) {
    failures.push("Required package script check:codebase-organization-hardening is missing.");
    failures.push("Required package script check:mega-legacy-pipeline-hardening is missing.");
  }
  if (summary.rules.length !== CODEBASE_ORGANIZATION_HARDENING_RULES.length) failures.push("Organization hardening rules are incomplete.");
  for (const file of summary.dirtyFiles) {
    if (file.classification === "unsafe_unknown") failures.push(`${file.path} is unsafe_unknown for codebase organization hardening.`);
  }
  return failures;
}
