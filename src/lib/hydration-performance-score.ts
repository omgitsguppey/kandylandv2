import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type HydrationPerformanceSeverity = "info" | "minor" | "moderate" | "major" | "critical";

export type HydrationPerformanceCategory =
    | "shell_lane"
    | "modal_code_split"
    | "homepage_staging"
    | "telemetry_truth"
    | "privacy_truth"
    | "server_seed"
    | "polling"
    | "critical_ui"
    | "viewport";

export type HydrationPerformanceFinding = {
    id: string;
    severity: HydrationPerformanceSeverity;
    title: string;
    category: HydrationPerformanceCategory;
    filePath: string;
    line?: number;
    excerpt?: string;
    scoreImpact: number;
    escalation: string;
    canAutofix: boolean;
};

export type HydrationPerformanceReport = {
    score: number;
    status: "clean" | "pass" | "warning" | "beta-risk" | "fail";
    generatedAt: string;
    repoRoot: string;
    findings: HydrationPerformanceFinding[];
    safeAutofixesAvailable: number;
    summary: string;
};

type SourceFile = {
    path: string;
    source: string;
};

type FindingInput = Omit<HydrationPerformanceFinding, "id" | "scoreImpact">;

export const HYDRATION_PERFORMANCE_REPORT_PATH = "agent/state/hydration-performance.generated.json";

// CoreLayoutWrapper dynamic modules are staged by source-only checks in this scorer.
const severityImpact: Record<HydrationPerformanceSeverity, number> = {
    info: 0,
    minor: -2,
    moderate: -5,
    major: -10,
    critical: -25,
};

const REQUIRED_SHELL_LANES = [
    "criticalLaneReady",
    "afterPaintLaneReady",
    "idleLaneReady",
    "interactionOpenedLaneReady",
    "data-hydration-lane",
    "data-client-hydration-optimized=\"true\"",
    "data-telemetry-critical-path=\"connected\"",
    "data-privacy-consent-hydration=\"preserved\"",
] as const;

const GLOBAL_SHELL_FILES = [
    "src/app/layout.tsx",
    "src/components/CoreLayoutWrapper.tsx",
    "src/components/Analytics/CSPostHogProvider.tsx",
    "src/app/HomeClient.tsx",
] as const;

const CRITICAL_UI_FILES = [
    "src/components/Hero.tsx",
    "src/components/Landing/HomeHeroActions.tsx",
    "src/components/Navbar.tsx",
    "src/components/Navigation/MobileBottomBar.tsx",
] as const;

function stableHash(input: string) {
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

function normalizePath(filePath: string) {
    return filePath.replace(/\\/g, "/").replace(/^\.?\//u, "");
}

function readIfExists(root: string, filePath: string): SourceFile | null {
    const normalized = normalizePath(filePath);
    const absolutePath = join(root, normalized);
    if (!existsSync(absolutePath)) {
        return null;
    }
    return {
        path: normalized,
        source: readFileSync(absolutePath, "utf8"),
    };
}

function lineOf(source: string, needle: string) {
    const index = source.indexOf(needle);
    if (index < 0) {
        return undefined;
    }
    return source.slice(0, index).split(/\r?\n/u).length;
}

function excerptOf(source: string, needle: string) {
    return source.split(/\r?\n/u).find((line) => line.includes(needle))?.trim();
}

function addFinding(findings: HydrationPerformanceFinding[], input: FindingInput) {
    findings.push({
        ...input,
        id: `hydration-${stableHash(`${input.category}:${input.title}:${input.filePath}:${input.line ?? ""}`)}`,
        scoreImpact: severityImpact[input.severity],
    });
}

function requireText(
    findings: HydrationPerformanceFinding[],
    file: SourceFile | null,
    expected: string,
    title: string,
    category: HydrationPerformanceCategory,
    severity: HydrationPerformanceSeverity,
    escalation: string,
) {
    if (!file) {
        addFinding(findings, {
            severity: "major",
            title: `${title}: source file missing`,
            category,
            filePath: "unknown",
            escalation: "Hydration audit could not verify the required source file.",
            canAutofix: false,
        });
        return;
    }

    if (!file.source.includes(expected)) {
        addFinding(findings, {
            severity,
            title,
            category,
            filePath: file.path,
            escalation,
            canAutofix: false,
        });
    }
}

function forbidText(
    findings: HydrationPerformanceFinding[],
    file: SourceFile | null,
    forbidden: string,
    title: string,
    category: HydrationPerformanceCategory,
    severity: HydrationPerformanceSeverity,
    escalation: string,
) {
    if (!file || !file.source.includes(forbidden)) {
        return;
    }

    addFinding(findings, {
        severity,
        title,
        category,
        filePath: file.path,
        line: lineOf(file.source, forbidden),
        excerpt: excerptOf(file.source, forbidden),
        escalation,
        canAutofix: false,
    });
}

function forbidRegex(
    findings: HydrationPerformanceFinding[],
    file: SourceFile | null,
    pattern: RegExp,
    title: string,
    category: HydrationPerformanceCategory,
    severity: HydrationPerformanceSeverity,
    escalation: string,
) {
    if (!file) {
        return;
    }
    const match = file.source.match(pattern);
    if (!match?.[0]) {
        return;
    }

    addFinding(findings, {
        severity,
        title,
        category,
        filePath: file.path,
        line: lineOf(file.source, match[0]),
        excerpt: excerptOf(file.source, match[0]),
        escalation,
        canAutofix: false,
    });
}

function scoreStatus(score: number, hasCritical: boolean): HydrationPerformanceReport["status"] {
    if (hasCritical) return "fail";
    if (score >= 95) return "clean";
    if (score >= 90) return "pass";
    if (score >= 80) return "warning";
    if (score >= 70) return "beta-risk";
    return "fail";
}

export function collectHydrationPerformanceFindings(root = process.cwd()) {
    const findings: HydrationPerformanceFinding[] = [];
    const core = readIfExists(root, "src/components/CoreLayoutWrapper.tsx");
    const homeClient = readIfExists(root, "src/app/HomeClient.tsx");
    const homePage = readIfExists(root, "src/app/page.tsx");
    const hero = readIfExists(root, "src/components/Hero.tsx");
    const heroActions = readIfExists(root, "src/components/Landing/HomeHeroActions.tsx");
    const posthogProvider = readIfExists(root, "src/components/Analytics/CSPostHogProvider.tsx");
    const telemetry = readIfExists(root, "src/lib/telemetry.ts");
    const privacy = readIfExists(root, "src/lib/privacy-consent.ts");

    for (const lane of REQUIRED_SHELL_LANES) {
        requireText(
            findings,
            core,
            lane,
            `Core shell must expose staged hydration lane ${lane}`,
            "shell_lane",
            "major",
            "CoreLayoutWrapper must keep critical, after-paint, idle, and interaction-opened lanes explicit so startup work does not compete with first interaction.",
        );
    }

    for (const expected of [
        "const PayPalProvider = dynamic",
        "const CookieBanner = dynamic",
        "const GlobalPurchaseModal = dynamic",
        "const GlobalAuthModal = dynamic",
    ]) {
        requireText(
            findings,
            core,
            expected,
            `Modal and overlay code must be dynamically loaded: ${expected}`,
            "modal_code_split",
            "major",
            "Modal-only code should load in the interaction-opened or idle lane, not the critical shell lane.",
        );
    }

    for (const forbidden of [
        "import { PayPalProvider } from \"@/components/PayPalProvider\"",
        "import CookieBanner from \"@/components/CookieBanner\"",
        "import { GlobalPurchaseModal } from \"@/components/GlobalPurchaseModal\"",
        "import { GlobalAuthModal } from \"@/components/GlobalAuthModal\"",
    ]) {
        forbidText(
            findings,
            core,
            forbidden,
            "Core shell must not eagerly import modal-only UI",
            "modal_code_split",
            "major",
            "Move modal-only providers and overlays behind dynamic imports so first paint remains focused on navigation and route content.",
        );
    }

    for (const expected of [
        "const HomepageRuntimeDiagnostics = dynamic",
        "useDeferredClientReady",
        "data-hydration-lane=\"idle\"",
    ]) {
        requireText(
            findings,
            homeClient,
            expected,
            `Homepage diagnostics must be idle-staged: ${expected}`,
            "homepage_staging",
            "moderate",
            "Homepage runtime diagnostics should remain connected, but they must initialize after critical shell and hero CTA readiness.",
        );
    }

    requireText(
        findings,
        homePage,
        "data-home-modules-hydration=\"staged\"",
        "Homepage route must expose staged module hydration marker",
        "homepage_staging",
        "moderate",
        "The server-rendered homepage should visibly declare that non-critical modules are staged after the hero path.",
    );
    forbidText(
        findings,
        homePage,
        "HomepageRuntimeDiagnostics",
        "Homepage route must not eagerly import runtime diagnostics",
        "homepage_staging",
        "major",
        "Move homepage diagnostics through the client idle lane so route HTML and hero content do not pull diagnostic code into the first module graph.",
    );

    for (const filePath of [
        "src/components/Landing/DeferredHomeDropTicker.tsx",
        "src/components/Landing/DeferredHomeActiveDropsCarousel.tsx",
    ]) {
        const file = readIfExists(root, filePath);
        requireText(
            findings,
            file,
            "useDeferredClientReady",
            `${filePath} must use deferred readiness`,
            "homepage_staging",
            "moderate",
            "Below-fold homepage modules should hydrate after paint/idle so hero CTA interactivity remains the first client priority.",
        );
        requireText(
            findings,
            file,
            "data-hydration-lane=\"idle\"",
            `${filePath} must expose idle hydration lane`,
            "homepage_staging",
            "minor",
            "Deferred homepage modules need lightweight debug visibility for public beta performance triage.",
        );
    }

    for (const expected of [
        "trackEvent",
        "getEnrichedEventParams",
        "canUseAnonymousAnalytics",
        "canUseIdentifiedAnalytics",
        "IMMEDIATE_IDENTIFIED_EVENT_NAMES",
    ]) {
        requireText(
            findings,
            telemetry,
            expected,
            `Telemetry critical path must remain connected: ${expected}`,
            "telemetry_truth",
            "critical",
            "Hydration optimization must not remove telemetry enrichment, consent gates, or immediate critical event handling.",
        );
    }
    requireText(
        findings,
        core,
        "DeepTracker",
        "DeepTracker must remain connected through a deferred lane",
        "telemetry_truth",
        "major",
        "Semantic route analytics can be delayed after paint, but they must not be disconnected.",
    );
    requireText(
        findings,
        homeClient,
        "home_page_viewed",
        "Homepage view tracking must remain present",
        "telemetry_truth",
        "major",
        "Homepage performance work must preserve the critical home_page_viewed event.",
    );

    for (const expected of [
        "persistPrivacySettingsSnapshot",
        "applyAnalyticsConsentToGtag",
        "readPrivacySettingsSnapshot",
    ]) {
        requireText(
            findings,
            core,
            expected,
            `Core shell must preserve privacy consent truth: ${expected}`,
            "privacy_truth",
            "critical",
            "The shell must continue applying privacy snapshots to analytics sinks during staged hydration.",
        );
    }
    for (const expected of [
        "subscribeToPrivacySettings",
        "canUseAnonymousAnalytics",
        "readPrivacySettingsSnapshot",
        "import(\"posthog-js\")",
    ]) {
        requireText(
            findings,
            posthogProvider,
            expected,
            `PostHog provider must stay consent-gated and dynamic: ${expected}`,
            "privacy_truth",
            "critical",
            "PostHog pageview capture must remain dynamic, post-paint, and consent-gated.",
        );
    }
    requireText(
        findings,
        privacy,
        "honorGlobalPrivacyControl",
        "Privacy consent helper must still honor Global Privacy Control",
        "privacy_truth",
        "critical",
        "Hydration changes must not bypass GPC or essential-only analytics mode.",
    );
    forbidRegex(
        findings,
        posthogProvider,
        /import\s+[^;]*from\s+["']posthog-js["']/u,
        "PostHog must not be statically imported into the shell provider",
        "modal_code_split",
        "major",
        "Load PostHog after paint and only when anonymous analytics are allowed.",
    );

    requireText(
        findings,
        hero,
        "HomeHeroActions",
        "Hero primary CTA must remain in the critical hero path",
        "critical_ui",
        "critical",
        "The hero CTA cannot be deferred behind below-fold homepage modules.",
    );
    for (const expected of ["hero_cta_clicked", "openAuthModal(\"signup\")", "href=\"/dashboard\""]) {
        requireText(
            findings,
            heroActions,
            expected,
            `Hero CTA behavior must remain intact: ${expected}`,
            "critical_ui",
            "critical",
            "Guest signup and authenticated dashboard CTA behavior must remain interactive and tracked.",
        );
    }

    for (const expected of ["Promise.all", "getDrops()", "listCreatorDiscoveryProfiles(\"home\")", "initialCreators", "initialActiveDrops"]) {
        requireText(
            findings,
            homePage,
            expected,
            `Homepage server seed must remain present: ${expected}`,
            "server_seed",
            "major",
            "The homepage should keep server-seeded drops and creator social proof instead of waiting on duplicate client fetches.",
        );
    }
    forbidText(
        findings,
        homeClient,
        "fetch(",
        "HomeClient must not introduce first-paint duplicate client fetches",
        "server_seed",
        "major",
        "Client-side freshness work should be background/deferred, not a duplicate homepage first-paint fetch.",
    );

    for (const filePath of GLOBAL_SHELL_FILES) {
        const file = readIfExists(root, filePath);
        forbidText(
            findings,
            file,
            "setInterval(",
            "Global shell hydration path must not add polling",
            "polling",
            "major",
            "Startup hydration optimization must not add recurring timers to the global shell path.",
        );
        forbidText(
            findings,
            file,
            "100vh",
            "Global shell hydration path must not use 100vh",
            "viewport",
            "major",
            "Use 100dvh or shared shell tokens for mobile/PWA-safe viewport sizing.",
        );
    }

    for (const filePath of CRITICAL_UI_FILES) {
        const file = readIfExists(root, filePath);
        forbidText(
            findings,
            file,
            "ssr: false",
            "Critical above-fold UI must not be client-only dynamic",
            "critical_ui",
            "major",
            "Navbar, mobile bottom nav, hero, and hero actions should not be pushed behind client-only dynamic imports.",
        );
    }

    return findings;
}

export function buildHydrationPerformanceReport(options: { root?: string; generatedAt?: string } = {}): HydrationPerformanceReport {
    const root = options.root ?? process.cwd();
    const findings = collectHydrationPerformanceFindings(root);
    const rawScore = findings.reduce((score, finding) => score + finding.scoreImpact, 100);
    const score = Math.max(0, Math.min(100, rawScore));
    const hasCritical = findings.some((finding) => finding.severity === "critical");
    const status = scoreStatus(score, hasCritical);
    const safeAutofixesAvailable = findings.filter((finding) => finding.canAutofix).length;

    return {
        score,
        status,
        generatedAt: options.generatedAt ?? new Date().toISOString(),
        repoRoot: root,
        findings,
        safeAutofixesAvailable,
        summary: findings.length === 0
            ? "Hydration performance contract is clean: critical shell, telemetry, privacy, and homepage staging are connected."
            : `Hydration performance contract produced ${findings.length} finding(s); ${hasCritical ? "critical review is required." : "review targeted findings before broad performance audits."}`,
    };
}

export function writeHydrationPerformanceReport(report: HydrationPerformanceReport, root = process.cwd()) {
    const outputPath = join(root, HYDRATION_PERFORMANCE_REPORT_PATH);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

export function printHydrationPerformanceSummary(report: HydrationPerformanceReport) {
    console.log(`Hydration performance score: ${report.score}/100 (${report.status})`);
    console.log(report.summary);
    if (report.findings.length > 0) {
        console.log("Top findings:");
        for (const finding of report.findings.slice(0, 5)) {
            console.log(`- [${finding.severity}] ${finding.title} (${finding.filePath})`);
        }
    }
    console.log("Minimal commands: npm run score:hydration, npm run check:hydration-performance, npm run typecheck -- --pretty false when TypeScript changed");
    console.log("Forbidden default commands: Playwright, Lighthouse, Cypress, full npm run check, broad UI audits");
}
