import type {
  AiDebugCriticActionClass,
  AiDebugCriticCheck,
  AiDebugCriticCheckId,
  AiDebugCriticFinding,
  AiDebugCriticFindingSeverity,
  AiDebugCriticInput,
  AiDebugCriticMonolithRisk,
} from "./ai-debug-critic-contract";

export const AI_DEBUG_CRITIC_CHECKS: AiDebugCriticCheck[] = [
  { id: "no_patch_on_top_of_stale_logic", label: "Do not patch on top of stale logic", failureMode: "A stale backlog item remains open while the proposed fix claims completion." },
  { id: "no_duplicate_systems", label: "Do not create duplicate systems", failureMode: "A new debug, evidence, telemetry, score, route, or cost system duplicates a canonical lane." },
  { id: "no_fake_evidence", label: "Do not fake evidence", failureMode: "Source-only output is described as runtime, provider, smoke, screenshot, or formal proof." },
  { id: "no_formal_gate_cleared_without_artifact", label: "Do not clear formal gates without artifacts", failureMode: "A formal beta gate is marked resolved without the required generated artifact." },
  { id: "no_monolith_growth_without_split_plan", label: "Do not grow monoliths without split plans", failureMode: "A touched source file exceeds module discipline limits without a split plan." },
  { id: "no_chat_nav_touch_without_explicit_request", label: "Do not touch chat or navigation without explicit request", failureMode: "A protected chat or nav path changed outside the prompt scope." },
  { id: "no_payment_math_change_without_explicit_request", label: "Do not touch payment or GumDrop math without explicit request", failureMode: "Payment, wallet, PayPal, or GumDrop math paths changed outside the prompt scope." },
  { id: "no_unowned_debug_warning", label: "Do not leave debug warnings unowned", failureMode: "A debug backlog item lacks owner, surface, or next action." },
  { id: "no_orphaned_telemetry", label: "Do not create orphaned telemetry", failureMode: "Telemetry changes bypass canonical event fact or catalog ownership." },
  { id: "no_hardcoded_ui_scale_regression", label: "Do not hardcode UI scale regressions", failureMode: "UI scale tokens are hardcoded without device/layout doctrine ownership." },
  { id: "no_new_cost_path_without_guard", label: "Do not add cost paths without guardrails", failureMode: "A new AI, cloud, analytics, storage, or scheduled path lacks a cost guard." },
  { id: "no_source_ready_as_runtime_proof", label: "Do not present source readiness as runtime proof", failureMode: "Local source checks are used to claim deployed runtime/provider evidence." },
];

export const REQUIRED_AI_DEBUG_CRITIC_VALIDATORS = [
  "npm run check:ai-debug-critic",
  "npm run check:debug-evidence-pipeline",
  "npm run check:beta-score",
];

export const DUPLICATE_SYSTEM_PATTERNS = [/new-debug/i, /debug.*copy/i, /duplicate/i, /sidepath/i, /parallel/i, /new-telemetry/i, /new-score/i, /new-cost/i];
export const CHAT_NAV_PATTERNS = [/(^|\/)(chat|support-chat)(\/|\.|$)/i, /Navbar/i, /Navigation/i, /BottomNav/i, /TopNav/i, /mobile-nav/i];
export const PAYMENT_MATH_PATTERNS = [/paypal/i, /wallet/i, /gumdrop/i, /gumdrops/i, /gumdrop-ledger/i, /gumdrop-economics/i, /creator-experiences/i, /subscriptions\/route/i, /bookings\/route/i, /requests\/route/i];
export const COST_PATH_PATTERNS = [/vertex/i, /gemini/i, /cloud/i, /bigquery/i, /storage/i, /scheduler/i, /analytics/i, /ai-debug-assistant/i];
export const FAKE_EVIDENCE_PATTERN = /\b(provider|runtime|smoke|screenshot|manual qa|deployed|production|formal)\b.{0,48}\b(pass|passed|verified|cleared|complete|ready|proof)\b/i;
export const SOURCE_RUNTIME_PATTERN = /(\b(source|static|local validator|typecheck)\b.{0,96}\b(runtime|provider|deployed|production|formal)\b.{0,48}\b(proof|ready|cleared|verified|passed|complete)\b)|(\b(runtime|provider|deployed|production|formal)\b.{0,48}\b(proof|ready|cleared|verified|passed|complete)\b.{0,96}\b(source|static|local validator|typecheck)\b)/i;
export const UI_SCALE_PATTERN = /\b(text-\[\d|h-\[\d|w-\[\d|px\]|vh|100vh|calc\()/i;

export function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

export function includesAny(path: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(path));
}

export function normalizeChangedFiles(input: AiDebugCriticInput) {
  return unique(input.changedFiles.map((path) => path.replace(/\\/g, "/")));
}

export function addFinding(findings: AiDebugCriticFinding[], finding: AiDebugCriticFinding) {
  findings.push(finding);
}

function hash(value: string) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = Math.imul(31, result) + value.charCodeAt(index);
  }
  return result;
}

export function finding(input: {
  check: AiDebugCriticCheckId;
  severity: AiDebugCriticFindingSeverity;
  title: string;
  detail: string;
  sourceFiles: string[];
  requiredFix: string;
  actionClass?: AiDebugCriticActionClass;
  blockedReason?: string;
  validators?: string[];
}): AiDebugCriticFinding {
  return {
    id: `${input.check}-${Math.abs(hash(input.title + input.sourceFiles.join("|")))}`,
    check: input.check,
    severity: input.severity,
    actionClass: input.actionClass ?? (input.severity === "info" ? "no_action" : "needs_code_change"),
    title: input.title,
    detail: input.detail,
    sourceFiles: unique(input.sourceFiles),
    requiredFix: input.requiredFix,
    suggestedValidators: unique(["npm run check:ai-debug-critic", ...(input.validators ?? [])]),
    blockedReason: input.blockedReason,
  };
}

export function hasFormalArtifact(input: AiDebugCriticInput, artifact: string) {
  return Boolean(input.evidenceStatus?.formalArtifacts?.some((candidate) => candidate.replace(/\\/g, "/") === artifact.replace(/\\/g, "/")));
}

export function buildMonolithRisks(input: AiDebugCriticInput, changedFiles: string[]) {
  const risks: AiDebugCriticMonolithRisk[] = [];
  for (const file of changedFiles) {
    if (!file.startsWith("src/")) continue;
    if (file === "src/lib/release-notes/public-release-notes.ts") continue;
    const lineCount = input.fileLineCounts?.[file] ?? 0;
    const limit = file.includes("/app/") ? 500 : 300;
    if (lineCount > limit) risks.push({ file, lineCount, limit, splitPlanRequired: true });
  }
  return risks;
}

export function classifyBacklogAction(item: { status?: string; fixClass?: string; evidenceStatus?: string; exactNextAction?: string; blockedReason?: string }): AiDebugCriticActionClass {
  const text = `${item.status ?? ""} ${item.fixClass ?? ""} ${item.evidenceStatus ?? ""} ${item.exactNextAction ?? ""} ${item.blockedReason ?? ""}`.toLowerCase();
  if (/visual|screenshot|manual qa|manual smoke/.test(text)) return "needs_operator_ui_confirmation";
  if (/formal|provider|deployed runtime|runtime smoke|admin truth sample|production sample|blocked_manual|blocked_external|external_required/.test(text)) {
    return "blocked_formal_evidence";
  }
  if (item.evidenceStatus === "stale" || item.fixClass === "evidence_refresh") return "needs_refresh";
  if (["source_fix", "route_fix", "telemetry_closure", "cost_guard", "algorithm_refine"].includes(String(item.fixClass))) return "needs_code_change";
  return "needs_evidence_artifact";
}

export function severityForActionClass(actionClass: AiDebugCriticActionClass): AiDebugCriticFindingSeverity {
  if (actionClass === "needs_code_change") return "required";
  if (actionClass === "blocked_formal_evidence" || actionClass === "needs_operator_ui_confirmation") return "info";
  if (actionClass === "needs_refresh" || actionClass === "needs_evidence_artifact") return "warning";
  return "info";
}
