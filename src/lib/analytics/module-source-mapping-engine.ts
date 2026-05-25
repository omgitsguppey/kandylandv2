import {
  MODULE_COVERAGE_SOURCE_POLICIES,
  type AnalyticsModuleCoverageId,
  type AnalyticsModuleCoverageSourcePolicy,
  type AnalyticsModuleCoverageSourceType,
  getModuleCoveragePolicy,
  sourceLabel,
} from "./module-coverage-source-policy";

export { getModuleCoveragePolicy };
export type { AnalyticsModuleCoverageId, AnalyticsModuleCoverageSourceType };

export interface ModuleSourceEvidence {
  count: number;
  lastSeenAtUtc?: string | null;
  detail?: string;
}

export type ModuleEvidenceBySource = Partial<Record<AnalyticsModuleCoverageSourceType, ModuleSourceEvidence>>;
export type ModuleEvidenceByModule = Partial<Record<AnalyticsModuleCoverageId, ModuleEvidenceBySource>>;

export interface ModuleCoverageResult {
  moduleId: AnalyticsModuleCoverageId;
  moduleLabel: string;
  status: "verified" | "partial" | "empty" | "stale" | "failed" | "optional";
  severity: "info" | "review" | "error";
  requiredForBeta: boolean;
  sourceCount: number;
  expectedSources: string[];
  requiredSources: string[];
  acceptedSubstituteSources: string[];
  optionalSources: string[];
  externalEvidenceOnlySources: string[];
  internalCanonicalSources: string[];
  presentSources: string[];
  presentAcceptedSources: string[];
  missingSources: string[];
  missingRequiredSources: string[];
  missingOptionalSources: string[];
  missingExternalOnlySources: string[];
  sampleCount: number;
  evidenceSamples: number;
  lastSeenAtUtc: string | null;
  dependentPanels: string[];
  validators: string[];
  nextValidator: string;
  nextAction: string;
  blockedReason?: string;
  coverageWeight: number;
  scoreContribution: number;
  passPolicy: string;
  blockPolicy: string;
}

export interface ModuleCoverageSummary {
  totalModules: number;
  requiredModules: number;
  optionalModules: number;
  verifiedModules: number;
  partialModules: number;
  emptyModules: number;
  verifiedRequired: number;
  partialRequired: number;
  emptyRequired: number;
  verifiedOptional: number;
  partialOptional: number;
  emptyOptional: number;
  requiredGaps: number;
  optionalGaps: number;
  requiredGapModules: string[];
  optionalGapModules: string[];
  sampledModules: number;
  evidenceSamples: number;
  parityScore: number;
  optionalParityScore: number;
  parityScoreFormula: string;
  passAllowed: boolean;
  blockedReason?: "required_source_missing" | "module_empty" | "module_partial" | "unknown" | string;
}

function toLabels(sources: AnalyticsModuleCoverageSourceType[]) {
  return sources.map(sourceLabel);
}

function sourceCount(evidence: ModuleEvidenceBySource, source: AnalyticsModuleCoverageSourceType) {
  return Math.max(0, Math.round(evidence[source]?.count ?? 0));
}

function latestSeen(evidence: ModuleEvidenceBySource, sources: AnalyticsModuleCoverageSourceType[]) {
  return sources.reduce<string | null>((latest, source) => {
    const value = evidence[source]?.lastSeenAtUtc ?? null;
    if (!value) return latest;
    if (!latest) return value;
    return value > latest ? value : latest;
  }, null);
}

function severityFor(status: ModuleCoverageResult["status"], requiredForBeta: boolean) {
  if (!requiredForBeta) return status === "empty" ? "info" : status === "verified" ? "info" : "review";
  if (status === "empty" || status === "failed") return "error";
  if (status === "partial" || status === "stale") return "review";
  return "info";
}

export function classifyModuleSourcePresence(policy: AnalyticsModuleCoverageSourcePolicy, evidence: ModuleEvidenceBySource) {
  const allPolicySources = Array.from(new Set([
    ...policy.requiredSources,
    ...policy.acceptedSubstituteSources,
    ...policy.optionalSources,
    ...policy.externalEvidenceOnlySources,
    ...policy.internalCanonicalSources,
  ]));
  const presentSources = allPolicySources.filter((source) => sourceCount(evidence, source) > 0);
  const acceptedSourceTypes = Array.from(new Set([
    ...policy.requiredSources,
    ...policy.acceptedSubstituteSources,
    ...policy.internalCanonicalSources,
  ]));
  const presentAcceptedSources = acceptedSourceTypes.filter((source) => sourceCount(evidence, source) > 0);
  const missingRequiredSources = policy.requiredSources.filter((source) => sourceCount(evidence, source) <= 0);
  const missingOptionalSources = policy.optionalSources.filter((source) => sourceCount(evidence, source) <= 0);
  const missingExternalOnlySources = policy.externalEvidenceOnlySources.filter((source) => sourceCount(evidence, source) <= 0);
  const missingSources = allPolicySources.filter((source) => sourceCount(evidence, source) <= 0);

  return {
    allPolicySources,
    presentSources,
    presentAcceptedSources,
    missingSources,
    missingRequiredSources,
    missingOptionalSources,
    missingExternalOnlySources,
  };
}

export function resolveModuleAcceptedSources(policy: AnalyticsModuleCoverageSourcePolicy, evidence: ModuleEvidenceBySource) {
  return classifyModuleSourcePresence(policy, evidence).presentAcceptedSources;
}

export function calculateModuleCoverage(policy: AnalyticsModuleCoverageSourcePolicy, evidence: ModuleEvidenceBySource): ModuleCoverageResult {
  const presence = classifyModuleSourcePresence(policy, evidence);
  const requiredPresentCount = policy.requiredSources.filter((source) => sourceCount(evidence, source) > 0).length;
  const requiredSatisfied = policy.requiredSources.length === 0 || requiredPresentCount === policy.requiredSources.length;
  const hasAcceptedEvidence = presence.presentAcceptedSources.length > 0;
  const presentSubstituteCount = policy.acceptedSubstituteSources
    .filter((source) => !policy.requiredSources.includes(source))
    .filter((source) => sourceCount(evidence, source) > 0).length;
  const needsSupportingSubstitute = policy.requiredForBeta
    && policy.requiredSources.length === 1
    && policy.acceptedSubstituteSources.length > 0;
  const hasRequiredOrSubstitutePair = requiredSatisfied
    && (!needsSupportingSubstitute || presentSubstituteCount > 0)
    && presence.presentAcceptedSources.length >= Math.max(1, Math.min(2, policy.requiredSources.length + policy.acceptedSubstituteSources.length));
  const status: ModuleCoverageResult["status"] = !hasAcceptedEvidence
    ? "empty"
    : hasRequiredOrSubstitutePair
      ? "verified"
      : "partial";
  const criticalMissing = policy.requiredForBeta && presence.missingRequiredSources.length > 0;
  const scoreContribution = status === "verified" ? 1 : status === "partial" ? (criticalMissing ? 0.35 : 0.5) : 0;
  const sampleCount = presence.presentSources.reduce((total, source) => total + sourceCount(evidence, source), 0);
  const blockedReason = status === "empty"
    ? `module_empty:${policy.moduleId}`
    : criticalMissing
      ? `required_source_missing:${presence.missingRequiredSources.map(sourceLabel).join(", ")}`
      : status === "partial"
        ? `module_partial:${policy.moduleId}`
        : undefined;

  return {
    moduleId: policy.moduleId,
    moduleLabel: policy.label,
    status,
    severity: severityFor(status, policy.requiredForBeta),
    requiredForBeta: policy.requiredForBeta,
    sourceCount: presence.presentSources.length,
    expectedSources: toLabels(presence.allPolicySources),
    requiredSources: toLabels(policy.requiredSources),
    acceptedSubstituteSources: toLabels(policy.acceptedSubstituteSources),
    optionalSources: toLabels(policy.optionalSources),
    externalEvidenceOnlySources: toLabels(policy.externalEvidenceOnlySources),
    internalCanonicalSources: toLabels(policy.internalCanonicalSources),
    presentSources: toLabels(presence.presentSources),
    presentAcceptedSources: toLabels(presence.presentAcceptedSources),
    missingSources: toLabels(presence.missingSources),
    missingRequiredSources: toLabels(presence.missingRequiredSources),
    missingOptionalSources: toLabels(presence.missingOptionalSources),
    missingExternalOnlySources: toLabels(presence.missingExternalOnlySources),
    sampleCount,
    evidenceSamples: sampleCount,
    lastSeenAtUtc: latestSeen(evidence, presence.presentSources),
    dependentPanels: policy.dependentPanels,
    validators: policy.validators,
    nextValidator: policy.validators[0] ?? "check:admin-debug-control-tower",
    nextAction: policy.nextAction,
    blockedReason,
    coverageWeight: policy.requiredForBeta ? 1 : 0,
    scoreContribution,
    passPolicy: policy.passPolicy,
    blockPolicy: policy.blockPolicy,
  };
}

export function explainModuleCoverage(_policy: AnalyticsModuleCoverageSourcePolicy, result: ModuleCoverageResult) {
  if (result.status === "verified") {
    return `${result.moduleLabel} verified with ${result.presentAcceptedSources.join(", ") || "accepted sources"}.`;
  }
  if (result.status === "partial") {
    return `${result.moduleLabel} partial; present ${result.presentAcceptedSources.join(", ") || "accepted sources not recorded"}; missing canonical ${result.missingRequiredSources.join(", ") || "none"}.`;
  }
  return `${result.moduleLabel} empty; missing canonical ${result.missingRequiredSources.join(", ") || result.expectedSources.join(", ")}.`;
}

export function reconcileModuleCoverageCounts(results: ModuleCoverageResult[]): ModuleCoverageSummary {
  const required = results.filter((module) => module.requiredForBeta);
  const optional = results.filter((module) => !module.requiredForBeta);
  const requiredScore = required.reduce((total, module) => total + module.scoreContribution, 0);
  const optionalScore = optional.reduce((total, module) => total + module.scoreContribution, 0);
  const requiredGapModules = required.filter((module) => module.status !== "verified").map((module) => module.moduleId);
  const optionalGapModules = optional.filter((module) => module.status !== "verified").map((module) => module.moduleId);
  const emptyRequired = required.filter((module) => module.status === "empty").length;
  const partialRequired = required.filter((module) => module.status === "partial").length;
  const blockedReason = emptyRequired > 0
    ? `module_empty:${required.filter((module) => module.status === "empty").map((module) => module.moduleId).join(",")}`
    : partialRequired > 0
      ? `module_partial:${required.filter((module) => module.status === "partial").map((module) => module.moduleId).join(",")}`
      : undefined;

  return {
    totalModules: results.length,
    requiredModules: required.length,
    optionalModules: optional.length,
    verifiedModules: results.filter((module) => module.status === "verified").length,
    partialModules: results.filter((module) => module.status === "partial").length,
    emptyModules: results.filter((module) => module.status === "empty").length,
    verifiedRequired: required.filter((module) => module.status === "verified").length,
    partialRequired,
    emptyRequired,
    verifiedOptional: optional.filter((module) => module.status === "verified").length,
    partialOptional: optional.filter((module) => module.status === "partial").length,
    emptyOptional: optional.filter((module) => module.status === "empty").length,
    requiredGaps: requiredGapModules.length,
    optionalGaps: optionalGapModules.length,
    requiredGapModules,
    optionalGapModules,
    sampledModules: results.filter((module) => module.sampleCount > 0).length,
    evidenceSamples: results.reduce((total, module) => total + module.evidenceSamples, 0),
    parityScore: required.length > 0 ? Math.round((requiredScore / required.length) * 100) : 100,
    optionalParityScore: optional.length > 0 ? Math.round((optionalScore / optional.length) * 100) : 100,
    parityScoreFormula: "Required verified=1.0, required partial=0.5 unless a critical required source is missing then 0.35, required empty=0; optional modules are scored separately.",
    passAllowed: requiredGapModules.length === 0,
    blockedReason,
  };
}

export function buildModuleSourceMap(input: {
  range: string;
  generatedAtUtc: string;
  evidenceByModule: ModuleEvidenceByModule;
}) {
  const modules = MODULE_COVERAGE_SOURCE_POLICIES.map((policy) => calculateModuleCoverage(policy, input.evidenceByModule[policy.moduleId] ?? {}));
  return {
    range: input.range,
    generatedAtUtc: input.generatedAtUtc,
    modules,
    ...reconcileModuleCoverageCounts(modules),
  };
}
