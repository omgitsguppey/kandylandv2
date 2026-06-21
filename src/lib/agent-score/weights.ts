export const PUBLIC_BETA_DOMAIN_WEIGHTS = {
  layout: 18,
  hydration: 14,
  economy: 16,
  telemetry: 14,
  contentProtection: 16,
  orphanedLogic: 8,
  accessibilityTouch: 6,
  testingCoverage: 8,
} as const;

export const PUBLIC_BETA_SEVERITY_PENALTIES = {
  info: 0,
  minor: 2,
  moderate: 5,
  major: 10,
  critical: 25,
} as const;

export const PUBLIC_BETA_BLAST_RADIUS_MULTIPLIERS = {
  component: 1,
  shared: 1.25,
  global: 1.5,
  payment: 1.75,
  auth: 1.75,
  content: 1.75,
} as const;

export const PUBLIC_BETA_STATUS_THRESHOLDS = {
  clean: 95,
  pass: 90,
  warning: 80,
  betaRisk: 70,
} as const;

export const PUBLIC_BETA_EVIDENCE_WEIGHTS = {
  sourceSafety: 25,
  targetedBehaviorTests: 20,
  runtimeProviderSmoke: 15,
  adminTruthSamples: 10,
  freshnessIntegrity: 10,
} as const;

export const PUBLIC_BETA_EVIDENCE_SCORE_CAPS = {
  readyWithSmokeRequired: 94,
  runtimeUnverified: 89,
  unknownEvidence: 84,
  needsReview: 79,
  staleEvidence: 79,
  blocked: 69,
} as const;

export const PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS = {
  sourceHealth: 25,
  runtimeHealth: 20,
  evidenceCompleteness: 20,
  freshness: 15,
  costRisk: 10,
  regressionRisk: 10,
} as const;

export const PUBLIC_BETA_EVIDENCE_QUALITY_SCORES = {
  formalPassed: 1,
  formalPartial: 0.7,
  sourceReady: 0.55,
  operatorReported: 0.25,
  ownerReview: 0.4,
  staleDecayMin: 0.2,
  missing: 0,
  failed: 0,
} as const;

export const PUBLIC_BETA_LAUNCH_GATE_REQUIREMENTS = {
  manualEvidenceRequiredForExit: true,
  providerEvidenceRequiredForExit: true,
  runtimeEvidenceRequiredForExit: true,
  adminTruthSampleRequiredForExit: true,
  criticalSourceBlockersMustBeZero: true,
  currentHeadFreshnessRequired: true,
} as const;

export const PUBLIC_BETA_REQUIRED_REPORT_STALE_HOURS = 24;

export const PUBLIC_BETA_ALLOWED_COMMANDS = [
  "npm run score:beta",
  "npm run check:beta-score",
  "npm run repair:beta",
  "npm run repair:beta -- --apply",
  "npx vitest run --config vitest.contracts.config.ts tests/unit/public-beta-score.spec.ts",
  "npm run typecheck",
] as const;

export const PUBLIC_BETA_FORBIDDEN_COMMANDS = [
  "npm run check",
  "npm run check:ui:audits",
  "npm run check:ui:continuity",
  "npm run check:ui:omni",
  "npm run check:ui:lighthouse",
  "playwright",
  "cypress",
  "lighthouse",
  "npm run test:gate:signoff",
] as const;

export const PUBLIC_BETA_COMMAND_BUDGET_MAX = 4;
