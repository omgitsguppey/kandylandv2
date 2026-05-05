import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

type PrimarySurface = "user" | "creator" | "admin" | "server" | "shared-primitives" | "cross-surface-contract";

type PathRule = {
  pattern: string;
  primarySurface: PrimarySurface;
  doctrine: string;
  why: string;
  featureSurfaces?: string[];
};

type MajorRouteGroup = {
  route: string;
  appPath: string;
  primarySurface: PrimarySurface;
};

type SurfaceDoctrineMap = {
  version: number;
  surfaces: Record<string, { doctrine: string; title: string; priority: string }>;
  pathRules: PathRule[];
  majorRouteGroups: MajorRouteGroup[];
  conflictRules: Array<{ conflict: string; winner: PrimarySurface | "surface"; rule: string }>;
  validators: string[];
};

const root = process.cwd();
const failures: string[] = [];

const requiredDocs = [
  "docs/doctrine/03-surface-hierarchy.md",
  "docs/doctrine/surfaces/user-ui-doctrine.md",
  "docs/doctrine/surfaces/creator-ui-doctrine.md",
  "docs/doctrine/surfaces/admin-ui-doctrine.md",
  "docs/doctrine/surfaces/server-truth-doctrine.md",
  "docs/doctrine/surfaces/shared-brand-primitives.md",
  "agent/context/surface-doctrine-map.json",
];

function repoPath(filePath: string) {
  return join(root, filePath);
}

function normalizePath(filePath: string) {
  return filePath.replace(/\\/gu, "/");
}

function fail(message: string) {
  failures.push(message);
}

function exists(filePath: string) {
  return existsSync(repoPath(filePath));
}

function read(filePath: string) {
  if (!exists(filePath)) {
    fail(`Missing required file: ${filePath}`);
    return "";
  }
  return readFileSync(repoPath(filePath), "utf8");
}

function parseJson<T>(filePath: string) {
  const source = read(filePath);
  if (!source) return null;
  try {
    return JSON.parse(source) as T;
  } catch (error) {
    fail(`${filePath} must be valid JSON: ${(error as Error).message}`);
    return null;
  }
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    fail(`${label} must include "${needle}".`);
  }
}

function listFiles(startPath: string, extensions = [".ts", ".tsx"]) {
  const fullStart = repoPath(startPath);
  if (!existsSync(fullStart)) return [] as string[];
  const files: string[] = [];
  const stack = [fullStart];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);
      const repoRelative = normalizePath(fullPath.slice(root.length + 1));
      if (entry.isDirectory()) {
        if (!["node_modules", ".next", "coverage", "dist", "build"].includes(entry.name)) stack.push(fullPath);
        continue;
      }
      if (extensions.some((extension) => entry.name.endsWith(extension))) files.push(repoRelative);
    }
  }
  return files;
}

function findRuleForPattern(map: SurfaceDoctrineMap, patternPrefix: string) {
  return map.pathRules.find((rule) => rule.pattern.startsWith(patternPrefix));
}

function validateMap(map: SurfaceDoctrineMap) {
  if (map.version !== 1) fail("surface-doctrine-map.json version must be 1.");
  for (const surface of ["user", "creator", "admin", "server", "shared-primitives", "cross-surface-contract"]) {
    const entry = map.surfaces[surface];
    if (!entry) fail(`surface-doctrine-map.json must define surface ${surface}.`);
    if (entry && !exists(entry.doctrine)) fail(`${surface} doctrine file does not exist: ${entry.doctrine}`);
  }
  if (!map.validators.includes("check:surface-doctrine-split")) {
    fail("surface-doctrine-map.json validators must include check:surface-doctrine-split.");
  }

  const requiredRoutes: Array<[string, PrimarySurface]> = [
    ["/", "user"],
    ["/drops", "user"],
    ["/dashboard", "user"],
    ["/settings", "user"],
    ["/support", "user"],
    ["/notifications", "user"],
    ["/library", "user"],
    ["/creators/[username]", "creator"],
    ["/admin", "admin"],
    ["/api", "server"],
  ];
  const routeMap = new Map<string, MajorRouteGroup>();
  for (const routeGroup of map.majorRouteGroups) {
    if (routeMap.has(routeGroup.route)) fail(`Duplicate major route group mapping: ${routeGroup.route}`);
    routeMap.set(routeGroup.route, routeGroup);
    if (Array.isArray(routeGroup.primarySurface)) fail(`${routeGroup.route} must map to exactly one primary surface.`);
  }
  for (const [route, expectedSurface] of requiredRoutes) {
    const routeGroup = routeMap.get(route);
    if (!routeGroup) {
      fail(`Major route group ${route} is missing from surface-doctrine-map.json.`);
      continue;
    }
    if (routeGroup.primarySurface !== expectedSurface) {
      fail(`Major route group ${route} must map to ${expectedSurface}, got ${routeGroup.primarySurface}.`);
    }
  }

  for (const rule of map.pathRules) {
    if (!rule.pattern || !rule.why || !rule.doctrine) fail(`Path rule ${rule.pattern || "<missing>"} must include pattern, why, and doctrine.`);
    if (rule.pattern.startsWith("src/app/admin") && rule.primarySurface !== "admin") {
      fail(`${rule.pattern} must use admin doctrine, not ${rule.primarySurface}.`);
    }
    if (rule.pattern.startsWith("src/app/api") && rule.primarySurface !== "server") {
      fail(`${rule.pattern} must use server doctrine, not ${rule.primarySurface}.`);
    }
    if (rule.pattern.startsWith("src/components/ui") && rule.primarySurface !== "shared-primitives") {
      fail(`${rule.pattern} must use shared-primitives doctrine, not ${rule.primarySurface}.`);
    }
    if (
      (rule.pattern.startsWith("src/app/drops") ||
        rule.pattern.startsWith("src/app/dashboard") ||
        rule.pattern.startsWith("src/app/experiences")) &&
      rule.primarySurface === "admin"
    ) {
      fail(`${rule.pattern} must not force admin density/debug layout onto user surfaces.`);
    }
  }

  for (const [prefix, expected] of [
    ["src/app/admin", "admin"],
    ["src/app/api", "server"],
    ["src/app/creators/[username]", "creator"],
    ["src/components/ui", "shared-primitives"],
  ] as const) {
    const rule = findRuleForPattern(map, prefix);
    if (!rule) fail(`Missing path rule for ${prefix}.`);
    if (rule && rule.primarySurface !== expected) fail(`${prefix} path rule must map to ${expected}.`);
  }

  const serverConflict = map.conflictRules.find((rule) => rule.winner === "server" && /Server truth beats all UI doctrine/u.test(rule.rule));
  if (!serverConflict) fail("Conflict rules must state that server truth beats all UI doctrine.");
}

for (const filePath of requiredDocs) {
  if (!exists(filePath)) fail(`Missing required file: ${filePath}`);
}

const map = parseJson<SurfaceDoctrineMap>("agent/context/surface-doctrine-map.json");
if (map) validateMap(map);

const hierarchy = read("docs/doctrine/03-surface-hierarchy.md");
for (const required of [
  "Product Constitution",
  "Shared Brand Primitives",
  "Surface Doctrine",
  "Feature Doctrine",
  "Validators",
  "Server truth beats all UI doctrine",
  "Admin UI doctrine beats User UI doctrine inside",
  "Creator UI doctrine beats User UI doctrine inside",
  "User UI doctrine beats Admin density rules",
  "Feature doctrine cannot contradict Server Truth",
]) {
  requireIncludes(hierarchy, required, "docs/doctrine/03-surface-hierarchy.md");
}

const userDoctrine = read("docs/doctrine/surfaces/user-ui-doctrine.md");
for (const required of [
  "conversion, clarity, reward-loop momentum",
  "mobile/PWA-first",
  "Do not use admin-style diagnostic density",
  "Errors become human action copy",
  "Tracking must be invisible, consent-aware",
]) {
  requireIncludes(userDoctrine, required, "user UI doctrine");
}

const creatorDoctrine = read("docs/doctrine/surfaces/creator-ui-doctrine.md");
for (const required of [
  "operational control",
  "earnings",
  "bookings",
  "less dense than Admin UI",
  "admin-only diagnostic language unless",
  "read-only when an admin views it",
]) {
  requireIncludes(creatorDoctrine, required, "creator UI doctrine");
}

const adminDoctrine = read("docs/doctrine/surfaces/admin-ui-doctrine.md");
for (const required of [
  "truth, speed, density, triage, evidence",
  "Truth badges are required",
  "Raw JSON is collapsed by default",
  "source, freshness, confidence",
  "Do not show fake healthy states",
]) {
  requireIncludes(adminDoctrine, required, "admin UI doctrine");
}

const serverDoctrine = read("docs/doctrine/surfaces/server-truth-doctrine.md");
for (const required of [
  "Server owns money, purchases, unlocks, entitlements",
  "Client UI can submit intent or display projection; it cannot define canonical truth",
  "auth, trusted origin, rate limit, cache mode, source truth",
  "actorUserId, actorCreatorId, actorAdminId, targetCreatorId, and targetUserId",
  "Server code must not import UI doctrine",
]) {
  requireIncludes(serverDoctrine, required, "server truth doctrine");
}

const sharedDoctrine = read("docs/doctrine/surfaces/shared-brand-primitives.md");
for (const required of [
  "brand purple",
  "official temporary logo mark",
  "glass depth",
  "at least 44px",
  "Shared UI components must stay free of wallet, creator, admin",
]) {
  requireIncludes(sharedDoctrine, required, "shared brand primitives doctrine");
}

const serverFiles = [
  ...listFiles("src/app/api"),
  ...listFiles("src/lib/server"),
  ...listFiles("functions/src"),
];
const uiDoctrineImportPattern = /kandydrops-ui-doctrine|user-ui-doctrine|creator-ui-doctrine|admin-ui-doctrine|shared-brand-primitives/iu;
for (const filePath of serverFiles) {
  const source = readFileSync(repoPath(filePath), "utf8");
  if (uiDoctrineImportPattern.test(source)) {
    fail(`Server truth path must not import UI doctrine: ${filePath}`);
  }
}

const uiFiles = [...listFiles("src/components"), ...listFiles("src/app")].filter((filePath) => !filePath.startsWith("src/app/api/"));
const serverTruthDefinedInUiPattern = /sourceTruth\s*:\s*["']server["']|const\s+\w*ServerTruth\s*=|function\s+\w*ServerTruth\s*\(/u;
for (const filePath of uiFiles) {
  const source = readFileSync(repoPath(filePath), "utf8");
  if (serverTruthDefinedInUiPattern.test(source)) {
    fail(`UI path must not define server truth directly: ${filePath}`);
  }
}

const sharedUiFiles = listFiles("src/components/ui");
const sharedBusinessPattern = /firebase-admin|@\/lib\/server|sourceTruth|entitlement|gumDrops?|wallet|creatorRevenue|moderation|supportTicket|adminProjection/iu;
for (const filePath of sharedUiFiles) {
  const source = readFileSync(repoPath(filePath), "utf8");
  if (sharedBusinessPattern.test(source)) {
    fail(`Shared UI primitive contains surface-specific business/server logic: ${filePath}`);
  }
}

const readme = read("README.md");
for (const expected of [
  "agent/context/surface-doctrine-map.json",
  "docs/doctrine/03-surface-hierarchy.md",
  "surface-specific doctrine",
]) {
  requireIncludes(readme, expected, "README.md");
}

const agents = read("AGENTS.md");
for (const expected of [
  "agent/context/surface-doctrine-map.json",
  "docs/doctrine/03-surface-hierarchy.md",
  "docs/doctrine/surfaces/user-ui-doctrine.md",
  "docs/doctrine/surfaces/creator-ui-doctrine.md",
  "docs/doctrine/surfaces/admin-ui-doctrine.md",
  "docs/doctrine/surfaces/server-truth-doctrine.md",
  "do not apply admin density to user surfaces",
]) {
  requireIncludes(agents, expected, "AGENTS.md");
}

const packageJson = read("package.json");
requireIncludes(
  packageJson,
  '"check:surface-doctrine-split": "tsx scripts/agent/validate-surface-doctrine-split.ts"',
  "package.json",
);

if (failures.length > 0) {
  console.error("Surface doctrine split validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Surface doctrine split validation passed.");
