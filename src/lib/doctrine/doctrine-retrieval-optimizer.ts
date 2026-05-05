import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  DEFAULT_MAX_DOCTRINE_CARDS,
  DEFAULT_MAX_DOCTRINE_TOKENS,
  HIGH_RISK_MAX_DOCTRINE_CARDS,
  computeContextSavings,
  estimateMarkdownDoctrineTokens,
  estimateSelectedTokens,
} from "./doctrine-context-cost";
import { scoreDoctrineConflicts, type DoctrineConflictFinding, type SurfacePathRule } from "./doctrine-conflict-score";
import {
  isHighRiskInput,
  matchesAnyGlob,
  matchesGlob,
  scoreDoctrineCard,
  tokenizeDoctrineText,
  type DoctrineCardScore,
  type DoctrinePriority,
  type DoctrineScoringCard,
} from "./doctrine-coverage-score";

export type DoctrineRetrievalInput = {
  taskSummary: string;
  changedFiles: string[];
  explicitSurfaces?: string[];
  explicitFeatures?: string[];
  riskHints?: string[];
  maxCards?: number;
  maxTokenBudget?: number;
};

export type DoctrineCard = DoctrineScoringCard;

export type OptimizedSelectedCard = DoctrineCard & {
  score: DoctrineCardScore;
  selectionReason: string;
};

export type OptimizedDoctrineContext = {
  taskSummary: string;
  changedFiles: string[];
  affectedSurfaces: string[];
  affectedFeatures: string[];
  selectedCards: OptimizedSelectedCard[];
  excludedCards: Array<{ id: string; reason: string }>;
  coverage: {
    surfaceCoverage: number;
    highRiskCoverage: number;
    validatorCoverage: number;
    legacyWarningCoverage: number;
    contextSavings: number;
    estimatedTokens: number;
  };
  requiredValidators: string[];
  blockedPatterns: string[];
  legacyWarnings: string[];
  conflicts: DoctrineConflictFinding[];
  fullDocsOnlyIfNeeded: string[];
  decisionTrace: string[];
};

type RegistryEntry = {
  id: string;
  path: string;
  status: string;
  surface: string;
  supersededBy: string | null;
  supersedes?: string[];
  lastReviewed?: string;
  reviewBy?: string;
  requiredValidators?: string[];
  canonicalRules?: string[];
  blockedPatterns?: string[];
};

type AuthorityCardInput = {
  id: string;
  surface: string;
  authorityLevel: number;
  canonicalDoc: string;
  summary?: string;
  must?: string[];
  mustNot?: string[];
  sourceTruth?: string[];
  validators?: string[];
  legacyWarnings?: string[];
  tokenEstimate?: number;
};

type CompactCardInput = {
  id: string;
  title: string;
  surface: string;
  scope?: string[];
  canonicalFiles?: string[];
  rules?: string[];
  blockedPatterns?: string[];
  requiredValidators?: string[];
  lastUpdated?: string;
  sourceDoc: string;
  priority?: DoctrinePriority;
  tokenEstimate?: number;
};

type LegacyRegistry = {
  items: Array<{
    id: string;
    name: string;
    paths: string[];
    status: string;
    phaseOutStage: string;
    ownerSurface: string;
    canonicalReplacement: string;
    reviewBy: string;
    removeBy: string;
    riskIfKept: string;
    blockedReferences: string[];
  }>;
};

type SurfaceDoctrineMap = {
  pathRules: Array<{
    pattern: string;
    primarySurface: string;
    doctrine: string;
    featureSurfaces?: string[];
    why: string;
  }>;
};

type ValidatorMap = {
  validators: Record<string, string>;
};

const root = process.cwd();
const CONTEXT_OUTPUT_PATH = "agent/context/optimized-task-context.generated.json";
const AUTHORITY_CARDS_PATH = "agent/context/doctrine-cards.jsonl";
const COMPACT_CARDS_PATH = "agent/context/doctrine.cards.jsonl";
const REGISTRY_PATH = "agent/context/doctrine-registry.json";
const SURFACE_MAP_PATH = "agent/context/surface-doctrine-map.json";
const LEGACY_CONTEXT_PATH = "agent/context/legacy-registry.json";
const VALIDATOR_MAP_PATH = "agent/context/validator-map.json";

function repoPath(filePath: string) {
  return join(root, filePath);
}

function normalizePath(filePath: string) {
  return filePath.replace(/\\/gu, "/").replace(/^\.\/+/u, "");
}

function readJson<T>(filePath: string): T | null {
  const absolutePath = repoPath(filePath);
  if (!existsSync(absolutePath)) return null;
  return JSON.parse(readFileSync(absolutePath, "utf8")) as T;
}

function readJsonl<T>(filePath: string) {
  const absolutePath = repoPath(filePath);
  if (!existsSync(absolutePath)) return [] as T[];
  return readFileSync(absolutePath, "utf8")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function priorityFromAuthority(authorityLevel: number): DoctrinePriority {
  if (authorityLevel <= 2) return "critical";
  if (authorityLevel === 3) return "high";
  return "normal";
}

function tokensFrom(...values: Array<string | string[] | undefined>) {
  return unique(values.flatMap((value) => (Array.isArray(value) ? value : [value ?? ""])).flatMap(tokenizeDoctrineText));
}

function lineEstimateForDoc(filePath: string, fallback: number) {
  const absolutePath = repoPath(filePath);
  if (!existsSync(absolutePath)) return fallback;
  const source = readFileSync(absolutePath, "utf8");
  return Math.max(fallback, Math.ceil(source.split(/\s+/u).filter(Boolean).length * 1.1));
}

function registryByPath() {
  const registry = readJson<{ entries?: RegistryEntry[] }>(REGISTRY_PATH);
  return new Map((registry?.entries ?? []).map((entry) => [entry.path, entry]));
}

function normalizeAuthorityCard(card: AuthorityCardInput, registry: Map<string, RegistryEntry>): DoctrineCard {
  const entry = registry.get(card.canonicalDoc);
  const rules = [...(card.must ?? []), ...(card.mustNot ?? []), ...(card.sourceTruth ?? []), card.summary ?? ""].filter(Boolean);
  return {
    id: card.id,
    surface: card.surface,
    feature: card.surface,
    authorityLevel: card.authorityLevel,
    priority: priorityFromAuthority(card.authorityLevel),
    canonicalDoc: card.canonicalDoc,
    tokenEstimate: card.tokenEstimate ?? lineEstimateForDoc(card.canonicalDoc, 180),
    rules,
    blockedPatterns: [...(card.mustNot ?? []), ...(entry?.blockedPatterns ?? [])],
    validators: card.validators ?? entry?.requiredValidators ?? [],
    keywords: tokensFrom(card.id, card.surface, card.canonicalDoc, rules),
    fileGlobs: [card.canonicalDoc],
    supersedes: entry?.supersedes ?? [],
    conflictsWith: [],
    lastReviewed: entry?.lastReviewed ?? entry?.reviewBy,
    status: entry?.status,
  };
}

function normalizeCompactCard(card: CompactCardInput, registry: Map<string, RegistryEntry>): DoctrineCard {
  const entry = registry.get(card.sourceDoc);
  const fileGlobs = unique([...(card.scope ?? []), ...(card.canonicalFiles ?? []), card.sourceDoc]);
  return {
    id: card.id,
    surface: card.surface,
    feature: card.surface,
    authorityLevel: 4,
    priority: card.priority ?? "normal",
    canonicalDoc: card.sourceDoc,
    tokenEstimate: card.tokenEstimate ?? lineEstimateForDoc(card.sourceDoc, 220),
    rules: card.rules ?? [],
    blockedPatterns: card.blockedPatterns ?? [],
    validators: card.requiredValidators ?? [],
    keywords: tokensFrom(card.id, card.title, card.surface, card.sourceDoc, card.rules, card.blockedPatterns),
    fileGlobs,
    supersedes: entry?.supersedes ?? [],
    conflictsWith: [],
    lastReviewed: entry?.lastReviewed ?? card.lastUpdated,
    status: entry?.status,
  };
}

function syntheticCards(surfaceMap: SurfaceDoctrineMap, validatorMap: ValidatorMap): DoctrineCard[] {
  const validatorScripts = Object.keys(validatorMap.validators ?? {});
  return [
    {
      id: "doctrine-card-surface-user-ui",
      surface: "user",
      feature: "user-ui",
      authorityLevel: 3,
      priority: "critical",
      canonicalDoc: "docs/doctrine/surfaces/user-ui-doctrine.md",
      tokenEstimate: lineEstimateForDoc("docs/doctrine/surfaces/user-ui-doctrine.md", 220),
      rules: ["User UI prioritizes conversion, clarity, reward loop, emotional momentum, and mobile/PWA polish."],
      blockedPatterns: ["admin dense/debug layout", "raw truth machinery", "server truth definitions in UI"],
      validators: ["check:surface-doctrine-split", "check:device-ui"],
      keywords: tokensFrom("user ui conversion reward loop pwa dashboard drops notifications library support navigation"),
      fileGlobs: [
        "src/app/page.tsx",
        "src/app/drops/**",
        "src/app/experiences/**",
        "src/app/dashboard/**",
        "src/components/Navbar.tsx",
        "src/components/Navigation/**",
        "src/components/Dashboard/**",
        "src/components/Drops/**",
        "src/components/Notifications/**",
        "src/components/Support/**",
        "src/components/Feedback/**",
        "src/components/ReleaseNotes/**",
        "src/components/PurchaseModal.tsx",
      ],
      supersedes: ["docs/doctrine/kandydrops-ui-doctrine.md"],
      conflictsWith: [],
      lastReviewed: "2026-05-05",
    },
    {
      id: "doctrine-card-surface-creator-ui",
      surface: "creator",
      feature: "creator-ui",
      authorityLevel: 3,
      priority: "critical",
      canonicalDoc: "docs/doctrine/surfaces/creator-ui-doctrine.md",
      tokenEstimate: lineEstimateForDoc("docs/doctrine/surfaces/creator-ui-doctrine.md", 220),
      rules: ["Creator UI prioritizes operational control, earnings, content, fans, bookings, chat, and creator tools."],
      blockedPatterns: ["admin-only diagnostics without debug mode", "projection writes as live creator behavior"],
      validators: ["check:surface-doctrine-split", "check:creator-experience-transaction-truth"],
      keywords: tokensFrom("creator dashboard projection earnings content fans fan pass bookings chat profile timeline tools"),
      fileGlobs: ["src/app/creators/**", "src/components/Creators/**", "src/app/dashboard/profile/components/ProfileCreator*.tsx"],
      supersedes: ["docs/doctrine/kandydrops-ui-doctrine.md"],
      conflictsWith: [],
      lastReviewed: "2026-05-05",
    },
    {
      id: "doctrine-card-surface-admin-ui",
      surface: "admin",
      feature: "admin-ui",
      authorityLevel: 3,
      priority: "critical",
      canonicalDoc: "docs/doctrine/surfaces/admin-ui-doctrine.md",
      tokenEstimate: lineEstimateForDoc("docs/doctrine/surfaces/admin-ui-doctrine.md", 220),
      rules: ["Admin UI prioritizes truth, speed, density, triage, evidence, source state, freshness, and confidence."],
      blockedPatterns: ["fake healthy states", "missing source truth hidden by green cards"],
      validators: ["check:surface-doctrine-split", "check:admin-truth", "check:admin-debug-control-tower"],
      keywords: tokensFrom("admin users analytics debug moderation support truth source freshness confidence evidence triage"),
      fileGlobs: ["src/app/admin/**", "src/components/Admin/**"],
      supersedes: ["docs/doctrine/kandydrops-ui-doctrine.md"],
      conflictsWith: [],
      lastReviewed: "2026-05-05",
    },
    {
      id: "doctrine-card-surface-server-truth",
      surface: "server",
      feature: "server-truth",
      authorityLevel: 2,
      priority: "critical",
      canonicalDoc: "docs/doctrine/surfaces/server-truth-doctrine.md",
      tokenEstimate: lineEstimateForDoc("docs/doctrine/surfaces/server-truth-doctrine.md", 240),
      rules: ["Server owns money, unlocks, entitlements, creator monetization, support permission, moderation evidence, security, cost, and auditability."],
      blockedPatterns: ["client defines source truth", "inline route formulas", "UI doctrine imports in server routes"],
      validators: ["check:surface-doctrine-split", "check:speed-security", "check:payment-unlock-security"],
      keywords: tokensFrom("server truth api route payment auth unlock entitlement content security cost support moderation actor target source truth"),
      fileGlobs: ["src/app/api/**", "src/lib/server/**", "functions/src/**", "firestore.rules", "storage.rules", "dataconnect/**"],
      supersedes: ["docs/doctrine/kandydrops-ui-doctrine.md"],
      conflictsWith: [],
      lastReviewed: "2026-05-05",
    },
    {
      id: "doctrine-card-shared-brand-primitives",
      surface: "shared-primitives",
      feature: "shared-brand-primitives",
      authorityLevel: 2,
      priority: "high",
      canonicalDoc: "docs/doctrine/surfaces/shared-brand-primitives.md",
      tokenEstimate: lineEstimateForDoc("docs/doctrine/surfaces/shared-brand-primitives.md", 210),
      rules: ["Shared brand primitives define KandyDrops visual language, brand purple, glass depth, motion, typography, tap targets, and accessibility baseline."],
      blockedPatterns: ["surface-specific business logic in shared UI", "server truth in UI primitives"],
      validators: ["check:surface-doctrine-split", "check:design-system-drift", "check:accessibility-tap-targets"],
      keywords: tokensFrom("shared brand primitives ui components colors typography glass motion icons tap target accessibility loading skeleton"),
      fileGlobs: ["src/components/ui/**", "src/components/Navbar.tsx", "src/components/Navigation/**"],
      supersedes: ["docs/doctrine/kandydrops-ui-doctrine.md"],
      conflictsWith: [],
      lastReviewed: "2026-05-05",
    },
    {
      id: "doctrine-card-surface-routing-map",
      surface: "agent-context",
      feature: "doctrine-retrieval",
      authorityLevel: 3,
      priority: "critical",
      canonicalDoc: SURFACE_MAP_PATH,
      tokenEstimate: 260,
      rules: ["Path-to-surface routing chooses one primary surface before feature doctrine is applied."],
      blockedPatterns: ["same file mapped to unresolved primary surfaces", "reading all markdown by default"],
      validators: ["check:surface-doctrine-split", "check:doctrine-retrieval-optimizer"],
      keywords: tokensFrom("surface doctrine map route context optimizer hierarchy agent"),
      fileGlobs: ["agent/context/surface-doctrine-map.json", "docs/doctrine/03-surface-hierarchy.md", ...surfaceMap.pathRules.map((rule) => rule.pattern)],
      supersedes: [],
      conflictsWith: [],
      lastReviewed: "2026-05-05",
    },
    {
      id: "doctrine-card-validator-map",
      surface: "agent-context",
      feature: "validator-map",
      authorityLevel: 3,
      priority: "critical",
      canonicalDoc: VALIDATOR_MAP_PATH,
      tokenEstimate: 180,
      rules: ["Validator map links required checks to surfaces so selected validators have doctrine coverage."],
      blockedPatterns: ["validator without surface mapping", "validator selected without doctrine coverage"],
      validators: ["check:agent-context", "check:doctrine-retrieval-optimizer"],
      keywords: tokensFrom("validator map check score audit command package scripts doctrine coverage"),
      fileGlobs: ["agent/context/validator-map.json", "package.json", "scripts/agent/**"],
      supersedes: [],
      conflictsWith: [],
      lastReviewed: "2026-05-05",
    },
    {
      id: "doctrine-card-optimizer",
      surface: "agent-context",
      feature: "doctrine-retrieval",
      authorityLevel: 3,
      priority: "critical",
      canonicalDoc: "docs/agent-truth/doctrine-retrieval-optimizer.md",
      tokenEstimate: 260,
      rules: ["Doctrine retrieval is an optimization problem over changed files, task intent, risk, authority, validator coverage, and conflict safety."],
      blockedPatterns: ["full markdown by default", "generated reports selected as doctrine"],
      validators: ["optimize:doctrine-context", "check:doctrine-retrieval-optimizer"],
      keywords: tokensFrom("doctrine retrieval optimizer context savings cost utility coverage conflict"),
      fileGlobs: ["src/lib/doctrine/**", "scripts/agent/optimize-doctrine-context.ts", "scripts/agent/validate-doctrine-retrieval-optimizer.ts"],
      supersedes: [],
      conflictsWith: [],
      lastReviewed: "2026-05-05",
    },
  ];
}

function legacyCards(legacy: LegacyRegistry | null): DoctrineCard[] {
  return (legacy?.items ?? []).map((item) => ({
    id: `doctrine-card-legacy-${item.id}`,
    surface: "legacy-phaseout",
    feature: item.ownerSurface,
    authorityLevel: 4,
    priority: item.status === "blocked" ? "critical" : "high",
    canonicalDoc: "docs/agent-truth/legacy-phaseout.md",
    tokenEstimate: 180,
    rules: [item.canonicalReplacement, item.riskIfKept],
    blockedPatterns: item.blockedReferences,
    validators: ["check:legacy-phaseout"],
    keywords: tokensFrom(item.id, item.name, item.ownerSurface, item.canonicalReplacement, item.riskIfKept),
    fileGlobs: item.paths,
    supersedes: [item.canonicalReplacement],
    conflictsWith: [],
    lastReviewed: item.reviewBy,
    status: "legacy",
  }));
}

export function loadDoctrineCards() {
  const registry = registryByPath();
  const surfaceMap = readJson<SurfaceDoctrineMap>(SURFACE_MAP_PATH) ?? { pathRules: [] };
  const validatorMap = readJson<ValidatorMap>(VALIDATOR_MAP_PATH) ?? { validators: {} };
  const legacy = readJson<LegacyRegistry>(LEGACY_CONTEXT_PATH);
  const cards = [
    ...readJsonl<AuthorityCardInput>(AUTHORITY_CARDS_PATH).map((card) => normalizeAuthorityCard(card, registry)),
    ...readJsonl<CompactCardInput>(COMPACT_CARDS_PATH).map((card) => normalizeCompactCard(card, registry)),
    ...syntheticCards(surfaceMap, validatorMap),
    ...legacyCards(legacy),
  ];

  const byId = new Map<string, DoctrineCard>();
  for (const card of cards) {
    if (!byId.has(card.id)) byId.set(card.id, card);
  }
  return Array.from(byId.values());
}

function ruleSpecificity(pattern: string) {
  return pattern.replace(/\*\*/gu, "").replace(/\*/gu, "").length;
}

function resolveSurfaceMatches(changedFiles: string[], surfaceMap: SurfaceDoctrineMap) {
  const primarySurfaces: string[] = [];
  const featureSurfaces: string[] = [];
  const trace: string[] = [];
  const overlapFiles: string[] = [];

  for (const changedFile of changedFiles) {
    const matches = surfaceMap.pathRules.filter((rule) => matchesGlob(changedFile, rule.pattern));
    if (matches.length === 0) continue;
    const winner = [...matches].sort((left, right) => ruleSpecificity(right.pattern) - ruleSpecificity(left.pattern))[0];
    primarySurfaces.push(winner.primarySurface);
    featureSurfaces.push(...(winner.featureSurfaces ?? []));
    trace.push(`${changedFile} -> ${winner.primarySurface} via ${winner.pattern}`);
    if (new Set(matches.map((rule) => rule.primarySurface)).size > 1) overlapFiles.push(changedFile);
  }

  return {
    primarySurfaces: unique(primarySurfaces),
    featureSurfaces: unique(featureSurfaces),
    trace,
    overlapFiles,
  };
}

function inferFeatureMatches(cards: DoctrineCard[], changedFiles: string[], taskSummary: string) {
  const haystack = `${changedFiles.join(" ")} ${taskSummary}`.toLowerCase();
  const directFeatures = cards
    .filter((card) => card.authorityLevel >= 4)
    .filter((card) => !["doctrine-retrieval", "validator-map"].includes(card.feature))
    .filter((card) => featureRelevant(card.feature || card.surface, changedFiles, taskSummary))
    .filter((card) => changedFiles.some((filePath) => matchesAnyGlob(filePath, card.fileGlobs)))
    .map((card) => card.feature || card.surface);

  const intentFeatures: string[] = [];
  const addIf = (pattern: RegExp, features: string[]) => {
    if (pattern.test(haystack)) intentFeatures.push(...features);
  };

  addIf(/wallet|payment|paypal|gumdrops?|source-of-funds|purchase|revenue/u, ["wallet"]);
  addIf(/viewer|watch-time|watch|file|media/u, ["viewer", "watch-time"]);
  addIf(/admin.*users|users.*behavioral|behavioral.*tracking|user metrics|engagement|value/u, ["user-management", "behavioral-intelligence", "telemetry"]);
  addIf(/creator|projection|fan-pass|booking|earnings/u, ["creator-dashboard"]);
  addIf(/moderation|theft|scrape|risk|screenshot/u, ["moderation"]);
  addIf(/support|ticket|inbox|bug report|thread/u, ["support"]);
  addIf(/doctrine|hierarchy|context|optimizer|agent\/context|docs\/doctrine/u, ["doctrine-retrieval"]);
  addIf(/cloud|sql|bigquery|dataconnect|data connect/u, ["cloud/sql/bigquery"]);
  addIf(/security|auth|entitlement|unlock|trusted origin|rate|cache/u, ["security/cost"]);
  addIf(/navigation|navbar|layout|device|mobile|pwa/u, ["device-ui"]);

  return unique([...directFeatures, ...intentFeatures]);
}

function featureRelevant(feature: string, changedFiles: string[], taskSummary: string) {
  const haystack = `${changedFiles.join(" ")} ${taskSummary}`.toLowerCase();
  const checks: Array<[RegExp, string[]]> = [
    [/wallet|payment|paypal|gumdrops?|purchase|revenue|source-of-funds/u, ["wallet"]],
    [/drops?|unlock|entitlement|discovery|preview|dropcard/u, ["drops"]],
    [/viewer|watch-time|watch|file|media/u, ["viewer", "watch-time"]],
    [/admin\/users|user-management|user metrics|engagement|user value|admin users/u, ["user-management"]],
    [/behavioral|recommendation|tracking|event fact|daily|notification/u, ["behavioral-intelligence", "telemetry"]],
    [/telemetry|analytics|actor|target|tracking/u, ["telemetry"]],
    [/creator|projection|fan-pass|booking|earnings|creators/u, ["creator-dashboard", "creator-profile"]],
    [/support|ticket|inbox|bug|thread/u, ["support"]],
    [/moderation|theft|scrape|risk|screenshot/u, ["moderation"]],
    [/admin\/debug|debug|control tower/u, ["admin-debug"]],
    [/admin\/ai|ai-panel|model|prompt/u, ["admin-ai", "ai-panel"]],
    [/navigation|navbar|layout|device|mobile|pwa/u, ["device-ui"]],
    [/image|thumbnail|cover|media pipeline/u, ["image-loading", "image-policy"]],
    [/security|auth|rate|trusted origin|cache|firestore\.rules|storage\.rules|api\/security/u, ["security/cost", "speed-security"]],
    [/cloud|sql|bigquery|dataconnect|data connect/u, ["cloud/sql/bigquery", "google-cost"]],
    [/doctrine|context|optimizer|agent\/context|docs\/doctrine/u, ["doctrine-retrieval", "agent-context", "repo-governance"]],
    [/legacy|phaseout|orphan/u, ["legacy-phaseout"]],
  ];
  return checks.some(([pattern, features]) => pattern.test(haystack) && features.includes(feature));
}

function isUiTask(changedFiles: string[], surfaces: string[]) {
  return (
    surfaces.some((surface) => ["user", "creator", "admin", "shared-primitives"].includes(surface)) ||
    changedFiles.some((filePath) => filePath.endsWith(".tsx") && !filePath.startsWith("src/app/api/"))
  );
}

function isEngineeringTask(changedFiles: string[], taskSummary: string) {
  const haystack = `${changedFiles.join(" ")} ${taskSummary}`.toLowerCase();
  return /scripts\/agent|package\.json|\.github\/workflows|agent\/context|agent\/index|docs\/doctrine|docs\/agent-truth|doctrine|context|optimizer/u.test(haystack);
}

function findCard(cards: DoctrineCard[], predicate: (card: DoctrineCard) => boolean) {
  return cards.find(predicate);
}

function addRequiredCard(required: Map<string, string>, card: DoctrineCard | undefined, reason: string) {
  if (card) required.set(card.id, reason);
}

function collectRequiredCards(
  cards: DoctrineCard[],
  input: Required<Pick<DoctrineRetrievalInput, "taskSummary" | "changedFiles" | "riskHints">>,
  affectedSurfaces: string[],
  affectedFeatures: string[],
  highRisk: boolean,
) {
  const required = new Map<string, string>();
  addRequiredCard(required, findCard(cards, (card) => card.id === "doctrine-card-validator-map"), "Validator map card is required for changed surfaces.");

  if (isEngineeringTask(input.changedFiles, input.taskSummary)) {
    addRequiredCard(required, findCard(cards, (card) => card.surface === "engineering"), "Engineering constitution is required for agent/package/doctrine/workflow changes.");
    addRequiredCard(required, findCard(cards, (card) => card.id === "doctrine-card-optimizer"), "Optimizer card is required for doctrine retrieval tooling.");
  }

  if (highRisk || /server|payment|auth|unlock|analytics|cost|security|entitlement/iu.test(input.taskSummary)) {
    addRequiredCard(required, findCard(cards, (card) => card.surface === "source-of-truth"), "Source-of-truth constitution is required for server/payment/auth/unlock/analytics/cost risk.");
  }

  if (isUiTask(input.changedFiles, affectedSurfaces)) {
    addRequiredCard(required, findCard(cards, (card) => card.id === "doctrine-card-shared-brand-primitives"), "Shared brand primitives are required for user/creator/admin UI work.");
  }

  for (const surface of affectedSurfaces) {
    const surfaceCard =
      findCard(cards, (card) => card.surface === surface && card.feature.endsWith("-ui")) ??
      findCard(cards, (card) => card.surface === surface && card.feature === "server-truth") ??
      findCard(cards, (card) => card.surface === surface && card.feature === "shared-brand-primitives") ??
      findCard(cards, (card) => card.surface === surface && card.authorityLevel <= 4);
    addRequiredCard(required, surfaceCard, `Surface doctrine required for affected surface ${surface}.`);
  }

  for (const feature of affectedFeatures) {
    const featureCard = findCard(cards, (card) => card.feature === feature || card.surface === feature);
    addRequiredCard(required, featureCard, `Feature doctrine required for affected feature ${feature}.`);
  }

  const legacyMatches = cards.filter((card) => card.status === "legacy" && input.changedFiles.some((filePath) => matchesAnyGlob(filePath, card.fileGlobs)));
  for (const card of legacyMatches) {
    addRequiredCard(required, card, `Legacy warning required because changed files match ${card.id}.`);
  }

  if (affectedSurfaces.includes("server")) {
    addRequiredCard(required, findCard(cards, (card) => card.id === "doctrine-card-surface-server-truth"), "Server truth doctrine is required for backend paths.");
  }

  return required;
}

function coverageFor(requiredValues: string[], selectedCards: DoctrineCard[], matcher: (card: DoctrineCard, value: string) => boolean) {
  if (requiredValues.length === 0) return 1;
  const covered = requiredValues.filter((value) => selectedCards.some((card) => matcher(card, value))).length;
  return covered / requiredValues.length;
}

function selectedValidatorCoverage(requiredValidators: string[], selectedCards: DoctrineCard[]) {
  if (requiredValidators.length === 0) return 1;
  const covered = requiredValidators.filter((validator) => selectedCards.some((card) => card.validators.includes(validator))).length;
  return covered / requiredValidators.length;
}

export function optimizeDoctrineContext(input: DoctrineRetrievalInput): OptimizedDoctrineContext {
  const normalizedInput = {
    taskSummary: input.taskSummary,
    changedFiles: input.changedFiles.map(normalizePath),
    riskHints: input.riskHints ?? [],
  };
  const maxTokenBudget = input.maxTokenBudget ?? DEFAULT_MAX_DOCTRINE_TOKENS;
  const allCards = loadDoctrineCards();
  const surfaceMap = readJson<SurfaceDoctrineMap>(SURFACE_MAP_PATH) ?? { pathRules: [] };
  const highRisk = isHighRiskInput(normalizedInput.changedFiles, normalizedInput.taskSummary, normalizedInput.riskHints);
  const maxCards = input.maxCards ?? (highRisk ? HIGH_RISK_MAX_DOCTRINE_CARDS : DEFAULT_MAX_DOCTRINE_CARDS);
  const surfaceMatches = resolveSurfaceMatches(normalizedInput.changedFiles, surfaceMap);
  const inferredFeatures = inferFeatureMatches(allCards, normalizedInput.changedFiles, normalizedInput.taskSummary);
  const routedFeatures = surfaceMatches.featureSurfaces.filter((feature) =>
    featureRelevant(feature, normalizedInput.changedFiles, normalizedInput.taskSummary),
  );
  const affectedSurfaces = unique([...surfaceMatches.primarySurfaces, ...(input.explicitSurfaces ?? [])]);
  const affectedFeatures = unique([...routedFeatures, ...inferredFeatures, ...(input.explicitFeatures ?? [])]);
  const affectedForScoring = unique([...affectedSurfaces, ...affectedFeatures]);
  const scores = new Map(
    allCards.map((card) => [
      card.id,
      scoreDoctrineCard(card, normalizedInput.changedFiles, affectedForScoring, normalizedInput.taskSummary, normalizedInput.riskHints, maxTokenBudget),
    ]),
  );
  const requiredCards = collectRequiredCards(allCards, normalizedInput, affectedSurfaces, affectedFeatures, highRisk);
  const selectedIds = new Map(requiredCards);
  const legacyTouchedForInput = allCards.some(
    (card) => card.status === "legacy" && normalizedInput.changedFiles.some((filePath) => matchesAnyGlob(filePath, card.fileGlobs)),
  );
  const decisionTrace = [
    ...surfaceMatches.trace,
    `High risk: ${highRisk ? "yes" : "no"}.`,
    `Max cards: ${maxCards}; max token budget: ${maxTokenBudget}.`,
    ...Array.from(requiredCards.entries()).map(([cardId, reason]) => `Required ${cardId}: ${reason}`),
  ];

  const candidates = [...allCards]
    .filter((card) => !selectedIds.has(card.id))
    .map((card) => ({ card, score: scores.get(card.id) as DoctrineCardScore }))
    .filter((entry) => entry.score.coverageScore > 0)
    .sort((left, right) => {
      if (right.score.utilityScore !== left.score.utilityScore) return right.score.utilityScore - left.score.utilityScore;
      return left.card.authorityLevel - right.card.authorityLevel;
    });

  function currentSelected() {
    return Array.from(selectedIds.keys())
      .map((id) => allCards.find((card) => card.id === id))
      .filter((card): card is DoctrineCard => Boolean(card));
  }

  function currentCoverage(selected: DoctrineCard[]) {
    const requiredSurfaceCoverage = coverageFor(affectedSurfaces, selected, (card, surface) => card.surface === surface || card.feature === surface);
    const requiredFeatureCoverage = coverageFor(affectedFeatures, selected, (card, feature) => card.feature === feature || card.surface === feature);
    return Math.min(requiredSurfaceCoverage, requiredFeatureCoverage);
  }

  function needsMoreCards(selected: DoctrineCard[]) {
    if (currentCoverage(selected) < 0.95) return true;
    if (highRisk && !selected.some((card) => card.surface === "source-of-truth")) return true;
    if (legacyTouchedForInput && !selected.some((card) => card.status === "legacy")) return true;
    return false;
  }

  for (const { card, score } of candidates) {
    const selected = currentSelected();
    if (!needsMoreCards(selected)) break;
    const tokensIfAdded = estimateSelectedTokens([...selected, card]);
    if (selected.length >= maxCards && currentCoverage(selected) >= 0.95) continue;
    if (tokensIfAdded > maxTokenBudget && !highRisk) continue;
    selectedIds.set(card.id, `Greedy utility selected: ${score.utilityScore.toFixed(2)}.`);
    decisionTrace.push(`Selected ${card.id} by utility ${score.utilityScore.toFixed(2)}.`);
  }

  let selectedCards = currentSelected();
  let conflictScore = scoreDoctrineConflicts(selectedCards, normalizedInput.changedFiles, surfaceMap.pathRules as SurfacePathRule[]);
  if (conflictScore.penalty > 0) {
    for (const resolver of ["doctrine-card-product-constitution", "doctrine-card-source-of-truth-constitution", "doctrine-card-engineering-constitution", "doctrine-card-surface-routing-map"]) {
      const card = allCards.find((candidate) => candidate.id === resolver);
      if (card && !selectedIds.has(card.id)) selectedIds.set(card.id, "Added as authority resolver for conflict safety.");
    }
    selectedCards = currentSelected();
    conflictScore = scoreDoctrineConflicts(selectedCards, normalizedInput.changedFiles, surfaceMap.pathRules as SurfacePathRule[]);
  }

  const selectedSet = new Set(selectedCards.map((card) => card.id));
  const selectedValidators = unique(selectedCards.flatMap((card) => card.validators));
  const blockedPatterns = unique(selectedCards.flatMap((card) => card.blockedPatterns));
  const legacyWarnings = selectedCards
    .filter((card) => card.status === "legacy")
    .map((card) => `${card.id}: ${card.rules[1] ?? card.rules[0] ?? "Legacy card selected."}`);
  const estimatedTokens = estimateSelectedTokens(selectedCards);
  const fullMarkdownTokenEstimate = estimateMarkdownDoctrineTokens(root);
  const surfaceCoverage = currentCoverage(selectedCards);
  const highRiskCoverage = !highRisk || selectedCards.some((card) => card.surface === "source-of-truth") ? 1 : 0;
  const validatorCoverage = selectedValidatorCoverage(selectedValidators, selectedCards);
  const legacyWarningCoverage = !legacyTouchedForInput || selectedCards.some((card) => card.status === "legacy") ? 1 : 0;

  return {
    taskSummary: input.taskSummary,
    changedFiles: normalizedInput.changedFiles,
    affectedSurfaces,
    affectedFeatures,
    selectedCards: selectedCards.map((card) => ({
      ...card,
      score: scores.get(card.id) as DoctrineCardScore,
      selectionReason: selectedIds.get(card.id) ?? "Selected.",
    })),
    excludedCards: allCards
      .filter((card) => !selectedSet.has(card.id))
      .map((card) => ({
        id: card.id,
        reason:
          (scores.get(card.id)?.coverageScore ?? 0) === 0
            ? "No changed-file, surface, risk, or intent match."
            : `Lower utility than selected cards (${(scores.get(card.id)?.utilityScore ?? 0).toFixed(2)}).`,
      })),
    coverage: {
      surfaceCoverage,
      highRiskCoverage,
      validatorCoverage,
      legacyWarningCoverage,
      contextSavings: computeContextSavings(estimatedTokens, fullMarkdownTokenEstimate),
      estimatedTokens,
    },
    requiredValidators: selectedValidators,
    blockedPatterns,
    legacyWarnings,
    conflicts: conflictScore.conflicts,
    fullDocsOnlyIfNeeded: conflictScore.conflicts.some((conflict) => conflict.status === "unresolved")
      ? selectedCards.map((card) => card.canonicalDoc)
      : selectedCards.filter((card) => card.requiresFullDoc).map((card) => card.canonicalDoc),
    decisionTrace,
  };
}

export function writeOptimizedDoctrineContext(context: OptimizedDoctrineContext, outputPath = CONTEXT_OUTPUT_PATH) {
  const absolutePath = repoPath(outputPath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(context)}\n`, "utf8");
}

export const OPTIMIZED_DOCTRINE_CONTEXT_PATH = CONTEXT_OUTPUT_PATH;
