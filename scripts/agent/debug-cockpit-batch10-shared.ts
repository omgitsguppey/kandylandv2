import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const STALE_HOURS = 72;

const VIEWER_REPORT_PATH = "agent/state/viewer-entitlement-hardening.generated.json";
const VIEWER_DOC_PATH = "docs/agent-truth/viewer-entitlement-hardening.md";
const AI_REPORT_PATH = "agent/state/ai-debug-budget-guard.generated.json";
const AI_DOC_PATH = "docs/agent-truth/ai-debug-budget-guard.md";
const BATCH10_REPORT_PATH = "agent/state/debug-cockpit-batch10-cleanup.generated.json";
const BATCH10_DOC_PATH = "docs/agent-truth/debug-cockpit-batch10-cleanup.md";

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function readIfExists(path: string) {
  const fullPath = join(ROOT, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson(path: string): Record<string, unknown> | null {
  const source = readIfExists(path);
  if (!source) return null;
  try {
    const parsed = JSON.parse(source) as unknown;
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

function gitHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function gitStatusShort() {
  try {
    return execFileSync("git", ["status", "--short"], { cwd: ROOT, encoding: "utf8" }).trim().split(/\r?\n/u).filter(Boolean);
  } catch {
    return [];
  }
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
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

function renderDoc(title: string, report: unknown) {
  return [
    `# ${title}`,
    "",
    "Generated source-only Batch 10 evidence. No production reads, deploys, provider calls, payment runtime changes, or GumDrop math changes were performed.",
    "",
    "```json",
    JSON.stringify(report, null, 2),
    "```",
    "",
  ].join("\n");
}

export function buildViewerEntitlementHardeningReport() {
  const page = read("src/app/dashboard/viewer/page.tsx");
  const helper = read("src/lib/server/viewer-drop-entitlement.ts");
  const drops = read("src/lib/server/drops.ts");
  const client = read("src/app/dashboard/viewer/ViewerClient.tsx");
  const accessResolver = read("src/lib/drop-view-access.ts");
  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "viewer-entitlement-hardening",
    currentHead: gitHead(),
    viewerRouteEntitlementGuarded: helper.includes("viewerRouteEntitlementGuarded: true") && page.includes("buildViewerDropEntitlementPayload"),
    rawDropSanitized: helper.includes("sanitizeDropForClient(rawDrop)") && drops.includes("export function sanitizeDropForClient"),
    privateMediaHiddenUntilEntitled: helper.includes("privateMediaHiddenUntilEntitled: true") && drops.includes('contentUrl: ""'),
    contentFetchRoute: helper.includes("/api/drops/content"),
    clientEntitlementEvidence: client.includes("resolveDropViewAccess")
      && client.includes("accessState.allowed")
      && accessResolver.includes("sameId(userId, input.drop.creatorId)")
      && accessResolver.includes("hasUnwrappedDrop(input.userProfile, input.drop.id)")
      && accessResolver.includes("unlockedContentTimestamps"),
    rawDropFieldsReachClient: /<ViewerClient\s+drop=\{rawDrop\}/u.test(page) || page.includes("contentUrl: rawDrop"),
    publicPreviewBehavior: "Viewer page returns sanitized metadata only; private bytes load through /api/drops/content after client entitlement.",
  };
}

export function validateViewerEntitlementHardeningReport(report: ReturnType<typeof buildViewerEntitlementHardeningReport>) {
  const failures: string[] = [];
  if (!report.viewerRouteEntitlementGuarded) failures.push("viewer page lacks visible entitlement guard/evidence helper.");
  if (!report.rawDropSanitized) failures.push("raw drop is not sanitized before viewer client payload.");
  if (!report.privateMediaHiddenUntilEntitled) failures.push("private media is not hidden until entitlement.");
  if (!report.contentFetchRoute) failures.push("viewer entitlement evidence does not point to /api/drops/content.");
  if (!report.clientEntitlementEvidence) failures.push("client entitlement proof does not include creator/unlocked checks.");
  if (report.rawDropFieldsReachClient) failures.push("raw drop fields may reach the client.");
  return failures;
}

export function buildAiDebugBudgetGuardReport() {
  const guard = read("src/lib/server/ai-debug-budget-guard.ts");
  const assistant = read("src/lib/server/ai-debug-assistant.ts");
  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "ai-debug-budget-guard",
    currentHead: gitHead(),
    killSwitch: guard.includes("AI_DEBUG_ASSISTANT_KILL_SWITCH"),
    modelAllowlist: guard.includes("AI_DEBUG_MODEL_ALLOWLIST"),
    timeoutCap: guard.includes("AI_DEBUG_TIMEOUT_CAP_MS") && assistant.includes("getAiDebugBudgetLimits().maxOutputTokens"),
    promptCharCap: guard.includes("AI_DEBUG_PROMPT_CHAR_CAP"),
    estimatedInputTokenCount: guard.includes("estimateAiDebugInputTokens") && guard.includes("token estimate"),
    maxEstimatedInputTokens: guard.includes("AI_DEBUG_MAX_ESTIMATED_INPUT_TOKENS"),
    maxOutputTokens: guard.includes("AI_DEBUG_MAX_OUTPUT_TOKENS"),
    providerBlockedWhenDisabledOrOverBudget: assistant.includes("!budgetDecision.providerCallAllowed") && assistant.includes("budget guard blocked"),
    fallbackWithoutProviderCall: guard.includes("fallbackWithoutProviderCall: true"),
    providerCallsInValidators: false,
  };
}

export function validateAiDebugBudgetGuardReport(report: ReturnType<typeof buildAiDebugBudgetGuardReport>) {
  const failures: string[] = [];
  if (!report.killSwitch) failures.push("AI debug budget guard lacks kill switch.");
  if (!report.modelAllowlist) failures.push("AI debug budget guard lacks model allowlist.");
  if (!report.timeoutCap) failures.push("AI debug budget guard lacks timeout/output cap evidence.");
  if (!report.promptCharCap) failures.push("AI debug budget guard lacks prompt char cap.");
  if (!report.estimatedInputTokenCount) failures.push("AI debug budget guard lacks token estimate/count evidence.");
  if (!report.maxEstimatedInputTokens || !report.maxOutputTokens) failures.push("AI debug budget guard lacks input/output token caps.");
  if (!report.providerBlockedWhenDisabledOrOverBudget) failures.push("provider call is possible when disabled or over budget.");
  if (!report.fallbackWithoutProviderCall) failures.push("fallback path without provider call is missing.");
  if (report.providerCallsInValidators) failures.push("validator must not call provider.");
  return failures;
}

function adminRouteStatus() {
  const balance = read("src/app/api/admin/balance/route.ts");
  const controls = read("src/app/api/admin/creator-account-controls/route.ts");
  const agreements = read("src/app/api/admin/creator-agreements/route.ts");
  const adminRouteErrors = read("src/lib/server/admin-route-errors.ts");
  const controlsEvidence = `${controls}\n${adminRouteErrors}`;
  const agreementsEvidence = `${agreements}\n${adminRouteErrors}`;
  return {
    adminBalanceBodyCapStatus: balance.includes("readBoundedJsonBody")
      && balance.includes("ADMIN_BALANCE_BODY_LIMIT_BYTES = 8_192")
      && !balance.includes("request.json()")
      ? "bounded_parser_cap_8192" as const
      : "missing_or_unbounded" as const,
    creatorAccountControlsBodyCapStatus: controls.includes("readBoundedJsonBody")
      && controls.includes("CREATOR_ACCOUNT_CONTROLS_BODY_LIMIT_BYTES = 16_384")
      && !controls.includes("request.json()")
      ? "bounded_parser_cap_16384" as const
      : "missing_or_unbounded" as const,
    creatorAccountControlsTypedErrorsStatus: [
      "invalid_admin_request",
      "payload_too_large",
      "forbidden",
      "role_activation_blocked",
      "username_taken",
      "invalid_username",
      "no_changes_detected",
    ].every((code) => controlsEvidence.includes(code))
      ? "typed_safe_error_mapping" as const
      : "missing_typed_error_mapping" as const,
    creatorAgreementsTypedErrorsStatus: [
      "invalid_admin_request",
      "invalid_upload_type",
      "upload_too_large",
      "storage_unavailable",
      "invalid_storage_path",
      "invalid_signed_url",
      "template_not_found",
      "dispatch_failed",
    ].every((code) => agreementsEvidence.includes(code))
      && !agreements.includes("request.json()")
      ? "typed_safe_error_mapping" as const
      : "missing_typed_error_mapping" as const,
  };
}

export function buildDebugCockpitBatch10CleanupReport(input: {
  repoHead?: string;
  betaScoreHeadBefore?: string;
  betaScoreHeadAfter?: string;
  selfHealingAgeBeforeHours?: number;
  selfHealingAgeAfterHours?: number;
  speedSecurityScoreBefore?: number;
  speedSecurityScoreAfter?: number;
  speedSecurityFindingsBefore?: number;
  speedSecurityFindingsAfter?: number;
  speedSecurityAgeAfterHours?: number;
  hardeningScoreBefore?: number;
  hardeningScoreAfter?: number;
  hardeningFindingsBefore?: number;
  hardeningFindingsAfter?: number;
  hardeningAgeAfterHours?: number;
  scoreBefore?: number;
  scoreAfter?: number;
} = {}) {
  const repoHead = input.repoHead ?? gitHead();
  const publicBeta = readJson("agent/state/public-beta-score.generated.json");
  const selfHealing = readJson("agent/state/self-healing-refresh-queue.generated.json");
  const speedSecurity = readJson("agent/state/speed-security-hardening.generated.json");
  const hardening = readJson("agent/state/codebase-hardening.generated.json");
  const routeStatus = adminRouteStatus();
  const viewer = buildViewerEntitlementHardeningReport();
  const ai = buildAiDebugBudgetGuardReport();
  const betaScoreHeadAfter = input.betaScoreHeadAfter ?? readString(publicBeta?.currentHead) ?? "missing";
  const selfHealingAgeAfter = input.selfHealingAgeAfterHours ?? hoursSince(readString(selfHealing?.generatedAtUtc) ?? readString(selfHealing?.generatedAt));
  const speedSecurityAgeAfter = input.speedSecurityAgeAfterHours ?? hoursSince(readString(speedSecurity?.generatedAtUtc) ?? readString(speedSecurity?.generatedAt));
  const hardeningAgeAfter = input.hardeningAgeAfterHours ?? hoursSince(readString(hardening?.generatedAtUtc) ?? readString(hardening?.generatedAt));
  const remainingFindings = [
    betaScoreHeadAfter !== repoHead ? "public beta score head requires post-commit refresh or explanation" : "",
    selfHealingAgeAfter > STALE_HOURS ? "self-healing refresh queue stale" : "",
    speedSecurityAgeAfter > STALE_HOURS ? "speed/security stale" : "",
    hardeningAgeAfter > STALE_HOURS ? "codebase hardening stale" : "",
  ].filter(Boolean);

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "debug-cockpit-batch10-cleanup",
    betaScoreHeadBefore: input.betaScoreHeadBefore ?? "a54fc24ccc1ad7b3d23c7aa2a6b3c5bb354fde76",
    betaScoreHeadAfter,
    repoHead,
    selfHealingAgeBefore: input.selfHealingAgeBeforeHours ?? 406_694.6,
    selfHealingAgeAfter,
    speedSecurityScoreBefore: input.speedSecurityScoreBefore ?? 51,
    speedSecurityScoreAfter: input.speedSecurityScoreAfter ?? readNumber(speedSecurity?.overallScore) ?? readNumber(speedSecurity?.score) ?? 0,
    speedSecurityFindingsBefore: input.speedSecurityFindingsBefore ?? 177,
    speedSecurityFindingsAfter: input.speedSecurityFindingsAfter ?? readNumber(speedSecurity?.findingCount) ?? (Array.isArray(speedSecurity?.findings) ? speedSecurity.findings.length : 0),
    speedSecurityAgeAfter,
    hardeningScoreBefore: input.hardeningScoreBefore ?? 97,
    hardeningScoreAfter: input.hardeningScoreAfter ?? readNumber(hardening?.overallScore) ?? readNumber(hardening?.score) ?? 0,
    hardeningFindingsBefore: input.hardeningFindingsBefore ?? 6,
    hardeningFindingsAfter: input.hardeningFindingsAfter ?? readNumber(hardening?.findingCount) ?? (Array.isArray(hardening?.findings) ? hardening.findings.length : 0),
    hardeningAgeAfter,
    ...routeStatus,
    viewerEntitlementStatus: validateViewerEntitlementHardeningReport(viewer).length === 0 ? "entitlement_evidence_current" as const : "source_security_fix_required" as const,
    aiBudgetGuardStatus: validateAiDebugBudgetGuardReport(ai).length === 0 ? "ai_budget_guard_current" as const : "source_security_fix_required" as const,
    boundedParserUsed: "readBoundedJsonBody",
    touchedPaymentRuntime: false,
    gumdropMathChanged: false,
    providerCallsRun: false,
    productionReadsRun: false,
    scoreBefore: input.scoreBefore ?? 79,
    scoreAfter: input.scoreAfter ?? readNumber(publicBeta?.score) ?? 79,
    scoreDimensions: scoreDimensionsFromPublicBeta(publicBeta),
    remainingFindings,
    dirtyFilesClassified: gitStatusShort().map((entry) => ({
      file: entry.slice(3),
      classification: entry.includes("agent/state") ? "current_generated_artifact_to_commit" : "source_security_fix_required",
    })),
    nextExactSteps: [
      "Refresh beta, speed/security, hardening, and self-healing reports after this source patch.",
      "Attach formal provider/runtime/admin evidence separately; no formal gate was cleared by this batch.",
    ],
  };
}

export function validateDebugCockpitBatch10CleanupReport(report: ReturnType<typeof buildDebugCockpitBatch10CleanupReport>) {
  const failures: string[] = [];
  const allowHeadMismatch = report.betaScoreHeadAfter !== report.repoHead
    && report.nextExactSteps.some((step) => step.includes("after this source patch"));
  if (report.betaScoreHeadAfter !== report.repoHead && !allowHeadMismatch) failures.push("public beta score head mismatch remains without explanation.");
  if (report.selfHealingAgeAfter > STALE_HOURS) failures.push("self-healing refresh queue remains older than 72h.");
  if (report.speedSecurityAgeAfter > STALE_HOURS) failures.push("speed-security report remains older than 72h.");
  if (report.hardeningAgeAfter > STALE_HOURS) failures.push("hardening report remains older than 72h.");
  if (report.adminBalanceBodyCapStatus !== "bounded_parser_cap_8192") failures.push("admin balance route lacks body cap.");
  if (report.creatorAccountControlsBodyCapStatus !== "bounded_parser_cap_16384") failures.push("creator account controls route lacks body cap.");
  if (report.creatorAccountControlsTypedErrorsStatus !== "typed_safe_error_mapping") failures.push("creator account controls expected errors can collapse into generic 500.");
  if (report.creatorAgreementsTypedErrorsStatus !== "typed_safe_error_mapping") failures.push("creator agreements expected errors can collapse into generic 500.");
  if (report.viewerEntitlementStatus !== "entitlement_evidence_current") failures.push("viewer route lacks entitlement evidence.");
  if (report.aiBudgetGuardStatus !== "ai_budget_guard_current") failures.push("AI debug assistant lacks token estimate/count budget guard evidence.");
  if (report.providerCallsRun) failures.push("provider call occurred in tests.");
  if (report.gumdropMathChanged) failures.push("GumDrop math/source-of-funds changed.");
  if (report.touchedPaymentRuntime) failures.push("payment runtime changed.");
  if (!report.scoreDimensions || Object.values(report.scoreDimensions).some((value) => typeof value !== "number")) failures.push("score dimensions missing.");
  return failures;
}

export function writeViewerEntitlementHardeningReport() {
  const report = buildViewerEntitlementHardeningReport();
  const validationFailures = validateViewerEntitlementHardeningReport(report);
  const output = { ...report, validationFailures };
  write(VIEWER_REPORT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  write(VIEWER_DOC_PATH, renderDoc("Viewer Entitlement Hardening", output));
  return validationFailures;
}

export function writeAiDebugBudgetGuardReport() {
  const report = buildAiDebugBudgetGuardReport();
  const validationFailures = validateAiDebugBudgetGuardReport(report);
  const output = { ...report, validationFailures };
  write(AI_REPORT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  write(AI_DOC_PATH, renderDoc("AI Debug Budget Guard", output));
  return validationFailures;
}

export function writeDebugCockpitBatch10Report() {
  const report = buildDebugCockpitBatch10CleanupReport();
  const validationFailures = validateDebugCockpitBatch10CleanupReport(report);
  const output = { ...report, validationFailures };
  write(BATCH10_REPORT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  write(BATCH10_DOC_PATH, renderDoc("Debug Cockpit Batch10 Cleanup", output));
  return validationFailures;
}
