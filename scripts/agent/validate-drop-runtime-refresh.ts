import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const failures: string[] = [];
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);

function repoPath(...segments: string[]) {
  return path.join(repoRoot, ...segments);
}

function normalizePath(filePath: string) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function readRequired(relativePath: string) {
  const absolutePath = repoPath(relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }

  return readFileSync(absolutePath, "utf8");
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    failures.push(`${label} is missing required source: ${expected}`);
  }
}

function countOccurrences(source: string, needle: string) {
  return source.split(needle).length - 1;
}

function parseMsConstant(source: string, name: string) {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*([\\d_]+)`));
  if (!match) {
    failures.push(`Missing bounded refresh constant: ${name}`);
    return null;
  }

  return Number(match[1].replaceAll("_", ""));
}

function assertMaxMs(source: string, name: string, maxMs: number) {
  const value = parseMsConstant(source, name);
  if (value === null) {
    return;
  }

  if (!Number.isFinite(value) || value > maxMs) {
    failures.push(`${name} must be bounded at <= ${maxMs}ms, found ${value}ms.`);
  }
}

function walkSourceFiles(directory: string, files: string[] = []) {
  if (!existsSync(directory)) {
    return files;
  }

  for (const entry of readdirSync(directory)) {
    const absolutePath = path.join(directory, entry);
    const relativePath = normalizePath(absolutePath);
    if (
      entry === "node_modules" ||
      entry === ".next" ||
      entry === ".git" ||
      entry === "dist" ||
      entry === "build" ||
      entry === "coverage"
    ) {
      continue;
    }

    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      walkSourceFiles(absolutePath, files);
      continue;
    }

    if (sourceExtensions.has(path.extname(entry))) {
      files.push(relativePath);
    }
  }

  return files;
}

const useDropsPath = "src/hooks/useDrops.ts";
const docsPath = "docs/agent-truth/drop-runtime-refresh.md";
const packageJson = JSON.parse(readRequired("package.json") || "{}") as {
  scripts?: Record<string, string>;
};
const useDrops = readRequired(useDropsPath);
const docs = readRequired(docsPath);

if (packageJson.scripts?.["check:drop-runtime-refresh"] !== "tsx scripts/agent/validate-drop-runtime-refresh.ts") {
  failures.push("package.json must expose check:drop-runtime-refresh with the targeted validator command.");
}

requireIncludes(docs, "public drop freshness runtime invalidation", "drop runtime refresh doctrine");
requireIncludes(docs, "No new public drops realtime listener", "drop runtime refresh doctrine");
requireIncludes(docs, "npm run check:drop-runtime-refresh", "drop runtime refresh doctrine");

requireIncludes(useDrops, "useSWRInfinite", "public drops runtime");
requireIncludes(useDrops, "fallbackData: fallback", "public drops runtime");
requireIncludes(useDrops, 'headers.set("If-None-Match", cachedEtag)', "public drops ETag caching");
requireIncludes(useDrops, "res.status === 304", "public drops ETag caching");
requireIncludes(useDrops, 'res.headers.get("etag")', "public drops ETag caching");
requireIncludes(useDrops, "dropPageEtagCache", "public drops ETag caching");
requireIncludes(useDrops, "dropPageResponseCache", "public drops ETag caching");
requireIncludes(useDrops, "refreshInterval: refreshIntervalMs", "public drops SWR refresh");
requireIncludes(useDrops, "refreshWhenHidden: false", "public drops SWR refresh");
requireIncludes(useDrops, "revalidateOnFocus: false", "manual focus refresh ownership");
requireIncludes(useDrops, 'window.addEventListener("focus", syncDrops)', "focus refresh");
requireIncludes(useDrops, 'document.addEventListener("visibilitychange", handleVisibilityChange)', "visibility refresh");
requireIncludes(useDrops, "nextExpiryMs", "expiration refresh");
requireIncludes(useDrops, "EXPIRY_REFRESH_BUFFER_MS", "expiration refresh");
requireIncludes(useDrops, "window.setTimeout", "expiration refresh");
requireIncludes(useDrops, "refreshDrops(0)", "expiration refresh");
requireIncludes(useDrops, "public drop freshness runtime invalidation", "approved runtime invalidation comment");
requireIncludes(useDrops, "SYSTEM_RUNTIME_COLLECTION", "approved runtime invalidation listener");
requireIncludes(useDrops, "DROP_RUNTIME_DOC_ID", "approved runtime invalidation listener");
requireIncludes(useDrops, "doc(db, SYSTEM_RUNTIME_COLLECTION, DROP_RUNTIME_DOC_ID)", "approved runtime invalidation listener");

if (countOccurrences(useDrops, "onSnapshot(") !== 1) {
  failures.push(`Expected exactly one approved onSnapshot listener in ${useDropsPath}.`);
}

if (useDrops.includes("setInterval(")) {
  failures.push(`${useDropsPath} must not use setInterval polling for public drop freshness.`);
}

if (useDrops.includes("EventSource(") || useDrops.includes("new EventSource")) {
  failures.push(`${useDropsPath} must not use EventSource for public drop freshness.`);
}

assertMaxMs(useDrops, "DROPS_REFRESH_MS", 30_000);
assertMaxMs(useDrops, "DROPS_CONSTRAINED_REFRESH_MS", 90_000);
assertMaxMs(useDrops, "DROPS_VERY_SLOW_REFRESH_MS", 120_000);
assertMaxMs(useDrops, "EXPIRY_REFRESH_BUFFER_MS", 5_000);

if (!useDrops.includes("refreshDrops(isConstrained ? 20_000 : 6_000)")) {
  failures.push("Focus/visibility refresh must stay throttled to bounded values.");
}

if (!useDrops.includes("refreshDrops(isConstrained ? 6_000 : 1_500)")) {
  failures.push("Runtime invalidation refresh must stay throttled to bounded values.");
}

const duplicateRealtimeViolations: string[] = [];
for (const relativePath of walkSourceFiles(repoPath("src"))) {
  if (relativePath === useDropsPath) {
    continue;
  }

  const source = readFileSync(repoPath(relativePath), "utf8");
  const hasRealtimeListener = source.includes("onSnapshot(");
  if (!hasRealtimeListener) {
    continue;
  }

  const normalized = relativePath.toLowerCase();
  const isAdminOrDebug =
    normalized.includes("/admin/") ||
    normalized.includes("admin") ||
    normalized.includes("/debug/");
  const isPublicDropSurface =
    normalized.startsWith("src/app/drops/") ||
    normalized.startsWith("src/components/drop") ||
    normalized.startsWith("src/components/drops/") ||
    normalized.includes("featuredcarousel") ||
    (normalized.startsWith("src/hooks/") && !isAdminOrDebug);
  const listensToRuntimeDoc = source.includes("DROP_RUNTIME_DOC_ID") || source.includes("SYSTEM_RUNTIME_COLLECTION");
  const listensToDropsCollection = /collection\([^)]*["'`]drops["'`]/.test(source);

  if ((listensToRuntimeDoc || (isPublicDropSurface && listensToDropsCollection)) && !isAdminOrDebug) {
    duplicateRealtimeViolations.push(relativePath);
  }
}

if (duplicateRealtimeViolations.length > 0) {
  failures.push(
    `Only ${useDropsPath} may own public drop freshness runtime invalidation. Found duplicate public drops realtime listener(s): ${duplicateRealtimeViolations.join(", ")}`
  );
}

if (failures.length > 0) {
  console.error("Drop runtime refresh validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Drop runtime refresh validation passed.");
