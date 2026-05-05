export const CODE_ORGANIZATION_REPORT_PATH = "agent/state/code-organization-score.generated.json" as const;
export const CODE_ORGANIZATION_CONTEXT_INDEX_PATH = "agent/context/code-organization.index.json" as const;
export const CODE_ORGANIZATION_AGENT_TRUTH_DOC_PATH = "docs/agent-truth/code-organization-doctrine.md" as const;
export const CODE_ORGANIZATION_DOCTRINE_DOC_PATH = "docs/doctrine/kandydrops-code-organization.md" as const;

export const CODE_ORGANIZATION_DOCTRINE_NOTE =
  "KandyDrops code organization protects source-truth hierarchy, small self-contained change surfaces, affected validation, deterministic cacheability, and compact agent context before broad audits or route moves.";

export const CODE_ORGANIZATION_FEATURES = [
  "wallet",
  "drops",
  "viewer",
  "creator-profile",
  "creator-dashboard",
  "chat",
  "support",
  "moderation",
  "notifications",
  "admin-users",
  "analytics",
  "recommendations",
] as const;

export type CodeOrganizationFeature = (typeof CODE_ORGANIZATION_FEATURES)[number];

export const CODE_ORGANIZATION_FEATURE_CHILDREN = [
  "components",
  "hooks",
  "server",
  "contracts",
  "scoring",
  "validators",
  "tests",
  "index.ts",
] as const;

export const CODE_ORGANIZATION_ROUTE_GROUPS = [
  "src/app/(public)",
  "src/app/(auth)",
  "src/app/(user)",
  "src/app/(creator)",
  "src/app/(admin)",
  "src/app/(system)",
] as const;

export const CODE_ORGANIZATION_TRUTH_LAYER_ORDER = [
  "contract",
  "server truth",
  "client projection",
  "UI display",
  "telemetry",
  "validator",
  "docs",
] as const;

export const CODE_ORGANIZATION_HIERARCHY = {
  "src/app": "Route entrypoints only; use route groups for organization without URL changes.",
  "src/features": "Domain and product ownership. Route/client components should delegate here over time.",
  "src/lib": "Shared primitives only; no feature-specific product ownership.",
  "src/lib/server": "Server-only shared logic and source-truth helpers.",
  "src/components/ui": "Pure reusable UI only, without product source truth.",
  "scripts/agent": "Repo inspection and validation only.",
  docs: "Human-readable doctrine.",
  "agent/context": "Machine-readable compact doctrine and context packs.",
} as const;

export const CODE_ORGANIZATION_SCORE_BUCKETS = [
  { key: "hierarchyCompliance", label: "hierarchy compliance", weight: 20 },
  { key: "fileSizeHealth", label: "file-size health", weight: 15 },
  { key: "featureOwnership", label: "feature ownership", weight: 15 },
  { key: "truthLayerSeparation", label: "truth-layer separation", weight: 20 },
  { key: "agentContextEfficiency", label: "agent context efficiency", weight: 10 },
  { key: "legacyPhaseOut", label: "legacy phase-out", weight: 10 },
  { key: "validatorCoverage", label: "validator coverage", weight: 10 },
] as const;

export type CodeOrganizationBucket = (typeof CODE_ORGANIZATION_SCORE_BUCKETS)[number]["key"];
export type CodeOrganizationSeverity = "info" | "warning" | "review_required" | "critical";
export type CodeOrganizationStatus = "clean" | "pass" | "warning" | "review_required" | "fail";

export type CodeOrganizationFinding = {
  id: string;
  bucket: CodeOrganizationBucket;
  severity: CodeOrganizationSeverity;
  filePath: string;
  line?: number;
  title: string;
  evidence: string[];
  expectedRule: string;
  actualPattern: string;
  suggestedFix: string;
};

export type CodeOrganizationFindingInput = Omit<CodeOrganizationFinding, "id"> & {
  id?: string;
};

export type CodeOrganizationBucketScore = {
  weight: number;
  score: number;
  status: CodeOrganizationStatus;
  findingCount: number;
  criticalCount: number;
  reviewRequiredCount: number;
};

export type CodeOrganizationFileEntry = {
  filePath: string;
  lines: number;
  classification: string;
  severity: CodeOrganizationSeverity;
};

export type CodeOrganizationRouteResponsibility = {
  filePath: string;
  lines: number;
  responsibilities: string[];
  severity: CodeOrganizationSeverity;
};

export type CodeOrganizationDuplicateFormula = {
  normalizedFormula: string;
  files: string[];
  severity: CodeOrganizationSeverity;
};

export type CodeOrganizationFeatureOwnership = {
  feature: CodeOrganizationFeature;
  targetPath: string;
  exists: boolean;
  candidateFiles: string[];
  missingChildren: string[];
  migrationReason: string;
};

export type CodeOrganizationMigrationTarget = {
  feature: CodeOrganizationFeature;
  targetPath: string;
  currentEntrypoints: string[];
  firstMoveCandidates: string[];
  guardrails: string[];
};

export type CodeOrganizationReport = {
  generatedAt: string;
  doctrine: {
    note: string;
    agentTruthDoc: string;
    productDoctrineDoc: string;
    compactIndex: string;
  };
  overallScore: number;
  status: CodeOrganizationStatus;
  bucketScores: Record<CodeOrganizationBucket, CodeOrganizationBucketScore>;
  findings: CodeOrganizationFinding[];
  criticalFindings: CodeOrganizationFinding[];
  topRefactorTargets: CodeOrganizationFileEntry[];
  largestSourceFiles: CodeOrganizationFileEntry[];
  largestDocs: CodeOrganizationFileEntry[];
  largestGeneratedStateFiles: CodeOrganizationFileEntry[];
  vagueHelperFiles: CodeOrganizationFileEntry[];
  misplacedFeatureLogicInSrcLib: CodeOrganizationFileEntry[];
  routeHandlersWithTooManyResponsibilities: CodeOrganizationRouteResponsibility[];
  duplicateMetricScoringFormulas: CodeOrganizationDuplicateFormula[];
  componentSplitCandidates: CodeOrganizationFileEntry[];
  missingFeatureOwnership: CodeOrganizationFeatureOwnership[];
  legacyFilesWithoutPhaseOut: CodeOrganizationFileEntry[];
  docsLackingCompactCards: CodeOrganizationFileEntry[];
  suggestedFeatureFolderMigrations: CodeOrganizationMigrationTarget[];
  routeGroupMigrationPlan: string[];
  minimalCommands: string[];
  forbiddenCommands: string[];
  summary: string;
};

export const CODE_ORGANIZATION_FILE_SIZE_BUDGETS = {
  warning: {
    component: 350,
    routeHandler: 250,
    serverHelper: 400,
    validator: 500,
    markdown: 300,
    generatedJson: 500,
  },
  reviewRequired: {
    component: 600,
    routeHandler: 450,
    serverHelper: 800,
    validator: 900,
    markdown: 600,
    generatedJson: 1500,
  },
  critical: {
    sourceFile: 1500,
    generatedJson: 5000,
  },
} as const;

export const CODE_ORGANIZATION_VAGUE_FILE_NAMES = [
  "utils.ts",
  "utils.tsx",
  "helpers.ts",
  "helpers.tsx",
  "data.ts",
  "data.tsx",
  "logic.ts",
  "logic.tsx",
  "stuff.ts",
  "stuff.tsx",
] as const;

export const CODE_ORGANIZATION_VAGUE_NAME_ALLOWLIST: Record<string, string> = {
  "src/lib/utils.ts": "Shared className/primitive utility entrypoint retained as a documented exception.",
  "scripts/agent/shared.ts": "Agent validator shared primitives; name predates this doctrine and is explicitly scoped to scripts/agent.",
};

export const CODE_ORGANIZATION_MINIMAL_COMMANDS = [
  "npm run score:code-organization",
  "npm run check:code-organization",
  "npm run typecheck if TypeScript changed",
] as const;

export const CODE_ORGANIZATION_FORBIDDEN_COMMANDS = [
  "npm run check",
  "npm run check:ui:audits",
  "npm run check:ui:continuity",
  "npm run check:ui:lighthouse",
  "playwright",
  "cypress",
  "lighthouse",
] as const;

export const CODE_ORGANIZATION_SEVERITY_PENALTIES: Record<CodeOrganizationSeverity, number> = {
  info: 0,
  warning: 3,
  review_required: 10,
  critical: 25,
};

const SEVERITY_ORDER: Record<CodeOrganizationSeverity, number> = {
  info: 0,
  warning: 1,
  review_required: 2,
  critical: 3,
};

export function normalizeCodeOrganizationPath(filePath: string) {
  return filePath.replace(/\\/g, "/").replace(/^\.\//u, "");
}

export function stableCodeOrganizationHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function getCodeOrganizationSeverityRank(severity: CodeOrganizationSeverity) {
  return SEVERITY_ORDER[severity];
}

export function getCodeOrganizationStatus(
  score: number,
  hasCritical: boolean,
  hasReviewRequired: boolean,
): CodeOrganizationStatus {
  if (hasCritical) return "fail";
  if (hasReviewRequired) return "review_required";
  if (score >= 95) return "clean";
  if (score >= 85) return "pass";
  if (score >= 70) return "warning";
  return "review_required";
}

export function buildCodeOrganizationFinding(input: CodeOrganizationFindingInput): CodeOrganizationFinding {
  const normalizedPath = normalizeCodeOrganizationPath(input.filePath);
  const idSeed = [
    input.bucket,
    input.severity,
    normalizedPath,
    input.line ?? "",
    input.title,
    input.actualPattern,
  ].join("|");

  return {
    ...input,
    id: input.id ?? `code_org_${stableCodeOrganizationHash(idSeed)}`,
    filePath: normalizedPath,
    evidence: Array.from(new Set(input.evidence)),
  };
}
