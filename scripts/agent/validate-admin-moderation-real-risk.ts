import { execSync } from "node:child_process";
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
    if (!source.includes(expected)) fail(`${label} must include "${expected}".`);
}

function requireNotIncludes(source: string, forbidden: string, label: string) {
    if (source.includes(forbidden)) fail(`${label} must not include "${forbidden}".`);
}

const packageJson = JSON.parse(readRequired("package.json")) as { scripts?: Record<string, string> };
const risk = [
    readRequired("src/lib/moderation/scrape-risk-score.ts"),
    readRequired("src/lib/moderation/theft-risk-score.ts"),
].join("\n");
const evidence = [
    readRequired("src/lib/moderation/moderation-evidence.ts"),
    readRequired("src/lib/moderation/theft-risk-evidence.ts"),
].join("\n");
const control = readRequired("src/lib/admin-moderation-control-tower.ts");
const consoleUi = readRequired("src/components/Admin/AdminModerationConsole.tsx");
const alertsUi = readRequired("src/components/Admin/AdminModerationSecurityAlerts.tsx");
const preview = readRequired("src/components/Admin/AdminEvidenceMediaPreview.tsx");
const normalizer = readRequired("src/lib/admin-moderation-security-alerts.ts");
const threadsRoute = readRequired("src/app/api/admin/moderation/threads/route.ts");
const threadRoute = readRequired("src/app/api/admin/moderation/threads/[threadId]/route.ts");
const alertsRoute = readRequired("src/app/api/admin/moderation/security-alerts/route.ts");
const riskTests = readRequired("tests/unit/moderation-scrape-risk-score.spec.ts");
const alertTests = readRequired("tests/unit/admin-moderation-security-alerts.spec.ts");
const docs = [
    readRequired("docs/agent-truth/admin-moderation-real-risk.md"),
    readRequired("docs/agent-truth/content-protection-score.md"),
    readRequired("docs/agent-truth/watch-time-truth.md"),
    readRequired("docs/agent-truth/speed-security-hardening.md"),
    readRequired("README.md"),
    readRequired("AGENTS.md"),
    readRequired("REPO_MEMORY_LEDGER.md"),
].join("\n");

if (packageJson.scripts?.["check:admin-moderation-real-risk"] !== "tsx scripts/agent/validate-admin-moderation-real-risk.ts") {
    fail("package.json must expose check:admin-moderation-real-risk.");
}

for (const expected of [
    "ScrapeRiskScore",
    "scoreScrapeRisk",
    "scoreSingleModerationEvidence",
    "left_content_visible",
    "Do not act on this alone. Monitor for repeats or stronger signals.",
    "canAutoRestrict",
    "clampedScore >= 80",
]) requireIncludes(risk, expected, "Scrape risk score helper");

for (const expected of [
    "ModerationEvidence",
    "falsePositiveRisk",
    "safeDetails",
    "normalizeModerationEvidence",
]) requireIncludes(evidence, expected, "Moderation evidence model");

for (const expected of [
    "buildAdminModerationControlTowerModel",
    "highOrCriticalRiskCount",
    "confirmedEvidenceCount",
    "heuristicOnlyCount",
    "failedDataSources",
]) requireIncludes(control, expected, "Admin moderation control model");

for (const expected of [
    "data-admin-moderation-v2=\"real-risk-workspace\"",
    "Moderation Control Tower",
    "Real evidence only",
    "data-moderation-control-tower=\"true\"",
    "data-moderation-thread-queue=\"compact\"",
    "data-moderation-evidence-workspace=\"primary\"",
    "data-moderation-transcript-owner=\"primary-scroll-region\"",
    "not_implemented",
    "admin_moderation_alert_selected",
    "admin_moderation_risk_action_clicked",
]) requireIncludes(consoleUi, expected, "Admin moderation console UI");

for (const forbidden of [
    "setInterval",
    "<img",
    "<video",
    "href={message.assetUrl}",
    "100vh",
    "screenshot detected",
    "Screenshot detected",
]) requireNotIncludes(consoleUi + alertsUi + preview, forbidden, "Admin moderation UI");

for (const expected of [
    "riskScore",
    "riskTier",
    "riskConfidence",
    "falsePositiveRisk",
    "recommendedAction",
    "data-moderation-alert-list=\"risk-first\"",
]) requireIncludes(alertsUi, expected, "Risk alert cards");

for (const expected of [
    "data-admin-evidence-media-preview=\"metadata-only\"",
    "data-evidence-raw-url-rendered=\"false\"",
    "Raw locked asset URLs are hidden",
]) requireIncludes(preview, expected, "Safe evidence media preview");

for (const expected of [
    "normalizeModerationEvidence",
    "scoreSingleModerationEvidence",
    "riskScore",
    "riskTier",
    "recommendedAction",
]) requireIncludes(normalizer, expected, "Security alert normalizer");

for (const [label, route] of [
    ["threads route", threadsRoute],
    ["thread detail route", threadRoute],
    ["security alerts route", alertsRoute],
] as const) {
    requireIncludes(route, "guardApiRequest", label);
    requireIncludes(route, "auth: \"admin\"", label);
    requireIncludes(route, "requireTrustedOrigin: true", label);
}

for (const expected of [
    "single visibility-hidden event",
    "repeated visibility-only events",
    "blocked entitlement asset access",
    "signed URL reuse",
    "auto restriction only",
    "normal watch behavior",
]) requireIncludes(riskTests, expected, "Risk scoring tests");

for (const expected of [
    "riskTier",
    "riskScore",
    "Do not act on this alone. Monitor for repeats or stronger signals.",
]) requireIncludes(alertTests, expected, "Security alert normalization tests");

for (const expected of [
    "KandyDrops moderation must never pretend browser/PWA screenshot detection is confirmed",
    "Weak visibility/blur events alone do not justify action",
    "evidence-weighted scrape-risk scoring",
    "not_implemented",
]) requireIncludes(docs, expected, "Moderation risk doctrine docs");

try {
    const changedFiles = execSync("git diff --name-only", { cwd: root, encoding: "utf8" })
        .split(/\r?\n/u)
        .filter(Boolean);
    const allowedPatterns = [
        /^src\/lib\/moderation\/(?:scrape-risk-score|moderation-evidence)\.ts$/u,
        /^src\/lib\/admin-moderation(?:-control-tower|-security-alerts)?\.ts$/u,
        /^src\/components\/Admin\/AdminModeration(?:Console|SecurityAlerts)\.tsx$/u,
        /^src\/components\/Admin\/AdminEvidenceMediaPreview\.tsx$/u,
        /^src\/app\/api\/security\/log-attempt\/route\.ts$/u,
        /^src\/lib\/telemetry-catalog\.ts$/u,
        /^scripts\/agent\/validate-admin-moderation-real-risk\.ts$/u,
        /^tests\/unit\/(?:moderation-scrape-risk-score|admin-moderation-security-alerts)\.spec\.ts$/u,
        /^tests\/unit\/admin-moderation-console-ui\.spec\.ts$/u,
        /^docs\/agent-truth\/admin-moderation-real-risk\.md$/u,
        /^docs\/agent-truth\/(?:content-protection-score|watch-time-truth|speed-security-hardening)\.md$/u,
        /^README\.md$/u,
        /^AGENTS\.md$/u,
        /^REPO_MEMORY_LEDGER\.md$/u,
        /^EVERY_FILE_FUNCTION_CHECKLIST\.md$/u,
        /^FULL_SCALE_CODEBASE_AUDIT\.md$/u,
        /^package\.json$/u,
    ];
    const unexpected = changedFiles.filter((filePath) => !allowedPatterns.some((pattern) => pattern.test(filePath.replace(/\\/g, "/"))));
    if (unexpected.length > 0) fail(`Unexpected moderation diff: ${unexpected.join(", ")}`);
} catch (error) {
    fail(`Unable to inspect changed files: ${(error as Error).message}`);
}

if (failures.length > 0) {
    console.error("Admin moderation real risk validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
}

console.log("Admin moderation real risk validation passed.");
