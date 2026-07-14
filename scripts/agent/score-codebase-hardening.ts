import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  matchApiCostContract,
} from "../../src/lib/server/api-cost-contract";
import {
  CODEBASE_HARDENING_ALLOWED_COMMANDS,
  CODEBASE_HARDENING_DOMAIN_WEIGHTS,
  CODEBASE_HARDENING_DOMAINS,
  CODEBASE_HARDENING_DOCTRINE_NOTE,
  CODEBASE_HARDENING_FORBIDDEN_COMMANDS,
  CODEBASE_HARDENING_REPORT_PATH,
  CODEBASE_HARDENING_SEVERITY_PENALTIES,
  buildHardeningFinding,
  getHardeningSeverityRank,
  getHardeningStatus,
  normalizeHardeningPath,
  type CodebaseHardeningDomain,
  type CodebaseHardeningFinding,
  type CodebaseHardeningFindingInput,
  type CodebaseHardeningReport,
  type CodebaseHardeningRouteCostClassification,
  type CodebaseHardeningSeverity,
} from "../../src/lib/codebase-hardening-contract";
import { hasBoundedFirestoreGetEvidence } from "./score-speed-security-hardening";

type SourceFile = {
  filePath: string;
  source: string;
};

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const SKIP_DIRECTORIES = new Set([".git", ".next", "node_modules", "out", "playwright-report", "test-results", "lighthouse-results"]);

const ROUTE_CACHE_POLICY_FILES = [
  "src/app/page.tsx",
  "src/app/HomeClient.tsx",
  "src/app/drops/DropsClient.tsx",
  "src/app/dashboard/page.tsx",
  "src/app/experiences/ExperiencesClient.tsx",
  "src/app/creators/[username]/CreatorProfileClient.tsx",
];

const GLOBAL_HYDRATION_FILES = [
  "src/app/layout.tsx",
  "src/components/CoreLayoutWrapper.tsx",
  "src/components/ClientDiagnosticsBridge.tsx",
  "src/components/PwaRuntimeBridge.tsx",
  "src/components/Notifications/NotificationRuntimeBridge.tsx",
  "src/components/Feedback/GlobalBugReportTrigger.tsx",
];

const DEVICE_UI_FILES = [
  "src/components/CoreLayoutWrapper.tsx",
  "src/components/Chat/ChatExperience.tsx",
  "src/components/PurchaseModal.tsx",
  "src/components/Drops/LockedDropPreviewView.tsx",
  "src/components/DropCardLayout.tsx",
  "src/components/FeaturedCarousel.tsx",
  "src/lib/user-mobile-shell.ts",
];

const CRITICAL_TELEMETRY_FILES = [
  "src/components/Hero.tsx",
  "src/components/FeaturedCarousel.tsx",
  "src/components/DropCard.tsx",
  "src/components/PurchaseModal.tsx",
  "src/components/Dashboard/DailyCheckIn.tsx",
  "src/components/Dashboard/DailyTasksModule.tsx",
  "src/components/Chat/ChatExperience.tsx",
  "src/components/Navigation/NotificationBell.tsx",
  "src/components/Feedback/ReportBugButton.tsx",
  "src/app/creators/[username]/CreatorProfileClient.tsx",
];

function readIfExists(root: string, filePath: string): SourceFile | null {
  const normalized = normalizeHardeningPath(filePath);
  const fullPath = join(root, normalized);
  if (!existsSync(fullPath)) return null;
  return {
    filePath: normalized,
    source: readFileSync(fullPath, "utf8"),
  };
}

function readRequired(root: string, filePath: string) {
  return readFileSync(join(root, normalizeHardeningPath(filePath)), "utf8");
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
      output.push(normalizeHardeningPath(join(startPath, entry)));
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

function excerpt(source: string, needle: string) {
  return source.split(/\r?\n/u).find((line) => line.includes(needle))?.trim();
}

function routePathFromFile(filePath: string) {
  return `/${normalizeHardeningPath(filePath)
    .replace(/^src\/app\//u, "")
    .replace(/\/route\.(?:ts|tsx|js|jsx)$/u, "")
    .replace(/\/index$/u, "")}`;
}

function detectRouteMethods(source: string) {
  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
  return methods.filter((method) => new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b|export\\s+(?:const|let|var)\\s+${method}\\b`, "u").test(source));
}

function hasMutationMethod(methods: string[]) {
  return methods.some((method) => ["POST", "PUT", "PATCH", "DELETE"].includes(method));
}

const CANONICAL_SOURCE_COMPONENT_PAYLOAD_BUILDERS = [
  "buildChatMediaUploadPayload",
  "buildChatTelemetryPayload",
  "buildCreatorProfileLinkTelemetryPayload",
  "buildCreatorRelationshipTelemetryPayload",
  "buildDailyTaskLifecycleEventPayload",
] as const;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function findLatestVariableInitializer(source: string, variableName: string, beforeIndex: number) {
  const prefix = source.slice(0, beforeIndex);
  const declarationPattern = new RegExp(`\\b(?:const|let|var)\\s+${escapeRegExp(variableName)}\\s*=`, "gu");
  let latest: RegExpExecArray | null = null;
  for (const match of prefix.matchAll(declarationPattern)) latest = match;
  if (!latest || latest.index === undefined) return "";
  const initializer = prefix.slice(latest.index + latest[0].length);
  const statementEnd = initializer.indexOf(";");
  return statementEnd >= 0 ? initializer.slice(0, statementEnd) : initializer;
}

export function hasCanonicalTelemetrySourceComponentEvidence(source: string, call: string, callIndex: number) {
  if (call.includes("source_component")) return true;
  if (CANONICAL_SOURCE_COMPONENT_PAYLOAD_BUILDERS.some((builder) => call.includes(`${builder}(`))) return true;

  const payloadIdentifier = call.match(/,\s*([A-Za-z_$][\w$]*)\s*\)\s*$/u)?.[1];
  if (!payloadIdentifier) return false;
  const initializer = findLatestVariableInitializer(source, payloadIdentifier, callIndex);
  return initializer.includes("source_component")
    || CANONICAL_SOURCE_COMPONENT_PAYLOAD_BUILDERS.some((builder) => initializer.includes(`${builder}(`));
}

export function findProductFacingCoinsVocabularyIndex(source: string) {
  const stringLiteral = /["'`][^"'`\r\n]*\bCoins\b[^"'`\r\n]*["'`]/gu.exec(source);
  const jsxText = />\s*[^<\r\n]*\bCoins\b[^<\r\n]*</gu.exec(source);
  const indexes = [stringLiteral?.index, jsxText?.index].filter((value): value is number => typeof value === "number");
  return indexes.length > 0 ? Math.min(...indexes) : undefined;
}

function pushFinding(findings: CodebaseHardeningFindingInput[], finding: CodebaseHardeningFindingInput) {
  findings.push(finding);
}

function scanRouteCachingAndDataCost(root: string, findings: CodebaseHardeningFindingInput[]) {
  for (const filePath of ROUTE_CACHE_POLICY_FILES) {
    const file = readIfExists(root, filePath);
    if (!file) continue;
    if (file.source.includes('cache: "no-store"') || file.source.includes("cache: 'no-store'") || file.source.includes("noStore(")) {
      pushFinding(findings, {
        domain: "routeCachingAndDataCost",
        severity: "moderate",
        filePath: file.filePath,
        line: lineOf(file.source, "no-store") ?? lineOf(file.source, "noStore("),
        title: "Public route or page uses no-store caching without source-level policy evidence",
        evidence: ["Stable public or server-seeded data should use static, SWR, Data Cache, or hot-cache when safe."],
        expectedRule: "Do not default public/stable route data to no-store; document no_store only when freshness/security requires it.",
        actualPattern: "no-store/noStore in public route surface",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Classify the route as static, SWR, hot_cache, or no_store and update fetch/cache behavior only after verifying freshness needs.",
        humanReadableEscalation: "Route caching must be reviewed against source-of-truth freshness before changing runtime behavior.",
      });
    }
    if (/useEffect\(\s*\(\)\s*=>[\s\S]{0,600}(?:fetch\(|mutate\(|load[A-Z])/u.test(file.source) && file.filePath.includes("HomeClient")) {
      pushFinding(findings, {
        domain: "routeCachingAndDataCost",
        severity: "moderate",
        filePath: file.filePath,
        line: lineOf(file.source, "useEffect"),
        title: "Homepage client effect may refetch server-seeded data",
        evidence: ["Home page should preserve server seeding and revalidate after paint only when documented."],
        expectedRule: "Server-seeded homepage modules should not immediately duplicate fetches on mount.",
        actualPattern: "useEffect fetch/load pattern in HomeClient",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Move freshness work behind after-paint/idle or prove the effect does not duplicate server-seeded content.",
        humanReadableEscalation: "Homepage data flow needs route-specific review before changing fetch timing.",
      });
    }
  }
}

function classifyRoutes(root: string): CodebaseHardeningRouteCostClassification {
  const routeFiles = walkFiles(root, "src/app/api").filter((filePath) => /\/route\.(?:ts|tsx|js|jsx)$/u.test(filePath));
  const summary: CodebaseHardeningRouteCostClassification = {
    static: 0,
    swr: 0,
    hot_cache: 0,
    no_store: 0,
    unknown: 0,
    routes: [],
  };

  for (const filePath of routeFiles) {
    const source = readRequired(root, filePath);
    const routePath = routePathFromFile(filePath);
    const methods = detectRouteMethods(source);
    const contract = matchApiCostContract(routePath);
    const cachePolicy = contract?.cachePolicy ?? "unknown";
    summary[cachePolicy] += 1;
    summary.routes.push({
      routePath,
      filePath,
      methods,
      cachePolicy,
      costClass: contract?.costClass ?? "unknown",
    });
  }

  return summary;
}

function scanApiRateLimitAndCloudCost(root: string, findings: CodebaseHardeningFindingInput[], routeSummary: CodebaseHardeningRouteCostClassification) {
  for (const route of routeSummary.routes) {
    const source = readRequired(root, route.filePath);
    if (route.cachePolicy === "unknown") {
      pushFinding(findings, {
        domain: "apiRateLimitAndCloudCost",
        severity: "major",
        filePath: route.filePath,
        title: "API route has no route-level cost contract",
        evidence: [`${route.routePath} is not matched by src/lib/server/api-cost-contract.ts.`],
        expectedRule: "Every src/app/api route must be classified with cost class, cache policy, auth, trusted-origin, and budget guard expectations.",
        actualPattern: "unknown ApiCostContract",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Add a specific ApiCostContract or verify an existing wildcard intentionally covers this route.",
        humanReadableEscalation: "Route cost and security policy must be owner-reviewed before runtime behavior changes.",
      });
    }
    if (hasMutationMethod(route.methods) && !source.includes("guardApiRequest")) {
      pushFinding(findings, {
        domain: "apiRateLimitAndCloudCost",
        severity: route.filePath.includes("/paypal/") || route.filePath.includes("/admin/") ? "critical" : "major",
        filePath: route.filePath,
        title: "State-mutating API route does not use guardApiRequest",
        evidence: [`Detected mutating methods: ${route.methods.join(", ") || "unknown"}.`],
        expectedRule: "Mutating routes must be guarded, rate limited, and origin-aware unless explicitly exempted.",
        actualPattern: "mutation route without guardApiRequest",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Add the canonical request guard with route-specific auth, trusted-origin, and rate policy after reviewing route semantics.",
        humanReadableEscalation: "Do not auto-edit route security boundaries; this route needs explicit guard review.",
      });
    }
    if (hasMutationMethod(route.methods) && !source.includes("requireTrustedOrigin: true") && !source.includes("trustedOriginRequired: false")) {
      pushFinding(findings, {
        domain: "apiRateLimitAndCloudCost",
        severity: route.filePath.includes("/paypal/") || route.filePath.includes("/admin/") ? "critical" : "major",
        filePath: route.filePath,
        line: lineOf(source, "guardApiRequest"),
        title: "State-mutating API route lacks trusted-origin evidence",
        evidence: ["Expected requireTrustedOrigin: true for POST/PUT/PATCH/DELETE unless explicitly exempted."],
        expectedRule: "Mutating routes must protect against cross-origin state changes.",
        actualPattern: "missing requireTrustedOrigin: true",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Review route origin requirements and add trusted-origin enforcement through guardApiRequest.",
        humanReadableEscalation: "Trusted-origin changes affect auth/security and require route-owner review.",
      });
    }

    const firestoreGetMatches = Array.from(source.matchAll(/\.get\(\)/gu));
    const unboundedGetMatches = firestoreGetMatches.filter((match) => {
      return !hasBoundedFirestoreGetEvidence(source, match.index ?? 0);
    });
    if (unboundedGetMatches.length > 0) {
      const first = unboundedGetMatches[0];
      pushFinding(findings, {
        domain: "apiRateLimitAndCloudCost",
        severity: "major",
        filePath: route.filePath,
        line: lineOfIndex(source, first.index ?? 0),
        title: "Firestore collection reads may be unbounded",
        evidence: [`Found ${unboundedGetMatches.length} .get() call(s) without nearby limit/pagination evidence.`],
        expectedRule: "Firestore collection reads in routes must be bounded, paginated, cached, or explicitly allowlisted.",
        actualPattern: ".get() without nearby limit",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Add a limit/pagination contract or move heavy reads behind a hot-cache/admin refresh path.",
        humanReadableEscalation: "Firestore cost behavior needs source-specific review before changing query shape.",
      });
    }
  }

  const sourceFiles = [...walkFiles(root, "src/app/api"), ...walkFiles(root, "src/lib/server"), ...walkFiles(root, "functions/src")];
  for (const filePath of sourceFiles) {
    const source = readRequired(root, filePath);
    const hasRuntimeSqlClient = /(from\s+["'](?:pg|postgres|mysql2?|@prisma\/client|prisma|drizzle-orm|kysely|sequelize|@google-cloud\/cloud-sql-connector)["'])|\bCLOUD_SQL_CONNECTION_NAME\b/u.test(source)
      || (/\bprocess\.env\.DATABASE_URL\b/u.test(source) && !(source.includes("FIREBASE_DATABASE_URL") && source.includes("resolveDatabaseUrl")));
    if (hasRuntimeSqlClient) {
      pushFinding(findings, {
        domain: "apiRateLimitAndCloudCost",
        severity: "critical",
        filePath,
        line: lineOf(source, "DATABASE_URL") ?? lineOf(source, "pg"),
        title: "Runtime SQL/Data Connect usage appears outside the approved agent mirror",
        evidence: ["SQL/Data Connect runtime is forbidden for user/payment/drop/chat/support/creator flows without explicit contract."],
        expectedRule: "Data Connect/Cloud SQL is allowed only for agent-context mirror paths unless a route contract explicitly approves runtime usage.",
        actualPattern: "runtime SQL client/env usage",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Remove runtime SQL usage or add owner-approved SQL/Data Connect cost contract before use.",
        humanReadableEscalation: "SQL runtime usage is cost-bearing and must be manually approved.",
      });
    }
    if (/@google-cloud\/vertexai/u.test(source)) {
      const hasKnownAiFences = source.includes("getAdminAiDebugAssistantSettings")
        && source.includes("isAdminAiDebugAssistantEnabled")
        && source.includes("maxOutputTokens")
        && source.includes("DEFAULT_TIMEOUT_MS")
        && source.includes("getAdminAiModelDefinitionByAlias");
      const hasTokenBudgetEvidence = source.includes("countTokens") || source.includes("maxExpectedAiTokens") || source.includes("token estimate");
      if (hasKnownAiFences && hasTokenBudgetEvidence) {
        continue;
      }
      pushFinding(findings, {
        domain: "apiRateLimitAndCloudCost",
        severity: hasKnownAiFences ? "major" : "critical",
        filePath,
        line: lineOf(source, "@google-cloud/vertexai"),
        title: "Vertex AI surface lacks full budget guard evidence",
        evidence: hasKnownAiFences
          ? ["Vertex helper has settings/model/timeout/output caps, but token estimate/count evidence is not source-visible."]
          : ["AI routes must have kill switch, model allowlist, token limits, and budget guard."],
        expectedRule: "Paid AI calls must be admin-only and fenced by deterministic cost controls.",
        actualPattern: hasKnownAiFences ? "Vertex import without token estimate/count evidence" : "Vertex import without full AI budget fence evidence",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Add or verify AI kill switch, model allowlist, token estimate/count, request limit, and debug evidence.",
        humanReadableEscalation: "Do not auto-edit paid AI route behavior; escalate cost/security review.",
      });
    }
  }
}

function scanClientHydrationAndEffects(root: string, findings: CodebaseHardeningFindingInput[]) {
  for (const filePath of GLOBAL_HYDRATION_FILES) {
    const file = readIfExists(root, filePath);
    if (!file) continue;
    for (const modalName of ["PurchaseModal", "AuthModal", "Onboarding", "CookieBanner"]) {
      if (new RegExp(`import\\s+.*${modalName}`, "u").test(file.source) && !file.source.includes("dynamic(")) {
        pushFinding(findings, {
          domain: "clientHydrationAndEffects",
          severity: modalName === "PurchaseModal" || modalName === "AuthModal" ? "major" : "moderate",
          filePath: file.filePath,
          line: lineOf(file.source, modalName),
          title: "Global shell eagerly imports an overlay or modal module",
          evidence: [`${modalName} appears in a static import in a global hydration surface.`],
          expectedRule: "Modal-only and overlay-only modules should load after paint, idle, or interaction-opened when possible.",
          actualPattern: `static import ${modalName}`,
          canAutofix: false,
          autofixConfidence: 0,
          suggestedFix: "Move non-critical overlay behind existing afterPaint/idle/interactionOpened lane without disconnecting telemetry or consent.",
          humanReadableEscalation: "Deferral may affect consent, auth, or purchase readiness; review before changing imports.",
        });
      }
    }
    if (/setInterval\(/u.test(file.source) && !file.source.includes("allowed interval")) {
      pushFinding(findings, {
        domain: "clientHydrationAndEffects",
        severity: "major",
        filePath: file.filePath,
        line: lineOf(file.source, "setInterval("),
        title: "Global hydration surface uses interval work during startup",
        evidence: ["Intervals in global shell can increase INP/startup input delay if not idle-gated."],
        expectedRule: "Global diagnostics/bridges should avoid polling and defer non-critical timers.",
        actualPattern: "setInterval in global hydration surface",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Replace with existing runtime bridge cadence, event-driven updates, or idle-gated diagnostics.",
        humanReadableEscalation: "Timer behavior requires surface-specific runtime review.",
      });
    }
  }

  const core = readIfExists(root, "src/components/CoreLayoutWrapper.tsx");
  if (core) {
    for (const marker of ["afterPaintReady", "idleReady", "data-client-hydration-optimized=\"true\"", "data-telemetry-critical-path=\"connected\""]) {
      if (!core.source.includes(marker)) {
        pushFinding(findings, {
          domain: "clientHydrationAndEffects",
          severity: "major",
          filePath: core.filePath,
          title: "Global shell is missing staged hydration evidence",
          evidence: [`Missing ${marker}.`],
          expectedRule: "Critical shell, telemetry, overlays, diagnostics, and idle bridges must be explicitly staged.",
          actualPattern: "missing staged hydration marker",
          canAutofix: false,
          autofixConfidence: 0,
          suggestedFix: "Restore the named readiness lane or debug marker without changing telemetry/privacy behavior.",
          humanReadableEscalation: "Hydration lane changes can disconnect telemetry or diagnostics if done blindly.",
        });
      }
    }
  }
}

function scanPaymentWalletAndEconomy(root: string, findings: CodebaseHardeningFindingInput[]) {
  const capture = readIfExists(root, "src/app/api/paypal/capture/route.ts");
  const creator = readIfExists(root, "src/lib/server/creator-experiences.ts");
  const unlock = readIfExists(root, "src/app/api/drops/unlock/route.ts");
  const wallet = readIfExists(root, "src/components/PurchaseModal.tsx");

  if (capture?.source.includes('economics.bonusGumDrops, "reward"') || capture?.source.includes("economics.bonusGumDrops, 'reward'")) {
    pushFinding(findings, {
      domain: "paymentWalletAndEconomyTruth",
      severity: "critical",
      filePath: capture.filePath,
      line: lineOf(capture.source, "bonusGumDrops"),
      title: "Paid pack bonus GumDrops are credited to reward source",
      evidence: ["Paid pack bonuses are paid-source GumDrops and can be spent on creator monetization surfaces."],
      expectedRule: "PayPal capture credits base and bonus paid package GumDrops into purchased balance.",
      actualPattern: "bonusGumDrops credited as reward",
      canAutofix: false,
      autofixConfidence: 0,
      suggestedFix: "Escalate to wallet/economy owner and targeted source-of-funds tests; do not auto-edit capture logic.",
      humanReadableEscalation: "Payment source-of-funds logic is explicitly outside safe repair.",
    });
  }
  if (creator && (!creator.source.includes("purchasedOnly") || !creator.source.includes("spendCreatorExperienceGumdrops"))) {
    pushFinding(findings, {
      domain: "paymentWalletAndEconomyTruth",
      severity: "critical",
      filePath: creator.filePath,
      title: "Creator monetization spend policy is missing paid-source evidence",
      evidence: ["Creator chat/subscription/request/booking must spend purchased balance only."],
      expectedRule: "Creator experience spends use spendCreatorExperienceGumdrops and persist purchasedOnly/source policy metadata.",
      actualPattern: "missing purchasedOnly/spendCreatorExperienceGumdrops evidence",
      canAutofix: false,
      autofixConfidence: 0,
      suggestedFix: "Restore canonical creator experience spend helper and targeted economy validation.",
      humanReadableEscalation: "Creator monetization business rules cannot be repaired by a generic hardening tool.",
    });
  }
  if (unlock?.source.includes("purchasedOnly")) {
    pushFinding(findings, {
      domain: "paymentWalletAndEconomyTruth",
      severity: "critical",
      filePath: unlock.filePath,
      line: lineOf(unlock.source, "purchasedOnly"),
      title: "Normal Drop unlock route appears to use paid-only policy",
      evidence: ["Normal Drops may use total/source-aware balance and must not inherit creator paid-only rules."],
      expectedRule: "Normal Drop unlocks use total GumDrops affordability; creator monetization uses purchasedOnly.",
      actualPattern: "purchasedOnly in normal Drop unlock route",
      canAutofix: false,
      autofixConfidence: 0,
      suggestedFix: "Review unlock source-of-funds policy with targeted payment unlock tests.",
      humanReadableEscalation: "Unlock and payment behavior cannot be auto-repaired.",
    });
  }
  if (wallet && (!wallet.source.includes("data-wallet-density=\"public-beta-compact\"") || wallet.source.includes("emerald"))) {
    pushFinding(findings, {
      domain: "paymentWalletAndEconomyTruth",
      severity: "moderate",
      filePath: wallet.filePath,
      title: "Wallet modal density/source markers can drift from current doctrine",
      evidence: ["Wallet UI must preserve compact package rows, purple bonus chips, split source chip, and backend source truth."],
      expectedRule: "Wallet visible density changes must not alter package math, PayPal behavior, or source-of-funds accounting.",
      actualPattern: "missing wallet compact marker or old emerald chip",
      canAutofix: wallet.source.includes("emerald"),
      autofixConfidence: wallet.source.includes("emerald") ? 0.95 : 0,
      suggestedFix: "Use check:wallet-density and exact brand-purple chip replacement if the old class remains.",
      humanReadableEscalation: "Wallet UI is payment-adjacent; only exact class cleanup is safe.",
    });
  }
}

function scanContentProtection(root: string, findings: CodebaseHardeningFindingInput[]) {
  const lockedPreviewFiles = [
    "src/components/Drops/LockedDropPreviewView.tsx",
    "src/lib/locked-drop-preview-truth.ts",
    "src/components/DropPreviewModal.tsx",
  ];
  for (const filePath of lockedPreviewFiles) {
    const file = readIfExists(root, filePath);
    if (!file) continue;
    const isDocumentedLegacyPreviewFallback = file.source.includes("Legacy fallback only") || file.source.includes('data-drop-preview-legacy-fallback="true"');
    if (/\bcontentUrls\b|\bcontentUrl\b/u.test(file.source) && !isDocumentedLegacyPreviewFallback) {
      pushFinding(findings, {
        domain: "contentProtectionAndEntitlements",
        severity: "critical",
        filePath: file.filePath,
        line: lineOf(file.source, "contentUrl"),
        title: "Locked preview source references internal content URLs",
        evidence: ["Locked previews must show cover art and safe metadata only before unlock."],
        expectedRule: "No contentUrls/contentUrl/internal thumbnails in locked preview client payloads.",
        actualPattern: "contentUrl/contentUrls in locked preview path",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Escalate to content-protection owner and preserve server-side entitlement checks.",
        humanReadableEscalation: "Content exposure must be manually reviewed; do not auto-delete route data.",
      });
    }
  }

  const viewerFiles = [
    "src/app/dashboard/viewer/page.tsx",
    "src/app/dashboard/viewer/ViewerClient.tsx",
    "src/app/api/content/[dropId]/route.ts",
  ];
  for (const filePath of viewerFiles) {
    const file = readIfExists(root, filePath);
    if (!file) continue;
    if (!/entitlement|unlocked|ownership|requireAuth|verify/u.test(file.source)) {
      pushFinding(findings, {
        domain: "contentProtectionAndEntitlements",
        severity: "major",
        filePath: file.filePath,
        title: "Viewer/content path lacks obvious entitlement evidence",
        evidence: ["Viewer routes and media APIs must prove ownership/unlock before exposing content."],
        expectedRule: "Locked content access is gated server-side and UI-side by entitlement/ownership truth.",
        actualPattern: "missing entitlement/unlocked/ownership evidence",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Run targeted content-protection validation and add explicit entitlement guard if missing.",
        humanReadableEscalation: "Content access cannot be auto-repaired from a source heuristic.",
      });
    }
  }
}

function scanTelemetryPrivacyDebug(root: string, findings: CodebaseHardeningFindingInput[]) {
  const telemetry = readIfExists(root, "src/lib/telemetry.ts");
  if (telemetry) {
    for (const marker of ["privacy", "consent", "session_id", "auth_state"]) {
      if (!telemetry.source.toLowerCase().includes(marker)) {
        pushFinding(findings, {
          domain: "telemetryPrivacyAndDebugEvidence",
          severity: "critical",
          filePath: telemetry.filePath,
          title: "Telemetry enrichment or privacy gate marker is missing",
          evidence: [`Missing telemetry marker ${marker}.`],
          expectedRule: "Telemetry must preserve consent, route/session/auth enrichment, and privacy gates.",
          actualPattern: "missing telemetry privacy/enrichment marker",
          canAutofix: false,
          autofixConfidence: 0,
          suggestedFix: "Restore canonical telemetry enrichment/gating before touching event payloads.",
          humanReadableEscalation: "Telemetry/privacy changes require explicit owner review.",
        });
      }
    }
  }

  for (const filePath of CRITICAL_TELEMETRY_FILES) {
    const file = readIfExists(root, filePath);
    if (!file || !file.source.includes("trackEvent(")) continue;
    const missingSourceComponentEvents: string[] = [];
    let firstMissingIndex: number | undefined;
    for (const match of file.source.matchAll(/trackEvent\(\s*["'`]([^"'`]+)["'`][\s\S]{0,700}?\)/gu)) {
      const call = match[0];
      if (!hasCanonicalTelemetrySourceComponentEvidence(file.source, call, match.index ?? 0)) {
        missingSourceComponentEvents.push(match[1]);
        firstMissingIndex ??= match.index;
      }
    }
    if (missingSourceComponentEvents.length > 0) {
      pushFinding(findings, {
        domain: "telemetryPrivacyAndDebugEvidence",
        severity: "major",
        filePath: file.filePath,
        line: firstMissingIndex === undefined ? undefined : lineOfIndex(file.source, firstMissingIndex),
        title: "Critical UI telemetry calls lack source_component",
        evidence: [`Events without source_component in scanned call window: ${missingSourceComponentEvents.slice(0, 8).join(", ")}${missingSourceComponentEvents.length > 8 ? ", ..." : ""}.`],
        expectedRule: "Critical CTA/action telemetry includes source_component and relevant entity/reason context.",
        actualPattern: "trackEvent without source_component",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Add source_component through the canonical telemetry payload and update catalog/tests if needed.",
        humanReadableEscalation: "Telemetry payload changes need catalog parity review.",
      });
    }
  }

  const debugEvidence = readIfExists(root, "src/lib/debug-evidence-contract.ts");
  if (!debugEvidence) {
    pushFinding(findings, {
      domain: "telemetryPrivacyAndDebugEvidence",
      severity: "major",
      filePath: "src/lib/debug-evidence-contract.ts",
      title: "Structured debug evidence contract is missing",
      evidence: ["Debug evidence must be fingerprinted, stored, and injectable into deterministic audits."],
      expectedRule: "Runtime/client/server/admin findings use structured debug evidence buckets.",
      actualPattern: "missing debug evidence contract",
      canAutofix: false,
      autofixConfidence: 0,
      suggestedFix: "Restore debug evidence contract and check:debug-evidence-pipeline.",
      humanReadableEscalation: "Diagnostics must remain structured and non-blocking.",
    });
  }
  const behavioral = readIfExists(root, "functions/src/behavioral-intelligence-runtime.ts");
  if (behavioral && (!behavioral.source.includes("watch_session_rollup") || !behavioral.source.includes("legacy_page_duration"))) {
    pushFinding(findings, {
      domain: "telemetryPrivacyAndDebugEvidence",
      severity: "major",
      filePath: behavioral.filePath,
      title: "Behavioral scoring lacks watch rollup or legacy fallback source labels",
      evidence: ["Watch time must not be inferred from page duration without source confidence labels."],
      expectedRule: "Behavioral intelligence prefers watch-session rollups and labels legacy page duration fallback.",
      actualPattern: "missing watch_session_rollup/legacy_page_duration",
      canAutofix: false,
      autofixConfidence: 0,
      suggestedFix: "Restore watch-time truth scoring and targeted watch-time validation.",
      humanReadableEscalation: "Behavioral analytics changes need telemetry and privacy review.",
    });
  }
}

function scanDeviceUiAndImages(root: string, findings: CodebaseHardeningFindingInput[]) {
  for (const filePath of DEVICE_UI_FILES) {
    const file = readIfExists(root, filePath);
    if (!file) continue;
    if (file.source.includes("100vh")) {
      pushFinding(findings, {
        domain: "deviceUiAndImagePerformance",
        severity: file.filePath.includes("Chat") || file.filePath.includes("LockedDropPreview") ? "critical" : "major",
        filePath: file.filePath,
        line: lineOf(file.source, "100vh"),
        title: "Shell-critical UI uses raw 100vh",
        evidence: ["Mobile browser/PWA chrome can make 100vh overlap nav or CTA regions."],
        expectedRule: "Use 100dvh or shared user-mobile-shell viewport tokens in shell/chat/preview/wallet surfaces.",
        actualPattern: "100vh",
        canAutofix: true,
        autofixConfidence: 0.95,
        suggestedFix: "Replace exact shell-safe 100vh with 100dvh only in approved shell files.",
        humanReadableEscalation: "Keyboard/runtime behavior still needs human review after source fix.",
      });
    }
  }
  const imagePolicy = readIfExists(root, "src/lib/image-loading-policy.ts");
  if (!imagePolicy) {
    pushFinding(findings, {
      domain: "deviceUiAndImagePerformance",
      severity: "major",
      filePath: "src/lib/image-loading-policy.ts",
      title: "Sitewide image loading policy is missing",
      evidence: ["Image LCP/lazy/sizes policy must be surface-based."],
      expectedRule: "Critical image surfaces consume src/lib/image-loading-policy.ts.",
      actualPattern: "missing image-loading-policy.ts",
      canAutofix: false,
      autofixConfidence: 0,
      suggestedFix: "Restore sitewide image optimization policy and validator.",
      humanReadableEscalation: "Image loading should be repaired through source policy, not browser audit guesswork.",
    });
  }
  for (const filePath of walkFiles(root, "src").filter((file) => /tsx?$/u.test(file))) {
    const source = readRequired(root, filePath);
    for (const match of source.matchAll(/<(?:Image|NextImage)\b[\s\S]{0,900}?\bfill\b[\s\S]{0,900}?\/?>/gu)) {
      if (!match[0].includes("sizes=")) {
        pushFinding(findings, {
          domain: "deviceUiAndImagePerformance",
          severity: "major",
          filePath,
          line: lineOfIndex(source, match.index ?? 0),
          title: "Fill image is missing sizes",
          evidence: ["Next Image fill without sizes can download oversized assets."],
          expectedRule: "All fill images must carry accurate sizes from the image policy.",
          actualPattern: "fill image without sizes",
          canAutofix: false,
          autofixConfidence: 0,
          suggestedFix: "Apply getImageLoadingPolicy/getImagePolicyDataAttributes or explicit sizes for the surface.",
          humanReadableEscalation: "Image sizing requires surface knowledge; do not guess arbitrary sizes.",
        });
      }
    }
  }
}

function scanSupportNotificationsChat(root: string, findings: CodebaseHardeningFindingInput[]) {
  const requiredRoutes = [
    "src/app/api/admin/support/threads/route.ts",
    "src/app/api/admin/support/threads/[threadId]/route.ts",
    "src/app/api/admin/support/threads/[threadId]/messages/route.ts",
  ];
  for (const route of requiredRoutes) {
    if (!existsSync(join(root, route))) {
      pushFinding(findings, {
        domain: "supportNotificationsAndChatReliability",
        severity: "major",
        filePath: route,
        title: "Admin support route is missing",
        evidence: ["Admin support must list, read nested messages, and reply without weakening user privacy."],
        expectedRule: "Admin support inbox uses scoped admin routes; users remain own-thread scoped.",
        actualPattern: "missing admin support route",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Add the missing route with admin auth, trusted origin for mutations, and verification metadata.",
        humanReadableEscalation: "Support privacy and admin visibility require targeted route tests.",
      });
    }
  }
  const chat = readIfExists(root, "src/components/Chat/ChatExperience.tsx");
  if (chat && (!chat.source.includes("data-chat-input-focus-stable=\"true\"") || /onFocus=\{[\s\S]{0,260}reportClientIssue/u.test(chat.source))) {
    pushFinding(findings, {
      domain: "supportNotificationsAndChatReliability",
      severity: "major",
      filePath: chat.filePath,
      line: lineOf(chat.source, "onFocus"),
      title: "Chat focus path may regress mobile shell stability",
      evidence: ["Chat focus diagnostics must be deferred and input shell anchored under navbar."],
      expectedRule: "Chat route owns internal viewport and exposes focus-stability markers.",
      actualPattern: "missing stable focus marker or hot-path diagnostics",
      canAutofix: false,
      autofixConfidence: 0,
      suggestedFix: "Run check:user-chat-shell-routing and defer diagnostics out of tap/focus paths.",
      humanReadableEscalation: "Keyboard layout behavior cannot be safely auto-repaired.",
    });
  }
  for (const route of ["src/app/api/creator/bookings/route.ts", "src/app/api/creator/subscriptions/route.ts"]) {
    const file = readIfExists(root, route);
    if (!file) continue;
    if (file.source.includes("Internal server error") && !file.source.includes("code:")) {
      pushFinding(findings, {
        domain: "supportNotificationsAndChatReliability",
        severity: "major",
        filePath: file.filePath,
        line: lineOf(file.source, "Internal server error"),
        title: "Creator monetization route may surface vague expected failures",
        evidence: ["Creator bookings/Fan Pass expected failures must return typed safe codes."],
        expectedRule: "Known user-action failures return specific safe codes and client problem copy.",
        actualPattern: "Internal server error without typed problem code evidence",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Map expected failures to typed response helpers and targeted validators.",
        humanReadableEscalation: "Creator monetization errors touch paid-source spend and must be tested narrowly.",
      });
    }
  }
}

function scanLegacyOrphans(root: string, findings: CodebaseHardeningFindingInput[]) {
  const modal = readIfExists(root, "src/components/DropPreviewModal.tsx");
  const drops = readIfExists(root, "src/app/drops/DropsClient.tsx");
  if (modal && !modal.source.includes("Legacy fallback only") && !modal.source.includes('data-drop-preview-legacy-fallback="true"')) {
    pushFinding(findings, {
      domain: "legacyOrphanCleanup",
      severity: "major",
      filePath: modal.filePath,
      title: "DropPreviewModal is not marked as legacy fallback",
      evidence: ["Full-page locked preview is canonical; modal fallback must be explicitly deprecated."],
      expectedRule: "Legacy preview modal remains only as documented fallback and must not own locked preview entry points.",
      actualPattern: "missing legacy fallback marker",
      canAutofix: false,
      autofixConfidence: 0,
      suggestedFix: "Add explicit legacy marker/comment only after confirming canonical entry points route to full-page preview.",
      humanReadableEscalation: "Route migration cleanup must not delete fallback before validators confirm no dependency.",
    });
  }
  if (drops && drops.source.includes("setPreviewDrop") && !drops.source.includes("/preview")) {
    pushFinding(findings, {
      domain: "legacyOrphanCleanup",
      severity: "major",
      filePath: drops.filePath,
      line: lineOf(drops.source, "setPreviewDrop"),
      title: "Drops page may still own modal preview flow",
      evidence: ["/drops?drop= should redirect/handoff to full-page preview for locked Drops."],
      expectedRule: "Locked preview entry points prefer /drops/[id]/preview; modal is legacy fallback only.",
      actualPattern: "setPreviewDrop without preview route handoff evidence",
      canAutofix: false,
      autofixConfidence: 0,
      suggestedFix: "Route locked preview actions to the full-page preview route and preserve legacy handoff only.",
      humanReadableEscalation: "Route migration needs content-protection review.",
    });
  }
  for (const filePath of walkFiles(root, "src")) {
    const source = readRequired(root, filePath);
    const coinsVocabularyIndex = findProductFacingCoinsVocabularyIndex(source);
    if (coinsVocabularyIndex !== undefined) {
      pushFinding(findings, {
        domain: "legacyOrphanCleanup",
        severity: "moderate",
        filePath,
        line: lineOfIndex(source, coinsVocabularyIndex),
        title: "Stale economy vocabulary remains in source",
        evidence: ["Approved economy term is GumDrops; Coins is forbidden vocabulary."],
        expectedRule: "User/admin economy copy and labels use GumDrops.",
        actualPattern: "Coins",
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Replace only if the occurrence is product-facing copy and update copy validators.",
        humanReadableEscalation: "Vocabulary cleanup can touch copy doctrine; review before editing visible text.",
      });
    }
  }
}

function dedupeFindings(rawFindings: CodebaseHardeningFindingInput[]) {
  const findings = rawFindings.map(buildHardeningFinding);
  const byKey = new Map<string, CodebaseHardeningFinding>();
  for (const finding of findings) {
    const key = [
      finding.domain,
      finding.filePath,
      finding.line ?? "",
      finding.title.toLowerCase(),
      finding.actualPattern,
    ].join("|");
    const existing = byKey.get(key);
    if (!existing || getHardeningSeverityRank(finding.severity) > getHardeningSeverityRank(existing.severity)) {
      byKey.set(key, finding);
    } else if (existing) {
      byKey.set(key, {
        ...existing,
        evidence: Array.from(new Set([...existing.evidence, ...finding.evidence])),
      });
    }
  }
  return Array.from(byKey.values()).sort((left, right) =>
    getHardeningSeverityRank(right.severity) - getHardeningSeverityRank(left.severity)
    || left.filePath.localeCompare(right.filePath)
    || left.title.localeCompare(right.title));
}

function scoreDomain(findings: CodebaseHardeningFinding[]) {
  const penalty = findings.reduce((sum, finding) => sum + CODEBASE_HARDENING_SEVERITY_PENALTIES[finding.severity], 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

function buildFilesMostAtRisk(findings: CodebaseHardeningFinding[]) {
  const risk = new Map<string, { findingCount: number; highestSeverity: CodebaseHardeningSeverity }>();
  for (const finding of findings) {
    const existing = risk.get(finding.filePath);
    if (!existing) {
      risk.set(finding.filePath, { findingCount: 1, highestSeverity: finding.severity });
      continue;
    }
    existing.findingCount += 1;
    if (getHardeningSeverityRank(finding.severity) > getHardeningSeverityRank(existing.highestSeverity)) {
      existing.highestSeverity = finding.severity;
    }
  }
  return Array.from(risk.entries())
    .map(([filePath, value]) => ({ filePath, ...value }))
    .sort((left, right) =>
      getHardeningSeverityRank(right.highestSeverity) - getHardeningSeverityRank(left.highestSeverity)
      || right.findingCount - left.findingCount
      || left.filePath.localeCompare(right.filePath))
    .slice(0, 12);
}

function buildRecommendedFixOrder(findings: CodebaseHardeningFinding[]) {
  if (findings.length === 0) {
    return ["No current hardening findings. Keep using score:hardening before broad audits."];
  }
  const domainLabels: Record<CodebaseHardeningDomain, string> = {
    routeCachingAndDataCost: "Classify route caching and eliminate unnecessary no-store/client refetch cost.",
    clientHydrationAndEffects: "Defer global hydration modules and remove startup timer/effect work.",
    apiRateLimitAndCloudCost: "Close API guard, rate-limit, trusted-origin, and cloud-cost gaps.",
    paymentWalletAndEconomyTruth: "Escalate any source-of-funds/payment truth finding before UI changes.",
    contentProtectionAndEntitlements: "Repair content entitlement and locked-preview safety before runtime testing.",
    telemetryPrivacyAndDebugEvidence: "Restore consent-aware telemetry, source_component payloads, and debug evidence.",
    deviceUiAndImagePerformance: "Fix deterministic shell/image/device-token violations before screenshots.",
    supportNotificationsAndChatReliability: "Repair support/chat/notification/creator typed-error reliability with targeted tests.",
    legacyOrphanCleanup: "Quarantine stale modal, vocabulary, and duplicate logic only when validators prove safety.",
  };
  return CODEBASE_HARDENING_DOMAINS
    .filter((domain) => findings.some((finding) => finding.domain === domain))
    .map((domain) => domainLabels[domain]);
}

function buildLegacyCleanupPlan(findings: CodebaseHardeningFinding[]) {
  const legacyFindings = findings.filter((finding) => finding.domain === "legacyOrphanCleanup");
  if (legacyFindings.length === 0) {
    return ["No legacy cleanup blockers found by the deterministic hardening scan."];
  }
  return legacyFindings.slice(0, 8).map((finding) => `${finding.filePath}: ${finding.suggestedFix}`);
}

export function buildCodebaseHardeningReport(root = process.cwd(), safeAutofixesApplied = 0): CodebaseHardeningReport {
  const rawFindings: CodebaseHardeningFindingInput[] = [];
  const routeCostClassificationSummary = classifyRoutes(root);

  scanRouteCachingAndDataCost(root, rawFindings);
  scanClientHydrationAndEffects(root, rawFindings);
  scanApiRateLimitAndCloudCost(root, rawFindings, routeCostClassificationSummary);
  scanPaymentWalletAndEconomy(root, rawFindings);
  scanContentProtection(root, rawFindings);
  scanTelemetryPrivacyDebug(root, rawFindings);
  scanDeviceUiAndImages(root, rawFindings);
  scanSupportNotificationsChat(root, rawFindings);
  scanLegacyOrphans(root, rawFindings);

  const findings = dedupeFindings(rawFindings);
  const domainScores = {} as CodebaseHardeningReport["domainScores"];
  let weightedScore = 0;
  let totalWeight = 0;

  for (const domain of CODEBASE_HARDENING_DOMAINS) {
    const domainFindings = findings.filter((finding) => finding.domain === domain);
    const score = scoreDomain(domainFindings);
    const criticalCount = domainFindings.filter((finding) => finding.severity === "critical").length;
    const majorCount = domainFindings.filter((finding) => finding.severity === "major").length;
    const weight = CODEBASE_HARDENING_DOMAIN_WEIGHTS[domain];
    domainScores[domain] = {
      weight,
      score,
      status: getHardeningStatus(score, criticalCount > 0, majorCount > 0),
      findingCount: domainFindings.length,
      criticalCount,
      majorCount,
    };
    weightedScore += score * weight;
    totalWeight += weight;
  }

  const criticalFindings = findings.filter((finding) => finding.severity === "critical");
  const majorCount = findings.filter((finding) => finding.severity === "major").length;
  const overallScore = Math.round(weightedScore / Math.max(1, totalWeight));
  const status = getHardeningStatus(overallScore, criticalFindings.length > 0, majorCount > 0);

  return {
    generatedAt: new Date().toISOString(),
    overallScore,
    status,
    domainScores,
    findings,
    criticalFindings,
    topFindings: findings.slice(0, 10),
    safeAutofixesAvailable: findings.filter((finding) => finding.canAutofix && finding.autofixConfidence >= 0.95).length,
    safeAutofixesApplied,
    recommendedFixOrder: buildRecommendedFixOrder(findings),
    minimalCommands: [...CODEBASE_HARDENING_ALLOWED_COMMANDS],
    forbiddenCommands: [...CODEBASE_HARDENING_FORBIDDEN_COMMANDS],
    commandBudget: {
      allowedCommands: [...CODEBASE_HARDENING_ALLOWED_COMMANDS],
      forbiddenCommands: [...CODEBASE_HARDENING_FORBIDDEN_COMMANDS],
      maxCommands: 6,
    },
    filesMostAtRisk: buildFilesMostAtRisk(findings),
    routeCostClassificationSummary,
    legacyCleanupPlan: buildLegacyCleanupPlan(findings),
    summary: `${CODEBASE_HARDENING_DOCTRINE_NOTE} Current report found ${findings.length} findings across ${CODEBASE_HARDENING_DOMAINS.length} domains.`,
  };
}

export function writeCodebaseHardeningReport(report: CodebaseHardeningReport, root = process.cwd()) {
  const outputPath = join(root, CODEBASE_HARDENING_REPORT_PATH);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export function printCodebaseHardeningSummary(report: CodebaseHardeningReport) {
  console.log(`Codebase hardening: ${report.overallScore}/${report.status}`);
  console.log(`Findings: ${report.findings.length}; critical: ${report.criticalFindings.length}; safe fixes: ${report.safeAutofixesAvailable}`);
  console.log("Top findings:");
  for (const finding of report.topFindings.slice(0, 5)) {
    console.log(`- [${finding.severity}] ${finding.domain}: ${finding.title} (${finding.filePath}${finding.line ? `:${finding.line}` : ""})`);
  }
  console.log("Minimal commands:");
  for (const command of report.minimalCommands.slice(0, 3)) {
    console.log(`- ${command}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = buildCodebaseHardeningReport();
  writeCodebaseHardeningReport(report);
  printCodebaseHardeningSummary(report);
}
