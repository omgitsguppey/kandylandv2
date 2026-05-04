export const CODEBASE_HARDENING_REPORT_PATH = "agent/state/codebase-hardening.generated.json" as const;

export const CODEBASE_HARDENING_DOMAINS = [
  "routeCachingAndDataCost",
  "clientHydrationAndEffects",
  "apiRateLimitAndCloudCost",
  "paymentWalletAndEconomyTruth",
  "contentProtectionAndEntitlements",
  "telemetryPrivacyAndDebugEvidence",
  "deviceUiAndImagePerformance",
  "supportNotificationsAndChatReliability",
  "legacyOrphanCleanup",
] as const;

export type CodebaseHardeningDomain = (typeof CODEBASE_HARDENING_DOMAINS)[number];
export type CodebaseHardeningSeverity = "info" | "minor" | "moderate" | "major" | "critical";
export type CodebaseHardeningStatus = "clean" | "pass" | "warning" | "beta-risk" | "fail";

export type CodebaseHardeningFinding = {
  id: string;
  domain: CodebaseHardeningDomain;
  severity: CodebaseHardeningSeverity;
  filePath: string;
  line?: number;
  title: string;
  evidence: string[];
  expectedRule: string;
  actualPattern: string;
  canAutofix: boolean;
  autofixConfidence: number;
  suggestedFix: string;
  humanReadableEscalation: string;
  blockedBroadCommands: string[];
};

export type CodebaseHardeningFindingInput = Omit<CodebaseHardeningFinding, "id" | "blockedBroadCommands"> & {
  id?: string;
  blockedBroadCommands?: string[];
};

export type CodebaseHardeningDomainScore = {
  weight: number;
  score: number;
  status: CodebaseHardeningStatus;
  findingCount: number;
  criticalCount: number;
  majorCount: number;
};

export type CodebaseHardeningRouteCostClassification = {
  static: number;
  swr: number;
  hot_cache: number;
  no_store: number;
  unknown: number;
  routes: Array<{
    routePath: string;
    filePath: string;
    methods: string[];
    cachePolicy: "static" | "swr" | "hot_cache" | "no_store" | "unknown";
    costClass: string;
  }>;
};

export type CodebaseHardeningRiskFile = {
  filePath: string;
  findingCount: number;
  highestSeverity: CodebaseHardeningSeverity;
};

export type CodebaseHardeningReport = {
  generatedAt: string;
  overallScore: number;
  status: CodebaseHardeningStatus;
  domainScores: Record<CodebaseHardeningDomain, CodebaseHardeningDomainScore>;
  findings: CodebaseHardeningFinding[];
  criticalFindings: CodebaseHardeningFinding[];
  topFindings: CodebaseHardeningFinding[];
  safeAutofixesAvailable: number;
  safeAutofixesApplied: number;
  recommendedFixOrder: string[];
  minimalCommands: string[];
  forbiddenCommands: string[];
  commandBudget: {
    allowedCommands: string[];
    forbiddenCommands: string[];
    maxCommands: number;
  };
  filesMostAtRisk: CodebaseHardeningRiskFile[];
  routeCostClassificationSummary: CodebaseHardeningRouteCostClassification;
  legacyCleanupPlan: string[];
  summary: string;
};

export const CODEBASE_HARDENING_DOMAIN_WEIGHTS: Record<CodebaseHardeningDomain, number> = {
  routeCachingAndDataCost: 12,
  clientHydrationAndEffects: 12,
  apiRateLimitAndCloudCost: 14,
  paymentWalletAndEconomyTruth: 12,
  contentProtectionAndEntitlements: 12,
  telemetryPrivacyAndDebugEvidence: 12,
  deviceUiAndImagePerformance: 10,
  supportNotificationsAndChatReliability: 8,
  legacyOrphanCleanup: 8,
};

export const CODEBASE_HARDENING_SEVERITY_PENALTIES: Record<CodebaseHardeningSeverity, number> = {
  info: 0,
  minor: 2,
  moderate: 5,
  major: 10,
  critical: 25,
};

export const CODEBASE_HARDENING_ALLOWED_COMMANDS = [
  "npm run score:hardening",
  "npm run check:hardening",
  "npm run repair:hardening",
  "npm run repair:hardening -- --apply",
  "one targeted test script for touched domain",
  "npm run typecheck only if TypeScript source changed",
] as const;

export const CODEBASE_HARDENING_FORBIDDEN_COMMANDS = [
  "npm run check",
  "npm run check:ui:audits",
  "npm run check:ui:continuity",
  "npm run check:ui:omni",
  "npm run check:ui:lighthouse",
  "playwright",
  "cypress",
  "lighthouse",
  "test:gate:signoff",
] as const;

export const CODEBASE_HARDENING_DOCTRINE_NOTE =
  "KandyDrops hardening is deterministic first. Agents must score and target the affected domain before broad verification. No full-suite terminal marathons by default. The repo must protect cost surfaces, source-of-truth layers, privacy/telemetry, payments, locked content, chat/support reliability, image/device performance, and legacy cleanup without rewriting stable business logic.";

const SEVERITY_ORDER: Record<CodebaseHardeningSeverity, number> = {
  info: 0,
  minor: 1,
  moderate: 2,
  major: 3,
  critical: 4,
};

export function normalizeHardeningPath(filePath: string) {
  return filePath.replace(/\\/g, "/").replace(/^\.\//u, "");
}

export function stableHardeningHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function getHardeningSeverityRank(severity: CodebaseHardeningSeverity) {
  return SEVERITY_ORDER[severity];
}

export function getHardeningStatus(score: number, hasCritical: boolean, hasMajor: boolean): CodebaseHardeningStatus {
  if (hasCritical) return "fail";
  if (hasMajor) return "beta-risk";
  if (score >= 95) return "clean";
  if (score >= 90) return "pass";
  if (score >= 80) return "warning";
  if (score >= 70) return "beta-risk";
  return "fail";
}

export function buildHardeningFinding(input: CodebaseHardeningFindingInput): CodebaseHardeningFinding {
  const normalizedPath = normalizeHardeningPath(input.filePath);
  const idSeed = [
    input.domain,
    input.severity,
    normalizedPath,
    input.line ?? "",
    input.title,
    input.actualPattern,
  ].join("|");

  return {
    ...input,
    id: input.id ?? `hardening_${stableHardeningHash(idSeed)}`,
    filePath: normalizedPath,
    evidence: Array.from(new Set(input.evidence)),
    blockedBroadCommands: [...(input.blockedBroadCommands ?? CODEBASE_HARDENING_FORBIDDEN_COMMANDS)],
  };
}
