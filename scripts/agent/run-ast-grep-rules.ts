import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { js, jsx, ts, tsx, type SgRoot } from "@ast-grep/napi";

type Severity = "info" | "minor" | "moderate" | "major" | "critical";

type RuleFinding = {
  ruleId: string;
  filePath: string;
  line: number;
  category: string;
  severity: Severity;
  title: string;
  excerpt: string;
  suggestedFix: string;
};

type SourceFile = {
  path: string;
  source: string;
};

const root = process.cwd();
const failures: string[] = [];

const PUBLIC_SHELL_FILES = [
  "src/app/layout.tsx",
  "src/components/CoreLayoutWrapper.tsx",
  "src/components/Navbar.tsx",
  "src/components/Navigation/MobileBottomBar.tsx",
  "src/components/Navigation/ScrollToTop.tsx",
  "src/components/Feedback/GlobalBugReportTrigger.tsx",
  "src/lib/user-mobile-shell.ts",
] as const;

const CHAT_FILES = [
  "src/components/Chat/ChatExperience.tsx",
  "src/components/Chat/ChatRouteShell.tsx",
  "src/lib/user-mobile-shell.ts",
] as const;

const LOCKED_PREVIEW_FILES = [
  "src/app/drops/[id]/preview/page.tsx",
  "src/app/drops/[id]/preview/loading.tsx",
  "src/components/Drops/LockedDropPreviewClient.tsx",
  "src/components/Drops/LockedDropPreviewView.tsx",
  "src/lib/locked-drop-preview-truth.ts",
] as const;

const LEGACY_PREVIEW_TIMER_FILES = [
  "src/components/DropPreviewModal.tsx",
] as const;

const SHELL_CRITICAL_FILES = unique([
  ...PUBLIC_SHELL_FILES,
  ...CHAT_FILES,
  ...LOCKED_PREVIEW_FILES,
  ...LEGACY_PREVIEW_TIMER_FILES,
]);

const SAFE_AREA_TARGET_FILES = unique([
  ...PUBLIC_SHELL_FILES,
  ...CHAT_FILES,
  ...LOCKED_PREVIEW_FILES,
]);

const CONTENT_PROTECTION_FILES = unique([
  ...LOCKED_PREVIEW_FILES,
]);

const allowedSetIntervalContexts = [
  {
    filePath: "src/components/Chat/ChatExperience.tsx",
    contains: "heartbeatTimer = window.setInterval",
    reason: "existing chat presence heartbeat",
  },
  {
    filePath: "src/components/DropPreviewModal.tsx",
    contains: "const interval = window.setInterval(updateTimer, 1000)",
    reason: "legacy modal countdown timer",
  },
] as const;

const severityRank: Record<Severity, number> = {
  info: 0,
  minor: 1,
  moderate: 2,
  major: 3,
  critical: 4,
};

function unique<T>(items: readonly T[]) {
  return Array.from(new Set(items));
}

function normalizePath(filePath: string) {
  return filePath.replace(/\\/g, "/").replace(/^\.?\//u, "");
}

function readText(relativePath: string) {
  return readFileSync(join(root, normalizePath(relativePath)), "utf8");
}

function readIfExists(filePath: string): SourceFile | null {
  const normalized = normalizePath(filePath);
  const absolute = join(root, normalized);
  if (!existsSync(absolute)) {
    return null;
  }

  return {
    path: normalized,
    source: readFileSync(absolute, "utf8"),
  };
}

function lineOf(source: string, index: number) {
  return source.slice(0, index).split(/\r?\n/u).length;
}

function lineAt(source: string, line: number) {
  return source.split(/\r?\n/u)[Math.max(line - 1, 0)]?.trim() ?? "";
}

function pushFinding(findings: RuleFinding[], finding: RuleFinding) {
  findings.push(finding);
}

function findNeedle(
  findings: RuleFinding[],
  file: SourceFile,
  needle: string,
  input: Omit<RuleFinding, "filePath" | "line" | "excerpt">,
) {
  let index = file.source.indexOf(needle);
  while (index >= 0) {
    const line = lineOf(file.source, index);
    pushFinding(findings, {
      ...input,
      filePath: file.path,
      line,
      excerpt: lineAt(file.source, line),
    });
    index = file.source.indexOf(needle, index + needle.length);
  }
}

function findRegex(
  findings: RuleFinding[],
  file: SourceFile,
  pattern: RegExp,
  input: Omit<RuleFinding, "filePath" | "line" | "excerpt">,
  isAllowed: (match: RegExpExecArray) => boolean = () => false,
) {
  pattern.lastIndex = 0;
  let match = pattern.exec(file.source);
  while (match?.[0]) {
    if (!isAllowed(match)) {
      const line = lineOf(file.source, match.index);
      pushFinding(findings, {
        ...input,
        filePath: file.path,
        line,
        excerpt: lineAt(file.source, line),
      });
    }
    match = pattern.exec(file.source);
  }
}

function walkSourceFiles(startPath: string): string[] {
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
      files.push(...walkSourceFiles(relative(root, absoluteEntry)));
      continue;
    }

    if (/\.(ts|tsx|js|jsx|css)$/u.test(entry)) {
      files.push(relative(root, absoluteEntry).replaceAll("\\", "/"));
    }
  }

  return files;
}

function parseWithAstGrep(file: SourceFile): SgRoot | null {
  try {
    if (file.path.endsWith(".tsx")) return tsx.parse(file.source);
    if (file.path.endsWith(".ts")) return ts.parse(file.source);
    if (file.path.endsWith(".jsx")) return jsx.parse(file.source);
    if (file.path.endsWith(".js")) return js.parse(file.source);
  } catch {
    return null;
  }

  return null;
}

function contextAround(source: string, line: number, radius = 24) {
  const lines = source.split(/\r?\n/u);
  const start = Math.max(0, line - radius - 1);
  const end = Math.min(lines.length, line + radius);
  return lines.slice(start, end).join("\n");
}

function isHotTapOrFocusContext(source: string, line: number) {
  const context = contextAround(source, line);
  if (/schedule\w*Diagnostics|requestAnimationFrame|requestIdleCallback|setTimeout|defer\w*Report|defer\w*Issue/u.test(context)) {
    return false;
  }

  return /on(?:Click|Focus|PointerDown|PointerUp|TouchStart|KeyDown)\s*=|handle(?:Thread|Back|Compose|Search|Focus|Select|Open|Close)/u.test(context);
}

function isAllowedSetInterval(file: SourceFile, line: number) {
  const context = contextAround(file.source, line, 3);
  return allowedSetIntervalContexts.some((allowed) => (
    allowed.filePath === file.path && context.includes(allowed.contains)
  ));
}

function collectFindings() {
  const findings: RuleFinding[] = [];

  for (const filePath of SHELL_CRITICAL_FILES) {
    const file = readIfExists(filePath);
    if (!file) continue;
    findNeedle(findings, file, "100vh", {
      ruleId: "kd-no-100vh-public-shell",
      category: "viewport",
      severity: "major",
      title: "100vh is not allowed in public shell, chat, or preview files.",
      suggestedFix: "Use 100dvh or a shared shell viewport token from src/lib/user-mobile-shell.ts.",
    });
    findRegex(findings, file, /(?:mt|mb)-\[-[^\]\n]+\]|-translate-y-[^\s"'`]+|translate-y-\[-[^\]\n]+\]/gu, {
      ruleId: "kd-no-shell-translate-or-negative-margin",
      category: "shell_layout",
      severity: "major",
      title: "Shell-critical layout cannot use negative margins or translate-y hacks.",
      suggestedFix: "Use shell-aware viewport math and shared spacing tokens instead of visual positioning hacks.",
    });
    findRegex(findings, file, /setInterval\s*\(/gu, {
      ruleId: "kd-no-unapproved-setinterval",
      category: "performance",
      severity: "major",
      title: "setInterval is not allowed in shell, chat, or preview files unless whitelisted.",
      suggestedFix: "Use existing deferred readiness, visibility, or one-shot timeout helpers; document any required narrow timer whitelist.",
    }, (match) => isAllowedSetInterval(file, lineOf(file.source, match.index)));
  }

  for (const filePath of SAFE_AREA_TARGET_FILES) {
    const file = readIfExists(filePath);
    if (!file || file.path === "src/lib/user-mobile-shell.ts") continue;
    findRegex(findings, file, /(?:bottom|paddingBottom|pb|maxHeight|minHeight)[^\n]*env\(safe-area-inset-bottom\)/gu, {
      ruleId: "kd-no-hardcoded-safe-area-bottom",
      category: "safe_area",
      severity: "major",
      title: "Hardcoded safe-area bottom math is not allowed outside user-mobile-shell tokens.",
      suggestedFix: "Move bottom-nav and safe-area math into src/lib/user-mobile-shell.ts and consume the shared token.",
    });
  }

  for (const filePath of CONTENT_PROTECTION_FILES) {
    const file = readIfExists(filePath);
    if (!file) continue;
    for (const forbidden of ["contentUrls", "contentUrl", "contentFiles", "files.map", "files?.map"]) {
      findNeedle(findings, file, forbidden, {
        ruleId: "kd-no-locked-preview-content-url",
        category: "content_protection",
        severity: "critical",
        title: "Locked preview must not expose internal content fields before unlock.",
        suggestedFix: "Render only cover art and safe metadata on locked preview surfaces; keep content URLs server-entitled.",
      });
    }
  }

  for (const filePath of unique([...PUBLIC_SHELL_FILES, ...CHAT_FILES])) {
    const file = readIfExists(filePath);
    if (!file) continue;
    const parsed = parseWithAstGrep(file);
    const matches = parsed?.root().findAll({
      rule: {
        any: [
          { pattern: "reportClientIssue($$$ARGS)" },
          { pattern: "reportRealtimeIssue($$$ARGS)" },
        ],
      },
    }) ?? [];
    for (const node of matches) {
      const line = node.range().start.line + 1;
      if (!isHotTapOrFocusContext(file.source, line)) continue;
      pushFinding(findings, {
        ruleId: "kd-no-hot-handler-direct-reporting",
        filePath: file.path,
        line,
        category: "performance",
        severity: "major",
        title: "Diagnostic reporting is running directly in a hot tap/focus path.",
        excerpt: lineAt(file.source, line),
        suggestedFix: "Wrap reportClientIssue/reportRealtimeIssue in an after-paint or idle diagnostic helper before calling from tap/focus handlers.",
      });
    }
  }

  const breakpointPattern = /\b(?:const|let|var)\s+[A-Z0-9_]*(?:BREAKPOINT|VIEWPORT_WIDTH|SCREEN_WIDTH|WIDTH_BREAKPOINT)[A-Z0-9_]*\s*=\s*(?:360|480|600|840|960|1280|1440|1600)\b/gu;
  const breakpointAllowedFiles = new Set([
    "src/lib/device-layout-contract.ts",
    "src/lib/device-layout-score.ts",
    "scripts/agent/validate-device-layout-contract.ts",
    "scripts/agent/validate-device-layout-score.ts",
    "scripts/agent/run-ast-grep-rules.ts",
  ]);
  for (const filePath of [...walkSourceFiles("src"), ...walkSourceFiles("scripts/agent")]) {
    if (breakpointAllowedFiles.has(filePath)) continue;
    const file = readIfExists(filePath);
    if (!file) continue;
    findRegex(findings, file, breakpointPattern, {
      ruleId: "kd-no-duplicate-breakpoint-constants",
      category: "breakpoint",
      severity: "moderate",
      title: "Breakpoint constants must come from the device layout contract.",
      suggestedFix: "Import or extend src/lib/device-layout-contract.ts instead of defining local breakpoint constants.",
    });
  }

  return dedupeFindings(findings);
}

function dedupeFindings(findings: RuleFinding[]) {
  const byKey = new Map<string, RuleFinding>();
  for (const finding of findings) {
    const key = `${finding.ruleId}:${finding.filePath}:${finding.line}:${finding.excerpt}`;
    const existing = byKey.get(key);
    if (!existing || severityRank[finding.severity] > severityRank[existing.severity]) {
      byKey.set(key, finding);
    }
  }
  return Array.from(byKey.values()).sort((a, b) => (
    severityRank[b.severity] - severityRank[a.severity]
    || a.filePath.localeCompare(b.filePath)
    || a.line - b.line
  ));
}

function validateRuleLayerConfig() {
  const packageJson = readText("package.json");
  const astGrepConfig = readText("ast-grep.yml");
  const sgConfig = readText("sgconfig.yml");
  const docs = readText("docs/agent-truth/ast-grep-rules.md");
  const requiredRuleIds = [
    "kd-no-100vh-public-shell",
    "kd-no-hardcoded-safe-area-bottom",
    "kd-no-shell-translate-or-negative-margin",
    "kd-no-locked-preview-content-url",
    "kd-no-hot-handler-direct-reporting",
    "kd-no-unapproved-setinterval",
    "kd-no-duplicate-breakpoint-constants",
  ];

  for (const expected of [
    "\"@ast-grep/cli\"",
    "\"@ast-grep/napi\"",
    "\"check:ast-grep-rules\": \"tsx scripts/agent/run-ast-grep-rules.ts\"",
  ]) {
    if (!packageJson.includes(expected)) {
      failures.push(`package.json must include ${expected}.`);
    }
  }

  for (const ruleId of requiredRuleIds) {
    if (!astGrepConfig.includes(ruleId)) failures.push(`ast-grep.yml must include ${ruleId}.`);
    if (!docs.includes(ruleId)) failures.push(`docs/agent-truth/ast-grep-rules.md must document ${ruleId}.`);
  }

  for (const expected of ["languageGlobs:", "tsx:", "ts:", "js:", "jsx:"]) {
    if (!sgConfig.includes(expected)) {
      failures.push(`sgconfig.yml must include ${expected}.`);
    }
  }

  if (!docs.includes("KandyDrops ast-grep rules are deterministic")) {
    failures.push("docs/agent-truth/ast-grep-rules.md must include the doctrine note.");
  }
}

validateRuleLayerConfig();
const findings = collectFindings();

if (failures.length > 0) {
  console.error("Ast-grep rule layer configuration failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

if (findings.length > 0) {
  console.error(`Ast-grep source rule checks failed with ${findings.length} finding(s):`);
  for (const finding of findings) {
    console.error(`${finding.filePath}:${finding.line} ${finding.severity} ${finding.category} ${finding.ruleId}`);
    console.error(`  ${finding.title}`);
    console.error(`  excerpt: ${finding.excerpt}`);
    console.error(`  suggested_fix: ${finding.suggestedFix}`);
  }
  process.exit(1);
}

console.log("Ast-grep source rule checks passed.");
console.log("Rules checked: viewport, safe-area, shell positioning, locked preview protection, hot-handler diagnostics, intervals, breakpoints.");
