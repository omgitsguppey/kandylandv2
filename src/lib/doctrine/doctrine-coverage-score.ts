import { computeCostScore, computeUtilityScore, clampScore } from "./doctrine-context-cost";

export type DoctrinePriority = "critical" | "high" | "normal" | "low";

export type DoctrineScoringCard = {
  id: string;
  surface: string;
  feature: string;
  authorityLevel: number;
  priority: DoctrinePriority;
  canonicalDoc: string;
  tokenEstimate: number;
  rules: string[];
  blockedPatterns: string[];
  validators: string[];
  keywords: string[];
  fileGlobs: string[];
  supersedes: string[];
  conflictsWith: string[];
  lastReviewed?: string;
  status?: string;
  requiresFullDoc?: boolean;
};

export type DoctrineCardScore = {
  cardId: string;
  pathMatchScore: number;
  intentMatchScore: number;
  riskScore: number;
  authorityScore: number;
  recencyScore: number;
  coverageScore: number;
  costScore: number;
  utilityScore: number;
};

export const INTENT_SYNONYMS: Record<string, string[]> = {
  wallet: ["wallet", "payment", "paypal", "gumdrops", "gumdrop", "source-of-funds", "purchase", "revenue"],
  viewer: ["viewer", "watch", "watch-time", "content", "file", "media"],
  admin: ["admin", "users", "behavioral", "tracking", "truth", "projection"],
  creator: ["creator", "dashboard", "projection", "earnings", "fan", "booking", "fan-pass"],
  moderation: ["moderation", "scrape", "risk", "theft", "screenshot"],
  support: ["support", "ticket", "inbox", "bug", "thread"],
  doctrine: ["doctrine", "hierarchy", "context", "registry", "surface", "optimizer"],
  cloud: ["cloud", "sql", "cost", "bigquery", "dataconnect", "data-connect"],
  security: ["security", "auth", "entitlement", "unlock", "rate", "cache", "origin"],
};

const HIGH_RISK_TOKENS = [
  "payment",
  "paypal",
  "purchase",
  "wallet",
  "auth",
  "unlock",
  "entitlement",
  "content",
  "security",
  "cost",
  "firestore.rules",
  "storage.rules",
  "dataconnect",
  "sql",
  "bigquery",
];

const ADMIN_TRUTH_TOKENS = ["telemetry", "analytics", "behavioral", "admin", "projection", "tracking"];

const UI_TOKENS = ["component", "navbar", "layout", "ui", "tsx", "dashboard", "creator", "drops"];

export function tokenizeDoctrineText(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/([a-z])([A-Z])/gu, "$1 $2")
        .split(/[^a-z0-9/_*.-]+/u)
        .flatMap((token) => token.split(/[/_.-]+/u))
        .map((token) => token.trim())
        .filter((token) => token.length > 1),
    ),
  );
}

export function expandIntentTokens(value: string) {
  const base = new Set(tokenizeDoctrineText(value));
  for (const [key, synonyms] of Object.entries(INTENT_SYNONYMS)) {
    if (base.has(key) || synonyms.some((synonym) => base.has(synonym))) {
      for (const synonym of synonyms) {
        for (const token of tokenizeDoctrineText(synonym)) base.add(token);
      }
    }
  }
  return Array.from(base);
}

function escapeRegExp(value: string) {
  return value.replace(/[|\\{}()[\]^$+?.]/gu, "\\$&");
}

export function globToRegExp(glob: string) {
  const normalized = glob.replace(/\\/gu, "/");
  let pattern = "";
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    if (char === "*" && next === "*") {
      pattern += ".*";
      index += 1;
      continue;
    }
    if (char === "*") {
      pattern += "[^/]*";
      continue;
    }
    pattern += escapeRegExp(char);
  }
  return new RegExp(`^${pattern}$`, "u");
}

export function matchesGlob(repoPath: string, glob: string) {
  const normalizedPath = repoPath.replace(/\\/gu, "/");
  const normalizedGlob = glob.replace(/\\/gu, "/");
  if (normalizedGlob === normalizedPath) return true;
  if (normalizedGlob.endsWith("/**") && normalizedPath.startsWith(normalizedGlob.slice(0, -3))) return true;
  return globToRegExp(normalizedGlob).test(normalizedPath);
}

export function matchesAnyGlob(repoPath: string, globs: string[]) {
  return globs.some((glob) => matchesGlob(repoPath, glob));
}

function sameSurfaceMatch(changedFiles: string[], card: DoctrineScoringCard) {
  const surfaceTokens = new Set(tokenizeDoctrineText(`${card.surface} ${card.feature} ${card.canonicalDoc}`));
  return changedFiles.some((filePath) => tokenizeDoctrineText(filePath).some((token) => surfaceTokens.has(token)));
}

export function computePathMatchScore(card: DoctrineScoringCard, changedFiles: string[], affectedSurfaces: string[]) {
  if (changedFiles.some((filePath) => matchesAnyGlob(filePath, card.fileGlobs))) return 1;
  if (affectedSurfaces.includes(card.surface) || affectedSurfaces.includes(card.feature)) return 0.7;
  if (sameSurfaceMatch(changedFiles, card)) return 0.4;
  return 0;
}

export function computeIntentMatchScore(card: DoctrineScoringCard, taskSummary: string, riskHints: string[] = []) {
  const intentTokens = new Set(expandIntentTokens(`${taskSummary} ${riskHints.join(" ")}`));
  if (intentTokens.size === 0) return 0;
  const cardTokens = new Set(expandIntentTokens(`${card.surface} ${card.feature} ${card.keywords.join(" ")}`));
  const matches = Array.from(intentTokens).filter((token) => cardTokens.has(token)).length;
  return clampScore(matches / Math.max(1, Math.min(intentTokens.size, 12)));
}

export function isHighRiskInput(changedFiles: string[], taskSummary: string, riskHints: string[] = []) {
  const haystack = `${changedFiles.join(" ")} ${taskSummary} ${riskHints.join(" ")}`.toLowerCase();
  return HIGH_RISK_TOKENS.some((token) => haystack.includes(token));
}

export function computeRiskScore(card: DoctrineScoringCard, changedFiles: string[], taskSummary: string, riskHints: string[] = []) {
  const haystack = `${changedFiles.join(" ")} ${taskSummary} ${riskHints.join(" ")} ${card.surface} ${card.feature} ${card.keywords.join(" ")}`.toLowerCase();
  const cardText = `${card.surface} ${card.feature} ${card.keywords.join(" ")}`.toLowerCase();
  if (HIGH_RISK_TOKENS.some((token) => haystack.includes(token)) && HIGH_RISK_TOKENS.some((token) => cardText.includes(token))) return 1;
  if (ADMIN_TRUTH_TOKENS.some((token) => haystack.includes(token)) && ADMIN_TRUTH_TOKENS.some((token) => cardText.includes(token))) return 0.8;
  if (UI_TOKENS.some((token) => haystack.includes(token)) && /ui|device|brand|user|creator|admin/u.test(cardText)) return 0.6;
  if (changedFiles.length > 0 && changedFiles.every((filePath) => filePath.endsWith(".md"))) return 0.3;
  return 0;
}

export function computeAuthorityScore(authorityLevel: number) {
  return clampScore(1 / Math.max(1, authorityLevel));
}

export function computeRecencyScore(lastReviewed?: string, now = new Date()) {
  if (!lastReviewed) return 0.2;
  const timestamp = Date.parse(lastReviewed);
  if (!Number.isFinite(timestamp)) return 0.2;
  const ageDays = (now.getTime() - timestamp) / 86_400_000;
  if (ageDays <= 30) return 1;
  if (ageDays <= 90) return 0.7;
  return 0.4;
}

export function scoreDoctrineCard(
  card: DoctrineScoringCard,
  changedFiles: string[],
  affectedSurfaces: string[],
  taskSummary: string,
  riskHints: string[],
  maxTokenBudget: number,
): DoctrineCardScore {
  const pathMatchScore = computePathMatchScore(card, changedFiles, affectedSurfaces);
  const intentMatchScore = computeIntentMatchScore(card, taskSummary, riskHints);
  const riskScore = computeRiskScore(card, changedFiles, taskSummary, riskHints);
  const authorityScore = computeAuthorityScore(card.authorityLevel);
  const recencyScore = computeRecencyScore(card.lastReviewed);
  const coverageScore =
    0.35 * pathMatchScore +
    0.25 * intentMatchScore +
    0.2 * riskScore +
    0.1 * authorityScore +
    0.1 * recencyScore;
  const costScore = computeCostScore(card.tokenEstimate, maxTokenBudget);
  const utilityScore = computeUtilityScore(coverageScore, card.tokenEstimate, maxTokenBudget);

  return {
    cardId: card.id,
    pathMatchScore,
    intentMatchScore,
    riskScore,
    authorityScore,
    recencyScore,
    coverageScore,
    costScore,
    utilityScore,
  };
}
