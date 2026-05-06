import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];

function fail(message: string) {
  failures.push(message);
}

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    fail(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    fail(`${label} must include "${expected}".`);
  }
}

function requireNotIncludes(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) {
    fail(`${label} must not include "${forbidden}".`);
  }
}

const packageJson = readRequired("package.json");
const models = readRequired("src/lib/admin-ai-models.ts");
const debugAssistant = readRequired("src/lib/ai-debug-assistant.ts");
const debugServer = readRequired("src/lib/server/ai-debug-assistant.ts");
const debugRoute = readRequired("src/app/api/admin/debug/assistant/route.ts");
const debugFixRoute = readRequired("src/app/api/admin/debug/assistant/fix/route.ts");
const debugPage = readRequired("src/app/admin/debug/page.tsx");
const debugTabAi = readRequired("src/app/admin/debug/components/DebugTabAi.tsx");
const realtimePanel = readRequired("src/app/admin/debug/components/AdminAiAssistantRealtimePanel.tsx");
const optimizerHealth = readRequired("src/app/admin/ai/components/AdminAiOptimizerhealthSection.tsx");
const dropCovers = readRequired("src/lib/ai-drop-covers.ts");
const adminDebugDoc = readRequired("docs/agent-truth/admin-debug-control-tower.md");
const adminAiDoc = readRequired("docs/agent-truth/admin-ai-control-tower.md");
const googleCostDoc = readRequired("docs/agent-truth/google-cost-bleed.md");

requireIncludes(packageJson, "\"check:admin-ai-control-tower\": \"tsx scripts/agent/validate-admin-ai-control-tower.ts\"", "package.json");

for (const expected of [
  "GEMINI_3_1_FLASH_LITE_PREVIEW_MODEL = \"gemini-3.1-flash-lite-preview\"",
  "role: \"admin_debug_assistant\"",
  "role: \"admin_debug_fix_planner\"",
  "role: \"cover_prompt_refinement\"",
  "role: \"cover_image_generation\"",
  "alias: GEMINI_3_1_FLASH_LITE_PREVIEW_MODEL",
  "getAdminAiModelAlias(\"drop_cover_standard\")",
  "must use an image-generation model.",
  "must use a text model, not an image-generation model.",
]) {
  requireIncludes(models, expected, "Admin AI model role registry");
}

for (const expected of [
  "AI_DEBUG_ASSISTANT_MODEL = getAdminAiModelAliasForRole(\"admin_debug_assistant\")",
  "AI_DEBUG_FIX_PLANNER_MODEL = getAdminAiModelAliasForRole(\"admin_debug_fix_planner\")",
  "response_state: z.enum([\"live\", \"saved\", \"fallback\"])",
  "cost_guard_state: z.enum([\"admin_gated\", \"blocked\", \"disabled\"])",
  "resolved_model: z.string().trim().min(1)",
  "live_summary_status: z.enum([\"live\", \"delayed\", \"failed\", \"disabled\", \"fallback\"])",
  "displayed_summary_source: z.enum([\"live_model\", \"saved_guidance\", \"deterministic_fallback\"])",
  "displayed_summary_freshness: z.enum([\"fresh\", \"stale\", \"unknown\"])",
  "last_model_latency_ms: z.number().int().nonnegative().nullable().optional()",
  "last_fallback_latency_ms: z.number().int().nonnegative().nullable().optional()",
]) {
  requireIncludes(debugAssistant, expected, "Admin AI debug assistant contract");
}

for (const expected of [
  "buildAdminAiDebugSavedSummary",
  "buildAdminAiDebugFallback",
  "buildDisplayedSummaryFreshness",
  "buildLiveSummaryStatus",
  "buildLiveCallEligibility",
  "roleValidation = validateAdminAiModelRoleAssignment(\"admin_debug_assistant\", settings.model)",
  "validateAdminAiModelRoleAssignment(\"admin_debug_fix_planner\", runtime.model)",
  "status: \"fix_requires_manual_review\" as const",
  "modelRole: \"admin_debug_assistant\"",
  "response_parse_failed",
  "live_call_failed",
]) {
  requireIncludes(debugServer, expected, "Admin AI debug server runtime");
}
requireNotIncludes(debugServer, "status: \"fix_applied\"", "Admin AI fix planner");

for (const expected of [
  "const summary = settings.lastSummary",
  "buildAdminAiDebugSavedSummary",
  "buildAdminAiDebugFallback",
  "async function POST_handler",
  "generateAdminAiDebugSummary(signal, { settings })",
  "lastSummary: summary.response_state === \"live\" ? summary : settings.lastSummary || summary",
  "\"Cache-Control\": \"no-store, max-age=0\"",
]) {
  requireIncludes(debugRoute, expected, "Admin AI debug assistant route");
}
requireNotIncludes(debugRoute, "const summary = await generateAdminAiDebugSummary(signal, { settings });\r\n\r\n        return NextResponse.json(summary", "Admin AI GET route");

for (const expected of [
  "requireTrustedOrigin: true",
  "auth: \"admin\"",
  "SUPPORTED_FIX_TYPES",
  "\"inspect_diagnostic\"",
  "\"dismiss_diagnostic\"",
  "unsupported_fix_type",
  "fix_requires_manual_review",
  "fix_dismissed",
]) {
  requireIncludes(debugFixRoute, expected, "Admin AI debug fix route");
}

for (const expected of [
  "useAdminPollingSWR<AdminAiDebugSummary>(\"/api/admin/debug/assistant\", 15000",
  "method: \"POST\"",
  "generate_live_summary",
  "response_state === \"saved\"",
  "setAiAssistantModel(aiDebugData.configured_model || aiDebugData.resolved_model || aiDebugData.model || AI_DEBUG_ASSISTANT_MODEL);",
]) {
  requireIncludes(debugPage, expected, "Admin debug page AI lane");
}

for (const expected of [
  "Page load reads saved status only and does not trigger paid AI calls.",
  "Generate live guidance",
  "Deterministic fallback",
  "Saved guidance",
  "Live model",
  "Cost guard",
  "Role",
  "Current model",
  "Displayed source",
  "Summary freshness",
  "Last live run",
  "Fallback latency",
  "Saved summary model:",
  "Debug evidence",
  "Displayed summary",
]) {
  requireIncludes(debugTabAi, expected, "Debug AI tab");
}
requireNotIncludes(debugTabAi, "Pill label=\"Last run\"", "Debug AI tab");
requireNotIncludes(debugTabAi, "Pill label=\"Latency\"", "Debug AI tab");

for (const expected of [
  "Inspect",
  "Dismiss",
  "Apply eligibility",
  "observerStateLabel",
  "check.updatedAtUtc ? `Updated ${formatSignalAge(check.updatedAtMs)}` : check.reason",
]) {
  requireIncludes(realtimePanel, expected, "Realtime diagnostics AI panel");
}
requireNotIncludes(realtimePanel, "AI Auto-Fix", "Realtime diagnostics AI panel");
requireNotIncludes(realtimePanel, "Update time not recorded", "Realtime diagnostics AI panel");

for (const expected of [
  "optimizerModel: z.literal(ADMIN_AI_DROP_COVER_OPTIMIZER_MODEL)",
  "Gemini 2.5 Flash Image",
  "Gemini 3 Pro Image Preview",
  "ADMIN_AI_DROP_COVER_OPTIMIZER_MODEL",
]) {
  requireIncludes(dropCovers, expected, "Drop cover model split");
}
requireNotIncludes(dropCovers, "ADMIN_AI_DROP_COVER_MODEL = getAdminAiModelAlias(\"drop_cover_optimizer\")", "Drop cover image generation model");
requireIncludes(optimizerHealth, "gemini-3.1-flash-lite-preview", "Optimizer health model display");

for (const expected of [
  "Gemini 3.1 Flash-Lite Preview",
  "No paid AI calls on admin page load",
  "deterministic fallback",
  "inspect/apply/dismiss",
  "displayed summary freshness",
  "fallback latency vs live model latency",
]) {
  requireIncludes(adminAiDoc, expected, "Admin AI control tower doctrine");
}

for (const expected of [
  "saved guidance",
  "deterministic fallback",
  "Live guidance",
  "current configured/resolved model",
  "fallback latency from live model latency",
]) {
  requireIncludes(adminDebugDoc, expected, "Admin debug doctrine");
}

for (const expected of [
  "admin/debug/assistant",
  "must not trigger paid AI calls on page load",
  "explicit admin action",
]) {
  requireIncludes(googleCostDoc, expected, "Google cost bleed doctrine");
}

if (failures.length > 0) {
  console.error("Admin AI control tower validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Admin AI control tower validation passed.");
