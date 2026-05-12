import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildPublicBetaScoreReport,
  type PublicBetaEvidenceInput,
  type PublicBetaFindingInput,
  type PublicBetaScoreReport,
} from "./core";
import type { DebugEvidenceAuditSummary } from "../debug-evidence-contract";
import {
  buildMinimalVerificationCommands,
  buildPublicBetaCommandBudget,
  buildRecommendedNextActions,
} from "./reporting";

type SourceFile = {
  path: string;
  source: string;
};

const shellCriticalFiles = [
  "src/components/Chat/ChatExperience.tsx",
  "src/components/Chat/ChatRouteShell.tsx",
  "src/components/CoreLayoutWrapper.tsx",
  "src/components/Navigation/MobileBottomBar.tsx",
  "src/components/Drops/LockedDropPreviewView.tsx",
  "src/app/drops/[id]/preview/loading.tsx",
  "src/lib/user-mobile-shell.ts",
];

function readIfExists(root: string, filePath: string): SourceFile | null {
  const fullPath = join(root, filePath);
  if (!existsSync(fullPath)) {
    return null;
  }
  return { path: filePath, source: readFileSync(fullPath, "utf8") };
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

function hasAny(source: string, needles: string[]) {
  return needles.some((needle) => source.includes(needle));
}

function pushFinding(findings: PublicBetaFindingInput[], finding: PublicBetaFindingInput) {
  findings.push(finding);
}

function scanLayout(root: string, findings: PublicBetaFindingInput[]) {
  for (const filePath of shellCriticalFiles) {
    const file = readIfExists(root, filePath);
    if (!file) {
      continue;
    }
    if (file.source.includes("100vh")) {
      pushFinding(findings, {
        domain: "layout",
        category: "viewport-unit",
        title: "Shell-critical mobile layout uses 100vh instead of 100dvh",
        severity: "major",
        confidence: 0.96,
        blastRadius: filePath.includes("CoreLayoutWrapper") ? "global" : "component",
        filePath,
        line: lineOf(file.source, "100vh"),
        excerpt: excerpt(file.source, "100vh"),
        canAutofix: true,
        autofixConfidence: 0.96,
        autofixPlan: "Replace exact 100vh shell sizing with 100dvh in the approved shell file.",
        escalation: "Autofix is allowed only through repair:beta exact-text gate; visually verify separately if keyboard behavior is involved.",
        evidence: ["100vh is unstable under mobile browser chrome; doctrine requires 100dvh/shell tokens for shell-critical surfaces."],
        docsBasis: ["apple", "kandydrops", "repo"],
      });
    }

    const negativeLayoutPattern = /(?:^|[\s"`'])-m[btxy]?-\d|m[btxy]?-\[-|translate-y/u;
    const negativeMatch = file.source.match(negativeLayoutPattern);
    if (negativeMatch) {
      pushFinding(findings, {
        domain: "layout",
        category: "shell-positioning-hack",
        title: "Shell-critical layout uses negative spacing or translate-y positioning",
        severity: "major",
        confidence: 0.9,
        blastRadius: filePath.includes("CoreLayoutWrapper") ? "global" : "component",
        filePath,
        line: lineOf(file.source, negativeMatch[0]),
        excerpt: excerpt(file.source, negativeMatch[0]),
        canAutofix: false,
        autofixConfidence: 0,
        escalation: "Replace with shared shell tokens or a bounded component layout; visual verification may be needed.",
        evidence: [`Matched shell-positioning pattern "${negativeMatch[0]}".`],
        docsBasis: ["apple", "kandydrops", "repo"],
      });
    }
  }

  const shell = readIfExists(root, "src/lib/user-mobile-shell.ts");
  if (shell?.source.includes("CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = \"0px\"")) {
    pushFinding(findings, {
      domain: "layout",
      category: "chat-bottom-offset",
      title: "Chat floating controls use a zero bottom-nav offset",
      severity: "major",
      confidence: 0.98,
      blastRadius: "shared",
      filePath: shell.path,
      line: lineOf(shell.source, "CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = \"0px\""),
      excerpt: excerpt(shell.source, "CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = \"0px\""),
      canAutofix: true,
      autofixConfidence: 0.98,
      autofixPlan: "Replace the exact 0px chat floating offset with the shared chat controls offset token.",
      escalation: "Autofix is exact-token only; do not tune keyboard behavior without runtime visual evidence.",
      evidence: ["Visible chat controls must reserve bottom-nav/browser chrome space."],
      docsBasis: ["apple", "kandydrops", "repo"],
    });
  }

  const chat = readIfExists(root, "src/components/Chat/ChatExperience.tsx");
  for (const marker of [
    "data-chat-shell-mode",
    "data-chat-viewport-owner=\"internal\"",
    "data-chat-input-focus-stable=\"true\"",
    "data-chat-composer-chin=\"compact\"",
  ]) {
    if (chat && !chat.source.includes(marker)) {
      pushFinding(findings, {
        domain: "layout",
        category: "debug-marker",
        title: "Chat shell is missing a required deterministic layout marker",
        severity: "moderate",
        confidence: 0.92,
        blastRadius: "component",
        filePath: chat.path,
        canAutofix: false,
        autofixConfidence: 0,
        escalation: "Add the marker to the known chat shell wrapper after confirming the wrapper owns list/thread mode.",
        evidence: [`Missing ${marker}.`],
        docsBasis: ["kandydrops", "repo"],
      });
    }
  }

  const preview = readIfExists(root, "src/components/Drops/LockedDropPreviewView.tsx");
  for (const marker of [
    "data-drop-preview-page=\"true\"",
    "data-drop-preview-urgency-tier",
    "data-drop-preview-cta-state",
    "data-safe-preview-fields-only=\"true\"",
  ]) {
    if (preview && !preview.source.includes(marker)) {
      pushFinding(findings, {
        domain: "layout",
        category: "debug-marker",
        title: "Locked preview page is missing a required deterministic shell marker",
        severity: "moderate",
        confidence: 0.92,
        blastRadius: "component",
        filePath: preview.path,
        canAutofix: false,
        autofixConfidence: 0,
        escalation: "Add marker to the existing preview page wrapper; do not reintroduce modal preview.",
        evidence: [`Missing ${marker}.`],
        docsBasis: ["kandydrops", "repo"],
      });
    }
  }
}

function scanHydration(root: string, findings: PublicBetaFindingInput[]) {
  const core = readIfExists(root, "src/components/CoreLayoutWrapper.tsx");
  if (!core) {
    return;
  }

  if (/import\s+CookieBanner\s+from/u.test(core.source)) {
    pushFinding(findings, {
      domain: "hydration",
      category: "eager-global-module",
      title: "Cookie banner is statically imported into the global shell",
      severity: "minor",
      confidence: 0.88,
      blastRadius: "global",
      filePath: core.path,
      line: lineOf(core.source, "import CookieBanner"),
      excerpt: excerpt(core.source, "import CookieBanner"),
      canAutofix: false,
      autofixConfidence: 0,
      escalation: "Consider dynamic import behind the existing overlay readiness gate; verify consent behavior is preserved.",
      evidence: ["Core shell already defers purchase/auth/onboarding modules; CookieBanner is still a static import."],
      docsBasis: ["kandydrops", "repo"],
    });
  }

  for (const marker of ["afterPaintReady", "idleReady", "interactiveOverlayReady"]) {
    if (!core.source.includes(marker)) {
      pushFinding(findings, {
        domain: "hydration",
        category: "missing-deferral-gate",
        title: "Global shell is missing a deferred readiness gate",
        severity: "major",
        confidence: 0.9,
        blastRadius: "global",
        filePath: core.path,
        canAutofix: false,
        autofixConfidence: 0,
        escalation: "Restore after-paint/idle gate before adding more global shell modules.",
        evidence: [`Missing ${marker}.`],
        docsBasis: ["kandydrops", "repo"],
      });
    }
  }
}

function scanEconomy(root: string, findings: PublicBetaFindingInput[]) {
  const ledger = readIfExists(root, "src/lib/gumdrop-ledger.ts");
  const capture = readIfExists(root, "src/app/api/paypal/capture/route.ts");
  const creator = readIfExists(root, "src/lib/server/creator-experiences.ts");
  const unlock = readIfExists(root, "src/app/api/drops/unlock/route.ts");

  if (capture?.source.includes("economics.bonusGumDrops, \"reward\"")) {
    pushFinding(findings, {
      domain: "economy",
      category: "purchase-bonus-source",
      title: "Paid pack bonus GumDrops are credited to reward balance",
      severity: "critical",
      confidence: 0.99,
      blastRadius: "payment",
      filePath: capture.path,
      line: lineOf(capture.source, "economics.bonusGumDrops, \"reward\""),
      excerpt: excerpt(capture.source, "economics.bonusGumDrops, \"reward\""),
      canAutofix: false,
      autofixConfidence: 0,
      escalation: "Escalate to economy owner; do not autofix payment capture logic.",
      evidence: ["Paid pack bonuses must remain paid-source balance."],
      docsBasis: ["kandydrops", "repo"],
    });
  }

  if (ledger?.source.includes("purchaseBonusAmount") && ledger.source.includes("gumdropRewardTotal")) {
    pushFinding(findings, {
      domain: "economy",
      category: "purchase-bonus-classifier",
      title: "Transaction classifier may count paid purchase bonus as reward-source balance",
      severity: "critical",
      confidence: 0.95,
      blastRadius: "shared",
      filePath: ledger.path,
      line: lineOf(ledger.source, "purchaseBonusAmount"),
      excerpt: excerpt(ledger.source, "purchaseBonusAmount"),
      canAutofix: false,
      autofixConfidence: 0,
      escalation: "Escalate to economy owner; classifier changes need focused ledger tests.",
      evidence: ["Purchase bonus metadata must not inflate reward-source spendable balance."],
      docsBasis: ["kandydrops", "repo"],
    });
  }

  if (creator && !creator.source.includes("purchasedOnly: true")) {
    pushFinding(findings, {
      domain: "economy",
      category: "creator-spend-policy",
      title: "Creator spend policies are not explicitly purchased-only",
      severity: "critical",
      confidence: 0.96,
      blastRadius: "payment",
      filePath: creator.path,
      canAutofix: false,
      autofixConfidence: 0,
      escalation: "Escalate to creator economy owner; do not patch creator monetization rules automatically.",
      evidence: ["Creator chat/subscriptions/requests/bookings must use paid-source balance only."],
      docsBasis: ["kandydrops", "repo"],
    });
  }

  if (unlock?.source.includes("purchasedOnly: true")) {
    pushFinding(findings, {
      domain: "economy",
      category: "normal-drop-spend-policy",
      title: "Normal Drop unlock route appears to require paid-only GumDrops",
      severity: "major",
      confidence: 0.9,
      blastRadius: "payment",
      filePath: unlock.path,
      line: lineOf(unlock.source, "purchasedOnly: true"),
      excerpt: excerpt(unlock.source, "purchasedOnly: true"),
      canAutofix: false,
      autofixConfidence: 0,
      escalation: "Escalate to economy owner; normal Drop unlocks may use total/source-aware policy.",
      evidence: ["Normal Drops must not inherit creator paid-only spend policy."],
      docsBasis: ["kandydrops", "repo"],
    });
  }
}

function scanTelemetry(root: string, findings: PublicBetaFindingInput[]) {
  const catalog = readIfExists(root, "src/lib/telemetry-catalog.ts");
  const chat = readIfExists(root, "src/components/Chat/ChatExperience.tsx");
  const previewClient = readIfExists(root, "src/components/Drops/LockedDropPreviewClient.tsx");
  const featured = readIfExists(root, "src/components/FeaturedCarousel.tsx");

  const requiredEvents = [
    "chat_thread_opened",
    "chat_compose_sheet_opened",
    "chat_message_send_attempted",
    "chat_message_send_failed",
    "chat_message_sent",
    "drop_preview_page_viewed",
    "drop_preview_cta_clicked",
    "featured_slide_clicked",
  ];
  for (const eventName of requiredEvents) {
    if (catalog && !catalog.source.includes(eventName)) {
      pushFinding(findings, {
        domain: "telemetry",
        category: "event-catalog",
        title: "Critical public beta event is missing from telemetry catalog",
        severity: "major",
        confidence: 0.92,
        blastRadius: "shared",
        filePath: catalog.path,
        canAutofix: false,
        autofixConfidence: 0,
        escalation: "Add the event to the telemetry catalog with payload contract before relying on the flow.",
        evidence: [`Missing catalog event ${eventName}.`],
        docsBasis: ["kandydrops", "repo"],
      });
    }
  }

  for (const [file, label] of [[chat, "Chat"], [previewClient, "Locked preview"], [featured, "Featured carousel"]] as const) {
    if (file?.source.includes("trackEvent(") && !file.source.includes("source_component")) {
      pushFinding(findings, {
        domain: "telemetry",
        category: "source-component",
        title: `${label} telemetry is missing source_component context`,
        severity: "moderate",
        confidence: 0.86,
        blastRadius: "component",
        filePath: file.path,
        line: lineOf(file.source, "trackEvent("),
        excerpt: excerpt(file.source, "trackEvent("),
        canAutofix: false,
        autofixConfidence: 0,
        escalation: "Add source_component in the existing payload builder; do not rename events.",
        evidence: ["Critical public beta interactions need component-specific payloads."],
        docsBasis: ["kandydrops", "repo"],
      });
    }
  }
}

function scanContentProtection(root: string, findings: PublicBetaFindingInput[]) {
  const previewFiles = [
    "src/app/drops/[id]/preview/page.tsx",
    "src/components/Drops/LockedDropPreviewClient.tsx",
    "src/components/Drops/LockedDropPreviewView.tsx",
    "src/lib/locked-drop-preview-truth.ts",
  ].map((filePath) => readIfExists(root, filePath)).filter(Boolean) as SourceFile[];

  for (const file of previewFiles) {
    if (hasAny(file.source, ["contentUrls", "contentUrl", "internal thumbnails", "Thumbnails"])) {
      pushFinding(findings, {
        domain: "contentProtection",
        category: "content-leak",
        title: "Locked preview surface references internal content fields before unlock",
        severity: "critical",
        confidence: 0.98,
        blastRadius: "content",
        filePath: file.path,
        line: lineOf(file.source, "contentUrl") ?? lineOf(file.source, "contentUrls"),
        excerpt: excerpt(file.source, "contentUrl") ?? excerpt(file.source, "contentUrls"),
        canAutofix: false,
        autofixConfidence: 0,
        escalation: "Stop and inspect safe preview payload mapping; do not autofix content access.",
        evidence: ["Locked preview pages must show cover/metadata only and never internal content URLs."],
        docsBasis: ["kandydrops", "repo"],
      });
    }
  }

  const contentRoute = readIfExists(root, "src/app/api/drops/content/route.ts");
  for (const marker of ["hasUnlockedDrop", "ownsDrop", "Cache-Control\", \"private, no-store\""]) {
    if (contentRoute && !contentRoute.source.includes(marker)) {
      pushFinding(findings, {
        domain: "contentProtection",
        category: "entitlement-check",
        title: "Content route is missing an entitlement/cache-control guard marker",
        severity: "critical",
        confidence: 0.9,
        blastRadius: "content",
        filePath: contentRoute.path,
        canAutofix: false,
        autofixConfidence: 0,
        escalation: "Escalate to content protection owner; content API enforcement must be manually reviewed.",
        evidence: [`Missing ${marker}.`],
        docsBasis: ["kandydrops", "repo"],
      });
    }
  }
}

function scanOrphanedLogic(root: string, findings: PublicBetaFindingInput[]) {
  const dropsClient = readIfExists(root, "src/app/drops/DropsClient.tsx");
  const modal = readIfExists(root, "src/components/DropPreviewModal.tsx");

  if (dropsClient?.source.includes("DropPreviewModal")) {
    pushFinding(findings, {
      domain: "orphanedLogic",
      category: "legacy-preview-modal",
      title: "Drops client still references legacy DropPreviewModal",
      severity: "major",
      confidence: 0.94,
      blastRadius: "component",
      filePath: dropsClient.path,
      line: lineOf(dropsClient.source, "DropPreviewModal"),
      excerpt: excerpt(dropsClient.source, "DropPreviewModal"),
      canAutofix: false,
      autofixConfidence: 0,
      escalation: "Route locked preview entry points to the full-page preview route; keep modal only as documented fallback.",
      evidence: ["Full-page locked preview is the canonical conversion surface."],
      docsBasis: ["kandydrops", "repo"],
    });
  }

  if (modal && !modal.source.includes("Legacy fallback only")) {
    pushFinding(findings, {
      domain: "orphanedLogic",
      category: "legacy-preview-modal",
      title: "Legacy DropPreviewModal is not marked as fallback-only",
      severity: "moderate",
      confidence: 0.88,
      blastRadius: "component",
      filePath: modal.path,
      canAutofix: false,
      autofixConfidence: 0,
      escalation: "Document fallback-only status or delete the modal if no compatibility path remains.",
      evidence: ["Legacy modal must not compete with full-page preview route."],
      docsBasis: ["kandydrops", "repo"],
    });
  }
}

function scanAccessibility(root: string, findings: PublicBetaFindingInput[]) {
  const bottomNav = readIfExists(root, "src/components/Navigation/MobileBottomBar.tsx");
  if (bottomNav && !bottomNav.source.includes("aria-current")) {
    pushFinding(findings, {
      domain: "accessibilityTouch",
      category: "nav-current-state",
      title: "Mobile bottom navigation is missing aria-current",
      severity: "moderate",
      confidence: 0.9,
      blastRadius: "global",
      filePath: bottomNav.path,
      canAutofix: false,
      autofixConfidence: 0,
      escalation: "Add aria-current to the actual active link; verify nav semantics with the existing accessibility validator.",
      evidence: ["Persistent navigation must expose current page state."],
      docsBasis: ["apple", "kandydrops", "repo"],
    });
  }

  if (bottomNav && !bottomNav.source.includes("USER_MOBILE_BOTTOM_NAV_HEIGHT")) {
    pushFinding(findings, {
      domain: "accessibilityTouch",
      category: "touch-target-token",
      title: "Mobile bottom navigation is missing shared touch-height token",
      severity: "moderate",
      confidence: 0.88,
      blastRadius: "global",
      filePath: bottomNav.path,
      canAutofix: false,
      autofixConfidence: 0,
      escalation: "Use the shared mobile bottom-nav height token; visual sizing still needs targeted review.",
      evidence: ["Touch targets should be at least 44 CSS pixels and token-owned."],
      docsBasis: ["apple", "kandydrops", "repo"],
    });
  }
}

function scanTestingCoverage(root: string, findings: PublicBetaFindingInput[]) {
  const required = [
    ["tests/unit/gumdrop-ledger.spec.ts", "wallet/economy unit tests"],
    ["tests/unit/paypal-capture-route.spec.ts", "purchase capture source tests"],
    ["tests/unit/chat-route-shell.spec.tsx", "chat shell tests"],
    ["tests/unit/drops-content-route.spec.ts", "content protection tests"],
    ["scripts/agent/validate-event-catalog-telemetry.ts", "telemetry parity validator"],
    ["scripts/agent/validate-drop-cover-visibility-truth.ts", "drop blur state validator"],
    ["scripts/agent/validate-user-chat-shell-routing.ts", "chat shell validator"],
    ["scripts/agent/validate-drop-preview-page.ts", "locked preview validator"],
  ] as const;

  for (const [filePath, label] of required) {
    if (!existsSync(join(root, filePath))) {
      pushFinding(findings, {
        domain: "testingCoverage",
        category: "missing-fast-coverage",
        title: `Missing fast coverage for ${label}`,
        severity: "moderate",
        confidence: 0.95,
        blastRadius: "shared",
        filePath,
        canAutofix: false,
        autofixConfidence: 0,
        escalation: "Add a targeted unit test or validator before relying on broad audit commands.",
        evidence: [`Missing ${filePath}.`],
        docsBasis: ["kandydrops", "repo"],
      });
    }
  }

  if (!existsSync(join(root, "tests/mocks"))) {
    pushFinding(findings, {
      domain: "testingCoverage",
      category: "missing-msw-scenarios",
      title: "MSW scenario directory is missing",
      severity: "minor",
      confidence: 0.8,
      blastRadius: "shared",
      filePath: "tests/mocks",
      canAutofix: false,
      autofixConfidence: 0,
      escalation: "Add MSW scenarios only when route-level network mocks are needed; do not block existing unit validators.",
      evidence: ["tests/mocks was not present during deterministic scan."],
      docsBasis: ["repo"],
    });
  }

  if (!existsSync(join(root, "ast-grep.yml")) && !existsSync(join(root, "sgconfig.yml"))) {
    pushFinding(findings, {
      domain: "testingCoverage",
      category: "missing-ast-grep-config",
      title: "ast-grep config is not present",
      severity: "minor",
      confidence: 0.78,
      blastRadius: "shared",
      filePath: "ast-grep.yml",
      canAutofix: false,
      autofixConfidence: 0,
      escalation: "Add ast-grep rules when a concrete static source rule is identified; current scorer falls back to source scans.",
      evidence: ["No ast-grep.yml or sgconfig.yml was found."],
      docsBasis: ["repo"],
    });
  }
}

function inferRecentFiles(root: string) {
  const taskContextPath = join(root, "agent/state/task-context.generated.json");
  if (!existsSync(taskContextPath)) {
    return [];
  }
  try {
    const parsed = JSON.parse(readFileSync(taskContextPath, "utf8")) as {
      likelyTouchedFiles?: string[];
      hotContextFiles?: string[];
      warmContextFiles?: string[];
    };
    return Array.from(new Set([
      ...(parsed.likelyTouchedFiles ?? []),
      ...(parsed.hotContextFiles ?? []),
      ...(parsed.warmContextFiles ?? []),
    ]));
  } catch {
    return [];
  }
}

export function collectPublicBetaFindings(root = process.cwd()) {
  const findings: PublicBetaFindingInput[] = [];
  scanLayout(root, findings);
  scanHydration(root, findings);
  scanEconomy(root, findings);
  scanTelemetry(root, findings);
  scanContentProtection(root, findings);
  scanOrphanedLogic(root, findings);
  scanAccessibility(root, findings);
  scanTestingCoverage(root, findings);
  return findings;
}

export function buildPublicBetaReadinessReport(input: {
  root?: string;
  safeAutofixesApplied?: number;
  generatedAt?: string;
  debugEvidence?: Record<string, DebugEvidenceAuditSummary[]>;
  evidence?: PublicBetaEvidenceInput;
} = {}): PublicBetaScoreReport {
  const root = input.root ?? process.cwd();
  const rawFindings = collectPublicBetaFindings(root);
  const preliminary = buildPublicBetaScoreReport(rawFindings, {
    generatedAt: input.generatedAt,
    recentFiles: inferRecentFiles(root),
    safeAutofixesApplied: input.safeAutofixesApplied ?? 0,
    commandBudget: buildPublicBetaCommandBudget(),
    minimalVerificationCommands: buildMinimalVerificationCommands(true),
    evidence: {
      ...input.evidence,
      debugEvidence: input.debugEvidence ?? input.evidence?.debugEvidence,
    },
  });

  return {
    ...preliminary,
    debugEvidence: input.debugEvidence,
    recommendedNextActions: buildRecommendedNextActions(preliminary.findings, preliminary.evidenceGates),
  };
}
