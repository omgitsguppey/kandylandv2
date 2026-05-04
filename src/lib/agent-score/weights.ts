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
