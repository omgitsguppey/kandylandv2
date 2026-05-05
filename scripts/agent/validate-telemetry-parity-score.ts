import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type TelemetryParityFinding = {
  id: string;
  severity: string;
  category: string;
  title: string;
  filePath: string;
  scoreImpact: number;
  suggestedFix: string;
  canAutofix: boolean;
  escalation: string;
  evidence: unknown[];
};

type TelemetryParityReport = {
  score: number;
  status: string;
  generatedAt: string;
  repoRoot: string;
  findings: TelemetryParityFinding[];
  criticalCount: number;
  majorCount: number;
  safeAutofixesAvailable: number;
  checkedSurfaces: Array<{ id: string; label: string; filePaths: string[]; eventNames: string[] }>;
  requiredEvents: string[];
  payloadRequirements: string[];
  commandBudget: { allowedCommands: string[]; forbiddenCommands: string[] };
  summary: string;
};

const root = process.cwd();
const failures: string[] = [];
const REPORT_PATH = "agent/state/telemetry-parity-score.generated.json";

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

function requireNotIncludes(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) {
    failures.push(`${label} must not include "${forbidden}".`);
  }
}

function requireNumber(value: unknown, label: string, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    failures.push(`${label} must be a number between ${min} and ${max}.`);
  }
}

function expectedStatus(score: number, criticalCount: number) {
  if (criticalCount > 0) return "fail";
  if (score >= 95) return "clean";
  if (score >= 90) return "pass";
  if (score >= 80) return "warning";
  if (score >= 70) return "beta-risk";
  return "fail";
}

function readReport() {
  const source = readRequired(REPORT_PATH);
  if (!source) return null;
  try {
    return JSON.parse(source) as TelemetryParityReport;
  } catch (error) {
    failures.push(`${REPORT_PATH} must be valid JSON: ${(error as Error).message}`);
    return null;
  }
}

function validateFinding(finding: TelemetryParityFinding, index: number) {
  for (const key of ["id", "severity", "category", "title", "filePath", "suggestedFix", "escalation"] as const) {
    if (typeof finding[key] !== "string" || finding[key].trim().length === 0) {
      failures.push(`findings[${index}].${key} must be a non-empty string.`);
    }
  }
  if (!["info", "minor", "moderate", "major", "critical"].includes(finding.severity)) {
    failures.push(`findings[${index}].severity is invalid.`);
  }
  if (![
    "catalog",
    "critical_surface",
    "payload",
    "entity_id",
    "failure_reason",
    "consent",
    "enrichment",
    "privacy",
    "support_debug",
    "verification",
  ].includes(finding.category)) {
    failures.push(`findings[${index}].category is invalid.`);
  }
  requireNumber(finding.scoreImpact, `findings[${index}].scoreImpact`, -25, 0);
  if (typeof finding.canAutofix !== "boolean") {
    failures.push(`findings[${index}].canAutofix must be boolean.`);
  }
  if (!Array.isArray(finding.evidence)) {
    failures.push(`findings[${index}].evidence must be an array.`);
  }
}

const report = readReport();
if (report) {
  requireNumber(report.score, "score", 0, 100);
  if (!["clean", "pass", "warning", "beta-risk", "fail"].includes(report.status)) {
    failures.push("status must be a valid telemetry parity status.");
  }
  if (report.status !== expectedStatus(report.score, report.criticalCount)) {
    failures.push("status must match score thresholds and critical auto-fail behavior.");
  }
  if (typeof report.generatedAt !== "string" || Number.isNaN(Date.parse(report.generatedAt))) {
    failures.push("generatedAt must be an ISO timestamp string.");
  }
  if (!Array.isArray(report.findings)) {
    failures.push("findings must be an array.");
  } else {
    report.findings.forEach(validateFinding);
    const criticalCount = report.findings.filter((finding) => finding.severity === "critical").length;
    const majorCount = report.findings.filter((finding) => finding.severity === "major").length;
    if (criticalCount !== report.criticalCount) {
      failures.push("criticalCount must match critical findings.");
    }
    if (majorCount !== report.majorCount) {
      failures.push("majorCount must match major findings.");
    }
    if (criticalCount > 0 && report.status !== "fail") {
      failures.push("critical findings must force fail status.");
    }
  }
  if (!Array.isArray(report.checkedSurfaces) || report.checkedSurfaces.length < 12) {
    failures.push("checkedSurfaces must include all required critical telemetry surfaces.");
  }
  for (const surfaceId of [
    "hero_cta",
    "bottom_nav",
    "drop_card",
    "featured_carousel",
    "preview_page",
    "wallet_purchase",
    "daily_check_in",
    "daily_tasks",
    "chat",
    "notifications",
    "support_bug_report",
    "creator_actions",
  ]) {
    if (!report.checkedSurfaces.some((surface) => surface.id === surfaceId)) {
      failures.push(`checkedSurfaces must include ${surfaceId}.`);
    }
  }
  for (const eventName of [
    "hero_cta_clicked",
    "navigation_click",
    "view_drop_details",
    "drop_unlock_attempted",
    "drop_unwrap_intent_blocked_by_funds",
    "featured_slide_clicked",
    "drop_preview_page_viewed",
    "drop_preview_feedback_reacted",
    "drop_preview_open_library_clicked",
    "purchase_package_selected",
    "gumdrops_purchase_completed",
    "gumdrops_purchase_failed",
    "daily_checkin_claimed",
    "daily_task_action_clicked",
    "chat_thread_opened",
    "chat_message_send_failed",
    "notification_read",
    "bug_report_submitted",
    "support_ticket_created",
    "support_reply_viewed",
    "support_reply_sent",
    "creator_followed",
    "creator_notifications_enabled",
    "creator_experience_cta_clicked",
  ]) {
    if (!report.requiredEvents.includes(eventName)) {
      failures.push(`requiredEvents must include ${eventName}.`);
    }
  }
  for (const requirement of ["source_component", "session_id", "auth_state", "consent", "reason_code"]) {
    if (!report.payloadRequirements.some((entry) => entry.includes(requirement))) {
      failures.push(`payloadRequirements must mention ${requirement}.`);
    }
  }
  for (const forbidden of ["playwright", "cypress", "lighthouse", "npm run check"]) {
    if (!report.commandBudget.forbiddenCommands.includes(forbidden)) {
      failures.push(`commandBudget.forbiddenCommands must include ${forbidden}.`);
    }
  }
}

const packageJson = readRequired("package.json");
const scoreScript = readRequired("scripts/agent/score-telemetry-parity.ts");
const validatorScript = readRequired("scripts/agent/validate-telemetry-parity-score.ts");
const docs = readRequired("docs/agent-truth/telemetry-parity-score.md");
const telemetry = readRequired("src/lib/telemetry.ts");
const catalog = readRequired("src/lib/telemetry-catalog.ts");
const audit = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const ledger = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");

for (const expected of [
  "\"score:telemetry\": \"tsx scripts/agent/score-telemetry-parity.ts\"",
  "\"check:telemetry-parity-score\": \"npm run score:telemetry && tsx scripts/agent/validate-telemetry-parity-score.ts\"",
]) {
  requireIncludes(packageJson, expected, "package scripts");
}

for (const expected of [
  "TelemetryCriticalSurface",
  "criticalSurfaces",
  "payloadRequirements",
  "source_component",
  "reason_code",
  "readPrivacySettingsSnapshot",
  "canUseAnonymousAnalytics",
  "canUseIdentifiedAnalytics",
  "session_id",
  "auth_state",
  "support_ticket_created",
  "bug_report_submitted",
]) {
  requireIncludes(scoreScript, expected, "telemetry parity scorer");
}

requireIncludes(validatorScript, "Telemetry parity score validation passed.", "telemetry parity validator");

for (const forbidden of ["node:child_process", "execSync", "spawnSync", "spawn("]) {
  requireNotIncludes(scoreScript, forbidden, "telemetry parity scorer");
}

for (const expected of [
  "readPrivacySettingsSnapshot",
  "canUseAnonymousAnalytics",
  "canUseIdentifiedAnalytics",
  "page_path",
  "session_id",
  "auth_state",
  "sanitizeTelemetryParamsForBackend",
  "recordClientDiagnostic",
]) {
  requireIncludes(telemetry, expected, "canonical telemetry client");
}

for (const expected of [
  "support_ticket_created",
  "bug_report_submitted",
  "hero_cta_clicked",
  "drop_preview_page_viewed",
  "chat_message_send_failed",
  "notification_read",
  "creator_experience_cta_clicked",
]) {
  requireIncludes(catalog, expected, "telemetry catalog");
}

for (const source of [docs, audit, ledger, checklist]) {
  requireIncludes(source, "KandyDrops telemetry parity scoring is deterministic", "telemetry parity source-of-truth docs");
  requireIncludes(source, "source_component", "telemetry parity source-of-truth docs");
}

if (failures.length > 0) {
  console.error("Telemetry parity score validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Telemetry parity score validation passed.");
