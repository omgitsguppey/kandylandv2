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
const evidence = readRequired("src/lib/moderation/theft-risk-evidence.ts");
const score = readRequired("src/lib/moderation/theft-risk-score.ts");
const normalizer = readRequired("src/lib/admin-moderation-security-alerts.ts");
const consoleUi = readRequired("src/components/Admin/AdminModerationConsole.tsx");
const alertsUi = readRequired("src/components/Admin/AdminModerationSecurityAlerts.tsx");
const route = readRequired("src/app/api/admin/moderation/security-alerts/route.ts");
const securityRoute = readRequired("src/app/api/security/log-attempt/route.ts");
const securityEvents = readRequired("src/lib/security-events.ts");
const tests = [
    readRequired("tests/unit/theft-risk-score.spec.ts"),
    readRequired("tests/unit/admin-moderation-security-alerts.spec.ts"),
].join("\n");
const docs = readRequired("docs/agent-truth/theft-risk-score.md");

if (packageJson.scripts?.["check:theft-risk-score"] !== "tsx scripts/agent/validate-theft-risk-score.ts") {
    fail("package.json must expose check:theft-risk-score.");
}

for (const expected of [
    "TheftRiskEvidence",
    "normalizeTheftRiskEvidence",
    "protected_viewer",
    "serverConfirmed",
]) requireIncludes(evidence, expected, "Theft risk evidence");

for (const expected of [
    "TheftRiskScore",
    "scoreTheftRisk",
    "scoreSingleTheftRiskEvidence",
    "possible_capture_theft_pattern",
    "Do not act on this alone. Monitor for repeats or stronger signals.",
    "hasWeakOnlySignals",
    "oneOffMobileSafariBlur",
]) requireIncludes(score, expected, "Theft risk score");

for (const expected of [
    "normalizeTheftRiskEvidence",
    "scoreSingleTheftRiskEvidence",
    "observedSummary",
    "const serverConfirmed = value.serverConfirmed === true && confidence === \"confirmed\";",
]) requireIncludes(normalizer, expected, "Admin moderation alert normalizer");

for (const expected of [
    "observedSummary",
    "What was actually observed",
    "recommendedAction",
]) requireIncludes(consoleUi, expected, "Admin moderation workspace");

requireIncludes(alertsUi, "alert.observedSummary", "Alert cards");
requireNotIncludes(consoleUi + alertsUi, "screenshot detected", "Moderation UI");

for (const expected of [
    "guardApiRequest",
    "auth: \"admin\"",
    "requireTrustedOrigin: true",
]) requireIncludes(route, expected, "Security alerts route");

requireIncludes(securityRoute, "serverConfirmed: descriptor.confidence === \"confirmed\"", "Security log attempt route");
requireIncludes(securityEvents, "Possible capture/theft pattern", "Security event catalog");

for (const expected of [
    "left while content visible alone as low risk",
    "caps weak visibility-only signals at watch",
    "scores entitlement violations as high risk",
    "scores signed url reuse plus blocked access as critical",
]) requireIncludes(tests, expected, "Theft risk tests");

for (const expected of [
    "possible capture/theft pattern",
    "weak signals alone cannot exceed watch tier",
    "Confirmed only if server/platform evidence exists",
    "No auto-restriction unless score >= 80 and confidence strong/confirmed",
]) requireIncludes(docs, expected, "Theft risk doctrine");

if (failures.length > 0) {
    console.error("Theft risk score validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
}

console.log("Theft risk score validation passed.");
