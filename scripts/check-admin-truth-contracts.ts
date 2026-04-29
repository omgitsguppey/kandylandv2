import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = process.cwd();
const adminUiRoots = [
  join(repoRoot, "src", "app", "admin"),
  join(repoRoot, "src", "components", "Admin"),
];
const adminApiRoot = join(repoRoot, "src", "app", "api", "admin");

function walk(dir: string, predicate: (path: string) => boolean, files: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath, predicate, files);
    } else if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

const uiFiles = adminUiRoots.flatMap((root) =>
  walk(root, (path) => /\.(tsx|ts)$/.test(path)),
);
const routeFiles = walk(adminApiRoot, (path) => path.endsWith("route.ts"));

const failures: string[] = [];
const adminDebugPagePath = join(repoRoot, "src", "app", "admin", "debug", "page.tsx");
const adminDebugPageSource = readFileSync(adminDebugPagePath, "utf8");

for (const file of uiFiles) {
  const source = readFileSync(file, "utf8");
  const rel = relative(repoRoot, file);
  const localTruthVocabulary = [
    /truthState=\{"cached"\}/,
    /truthState=\{"partial"\}/,
    /loading\s*\?\s*"unavailable"/,
    /isLoading\s*\)\s*return\s*"unavailable"/,
    /isLoading\s*\?\s*"unavailable"/,
    /setRealtimeState\([^)]*"unavailable"[^)]*\)/,
    /truthState\s*=\s*"unavailable"/,
    /return\s+"unavailable";\s*\/\/\s*default/i,
    /truthVariant:\s*"live"\s*\|\s*"cached"/,
    /type\s+\w*TruthState\s*=\s*"live_server"/,
    /TRUTH_CHIP_STYLES/,
    /TRUTH_DOT_STYLES/,
    /resolveDropsTruthLabel/,
    /truthState:\s*[^,\n]*"waiting"/,
    /STATE_COLORS:\s*Record<AdminSurfaceState/,
  ];

  localTruthVocabulary.forEach((pattern) => {
    if (pattern.test(source)) {
      failures.push(`${rel}: local admin truth vocabulary matches ${pattern}`);
    }
  });

  if (
    source.includes("MetricCard") &&
    /value=\{[^}]*\?\?\s*0\}/.test(source) &&
    !source.includes("truthState=")
  ) {
    failures.push(`${rel}: MetricCard has a zero fallback without an explicit truthState`);
  }

  if (
    rel.endsWith(join("src", "app", "admin", "debug", "components", "DebugPrimitives.tsx")) &&
    (!source.includes("AdminStatusBadge") || !source.includes("truthState: AdminSurfaceState"))
  ) {
    failures.push(`${rel}: debug primitives must expose AdminStatusBadge-backed truthState props`);
  }

  if (
    rel.endsWith(join("src", "app", "admin", "debug", "components", "DebugPrimitives.tsx")) &&
    /function\s+StatCard\([\s\S]*?truthState\s*=\s*"loading"/.test(source)
  ) {
    failures.push(`${rel}: StatCard must not default loaded debug metrics to loading`);
  }

  const statCardMatches = source.match(/<StatCard\b(?![^>]*truthState=)/g) ?? [];
  if (statCardMatches.length > 0) {
    failures.push(`${rel}: ${statCardMatches.length} StatCard usage(s) missing explicit truthState`);
  }
}

if (adminDebugPageSource.includes("const routeRuntimeHealth = realtimeRouteHealth;")) {
  failures.push("src/app/admin/debug/page.tsx: route health card must merge realtime listener rows with the admin debug API snapshot");
}
if (adminDebugPageSource.includes("no route rollups yet")) {
  failures.push("src/app/admin/debug/page.tsx: route health empty state must name the unavailable source instead of hiding behind generic no-rollup copy");
}
if (adminDebugPageSource.includes("panel log issues +")) {
  failures.push("src/app/admin/debug/page.tsx: open actions card must use bucketed source detail instead of generic plus-count copy");
}
if (!adminDebugPageSource.includes("buildAdminDebugRouteHealthCard") || !adminDebugPageSource.includes("buildAdminDebugOpenActionsCard")) {
  failures.push("src/app/admin/debug/page.tsx: admin debug rollup cards must use tested summary helpers");
}

const routeRuntimeHealthPath = join(repoRoot, "src", "lib", "server", "route-runtime-health.ts");
const routeRuntimeHealthSource = readFileSync(routeRuntimeHealthPath, "utf8");
if (routeRuntimeHealthSource.includes("payload.success !== true")) {
  failures.push("src/lib/server/route-runtime-health.ts: admin verification injection must not require success: true");
}
if (/freshnessTimestamp:\s*Date\.now\(\)/.test(routeRuntimeHealthSource)) {
  failures.push("src/lib/server/route-runtime-health.ts: admin verification freshness must come from payload evidence, not response time");
}
if (!routeRuntimeHealthSource.includes("Admin route verification injection failed")) {
  failures.push("src/lib/server/route-runtime-health.ts: admin verification injection failures must be recorded");
}

for (const file of routeFiles) {
  const source = readFileSync(file, "utf8");
  const rel = relative(repoRoot, file);
  const exportsMethod = /export\s+(async\s+function|let|const)\s+(GET|POST|PUT|PATCH|DELETE)/.test(source);
  if (!exportsMethod) {
    continue;
  }

  if (!source.includes("withRouteRuntimeHealth") && !source.includes("recordRouteRuntimeSample")) {
    failures.push(`${rel}: admin API route exports a handler without runtime health recording`);
  }

  if (
    /NextResponse\.json\(\s*\{[\s\S]*success:\s*true/.test(source) &&
    !source.includes("buildServerAdminModuleVerification") &&
    !source.includes("verification:") &&
    !source.includes("withRouteRuntimeHealth")
  ) {
    failures.push(`${rel}: successful admin API response lacks source verification payload`);
  }
}

if (failures.length > 0) {
  console.error("Admin truth contract check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Admin truth contract check passed (${uiFiles.length} UI files, ${routeFiles.length} admin routes).`);
