import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

import {
  DEVICE_DISPLAY_MODES,
  DEVICE_LAYOUT_CLASSES,
} from "./device-layout-contract";

export type DeviceLayoutSeverity = "info" | "minor" | "moderate" | "major" | "critical";

export type DeviceLayoutCategory =
  | "breakpoint"
  | "display_mode"
  | "viewport"
  | "safe_area"
  | "top_nav"
  | "bottom_nav"
  | "floating_control"
  | "chat_shell"
  | "modal_sheet"
  | "drop_preview"
  | "touch_target"
  | "input_delay"
  | "telemetry_debug"
  | "content_protection"
  | "apple_cohesion"
  | "orphaned_logic";

export type DeviceLayoutFinding = {
  id: string;
  title: string;
  severity: DeviceLayoutSeverity;
  category: DeviceLayoutCategory;
  filePath: string;
  line?: number;
  excerpt?: string;
  scoreImpact: number;
  canAutofix: boolean;
  autofixConfidence: number;
  autofixPlan?: string;
  escalation: string;
  docsBasis: "google" | "apple" | "kandydrops" | "repo";
};

export type DeviceLayoutScoreReport = {
  score: number;
  status: "clean" | "pass" | "warning" | "beta-risk" | "fail";
  generatedAt: string;
  repoRoot: string;
  displayModeCoverage: string[];
  breakpointCoverage: string[];
  findings: DeviceLayoutFinding[];
  safeAutofixesAvailable: number;
  safeAutofixesApplied: number;
  criticalCount: number;
  majorCount: number;
  summary: string;
};

type SourceFile = {
  path: string;
  source: string;
};

type DeviceLayoutFindingInput = Omit<DeviceLayoutFinding, "id" | "scoreImpact"> & {
  id?: string;
};

export type DeviceLayoutScoreOptions = {
  root?: string;
  generatedAt?: string;
  safeAutofixesApplied?: number;
};

export type DeviceLayoutAutofixPlan = {
  findingId: string;
  filePath: string;
  oldText: string;
  newText: string;
  expectedOccurrences: number;
  description: string;
  confidence: number;
};

export type DeviceLayoutAutofixResult = {
  applied: number;
  skipped: Array<{ findingId: string; reason: string }>;
  plans: DeviceLayoutAutofixPlan[];
};

export const DEVICE_LAYOUT_SCORE_REPORT_PATH = "agent/state/device-layout-score.generated.json";

export const PUBLIC_SHELL_FILES = [
  "src/app/layout.tsx",
  "src/components/CoreLayoutWrapper.tsx",
  "src/components/Navbar.tsx",
  "src/components/Navigation/MobileBottomBar.tsx",
  "src/components/Navigation/ScrollToTop.tsx",
  "src/components/Feedback/GlobalBugReportTrigger.tsx",
  "src/lib/user-mobile-shell.ts",
] as const;

export const CHAT_FILES = [
  "src/components/Chat/ChatExperience.tsx",
  "src/components/Chat/ChatRouteShell.tsx",
  "src/lib/user-mobile-shell.ts",
] as const;

export const DROPS_FILES = [
  "src/app/drops/DropsClient.tsx",
  "src/components/DropCard.tsx",
  "src/components/DropCardLayout.tsx",
  "src/components/FeaturedCarousel.tsx",
  "src/components/DropPreviewModal.tsx",
] as const;

export const PREVIEW_FILES = [
  "src/components/DropPreviewModal.tsx",
  "src/app/drops/[id]/preview/page.tsx",
  "src/app/drops/[id]/preview/loading.tsx",
  "src/components/Drops/LockedDropPreviewClient.tsx",
  "src/components/Drops/LockedDropPreviewView.tsx",
  "src/lib/locked-drop-preview-truth.ts",
] as const;

const severityScoreImpact: Record<DeviceLayoutSeverity, number> = {
  info: 0,
  minor: -2,
  moderate: -5,
  major: -10,
  critical: -25,
};

const severityRank: Record<DeviceLayoutSeverity, number> = {
  info: 0,
  minor: 1,
  moderate: 2,
  major: 3,
  critical: 4,
};

const scoreCaps = {
  breakpoint: 15,
  viewportDisplay: 20,
  safeAreaNav: 20,
  touchCohesion: 12,
  chatInput: 20,
  previewProtection: 15,
  telemetryDebug: 10,
  orphanedLogic: 10,
} as const;

const categoryScoreGroup: Record<DeviceLayoutCategory, keyof typeof scoreCaps> = {
  breakpoint: "breakpoint",
  display_mode: "viewportDisplay",
  viewport: "viewportDisplay",
  safe_area: "safeAreaNav",
  top_nav: "safeAreaNav",
  bottom_nav: "safeAreaNav",
  floating_control: "safeAreaNav",
  chat_shell: "chatInput",
  input_delay: "chatInput",
  modal_sheet: "previewProtection",
  drop_preview: "previewProtection",
  content_protection: "previewProtection",
  touch_target: "touchCohesion",
  apple_cohesion: "touchCohesion",
  telemetry_debug: "telemetryDebug",
  orphaned_logic: "orphanedLogic",
};

const approvedViewportAutofixFiles = new Set([
  "src/components/Chat/ChatRouteShell.tsx",
  "src/components/Chat/ChatExperience.tsx",
  "src/components/CoreLayoutWrapper.tsx",
  "src/components/Drops/LockedDropPreviewView.tsx",
  "src/app/drops/[id]/preview/loading.tsx",
  "src/lib/user-mobile-shell.ts",
]);

const protectedPathPatterns = [
  /^src\/app\/api\/paypal\//u,
  /^src\/app\/api\/drops\/unlock/u,
  /^src\/app\/api\/drops\/content/u,
  /^src\/lib\/gumdrop-ledger\.ts$/u,
  /^src\/lib\/gumdrop-economics\.ts$/u,
  /^src\/lib\/server\/creator-experiences\.ts$/u,
  /^src\/lib\/server\/auth/u,
  /^src\/context\/AuthContext\.tsx$/u,
];

const allowedArbitraryBreakpointPx = new Set([360, 480, 600, 840, 960, 1280, 1440, 1600]);
const allowedArbitraryBreakpointComments = new Set([
  "src/lib/device-layout-contract.ts",
  "scripts/agent/validate-device-layout-contract.ts",
  "scripts/agent/validate-device-layout-score.ts",
]);

function normalizePath(filePath: string) {
  return filePath.replace(/\\/g, "/").replace(/^\.?\//u, "");
}

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function lineOf(source: string, needle: string) {
  const index = source.indexOf(needle);
  if (index < 0) {
    return undefined;
  }
  return source.slice(0, index).split(/\r?\n/u).length;
}

function excerpt(source: string, needle: string) {
  const line = source.split(/\r?\n/u).find((entry) => entry.includes(needle));
  return line?.trim();
}

function readIfExists(root: string, filePath: string): SourceFile | null {
  const normalizedPath = normalizePath(filePath);
  const fullPath = join(root, normalizedPath);
  if (!existsSync(fullPath)) {
    return null;
  }
  return {
    path: normalizedPath,
    source: readFileSync(fullPath, "utf8"),
  };
}

function readRequired(root: string, filePath: string) {
  return readFileSync(join(root, normalizePath(filePath)), "utf8");
}

function unique<T>(items: readonly T[]) {
  return Array.from(new Set(items));
}

function countOccurrences(source: string, needle: string) {
  return source.split(needle).length - 1;
}

function walkSourceFiles(root: string, startPath: string): string[] {
  const absoluteStart = join(root, startPath);
  if (!existsSync(absoluteStart)) {
    return [];
  }

  const files: string[] = [];
  for (const entry of readdirSync(absoluteStart)) {
    const absoluteEntry = join(absoluteStart, entry);
    const stat = statSync(absoluteEntry);
    if (stat.isDirectory()) {
      if ([".next", "node_modules", "out", "storybook-static"].includes(entry)) {
        continue;
      }
      files.push(...walkSourceFiles(root, relative(root, absoluteEntry)));
      continue;
    }

    if (/\.(ts|tsx|js|jsx|css)$/u.test(entry)) {
      files.push(normalizePath(relative(root, absoluteEntry)));
    }
  }

  return files;
}

function makeFinding(input: DeviceLayoutFindingInput): DeviceLayoutFinding {
  const normalizedPath = normalizePath(input.filePath);
  const signature = [
    input.category,
    input.title.toLowerCase().replace(/[^a-z0-9]+/gu, "-"),
    normalizedPath,
    input.line ?? "",
    input.excerpt?.replace(/\s+/gu, " ").trim().slice(0, 160) ?? "",
  ].join("|");
  return {
    ...input,
    id: input.id ?? `device-layout-${input.category}-${stableHash(signature)}`,
    filePath: normalizedPath,
    scoreImpact: severityScoreImpact[input.severity],
  };
}

function pushFinding(findings: DeviceLayoutFindingInput[], input: DeviceLayoutFindingInput) {
  findings.push(input);
}

function dedupeFindings(rawFindings: DeviceLayoutFindingInput[]) {
  const byKey = new Map<string, DeviceLayoutFinding>();
  for (const input of rawFindings) {
    const finding = makeFinding(input);
    const key = [
      finding.category,
      finding.title.toLowerCase().replace(/[^a-z0-9]+/gu, "-"),
      finding.filePath,
      finding.line ?? "",
      finding.excerpt?.replace(/\s+/gu, " ").trim().slice(0, 160) ?? "",
    ].join("|");
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, finding);
      continue;
    }

    const keepIncoming = severityRank[finding.severity] > severityRank[existing.severity]
      || (severityRank[finding.severity] === severityRank[existing.severity]
        && Math.abs(finding.scoreImpact) > Math.abs(existing.scoreImpact));
    byKey.set(key, keepIncoming ? finding : existing);
  }

  return Array.from(byKey.values()).sort((left, right) =>
    severityRank[right.severity] - severityRank[left.severity]
    || Math.abs(right.scoreImpact) - Math.abs(left.scoreImpact)
    || left.filePath.localeCompare(right.filePath));
}

function resolveStatus(score: number, criticalCount: number): DeviceLayoutScoreReport["status"] {
  if (criticalCount > 0) {
    return "fail";
  }
  if (score >= 95) {
    return "clean";
  }
  if (score >= 90) {
    return "pass";
  }
  if (score >= 80) {
    return "warning";
  }
  if (score >= 70) {
    return "beta-risk";
  }
  return "fail";
}

function isProtectedPath(filePath: string) {
  const normalizedPath = normalizePath(filePath);
  return protectedPathPatterns.some((pattern) => pattern.test(normalizedPath));
}

function scanViewport(root: string, findings: DeviceLayoutFindingInput[]) {
  for (const filePath of unique([...PUBLIC_SHELL_FILES, ...CHAT_FILES, ...PREVIEW_FILES])) {
    const file = readIfExists(root, filePath);
    if (!file) {
      continue;
    }

    if (file.source.includes("100vh")) {
      pushFinding(findings, {
        title: "Shell-critical surface uses 100vh instead of 100dvh or a shared shell token",
        severity: file.path.includes("Chat") || file.path.includes("/preview/") || file.path.includes("DropPreviewModal")
          ? "critical"
          : "major",
        category: "viewport",
        filePath: file.path,
        line: lineOf(file.source, "100vh"),
        excerpt: excerpt(file.source, "100vh"),
        canAutofix: approvedViewportAutofixFiles.has(file.path),
        autofixConfidence: approvedViewportAutofixFiles.has(file.path) ? 0.96 : 0,
        autofixPlan: approvedViewportAutofixFiles.has(file.path)
          ? "Replace exact `100vh` with `100dvh` through repair:layout."
          : undefined,
        escalation: approvedViewportAutofixFiles.has(file.path)
          ? "Autofix is exact-text only; keyboard and browser chrome behavior still requires runtime verification if the issue persists."
          : "Autofix blocked because this file is not in the approved shell-token replacement set.",
        docsBasis: "google",
      });
    }
  }

  const chatShell = readIfExists(root, "src/components/Chat/ChatRouteShell.tsx");
  if (chatShell && !chatShell.source.includes("USER_MOBILE_CHAT_VIEWPORT_HEIGHT") && !chatShell.source.includes("100dvh")) {
    pushFinding(findings, {
      title: "Chat shell does not reference a dynamic viewport or shared chat viewport token",
      severity: "major",
      category: "viewport",
      filePath: chatShell.path,
      canAutofix: false,
      autofixConfidence: 0,
      escalation: "Chat viewport ownership must be reviewed because keyboard behavior requires runtime verification.",
      docsBasis: "google",
    });
  }

  const previewView = readIfExists(root, "src/components/Drops/LockedDropPreviewView.tsx");
  if (previewView && !previewView.source.includes("100dvh") && !previewView.source.includes("--user-mobile-bottom-nav-reserved-height")) {
    pushFinding(findings, {
      title: "Locked drop preview does not reference dynamic viewport shell spacing",
      severity: "major",
      category: "viewport",
      filePath: previewView.path,
      canAutofix: false,
      autofixConfidence: 0,
      escalation: "Preview shell math needs route-level review before changing sticky CTA behavior.",
      docsBasis: "google",
    });
  }
}

function scanSafeAreaAndNav(root: string, findings: DeviceLayoutFindingInput[]) {
  for (const filePath of unique([...PUBLIC_SHELL_FILES, ...CHAT_FILES, ...PREVIEW_FILES])) {
    const file = readIfExists(root, filePath);
    if (!file) {
      continue;
    }

    const hardcodedBottomNeedle = "bottom-[calc(env(safe-area-inset-bottom)+";
    if (file.source.includes(hardcodedBottomNeedle) && file.path !== "src/lib/user-mobile-shell.ts") {
      const isKnownFloating = file.path.endsWith("GlobalBugReportTrigger.tsx") || file.path.endsWith("ScrollToTop.tsx");
      pushFinding(findings, {
        title: "Floating shell control uses hardcoded safe-area bottom math",
        severity: "major",
        category: "floating_control",
        filePath: file.path,
        line: lineOf(file.source, hardcodedBottomNeedle),
        excerpt: excerpt(file.source, hardcodedBottomNeedle),
        canAutofix: isKnownFloating,
        autofixConfidence: isKnownFloating ? 0.95 : 0,
        autofixPlan: isKnownFloating
          ? "Replace the exact hardcoded bottom offset with USER_MOBILE_FLOATING_CONTROL_BOTTOM_OFFSET."
          : undefined,
        escalation: isKnownFloating
          ? "Autofix is exact known-component only."
          : "Autofix blocked because route-specific bottom spacing intent is unknown.",
        docsBasis: "apple",
      });
    }

    for (const hackNeedle of ["mt-[-", "-mt-", "mb-[-", "-mb-", "-translate-y", "translate-y-"]) {
      if (file.source.includes(hackNeedle)) {
        pushFinding(findings, {
          title: "Shell-critical surface uses negative spacing or translate positioning",
          severity: "major",
          category: "safe_area",
          filePath: file.path,
          line: lineOf(file.source, hackNeedle),
          excerpt: excerpt(file.source, hackNeedle),
          canAutofix: false,
          autofixConfidence: 0,
          escalation: "Replace the layout hack with a shared shell token or component-owned spacing; visual verification may be required.",
          docsBasis: "apple",
        });
      }
    }

    if (
      file.source.includes("fixed bottom-0")
      && !file.source.includes("env(safe-area-inset-bottom)")
      && !file.source.includes("--user-mobile-bottom-nav-reserved-height")
      && !file.source.includes("USER_MOBILE")
    ) {
      pushFinding(findings, {
        title: "Fixed bottom control may render under mobile bottom nav or browser safe area",
        severity: "major",
        category: "bottom_nav",
        filePath: file.path,
        line: lineOf(file.source, "fixed bottom-0"),
        excerpt: excerpt(file.source, "fixed bottom-0"),
        canAutofix: false,
        autofixConfidence: 0,
        escalation: "Bottom CTA may sit under nav. Autofix blocked because component lacks shared shell token.",
        docsBasis: "apple",
      });
    }
  }

  const shell = readIfExists(root, "src/lib/user-mobile-shell.ts");
  if (shell?.source.includes("CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = \"0px\"")) {
    pushFinding(findings, {
      title: "Chat list floating action bottom offset is zero",
      severity: "major",
      category: "chat_shell",
      filePath: shell.path,
      line: lineOf(shell.source, "CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = \"0px\""),
      excerpt: excerpt(shell.source, "CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = \"0px\""),
      canAutofix: shell.source.includes("CHAT_LIST_CONTROLS_BOTTOM_OFFSET"),
      autofixConfidence: shell.source.includes("CHAT_LIST_CONTROLS_BOTTOM_OFFSET") ? 0.98 : 0,
      autofixPlan: "Replace exact zero offset with CHAT_LIST_CONTROLS_BOTTOM_OFFSET.",
      escalation: "Autofix is token-only. Do not tune chat keyboard behavior without runtime verification.",
      docsBasis: "kandydrops",
    });
  }

  const core = readIfExists(root, "src/components/CoreLayoutWrapper.tsx");
  const browserUtils = readIfExists(root, "src/lib/browser-utils.ts");
  const contract = readIfExists(root, "src/lib/device-layout-contract.ts");
  if ((browserUtils?.source.includes("isStandalone") || contract?.source.includes("detectDeviceDisplayMode")) && core && !core.source.includes("data-display-mode")) {
    pushFinding(findings, {
      title: "Display mode helper exists but app shell does not expose data-display-mode",
      severity: "moderate",
      category: "display_mode",
      filePath: core.path,
      canAutofix: false,
      autofixConfidence: 0,
      escalation: "Add the marker to the shell wrapper only after confirming the shell is already a client component.",
      docsBasis: "google",
    });
  }

  const nav = readIfExists(root, "src/components/Navigation/MobileBottomBar.tsx");
  if (
    nav?.source.includes("action?: \"purchase\"")
    && !nav.source.includes("intentional_nav_action_exception")
  ) {
    pushFinding(findings, {
      title: "Mobile bottom nav still contains wallet action semantics",
      severity: "moderate",
      category: "apple_cohesion",
      filePath: nav.path,
      line: lineOf(nav.source, "action?: \"purchase\""),
      excerpt: excerpt(nav.source, "action?: \"purchase\""),
      canAutofix: false,
      autofixConfidence: 0,
      escalation: "Tab bar used as action bar. Autofix blocked because product navigation intent needs review.",
      docsBasis: "apple",
    });
  }
}

function scanTouchTargets(root: string, findings: DeviceLayoutFindingInput[]) {
  const bottomNav = readIfExists(root, "src/components/Navigation/MobileBottomBar.tsx");
  if (bottomNav?.source.includes("h-10 min-w-0")) {
    pushFinding(findings, {
      title: "Mobile bottom nav item is below the 44px touch target contract",
      severity: "major",
      category: "touch_target",
      filePath: bottomNav.path,
      line: lineOf(bottomNav.source, "h-10 min-w-0"),
      excerpt: excerpt(bottomNav.source, "h-10 min-w-0"),
      canAutofix: false,
      autofixConfidence: 0,
      escalation: "Escalate sizing because bottom nav visual density requires UI verification.",
      docsBasis: "apple",
    });
  }

  const chat = readIfExists(root, "src/components/Chat/ChatExperience.tsx");
  if (chat) {
    if (!chat.source.includes("h-11 w-11")) {
      pushFinding(findings, {
        title: "Chat plus/list controls lack a 44px touch target marker",
        severity: "major",
        category: "touch_target",
        filePath: chat.path,
        canAutofix: false,
        autofixConfidence: 0,
        escalation: "Escalate chat control sizing because composer density and visual layout need verification.",
        docsBasis: "apple",
      });
    }
    if (!chat.source.includes("h-12 w-12")) {
      pushFinding(findings, {
        title: "Chat send control lacks a 48px touch target marker",
        severity: "major",
        category: "touch_target",
        filePath: chat.path,
        canAutofix: false,
        autofixConfidence: 0,
        escalation: "Escalate chat send-button sizing because composer density and visual layout need verification.",
        docsBasis: "apple",
      });
    }
  }

  const preview = readIfExists(root, "src/components/Drops/LockedDropPreviewView.tsx");
  if (preview && !preview.source.includes("min-h-[3.25rem]") && !preview.source.includes("min-h-12")) {
    pushFinding(findings, {
      title: "Locked preview primary CTA lacks a 44px+ mobile touch target marker",
      severity: "critical",
      category: "touch_target",
      filePath: preview.path,
      canAutofix: false,
      autofixConfidence: 0,
      escalation: "Critical CTA under 44px on mobile. Autofix blocked because CTA layout needs product review.",
      docsBasis: "apple",
    });
  }
}

function scanChatShell(root: string, findings: DeviceLayoutFindingInput[]) {
  const chat = readIfExists(root, "src/components/Chat/ChatExperience.tsx");
  const chatRouteShell = readIfExists(root, "src/components/Chat/ChatRouteShell.tsx");
  if (!chat) {
    return;
  }

  for (const marker of [
    "data-chat-viewport-owner=\"internal\"",
    "data-chat-input-focus-stable=\"true\"",
    "data-chat-composer-chin=\"compact\"",
    "data-chat-diagnostics-deferred=\"true\"",
  ]) {
    if (!chat.source.includes(marker)) {
      pushFinding(findings, {
        title: "Chat shell is missing a deterministic stability/debug marker",
        severity: "major",
        category: "telemetry_debug",
        filePath: chat.path,
        canAutofix: false,
        autofixConfidence: 0,
        escalation: `Add ${marker} to the owned chat shell wrapper after confirming list/thread mode ownership.`,
        docsBasis: "kandydrops",
      });
    }
  }

  if (chatRouteShell && !chatRouteShell.source.includes("document.documentElement") && !chatRouteShell.source.includes("mainElement.style.height")) {
    pushFinding(findings, {
      title: "Chat route may not own the viewport height internally",
      severity: "critical",
      category: "chat_shell",
      filePath: chatRouteShell.path,
      canAutofix: false,
      autofixConfidence: 0,
      escalation: "Chat route uses document scroll as main layout owner. Autofix blocked because keyboard behavior requires runtime verification.",
      docsBasis: "kandydrops",
    });
  }

  const directFocusHandlerPattern = /onFocus=\{[^}]*?(reportClientIssue|createCompactInteractionRecoveryGuard|createAutoHealingObserver)/u;
  const directTapHandlerPattern = /on(?:Click|PointerDown|TouchStart)=\{[^}]*?(reportClientIssue|reportRealtimeIssue|createCompactInteractionRecoveryGuard|createAutoHealingObserver)/u;
  for (const [pattern, title] of [
    [directFocusHandlerPattern, "Chat focus handler invokes diagnostics synchronously"],
    [directTapHandlerPattern, "Chat tap handler invokes diagnostics synchronously"],
  ] as const) {
    const match = chat.source.match(pattern);
    if (match) {
      pushFinding(findings, {
        title,
        severity: "major",
        category: "input_delay",
        filePath: chat.path,
        line: lineOf(chat.source, match[0]),
        excerpt: excerpt(chat.source, match[0]),
        canAutofix: false,
        autofixConfidence: 0,
        escalation: "Blocking diagnostics in hot tap/focus handlers must be deferred after paint; autofix blocked unless exact wrapper is known.",
        docsBasis: "google",
      });
    }
  }

  if (chat.source.includes("reportClientIssue(") && !chat.source.includes("deferChatDiagnosticReport")) {
    pushFinding(findings, {
      title: "Chat diagnostics are not routed through the deferred reporting helper",
      severity: "major",
      category: "input_delay",
      filePath: chat.path,
      line: lineOf(chat.source, "reportClientIssue("),
      excerpt: excerpt(chat.source, "reportClientIssue("),
      canAutofix: false,
      autofixConfidence: 0,
      escalation: "Autofix blocked because diagnostic call ownership needs handler-level review.",
      docsBasis: "google",
    });
  }

  if (chat.source.includes("createCompactInteractionRecoveryGuard") && !chat.source.includes("scheduleChatPostPaint")) {
    pushFinding(findings, {
      title: "Chat compact recovery guard is not clearly deferred after paint",
      severity: "major",
      category: "input_delay",
      filePath: chat.path,
      line: lineOf(chat.source, "createCompactInteractionRecoveryGuard"),
      excerpt: excerpt(chat.source, "createCompactInteractionRecoveryGuard"),
      canAutofix: false,
      autofixConfidence: 0,
      escalation: "Autofix blocked because recovery timing affects tap responsiveness and keyboard stability.",
      docsBasis: "google",
    });
  }

  const setIntervalLine = excerpt(chat.source, "setInterval");
  if (setIntervalLine && !setIntervalLine.includes("heartbeatTimer")) {
    pushFinding(findings, {
      title: "Chat shell contains a non-whitelisted setInterval",
      severity: "major",
      category: "input_delay",
      filePath: chat.path,
      line: lineOf(chat.source, "setInterval"),
      excerpt: setIntervalLine,
      canAutofix: false,
      autofixConfidence: 0,
      escalation: "No recurring timer should be added to the chat shell without explicit runtime ownership.",
      docsBasis: "google",
    });
  }
}

function scanDropPreview(root: string, findings: DeviceLayoutFindingInput[]) {
  const previewView = readIfExists(root, "src/components/Drops/LockedDropPreviewView.tsx");
  if (previewView) {
    for (const marker of [
      "data-drop-preview-page=\"true\"",
      "data-safe-preview-fields-only=\"true\"",
      "data-drop-preview-cta-state",
      "data-drop-preview-social-proof-type",
    ]) {
      if (!previewView.source.includes(marker)) {
        pushFinding(findings, {
          title: "Locked preview page is missing a required safe-preview data attribute",
          severity: "major",
          category: "drop_preview",
          filePath: previewView.path,
          canAutofix: false,
          autofixConfidence: 0,
          escalation: `Add ${marker} to the preview shell wrapper after confirming the page owns locked preview state.`,
          docsBasis: "kandydrops",
        });
      }
    }

    if (previewView.source.includes("contentUrl") || previewView.source.includes("contentUrls") || previewView.source.includes("internalThumbnail")) {
      pushFinding(findings, {
        title: "Locked preview view references internal content fields",
        severity: "critical",
        category: "content_protection",
        filePath: previewView.path,
        line: lineOf(previewView.source, "contentUrl") ?? lineOf(previewView.source, "internalThumbnail"),
        excerpt: excerpt(previewView.source, "contentUrl") ?? excerpt(previewView.source, "internalThumbnail"),
        canAutofix: false,
        autofixConfidence: 0,
        escalation: "Preview may expose locked content URLs. Autofix blocked because route-level data contract must be reviewed.",
        docsBasis: "kandydrops",
      });
    }
  }

  const safeTruth = readIfExists(root, "src/lib/locked-drop-preview-truth.ts");
  if (safeTruth && !safeTruth.source.includes("safePreviewFieldsOnly: true")) {
    pushFinding(findings, {
      title: "Locked preview truth model does not assert safePreviewFieldsOnly",
      severity: "major",
      category: "content_protection",
      filePath: safeTruth.path,
      canAutofix: false,
      autofixConfidence: 0,
      escalation: "Safe preview field truth needs source model review before changing locked-content payloads.",
      docsBasis: "kandydrops",
    });
  }

  const modal = readIfExists(root, "src/components/DropPreviewModal.tsx");
  if (modal) {
    const importedElsewhere = walkSourceFiles(root, "src").some((filePath) => {
      if (filePath === modal.path) {
        return false;
      }
      if (
        filePath === "src/lib/device-layout-score.ts"
        || filePath === "src/lib/device-layout-contract.ts"
        || filePath.startsWith("src/lib/agent-score/")
      ) {
        return false;
      }
      return readRequired(root, filePath).includes("DropPreviewModal");
    });

    if (importedElsewhere && modal.source.includes("contentUrl")) {
      pushFinding(findings, {
        title: "Legacy locked preview modal still receives internal content URL fields",
        severity: "critical",
        category: "content_protection",
        filePath: modal.path,
        line: lineOf(modal.source, "contentUrl"),
        excerpt: excerpt(modal.source, "contentUrl"),
        canAutofix: false,
        autofixConfidence: 0,
        escalation: "Preview may expose locked content URLs. Autofix blocked because route-level data contract must be reviewed.",
        docsBasis: "kandydrops",
      });
    } else if (!modal.source.includes("Legacy fallback only")) {
      pushFinding(findings, {
        title: "Legacy DropPreviewModal exists without fallback documentation",
        severity: "major",
        category: "orphaned_logic",
        filePath: modal.path,
        canAutofix: false,
        autofixConfidence: 0,
        escalation: "Document fallback ownership or delete the modal through a dedicated migration cleanup.",
        docsBasis: "repo",
      });
    }
  }
}

function scanTelemetryAndDebug(root: string, findings: DeviceLayoutFindingInput[]) {
  const core = readIfExists(root, "src/components/CoreLayoutWrapper.tsx");
  if (core && !core.source.includes("data-device-layout-contract=\"true\"")) {
    pushFinding(findings, {
      title: "App shell lacks device layout contract debug marker",
      severity: "major",
      category: "telemetry_debug",
      filePath: core.path,
      canAutofix: false,
      autofixConfidence: 0,
      escalation: "Add a data marker to the existing shell wrapper without changing rendering behavior.",
      docsBasis: "kandydrops",
    });
  }

  const featured = readIfExists(root, "src/components/FeaturedCarousel.tsx");
  if (featured && !featured.source.includes("data-featured-cta-accent")) {
    pushFinding(findings, {
      title: "Featured card CTA has no accent debug marker",
      severity: "moderate",
      category: "telemetry_debug",
      filePath: featured.path,
      canAutofix: false,
      autofixConfidence: 0,
      escalation: "Add data-featured-cta-accent only if the existing cover-aware helper owns CTA styling.",
      docsBasis: "kandydrops",
    });
  }
}

function scanBreakpoints(root: string, findings: DeviceLayoutFindingInput[]) {
  const files = walkSourceFiles(root, "src").filter((filePath) =>
    !filePath.includes("/stories/")
    && !filePath.endsWith(".stories.tsx")
    && !allowedArbitraryBreakpointComments.has(filePath));
  const breakpointConstantPattern =
    /\b(?:const|let|var)\s+[A-Z0-9_]*(?:BREAKPOINT|VIEWPORT_WIDTH|SCREEN_WIDTH|VIEWPORT_QUERY)[A-Z0-9_]*\s*=\s*["'`]?\(?(?:max-width|min-width)?\s*:?\s*(\d+)px/u;
  const arbitraryBreakpointPattern = /\b(?:max|min)-\[(\d+)px\]|\((?:max-width|min-width):\s*(\d+)px\)/gu;

  for (const filePath of files) {
    const source = readRequired(root, filePath);
    const constantMatch = source.match(breakpointConstantPattern);
    if (constantMatch) {
      pushFinding(findings, {
        title: "Component-specific viewport breakpoint constant bypasses the device contract",
        severity: allowedArbitraryBreakpointPx.has(Number(constantMatch[1])) ? "minor" : "moderate",
        category: "breakpoint",
        filePath,
        line: lineOf(source, constantMatch[0]),
        excerpt: excerpt(source, constantMatch[0]),
        canAutofix: false,
        autofixConfidence: 0,
        escalation: "Found unsupported breakpoint. Autofix blocked because design intent is unknown.",
        docsBasis: "google",
      });
    }

    let match: RegExpExecArray | null;
    while ((match = arbitraryBreakpointPattern.exec(source)) !== null) {
      const rawPx = Number(match[1] ?? match[2]);
      if (!Number.isFinite(rawPx)) {
        continue;
      }
      if (allowedArbitraryBreakpointPx.has(rawPx) || rawPx === 360) {
        continue;
      }
      const matchedText = match[0];
      if (
        filePath === "src/app/globals.css"
        && matchedText.includes("min-width: 768px")
        && source.includes("device-layout: intentional_design_exception")
      ) {
        continue;
      }
      pushFinding(findings, {
        title: "Raw responsive breakpoint does not map to the approved device tiers",
        severity: filePath.includes("sizes=") || matchedText.includes("max-width") ? "minor" : "moderate",
        category: "breakpoint",
        filePath,
        line: lineOf(source, matchedText),
        excerpt: excerpt(source, matchedText),
        canAutofix: false,
        autofixConfidence: 0,
        escalation: "Found unsupported breakpoint. Autofix blocked because design intent is unknown.",
        docsBasis: "google",
      });
    }
  }
}

function scanIntervalsAndDisplayMode(root: string, findings: DeviceLayoutFindingInput[]) {
  for (const filePath of unique([...PUBLIC_SHELL_FILES, ...CHAT_FILES, ...PREVIEW_FILES])) {
    const file = readIfExists(root, filePath);
    if (!file) {
      continue;
    }

    if (file.source.includes("setInterval")) {
      const line = excerpt(file.source, "setInterval") ?? "";
      const whitelisted = line.includes("heartbeatTimer") || file.path.endsWith("DropPreviewModal.tsx");
      if (!whitelisted) {
        pushFinding(findings, {
          title: "Shell-critical file contains a non-whitelisted recurring timer",
          severity: "major",
          category: "input_delay",
          filePath: file.path,
          line: lineOf(file.source, "setInterval"),
          excerpt: line,
          canAutofix: false,
          autofixConfidence: 0,
          escalation: "No recurring timer should be added to shell-critical UI without explicit runtime ownership.",
          docsBasis: "google",
        });
      }
    }

    if (
      file.source.includes("(display-mode:")
      && !["src/lib/device-layout-contract.ts", "src/lib/browser-utils.ts", "src/components/CoreLayoutWrapper.tsx"].includes(file.path)
    ) {
      pushFinding(findings, {
        title: "Display mode logic is handled in a page-local surface",
        severity: "moderate",
        category: "display_mode",
        filePath: file.path,
        line: lineOf(file.source, "(display-mode:"),
        excerpt: excerpt(file.source, "(display-mode:"),
        canAutofix: false,
        autofixConfidence: 0,
        escalation: "PWA/browser-specific layout should use shell tokens or the shared display-mode helper, not page-local hacks.",
        docsBasis: "google",
      });
    }
  }
}

export function collectDeviceLayoutFindings(root = process.cwd()) {
  const findings: DeviceLayoutFindingInput[] = [];
  scanViewport(root, findings);
  scanSafeAreaAndNav(root, findings);
  scanTouchTargets(root, findings);
  scanChatShell(root, findings);
  scanDropPreview(root, findings);
  scanTelemetryAndDebug(root, findings);
  scanBreakpoints(root, findings);
  scanIntervalsAndDisplayMode(root, findings);
  return dedupeFindings(findings);
}

function calculateScore(findings: DeviceLayoutFinding[]) {
  const penaltiesByGroup = new Map<keyof typeof scoreCaps, number>();
  for (const finding of findings) {
    const group = categoryScoreGroup[finding.category];
    const currentPenalty = penaltiesByGroup.get(group) ?? 0;
    penaltiesByGroup.set(group, currentPenalty + Math.abs(finding.scoreImpact));
  }

  let totalPenalty = 0;
  for (const [group, penalty] of penaltiesByGroup.entries()) {
    totalPenalty += Math.min(scoreCaps[group], penalty);
  }

  return Math.max(0, Math.min(100, Math.round((100 - totalPenalty) * 100) / 100));
}

export function buildDeviceLayoutScoreReport(options: DeviceLayoutScoreOptions = {}): DeviceLayoutScoreReport {
  const root = options.root ?? process.cwd();
  const findings = collectDeviceLayoutFindings(root);
  const score = calculateScore(findings);
  const criticalCount = findings.filter((finding) => finding.severity === "critical").length;
  const majorCount = findings.filter((finding) => finding.severity === "major").length;
  const safeAutofixesAvailable = findings.filter((finding) => finding.canAutofix && finding.autofixConfidence >= 0.95).length;
  const status = resolveStatus(score, criticalCount);
  return {
    score,
    status,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    repoRoot: root,
    displayModeCoverage: [
      ...DEVICE_DISPLAY_MODES,
      "CoreLayoutWrapper:data-display-mode",
    ],
    breakpointCoverage: DEVICE_LAYOUT_CLASSES.map((layoutClass) =>
      `${layoutClass.id}:${layoutClass.minWidthPx}-${layoutClass.maxWidthPx ?? "infinity"}`),
    findings,
    safeAutofixesAvailable,
    safeAutofixesApplied: options.safeAutofixesApplied ?? 0,
    criticalCount,
    majorCount,
    summary: findings.length === 0
      ? "Device layout contract is clean."
      : `Device layout score found ${findings.length} finding(s), ${criticalCount} critical, ${majorCount} major. ${safeAutofixesAvailable} deterministic safe autofix(es) are available.`,
  };
}

export function writeDeviceLayoutScoreReport(report: DeviceLayoutScoreReport, root = process.cwd()) {
  const fullPath = join(root, DEVICE_LAYOUT_SCORE_REPORT_PATH);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(report, null, 2)}\n`);
  return fullPath;
}

export function readDeviceLayoutScoreReport(root = process.cwd()) {
  const fullPath = join(root, DEVICE_LAYOUT_SCORE_REPORT_PATH);
  if (!existsSync(fullPath)) {
    return null;
  }
  return JSON.parse(readFileSync(fullPath, "utf8")) as DeviceLayoutScoreReport;
}

export function printDeviceLayoutScoreSummary(report: DeviceLayoutScoreReport) {
  console.log(`Device layout score: ${report.score}/100 (${report.status})`);
  console.log(`Findings: ${report.findings.length} (${report.criticalCount} critical, ${report.majorCount} major)`);
  console.log(`Safe autofixes available: ${report.safeAutofixesAvailable}`);
  const topFindings = report.findings.slice(0, 5);
  if (topFindings.length === 0) {
    console.log("Top findings: none");
  } else {
    console.log("Top findings:");
    for (const finding of topFindings) {
      console.log(`- [${finding.severity}] ${finding.title} (${finding.filePath}${finding.line ? `:${finding.line}` : ""})`);
    }
  }
}

export function buildDeviceLayoutAutofixPlans(report: DeviceLayoutScoreReport, root = process.cwd()) {
  const plans: DeviceLayoutAutofixPlan[] = [];

  for (const finding of report.findings) {
    if (!finding.canAutofix || finding.autofixConfidence < 0.95 || isProtectedPath(finding.filePath)) {
      continue;
    }

    const source = readRequired(root, finding.filePath);

    if (finding.category === "viewport" && approvedViewportAutofixFiles.has(finding.filePath)) {
      const expectedOccurrences = countOccurrences(source, "100vh");
      if (expectedOccurrences > 0) {
        plans.push({
          findingId: finding.id,
          filePath: finding.filePath,
          oldText: "100vh",
          newText: "100dvh",
          expectedOccurrences,
          description: "Replace exact 100vh shell sizing with 100dvh.",
          confidence: finding.autofixConfidence,
        });
      }
    }

    if (finding.category === "chat_shell" && finding.filePath === "src/lib/user-mobile-shell.ts") {
      const oldText = "CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = \"0px\"";
      const expectedOccurrences = countOccurrences(source, oldText);
      if (expectedOccurrences === 1) {
        plans.push({
          findingId: finding.id,
          filePath: finding.filePath,
          oldText,
          newText: "CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = CHAT_LIST_CONTROLS_BOTTOM_OFFSET",
          expectedOccurrences,
          description: "Route chat floating controls through the shared bottom-nav-safe chat token.",
          confidence: finding.autofixConfidence,
        });
      }
    }

    if (finding.category === "floating_control") {
      const oldText = "bottom-[calc(env(safe-area-inset-bottom)+5.75rem)]";
      const expectedOccurrences = countOccurrences(source, oldText);
      if (expectedOccurrences === 1 && readRequired(root, "src/lib/user-mobile-shell.ts").includes("USER_MOBILE_FLOATING_CONTROL_BOTTOM_OFFSET")) {
        plans.push({
          findingId: finding.id,
          filePath: finding.filePath,
          oldText,
          newText: "bottom-[var(--user-mobile-floating-control-bottom-offset)]",
          expectedOccurrences,
          description: "Replace the hardcoded floating control bottom offset with the shared shell CSS variable.",
          confidence: finding.autofixConfidence,
        });
      }
    }
  }

  return plans;
}

export function assertDeviceLayoutAutofixGate(
  finding: Pick<DeviceLayoutFinding, "canAutofix" | "autofixConfidence" | "filePath">,
  plan: DeviceLayoutAutofixPlan,
  source: string,
) {
  if (!finding.canAutofix) {
    return "Finding is not marked autofixable.";
  }
  if (finding.autofixConfidence < 0.95 || plan.confidence < 0.95) {
    return "Autofix confidence is below 0.95.";
  }
  if (isProtectedPath(plan.filePath) || isProtectedPath(finding.filePath)) {
    return "Autofix targets protected payment/auth/unlock/content/economy logic.";
  }
  const occurrences = countOccurrences(source, plan.oldText);
  if (occurrences !== plan.expectedOccurrences) {
    return `Expected ${plan.expectedOccurrences} occurrence(s), found ${occurrences}.`;
  }
  if (plan.oldText === plan.newText) {
    return "Autofix old and new text are identical.";
  }
  return null;
}

export function applyDeviceLayoutAutofixPlans(
  report: DeviceLayoutScoreReport,
  plans: DeviceLayoutAutofixPlan[],
  root = process.cwd(),
): DeviceLayoutAutofixResult {
  let applied = 0;
  const skipped: DeviceLayoutAutofixResult["skipped"] = [];

  for (const plan of plans) {
    const finding = report.findings.find((candidate) => candidate.id === plan.findingId);
    if (!finding) {
      skipped.push({ findingId: plan.findingId, reason: "Finding not found in report." });
      continue;
    }

    const fullPath = join(root, plan.filePath);
    const source = readFileSync(fullPath, "utf8");
    const gateFailure = assertDeviceLayoutAutofixGate(finding, plan, source);
    if (gateFailure) {
      skipped.push({ findingId: plan.findingId, reason: gateFailure });
      continue;
    }

    writeFileSync(fullPath, source.split(plan.oldText).join(plan.newText));
    applied += 1;
  }

  return { applied, skipped, plans };
}
