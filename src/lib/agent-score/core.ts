import {
  PUBLIC_BETA_BLAST_RADIUS_MULTIPLIERS,
  PUBLIC_BETA_DOMAIN_WEIGHTS,
  PUBLIC_BETA_SEVERITY_PENALTIES,
  PUBLIC_BETA_STATUS_THRESHOLDS,
} from "./weights";

export type PublicBetaDomain = keyof typeof PUBLIC_BETA_DOMAIN_WEIGHTS;
export type PublicBetaSeverity = keyof typeof PUBLIC_BETA_SEVERITY_PENALTIES;
export type PublicBetaBlastRadius = keyof typeof PUBLIC_BETA_BLAST_RADIUS_MULTIPLIERS;
export type PublicBetaStatus = "clean" | "pass" | "warning" | "beta-risk" | "fail";
export type PublicBetaDocsBasis = "google" | "apple" | "kandydrops" | "repo";

export type PublicBetaFinding = {
  id: string;
  domain: PublicBetaDomain;
  category: string;
  title: string;
  severity: PublicBetaSeverity;
  confidence: number;
  blastRadius: PublicBetaBlastRadius;
  filePath: string;
  line?: number;
  excerpt?: string;
  rawPenalty: number;
  weightedPenalty: number;
  canAutofix: boolean;
  autofixConfidence: number;
  autofixPlan?: string;
  escalation: string;
  evidence: string[];
  docsBasis: PublicBetaDocsBasis[];
};

export type PublicBetaScoreReport = {
  generatedAt: string;
  overallScore: number;
  overallStatus: PublicBetaStatus;
  domainScores: Record<PublicBetaDomain, {
    weight: number;
    score: number;
    status: PublicBetaStatus;
    findingCount: number;
    criticalCount: number;
    majorCount: number;
  }>;
  findings: PublicBetaFinding[];
  dedupedFindingCount: number;
  safeAutofixesAvailable: number;
  safeAutofixesApplied: number;
  recommendedNextActions: string[];
  minimalVerificationCommands: string[];
  commandBudget: {
    allowedCommands: string[];
    forbiddenCommands: string[];
    maxCommands: number;
  };
  summary: string;
};

export type PublicBetaFindingInput = Omit<PublicBetaFinding, "id" | "rawPenalty" | "weightedPenalty"> & {
  id?: string;
};

export type PublicBetaScoreOptions = {
  generatedAt?: string;
  recentFiles?: string[];
  safeAutofixesApplied?: number;
  recommendedNextActions?: string[];
  minimalVerificationCommands?: string[];
  commandBudget: PublicBetaScoreReport["commandBudget"];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function normalizeScorePath(filePath: string) {
  return filePath.replace(/\\/g, "/").replace(/^\.?\//u, "");
}

function normalizeExcerpt(excerpt?: string) {
  return (excerpt ?? "").replace(/\s+/gu, " ").trim().slice(0, 160);
}

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
}

export function resolvePublicBetaStatus(score: number, hasCritical = false): PublicBetaStatus {
  if (hasCritical) {
    return "fail";
  }
  if (score >= PUBLIC_BETA_STATUS_THRESHOLDS.clean) {
    return "clean";
  }
  if (score >= PUBLIC_BETA_STATUS_THRESHOLDS.pass) {
    return "pass";
  }
  if (score >= PUBLIC_BETA_STATUS_THRESHOLDS.warning) {
    return "warning";
  }
  if (score >= PUBLIC_BETA_STATUS_THRESHOLDS.betaRisk) {
    return "beta-risk";
  }
  return "fail";
}

export function isCriticalAutoFail(finding: Pick<PublicBetaFinding, "severity" | "confidence" | "domain" | "category">) {
  if (finding.severity !== "critical") {
    return false;
  }
  if (finding.confidence >= 0.85) {
    return true;
  }
  return finding.domain === "contentProtection" && finding.category.includes("content-leak");
}

export function calculatePublicBetaPenalty(input: {
  severity: PublicBetaSeverity;
  confidence: number;
  blastRadius: PublicBetaBlastRadius;
  filePath: string;
  recentFiles?: string[];
}) {
  const confidence = clamp(input.confidence, 0, 1);
  const rawPenalty = PUBLIC_BETA_SEVERITY_PENALTIES[input.severity] * confidence;
  const blastMultiplier = PUBLIC_BETA_BLAST_RADIUS_MULTIPLIERS[input.blastRadius];
  const normalizedPath = normalizeScorePath(input.filePath);
  const recentMultiplier = input.recentFiles?.some((file) => normalizeScorePath(file) === normalizedPath) ? 1.15 : 1;
  return {
    rawPenalty: roundScore(rawPenalty),
    weightedPenalty: roundScore(rawPenalty * blastMultiplier * recentMultiplier),
  };
}

export function buildPublicBetaFinding(input: PublicBetaFindingInput, recentFiles: string[] = []): PublicBetaFinding {
  const normalizedPath = normalizeScorePath(input.filePath);
  const confidence = clamp(input.confidence, 0, 1);
  const resolvedSeverity = input.severity === "critical"
    && confidence < 0.85
    && !(input.domain === "contentProtection" && input.category.includes("content-leak"))
    ? "major"
    : input.severity;
  const penalties = calculatePublicBetaPenalty({
    severity: resolvedSeverity,
    confidence,
    blastRadius: input.blastRadius,
    filePath: normalizedPath,
    recentFiles,
  });
  const signature = [
    input.domain,
    input.category,
    normalizeTitle(input.title),
    normalizedPath,
    input.line ?? "",
    normalizeExcerpt(input.excerpt),
  ].join("|");

  return {
    ...input,
    severity: resolvedSeverity,
    id: input.id ?? `${input.domain}-${input.category}-${stableHash(signature)}`,
    filePath: normalizedPath,
    confidence,
    rawPenalty: penalties.rawPenalty,
    weightedPenalty: penalties.weightedPenalty,
    evidence: Array.from(new Set(input.evidence)),
    docsBasis: Array.from(new Set(input.docsBasis)),
  };
}

function severityRank(severity: PublicBetaSeverity) {
  return ["info", "minor", "moderate", "major", "critical"].indexOf(severity);
}

function dedupeKey(finding: PublicBetaFinding) {
  return [
    finding.filePath,
    finding.line ?? "",
    normalizeExcerpt(finding.excerpt),
    finding.category,
    normalizeTitle(finding.title),
  ].join("|");
}

export function dedupePublicBetaFindings(findings: PublicBetaFinding[]) {
  const byKey = new Map<string, PublicBetaFinding>();
  for (const finding of findings) {
    const key = dedupeKey(finding);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, finding);
      continue;
    }

    const keepIncoming = severityRank(finding.severity) > severityRank(existing.severity)
      || (finding.severity === existing.severity && finding.confidence > existing.confidence);
    const winner = keepIncoming ? finding : existing;
    const loser = keepIncoming ? existing : finding;
    byKey.set(key, {
      ...winner,
      evidence: Array.from(new Set([...winner.evidence, ...loser.evidence])),
      docsBasis: Array.from(new Set([...winner.docsBasis, ...loser.docsBasis])),
      canAutofix: winner.canAutofix && loser.canAutofix,
      autofixConfidence: Math.max(winner.autofixConfidence, loser.autofixConfidence),
    });
  }
  return Array.from(byKey.values()).sort((left, right) =>
    severityRank(right.severity) - severityRank(left.severity)
    || right.weightedPenalty - left.weightedPenalty
    || left.filePath.localeCompare(right.filePath));
}

export function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}

export function buildPublicBetaScoreReport(
  rawFindings: PublicBetaFindingInput[],
  options: PublicBetaScoreOptions,
): PublicBetaScoreReport {
  const recentFiles = options.recentFiles ?? [];
  const findings = dedupePublicBetaFindings(rawFindings.map((finding) => buildPublicBetaFinding(finding, recentFiles)));
  const domainScores = {} as PublicBetaScoreReport["domainScores"];
  let weightedScoreTotal = 0;
  let weightTotal = 0;
  let criticalAutoFail = false;

  for (const [domain, weight] of Object.entries(PUBLIC_BETA_DOMAIN_WEIGHTS) as Array<[PublicBetaDomain, number]>) {
    const domainFindings = findings.filter((finding) => finding.domain === domain);
    const penalty = domainFindings.reduce((sum, finding) => sum + finding.weightedPenalty, 0);
    const hasCritical = domainFindings.some(isCriticalAutoFail);
    const score = roundScore(clamp(100 - penalty, 0, 100));
    const status = resolvePublicBetaStatus(score, hasCritical);
    criticalAutoFail ||= hasCritical;
    weightedScoreTotal += score * weight;
    weightTotal += weight;
    domainScores[domain] = {
      weight,
      score,
      status,
      findingCount: domainFindings.length,
      criticalCount: domainFindings.filter((finding) => finding.severity === "critical").length,
      majorCount: domainFindings.filter((finding) => finding.severity === "major").length,
    };
  }

  const overallScore = roundScore(weightTotal > 0 ? weightedScoreTotal / weightTotal : 100);
  const safeAutofixesAvailable = findings.filter((finding) => finding.canAutofix && finding.autofixConfidence >= 0.95).length;
  const summaryStatus = resolvePublicBetaStatus(overallScore, criticalAutoFail);

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    overallScore,
    overallStatus: summaryStatus,
    domainScores,
    findings,
    dedupedFindingCount: findings.length,
    safeAutofixesAvailable,
    safeAutofixesApplied: options.safeAutofixesApplied ?? 0,
    recommendedNextActions: options.recommendedNextActions ?? [],
    minimalVerificationCommands: options.minimalVerificationCommands ?? [],
    commandBudget: options.commandBudget,
    summary: `Public beta deterministic score ${overallScore}/100 (${summaryStatus}) with ${findings.length} deduped finding(s) and ${safeAutofixesAvailable} safe autofix(es) available.`,
  };
}
