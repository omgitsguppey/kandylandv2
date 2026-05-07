import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  ROUTE_CACHE_MODES,
  SPEED_SECURITY_REPORT_PATH,
  matchRouteCacheContract,
  type RouteCacheMode,
  type RouteCacheContract,
} from "../../src/lib/server/route-cache-contract";
import {
  APP_CHECK_READINESS_CONTRACT,
  matchSecurityRouteContract,
  type AppCheckReadinessContract,
  type SecurityRouteContract,
} from "../../src/lib/server/security-hardening-contract";

type SpeedSecuritySeverity = "info" | "minor" | "moderate" | "major" | "critical";
type SpeedSecurityStatus = "clean" | "pass" | "warning" | "beta-risk" | "fail";
type SpeedSecurityDomain =
  | "speedCachingHydration"
  | "apiRouteSecurityExploitHardening"
  | "firebaseRulesAppCheckReadiness"
  | "contentPaymentEconomyProtection"
  | "costRunawayWorkControls"
  | "docsDebugEvidenceCompleteness";

type SpeedSecurityFinding = {
  id: string;
  domain: SpeedSecurityDomain;
  severity: SpeedSecuritySeverity;
  filePath: string;
  line?: number;
  title: string;
  evidence: string[];
  expectedRule: string;
  actualPattern: string;
  canAutofix: boolean;
  autofixConfidence: number;
  suggestedFix: string;
  humanReadableEscalation: string;
};

type SpeedSecurityFindingInput = Omit<SpeedSecurityFinding, "id"> & { id?: string };

type RouteCacheClassification = {
  totals: Record<RouteCacheMode | "unknown", number>;
  routes: Array<{
    routePath: string;
    filePath: string;
    methods: string[];
    contractPattern: string | null;
    cacheMode: RouteCacheMode | "unknown";
    surface: RouteCacheContract["surface"] | "unknown";
    userSpecific: boolean;
    sensitive: boolean;
    sourceNoStoreEvidence: boolean;
    sourceForceDynamicEvidence: boolean;
  }>;
};

type RouteSecurityClassification = {
  totals: {
    routes: number;
    mutations: number;
    trustedOriginRequired: number;
    trustedOriginPresent: number;
    guardPresent: number;
    rateLimitEvidence: number;
    idempotencyRequired: number;
    idempotencyEvidence: number;
    bodyLimitRequired: number;
    bodyLimitEvidence: number;
  };
  routes: Array<{
    routePath: string;
    filePath: string;
    methods: string[];
    contractPattern: string | null;
    authRequired: SecurityRouteContract["authRequired"] | "unknown";
    rateLimitPolicy: SecurityRouteContract["rateLimitPolicy"] | "unknown";
    costRisk: SecurityRouteContract["costRisk"] | "unknown";
    csrfRisk: SecurityRouteContract["csrfRisk"] | "unknown";
    mutation: boolean;
    sensitiveWrites: boolean;
    trustedOriginRequired: boolean;
    trustedOriginPresent: boolean;
    trustedOriginChecked: boolean;
    guardPresent: boolean;
    rateLimitPresent: boolean;
    idempotencyRequired: boolean;
    idempotencyPresent: boolean;
    bodyLimitRequired: boolean;
    bodyLimitPresent: boolean;
    expectedFailureCodes: string[];
  }>;
};

type SpeedSecurityReport = {
  generatedAt: string;
  overallScore: number;
  overallStatus: SpeedSecurityStatus;
  domainScores: Record<SpeedSecurityDomain, { weight: number; score: number; status: SpeedSecurityStatus; findingCount: number; criticalCount: number; majorCount: number }>;
  routeCacheClassification: RouteCacheClassification;
  routeSecurityClassification: RouteSecurityClassification;
  firebaseRulesFindings: SpeedSecurityFinding[];
  appCheckReadiness: AppCheckReadinessContract & { status: "missing" | "off" | "monitor" | "enforce"; findings: string[] };
  exploitRisks: SpeedSecurityFinding[];
  speedRisks: SpeedSecurityFinding[];
  costRisks: SpeedSecurityFinding[];
  criticalFindings: SpeedSecurityFinding[];
  findings: SpeedSecurityFinding[];
  recommendedFixOrder: string[];
  safeAutofixesAvailable: number;
  safeAutofixesApplied: number;
  minimalVerificationCommands: string[];
  forbiddenCommands: string[];
  summary: string;
};

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const SKIP_DIRECTORIES = new Set([".git", ".next", "node_modules", "out", "playwright-report", "test-results", "lighthouse-results"]);
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const DOMAINS: SpeedSecurityDomain[] = [
  "speedCachingHydration",
  "apiRouteSecurityExploitHardening",
  "firebaseRulesAppCheckReadiness",
  "contentPaymentEconomyProtection",
  "costRunawayWorkControls",
  "docsDebugEvidenceCompleteness",
];

const DOMAIN_WEIGHTS: Record<SpeedSecurityDomain, number> = {
  speedCachingHydration: 25,
  apiRouteSecurityExploitHardening: 25,
  firebaseRulesAppCheckReadiness: 20,
  contentPaymentEconomyProtection: 15,
  costRunawayWorkControls: 10,
  docsDebugEvidenceCompleteness: 5,
};

const SEVERITY_PENALTIES: Record<SpeedSecuritySeverity, number> = {
  info: 0,
  minor: 2,
  moderate: 5,
  major: 10,
  critical: 25,
};

const SEVERITY_RANK: Record<SpeedSecuritySeverity, number> = {
  info: 0,
  minor: 1,
  moderate: 2,
  major: 3,
  critical: 4,
};

export const SPEED_SECURITY_DOCTRINE_NOTE =
  "KandyDrops speed and security hardening is deterministic. Public/stable surfaces should cache intentionally. User/payment/support/chat/security surfaces stay no-store where needed. Every API route must declare auth, trusted origin, rate limit, idempotency, cost risk, cache mode, and expected failure codes. Firebase rules remain default deny with explicit owner/admin access. App Check is staged from monitor to enforcement. Heavy browser audits are forbidden by default.";

export const SPEED_SECURITY_ALLOWED_COMMANDS = [
  "npm run score:speed-security",
  "npm run check:speed-security",
  "npm run repair:speed-security",
  "npm run repair:speed-security -- --apply",
  "targeted rules tests only if rules changed",
  "targeted route tests only if route guard changed",
  "npm run typecheck only if TypeScript changed",
] as const;

export const SPEED_SECURITY_FORBIDDEN_COMMANDS = [
  "npm run check",
  "npm run check:ui:audits",
  "npm run check:ui:continuity",
  "npm run check:ui:omni",
  "npm run check:ui:lighthouse",
  "playwright",
  "cypress",
  "lighthouse",
  "firebase deploy",
  "gcloud",
] as const;

const SHELL_SPEED_FILES = [
  "src/app/layout.tsx",
  "src/components/CoreLayoutWrapper.tsx",
  "src/app/page.tsx",
  "src/app/HomeClient.tsx",
  "src/components/Hero.tsx",
  "src/components/Analytics/DeepTracker.tsx",
  "src/components/ClientDiagnosticsBridge.tsx",
  "src/components/PwaRuntimeBridge.tsx",
  "src/components/Feedback/GlobalBugReportTrigger.tsx",
  "src/components/Chat/ChatExperience.tsx",
  "src/components/PurchaseModal.tsx",
  "src/app/drops/DropsClient.tsx",
  "src/components/Drops/LockedDropPreviewView.tsx",
];

function normalizePath(filePath: string) {
  return filePath.replace(/\\/g, "/").replace(/^\.\//u, "");
}

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function readIfExists(root: string, filePath: string) {
  const normalized = normalizePath(filePath);
  const fullPath = join(root, normalized);
  if (!existsSync(fullPath)) return null;
  return readFileSync(fullPath, "utf8");
}

function readRequired(root: string, filePath: string) {
  return readFileSync(join(root, normalizePath(filePath)), "utf8");
}

function walkFiles(root: string, startPath: string): string[] {
  const fullStartPath = join(root, startPath);
  if (!existsSync(fullStartPath)) return [];
  const output: string[] = [];
  for (const entry of readdirSync(fullStartPath)) {
    if (SKIP_DIRECTORIES.has(entry)) continue;
    const fullPath = join(fullStartPath, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      output.push(...walkFiles(root, join(startPath, entry)));
    } else if (SOURCE_EXTENSIONS.has(extname(entry))) {
      output.push(normalizePath(join(startPath, entry)));
    }
  }
  return output;
}

function lineOf(source: string, needle: string) {
  const index = source.indexOf(needle);
  if (index < 0) return undefined;
  return source.slice(0, index).split(/\r?\n/u).length;
}

function lineOfIndex(source: string, index: number) {
  return source.slice(0, index).split(/\r?\n/u).length;
}

function routePathFromFile(filePath: string) {
  return `/${normalizePath(filePath)
    .replace(/^src\/app\//u, "")
    .replace(/\/route\.(?:ts|tsx|js|jsx)$/u, "")
    .replace(/\/index$/u, "")}`;
}

function detectRouteMethods(source: string) {
  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
  return methods.filter((method) => new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b|export\\s+(?:const|let|var)\\s+${method}\\b`, "u").test(source));
}

function isMutation(methods: string[]) {
  return methods.some((method) => WRITE_METHODS.has(method));
}

function hasRateLimitEvidence(source: string) {
  return /rateLimit|rateLimiter|RATE_LIMIT|withRateLimit|consumeRateLimit|guardApiRequest/u.test(source);
}

function hasIdempotencyEvidence(source: string) {
  return /idempotenc|transactionId|duplicatePrevented|orderId|captureId|eventId|requestId|lockId|already(?:Unlocked|Active|Processed)/iu.test(source);
}

function hasBodyLimitEvidence(source: string) {
  return /bodyLimit|MAX_[A-Z0-9_]*BYTES|payloadTooLarge|content-length|Content-Length|safeParseJson|parseJsonBody|requestBodyLimit|MAX_PAYLOAD/u.test(source);
}

function hasBoundedFirestoreGetEvidence(source: string, getIndex: number) {
  const prefix = source.slice(Math.max(0, getIndex - 360), getIndex);
  const normalizedPrefix = prefix.replace(/\s+/gu, " ");
  const directDocRead = /(?:adminDb|adminFirestore|db|firestore)\s*(?:\.\s*collection\([^)]*\)\s*)+\.\s*doc\([^)]*\)\s*$/u.test(prefix)
    || /(?:adminDb|adminFirestore|db|firestore)\s*\.\s*doc\([^)]*\)\s*$/u.test(prefix);
  const directDocRefRead = /\b\w+(?:DocRef|Ref)\s*$/u.test(normalizedPrefix);
  const aggregateCountRead = /\.count\(\)\s*$/u.test(prefix);
  const aggregateRead = normalizedPrefix.includes(".aggregate(");
  const explicitBoundEvidence = /\.limit\(|limit\(|pageSize|cursor|bounded|ALLOW_UNBOUNDED|hot-cache|snapshot/u.test(prefix)
    || /cost-bound:\s*single Firestore document read/u.test(normalizedPrefix)
    || /cost-bound:\s*Firestore query is limited to \d+ records/u.test(normalizedPrefix)
    || /cost-bound:\s*aggregate count read/u.test(normalizedPrefix);

  return directDocRead || directDocRefRead || aggregateCountRead || aggregateRead || explicitBoundEvidence;
}

function buildFinding(input: SpeedSecurityFindingInput): SpeedSecurityFinding {
  const normalizedPath = normalizePath(input.filePath);
  const seed = [input.domain, input.severity, normalizedPath, input.line ?? "", input.title, input.actualPattern].join("|");
  return {
    ...input,
    id: input.id ?? `speed_security_${stableHash(seed)}`,
    filePath: normalizedPath,
    evidence: Array.from(new Set(input.evidence)),
  };
}

function pushFinding(findings: SpeedSecurityFindingInput[], finding: SpeedSecurityFindingInput) {
  findings.push(finding);
}

function classifyApiRoutes(root: string, findings: SpeedSecurityFindingInput[]) {
  const routeFiles = walkFiles(root, "src/app/api").filter((filePath) => /\/route\.(?:ts|tsx|js|jsx)$/u.test(filePath));
  const cacheClassification: RouteCacheClassification = {
    totals: {
      static: 0,
      force_cache: 0,
      swr: 0,
      hot_cache: 0,
      no_store: 0,
      must_not_cache: 0,
      unknown: 0,
    },
    routes: [],
  };
  const securityClassification: RouteSecurityClassification = {
    totals: {
      routes: 0,
      mutations: 0,
      trustedOriginRequired: 0,
      trustedOriginPresent: 0,
      guardPresent: 0,
      rateLimitEvidence: 0,
      idempotencyRequired: 0,
      idempotencyEvidence: 0,
      bodyLimitRequired: 0,
      bodyLimitEvidence: 0,
    },
    routes: [],
  };

  for (const filePath of routeFiles) {
    const source = readRequired(root, filePath);
    const routePath = routePathFromFile(filePath);
    const methods = detectRouteMethods(source);
    const mutation = isMutation(methods);
    const cacheContract = matchRouteCacheContract(routePath);
    const securityContract = matchSecurityRouteContract(routePath);
    const cacheMode = cacheContract?.cacheMode ?? "unknown";
    const sourceNoStoreEvidence = /cache:\s*["']no-store["']|noStore\(|dynamic\s*=\s*["']force-dynamic["']/u.test(source);
    const sourceForceDynamicEvidence = /dynamic\s*=\s*["']force-dynamic["']/u.test(source);

    cacheClassification.totals[cacheMode] += 1;
    cacheClassification.routes.push({
      routePath,
      filePath,
      methods,
      contractPattern: cacheContract?.routePattern ?? null,
      cacheMode,
      surface: cacheContract?.surface ?? "unknown",
      userSpecific: cacheContract?.userSpecific ?? true,
      sensitive: cacheContract?.sensitive ?? true,
      sourceNoStoreEvidence,
      sourceForceDynamicEvidence,
    });

    if (!cacheContract) {
      pushFinding(findings, {
        domain: "speedCachingHydration",
        severity: "major",
        filePath,
        title: "API route lacks route cache contract",
        evidence: [`${routePath} does not match src/lib/server/route-cache-contract.ts.`],
        expectedRule: "Every API route declares static, force_cache, SWR, hot-cache, no-store, or must-not-cache intent.",
        actualPattern: "missing RouteCacheContract",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Add an explicit cache contract for this route before changing runtime caching.",
        humanReadableEscalation: "Route caching decisions depend on user-specific and sensitive data boundaries.",
      });
    }

    if (cacheContract && !cacheContract.sensitive && ["static", "force_cache", "swr", "hot_cache"].includes(cacheContract.cacheMode) && sourceNoStoreEvidence) {
      pushFinding(findings, {
        domain: "speedCachingHydration",
        severity: "major",
        filePath,
        line: lineOf(source, "no-store") ?? lineOf(source, "force-dynamic"),
        title: "Public/cacheable route uses no-store or force-dynamic",
        evidence: [`${routePath} contract is ${cacheContract.cacheMode}, but source shows no-store/force-dynamic evidence.`],
        expectedRule: "Public stable routes should avoid unnecessary no-store and force-dynamic when SWR/static/hot-cache is safe.",
        actualPattern: "no-store/force-dynamic on cacheable route",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Review freshness/security needs, then remove no-store or document why this route is truly dynamic.",
        humanReadableEscalation: "Do not auto-change caching on routes without source-owner freshness review.",
      });
    }

    const trustedOriginPresent = source.includes("requireTrustedOrigin: true") || source.includes("requireTrustedOrigin:true");
    const guardPresent = source.includes("guardApiRequest");
    const rateLimitPresent = hasRateLimitEvidence(source);
    const idempotencyPresent = hasIdempotencyEvidence(source);
    const bodyLimitPresent = hasBodyLimitEvidence(source);
    const trustedOriginRequired = Boolean(securityContract?.trustedOriginRequired && mutation);
    const bodyLimitRequired = Boolean(securityContract?.bodyLimitBytes);
    const idempotencyRequired = Boolean(securityContract?.idempotencyRequired && mutation);

    securityClassification.totals.routes += 1;
    if (mutation) securityClassification.totals.mutations += 1;
    if (trustedOriginRequired) securityClassification.totals.trustedOriginRequired += 1;
    if (trustedOriginPresent) securityClassification.totals.trustedOriginPresent += 1;
    if (guardPresent) securityClassification.totals.guardPresent += 1;
    if (rateLimitPresent) securityClassification.totals.rateLimitEvidence += 1;
    if (idempotencyRequired) securityClassification.totals.idempotencyRequired += 1;
    if (idempotencyPresent) securityClassification.totals.idempotencyEvidence += 1;
    if (bodyLimitRequired) securityClassification.totals.bodyLimitRequired += 1;
    if (bodyLimitPresent) securityClassification.totals.bodyLimitEvidence += 1;

    securityClassification.routes.push({
      routePath,
      filePath,
      methods,
      contractPattern: securityContract?.routePattern ?? null,
      authRequired: securityContract?.authRequired ?? "unknown",
      rateLimitPolicy: securityContract?.rateLimitPolicy ?? "unknown",
      costRisk: securityContract?.costRisk ?? "unknown",
      csrfRisk: securityContract?.csrfRisk ?? "unknown",
      mutation,
      sensitiveWrites: securityContract?.sensitiveWrites ?? mutation,
      trustedOriginRequired,
      trustedOriginPresent,
      trustedOriginChecked: true,
      guardPresent,
      rateLimitPresent,
      idempotencyRequired,
      idempotencyPresent,
      bodyLimitRequired,
      bodyLimitPresent,
      expectedFailureCodes: securityContract?.expectedFailureCodes ?? [],
    });

    if (!securityContract) {
      pushFinding(findings, {
        domain: "apiRouteSecurityExploitHardening",
        severity: "major",
        filePath,
        title: "API route lacks security route contract",
        evidence: [`${routePath} does not match src/lib/server/security-hardening-contract.ts.`],
        expectedRule: "Every API route declares auth, trusted-origin, rate-limit, idempotency, cost risk, and expected failure code posture.",
        actualPattern: "missing SecurityRouteContract",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Add a conservative SecurityRouteContract before changing route guard behavior.",
        humanReadableEscalation: "Route security classification is required before route behavior changes.",
      });
      continue;
    }

    if (mutation && !guardPresent && securityContract.authRequired !== "webhook" && securityContract.authRequired !== "cron") {
      pushFinding(findings, {
        domain: "apiRouteSecurityExploitHardening",
        severity: securityContract.costRisk === "critical" || securityContract.sensitiveWrites ? "critical" : "major",
        filePath,
        title: "State-mutating API route lacks canonical request guard evidence",
        evidence: [`${routePath} has mutating methods ${methods.join(", ")} and contract risk ${securityContract.costRisk}.`],
        expectedRule: "POST/PUT/PATCH/DELETE routes use guardApiRequest unless a webhook/cron exception is documented.",
        actualPattern: "mutation route without guardApiRequest",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Add the canonical request guard with route-specific auth, rate limit, trusted-origin, and typed errors.",
        humanReadableEscalation: "Do not auto-edit route auth/security boundaries.",
      });
    }

    if (trustedOriginRequired && !trustedOriginPresent) {
      pushFinding(findings, {
        domain: "apiRouteSecurityExploitHardening",
        severity: securityContract.costRisk === "critical" || securityContract.csrfRisk === "high" ? "critical" : "major",
        filePath,
        line: lineOf(source, "guardApiRequest"),
        title: "State-mutating route lacks trusted-origin evidence",
        evidence: [`${routePath} requires trusted origin by contract.`],
        expectedRule: "Mutations require requireTrustedOrigin: true unless they are explicitly webhook/cron exempt.",
        actualPattern: "missing requireTrustedOrigin: true",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Review origin semantics and enforce trusted-origin through guardApiRequest.",
        humanReadableEscalation: "Trusted-origin enforcement is security-sensitive and must be route-reviewed.",
      });
    }

    if (securityContract.rateLimitPolicy !== "none" && !rateLimitPresent) {
      pushFinding(findings, {
        domain: "apiRouteSecurityExploitHardening",
        severity: securityContract.sensitiveWrites || securityContract.costRisk === "critical" ? "major" : "moderate",
        filePath,
        title: "Route lacks source-visible rate limit evidence",
        evidence: [`Contract policy is ${securityContract.rateLimitPolicy}.`],
        expectedRule: "Payment, unlock, creator monetization, wallet, support writes, admin writes, media, and analytics routes are rate limited.",
        actualPattern: "missing rate limit evidence",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Route through guardApiRequest or the canonical rate-limit helper with the contract policy.",
        humanReadableEscalation: "Rate limit selection must match route cost/security semantics.",
      });
    }

    if (idempotencyRequired && !idempotencyPresent) {
      pushFinding(findings, {
        domain: "apiRouteSecurityExploitHardening",
        severity: securityContract.costRisk === "critical" ? "critical" : "major",
        filePath,
        title: "Sensitive mutating route lacks idempotency evidence",
        evidence: [`${routePath} contract requires idempotency.`],
        expectedRule: "Routes writing money, account, entitlement, or monetization state need idempotency/duplicate-prevention evidence.",
        actualPattern: "missing idempotency evidence",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Add or verify canonical idempotency keys/transactions before changing behavior.",
        humanReadableEscalation: "Idempotency touches payment/economy state and cannot be auto-repaired.",
      });
    }

    if (bodyLimitRequired && !bodyLimitPresent && mutation) {
      pushFinding(findings, {
        domain: "apiRouteSecurityExploitHardening",
        severity: "major",
        filePath,
        line: lineOf(source, "request.json"),
        title: "Mutating route has body limit contract but no source-visible cap",
        evidence: [`Contract body limit is ${securityContract.bodyLimitBytes} bytes.`],
        expectedRule: "Analytics/support/bug reports/uploads/imports and sensitive writes cap body size before parsing or mutation.",
        actualPattern: "missing body limit evidence",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Use the canonical bounded parser or content-length guard for this route.",
        humanReadableEscalation: "Body-limit fixes must preserve current request schema and typed errors.",
      });
    }

    if (source.includes("handleApiError") && /(Internal server error|throw new Error\()/u.test(source)) {
      const requiredCodes = securityContract.expectedFailureCodes.filter((code) =>
        /booking|subscription|payment|support|unauthorized|forbidden|insufficient|invalid/u.test(code));
      const missingCodes = requiredCodes.filter((code) => !source.includes(code));
      if (missingCodes.length > 0) {
        pushFinding(findings, {
          domain: "apiRouteSecurityExploitHardening",
          severity: "major",
          filePath,
          line: lineOf(source, "handleApiError") ?? lineOf(source, "Internal server error"),
          title: "Route may collapse expected domain failures into generic 500s",
          evidence: [`Missing expected safe code evidence: ${missingCodes.slice(0, 8).join(", ")}.`],
          expectedRule: "Expected failures return typed safe codes; handleApiError is for unexpected failures only.",
          actualPattern: "handleApiError/generic throw without expected code coverage",
          canAutofix: false,
          autofixConfidence: 0,
          suggestedFix: "Map known domain errors to safe typed responses and preserve route runtime health logging for unexpected failures.",
          humanReadableEscalation: "Typed error mapping may affect client copy and paid-source routes; use targeted route tests.",
        });
      }
    }

    const firestoreGetMatches = Array.from(source.matchAll(/\.get\(\)/gu));
    const unboundedGets = firestoreGetMatches.filter((match) => {
      return !hasBoundedFirestoreGetEvidence(source, match.index ?? 0);
    });
    if (unboundedGets.length > 0) {
      pushFinding(findings, {
        domain: "costRunawayWorkControls",
        severity: securityContract.authRequired === "admin" ? "major" : "critical",
        filePath,
        line: lineOfIndex(source, unboundedGets[0].index ?? 0),
        title: "Route contains Firestore collection get without nearby bound",
        evidence: [`Found ${unboundedGets.length} .get() call(s) without limit/pagination/hot-cache evidence.`],
        expectedRule: "Firestore collection reads in routes are bounded, paginated, cached, or explicitly allowlisted.",
        actualPattern: ".get() without nearby limit/pagination",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Add pagination/limit or move the read behind a materialized hot-cache refresh.",
        humanReadableEscalation: "Query shape changes can affect admin/runtime truth and need owner review.",
      });
    }

    if (/adminStorage|storage\.bucket|bucket\(/u.test(source) && !/entitlement|unlocked|owner|participant|MEDIA_PROXY|media_proxy|requireAdmin/u.test(source)) {
      pushFinding(findings, {
        domain: "contentPaymentEconomyProtection",
        severity: routePath.includes("content") || routePath.includes("media") ? "critical" : "major",
        filePath,
        line: lineOf(source, "adminStorage") ?? lineOf(source, "bucket("),
        title: "Storage/media route lacks entitlement or media-proxy guard evidence",
        evidence: [`${routePath} touches Storage but does not show entitlement/admin/media proxy markers.`],
        expectedRule: "Storage/media egress routes enforce entitlement/admin scope, byte/rate guards, and no raw locked URL leakage.",
        actualPattern: "storage usage without entitlement/media proxy evidence",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Verify entitlement, media proxy rate limit, and safe URL handling before exposing storage bytes.",
        humanReadableEscalation: "Locked content access must be manually reviewed.",
      });
    }
  }

  return { cacheClassification, securityClassification };
}

function scanSpeedCachingHydration(root: string, findings: SpeedSecurityFindingInput[]) {
  for (const filePath of SHELL_SPEED_FILES) {
    const source = readIfExists(root, filePath);
    if (!source) continue;

    if (source.includes("100vh")) {
      pushFinding(findings, {
        domain: "speedCachingHydration",
        severity: /ChatExperience|LockedDropPreview|CoreLayoutWrapper/u.test(filePath) ? "critical" : "major",
        filePath,
        line: lineOf(source, "100vh"),
        title: "Shell-critical surface uses raw 100vh",
        evidence: ["Mobile browser/PWA chrome can make raw 100vh overlap nav, CTA, or composer regions."],
        expectedRule: "Use 100dvh or shared shell viewport tokens in shell/chat/preview/wallet surfaces.",
        actualPattern: "100vh",
        canAutofix: true,
        autofixConfidence: 0.95,
        suggestedFix: "Replace exact shell-safe 100vh with 100dvh in approved files only.",
        humanReadableEscalation: "Keyboard/runtime behavior still needs human review after source repair.",
      });
    }

    if (/setInterval\(/u.test(source) && !/allowed interval|expiration timer|watch tick|visible tick/u.test(source)) {
      pushFinding(findings, {
        domain: "speedCachingHydration",
        severity: "major",
        filePath,
        line: lineOf(source, "setInterval("),
        title: "Public shell surface uses interval work",
        evidence: ["Speed fixes must not add polling; startup timers can increase input delay and cost."],
        expectedRule: "Use event-driven, SWR, visibility/focus, after-paint, or idle scheduling instead of polling.",
        actualPattern: "setInterval in shell/public surface",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Replace with existing SWR/runtime invalidation or defer diagnostics to idle.",
        humanReadableEscalation: "Timer behavior needs surface-specific review.",
      });
    }

    if (/<(?:Image|NextImage)\b[\s\S]{0,900}?\bfill\b[\s\S]{0,900}?\/?>/u.test(source)) {
      for (const match of source.matchAll(/<(?:Image|NextImage)\b[\s\S]{0,900}?\bfill\b[\s\S]{0,900}?\/?>/gu)) {
        if (!match[0].includes("sizes=")) {
          pushFinding(findings, {
            domain: "speedCachingHydration",
            severity: "major",
            filePath,
            line: lineOfIndex(source, match.index ?? 0),
            title: "Fill image is missing sizes",
            evidence: ["Next Image fill without sizes can download oversized assets and hurt LCP/INP."],
            expectedRule: "All fill images use the sitewide image loading policy and accurate sizes.",
            actualPattern: "fill image without sizes",
            canAutofix: false,
            autofixConfidence: 0,
            suggestedFix: "Use src/lib/image-loading-policy.ts for the surface or add explicit sizes.",
            humanReadableEscalation: "Image sizing requires route/surface knowledge and should not be guessed.",
          });
        }
      }
    }
  }

  const core = readIfExists(root, "src/components/CoreLayoutWrapper.tsx");
  if (core) {
    for (const modalName of ["PurchaseModal", "AuthModal", "CookieBanner", "ClientDiagnosticsBridge", "PwaRuntimeBridge"]) {
      const hasStaticImport = new RegExp(`import\\s+.*${modalName}`, "u").test(core);
      const hasLaneEvidence = core.includes("afterPaintReady") || core.includes("idleReady") || core.includes("interactionOpened");
      if (hasStaticImport && !hasLaneEvidence) {
        pushFinding(findings, {
          domain: "speedCachingHydration",
          severity: modalName.includes("Modal") ? "major" : "moderate",
          filePath: "src/components/CoreLayoutWrapper.tsx",
          line: lineOf(core, modalName),
          title: "Global shell eagerly imports overlay/diagnostic module without lane evidence",
          evidence: [`${modalName} appears in CoreLayoutWrapper without staged hydration markers.`],
          expectedRule: "Heavy overlays, cookie UI, diagnostics, PWA bridge, and modals load after paint, idle, or interaction-opened.",
          actualPattern: `eager global import ${modalName}`,
          canAutofix: false,
          autofixConfidence: 0,
          suggestedFix: "Move non-critical module behind existing readiness lanes without disconnecting telemetry/privacy truth.",
          humanReadableEscalation: "Hydration deferral can affect telemetry, consent, auth, or purchase readiness.",
        });
      }
    }
  }

  const home = readIfExists(root, "src/app/HomeClient.tsx");
  if (home && /useEffect\([\s\S]{0,800}(?:fetch\(|mutate\(|loadDrops|loadCreators)/u.test(home)) {
    pushFinding(findings, {
      domain: "speedCachingHydration",
      severity: "moderate",
      filePath: "src/app/HomeClient.tsx",
      line: lineOf(home, "useEffect"),
      title: "Homepage client effect may duplicate server-seeded data",
      evidence: ["Homepage modules below hero should not immediately refetch data already seeded by the server."],
      expectedRule: "Server-seeded homepage content revalidates after paint/idle only when documented.",
      actualPattern: "useEffect fetch/load pattern in HomeClient",
      canAutofix: false,
      autofixConfidence: 0,
      suggestedFix: "Verify server seed ownership and move freshness work behind after-paint/idle if duplicated.",
      humanReadableEscalation: "Homepage data freshness must be reviewed before caching changes.",
    });
  }
}

function scanFirebaseRulesAndAppCheck(root: string, findings: SpeedSecurityFindingInput[]) {
  const firestoreRules = readIfExists(root, "firestore.rules") ?? "";
  const storageRules = readIfExists(root, "storage.rules") ?? "";
  const databaseRules = readIfExists(root, "database.rules.json") ?? "";

  if (!/match\s+\/\{document=\*\*\}[\s\S]{0,220}allow\s+read,\s*write:\s*if\s+false/u.test(firestoreRules)
    && !/allow\s+read,\s*write:\s*if\s+false/u.test(firestoreRules)) {
    pushFinding(findings, {
      domain: "firebaseRulesAppCheckReadiness",
      severity: "critical",
      filePath: "firestore.rules",
      title: "Firestore rules lack source-visible default deny",
      evidence: ["Default deny is required because Firebase Admin bypasses rules and client rules must be explicitly scoped."],
      expectedRule: "Firestore rules retain a default deny fallback.",
      actualPattern: "missing allow read, write: if false",
      canAutofix: false,
      autofixConfidence: 0,
      suggestedFix: "Add or restore the default deny fallback after checking current rules structure.",
      humanReadableEscalation: "Security rules permissions must not be auto-repaired.",
    });
  }

  for (const [filePath, source] of [
    ["firestore.rules", firestoreRules],
    ["storage.rules", storageRules],
    ["database.rules.json", databaseRules],
  ] as const) {
    if (/allow\s+(?:read,\s*write|read|write):\s*if\s+true/u.test(source) || /"\.read"\s*:\s*true|"\.write"\s*:\s*true/u.test(source)) {
      pushFinding(findings, {
        domain: "firebaseRulesAppCheckReadiness",
        severity: "critical",
        filePath,
        line: lineOf(source, "if true") ?? lineOf(source, '".read"'),
        title: "Firebase rules contain broad public access",
        evidence: ["Rules must not allow broad public read/write access."],
        expectedRule: "Client rules are default deny with explicit owner/admin access only.",
        actualPattern: "allow/read/write true",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Remove broad access and add explicit owner/admin-scoped rules with emulator tests.",
        humanReadableEscalation: "Rules changes require targeted Firebase rules tests and owner review.",
      });
    }
  }

  const ruleExpectations = [
    { name: "support nested messages", pattern: /support_messages|supportThreads|support_threads/u, ownerPattern: /isAdmin|owner|request\.auth\.uid|userId/u },
    { name: "transactions owner/admin", pattern: /transactions/u, ownerPattern: /isAdmin|request\.auth\.uid|userId|ownerId/u },
    { name: "creator/chat participant/admin", pattern: /creator.*messages|chat.*messages|threads/u, ownerPattern: /participant|isAdmin|creatorId|userId|request\.auth\.uid/u },
  ];
  for (const expectation of ruleExpectations) {
    if (expectation.pattern.test(firestoreRules) && !expectation.ownerPattern.test(firestoreRules)) {
      pushFinding(findings, {
        domain: "firebaseRulesAppCheckReadiness",
        severity: "major",
        filePath: "firestore.rules",
        title: `Firestore rules may not scope ${expectation.name}`,
        evidence: [`Found ${expectation.name} rule area without nearby owner/admin markers.`],
        expectedRule: "Users can read only own runtime/support/chat/transaction state unless admin.",
        actualPattern: "missing owner/admin scope marker",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Verify owner/admin path rules and add targeted Firebase rules tests if the scope is unclear.",
        humanReadableEscalation: "Rules scope requires emulator-backed validation.",
      });
    }
  }

  if (/match\s+\/drops[\s\S]{0,260}allow\s+read:\s*if\s+true/u.test(firestoreRules)) {
    pushFinding(findings, {
      domain: "firebaseRulesAppCheckReadiness",
      severity: "critical",
      filePath: "firestore.rules",
      line: lineOf(firestoreRules, "match /drops"),
      title: "Drops may be directly public-readable from Firestore",
      evidence: ["Public browsing should use sanitized server/API pathways and never expose locked payload fields through client rules."],
      expectedRule: "Drops direct client reads are admin-only unless a sanitized direct-read rule is explicitly approved.",
      actualPattern: "drops allow read: if true",
      canAutofix: false,
      autofixConfidence: 0,
      suggestedFix: "Route public Drops reads through sanitized server/API code and keep direct rules scoped.",
      humanReadableEscalation: "Direct Drop rules can leak locked content and need content-protection review.",
    });
  }

  if (/allow\s+read:\s*if\s+true/u.test(storageRules) && !/public|cover|avatar|landing/u.test(storageRules)) {
    pushFinding(findings, {
      domain: "firebaseRulesAppCheckReadiness",
      severity: "critical",
      filePath: "storage.rules",
      line: lineOf(storageRules, "allow read: if true"),
      title: "Storage rules may allow public locked media reads",
      evidence: ["Storage must not expose locked internal media before entitlement or signed proxy access."],
      expectedRule: "Storage reads are public only for explicitly public assets; locked media stays entitlement-gated.",
      actualPattern: "storage allow read: if true",
      canAutofix: false,
      autofixConfidence: 0,
      suggestedFix: "Separate public cover/avatar paths from locked content paths and add targeted storage rules tests.",
      humanReadableEscalation: "Storage rules changes are content-access sensitive.",
    });
  }

  const authFetch = readIfExists(root, "src/lib/authFetch.ts") ?? readIfExists(root, "src/lib/auth-fetch.ts") ?? "";
  if (!/appCheck|getToken\(/iu.test(authFetch)) {
    pushFinding(findings, {
      domain: "firebaseRulesAppCheckReadiness",
      severity: "moderate",
      filePath: authFetch ? "src/lib/authFetch.ts" : "src/lib/authFetch.ts",
      title: "Custom backend App Check token path is not source-visible",
      evidence: ["App Check readiness should include a client token path before monitor/enforce rollout."],
      expectedRule: "Auth fetch has a staged path to include App Check tokens where custom backend protection is enabled.",
      actualPattern: "missing App Check token path evidence",
      canAutofix: false,
      autofixConfidence: 0,
      suggestedFix: "Document or add a monitor-mode App Check token attachment path without enforcing yet.",
      humanReadableEscalation: "App Check enforcement can break real traffic if rolled out without monitor evidence.",
    });
  }

  if (!APP_CHECK_READINESS_CONTRACT || APP_CHECK_READINESS_CONTRACT.enforcementMode === "off") {
    pushFinding(findings, {
      domain: "firebaseRulesAppCheckReadiness",
      severity: "minor",
      filePath: "src/lib/server/security-hardening-contract.ts",
      title: "App Check readiness is contract-only and not yet enforced",
      evidence: ["This is an explicit monitor-first staging note, not a runtime behavior change."],
      expectedRule: "App Check is staged from monitor to enforcement for high-abuse custom backend routes.",
      actualPattern: "App Check enforcementMode off",
      canAutofix: false,
      autofixConfidence: 0,
      suggestedFix: "Promote to monitor/enforce only after owner verifies real traffic and webhook/cron exceptions.",
      humanReadableEscalation: "App Check rollout must be operationally staged.",
    });
  }
}

function scanContentPaymentEconomy(root: string, findings: SpeedSecurityFindingInput[]) {
  const contentFiles = [
    "src/components/DropPreviewModal.tsx",
    "src/components/Drops/LockedDropPreviewView.tsx",
    "src/app/drops/[dropId]/preview/page.tsx",
    "src/app/api/drops/content/route.ts",
    "src/app/dashboard/viewer/page.tsx",
  ];

  for (const filePath of contentFiles) {
    const source = readIfExists(root, filePath);
    if (!source) continue;
    if (/(contentUrls|contentUrl|storageUrl|downloadURL|mediaUrl)/u.test(source) && !/(entitlement|unlocked|owned|safe preview|data-safe-preview-fields-only|sanitize)/iu.test(source)) {
      pushFinding(findings, {
        domain: "contentPaymentEconomyProtection",
        severity: filePath.includes("/api/") ? "critical" : "major",
        filePath,
        line: lineOf(source, "contentUrl") ?? lineOf(source, "storageUrl"),
        title: "Locked content URL fields may be exposed before entitlement",
        evidence: ["Locked previews and guest/user surfaces must not render internal content URLs or internal thumbnails before unlock."],
        expectedRule: "Only cover art and safe preview fields are rendered before entitlement.",
        actualPattern: "contentUrls/contentUrl/storageUrl without safe-preview/entitlement marker",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Route through safe preview models or entitlement-gated content proxy before returning media fields.",
        humanReadableEscalation: "Content protection cannot be auto-fixed.",
      });
    }
  }

  const capture = readIfExists(root, "src/app/api/paypal/capture/route.ts") ?? "";
  const captureUsesPaidPurchaseTruth =
    capture.includes("buildPaidPurchaseBalanceCredit")
    && capture.includes("buildPurchaseSourceOfFundsBreakdown")
    && capture.includes('rewardPromoGd: 0')
    && capture.includes('sourceClassification');
  if (!captureUsesPaidPurchaseTruth && /bonusGumDrops[\s\S]{0,120}reward|reward[\s\S]{0,120}bonusGumDrops/u.test(capture)) {
    pushFinding(findings, {
      domain: "contentPaymentEconomyProtection",
      severity: "critical",
      filePath: "src/app/api/paypal/capture/route.ts",
      line: lineOf(capture, "bonusGumDrops"),
      title: "Paid package bonus GumDrops may be classified as reward source",
      evidence: ["Paid pack bonuses are paid-source GumDrops for creator monetization eligibility."],
      expectedRule: "Paid package base and bonus credit purchased/source-paid balance; rewards are only non-purchase grants.",
      actualPattern: "bonusGumDrops near reward",
      canAutofix: false,
      autofixConfidence: 0,
      suggestedFix: "Use the GumDrops source-of-funds truth helper and targeted economy tests.",
      humanReadableEscalation: "Wallet/economy truth must not be auto-repaired in this lane.",
    });
  }

  const creatorExperiences = readIfExists(root, "src/lib/server/creator-experiences.ts") ?? "";
  if (!/purchasedOnly|spendCreatorExperienceGumdrops|paid-source|paid source/iu.test(creatorExperiences)) {
    pushFinding(findings, {
      domain: "contentPaymentEconomyProtection",
      severity: "critical",
      filePath: "src/lib/server/creator-experiences.ts",
      title: "Creator monetization spend policy lacks paid-source evidence",
      evidence: ["Creator experiences/chat/subscriptions/requests/bookings must spend purchased balance only."],
      expectedRule: "Creator monetization calls use paid-source GumDrops and preserve ledger/idempotency truth.",
      actualPattern: "missing purchasedOnly/spendCreatorExperienceGumdrops evidence",
      canAutofix: false,
      autofixConfidence: 0,
      suggestedFix: "Run the targeted GumDrops economy and Fan Pass/booking validators before changing spend logic.",
      humanReadableEscalation: "Paid-source spend policy is business-critical.",
    });
  }
}

function scanCostRunawayWork(root: string, findings: SpeedSecurityFindingInput[]) {
  const sourceFiles = [
    ...walkFiles(root, "src/app/api"),
    ...walkFiles(root, "src/lib/server"),
    ...walkFiles(root, "functions/src"),
  ];

  for (const filePath of sourceFiles) {
    const source = readRequired(root, filePath);

    if (/(from\s+["'](?:pg|postgres|mysql2?|@prisma\/client|prisma|drizzle-orm|kysely|sequelize|@google-cloud\/cloud-sql-connector)["'])|\bCLOUD_SQL_CONNECTION_NAME\b/u.test(source)
      || (/\bprocess\.env\.DATABASE_URL\b/u.test(source) && !(source.includes("FIREBASE_DATABASE_URL") && source.includes("resolveDatabaseUrl")))) {
      pushFinding(findings, {
        domain: "costRunawayWorkControls",
        severity: filePath.startsWith("src/app/api") ? "critical" : "major",
        filePath,
        line: lineOf(source, "DATABASE_URL") ?? lineOf(source, "pg"),
        title: "Runtime SQL/Data Connect usage appears outside approved agent mirror",
        evidence: ["Firebase Data Connect/Cloud SQL is allowed only for agent-context mirror infrastructure unless explicitly contracted."],
        expectedRule: "No runtime SQL/Data Connect in product routes without explicit cost/security contract.",
        actualPattern: "runtime SQL client/env usage",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Remove runtime SQL usage or add owner-approved SQL/Data Connect contract before use.",
        humanReadableEscalation: "SQL runtime usage is cost-bearing and must be manually approved.",
      });
    }

    if (/Promise\.all\(\s*[^)]*\.map\(/u.test(source)) {
      pushFinding(findings, {
        domain: "costRunawayWorkControls",
        severity: "major",
        filePath,
        line: lineOf(source, "Promise.all"),
        title: "Potential unbounded Promise.all fanout",
        evidence: ["Cloud Run timeouts can return 504 while server work continues; fanout must be bounded."],
        expectedRule: "Long-running routes/scripts use bounded batches, cursors, concurrency caps, and early timeout exits.",
        actualPattern: "Promise.all(...map(",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Add explicit batch size/concurrency cap or route the work through bounded background processing.",
        humanReadableEscalation: "Concurrency changes need runtime/cost review.",
      });
    }

    if (/(delete\(\)|batch\.delete)[\s\S]{0,260}(for\s*\(|forEach\()/u.test(source) && !/limit\(|BATCH_LIMIT|MAX_|pageSize|cursor/u.test(source)) {
      pushFinding(findings, {
        domain: "costRunawayWorkControls",
        severity: "major",
        filePath,
        line: lineOf(source, "delete()") ?? lineOf(source, "batch.delete"),
        title: "Cleanup/delete loop lacks bounded batch evidence",
        evidence: ["Cleanup work must be limited to avoid timeout/cost runaway."],
        expectedRule: "Deletes and cleanup jobs have bounded batch size, cursor, max frequency, and admin/cron guards.",
        actualPattern: "delete loop without limit evidence",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Add a deterministic batch cap and route runtime health evidence.",
        humanReadableEscalation: "Destructive work cannot be auto-edited.",
      });
    }

    if (/@google-cloud\/vertexai|GoogleAuth|BetaAnalyticsDataClient/u.test(source)) {
      const hasTimeoutEvidence = /AbortController|timeout|TIMEOUT|deadline|remaining/u.test(source);
      const hasBudgetEvidence = /budget|quota|maxOutputTokens|maxExpected|countTokens|returnPropertyQuota|hot-cache|snapshot/u.test(source);
      if (!hasTimeoutEvidence || !hasBudgetEvidence) {
        pushFinding(findings, {
          domain: "costRunawayWorkControls",
          severity: "major",
          filePath,
          line: lineOf(source, "@google-cloud/vertexai") ?? lineOf(source, "BetaAnalyticsDataClient") ?? lineOf(source, "GoogleAuth"),
          title: "Paid Google API surface lacks full timeout/budget evidence",
          evidence: ["AI/GA routes must be bounded by timeout, budget, quota, and hot-cache strategy where applicable."],
          expectedRule: "Paid Google calls are admin-gated, budgeted, timeout-aware, and recorded in debug/cost evidence.",
          actualPattern: "paid Google API import without timeout/budget evidence",
          canAutofix: false,
          autofixConfidence: 0,
          suggestedFix: "Verify kill switch, quota return, model allowlist, token cap, timeout, and route frequency cap.",
          humanReadableEscalation: "Paid Google API behavior requires owner review.",
        });
      }
    }
  }

  const cloudCostDoc = readIfExists(root, "docs/agent-truth/cloudrun-sql-bigquery-guardrails.md") ?? "";
  if (!/max instances|concurrency|kandydrops-db|Cloud SQL/iu.test(cloudCostDoc)) {
    pushFinding(findings, {
      domain: "costRunawayWorkControls",
      severity: "major",
      filePath: "docs/agent-truth/cloudrun-sql-bigquery-guardrails.md",
      title: "Cloud Run/SQL guardrail doc lacks max-instance/concurrency evidence",
      evidence: ["AI/media/SQL/analytics rebuild routes need cost-sensitive max instance and concurrency recommendations."],
      expectedRule: "Cloud Run max instances and concurrency protect Cloud SQL, AI, media, and analytics rebuild surfaces.",
      actualPattern: "missing max-instance/concurrency documentation",
      canAutofix: false,
      autofixConfidence: 0,
      suggestedFix: "Record recommended max instances/concurrency and manual Cloud Console checklist.",
      humanReadableEscalation: "Cloud provider settings are documentation-only in this lane; do not execute gcloud.",
    });
  }
}

function scanDocsDebugEvidence(root: string, findings: SpeedSecurityFindingInput[]) {
  const requiredDocs = [
    "README.md",
    "AGENTS.md",
    "REPO_MEMORY_LEDGER.md",
    "EVERY_FILE_FUNCTION_CHECKLIST.md",
    "docs/agent-truth/speed-security-hardening.md",
    "docs/agent-truth/google-cost-bleed.md",
    "docs/agent-truth/public-beta-score.md",
  ];
  for (const filePath of requiredDocs) {
    const source = readIfExists(root, filePath);
    if (!source || !source.includes(SPEED_SECURITY_DOCTRINE_NOTE)) {
      pushFinding(findings, {
        domain: "docsDebugEvidenceCompleteness",
        severity: filePath.includes("speed-security-hardening") ? "major" : "moderate",
        filePath,
        title: "Speed/security doctrine note missing from source-of-truth doc",
        evidence: ["Broad hardening lanes must update user manual, dev truth, AI context, and agent-truth docs."],
        expectedRule: "Docs/source-of-truth repeat the deterministic speed/security hardening doctrine.",
        actualPattern: "missing speed-security doctrine note",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Add the doctrine note and command lane to the relevant source-of-truth document.",
        humanReadableEscalation: "Documentation update only; no runtime behavior change.",
      });
    }
  }

  const debugEvidence = readIfExists(root, "src/lib/debug-evidence-contract.ts");
  const routeRuntimeHealth = readIfExists(root, "src/lib/server/route-runtime-health.ts");
  if (!debugEvidence || !routeRuntimeHealth) {
    pushFinding(findings, {
      domain: "docsDebugEvidenceCompleteness",
      severity: "major",
      filePath: !debugEvidence ? "src/lib/debug-evidence-contract.ts" : "src/lib/server/route-runtime-health.ts",
      title: "Debug evidence or route runtime health owner is missing",
      evidence: ["Slow/failing routes and support/security failures need structured evidence and route runtime health logging."],
      expectedRule: "Debug evidence and route runtime health remain connected for audits and pre-catcher issue detection.",
      actualPattern: "missing debug evidence/runtime health owner",
      canAutofix: false,
      autofixConfidence: 0,
      suggestedFix: "Restore structured debug evidence and route runtime health helper before relying on manual reports.",
      humanReadableEscalation: "Diagnostics must not block user flows or leak sensitive payloads.",
    });
  }
}

function dedupeFindings(rawFindings: SpeedSecurityFindingInput[]) {
  const findings = rawFindings.map(buildFinding);
  const byKey = new Map<string, SpeedSecurityFinding>();
  for (const finding of findings) {
    const key = [finding.domain, finding.filePath, finding.line ?? "", finding.title.toLowerCase(), finding.actualPattern].join("|");
    const existing = byKey.get(key);
    if (!existing || SEVERITY_RANK[finding.severity] > SEVERITY_RANK[existing.severity]) {
      byKey.set(key, finding);
    } else {
      byKey.set(key, {
        ...existing,
        evidence: Array.from(new Set([...existing.evidence, ...finding.evidence])),
      });
    }
  }
  return Array.from(byKey.values()).sort((left, right) =>
    SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity]
    || left.filePath.localeCompare(right.filePath)
    || left.title.localeCompare(right.title));
}

function getStatus(score: number, hasCritical: boolean, hasMajor: boolean): SpeedSecurityStatus {
  if (hasCritical) return "fail";
  if (hasMajor) return "beta-risk";
  if (score >= 95) return "clean";
  if (score >= 90) return "pass";
  if (score >= 80) return "warning";
  if (score >= 70) return "beta-risk";
  return "fail";
}

function scoreFindings(findings: SpeedSecurityFinding[]) {
  const penalty = findings.reduce((sum, finding) => sum + SEVERITY_PENALTIES[finding.severity], 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

function recommendedFixOrder(findings: SpeedSecurityFinding[]) {
  if (findings.length === 0) {
    return ["No speed/security findings. Keep using score:speed-security before broad verification."];
  }
  const labels: Record<SpeedSecurityDomain, string> = {
    speedCachingHydration: "Classify route caching/hydration first; remove no-store, eager overlays, polling, and image-size issues only after source review.",
    apiRouteSecurityExploitHardening: "Close route guard, trusted-origin, rate-limit, idempotency, typed-error, and body-limit gaps with targeted route tests.",
    firebaseRulesAppCheckReadiness: "Review Firebase rules default-deny/owner-admin scopes and stage App Check monitor before enforcement.",
    contentPaymentEconomyProtection: "Escalate locked-content, payment, unlock, and GumDrops findings before any behavior change.",
    costRunawayWorkControls: "Bound Firestore reads, paid Google calls, cleanup loops, and Cloud Run/SQL/BigQuery cost surfaces.",
    docsDebugEvidenceCompleteness: "Update source-of-truth docs and keep debug evidence/route runtime health connected.",
  };
  return DOMAINS.filter((domain) => findings.some((finding) => finding.domain === domain)).map((domain) => labels[domain]);
}

function appCheckReadinessSummary(findings: SpeedSecurityFinding[]): SpeedSecurityReport["appCheckReadiness"] {
  const appCheckFindings = findings
    .filter((finding) => finding.domain === "firebaseRulesAppCheckReadiness" && /App Check/i.test(`${finding.title} ${finding.evidence.join(" ")}`))
    .map((finding) => finding.title);
  return {
    ...APP_CHECK_READINESS_CONTRACT,
    status: APP_CHECK_READINESS_CONTRACT.enforcementMode,
    findings: appCheckFindings,
  };
}

export function buildSpeedSecurityHardeningReport(root = process.cwd(), safeAutofixesApplied = 0): SpeedSecurityReport {
  const rawFindings: SpeedSecurityFindingInput[] = [];

  const { cacheClassification, securityClassification } = classifyApiRoutes(root, rawFindings);
  scanSpeedCachingHydration(root, rawFindings);
  scanFirebaseRulesAndAppCheck(root, rawFindings);
  scanContentPaymentEconomy(root, rawFindings);
  scanCostRunawayWork(root, rawFindings);
  scanDocsDebugEvidence(root, rawFindings);

  const findings = dedupeFindings(rawFindings);
  const domainScores = {} as SpeedSecurityReport["domainScores"];
  let weightedScore = 0;
  let totalWeight = 0;

  for (const domain of DOMAINS) {
    const domainFindings = findings.filter((finding) => finding.domain === domain);
    const score = scoreFindings(domainFindings);
    const criticalCount = domainFindings.filter((finding) => finding.severity === "critical").length;
    const majorCount = domainFindings.filter((finding) => finding.severity === "major").length;
    const weight = DOMAIN_WEIGHTS[domain];
    domainScores[domain] = {
      weight,
      score,
      status: getStatus(score, criticalCount > 0, majorCount > 0),
      findingCount: domainFindings.length,
      criticalCount,
      majorCount,
    };
    weightedScore += score * weight;
    totalWeight += weight;
  }

  const criticalFindings = findings.filter((finding) => finding.severity === "critical");
  const hasMajor = findings.some((finding) => finding.severity === "major");
  const overallScore = Math.round(weightedScore / Math.max(1, totalWeight));

  return {
    generatedAt: new Date().toISOString(),
    overallScore,
    overallStatus: getStatus(overallScore, criticalFindings.length > 0, hasMajor),
    domainScores,
    routeCacheClassification: cacheClassification,
    routeSecurityClassification: securityClassification,
    firebaseRulesFindings: findings.filter((finding) => finding.domain === "firebaseRulesAppCheckReadiness"),
    appCheckReadiness: appCheckReadinessSummary(findings),
    exploitRisks: findings.filter((finding) => finding.domain === "apiRouteSecurityExploitHardening" || finding.domain === "firebaseRulesAppCheckReadiness"),
    speedRisks: findings.filter((finding) => finding.domain === "speedCachingHydration"),
    costRisks: findings.filter((finding) => finding.domain === "costRunawayWorkControls"),
    criticalFindings,
    findings,
    recommendedFixOrder: recommendedFixOrder(findings),
    safeAutofixesAvailable: findings.filter((finding) => finding.canAutofix && finding.autofixConfidence >= 0.95).length,
    safeAutofixesApplied,
    minimalVerificationCommands: [...SPEED_SECURITY_ALLOWED_COMMANDS],
    forbiddenCommands: [...SPEED_SECURITY_FORBIDDEN_COMMANDS],
    summary: `${SPEED_SECURITY_DOCTRINE_NOTE} Current source scan found ${findings.length} findings across ${securityClassification.totals.routes} API routes.`,
  };
}

export function writeSpeedSecurityHardeningReport(report: SpeedSecurityReport, root = process.cwd()) {
  const outputPath = join(root, SPEED_SECURITY_REPORT_PATH);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export function printSpeedSecurityHardeningSummary(report: SpeedSecurityReport) {
  console.log(`Speed/security hardening: ${report.overallScore}/${report.overallStatus}`);
  console.log(`API routes classified: ${report.routeSecurityClassification.totals.routes}`);
  console.log(`Findings: ${report.findings.length}; critical: ${report.criticalFindings.length}; safe fixes: ${report.safeAutofixesAvailable}`);
  console.log("Top findings:");
  for (const finding of report.findings.slice(0, 5)) {
    console.log(`- [${finding.severity}] ${finding.domain}: ${finding.title} (${finding.filePath}${finding.line ? `:${finding.line}` : ""})`);
  }
  console.log("Minimal commands:");
  for (const command of report.minimalVerificationCommands.slice(0, 3)) {
    console.log(`- ${command}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = buildSpeedSecurityHardeningReport();
  writeSpeedSecurityHardeningReport(report);
  printSpeedSecurityHardeningSummary(report);
}
