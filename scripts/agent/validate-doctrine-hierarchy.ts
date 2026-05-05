import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type RegistryEntry = {
  id: string;
  title: string;
  path: string;
  authorityLevel: number;
  surface: string;
  status: string;
  supersedes: string[];
  supersededBy: string | null;
  owner: string;
  lastReviewed: string;
  reviewBy: string;
  removeBy: string | null;
  requiredValidators: string[];
  canonicalRules: string[];
  blockedPatterns: string[];
};

type Registry = {
  entries: RegistryEntry[];
  score: { overallScore: number; buckets: Record<string, number> };
};

type Card = {
  id: string;
  surface: string;
  authorityLevel: number;
  canonicalDoc: string;
  summary: string;
  must: string[];
  mustNot: string[];
  sourceTruth: string[];
  validators: string[];
  legacyWarnings: string[];
  tokenEstimate: number;
};

type ConflictReport = {
  status: string;
  conflicts: Array<{
    surface: string;
    conflict: string;
    docs: string[];
    winningRule: string;
    authorityReason: string;
    action: string;
  }>;
};

const root = process.cwd();
const failures: string[] = [];
const requiredSurfaces = [
  "wallet",
  "drops",
  "viewer",
  "watch-time",
  "telemetry",
  "user-management",
  "behavioral-intelligence",
  "creator-profile",
  "creator-dashboard",
  "support",
  "moderation",
  "admin-debug",
  "admin-ai",
  "device-ui",
  "image-loading",
  "security/cost",
  "cloud/sql/bigquery",
];

function fail(message: string) {
  failures.push(message);
}

function exists(filePath: string) {
  return existsSync(join(root, filePath));
}

function read(filePath: string) {
  if (!exists(filePath)) {
    fail(`Missing required file: ${filePath}`);
    return "";
  }
  return readFileSync(join(root, filePath), "utf8");
}

function parseJson<T>(filePath: string): T | null {
  const source = read(filePath);
  if (!source) return null;
  try {
    return JSON.parse(source) as T;
  } catch (error) {
    fail(`${filePath} must be valid JSON: ${(error as Error).message}`);
    return null;
  }
}

function parseJsonl(filePath: string): Card[] {
  const source = read(filePath);
  if (!source) return [];
  const cards: Card[] = [];
  source.split(/\r?\n/u).filter(Boolean).forEach((line, index) => {
    try {
      cards.push(JSON.parse(line) as Card);
    } catch (error) {
      fail(`${filePath}:${index + 1} must be valid JSONL: ${(error as Error).message}`);
    }
  });
  return cards;
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    fail(`${label} must include "${needle}".`);
  }
}

function lineCount(filePath: string) {
  return read(filePath).split(/\r?\n/u).length;
}

const requiredFiles = [
  "docs/doctrine/00-product-constitution.md",
  "docs/doctrine/01-source-of-truth-constitution.md",
  "docs/doctrine/02-engineering-constitution.md",
  "docs/doctrine/surfaces/README.md",
  "agent/context/doctrine-registry.json",
  "agent/context/doctrine-conflicts.generated.json",
  "agent/context/doctrine-cards.jsonl",
  "scripts/agent/score-doctrine-hierarchy.ts",
  "scripts/agent/validate-doctrine-hierarchy.ts",
  "docs/agent-truth/doctrine-hierarchy.md",
];

for (const filePath of requiredFiles) {
  exists(filePath);
  if (!exists(filePath)) fail(`Missing required file: ${filePath}`);
}

const registry = parseJson<Registry>("agent/context/doctrine-registry.json");
const conflicts = parseJson<ConflictReport>("agent/context/doctrine-conflicts.generated.json");
const cards = parseJsonl("agent/context/doctrine-cards.jsonl");

if (registry) {
  if (!Array.isArray(registry.entries) || registry.entries.length === 0) {
    fail("doctrine-registry.json must include entries.");
  }
  if (registry.score.overallScore < 80) {
    fail("Doctrine health score must be at least 80.");
  }
  for (const item of registry.entries) {
    for (const field of ["id", "title", "path", "surface", "status", "owner", "lastReviewed", "reviewBy"] as const) {
      if (typeof item[field] !== "string" || item[field].length === 0) fail(`${item.id}.${field} must be non-empty.`);
    }
    if (![1, 2, 3, 4, 5, 6, 7].includes(item.authorityLevel)) fail(`${item.id}.authorityLevel is invalid.`);
    if (!["canonical", "supporting", "generated", "legacy", "deprecated"].includes(item.status)) fail(`${item.id}.status is invalid.`);
    if (!Array.isArray(item.requiredValidators)) fail(`${item.id}.requiredValidators must be an array.`);
    if ((item.status === "legacy" || item.status === "deprecated") && (!item.supersededBy || !item.reviewBy)) {
      fail(`${item.id} legacy/deprecated entry must include supersededBy and reviewBy.`);
    }
    if (item.path.startsWith("agent/state/") && item.status === "canonical") {
      fail(`${item.id} generated report must not be canonical.`);
    }
  }

  for (const surface of requiredSurfaces) {
    const canonical = registry.entries.filter((item) => item.surface === surface && item.status === "canonical" && item.authorityLevel === 4);
    if (canonical.length !== 1) fail(`${surface} must have exactly one canonical authority-level-4 doctrine doc.`);
    if (canonical[0] && canonical[0].requiredValidators.length === 0) fail(`${surface} canonical doctrine must list validators.`);
  }

  const canonicalPairs = new Set<string>();
  for (const item of registry.entries.filter((entry) => entry.status === "canonical")) {
    const key = `${item.surface}:${item.authorityLevel}`;
    if (canonicalPairs.has(key) && item.authorityLevel === 4) fail(`Duplicate canonical doc for ${key}.`);
    canonicalPairs.add(key);
  }

  const cardDocs = new Set(cards.map((card) => card.canonicalDoc));
  for (const item of registry.entries.filter((entry) => entry.path.endsWith(".md") && exists(entry.path))) {
    if (lineCount(item.path) > 300 && !cardDocs.has(item.path)) {
      fail(`${item.path} is over markdown budget and lacks a compact doctrine card.`);
    }
  }
}

if (cards.length === 0) {
  fail("doctrine-cards.jsonl must include cards.");
}
for (const surface of requiredSurfaces) {
  const surfaceCards = cards.filter((card) => card.surface === surface && card.authorityLevel === 4);
  if (surfaceCards.length !== 1) fail(`${surface} must have one canonical doctrine card.`);
  for (const card of surfaceCards) {
    if (card.validators.length === 0) fail(`${surface} card must include validators.`);
    if (card.tokenEstimate <= 0) fail(`${surface} card must include tokenEstimate.`);
  }
}

if (conflicts) {
  const known = [
    "Realtime admin/users route vs hot-cache/materialized admin user metrics.",
    "Preview modal canonical vs full-page locked preview canonical.",
    "Notification opened/read split vs notification_read as one behavioral fact.",
    "Client unlock success counts vs server entitlement truth wins.",
    "Screenshot detected vs screenshot-like heuristic context.",
    "SQL forbidden vs Data Connect allowed mirror.",
    "Wallet total balance only vs split free/paid source-aware balance.",
    "Green bonus chip vs purple bonus chip.",
  ];
  for (const expected of known) {
    if (!conflicts.conflicts.some((conflict) => conflict.conflict === expected)) {
      fail(`Known conflict missing: ${expected}`);
    }
  }
  for (const conflict of conflicts.conflicts) {
    if (!conflict.winningRule || !conflict.authorityReason) fail(`${conflict.conflict} must include winningRule and authorityReason.`);
    if (!["update_legacy_doc", "mark_superseded", "manual_review"].includes(conflict.action)) fail(`${conflict.conflict} has invalid action.`);
  }
}

const readme = read("README.md");
requireIncludes(readme, "agent/context/doctrine-registry.json", "README");
requireIncludes(readme, "docs/doctrine/00-product-constitution.md", "README");
requireIncludes(readme, "docs/doctrine/01-source-of-truth-constitution.md", "README");
requireIncludes(readme, "docs/doctrine/02-engineering-constitution.md", "README");
requireIncludes(readme, "control-tower/00-START-HERE.md", "README");
if (readme.includes("### Device Layout Contract") || readme.includes("### GumDrop Source-Of-Funds")) {
  fail("README should be a gateway and not duplicate long doctrine sections.");
}
if (/preview modal canonical|green bonus chip|wallet total balance only/iu.test(readme)) {
  fail("README contains legacy doctrine contradiction.");
}

const agents = read("AGENTS.md");
for (const expected of [
  "agent/context/doctrine-registry.json",
  "agent/context/doctrine-cards.jsonl",
  "Do not read every Markdown file by default",
  "command budget",
]) {
  requireIncludes(agents, expected, "AGENTS.md");
}

const packageJson = read("package.json");
requireIncludes(packageJson, '"score:doctrine": "tsx scripts/agent/score-doctrine-hierarchy.ts"', "package.json");
requireIncludes(packageJson, '"check:doctrine": "tsx scripts/agent/validate-doctrine-hierarchy.ts"', "package.json");

const scoreScript = read("scripts/agent/score-doctrine-hierarchy.ts");
const validatorScript = read("scripts/agent/validate-doctrine-hierarchy.ts");
for (const [label, source] of [["score script", scoreScript], ["validator script", validatorScript]] as const) {
  for (const forbidden of ["playwright" + " test", "cypress" + " run", "lighthouse" + "("]) {
    if (source.includes(forbidden)) fail(`${label} must not invoke forbidden broad audit command ${forbidden}.`);
  }
}

if (failures.length > 0) {
  console.error("Doctrine hierarchy validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Doctrine hierarchy validation passed.");
