import type { SelfRevealingCodebaseReport, SelfRevealingFinding } from "./self-revealing-codebase-contract";

export type { SelfRevealingCodebaseReport, SelfRevealingFinding };

const FINDINGS: SelfRevealingFinding[] = [
  {
    findingId: "orphaned-limb-product-body-map",
    domain: "orphaned_limb",
    bodySystem: "admin_debug_ops",
    sourcePath: "src/lib/product-integrity/product-body-map.ts",
    owner: "product-integrity",
    severity: "medium",
    actionability: "classify",
    rootCause: "A visible limb without body-system ownership can bypass telemetry, metrics, debug, and score.",
    exactNextAction: "Run npm run check:product-body-map and classify each orphan as connected, deferred_with_owner, in_flight, or unsafe_unknown.",
    validator: "npm run check:product-body-map",
    scoreImpact: ["evidenceCompleteness"],
    costImpact: "none",
    accuracyImpact: "high",
    userVisibleImpact: "Prevents user-visible features from losing state or telemetry ownership.",
    adminVisibleImpact: "Admin debug can see orphaned and deferred limbs with next actions.",
  },
  {
    findingId: "duplicate-formula-global-audit",
    domain: "duplicate_formula",
    bodySystem: "telemetry_behavioral_intelligence",
    sourcePath: "src/lib/math/global-formula-audit.ts",
    owner: "math",
    severity: "high",
    actionability: "fix_now",
    rootCause: "Formula copies can drift from canonical math and corrupt user/admin numbers.",
    exactNextAction: "Route every new formula through canonical math ledger or mark needs_operator_decision.",
    validator: "npm run check:canonical-math-ledger",
    scoreImpact: ["sourceHealth", "evidenceCompleteness"],
    costImpact: "none",
    accuracyImpact: "high",
    userVisibleImpact: "Prevents exact-looking weak or stale metric displays.",
    adminVisibleImpact: "Admin debug sees formula owner, confidence, freshness, and source truth.",
  },
  {
    findingId: "stale-artifact-score-input",
    domain: "stale_artifact",
    bodySystem: "admin_debug_ops",
    sourcePath: "agent/state/*.generated.json",
    owner: "beta-score",
    severity: "medium",
    actionability: "classify",
    rootCause: "Generated reports are snapshots and can become stale score inputs.",
    exactNextAction: "Regenerate active score-owned reports or retire superseded artifacts from score inputs.",
    validator: "npm run check:beta-score",
    scoreImpact: ["freshness", "evidenceCompleteness"],
    costImpact: "none",
    accuracyImpact: "medium",
    userVisibleImpact: "Prevents beta readiness from implying stale proof is current.",
    adminVisibleImpact: "Admin debug sees stale artifact owner and exact refresh command.",
  },
  {
    findingId: "telemetry-chain-central-normalizer",
    domain: "broken_telemetry_chain",
    bodySystem: "telemetry_behavioral_intelligence",
    sourcePath: "src/lib/product-integrity/central-normalizer.ts",
    owner: "analytics",
    severity: "high",
    actionability: "fix_now",
    rootCause: "Signals that skip central normalizer can bypass envelope, facts, metrics, debug, score, and exports.",
    exactNextAction: "Add a central normalizer adapter or document an exemption for each direct telemetry path.",
    validator: "npm run check:central-normalizer-spine",
    scoreImpact: ["sourceHealth", "runtimeHealth"],
    costImpact: "medium",
    accuracyImpact: "high",
    userVisibleImpact: "User actions keep canonical metric and journey meaning.",
    adminVisibleImpact: "Debug triage can show the broken stage instead of raw noise.",
  },
  {
    findingId: "metric-materializer-person-metrics",
    domain: "missing_metric_materializer",
    bodySystem: "telemetry_behavioral_intelligence",
    sourcePath: "src/lib/analytics/person-metrics-hydration.ts",
    owner: "analytics",
    severity: "high",
    actionability: "fix_now",
    rootCause: "Missing metric producers or bridges must show as gaps, not zero.",
    exactNextAction: "Keep unique metric IDs across missing hydration and blocking user-parity gaps wired to debugLane.gaps and scoreImpactByDimension.",
    validator: "npm run check:person-metrics-hydration",
    scoreImpact: ["evidenceCompleteness"],
    costImpact: "none",
    accuracyImpact: "high",
    userVisibleImpact: "Missing activity does not display as proven zero.",
    adminVisibleImpact: "Admin sees missing producer/bridge gap counts.",
  },
  {
    findingId: "cost-owner-review-source-guards",
    domain: "cost_owner_review_lane",
    bodySystem: "cost_runtime_infrastructure",
    sourcePath: "src/lib/codebase-hardening/cost-accuracy-hardening.ts",
    owner: "cost-runtime-infrastructure",
    severity: "high",
    actionability: "external_evidence_required",
    rootCause: "Source cost guards exist, but external billing proof remains separate.",
    exactNextAction: "Collect external billing/provider artifact before marking cost lanes full pass.",
    validator: "npm run check:cost-export-sql-parity-math",
    scoreImpact: ["costRisk"],
    costImpact: "high",
    accuracyImpact: "medium",
    userVisibleImpact: "No product metric accuracy is reduced for cost claims.",
    adminVisibleImpact: "Cost lanes show source guarded with external review remaining.",
  },
  {
    findingId: "formal-runtime-provider-gate",
    domain: "formal_evidence_requirement",
    bodySystem: "admin_debug_ops",
    sourcePath: "agent/state/public-beta-score.generated.json",
    owner: "operator",
    severity: "medium",
    actionability: "manual_review",
    rootCause: "Source validators cannot clear deployed runtime, provider, or admin production sample proof.",
    exactNextAction: "Attach formal runtime/provider/admin sample artifacts outside Codex source-only checks.",
    validator: "npm run check:current-beta-exit-status",
    scoreImpact: ["runtimeHealth", "evidenceCompleteness"],
    costImpact: "none",
    accuracyImpact: "medium",
    userVisibleImpact: "Beta readiness remains honest about formal gates.",
    adminVisibleImpact: "Admin debug separates source confidence from typed evidence artifacts.",
  },
  {
    findingId: "legacy-recovery-dry-run",
    domain: "legacy_recovery_candidate",
    bodySystem: "telemetry_behavioral_intelligence",
    sourcePath: "src/lib/codebase-hardening/legacy-canonical-recovery-plan.ts",
    owner: "analytics",
    severity: "medium",
    actionability: "manual_review",
    rootCause: "Historical events can be mapped only as dry-run candidates until approved.",
    exactNextAction: "Review dry-run canonicalization output before any mutation path exists.",
    validator: "npm run check:metric-canonicalization-legacy-recovery",
    scoreImpact: ["evidenceCompleteness"],
    costImpact: "low",
    accuracyImpact: "high",
    userVisibleImpact: "Legacy data cannot become exact user truth without deterministic evidence.",
    adminVisibleImpact: "Admin sees confidence, duplicate risk, and archive-only decisions.",
  },
];

export function buildSelfRevealingCodebaseReport(input?: {
  generatedAtUtc?: string;
  findings?: readonly SelfRevealingFinding[];
}): SelfRevealingCodebaseReport {
  const findings = [...(input?.findings ?? FINDINGS)];
  return {
    reportKey: "self-revealing-codebase",
    generatedAtUtc: input?.generatedAtUtc ?? new Date().toISOString(),
    status: findings.some((finding) => finding.domain === "unsafe_unknown") ? "fail" : "pass",
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    deployPerformed: false,
    findings,
  };
}

export function validateSelfRevealingCodebaseReport(report: SelfRevealingCodebaseReport) {
  const failures: string[] = [];
  const requiredDomains = new Set([
    "orphaned_limb",
    "duplicate_formula",
    "stale_artifact",
    "broken_telemetry_chain",
    "missing_metric_materializer",
    "cost_owner_review_lane",
    "formal_evidence_requirement",
    "legacy_recovery_candidate",
  ]);
  for (const domain of requiredDomains) {
    if (!report.findings.some((finding) => finding.domain === domain)) failures.push(`${domain} finding missing.`);
  }
  for (const finding of report.findings) {
    if (!finding.owner || !finding.rootCause || !finding.exactNextAction || !finding.validator) failures.push(`${finding.findingId} lacks owner, root cause, next action, or validator.`);
  }
  return failures;
}
