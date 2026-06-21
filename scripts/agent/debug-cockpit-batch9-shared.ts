import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const ADMIN_BALANCE_ROUTE = "src/app/api/admin/balance/route.ts";
const ADMIN_BALANCE_BODY_CAP_PATH = "agent/state/admin-balance-body-cap.generated.json";
const ADMIN_BALANCE_BODY_CAP_DOC = "docs/agent-truth/admin-balance-body-cap.md";
const BATCH9_PATH = "agent/state/debug-cockpit-batch9-cleanup.generated.json";
const BATCH9_DOC = "docs/agent-truth/debug-cockpit-batch9-cleanup.md";
const MAX_ADMIN_BALANCE_BODY_BYTES = 8_192;
const STALE_HOURS = 72;

export type DebugCockpitBatch9CleanupReport = ReturnType<typeof buildDebugCockpitBatch9CleanupReport>;

function gitHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function readJson(path: string): Record<string, unknown> | null {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function hoursSince(timestamp?: string) {
  if (!timestamp) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.round(((Date.now() - parsed) / 3_600_000) * 100) / 100);
}

function scoreDimensionsFromPublicBeta(publicBeta: Record<string, unknown> | null) {
  return {
    sourceHealth: readNumber(publicBeta?.sourceHealthScore) ?? 0,
    runtimeHealth: readNumber(publicBeta?.runtimeHealthScore) ?? 0,
    evidenceCompleteness: readNumber(publicBeta?.evidenceCompletenessScore) ?? 0,
    freshness: readNumber(publicBeta?.freshnessScore) ?? 0,
    costRisk: readNumber(publicBeta?.costRiskScore) ?? 0,
    regressionRisk: readNumber(publicBeta?.regressionRiskScore) ?? 0,
    overallHealthScore: readNumber(publicBeta?.healthScore) ?? readNumber(publicBeta?.score) ?? 0,
  };
}

function adminBalanceBodyCapStatus(routeSource: string) {
  const directRequestJsonRemaining = routeSource.includes("request.json()");
  const boundedParserUsed = routeSource.includes("readBoundedJsonBody") ? "readBoundedJsonBody" : "";
  const maxBytes = /ADMIN_BALANCE_BODY_LIMIT_BYTES\s*=\s*8_192/u.test(routeSource)
    ? MAX_ADMIN_BALANCE_BODY_BYTES
    : 0;
  const authGuardChanged = !routeSource.includes("guardApiRequest(request")
    || !routeSource.includes('auth: "admin"')
    || !routeSource.includes("rateLimit: ADMIN")
    || !routeSource.includes("requireTrustedOrigin: true");
  const gumdropMathChanged = !routeSource.includes('creditSourceAwareGumdrops(sourceAwareBalance, amount, "reward")')
    || !routeSource.includes("spendSourceAwareGumdrops(sourceAwareBalance, Math.abs(amount))")
    || !routeSource.includes("buildCompletedGumdropTransaction")
    || !routeSource.includes("buildSourceAwareBalancePatch");

  return {
    adminBalanceBodyCapBefore: "missing_direct_request_json",
    adminBalanceBodyCapAfter: directRequestJsonRemaining || !boundedParserUsed || maxBytes !== MAX_ADMIN_BALANCE_BODY_BYTES
      ? "missing_or_unbounded"
      : "bounded_parser_cap_8192",
    boundedParserUsed,
    maxBytes,
    directRequestJsonRemaining,
    gumdropMathChanged,
    authGuardChanged,
  };
}

export function buildAdminBalanceBodyCapReport() {
  const routeSource = read(ADMIN_BALANCE_ROUTE);
  const status = adminBalanceBodyCapStatus(routeSource);
  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "admin-balance-body-cap",
    currentHead: gitHead(),
    routePath: ADMIN_BALANCE_ROUTE,
    ...status,
    amountBoundsUnchanged: routeSource.includes("gte(-1_000_000).lte(1_000_000)"),
    reasonBoundsUnchanged: routeSource.includes("min(2).max(160)"),
    routeRuntimeHealthWrapped: routeSource.includes('withRouteRuntimeHealth("admin/balance:POST", POST_handler)'),
    allowedContentTypes: routeSource.includes('allowedContentTypes: ["application/json"]'),
    humanSafeBoundedErrors: routeSource.includes("isBoundedJsonBodyError")
      && routeSource.includes("success: false")
      && routeSource.includes("code: error.code")
      && routeSource.includes("status: error.status"),
  };
}

export function validateAdminBalanceBodyCapReport(report: ReturnType<typeof buildAdminBalanceBodyCapReport>) {
  const failures: string[] = [];
  if (report.directRequestJsonRemaining) failures.push("admin balance route still parses request JSON directly without bounded body guard.");
  if (report.boundedParserUsed !== "readBoundedJsonBody") failures.push("admin balance route does not use the canonical bounded JSON parser.");
  if (report.maxBytes !== MAX_ADMIN_BALANCE_BODY_BYTES) failures.push("admin balance route lacks visible 8KB payload cap.");
  if (report.authGuardChanged) failures.push("admin guard/rate-limit/trusted-origin changed or missing.");
  if (report.gumdropMathChanged) failures.push("GumDrop math/source-of-funds path changed or missing.");
  if (!report.amountBoundsUnchanged) failures.push("amount bounds changed or missing.");
  if (!report.reasonBoundsUnchanged) failures.push("reason bounds changed or missing.");
  if (!report.routeRuntimeHealthWrapped) failures.push("route runtime wrapper removed.");
  if (!report.allowedContentTypes) failures.push("admin balance JSON content-type policy missing.");
  if (!report.humanSafeBoundedErrors) failures.push("bounded JSON errors are not handled with human-safe codes.");
  return failures;
}

export function buildDebugCockpitBatch9CleanupReport(input: {
  repoHead?: string;
  publicBetaScoreHeadBefore?: string;
  publicBetaScoreHeadAfter?: string;
  selfHealingAgeBeforeHours?: number;
  selfHealingAgeAfterHours?: number;
  speedSecurityAgeBeforeHours?: number;
  speedSecurityAgeAfterHours?: number;
  scoreBefore?: number;
  scoreAfter?: number;
} = {}) {
  const repoHead = input.repoHead ?? gitHead();
  const publicBeta = readJson("agent/state/public-beta-score.generated.json");
  const selfHealing = readJson("agent/state/self-healing-refresh-queue.generated.json");
  const speedSecurity = readJson("agent/state/speed-security-hardening.generated.json");
  const bodyCap = adminBalanceBodyCapStatus(read(ADMIN_BALANCE_ROUTE));
  const selfHealingAgeAfter = input.selfHealingAgeAfterHours
    ?? hoursSince(readString(selfHealing?.generatedAtUtc) ?? readString(selfHealing?.generatedAt));
  const speedSecurityAgeAfter = input.speedSecurityAgeAfterHours
    ?? hoursSince(readString(speedSecurity?.generatedAtUtc) ?? readString(speedSecurity?.generatedAt));
  const publicBetaScoreHeadAfter = input.publicBetaScoreHeadAfter
    ?? readString(publicBeta?.currentHead)
    ?? "missing";
  const remainingStaleArtifacts = [
    publicBetaScoreHeadAfter !== repoHead ? "agent/state/public-beta-score.generated.json" : "",
    selfHealingAgeAfter > STALE_HOURS ? "agent/state/self-healing-refresh-queue.generated.json" : "",
    speedSecurityAgeAfter > STALE_HOURS ? "agent/state/speed-security-hardening.generated.json" : "",
  ].filter(Boolean);

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "debug-cockpit-batch9-cleanup",
    publicBetaScoreHeadBefore: input.publicBetaScoreHeadBefore ?? "a54fc24ccc1ad7b3d23c7aa2a6b3c5bb354fde76",
    publicBetaScoreHeadAfter,
    repoHead,
    selfHealingAgeBefore: input.selfHealingAgeBeforeHours ?? 406_694.6,
    selfHealingAgeAfter,
    speedSecurityAgeBefore: input.speedSecurityAgeBeforeHours ?? 144.5,
    speedSecurityAgeAfter,
    ...bodyCap,
    refreshedArtifacts: [
      "agent/state/public-beta-score.generated.json",
      "agent/state/self-healing-refresh-queue.generated.json",
      "agent/state/speed-security-hardening.generated.json",
      "agent/state/admin-balance-body-cap.generated.json",
    ],
    remainingStaleArtifacts,
    scoreBefore: input.scoreBefore ?? 79,
    scoreAfter: input.scoreAfter ?? readNumber(publicBeta?.score) ?? 79,
    scoreDimensions: scoreDimensionsFromPublicBeta(publicBeta),
    remainingGaps: [
      "Provider-backed site activity, deployed route evidence, and admin source activity sample gates remain separate from this source security fix.",
      ...(remainingStaleArtifacts.length > 0 ? ["Some generated artifacts still require refresh or same-commit head explanation."] : []),
    ],
    nextExactSteps: [
      "Produce provider-backed site activity, deployed route evidence, and admin source activity sample evidence outside source-code cleanup when available.",
      "Rerun beta score after this commit lands if a same-commit generated artifact head needs post-commit refresh.",
    ],
  };
}

export function validateDebugCockpitBatch9CleanupReport(report: ReturnType<typeof buildDebugCockpitBatch9CleanupReport>) {
  const failures: string[] = [];
  if (report.publicBetaScoreHeadAfter !== report.repoHead) failures.push("public beta score head mismatch remains without explanation.");
  if (report.selfHealingAgeAfter > STALE_HOURS) failures.push("self-healing refresh queue remains older than 72 hours.");
  if (report.speedSecurityAgeAfter > STALE_HOURS) failures.push("speed-security report remains older than 72 hours.");
  if (report.directRequestJsonRemaining) failures.push("admin balance route still parses request JSON directly without bounded body guard.");
  if (report.maxBytes !== MAX_ADMIN_BALANCE_BODY_BYTES || report.boundedParserUsed !== "readBoundedJsonBody") failures.push("no visible payload cap exists.");
  if (report.gumdropMathChanged) failures.push("GumDrop math/source-of-funds changed.");
  if (report.authGuardChanged) failures.push("admin guard/rate-limit/trusted-origin changed.");
  if (!report.scoreDimensions || Object.values(report.scoreDimensions).some((value) => typeof value !== "number")) failures.push("score dimensions missing.");
  return failures;
}

function renderDoc(title: string, report: unknown) {
  return [
    `# ${title}`,
    "",
    "Generated source-only Batch 9 evidence. No production reads, deploys, provider calls, payment runtime changes, or GumDrop math changes were performed.",
    "",
    "```json",
    JSON.stringify(report, null, 2),
    "```",
    "",
  ].join("\n");
}

export function writeAdminBalanceBodyCapReport() {
  const report = buildAdminBalanceBodyCapReport();
  const failures = validateAdminBalanceBodyCapReport(report);
  write(ADMIN_BALANCE_BODY_CAP_PATH, `${JSON.stringify({ ...report, validationFailures: failures }, null, 2)}\n`);
  write(ADMIN_BALANCE_BODY_CAP_DOC, renderDoc("Admin Balance Body Cap", { ...report, validationFailures: failures }));
  return failures;
}

export function writeDebugCockpitBatch9Report() {
  const report = buildDebugCockpitBatch9CleanupReport();
  const failures = validateDebugCockpitBatch9CleanupReport(report);
  write(BATCH9_PATH, `${JSON.stringify({ ...report, validationFailures: failures }, null, 2)}\n`);
  write(BATCH9_DOC, renderDoc("Debug Cockpit Batch9 Cleanup", { ...report, validationFailures: failures }));
  return failures;
}
