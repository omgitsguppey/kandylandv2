import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
    ALL_DEVICE_PROFILE_IDS,
    DESKTOP_DEVICE_PROFILE_IDS,
    DEVICE_UI_DEVICE_PROFILES,
    DEVICE_UI_DISPLAY_MODES,
    DEVICE_UI_DRY_AUDIT_REPORT_PATH,
    DEVICE_UI_FORBIDDEN_COMMANDS,
    DEVICE_UI_SEVERITY_PENALTY,
    DEVICE_UI_SURFACES,
    MOBILE_DEVICE_PROFILE_IDS,
    TOUCH_DEVICE_PROFILE_IDS,
    type DeviceUiDeviceProfileId,
    type DeviceUiDisplayMode,
    type DeviceUiDryCategory,
    type DeviceUiDrySeverity,
    type DeviceUiSurfaceId,
    getDeviceUiStatus,
} from "./device-ui-dry-audit-rules";

export type DeviceUiDryFinding = {
    id: string;
    routeOrSurface: string;
    deviceProfile: string;
    displayMode: DeviceUiDisplayMode;
    category: DeviceUiDryCategory;
    severity: DeviceUiDrySeverity;
    filePath: string;
    line?: number;
    evidence: string[];
    expectedRule: string;
    actualPattern: string;
    canAutofix: boolean;
    autofixConfidence: number;
    suggestedFix: string;
    humanReadableWarning: string;
};

export type DeviceUiDryAuditReport = {
    generatedAt: string;
    overallScore: number;
    overallStatus: "clean" | "pass" | "warning" | "beta-risk" | "fail";
    deviceScores: Record<string, number>;
    surfaceScores: Record<string, number>;
    findings: DeviceUiDryFinding[];
    criticalCount: number;
    majorCount: number;
    safeAutofixesAvailable: number;
    recommendedFixOrder: string[];
    minimalVerificationCommands: string[];
};

type SourceFile = {
    filePath: string;
    source: string;
};

type FindingInput = Omit<DeviceUiDryFinding, "id" | "deviceProfile" | "displayMode"> & {
    idBase: string;
    deviceProfiles?: DeviceUiDeviceProfileId[];
    displayModes?: DeviceUiDisplayMode[];
};

type BuildOptions = {
    root?: string;
    generatedAt?: string;
};

const SEVERITY_RANK: Record<DeviceUiDrySeverity, number> = {
    info: 0,
    minor: 1,
    moderate: 2,
    major: 3,
    critical: 4,
};

const SOURCE_EXTENSIONS = /\.(tsx|ts|jsx|js)$/u;

function normalizePath(filePath: string) {
    return filePath.replace(/\\/g, "/").replace(/^\.\//u, "");
}

function stableHash(input: string) {
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

function readIfExists(root: string, filePath: string): SourceFile | null {
    const normalized = normalizePath(filePath);
    const fullPath = join(root, normalized);
    if (!existsSync(fullPath)) return null;
    return {
        filePath: normalized,
        source: readFileSync(fullPath, "utf8"),
    };
}

function readRequired(root: string, filePath: string) {
    return readFileSync(join(root, normalizePath(filePath)), "utf8");
}

function walkFiles(root: string, startPath: string): string[] {
    const fullStartPath = join(root, startPath);
    if (!existsSync(fullStartPath)) return [];

    const files: string[] = [];
    for (const entry of readdirSync(fullStartPath)) {
        if ([".next", "node_modules", "out", "storybook-static"].includes(entry)) continue;
        const fullPath = join(fullStartPath, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
            files.push(...walkFiles(root, join(startPath, entry)));
        } else if (SOURCE_EXTENSIONS.test(entry)) {
            files.push(normalizePath(join(startPath, entry)));
        }
    }
    return files;
}

function lineOf(source: string, needle: string) {
    const index = source.indexOf(needle);
    if (index < 0) return undefined;
    return source.slice(0, index).split(/\r?\n/u).length;
}

function lineOfIndex(source: string, index: number) {
    return source.slice(0, index).split(/\r?\n/u).length;
}

function dedupeFindings(findings: DeviceUiDryFinding[]) {
    const byKey = new Map<string, DeviceUiDryFinding>();
    for (const finding of findings) {
        const key = [
            finding.routeOrSurface,
            finding.deviceProfile,
            finding.displayMode,
            finding.category,
            finding.filePath,
            finding.line ?? "",
            finding.expectedRule,
            finding.actualPattern,
        ].join("|");
        const existing = byKey.get(key);
        if (!existing || SEVERITY_RANK[finding.severity] > SEVERITY_RANK[existing.severity]) {
            byKey.set(key, finding);
        }
    }
    return Array.from(byKey.values()).sort((left, right) => {
        if (SEVERITY_RANK[right.severity] !== SEVERITY_RANK[left.severity]) {
            return SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity];
        }
        return left.id.localeCompare(right.id);
    });
}

function surfaceForFile(filePath: string): DeviceUiSurfaceId {
    const normalized = normalizePath(filePath);
    const matched = DEVICE_UI_SURFACES.find((surface) => surface.files.some((surfaceFile) => normalizePath(surfaceFile) === normalized));
    if (matched) return matched.id;
    if (normalized.includes("/Chat/")) return "chat_thread";
    if (normalized.includes("/Drops/LockedDropPreview") || normalized.includes("/drops/[id]/preview")) return "full_page_drop_preview";
    if (normalized.includes("DropCard") || normalized.includes("DropGrid")) return "drop_card_grid";
    if (normalized.includes("FeaturedCarousel")) return "featured_carousel";
    if (normalized.includes("PurchaseModal")) return "wallet_modal";
    if (normalized.includes("ExperiencesClient")) return "experiences_page";
    if (normalized.includes("Creator")) return "creator_profile";
    return "dashboard";
}

function addFinding(findings: DeviceUiDryFinding[], input: FindingInput) {
    const devices = input.deviceProfiles ?? ALL_DEVICE_PROFILE_IDS;
    const displayModes = input.displayModes ?? [...DEVICE_UI_DISPLAY_MODES];
    const {
        idBase,
        deviceProfiles: _deviceProfiles,
        displayModes: _displayModes,
        ...findingInput
    } = input;

    for (const deviceProfile of devices) {
        for (const displayMode of displayModes) {
            const idSeed = [
                idBase,
                input.routeOrSurface,
                deviceProfile,
                displayMode,
                input.filePath,
                input.line ?? "",
                input.actualPattern,
            ].join("|");
            findings.push({
                id: `dui_${stableHash(idSeed)}`,
                ...findingInput,
                deviceProfile,
                displayMode,
            });
        }
    }
}

function createFinding(
    findings: DeviceUiDryFinding[],
    input: Omit<FindingInput, "canAutofix" | "autofixConfidence" | "suggestedFix"> & Partial<Pick<FindingInput, "canAutofix" | "autofixConfidence" | "suggestedFix">>,
) {
    addFinding(findings, {
        canAutofix: false,
        autofixConfidence: 0,
        suggestedFix: "Review the source pattern and apply the shared shell/image/device token intentionally.",
        ...input,
    });
}

function scanViewportUnits(root: string, findings: DeviceUiDryFinding[]) {
    const criticalFiles = [
        "src/app/layout.tsx",
        "src/components/CoreLayoutWrapper.tsx",
        "src/components/Chat/ChatExperience.tsx",
        "src/components/Chat/ChatRouteShell.tsx",
        "src/components/PurchaseModal.tsx",
        "src/components/Drops/LockedDropPreviewView.tsx",
        "src/app/drops/[id]/preview/loading.tsx",
        "src/components/DropPreviewModal.tsx",
        "src/lib/user-mobile-shell.ts",
    ];

    for (const filePath of criticalFiles) {
        const file = readIfExists(root, filePath);
        if (!file) continue;
        const matches = Array.from(file.source.matchAll(/100vh/gu));
        for (const match of matches) {
            createFinding(findings, {
                idBase: "raw-100vh",
                routeOrSurface: surfaceForFile(file.filePath),
                category: "viewport_unit",
                severity: file.filePath.includes("Chat") || file.filePath.includes("LockedDropPreview") || file.filePath.includes("PurchaseModal") ? "critical" : "major",
                filePath: file.filePath,
                line: lineOfIndex(file.source, match.index ?? 0),
                evidence: ["Found raw 100vh in a shell-critical surface."],
                expectedRule: "Mobile shell, chat, wallet, and preview surfaces must use 100dvh or shared shell variables.",
                actualPattern: "100vh",
                canAutofix: true,
                autofixConfidence: 0.95,
                suggestedFix: "Replace exact shell-safe 100vh usage with 100dvh after confirming the class is not a documented desktop-only fallback.",
                humanReadableWarning: "A shell-critical surface uses raw 100vh, which can mismeasure Safari/PWA chrome.",
                deviceProfiles: [...MOBILE_DEVICE_PROFILE_IDS, "small-tablet"],
            });
        }
    }
}

function scanBottomNavAndSafeArea(root: string, findings: DeviceUiDryFinding[]) {
    const tokenSource = readRequired(root, "src/lib/user-mobile-shell.ts");
    if (tokenSource.includes('CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = "0px"')) {
        createFinding(findings, {
            idBase: "chat-zero-bottom-offset",
            routeOrSurface: "chat_inbox",
            category: "bottom_nav",
            severity: "major",
            filePath: "src/lib/user-mobile-shell.ts",
            line: lineOf(tokenSource, "CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET"),
            evidence: ["CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET is exactly 0px."],
            expectedRule: "Visible chat controls must sit 12px-16px above the mobile bottom nav using shared shell tokens.",
            actualPattern: 'CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = "0px"',
            canAutofix: true,
            autofixConfidence: 0.95,
            suggestedFix: "Replace the zero offset with CHAT_LIST_CONTROLS_BOTTOM_OFFSET or the approved chat bottom-nav-safe token.",
            humanReadableWarning: "Chat list controls can collide with the mobile bottom navigation.",
            deviceProfiles: MOBILE_DEVICE_PROFILE_IDS,
        });
    }

    const shellCriticalFiles = [
        "src/components/Feedback/GlobalBugReportTrigger.tsx",
        "src/components/Navigation/ScrollToTop.tsx",
        "src/components/Chat/ChatExperience.tsx",
        "src/components/Drops/LockedDropPreviewView.tsx",
        "src/components/DropPreviewModal.tsx",
        "src/components/PurchaseModal.tsx",
    ];
    for (const filePath of shellCriticalFiles) {
        const file = readIfExists(root, filePath);
        if (!file) continue;
        const hasHardcodedSafeArea = /bottom-\[calc\(env\(safe-area-inset-bottom\)\+/.test(file.source) || /bottom:\s*`?calc\(env\(safe-area-inset-bottom\)/.test(file.source);
        if (hasHardcodedSafeArea && !file.source.includes("USER_MOBILE") && !file.source.includes("user-mobile-bottom-nav")) {
            createFinding(findings, {
                idBase: "hardcoded-safe-area-bottom",
                routeOrSurface: surfaceForFile(file.filePath),
                category: "safe_area",
                severity: "major",
                filePath: file.filePath,
                line: lineOf(file.source, "safe-area-inset-bottom"),
                evidence: ["Hardcoded safe-area bottom math appears outside the shared shell token file."],
                expectedRule: "Floating controls and sticky CTAs must consume shared shell tokens for bottom-nav and safe-area clearance.",
                actualPattern: "bottom safe-area calc outside shared token",
                canAutofix: false,
                autofixConfidence: 0,
                suggestedFix: "Move the bottom offset to src/lib/user-mobile-shell.ts or consume an existing exported shell token.",
                humanReadableWarning: "A visible bottom control may be correct on one phone but overlap in browser or standalone PWA mode.",
                deviceProfiles: MOBILE_DEVICE_PROFILE_IDS,
            });
        }

        const fixedBottomWithoutToken = /(fixed|sticky)[^"']*bottom-(?:0|\[[^\]]+\])/.test(file.source)
            && !file.source.includes("user-mobile-bottom-nav")
            && !file.source.includes("USER_MOBILE")
            && !file.source.includes("safe-area-inset-bottom");
        if (fixedBottomWithoutToken) {
            createFinding(findings, {
                idBase: "fixed-bottom-without-token",
                routeOrSurface: surfaceForFile(file.filePath),
                category: "bottom_nav",
                severity: "critical",
                filePath: file.filePath,
                line: lineOf(file.source, "bottom-"),
                evidence: ["A fixed/sticky bottom control is present without visible bottom-nav/safe-area token evidence."],
                expectedRule: "Bottom CTAs, composers, and controls must reserve bottom nav plus safe area and breathing room.",
                actualPattern: "fixed/sticky bottom control without shared bottom token",
                humanReadableWarning: "A bottom CTA or composer can render beneath the mobile bottom navigation.",
                deviceProfiles: MOBILE_DEVICE_PROFILE_IDS,
            });
        }
    }
}

function scanTopNavClearance(root: string, findings: DeviceUiDryFinding[]) {
    const coreLayout = readRequired(root, "src/components/CoreLayoutWrapper.tsx");
    if (!coreLayout.includes("--root-shell-top-spacing")) {
        createFinding(findings, {
            idBase: "missing-root-shell-top-spacing",
            routeOrSurface: "dashboard",
            category: "top_nav",
            severity: "critical",
            filePath: "src/components/CoreLayoutWrapper.tsx",
            evidence: ["CoreLayoutWrapper does not expose --root-shell-top-spacing."],
            expectedRule: "Fixed/floating top navigation requires a shared top spacing variable consumed by route shells.",
            actualPattern: "missing --root-shell-top-spacing",
            humanReadableWarning: "Routes may start under the fixed KandyDrops navigation.",
            deviceProfiles: TOUCH_DEVICE_PROFILE_IDS,
        });
    }

    const hero = readIfExists(root, "src/components/Hero.tsx");
    if (hero && !hero.source.includes("var(--root-shell-top-spacing")) {
        createFinding(findings, {
            idBase: "hero-no-shell-top-token",
            routeOrSurface: "home_guest_hero",
            category: "top_nav",
            severity: "major",
            filePath: hero.filePath,
            evidence: ["Hero shell does not consume the root shell top spacing token."],
            expectedRule: "Home hero should center against the shared top nav and bottom nav shell variables.",
            actualPattern: "hero min-height without root shell top spacing",
            humanReadableWarning: "Home hero content can sit too high or too low across browser/PWA chrome.",
            deviceProfiles: MOBILE_DEVICE_PROFILE_IDS,
        });
    }
}

function scanChat(root: string, findings: DeviceUiDryFinding[]) {
    const chat = readIfExists(root, "src/components/Chat/ChatExperience.tsx");
    const shell = readIfExists(root, "src/lib/user-mobile-shell.ts");
    if (!chat || !shell) return;

    const requiredMarkers = [
        ["data-chat-viewport-owner=\"internal\"", "chat viewport owner marker"],
        ["data-chat-input-focus-stable=\"true\"", "chat input focus stability marker"],
        ["data-chat-composer-chin=\"compact\"", "compact composer chin marker"],
        ["data-chat-density=\"public-beta-compact\"", "compact chat density marker"],
    ] as const;
    for (const [marker, label] of requiredMarkers) {
        if (!chat.source.includes(marker)) {
            createFinding(findings, {
                idBase: `missing-${label.replace(/\W+/g, "-")}`,
                routeOrSurface: marker.includes("composer") ? "chat_thread" : "chat_inbox",
                category: "chat_shell",
                severity: marker.includes("input-focus") || marker.includes("viewport-owner") ? "critical" : "major",
                filePath: chat.filePath,
                evidence: [`Missing ${label}: ${marker}.`],
                expectedRule: "Chat list and thread views must expose compact shell debug truth markers.",
                actualPattern: "missing chat debug marker",
                humanReadableWarning: "The chat dry audit cannot prove viewport ownership or compact composer stability.",
                deviceProfiles: MOBILE_DEVICE_PROFILE_IDS,
            });
        }
    }

    if (!chat.source.includes("100dvh") && !shell.source.includes("100dvh") && !shell.source.includes("--chat-visual-viewport-height")) {
        createFinding(findings, {
            idBase: "chat-no-dvh-token",
            routeOrSurface: "chat_thread",
            category: "viewport_unit",
            severity: "critical",
            filePath: chat.filePath,
            evidence: ["Chat shell lacks 100dvh or --chat-visual-viewport-height ownership evidence."],
            expectedRule: "Chat route owns an internal 100dvh-based visual viewport shell.",
            actualPattern: "missing 100dvh/shared chat viewport token",
            humanReadableWarning: "Chat can drift below the navbar or lock after keyboard focus.",
            deviceProfiles: MOBILE_DEVICE_PROFILE_IDS,
        });
    }

    if (!shell.source.includes("CHAT_THREAD_COMPOSER_PADDING_BOTTOM") || !chat.source.includes("CHAT_THREAD_COMPOSER_PADDING_BOTTOM")) {
        createFinding(findings, {
            idBase: "chat-composer-no-shared-padding-token",
            routeOrSurface: "chat_thread",
            category: "bottom_nav",
            severity: "major",
            filePath: chat.filePath,
            evidence: ["Composer bottom padding token is not defined and consumed by the chat component."],
            expectedRule: "Thread composer bottom padding must reserve bottom nav plus safe area through shared chat tokens.",
            actualPattern: "missing CHAT_THREAD_COMPOSER_PADDING_BOTTOM consumption",
            humanReadableWarning: "Chat composer can grow a bottom chin or overlap the bottom nav.",
            deviceProfiles: MOBILE_DEVICE_PROFILE_IDS,
        });
    }

    if (/on(?:Focus|Click)=\{[^}]*reportClientIssue/u.test(chat.source) || /on(?:Focus|Click)=\{[^}]*reportRealtimeIssue/u.test(chat.source)) {
        createFinding(findings, {
            idBase: "chat-hot-handler-reporting",
            routeOrSurface: "chat_thread",
            category: "keyboard_focus",
            severity: "major",
            filePath: chat.filePath,
            evidence: ["Direct diagnostic reporting call appears in a tap/focus handler."],
            expectedRule: "Diagnostics must be deferred out of chat tap/focus paths.",
            actualPattern: "reportClientIssue/reportRealtimeIssue in hot handler",
            humanReadableWarning: "A chat tap or focus path may block input responsiveness.",
            deviceProfiles: MOBILE_DEVICE_PROFILE_IDS,
        });
    }

    if (!/(h-12|min-h-12|min-h-\[3rem\]|h-\[48px\])/.test(chat.source)) {
        createFinding(findings, {
            idBase: "chat-missing-48px-controls",
            routeOrSurface: "chat_thread",
            category: "chat_shell",
            severity: "major",
            filePath: chat.filePath,
            evidence: ["Could not find obvious 48px/h-12 composer control sizing."],
            expectedRule: "Chat input row and send button target 48px-52px height.",
            actualPattern: "missing compact h-12/min-h-12 control evidence",
            humanReadableWarning: "Chat composer controls may violate compact public-beta sizing.",
            deviceProfiles: MOBILE_DEVICE_PROFILE_IDS,
        });
    }
}

function scanWallet(root: string, findings: DeviceUiDryFinding[]) {
    const wallet = readIfExists(root, "src/components/PurchaseModal.tsx");
    if (!wallet) return;

    const checks = [
        ["data-wallet-density=\"public-beta-compact\"", "wallet compact density marker", "major"],
        ["data-wallet-balance-chip=\"split-source\"", "split source balance marker", "major"],
        ["data-wallet-package-subcopy=\"removed\"", "package subcopy removed marker", "major"],
    ] as const;
    for (const [needle, label, severity] of checks) {
        if (!wallet.source.includes(needle)) {
            createFinding(findings, {
                idBase: `wallet-missing-${label.replace(/\W+/g, "-")}`,
                routeOrSurface: "wallet_modal",
                category: "wallet_density",
                severity,
                filePath: wallet.filePath,
                evidence: [`Missing ${label}: ${needle}.`],
                expectedRule: "PurchaseModal must expose compact public-beta density markers.",
                actualPattern: "missing wallet compact density marker",
                humanReadableWarning: "Wallet modal density can regress without machine-readable source truth.",
                deviceProfiles: MOBILE_DEVICE_PROFILE_IDS,
            });
        }
    }

    if (/paid\s*\+\s*.*bonus\s*GumDrops|paid GumDrops/.test(wallet.source)) {
        createFinding(findings, {
            idBase: "wallet-third-line-subcopy",
            routeOrSurface: "wallet_modal",
            category: "wallet_density",
            severity: "major",
            filePath: wallet.filePath,
            evidence: ["Package row paid/bonus explanatory subcopy appears in PurchaseModal source."],
            expectedRule: "Wallet rows show total delivered GumDrops, label, price, and compact purple bonus chip only.",
            actualPattern: "visible paid/bonus row subcopy",
            humanReadableWarning: "PurchaseModal package rows can become vertically sprawling on mobile.",
            deviceProfiles: MOBILE_DEVICE_PROFILE_IDS,
        });
    }

    if (wallet.source.includes("emerald")) {
        createFinding(findings, {
            idBase: "wallet-emerald-bonus-chip",
            routeOrSurface: "wallet_modal",
            category: "wallet_density",
            severity: "major",
            filePath: wallet.filePath,
            evidence: ["Emerald classes remain in PurchaseModal."],
            expectedRule: "Bonus chips use KandyDrops brand-purple styling.",
            actualPattern: "emerald bonus chip class",
            canAutofix: true,
            autofixConfidence: 0.95,
            suggestedFix: "Replace exact emerald bonus-chip classes with the approved brand-purple token classes.",
            humanReadableWarning: "Wallet bonus chips can drift from the public-beta compact brand treatment.",
            deviceProfiles: MOBILE_DEVICE_PROFILE_IDS,
        });
    }
}

function scanExperiences(root: string, findings: DeviceUiDryFinding[]) {
    const experiences = readIfExists(root, "src/app/experiences/ExperiencesClient.tsx");
    const daily = readIfExists(root, "src/components/Dashboard/DailyCheckIn.tsx");
    if (!experiences || !daily) return;

    if (experiences.source.includes("Daily reset") || experiences.source.includes("Reward loop")) {
        createFinding(findings, {
            idBase: "experiences-hero-explainer-cards",
            routeOrSurface: "experiences_page",
            category: "vertical_sprawl",
            severity: "major",
            filePath: experiences.filePath,
            evidence: ["Experiences hero still includes Daily reset / Reward loop explainer copy."],
            expectedRule: "Experiences uses compact retention-hub intro without redundant hero explainer cards.",
            actualPattern: "Daily reset / Reward loop cards present",
            humanReadableWarning: "Experiences page can become vertically sprawling before core actions.",
            deviceProfiles: MOBILE_DEVICE_PROFILE_IDS,
        });
    }
    if (!experiences.source.includes('data-experiences-layout="public-beta-compact"')) {
        createFinding(findings, {
            idBase: "experiences-missing-compact-layout-marker",
            routeOrSurface: "experiences_page",
            category: "debug_truth",
            severity: "moderate",
            filePath: experiences.filePath,
            evidence: ["Missing data-experiences-layout public beta compact marker."],
            expectedRule: "Experiences compact layout must expose source-debug truth.",
            actualPattern: "missing data-experiences-layout marker",
            humanReadableWarning: "The dry audit cannot prove Experiences compact mode remains active.",
            deviceProfiles: MOBILE_DEVICE_PROFILE_IDS,
        });
    }
    if (!experiences.source.includes('variant="experiences"') && !experiences.source.includes("compact")) {
        createFinding(findings, {
            idBase: "experiences-dailycheckin-not-compact",
            routeOrSurface: "daily_checkin",
            category: "vertical_sprawl",
            severity: "major",
            filePath: experiences.filePath,
            evidence: ["Experiences does not pass a compact/experiences variant into DailyCheckIn."],
            expectedRule: "Experiences DailyCheckIn hides welcome header and tightens vertical rhythm.",
            actualPattern: "DailyCheckIn rendered without compact variant",
            humanReadableWarning: "Experiences can render the full Dashboard DailyCheckIn header.",
            deviceProfiles: MOBILE_DEVICE_PROFILE_IDS,
        });
    }
    if (!daily.source.includes("data-daily-checkin-variant")) {
        createFinding(findings, {
            idBase: "dailycheckin-missing-variant-marker",
            routeOrSurface: "daily_checkin",
            category: "debug_truth",
            severity: "moderate",
            filePath: daily.filePath,
            evidence: ["DailyCheckIn does not expose data-daily-checkin-variant."],
            expectedRule: "Dashboard and Experiences DailyCheckIn variants must be machine-visible.",
            actualPattern: "missing data-daily-checkin-variant",
            humanReadableWarning: "Dashboard/Experiences DailyCheckIn variant drift may be invisible to source audits.",
            deviceProfiles: TOUCH_DEVICE_PROFILE_IDS,
        });
    }
}

function scanPreview(root: string, findings: DeviceUiDryFinding[]) {
    const previewView = readIfExists(root, "src/components/Drops/LockedDropPreviewView.tsx");
    const previewPage = readIfExists(root, "src/app/drops/[id]/preview/page.tsx");
    const safeTruth = readIfExists(root, "src/lib/locked-drop-preview-truth.ts");
    if (!previewView || !previewPage || !safeTruth) return;

    for (const file of [previewView, previewPage]) {
        if (/\bcontentUrls\b|\bcontentUrl\b/.test(file.source)) {
            createFinding(findings, {
                idBase: "locked-preview-content-url-reference",
                routeOrSurface: "full_page_drop_preview",
                category: "content_protection",
                severity: "critical",
                filePath: file.filePath,
                line: lineOf(file.source, "contentUrl"),
                evidence: ["Locked preview surface references contentUrl/contentUrls."],
                expectedRule: "Locked previews show public cover art and safe metadata only before unlock.",
                actualPattern: "contentUrl/contentUrls in preview surface",
                humanReadableWarning: "Locked preview may expose internal content URLs before entitlement.",
                deviceProfiles: ALL_DEVICE_PROFILE_IDS,
            });
        }
    }
    if (safeTruth.source.includes("contentUrls:") || safeTruth.source.includes("contentUrl:")) {
        createFinding(findings, {
            idBase: "safe-preview-helper-exposes-content-url",
            routeOrSurface: "full_page_drop_preview",
            category: "content_protection",
            severity: "critical",
            filePath: safeTruth.filePath,
            evidence: ["Safe locked-preview helper serializes contentUrl/contentUrls."],
            expectedRule: "Safe preview fields exclude internal content URLs.",
            actualPattern: "contentUrl/contentUrls in safe preview object",
            humanReadableWarning: "Safe preview payload can leak protected content metadata.",
            deviceProfiles: ALL_DEVICE_PROFILE_IDS,
        });
    }

    for (const marker of ["data-drop-preview-page=\"true\"", "data-safe-preview-fields-only=\"true\"", "data-drop-preview-urgency-tier"]) {
        if (!previewView.source.includes(marker)) {
            createFinding(findings, {
                idBase: `preview-missing-${marker.replace(/\W+/g, "-")}`,
                routeOrSurface: "full_page_drop_preview",
                category: "debug_truth",
                severity: "major",
                filePath: previewView.filePath,
                evidence: [`Missing preview marker: ${marker}.`],
                expectedRule: "Full-page locked preview must expose safety, CTA, social proof, and urgency debug truth.",
                actualPattern: "missing preview debug marker",
                humanReadableWarning: "The dry audit cannot prove locked preview safety and urgency state.",
                deviceProfiles: MOBILE_DEVICE_PROFILE_IDS,
            });
        }
    }

    if (!previewView.source.includes("user-mobile-bottom-nav-reserved-height")) {
        createFinding(findings, {
            idBase: "preview-sticky-cta-no-bottom-token",
            routeOrSurface: "full_page_drop_preview",
            category: "preview_cta",
            severity: "critical",
            filePath: previewView.filePath,
            evidence: ["Preview view does not reserve user mobile bottom nav height."],
            expectedRule: "Sticky preview CTA must sit above visible mobile bottom nav in browser and standalone PWA.",
            actualPattern: "missing user-mobile-bottom-nav-reserved-height",
            humanReadableWarning: "Preview CTA can hide behind the mobile bottom navigation.",
            deviceProfiles: MOBILE_DEVICE_PROFILE_IDS,
        });
    }
}

function scanDropGrid(root: string, findings: DeviceUiDryFinding[]) {
    const grid = readIfExists(root, "src/components/DropGrid.tsx");
    const layout = readIfExists(root, "src/components/DropCardLayout.tsx");
    const featured = readIfExists(root, "src/components/FeaturedCarousel.tsx");
    if (!grid || !layout || !featured) return;

    if (grid.source.includes("priority={index <") || layout.source.includes("preload={true}") || layout.source.includes("fetchPriority=\"high\"")) {
        createFinding(findings, {
            idBase: "grid-repeated-card-priority",
            routeOrSurface: "drop_card_grid",
            category: "image_loading",
            severity: "major",
            filePath: grid.source.includes("priority={index <") ? grid.filePath : layout.filePath,
            evidence: ["Drop grid/card image source includes repeated preload/high-priority behavior."],
            expectedRule: "Grid/list/library images are lazy and low priority by default.",
            actualPattern: "priority/preload/high fetch priority on repeated cards",
            humanReadableWarning: "Multiple card images may compete with the route LCP image.",
            deviceProfiles: TOUCH_DEVICE_PROFILE_IDS,
        });
    }
    if (/sizes=.*100vw/.test(layout.source)) {
        createFinding(findings, {
            idBase: "grid-card-100vw-sizes",
            routeOrSurface: "drop_card_grid",
            category: "drop_grid",
            severity: "major",
            filePath: layout.filePath,
            evidence: ["Drop card image sizes include 100vw."],
            expectedRule: "Two-column mobile cards should use about 50vw, not 100vw, unless wide-span documented.",
            actualPattern: "100vw card sizes",
            humanReadableWarning: "Drop cards can download oversized images on mobile.",
            deviceProfiles: MOBILE_DEVICE_PROFILE_IDS,
        });
    }
    for (const marker of ["data-drop-cover-treatment", "data-drop-cta-state", "hasProductCoverBlur", "imageLoaded && hasProductCoverBlur"]) {
        if (!layout.source.includes(marker)) {
            createFinding(findings, {
                idBase: `drop-card-missing-${marker.replace(/\W+/g, "-")}`,
                routeOrSurface: "drop_card_grid",
                category: marker.includes("Blur") ? "drop_grid" : "debug_truth",
                severity: marker.includes("Blur") ? "major" : "moderate",
                filePath: layout.filePath,
                evidence: [`Missing Drop card marker/pattern: ${marker}.`],
                expectedRule: "Drop cover blur must be product-state driven and debug-visible.",
                actualPattern: "missing drop card visibility truth marker",
                humanReadableWarning: "Drop cover blur/CTA state can drift from affordability truth.",
                deviceProfiles: TOUCH_DEVICE_PROFILE_IDS,
            });
        }
    }

    if (!layout.source.includes("getImageLoadingPolicy(\"drops_grid\"")) {
        createFinding(findings, {
            idBase: "drop-card-no-image-policy",
            routeOrSurface: "drop_card_grid",
            category: "image_loading",
            severity: "major",
            filePath: layout.filePath,
            evidence: ["DropCardLayout is not consuming the shared image loading policy."],
            expectedRule: "Critical image surfaces use src/lib/image-loading-policy.ts.",
            actualPattern: "missing getImageLoadingPolicy(\"drops_grid\")",
            humanReadableWarning: "Drop cards may regress image loading without the shared policy.",
            deviceProfiles: TOUCH_DEVICE_PROFILE_IDS,
        });
    }
}

function scanFeatured(root: string, findings: DeviceUiDryFinding[]) {
    const featured = readIfExists(root, "src/components/FeaturedCarousel.tsx");
    if (!featured) return;

    const stalePatterns = [
        ["LifetimeProgressBar", "timer lifetime progress bar"],
        ["w-[104px]", "old fixed timer pill width"],
    ] as const;
    for (const [pattern, label] of stalePatterns) {
        if (featured.source.includes(pattern)) {
            createFinding(findings, {
                idBase: `featured-stale-${label.replace(/\W+/g, "-")}`,
                routeOrSurface: "featured_carousel",
                category: "drop_grid",
                severity: "major",
                filePath: featured.filePath,
                line: lineOf(featured.source, pattern),
                evidence: [`Found ${label}.`],
                expectedRule: "Featured carousel uses compact timer, no progress bar, cover-aware CTA, and adaptive glass chips.",
                actualPattern: pattern,
                humanReadableWarning: "Featured carousel visual clutter or static accent treatment can regress.",
                deviceProfiles: MOBILE_DEVICE_PROFILE_IDS,
            });
        }
    }
    if (featured.source.includes("from-brand-purple to-purple-500") && !featured.source.includes("data-featured-cta-cover-aware=\"true\"")) {
        createFinding(findings, {
            idBase: "featured-stale-static-only-purple-CTA-gradient",
            routeOrSurface: "featured_carousel",
            category: "drop_grid",
            severity: "major",
            filePath: featured.filePath,
            line: lineOf(featured.source, "from-brand-purple to-purple-500"),
            evidence: ["Static purple CTA gradient appears without cover-aware CTA marker."],
            expectedRule: "Featured carousel uses cover-aware CTA gradients with a brand fallback only as one mapped accent.",
            actualPattern: "from-brand-purple to-purple-500 without data-featured-cta-cover-aware",
            humanReadableWarning: "Featured carousel CTA treatment may be static instead of cover-aware.",
            deviceProfiles: MOBILE_DEVICE_PROFILE_IDS,
        });
    }
    if (!featured.source.includes("totalUnwraps > 10")) {
        createFinding(findings, {
            idBase: "featured-social-proof-threshold-missing",
            routeOrSurface: "featured_carousel",
            category: "drop_grid",
            severity: "major",
            filePath: featured.filePath,
            evidence: ["Featured social proof threshold totalUnwraps > 10 is missing."],
            expectedRule: "Featured social proof shows unwraps only after total unlocks exceed 10; otherwise views.",
            actualPattern: "missing totalUnwraps > 10 threshold",
            humanReadableWarning: "Featured carousel may show weak unwrap counts such as 0 unwrapped.",
            deviceProfiles: TOUCH_DEVICE_PROFILE_IDS,
        });
    }
    if (!featured.source.includes("🎥") && !featured.source.includes("ðŸŽ¥")) {
        createFinding(findings, {
            idBase: "featured-video-icon-missing-camera",
            routeOrSurface: "featured_carousel",
            category: "debug_truth",
            severity: "major",
            filePath: featured.filePath,
            evidence: ["Featured video chip does not render the camera indicator."],
            expectedRule: "Video file chip uses a camera indicator for image/video distinction.",
            actualPattern: "missing camera video indicator",
            humanReadableWarning: "Featured video chips may be hard to distinguish from image chips.",
            deviceProfiles: TOUCH_DEVICE_PROFILE_IDS,
        });
    }
    if (!featured.source.includes("getImageLoadingPolicy(\"featured_carousel\"")) {
        createFinding(findings, {
            idBase: "featured-no-image-policy",
            routeOrSurface: "featured_carousel",
            category: "image_loading",
            severity: "major",
            filePath: featured.filePath,
            evidence: ["FeaturedCarousel is not consuming the shared image loading policy."],
            expectedRule: "Featured carousel uses index-aware shared image policy.",
            actualPattern: "missing getImageLoadingPolicy(\"featured_carousel\")",
            humanReadableWarning: "Featured slides may all load with the same priority.",
            deviceProfiles: TOUCH_DEVICE_PROFILE_IDS,
        });
    }
}

function scanTouchTargets(root: string, findings: DeviceUiDryFinding[]) {
    const files = [
        "src/components/Navigation/MobileBottomBar.tsx",
        "src/components/Chat/ChatExperience.tsx",
        "src/components/Drops/LockedDropPreviewView.tsx",
        "src/components/PurchaseModal.tsx",
    ];
    for (const filePath of files) {
        const file = readIfExists(root, filePath);
        if (!file) continue;
        const riskyButtonPattern = /<button[\s\S]{0,220}className=["'{`][\s\S]{0,220}(?:\bh-7\b|\bh-8\b|\bmin-h-8\b|\bpy-1\b)(?![\s\S]{0,120}(?:min-h-11|h-11|h-12|min-h-12|w-11))/gu;
        const match = riskyButtonPattern.exec(file.source);
        if (match) {
            createFinding(findings, {
                idBase: "small-critical-touch-target",
                routeOrSurface: surfaceForFile(file.filePath),
                category: "touch_target",
                severity: file.filePath.includes("MobileBottomBar") || file.filePath.includes("LockedDropPreview") ? "critical" : "major",
                filePath: file.filePath,
                line: lineOfIndex(file.source, match.index),
                evidence: ["Found a compact button class without obvious 44px min touch target evidence."],
                expectedRule: "Critical mobile controls preserve at least 44px touch targets.",
                actualPattern: "h-7/h-8/py-1 button without h-11/min-h-11 evidence",
                humanReadableWarning: "A critical mobile button may be below Apple/KandyDrops touch target size.",
                deviceProfiles: TOUCH_DEVICE_PROFILE_IDS,
            });
        }
    }
}

function scanBreakpointsAndDesktopCaps(root: string, findings: DeviceUiDryFinding[]) {
    const allowlistedArbitrary = new Set(["360px", "480px", "600px", "768px", "840px", "960px", "1024px", "1280px", "1440px", "1600px"]);
    const files = Array.from(
        new Set(DEVICE_UI_SURFACES.flatMap((surface) => surface.files.map(normalizePath))),
    ).filter((file) => !file.includes("device-layout-contract.ts") && existsSync(join(root, file)));
    for (const filePath of files) {
        const source = readRequired(root, filePath);
        for (const match of source.matchAll(/(?:max|min)-\[(\d+px)\]/gu)) {
            const px = match[1];
            if (!allowlistedArbitrary.has(px)) {
                createFinding(findings, {
                    idBase: "undocumented-arbitrary-breakpoint",
                    routeOrSurface: surfaceForFile(filePath),
                    category: "breakpoint",
                    severity: "major",
                    filePath,
                    line: lineOfIndex(source, match.index ?? 0),
                    evidence: [`Found arbitrary breakpoint ${match[0]}.`],
                    expectedRule: "Raw breakpoints must map to the device layout contract or be documented.",
                    actualPattern: match[0],
                    humanReadableWarning: "A component may be using freestyle responsive physics.",
                    deviceProfiles: ALL_DEVICE_PROFILE_IDS,
                    displayModes: ["browser"],
                });
            }
        }
    }

    const desktopCriticalFiles = [
        "src/app/drops/DropsClient.tsx",
        "src/app/experiences/ExperiencesClient.tsx",
        "src/components/Drops/LockedDropPreviewView.tsx",
        "src/app/creators/[username]/CreatorProfileClient.tsx",
    ];
    for (const filePath of desktopCriticalFiles) {
        const file = readIfExists(root, filePath);
        if (!file) continue;
        if (!/(max-w-|container|mx-auto)/.test(file.source)) {
            createFinding(findings, {
                idBase: "desktop-no-max-width-cap",
                routeOrSurface: surfaceForFile(file.filePath),
                category: "breakpoint",
                severity: "major",
                filePath: file.filePath,
                evidence: ["Desktop route/component lacks obvious max-width/container/mx-auto cap."],
                expectedRule: "Desktop and ultra-wide surfaces must cap content width.",
                actualPattern: "missing max-width cap evidence",
                humanReadableWarning: "Desktop or ultra-wide content may stretch into an unreadable full-width layout.",
                deviceProfiles: DESKTOP_DEVICE_PROFILE_IDS,
                displayModes: ["browser"],
            });
        }
    }
}

function scanImageLoading(root: string, findings: DeviceUiDryFinding[]) {
    const sourceFiles = walkFiles(root, "src");
    const imageTagPattern = /<(?:NextImage|Image)\b[\s\S]*?\/?>/gu;
    for (const filePath of sourceFiles) {
        const source = readRequired(root, filePath);
        for (const match of source.matchAll(imageTagPattern)) {
            const tag = match[0];
            if (/\bfill\b/.test(tag) && !/\bsizes=/.test(tag)) {
                createFinding(findings, {
                    idBase: "fill-image-missing-sizes",
                    routeOrSurface: surfaceForFile(filePath),
                    category: "image_loading",
                    severity: "major",
                    filePath,
                    line: lineOfIndex(source, match.index ?? 0),
                    evidence: ["A fill Next Image is missing sizes."],
                    expectedRule: "All fill images require accurate sizes.",
                    actualPattern: "fill image without sizes",
                    humanReadableWarning: "The browser may download oversized image assets on mobile.",
                    deviceProfiles: TOUCH_DEVICE_PROFILE_IDS,
                });
            }
            if (/\bpriority\b/.test(tag)) {
                createFinding(findings, {
                    idBase: "deprecated-next-image-priority",
                    routeOrSurface: surfaceForFile(filePath),
                    category: "image_loading",
                    severity: "major",
                    filePath,
                    line: lineOfIndex(source, match.index ?? 0),
                    evidence: ["Deprecated Next Image priority prop remains."],
                    expectedRule: "Next 16 LCP images use preload and fetchPriority through the shared image policy.",
                    actualPattern: "priority prop",
                    humanReadableWarning: "Image loading can drift from the sitewide Next 16 policy.",
                    deviceProfiles: ALL_DEVICE_PROFILE_IDS,
                });
            }
        }
    }

    const imagePolicy = readIfExists(root, "src/lib/image-loading-policy.ts");
    if (!imagePolicy) {
        createFinding(findings, {
            idBase: "missing-sitewide-image-policy",
            routeOrSurface: "drop_card_grid",
            category: "image_loading",
            severity: "major",
            filePath: "src/lib/image-loading-policy.ts",
            evidence: ["Missing sitewide image loading policy helper."],
            expectedRule: "Critical image loading must be surface-based and deterministic.",
            actualPattern: "missing image-loading-policy.ts",
            humanReadableWarning: "Agents may reintroduce per-component image loading guesses.",
            deviceProfiles: ALL_DEVICE_PROFILE_IDS,
        });
    }
}

function scanVerticalSprawl(root: string, findings: DeviceUiDryFinding[]) {
    const patterns = [
        {
            filePath: "src/components/PurchaseModal.tsx",
            surface: "wallet_modal" as const,
            category: "wallet_density" as const,
            regex: /p-[68]|space-y-[67]|gap-[67]/u,
            expected: "Wallet mobile modal uses compact density and avoids p-6/p-8 row sprawl.",
            warning: "Wallet modal may push checkout controls below the fold.",
        },
        {
            filePath: "src/app/experiences/ExperiencesClient.tsx",
            surface: "experiences_page" as const,
            category: "vertical_sprawl" as const,
            regex: /space-y-[67]|p-[68]/u,
            expected: "Experiences retention hub keeps compact public-beta vertical rhythm.",
            warning: "Experiences page may become vertically sprawling on iPhone-class screens.",
        },
    ];

    for (const pattern of patterns) {
        const file = readIfExists(root, pattern.filePath);
        if (!file) continue;
        const match = pattern.regex.exec(file.source);
        if (match) {
            createFinding(findings, {
                idBase: "vertical-sprawl-heuristic",
                routeOrSurface: pattern.surface,
                category: pattern.category,
                severity: "moderate",
                filePath: file.filePath,
                line: lineOfIndex(file.source, match.index),
                evidence: [`Found mobile sprawl heuristic class ${match[0]}.`],
                expectedRule: pattern.expected,
                actualPattern: match[0],
                humanReadableWarning: pattern.warning,
                deviceProfiles: MOBILE_DEVICE_PROFILE_IDS,
            });
        }
    }
}

function collectDeviceUiFindings(root: string) {
    const findings: DeviceUiDryFinding[] = [];
    scanViewportUnits(root, findings);
    scanBottomNavAndSafeArea(root, findings);
    scanTopNavClearance(root, findings);
    scanChat(root, findings);
    scanWallet(root, findings);
    scanExperiences(root, findings);
    scanPreview(root, findings);
    scanDropGrid(root, findings);
    scanFeatured(root, findings);
    scanTouchTargets(root, findings);
    scanBreakpointsAndDesktopCaps(root, findings);
    scanImageLoading(root, findings);
    scanVerticalSprawl(root, findings);
    return dedupeFindings(findings);
}

function scoreFromFindings(findings: DeviceUiDryFinding[], filter: (finding: DeviceUiDryFinding) => boolean) {
    let score = 100;
    for (const finding of findings.filter(filter)) {
        score += DEVICE_UI_SEVERITY_PENALTY[finding.severity];
    }
    return Math.max(0, Math.min(100, score));
}

function buildRecommendedFixOrder(findings: DeviceUiDryFinding[]) {
    const order = [
        "Resolve critical content-protection and bottom-nav overlap findings first.",
        "Repair chat viewport ownership, focus-stability, and composer sizing markers.",
        "Normalize wallet and modal density markers before mobile signoff.",
        "Fix preview CTA and safe-area findings before runtime screenshots.",
        "Tighten image loading, grid/card sizing, and breakpoint drift.",
        "Backfill debug truth markers so future dry audits can prove state.",
    ];

    if (findings.length === 0) {
        return ["No device UI dry-audit findings. Keep running score:device-ui before browser audits."];
    }

    return order.filter((entry) => {
        if (entry.includes("content-protection")) return findings.some((finding) => finding.category === "content_protection" || finding.category === "bottom_nav");
        if (entry.includes("chat")) return findings.some((finding) => finding.category === "chat_shell" || finding.category === "keyboard_focus");
        if (entry.includes("wallet")) return findings.some((finding) => finding.category === "wallet_density" || finding.category === "modal_density");
        if (entry.includes("preview")) return findings.some((finding) => finding.category === "preview_cta" || finding.routeOrSurface === "full_page_drop_preview");
        if (entry.includes("image")) return findings.some((finding) => finding.category === "image_loading" || finding.category === "drop_grid" || finding.category === "breakpoint");
        if (entry.includes("debug")) return findings.some((finding) => finding.category === "debug_truth");
        return true;
    });
}

export function buildDeviceUiDryAuditReport(options: BuildOptions = {}): DeviceUiDryAuditReport {
    const root = options.root ?? process.cwd();
    const generatedAt = options.generatedAt ?? new Date().toISOString();
    const findings = collectDeviceUiFindings(root);
    const criticalCount = findings.filter((finding) => finding.severity === "critical").length;
    const majorCount = findings.filter((finding) => finding.severity === "major").length;
    const safeAutofixesAvailable = findings.filter((finding) => finding.canAutofix && finding.autofixConfidence >= 0.95).length;

    const deviceScores: Record<string, number> = {};
    for (const profile of DEVICE_UI_DEVICE_PROFILES) {
        deviceScores[profile.id] = scoreFromFindings(findings, (finding) => finding.deviceProfile === profile.id);
    }

    const surfaceScores: Record<string, number> = {};
    for (const surface of DEVICE_UI_SURFACES) {
        surfaceScores[surface.id] = scoreFromFindings(findings, (finding) => finding.routeOrSurface === surface.id);
    }

    const deviceScoreValues = Object.values(deviceScores);
    const overallScore = Math.round(deviceScoreValues.reduce((sum, value) => sum + value, 0) / Math.max(1, deviceScoreValues.length));
    const overallStatus = getDeviceUiStatus(overallScore, criticalCount);

    return {
        generatedAt,
        overallScore,
        overallStatus,
        deviceScores,
        surfaceScores,
        findings,
        criticalCount,
        majorCount,
        safeAutofixesAvailable,
        recommendedFixOrder: buildRecommendedFixOrder(findings),
        minimalVerificationCommands: [
            "npm run score:device-ui",
            "npm run check:device-ui",
            "npm run typecheck only if TypeScript source changed",
            ...DEVICE_UI_FORBIDDEN_COMMANDS.map((command) => `forbidden by default: ${command}`),
        ],
    };
}

export function writeDeviceUiDryAuditReport(report: DeviceUiDryAuditReport, root = process.cwd()) {
    const reportPath = join(root, DEVICE_UI_DRY_AUDIT_REPORT_PATH);
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export function printDeviceUiDryAuditSummary(report: DeviceUiDryAuditReport) {
    console.log(`Device UI dry audit: ${report.overallScore}/${report.overallStatus}`);
    console.log(`Findings: ${report.findings.length} (${report.criticalCount} critical, ${report.majorCount} major)`);
    console.log(`Safe autofixes available: ${report.safeAutofixesAvailable}`);
    const topFindings = report.findings.slice(0, 5);
    if (topFindings.length > 0) {
        console.log("Top findings:");
        for (const finding of topFindings) {
            console.log(`- [${finding.severity}] ${finding.routeOrSurface}/${finding.deviceProfile}/${finding.displayMode}: ${finding.humanReadableWarning} (${finding.filePath}${finding.line ? `:${finding.line}` : ""})`);
        }
    }
    console.log("Minimal commands:");
    for (const command of report.minimalVerificationCommands.slice(0, 3)) {
        console.log(`- ${command}`);
    }
}
