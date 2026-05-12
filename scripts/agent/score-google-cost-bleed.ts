import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  API_COST_CONTRACTS,
  type ApiCostClass,
  type ApiCostContract,
  matchApiCostContract,
} from "../../src/lib/server/api-cost-contract";

type GoogleCostSeverity = "info" | "minor" | "moderate" | "major" | "critical";
type GoogleCostCategory =
  | "route_contract"
  | "trusted_origin"
  | "ai_paid"
  | "ga_quota"
  | "firestore"
  | "storage_egress"
  | "sql_dataconnect_agent_context_mirror"
  | "sql_forbidden"
  | "cloud_run_compute"
  | "rate_limit"
  | "cache_policy"
  | "debug_evidence";

type GoogleCostFinding = {
  id: string;
  severity: GoogleCostSeverity;
  category: GoogleCostCategory;
  title: string;
  filePath: string;
  line?: number;
  excerpt?: string;
  scoreImpact: number;
  costClass: ApiCostClass | "unknown";
  routePath?: string;
  suggestedFix: string;
  canAutofix: boolean;
  escalation: string;
  evidence: string[];
};

type RouteSummary = {
  filePath: string;
  routePath: string;
  methods: string[];
  contract: ApiCostContract | null;
  hasGuard: boolean;
  hasTrustedOrigin: boolean;
  hasRateGuard: boolean;
  authMode: "none" | "user" | "admin" | "unknown";
  cachePolicyEvidence: string[];
};

type SuspectedCostSurface = {
  filePath: string;
  line?: number;
  excerpt?: string;
  kind: string;
  costClass?: ApiCostClass;
  classification?: string;
  notes?: string;
};

type GoogleCostBleedReport = {
  score: number;
  status: "clean" | "pass" | "warning" | "beta-risk" | "fail";
  generatedAt: string;
  repoRoot: string;
  findings: GoogleCostFinding[];
  criticalCount: number;
  majorCount: number;
  routeContracts: ApiCostContract[];
  routes: RouteSummary[];
  suspectedCostSurfaces: SuspectedCostSurface[];
  requiredFixes: string[];
  safeAutofixSuggestions: string[];
  minimalVerificationCommands: string[];
  commandBudget: {
    allowedCommands: string[];
    forbiddenCommands: string[];
  };
  summary: string;
};

type SourceFile = {
  filePath: string;
  source: string;
};

const root = process.cwd();
const reportPath = "agent/state/google-cost-bleed.generated.json";

const severityImpact: Record<GoogleCostSeverity, number> = {
  info: 0,
  minor: -2,
  moderate: -5,
  major: -10,
  critical: -25,
};

const forbiddenDefaultCommands = [
  "playwright",
  "cypress",
  "lighthouse",
  "npm run check",
  "npm run check:ui:audits",
  "npm run check:ui:lighthouse",
  "broad UI audits",
];

const minimalVerificationCommands = [
  "npm run score:google-cost",
  "npm run check:google-cost",
];

const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const skipDirectories = new Set([
  ".git",
  ".next",
  "node_modules",
  "playwright-report",
  "test-results",
  "lighthouse-results",
  "coverage",
  "dist",
  "build",
  "out",
]);

function normalizePath(filePath: string) {
  return filePath.split(path.sep).join("/");
}

function repoPath(...segments: string[]) {
  return path.join(root, ...segments);
}

function readIfExists(relativePath: string) {
  const absolutePath = repoPath(relativePath);
  if (!existsSync(absolutePath)) return null;
  return readFileSync(absolutePath, "utf8");
}

function listFilesIfExists(startDir: string, extensions?: Set<string>) {
  return walkFiles(startDir, extensions);
}

function walkFiles(startDir: string, extensions = sourceExtensions) {
  const results: string[] = [];
  const absoluteStart = repoPath(startDir);
  if (!existsSync(absoluteStart)) return results;

  function visit(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!skipDirectories.has(entry.name)) {
          visit(path.join(directory, entry.name));
        }
        continue;
      }

      if (!entry.isFile() || !extensions.has(path.extname(entry.name))) continue;
      results.push(normalizePath(path.relative(root, path.join(directory, entry.name))));
    }
  }

  visit(absoluteStart);
  return results;
}

function lineOf(source: string, needle: string) {
  const index = source.indexOf(needle);
  if (index < 0) return undefined;
  return source.slice(0, index).split(/\r?\n/u).length;
}

function excerptOf(source: string, needle: string) {
  return source.split(/\r?\n/u).find((line) => line.includes(needle))?.trim();
}

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function addFinding(
  findings: GoogleCostFinding[],
  input: Omit<GoogleCostFinding, "id" | "scoreImpact" | "canAutofix"> & { canAutofix?: boolean },
) {
  findings.push({
    ...input,
    id: `google-cost-${stableHash(`${input.category}:${input.title}:${input.filePath}:${input.routePath ?? ""}:${input.line ?? ""}`)}`,
    scoreImpact: severityImpact[input.severity],
    canAutofix: input.canAutofix ?? false,
  });
}

function routePathFromFile(filePath: string) {
  return `/${filePath
    .replace(/^src\/app\/api/u, "api")
    .replace(/\/route\.tsx?$/u, "")
    .replace(/\/index$/u, "")}`;
}

function methodsFromSource(source: string) {
  const methods = new Set<string>();
  const regex = /export\s+(?:async\s+function|(?:const|let|var))\s+(GET|POST|PUT|PATCH|DELETE)\b/gu;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source)) !== null) {
    methods.add(match[1]);
  }
  return Array.from(methods).sort();
}

function inferAuthMode(source: string): RouteSummary["authMode"] {
  if (source.includes('auth: "admin"') || source.includes("auth: 'admin'") || source.includes("verifyAdmin(")) {
    return "admin";
  }
  if (source.includes('auth: "user"') || source.includes("auth: 'user'") || source.includes("verifyAuth(")) {
    return "user";
  }
  if (source.includes('auth: "none"') || source.includes("auth: 'none'")) {
    return "none";
  }
  return source.includes("guardApiRequest(") ? "none" : "unknown";
}

function routeCacheEvidence(source: string) {
  const evidence: string[] = [];
  for (const needle of [
    "force-no-store",
    "no-store",
    "revalidate = 0",
    "readThroughEphemeralRouteCache",
    "readThroughStaleWhileRevalidateEphemeralRouteCache",
    "Cache-Control",
    "ETag",
  ]) {
    if (source.includes(needle)) evidence.push(needle);
  }
  return evidence;
}

function buildRouteSummaries(): RouteSummary[] {
  return walkFiles("src/app/api", new Set([".ts", ".tsx"]))
    .filter((filePath) => filePath.endsWith("/route.ts") || filePath.endsWith("/route.tsx"))
    .sort()
    .map((filePath) => {
      const source = readIfExists(filePath) ?? "";
      const routePath = routePathFromFile(filePath);
      return {
        filePath,
        routePath,
        methods: methodsFromSource(source),
        contract: matchApiCostContract(routePath),
        hasGuard: source.includes("guardApiRequest("),
        hasTrustedOrigin: source.includes("requireTrustedOrigin: true"),
        hasRateGuard: source.includes("rateLimit:") || source.includes("preAuthRateLimit:") || source.includes("checkRateLimit("),
        authMode: inferAuthMode(source),
        cachePolicyEvidence: routeCacheEvidence(source),
      };
    });
}

function isMutatingMethod(method: string) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method);
}

function isPaymentOrAdmin(route: RouteSummary) {
  return route.routePath.startsWith("/api/admin/") || route.routePath.startsWith("/api/paypal/") || route.routePath.includes("/unlock");
}

function scanRouteContracts(findings: GoogleCostFinding[], routes: RouteSummary[]) {
  for (const route of routes) {
    const source = readIfExists(route.filePath) ?? "";
    if (!route.contract) {
      addFinding(findings, {
        severity: "major",
        category: "route_contract",
        title: "API route has no Google cost contract",
        filePath: route.filePath,
        routePath: route.routePath,
        costClass: "unknown",
        suggestedFix: "Declare an ApiCostContract with cost class, auth, trusted-origin, rate, cache, and budget expectations.",
        escalation: "Route cost ownership must be reviewed before the route is treated as public-beta safe.",
        evidence: [route.routePath],
      });
      continue;
    }

    const exportedMethods = route.methods.length > 0 ? route.methods : route.contract.methods;
    const mutating = exportedMethods.filter(isMutatingMethod);
    const methodMismatch = route.methods.length > 0 && !route.methods.every((method) => route.contract?.methods.includes(method));
    if (methodMismatch) {
      addFinding(findings, {
        severity: "moderate",
        category: "route_contract",
        title: "API route exports a method outside its cost contract",
        filePath: route.filePath,
        routePath: route.routePath,
        costClass: route.contract.costClass,
        suggestedFix: "Update the route cost contract or split the route so each method has an explicit budget/auth/cache policy.",
        escalation: "Method-level cost drift should be reviewed before changing route behavior.",
        evidence: [`methods=${route.methods.join(",")}`, `contract=${route.contract.methods.join(",")}`],
      });
    }

    if (mutating.length > 0 && !route.hasGuard) {
      addFinding(findings, {
        severity: isPaymentOrAdmin(route) ? "critical" : "major",
        category: "trusted_origin",
        title: "Mutating API route does not use guardApiRequest",
        filePath: route.filePath,
        routePath: route.routePath,
        costClass: route.contract.costClass,
        suggestedFix: "Wrap the route with guardApiRequest and declare auth, rate limit, and trusted-origin behavior.",
        escalation: "Mutation guard changes affect auth/security and must be implemented with targeted route tests.",
        evidence: mutating,
      });
    }

    if (mutating.length > 0 && route.contract.trustedOriginRequired && !route.hasTrustedOrigin) {
      addFinding(findings, {
        severity: isPaymentOrAdmin(route) ? "critical" : "major",
        category: "trusted_origin",
        title: "Mutating route is missing requireTrustedOrigin",
        filePath: route.filePath,
        routePath: route.routePath,
        costClass: route.contract.costClass,
        suggestedFix: "Add requireTrustedOrigin: true to guardApiRequest unless the route has an explicit non-browser exemption.",
        escalation: "Trusted-origin fixes affect auth/payment/admin boundaries and need targeted verification.",
        evidence: mutating,
      });
    }

    if (route.contract.budgetGuardRequired && !route.hasRateGuard && route.routePath !== "/api/health") {
      addFinding(findings, {
        severity: "major",
        category: "rate_limit",
        title: "Cost-bearing route lacks a visible rate/budget guard",
        filePath: route.filePath,
        routePath: route.routePath,
        costClass: route.contract.costClass,
        suggestedFix: "Add a route-specific rate limit or document a deterministic upstream budget guard in the ApiCostContract.",
        escalation: "Rate-limit changes can alter user flow behavior and require targeted route tests.",
        evidence: [route.contract.ratePolicy],
      });
    }

    if (route.contract.cachePolicy !== "no_store" && route.cachePolicyEvidence.length === 0) {
      addFinding(findings, {
        severity: "moderate",
        category: "cache_policy",
        title: "Route contract expects cache/SWR but source has no cache evidence",
        filePath: route.filePath,
        routePath: route.routePath,
        costClass: route.contract.costClass,
        suggestedFix: "Add explicit cache headers, ETag/SWR behavior, or update the contract to no_store if caching is unsafe.",
        escalation: "Cache policy affects freshness and cost; do not guess without owner review.",
        evidence: [route.contract.cachePolicy],
      });
    }

    const cheapPublicGet =
      route.methods.includes("GET") &&
      route.contract.authRequired === "none" &&
      ["free_read", "firestore_read"].includes(route.contract.costClass) &&
      route.hasRateGuard &&
      source.includes("guardApiRequest(") &&
      !source.includes('rateLimitStorage: "local"') &&
      !source.includes("rateLimitStorage: 'local'");
    if (cheapPublicGet) {
      addFinding(findings, {
        severity: "major",
        category: "rate_limit",
        title: "Public cheap GET likely pays Firestore writes for remote rate limiting",
        filePath: route.filePath,
        routePath: route.routePath,
        costClass: route.contract.costClass,
        suggestedFix: "Review whether this cheap public GET should use cache/edge-friendly throttling instead of Firestore-backed rate-limit writes.",
        escalation: "Rate-limit storage migration changes abuse controls and must be reviewed.",
        evidence: ["guardApiRequest", route.contract.ratePolicy],
      });
    }
  }
}

function readSourceFiles(filePaths: string[]): SourceFile[] {
  return filePaths
    .map((filePath) => {
      const source = readIfExists(filePath);
      return source ? { filePath, source } : null;
    })
    .filter((file): file is SourceFile => Boolean(file));
}

function collectSuspectedCostSurfaces(files: SourceFile[]) {
  const patterns = [
    { kind: "firebase-admin", needle: "firebase-admin" },
    { kind: "firestore-client", needle: "firebase/firestore" },
    { kind: "vertex-ai", needle: "@google-cloud/vertexai" },
    { kind: "google-auth", needle: "google-auth-library" },
    { kind: "ga-data-api", needle: "@google-analytics/data" },
    { kind: "admin-storage", needle: "adminStorage" },
    { kind: "data-connect", needle: "Data Connect" },
    { kind: "cloud-sql", needle: "Cloud SQL" },
    { kind: "postgres", needle: "postgres" },
    { kind: "prisma", needle: "PrismaClient" },
    { kind: "mysql", needle: "mysql" },
  ];

  const surfaces: SuspectedCostSurface[] = [];
  for (const file of files) {
    for (const pattern of patterns) {
      if (!file.source.includes(pattern.needle)) continue;
      surfaces.push({
        filePath: file.filePath,
        line: lineOf(file.source, pattern.needle),
        excerpt: excerptOf(file.source, pattern.needle),
        kind: pattern.kind,
      });
    }
  }
  return surfaces;
}

function collectAllowedDataConnectMirrorFiles() {
  const files = new Set<string>();
  if (existsSync(repoPath("dataconnect/dataconnect.yaml"))) {
    files.add("dataconnect/dataconnect.yaml");
  }
  for (const filePath of listFilesIfExists("dataconnect/schema", new Set([".gql"]))) {
    files.add(filePath);
  }
  for (const filePath of listFilesIfExists("dataconnect/example", new Set([".gql", ".yaml", ".yml"]))) {
    files.add(filePath);
  }
  if (existsSync(repoPath("scripts/agent/sync-sql.ts"))) {
    files.add("scripts/agent/sync-sql.ts");
  }
  for (const filePath of [
    "agent/state/sql-sync.payload.generated.json",
    "agent/state/sql-mirror-status.generated.json",
  ]) {
    if (existsSync(repoPath(filePath))) {
      files.add(filePath);
    }
  }
  return Array.from(files).sort();
}

function collectDataConnectMirrorSurfaces() {
  return collectAllowedDataConnectMirrorFiles().map((filePath) => ({
    filePath,
    kind: "sql_dataconnect_agent_context_mirror",
    costClass: "sql_dataconnect_agent_context_mirror" as const,
    classification: "sql_dataconnect_agent_context_mirror",
    notes: "Allowed only for agent/repo intelligence mirror use; forbidden for user/payment/drop/chat/support/creator runtime flows unless explicitly approved.",
  }));
}

function docsExplainDataConnectBillingState() {
  const docs = [
    readIfExists("docs/agent-truth/google-cost-bleed.md") ?? "",
    readIfExists("README.md") ?? "",
    readIfExists("REPO_MEMORY_LEDGER.md") ?? "",
    readIfExists("EVERY_FILE_FUNCTION_CHECKLIST.md") ?? "",
    readIfExists("AGENTS.md") ?? "",
  ].join("\n");
  return (
    docs.includes("kandydrops-db") &&
    docs.includes("kandydrops_db") &&
    /active|paused|deleted|billed|billing/iu.test(docs)
  );
}

function scanDataConnectMirror(findings: GoogleCostFinding[]) {
  const config = readIfExists("dataconnect/dataconnect.yaml");
  if (!config) return;

  const expectedConfig = [
    'location: "us-central1"',
    'database: "kandydrops_db"',
    'instanceId: "kandydrops-db"',
  ];
  for (const expected of expectedConfig) {
    if (!config.includes(expected)) {
      addFinding(findings, {
        severity: "major",
        category: "sql_dataconnect_agent_context_mirror",
        title: "Data Connect agent mirror config drifted from declared Cloud SQL target",
        filePath: "dataconnect/dataconnect.yaml",
        line: lineOf(config, expected.split(":")[0]),
        excerpt: excerptOf(config, expected.split(":")[0]),
        costClass: "sql_dataconnect_agent_context_mirror",
        suggestedFix: "Update the agent mirror classification and billing doctrine before changing the Data Connect service, database, region, or Cloud SQL instance.",
        escalation: "Cloud SQL target changes are cost-bearing Firebase architecture and need owner approval.",
        evidence: [expected],
      });
    }
  }

  if (!docsExplainDataConnectBillingState()) {
    addFinding(findings, {
      severity: "moderate",
      category: "sql_dataconnect_agent_context_mirror",
      title: "Data Connect config exists without documented Cloud SQL billing state",
      filePath: "dataconnect/dataconnect.yaml",
      costClass: "sql_dataconnect_agent_context_mirror",
      suggestedFix: "Document whether Cloud SQL instance kandydrops-db is active, paused, deleted, or otherwise billed before treating the mirror as cost-safe.",
      escalation: "Provider-side billing state cannot be proven from source alone; an owner must confirm it.",
      evidence: ["kandydrops-db", "kandydrops_db", "us-central1"],
    });
  }
}

function scanAiSurfaces(findings: GoogleCostFinding[], routes: RouteSummary[], files: SourceFile[]) {
  const aiRoutes = routes.filter((route) => route.routePath.startsWith("/api/admin/ai/") || route.routePath.startsWith("/api/admin/debug/assistant"));
  const aiHelperFiles = files.filter((file) =>
    file.filePath.includes("ai-drop-") ||
    file.filePath.includes("ai-debug-assistant") ||
    file.source.includes("generateContent") ||
    file.source.includes("google-auth-library") ||
    file.source.includes("@google-cloud/vertexai")
  );
  const combinedAiSource = aiHelperFiles.map((file) => file.source).join("\n");

  for (const route of aiRoutes) {
    if (route.authMode !== "admin") {
      addFinding(findings, {
        severity: "critical",
        category: "ai_paid",
        title: "AI paid route is not admin-only",
        filePath: route.filePath,
        routePath: route.routePath,
        costClass: "ai_paid",
        suggestedFix: "Fence AI paid routes behind guardApiRequest auth: \"admin\" unless leadership explicitly approves another audience.",
        escalation: "Public/user-accessible paid AI routes are cost-critical and must be halted for owner review.",
        evidence: [route.authMode],
      });
    }
    if (!route.hasRateGuard) {
      addFinding(findings, {
        severity: "critical",
        category: "ai_paid",
        title: "AI paid route lacks a visible budget/rate guard",
        filePath: route.filePath,
        routePath: route.routePath,
        costClass: "ai_paid",
        suggestedFix: "Use ADMIN_AI_* adaptive rate limits plus route-level budget telemetry before making paid calls.",
        escalation: "Paid AI spend controls need targeted route tests and owner approval.",
        evidence: ["missing rate guard"],
      });
    }
  }

  const packageJson = readIfExists("package.json") ?? "";
  if (packageJson.includes("@google-cloud/vertexai") && !combinedAiSource.includes("@google-cloud/vertexai")) {
    addFinding(findings, {
      severity: "info",
      category: "ai_paid",
      title: "Vertex AI dependency is present but paid calls use REST/GoogleAuth wrappers",
      filePath: "package.json",
      costClass: "ai_paid",
      suggestedFix: "Keep the dependency fenced by route contracts even if unused directly, or remove it after dependency review.",
      escalation: "Dependency removal is outside this source-only audit.",
      evidence: ["@google-cloud/vertexai"],
    });
  }

  if (!combinedAiSource.includes("settings.enabled")) {
    addFinding(findings, {
      severity: "critical",
      category: "ai_paid",
      title: "AI helpers lack a visible feature kill switch",
      filePath: aiHelperFiles[0]?.filePath ?? "src/lib/server",
      costClass: "ai_paid",
      suggestedFix: "Require an enabled/settings flag before any paid AI call.",
      escalation: "Paid AI kill-switch behavior must be verified before enabling generation.",
      evidence: ["settings.enabled"],
    });
  }
  if (!/isAdminAi.*SelectableModel|normalizeAdminAi.*Model/u.test(combinedAiSource)) {
    addFinding(findings, {
      severity: "major",
      category: "ai_paid",
      title: "AI helpers lack visible model allowlist/normalization",
      filePath: aiHelperFiles[0]?.filePath ?? "src/lib/server",
      costClass: "ai_paid",
      suggestedFix: "Use a deterministic model allowlist or normalizer before paid AI calls.",
      escalation: "Model policy changes affect cost and output quality; review with admin AI owner.",
      evidence: ["model allowlist"],
    });
  }
  if (!/maxOutputTokens|max[A-Za-z0-9_]*Inputs|slice\(0,\s*\d+|limit\(\d+\)/u.test(combinedAiSource)) {
    addFinding(findings, {
      severity: "major",
      category: "ai_paid",
      title: "AI helpers lack visible input/output bounds",
      filePath: aiHelperFiles[0]?.filePath ?? "src/lib/server",
      costClass: "ai_paid",
      suggestedFix: "Bound prompt, reference, and output token/media sizes before paid AI calls.",
      escalation: "Token/media bounding changes need targeted admin AI tests.",
      evidence: ["maxOutputTokens or deterministic input limit"],
    });
  }
  if (!/countTokens|estimateAdminAi.*CostUsd|estimatedCostUsd/u.test(combinedAiSource)) {
    addFinding(findings, {
      severity: "major",
      category: "ai_paid",
      title: "AI helpers lack token count or deterministic cost estimate",
      filePath: aiHelperFiles[0]?.filePath ?? "src/lib/server",
      costClass: "ai_paid",
      suggestedFix: "Call countTokens or compute deterministic estimates before paid AI calls and record budget telemetry.",
      escalation: "Budget telemetry semantics must be reviewed with admin AI owner.",
      evidence: ["countTokens or estimateAdminAi*CostUsd"],
    });
  }
}

function scanGaSurfaces(findings: GoogleCostFinding[], routes: RouteSummary[], files: SourceFile[]) {
  const gaFiles = files.filter((file) => file.source.includes("@google-analytics/data") || file.source.includes("BetaAnalyticsDataClient"));
  const gaSource = gaFiles.map((file) => file.source).join("\n");
  const gaRoutes = routes.filter((route) => route.routePath.startsWith("/api/admin/analytics"));

  if (gaFiles.length > 0 && !gaSource.includes("returnPropertyQuota")) {
    addFinding(findings, {
      severity: "moderate",
      category: "ga_quota",
      title: "GA Data API requests do not request returnPropertyQuota",
      filePath: gaFiles[0].filePath,
      line: lineOf(gaFiles[0].source, "BetaAnalyticsDataClient"),
      excerpt: excerptOf(gaFiles[0].source, "BetaAnalyticsDataClient"),
      costClass: "ga_quota",
      suggestedFix: "Add returnPropertyQuota where supported and store quota status in admin telemetry/debug evidence.",
      escalation: "GA quota request shape changes must be verified against analytics route tests.",
      evidence: ["returnPropertyQuota"],
    });
  }

  for (const route of gaRoutes) {
    const source = readIfExists(route.filePath) ?? "";
    const directAnalyticsClient = source.includes("createAdminAnalyticsDataClient") || source.includes("BetaAnalyticsDataClient");
    const hasHotCache =
      source.includes("readThroughEphemeralRouteCache") ||
      source.includes("readThroughStaleWhileRevalidateEphemeralRouteCache") ||
      source.includes("snapshot") ||
      source.includes("hot-cache");
    if (directAnalyticsClient && !hasHotCache) {
      addFinding(findings, {
        severity: "major",
        category: "ga_quota",
        title: "GA Data API route appears to call analytics at render time without hot cache",
        filePath: route.filePath,
        routePath: route.routePath,
        costClass: "ga_quota",
        suggestedFix: "Route GA reads through snapshot/hot-cache layers and only revalidate under bounded admin refresh controls.",
        escalation: "Analytics freshness/cost tradeoffs require admin analytics owner review.",
        evidence: ["createAdminAnalyticsDataClient"],
      });
    }
  }

  if (gaFiles.length > 0 && !/recordAnalyticsRuntimeWarning|quota|runtime_warning|debug evidence/iu.test(gaSource)) {
    addFinding(findings, {
      severity: "moderate",
      category: "ga_quota",
      title: "GA quota/runtime status is not visibly logged",
      filePath: gaFiles[0].filePath,
      costClass: "ga_quota",
      suggestedFix: "Store GA quota/runtime degradation in admin telemetry or debug evidence.",
      escalation: "Admin analytics warning semantics should be reviewed before adding new events.",
      evidence: ["quota status logging"],
    });
  }
}

function scanFirestoreRisks(findings: GoogleCostFinding[], routes: RouteSummary[], files: SourceFile[]) {
  const relevantFiles = files.filter((file) =>
    file.filePath.startsWith("src/app/api/") ||
    file.filePath.startsWith("src/lib/server/")
  );

  for (const file of relevantFiles) {
    const getMatches = [...file.source.matchAll(/adminDb\.collection\(["'`][^"'`]+["'`]\)([\s\S]{0,240}?)\.get\(/gu)];
    for (const match of getMatches) {
      const chain = match[0];
      if (chain.includes(".limit(") || chain.includes(".doc(") || chain.includes(".count()") || chain.includes(".aggregate(")) continue;
      if (/\b\w+(?:Map|Lookup)\.get\($/u.test(chain)) continue;
      const route = routes.find((candidate) => candidate.filePath === file.filePath);
      addFinding(findings, {
        severity: "major",
        category: "firestore",
        title: "Firestore collection get appears unbounded",
        filePath: file.filePath,
        line: lineOf(file.source, match[0]),
        excerpt: chain.replace(/\s+/gu, " ").trim(),
        routePath: route?.routePath,
        costClass: route?.contract?.costClass ?? "firestore_read",
        suggestedFix: "Add limit/pagination or route through a materialized snapshot/hot-cache layer.",
        escalation: "Firestore query shape changes can affect data correctness and require targeted route tests.",
        evidence: [chain.replace(/\s+/gu, " ").trim()],
      });
    }

    const deleteLoops = [...file.source.matchAll(/batch\.delete\(|\.delete\(\)/gu)]
      .filter((match) => !file.source.slice(Math.max(0, (match.index ?? 0) - "FieldValue".length), match.index).endsWith("FieldValue"));
    const hasDeleteFanout = /batch\.delete\(|forEach\([\s\S]{0,240}\.delete\(\)|\.map\([\s\S]{0,240}\.delete\(\)|for\s*\([^)]*\)[\s\S]{0,240}\.delete\(\)/u.test(file.source);
    if (deleteLoops.length > 0 && (hasDeleteFanout || deleteLoops.length > 1) && !/\.limit\(\s*\d+\s*\)|MAX_|BATCH|limit\s*=/u.test(file.source)) {
      const first = deleteLoops[0][0];
      addFinding(findings, {
        severity: "major",
        category: "firestore",
        title: "Delete/cleanup loop lacks a visible bounded batch limit",
        filePath: file.filePath,
        line: lineOf(file.source, first),
        excerpt: excerptOf(file.source, first),
        costClass: "firestore_write",
        suggestedFix: "Add a deterministic batch limit and route cost contract before running cleanup deletes.",
        escalation: "Cleanup write loops can create cost spikes and must be reviewed.",
        evidence: [first],
      });
    }
  }

  for (const file of files) {
    if (!file.source.includes("onSnapshot(")) continue;
    const hasCollectionQueryListener = /onSnapshot\(\s*query\(/u.test(file.source);
    if (!hasCollectionQueryListener) continue;
    const hasLimit = /query\([\s\S]{0,260}limit\(/u.test(file.source);
    const isAdminOrDebug = file.filePath.includes("/admin/") || file.filePath.toLowerCase().includes("admin") || file.filePath.includes("/debug/");
    if (!hasLimit && !isAdminOrDebug && file.filePath !== "src/hooks/useDrops.ts") {
      addFinding(findings, {
        severity: "major",
        category: "firestore",
        title: "Non-admin Firestore listener lacks visible query limit",
        filePath: file.filePath,
        line: lineOf(file.source, "onSnapshot("),
        excerpt: excerptOf(file.source, "onSnapshot("),
        costClass: "firestore_listener",
        suggestedFix: "Add a bounded query limit or document why the listener is a single-doc runtime invalidation exception.",
        escalation: "Realtime listener scope changes require runtime/freshness review.",
        evidence: ["onSnapshot("],
      });
    }
  }
}

function scanStorageRisks(findings: GoogleCostFinding[], routes: RouteSummary[], files: SourceFile[]) {
  for (const route of routes) {
    const source = readIfExists(route.filePath) ?? "";
    const touchesStorage = source.includes("adminStorage") || source.includes("getSignedUrl") || source.includes("bucket(");
    const fetchesRemoteMedia = route.routePath.includes("/content") || source.includes("isAllowedRemoteMediaUrl") || source.includes("Content-Length");
    if (!touchesStorage && !fetchesRemoteMedia) continue;

    const adminContentEvidenceSource = route.routePath === "/api/admin/content"
      ? `${source}\n${readIfExists("src/lib/server/admin-content-storage-safety.ts") ?? ""}`
      : source;
    const hasMediaLimit =
      source.includes("MEDIA_PROXY") ||
      route.contract?.ratePolicy.includes("MEDIA_PROXY") ||
      (
        /MAX_[A-Z0-9_]*BYTES/u.test(source) &&
        /rateLimit:\s*(?:STRICT|ADMIN_STORAGE_UPLOAD|MEDIA_PROXY)/u.test(source)
      ) ||
      (
        adminContentEvidenceSource.includes("google-cost-guard: admin content storage access is protected by MEDIA_PROXY") &&
        adminContentEvidenceSource.includes("storageEgressGuarded: true") &&
        adminContentEvidenceSource.includes("rawStorageUrlExposed: false")
      );
    const hasAdminContentStorageEvidence =
      route.routePath === "/api/admin/content" &&
      route.authMode === "admin" &&
      adminContentEvidenceSource.includes("adminContentRoute: true") &&
      adminContentEvidenceSource.includes("adminOnly: true") &&
      adminContentEvidenceSource.includes("entitlement-guard: admin content route uses admin authorization as entitlement proof") &&
      adminContentEvidenceSource.includes("locked-content-guard: default response does not expose locked media bytes") &&
      adminContentEvidenceSource.includes("ownership-entitlement-scope: user media access remains ownership/unlocked-content gated outside this admin route") &&
      adminContentEvidenceSource.includes("entitlementGuarded: true") &&
      adminContentEvidenceSource.includes("entitlementGuardType: \"admin_content_review\"") &&
      adminContentEvidenceSource.includes("unlockedContentRoute: false") &&
      adminContentEvidenceSource.includes("ownershipEntitlementRequiredForUserRoutes: true") &&
      adminContentEvidenceSource.includes("rawLockedMediaExposed: false") &&
      adminContentEvidenceSource.includes("storageEgressGuarded: true") &&
      adminContentEvidenceSource.includes("safeUrlHandling: true") &&
      adminContentEvidenceSource.includes("rawStorageUrlExposed: false") &&
      adminContentEvidenceSource.includes("defaultMediaResponse:");
    const hasEntitlement = hasAdminContentStorageEvidence || /unlockedContent|ownsDrop|entitlement|creatorId === caller\.uid|auth: "user"/u.test(source);
    if (route.authMode === "none" && route.contract?.authRequired !== "admin") {
      addFinding(findings, {
        severity: "critical",
        category: "storage_egress",
        title: "Public storage/media route may expose unbounded egress",
        filePath: route.filePath,
        routePath: route.routePath,
        costClass: "storage_egress",
        suggestedFix: "Require auth/entitlement plus MEDIA_PROXY rate limiting before proxying Storage/media bytes.",
        escalation: "Storage egress controls affect locked content and billing; halt for owner review.",
        evidence: ["storage/media route", route.authMode],
      });
    }
    if (!hasMediaLimit) {
      addFinding(findings, {
        severity: "critical",
        category: "storage_egress",
        title: "Storage/media route lacks MEDIA_PROXY or equivalent byte/rate guard",
        filePath: route.filePath,
        routePath: route.routePath,
        costClass: "storage_egress",
        suggestedFix: "Apply MEDIA_PROXY or a route-specific byte/rate guard before Storage/media egress.",
        escalation: "Unbounded media routes can create immediate billing spikes.",
        evidence: ["MEDIA_PROXY"],
      });
    }
    if (route.routePath.includes("/content") && !hasEntitlement) {
      addFinding(findings, {
        severity: "critical",
        category: "storage_egress",
        title: "Unlocked media/content route lacks visible entitlement check",
        filePath: route.filePath,
        routePath: route.routePath,
        costClass: "storage_egress",
        suggestedFix: "Verify ownership/unlock entitlement before fetching or proxying internal media.",
        escalation: "Locked media entitlement regressions are release blockers.",
        evidence: ["unlockedContent or ownership entitlement"],
      });
    }
  }
}

function scanSqlRuntime(findings: GoogleCostFinding[], files: SourceFile[], routes: RouteSummary[]) {
  const runtimeSqlPatterns = [
    { label: "@prisma/client", pattern: /from\s+["']@prisma\/client["']|require\(["']@prisma\/client["']\)/u },
    { label: "PrismaClient", pattern: /new\s+PrismaClient\s*\(/u },
    { label: "@firebase/data-connect", pattern: /from\s+["']@firebase\/data-connect["']|require\(["']@firebase\/data-connect["']\)/u },
    { label: "@firebasegen/", pattern: /from\s+["']@firebasegen\//u },
    { label: "dataconnect-generated import", pattern: /from\s+["'][^"']*(?:dataconnect-generated|dataconnect-admin-generated)/u },
    { label: "process.env.POSTGRES", pattern: /process\.env\.POSTGRES/u },
    { label: "process.env.CLOUD_SQL", pattern: /process\.env\.CLOUD_SQL/u },
    { label: "process.env.DATA_CONNECT", pattern: /process\.env\.DATA_CONNECT/u },
    { label: "pg client import", pattern: /from\s+["']pg["']|require\(["']pg["']\)/u },
    { label: "mysql client import", pattern: /from\s+["']mysql[^"']*["']|require\(["']mysql[^"']*["']\)/u },
    { label: "createPool(", pattern: /\bcreatePool\s*\(/u },
  ];

  for (const file of files) {
    const route = routes.find((candidate) => candidate.filePath === file.filePath);
    const routeHasSqlContract = route?.contract?.costClass === "sql_dataconnect_agent_context_mirror";
    const isAllowedMirror =
      file.filePath.startsWith("dataconnect/") ||
      file.filePath === "src/lib/server/api-cost-contract.ts" ||
      file.filePath === "scripts/agent/score-google-cost-bleed.ts" ||
      file.filePath === "scripts/agent/sync-sql.ts" ||
      file.filePath === "agent/state/sql-sync.payload.generated.json" ||
      file.filePath === "agent/state/sql-mirror-status.generated.json" ||
      routeHasSqlContract;
    if (isAllowedMirror) continue;
    const matched = runtimeSqlPatterns.find((candidate) => candidate.pattern.test(file.source));
    if (!matched) continue;
    const matchText = file.source.match(matched.pattern)?.[0] ?? matched.label;
    addFinding(findings, {
      severity: "critical",
      category: "sql_forbidden",
      title: "Runtime SQL/Data Connect usage is present without an approved cost contract",
      filePath: file.filePath,
      line: lineOf(file.source, matchText),
      excerpt: excerptOf(file.source, matchText),
      costClass: "sql_forbidden",
      routePath: route?.routePath,
      suggestedFix: "Remove runtime SQL/Data Connect usage or create an explicit owner-approved SQL/Data Connect route contract before use.",
      escalation: "SQL/Data Connect is allowed only for the agent-context mirror by default because Cloud SQL adds a cost-bearing plane.",
      evidence: [matched.label],
    });
  }
}

function scanCloudRun(findings: GoogleCostFinding[], routes: RouteSummary[]) {
  const appHosting = readIfExists("apphosting.yaml") ?? "";
  if (!/maxInstances:\s*\d+/u.test(appHosting)) {
    addFinding(findings, {
      severity: "moderate",
      category: "cloud_run_compute",
      title: "App Hosting config lacks maxInstances",
      filePath: "apphosting.yaml",
      costClass: "cloud_run_compute",
      suggestedFix: "Set maxInstances in deploy config to cap runaway Cloud Run/App Hosting compute.",
      escalation: "Deploy config changes require environment owner review.",
      evidence: ["maxInstances"],
    });
  }

  for (const route of routes) {
    if (!route.routePath.startsWith("/api/cron/")) continue;
    if (!route.hasRateGuard) {
      addFinding(findings, {
        severity: "major",
        category: "cloud_run_compute",
        title: "Cron route lacks visible max-frequency/rate guard",
        filePath: route.filePath,
        routePath: route.routePath,
        costClass: "cloud_run_compute",
        suggestedFix: "Use CRON rate limits or deterministic scheduler secret/frequency gates.",
        escalation: "Cron frequency changes affect background jobs and cost.",
        evidence: ["CRON"],
      });
    }
  }
}

function buildReport(): GoogleCostBleedReport {
  const findings: GoogleCostFinding[] = [];
  const routes = buildRouteSummaries();
  const sourceFiles = readSourceFiles([...walkFiles("src"), ...walkFiles("functions/src"), ...walkFiles("scripts")]);
  const suspectedCostSurfaces = [
    ...collectSuspectedCostSurfaces(sourceFiles),
    ...collectDataConnectMirrorSurfaces(),
  ];

  scanRouteContracts(findings, routes);
  scanAiSurfaces(findings, routes, sourceFiles);
  scanGaSurfaces(findings, routes, sourceFiles);
  scanFirestoreRisks(findings, routes, sourceFiles);
  scanStorageRisks(findings, routes, sourceFiles);
  scanDataConnectMirror(findings);
  scanSqlRuntime(findings, sourceFiles, routes);
  scanCloudRun(findings, routes);

  const criticalCount = findings.filter((finding) => finding.severity === "critical").length;
  const majorCount = findings.filter((finding) => finding.severity === "major").length;
  const score = Math.max(0, Math.min(100, 100 + findings.reduce((sum, finding) => sum + finding.scoreImpact, 0)));
  const status = criticalCount > 0
    ? "fail"
    : score >= 95
      ? "clean"
      : score >= 90
        ? "pass"
        : score >= 80
          ? "warning"
          : score >= 70
            ? "beta-risk"
            : "fail";

  return {
    score,
    status,
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    findings,
    criticalCount,
    majorCount,
    routeContracts: [...API_COST_CONTRACTS],
    routes,
    suspectedCostSurfaces,
    requiredFixes: Array.from(new Set(findings.filter((finding) => finding.severity !== "info").map((finding) => finding.suggestedFix))),
    safeAutofixSuggestions: [],
    minimalVerificationCommands,
    commandBudget: {
      allowedCommands: minimalVerificationCommands,
      forbiddenCommands: forbiddenDefaultCommands,
    },
    summary: findings.length === 0
      ? "No deterministic Google API cost-bleed findings were detected."
      : `Detected ${findings.length} Google API cost/rate-limit finding(s); no business logic was auto-fixed.`,
  };
}

function writeReport(report: GoogleCostBleedReport) {
  const fullPath = repoPath(reportPath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function printSummary(report: GoogleCostBleedReport) {
  console.log(`Google cost score: ${report.score}/100 (${report.status})`);
  console.log(`Routes classified: ${report.routes.length}; contracts: ${report.routeContracts.length}`);
  console.log(`Findings: ${report.findings.length} total, ${report.criticalCount} critical, ${report.majorCount} major`);
  for (const finding of report.findings.slice(0, 8)) {
    const location = finding.line ? `${finding.filePath}:${finding.line}` : finding.filePath;
    console.log(`- [${finding.severity}] ${finding.title} (${location})`);
  }
  console.log(`Minimal verification: ${report.minimalVerificationCommands.join(", ")}`);
  console.log(`Forbidden by default: ${report.commandBudget.forbiddenCommands.join(", ")}`);
}

const report = buildReport();
writeReport(report);
printSummary(report);
