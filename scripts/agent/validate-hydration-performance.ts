import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
    HYDRATION_PERFORMANCE_REPORT_PATH,
    type HydrationPerformanceFinding,
    type HydrationPerformanceReport,
} from "../../src/lib/hydration-performance-score";

const root = process.cwd();
const failures: string[] = [];

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

function requireNumber(value: unknown, label: string, min: number, max: number) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
        failures.push(`${label} must be a number between ${min} and ${max}.`);
    }
}

function expectedStatus(score: number, hasCritical: boolean) {
    if (hasCritical) return "fail";
    if (score >= 95) return "clean";
    if (score >= 90) return "pass";
    if (score >= 80) return "warning";
    if (score >= 70) return "beta-risk";
    return "fail";
}

function readReport() {
    const source = readRequired(HYDRATION_PERFORMANCE_REPORT_PATH);
    if (!source) {
        return null;
    }
    try {
        return JSON.parse(source) as HydrationPerformanceReport;
    } catch (error) {
        failures.push(`${HYDRATION_PERFORMANCE_REPORT_PATH} must be valid JSON: ${(error as Error).message}`);
        return null;
    }
}

function validateFinding(finding: HydrationPerformanceFinding, index: number) {
    for (const key of ["id", "severity", "title", "category", "filePath", "escalation"] as const) {
        if (typeof finding[key] !== "string" || finding[key].trim().length === 0) {
            failures.push(`findings[${index}].${key} must be a non-empty string.`);
        }
    }
    if (!["info", "minor", "moderate", "major", "critical"].includes(finding.severity)) {
        failures.push(`findings[${index}].severity is invalid.`);
    }
    requireNumber(finding.scoreImpact, `findings[${index}].scoreImpact`, -25, 0);
    if (typeof finding.canAutofix !== "boolean") {
        failures.push(`findings[${index}].canAutofix must be boolean.`);
    }
}

const report = readReport();
if (report) {
    requireNumber(report.score, "score", 0, 100);
    if (!["clean", "pass", "warning", "beta-risk", "fail"].includes(report.status)) {
        failures.push("status must be a valid hydration performance status.");
    }
    const hasCritical = Array.isArray(report.findings)
        ? report.findings.some((finding) => finding.severity === "critical")
        : false;
    if (report.status !== expectedStatus(report.score, hasCritical)) {
        failures.push("status must match score thresholds and critical auto-fail behavior.");
    }
    if (!Array.isArray(report.findings)) {
        failures.push("findings must be an array.");
    } else {
        report.findings.forEach(validateFinding);
    }
    requireNumber(report.safeAutofixesAvailable, "safeAutofixesAvailable", 0, 10_000);
    if (typeof report.summary !== "string" || report.summary.trim().length === 0) {
        failures.push("summary must be a non-empty string.");
    }
}

const scoreCore = readRequired("src/lib/hydration-performance-score.ts");
const scoreScript = readRequired("scripts/agent/score-hydration-performance.ts");
const validatorScript = readRequired("scripts/agent/validate-hydration-performance.ts");
const packageJson = readRequired("package.json");
const coreWrapper = readRequired("src/components/CoreLayoutWrapper.tsx");
const homeClient = readRequired("src/app/HomeClient.tsx");
const homePage = readRequired("src/app/page.tsx");
const hero = readRequired("src/components/Hero.tsx");
const heroActions = readRequired("src/components/Landing/HomeHeroActions.tsx");
const posthogProvider = readRequired("src/components/Analytics/CSPostHogProvider.tsx");
const telemetry = readRequired("src/lib/telemetry.ts");
const privacy = readRequired("src/lib/privacy-consent.ts");
const deferredTicker = readRequired("src/components/Landing/DeferredHomeDropTicker.tsx");
const deferredCarousel = readRequired("src/components/Landing/DeferredHomeActiveDropsCarousel.tsx");
const hydrationDocs = readRequired("docs/agent-truth/hydration-performance.md");
const globalLoadingDocs = readRequired("docs/agent-truth/global-loading-performance.md");
const readme = readRequired("README.md");
const agents = readRequired("AGENTS.md");
const ledger = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");
const audit = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");

for (const expected of [
    "\"score:hydration\": \"tsx scripts/agent/score-hydration-performance.ts\"",
    "\"check:hydration-performance\": \"tsx scripts/agent/validate-hydration-performance.ts\"",
]) {
    requireIncludes(packageJson, expected, "package scripts");
}

for (const expected of [
    "HydrationPerformanceFinding",
    "buildHydrationPerformanceReport",
    "collectHydrationPerformanceFindings",
    "CoreLayoutWrapper dynamic modules are staged",
    "forbidRegex",
    "IMMEDIATE_IDENTIFIED_EVENT_NAMES",
    "Forbidden default commands: Playwright, Lighthouse, Cypress",
]) {
    requireIncludes(scoreCore, expected, "hydration performance score core");
}

for (const source of [scoreCore, scoreScript]) {
    requireNotIncludes(source, "node:child_process", "hydration performance score default path");
    requireNotIncludes(source, "playwright", "hydration performance score default path");
    requireNotIncludes(source, "cypress", "hydration performance score default path");
    requireNotIncludes(source, "lighthouse", "hydration performance score default path");
}

for (const expected of [
    "criticalLaneReady",
    "afterPaintLaneReady",
    "idleLaneReady",
    "interactionOpenedLaneReady",
    "const PayPalProvider = dynamic",
    "const CookieBanner = dynamic",
    "data-hydration-lane=\"critical\"",
    "data-client-hydration-optimized=\"true\"",
    "data-telemetry-critical-path=\"connected\"",
    "data-privacy-consent-hydration=\"preserved\"",
    "DeepTracker",
]) {
    requireIncludes(coreWrapper, expected, "CoreLayoutWrapper");
}

for (const forbidden of [
    "import { PayPalProvider } from \"@/components/PayPalProvider\"",
    "import CookieBanner from \"@/components/CookieBanner\"",
    "setInterval(",
    "100vh",
]) {
    requireNotIncludes(coreWrapper, forbidden, "CoreLayoutWrapper");
}

for (const expected of [
    "const HomepageRuntimeDiagnostics = dynamic",
    "useDeferredClientReady",
    "home_page_viewed",
    "data-hydration-lane=\"idle\"",
]) {
    requireIncludes(homeClient, expected, "HomeClient");
}

requireIncludes(homePage, "data-home-modules-hydration=\"staged\"", "Home page");
requireNotIncludes(homePage, "HomepageRuntimeDiagnostics", "Home page server module");

for (const [label, source] of [
    ["DeferredHomeDropTicker", deferredTicker],
    ["DeferredHomeActiveDropsCarousel", deferredCarousel],
] as const) {
    requireIncludes(source, "useDeferredClientReady", label);
    requireIncludes(source, "data-hydration-lane=\"idle\"", label);
    requireIncludes(source, "dynamic(", label);
}

requireIncludes(hero, "HomeHeroActions", "Hero");
requireIncludes(hero, "DeferredHomeDropTicker", "Hero");
requireNotIncludes(hero, "import { HomeDropTicker }", "Hero direct ticker import");
for (const expected of ["hero_cta_clicked", "openAuthModal(\"signup\")", "href=\"/dashboard\""]) {
    requireIncludes(heroActions, expected, "HomeHeroActions");
}

for (const expected of [
    "trackEvent",
    "getEnrichedEventParams",
    "canUseAnonymousAnalytics",
    "canUseIdentifiedAnalytics",
    "IMMEDIATE_IDENTIFIED_EVENT_NAMES",
]) {
    requireIncludes(telemetry, expected, "telemetry");
}
for (const expected of [
    "subscribeToPrivacySettings",
    "canUseAnonymousAnalytics",
    "readPrivacySettingsSnapshot",
    "import(\"posthog-js\")",
]) {
    requireIncludes(posthogProvider, expected, "CSPostHogProvider");
}
requireNotIncludes(posthogProvider, "from \"posthog-js\"", "CSPostHogProvider");
requireIncludes(privacy, "honorGlobalPrivacyControl", "privacy consent");

const doctrineNote = "KandyDrops hydration uses staged priority lanes.";
for (const [label, source] of [
    ["hydration docs", hydrationDocs],
    ["global loading docs", globalLoadingDocs],
    ["README", readme],
    ["AGENTS", agents],
    ["REPO_MEMORY_LEDGER", ledger],
    ["EVERY_FILE_FUNCTION_CHECKLIST", checklist],
    ["FULL_SCALE_CODEBASE_AUDIT", audit],
] as const) {
    requireIncludes(source, doctrineNote, label);
}

requireIncludes(scoreScript, "writeHydrationPerformanceReport", "hydration score script");
requireIncludes(validatorScript, "critical auto-fail behavior", "hydration validator");

if (failures.length > 0) {
    console.error("Hydration performance validation failed:");
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exit(1);
}

console.log("Hydration performance validation passed.");
