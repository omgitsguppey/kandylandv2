import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export type ValidationResult = {
  ok: boolean;
  failures: string[];
  warnings: string[];
};

export const TYPE_HARDENING_ROOT = process.cwd();

const SKIP_DIRS = new Set([
  ".git",
  ".next",
  "coverage",
  "node_modules",
  "playwright-report",
  "test-results",
]);

export const TYPE_SCAN_ROOTS = [
  "src/types",
  "src/lib",
  "src/app",
  "src/components",
  "src/hooks",
  "src/context",
  "scripts/agent",
  "tests/unit",
] as const;

export function repoPath(path: string) {
  return join(TYPE_HARDENING_ROOT, path);
}

export function normalizePath(path: string) {
  return path.replace(/\\/gu, "/");
}

export function readText(path: string) {
  const fullPath = repoPath(path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

export function readJson<T>(path: string, fallback: T): T {
  try {
    const text = readText(path);
    return text ? JSON.parse(text) as T : fallback;
  } catch {
    return fallback;
  }
}

export function fileExists(path: string) {
  return existsSync(repoPath(path));
}

export function listFiles(paths: readonly string[], extensions: readonly string[] = [".ts", ".tsx"]) {
  const files: string[] = [];

  function walk(absPath: string) {
    if (!existsSync(absPath)) return;
    const stat = statSync(absPath);
    if (stat.isDirectory()) {
      const name = absPath.split(/[\\/]/u).pop() || "";
      if (SKIP_DIRS.has(name)) return;
      for (const entry of readdirSync(absPath)) walk(join(absPath, entry));
      return;
    }
    const rel = normalizePath(relative(TYPE_HARDENING_ROOT, absPath));
    if (extensions.some((extension) => rel.endsWith(extension))) files.push(rel);
  }

  for (const path of paths) walk(repoPath(path));
  return files.sort();
}

export function lineCount(path: string) {
  const text = readText(path);
  return text ? text.split(/\r?\n/u).length : 0;
}

export function currentGitHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: TYPE_HARDENING_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

export function unique<T>(values: readonly T[]) {
  return [...new Set(values)];
}

export function countMatches(text: string, pattern: RegExp) {
  return [...text.matchAll(pattern)].length;
}

export type SharedTypeDomain =
  | "user"
  | "creator"
  | "wallet"
  | "payment"
  | "gumdrop"
  | "drop"
  | "watch"
  | "chat"
  | "task"
  | "notification"
  | "media"
  | "search"
  | "support"
  | "auth"
  | "analytics"
  | "event_envelope"
  | "person_metrics"
  | "journey"
  | "debug"
  | "release_readiness"
  | "cost"
  | "legacy_recovery"
  | "config"
  | "surface_feature_telemetry"
  | "unknown";

const DOMAIN_RULES: Array<[SharedTypeDomain, RegExp]> = [
  ["event_envelope", /event-envelope|EventEnvelope/iu],
  ["person_metrics", /person-metrics|PersonMetric/iu],
  ["release_readiness", /release-readiness|ReleaseReadiness|EvidenceStatus|Readiness/iu],
  ["debug", /debug|interpretive-brain|Finding|RootCause/iu],
  ["gumdrop", /gumdrop|GumDrop/iu],
  ["wallet", /wallet|Wallet/iu],
  ["payment", /payment|paypal|PayPal|entitlement|revenue/iu],
  ["creator", /creator|Creator|fan-pass|FanPass/iu],
  ["user", /user|UserProfile|Account/iu],
  ["analytics", /analytics|MetricStatus|HydrationStatus/iu],
  ["journey", /journey|JourneyEvent/iu],
  ["legacy_recovery", /legacy|LegacyCandidate/iu],
  ["cost", /cost|Cost/iu],
  ["drop", /drop|Drop/iu],
  ["watch", /watch|Watch/iu],
  ["chat", /chat|Chat/iu],
  ["task", /task|Task|checkin|CheckIn/iu],
  ["notification", /notification|push|PWA/iu],
  ["media", /media|upload|storage|asset/iu],
  ["search", /search|Search/iu],
  ["support", /support|Support/iu],
  ["auth", /auth|session|Auth/iu],
  ["config", /config|env|ci|security-header|security-rules|dependency/iu],
  ["surface_feature_telemetry", /surface|feature|telemetry|parity/iu],
];

export function classifyDomain(path: string, name = ""): SharedTypeDomain {
  const value = `${path} ${name}`;
  for (const [domain, pattern] of DOMAIN_RULES) {
    if (pattern.test(value)) return domain;
  }
  return "unknown";
}

export const MEMORY_LINES = [
  "Before adding a new interface, DTO, schema, or contract, search for an existing canonical type. Do not create another shape for the same concept unless replacing the old one and updating imports.",
  "Every shared domain object must have one canonical owner. User, creator, GumDrop, wallet, entitlement, event envelope, debug finding, release evidence, and analytics metric shapes should not be redefined inside random components, routes, tests, or validators.",
  "Generated report schemas must be compact and typed through canonical contracts. Do not create massive generated JSON shapes that drift from source types.",
  "If a validator needs a shape, import or derive the canonical type instead of copy-pasting a near-duplicate test-only interface.",
  "End every type/schema pass by searching for duplicate interface/type names, local DTOs, stale aliases, and unsafe_unknown schema drift.",
] as const;
