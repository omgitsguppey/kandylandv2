import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

import {
  HUMAN_ERROR_DICTIONARY,
  REQUIRED_HUMAN_ERROR_KEYS,
  type HumanErrorKey,
} from "../../src/lib/errors/error-dictionary";
import type { HumanErrorDescriptor } from "../../src/lib/errors/error-language";

const ARTIFACT_PATH = "agent/state/error-language-contract.generated.json";
const DOC_PATH = "docs/agent-truth/error-language-contract.md";

type Finding = {
  id: string;
  severity: "p0" | "p1" | "p2";
  status: "fixed" | "deferred";
  detail: string;
};

type ErrorCoverageCategory =
  | "raw_user_facing_error"
  | "raw_debug_only_error"
  | "unknown_catch_block"
  | "provider_error_without_safe_translation"
  | "retryable_non_retryable_mismatch"
  | "missing_debug_fingerprint"
  | "missing_recovery_action";

type ErrorCoverageSurface =
  | "auth"
  | "wallet_payment"
  | "creator"
  | "chat_support"
  | "admin_debug"
  | "api_route"
  | "user_ui"
  | "server_truth"
  | "unknown";

type ProtectedDomain = "auth" | "payment_provider" | "external_provider" | "firebase_runtime" | "locked_content" | "none";

type ErrorCoverageFinding = {
  id: string;
  category: ErrorCoverageCategory;
  severity: "p0" | "p1" | "p2";
  path: string;
  line: number;
  surface: ErrorCoverageSurface;
  protectedDomain: ProtectedDomain;
  userRisk: "low" | "medium" | "high";
  debugRisk: "low" | "medium" | "high";
  runtimeRisk: "low" | "medium" | "high";
  evidence: string;
  safeTranslatorPresent: boolean;
  recommendedAction: string;
};

function readSource(path: string) {
  return readFileSync(path, "utf8");
}

function writeJson(path: string, value: unknown) {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function currentHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "git_unavailable_from_node_child_process";
  }
}

const rawUserCopyPattern = /\b(Firebase|Zod|JSON\.parse|stack|Internal server error|PayPal|SyntaxError|Error:|bookingStartAt)\b/i;

const deferredRawSources = [
  "src/lib/server/auth.ts",
  "src/components/Creators/CreatorRequestsManager.tsx",
  "src/components/Creators/CreatorBookingsManager.tsx",
  "src/components/Creators/CreatorFanPassManager.tsx",
  "src/components/Chat/ChatExperience.tsx",
  "src/components/PurchaseModal.tsx",
].filter(existsSync).map((path) => {
  const source = readSource(path);
  const hasRawPattern = /Internal server error|Something went wrong|Unknown error|error\.message|String\(error\)|body\.error|body\.message|PayPal/i.test(source);
  return {
    path,
    status: hasRawPattern ? "deferred_phase_two_wiring" : "covered_or_no_raw_pattern",
    detail: hasRawPattern
      ? "Surface still has legacy raw-error entry points; Phase 1 creates the translation layer and defers adoption."
      : "No raw pattern found in this source during Phase 1 validation.",
  };
});

const SCAN_ROOTS = [
  "src/app",
  "src/components",
  "src/lib/server",
  "src/lib/errors",
  "functions/src",
];

const SCAN_EXTENSIONS = [".ts", ".tsx"];
const SCAN_EXCLUDE_SEGMENTS = [
  ".next",
  "node_modules",
  "agent/state",
  "agent/index",
  "coverage",
  "playwright-report",
  "test-results",
];

function walkSourceFiles(directory: string, results: string[] = []) {
  if (!existsSync(directory)) return results;
  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry);
    const normalized = absolute.replace(/\\/g, "/");
    if (SCAN_EXCLUDE_SEGMENTS.some((segment) => normalized.includes(segment))) continue;
    const stats = statSync(absolute);
    if (stats.isDirectory()) {
      walkSourceFiles(absolute, results);
      continue;
    }
    if (SCAN_EXTENSIONS.some((extension) => absolute.endsWith(extension))) {
      results.push(normalized);
    }
  }
  return results;
}

function surfaceForPath(path: string): ErrorCoverageSurface {
  if (/auth|session|login/i.test(path)) return "auth";
  if (/PurchaseModal|paypal|wallet|payment|gumdrop/i.test(path)) return "wallet_payment";
  if (/creator/i.test(path)) return "creator";
  if (/Chat|chat|support/i.test(path)) return "chat_support";
  if (/admin[\\/]debug|admin-debug/i.test(path)) return "admin_debug";
  if (/src\/app\/api\//i.test(path)) return "api_route";
  if (/src\/components|src\/app/i.test(path)) return "user_ui";
  if (/src\/lib\/server|functions\/src/i.test(path)) return "server_truth";
  return "unknown";
}

function protectedDomainForPath(path: string, line: string): ProtectedDomain {
  const text = `${path} ${line}`;
  if (/paypal|payment|purchase|wallet|gumdrop/i.test(text)) return "payment_provider";
  if (/auth|session|token|login|permission|forbidden/i.test(text)) return "auth";
  if (/firebase|firestore|storage|adminDb|adminAuth/i.test(text)) return "firebase_runtime";
  if (/unlock|entitlement|locked|content\/route|private media/i.test(text)) return "locked_content";
  if (/provider|posthog|openai|vertex|ai/i.test(text)) return "external_provider";
  return "none";
}

function stableFindingId(path: string, category: ErrorCoverageCategory, line: number) {
  return `error_language__${category}__${path.toLowerCase().replace(/[^a-z0-9]+/g, "_")}__${line}`;
}

function fileHasSafeTranslator(source: string) {
  return /resolveHumanError|sanitizeErrorForUser|buildHumanApiErrorPayload|HumanErrorNotice|get[A-Za-z]+ProblemCopy|handleApiError/.test(source);
}

function lineEvidence(line: string) {
  return line.trim().replace(/\s+/g, " ").slice(0, 180);
}

function riskForFinding(category: ErrorCoverageCategory, protectedDomain: ProtectedDomain) {
  const protectedRisk = protectedDomain !== "none";
  if (category === "provider_error_without_safe_translation") {
    return { userRisk: "high", debugRisk: "medium", runtimeRisk: protectedRisk ? "high" : "medium" } as const;
  }
  if (category === "raw_user_facing_error") {
    return { userRisk: "high", debugRisk: "medium", runtimeRisk: protectedRisk ? "high" : "medium" } as const;
  }
  if (category === "retryable_non_retryable_mismatch") {
    return { userRisk: "medium", debugRisk: "medium", runtimeRisk: protectedRisk ? "high" : "medium" } as const;
  }
  if (category === "unknown_catch_block" || category === "missing_debug_fingerprint") {
    return { userRisk: "medium", debugRisk: "high", runtimeRisk: "medium" } as const;
  }
  if (category === "missing_recovery_action") {
    return { userRisk: "medium", debugRisk: "low", runtimeRisk: "low" } as const;
  }
  return { userRisk: "low", debugRisk: "medium", runtimeRisk: "low" } as const;
}

function severityForFinding(category: ErrorCoverageCategory, protectedDomain: ProtectedDomain): ErrorCoverageFinding["severity"] {
  if (protectedDomain === "payment_provider" || protectedDomain === "auth") return "p1";
  if (protectedDomain === "external_provider") return "p2";
  if (category === "provider_error_without_safe_translation" || category === "raw_user_facing_error") return "p1";
  if (category === "raw_debug_only_error") return "p2";
  return "p2";
}

function recommendedActionForFinding(category: ErrorCoverageCategory, protectedDomain: ProtectedDomain) {
  if (protectedDomain === "payment_provider") {
    return "Protected payment/provider lane: classify only, then use the existing error language contract in a targeted approved payment-modal or provider route pass.";
  }
  if (protectedDomain === "external_provider") {
    return "External-provider lane: translate provider failure through the existing error language contract without exposing provider payloads.";
  }
  if (protectedDomain === "auth") {
    return "Protected auth lane: preserve missing/expired/malformed/permission distinctions and route through canonical safe auth error translation.";
  }
  if (category === "raw_user_facing_error") {
    return "Replace user-facing raw message with resolveHumanError/HumanErrorNotice or the existing surface problem-copy helper.";
  }
  if (category === "raw_debug_only_error") {
    return "Keep raw detail debug-only, redacted, and fingerprinted; do not show it as user copy.";
  }
  if (category === "unknown_catch_block") {
    return "Classify the catch path with a safe error key, retryability, and owning surface before changing behavior.";
  }
  if (category === "provider_error_without_safe_translation") {
    return "Map provider failures to provider_unavailable/payment_not_completed without exposing provider payloads.";
  }
  if (category === "retryable_non_retryable_mismatch") {
    return "Preserve retryable/non-retryable truth: auth/permission/config failures should not invite blind retries.";
  }
  if (category === "missing_debug_fingerprint") {
    return "Add or route through existing debug/error fingerprinting before relying on this path as operator evidence.";
  }
  return "Add a recovery action through the existing human error descriptor or surface problem-copy helper.";
}

function categoryCandidatesForLine(line: string, source: string, safeTranslatorPresent: boolean): ErrorCoverageCategory[] {
  const categories = new Set<ErrorCoverageCategory>();
  const trimmed = line.trim();

  if (/catch\s*\([^)]*(error|err|e)?[^)]*\)/i.test(trimmed) && !safeTranslatorPresent) {
    categories.add("unknown_catch_block");
  }
  if (/\b(set[A-Za-z]*Error|toast\.error|alert)\s*\([^)]*(error\.message|err\.message|String\((error|err)\)|body\.(error|message)|data\.(error|message))/i.test(trimmed)) {
    categories.add("raw_user_facing_error");
  }
  if (/\b(error\.message|err\.message|String\((error|err)\)|body\.(error|message)|data\.(error|message))\b/i.test(trimmed) && /return|json|set[A-Za-z]*Error|toast|alert|userMessage|message:/i.test(trimmed) && !/operatorMessage|debugOnlyDetails|console\./i.test(trimmed)) {
    categories.add("raw_user_facing_error");
  }
  if (/console\.(error|warn)\([^)]*(error|err|\.message|String\()/i.test(trimmed)) {
    categories.add("raw_debug_only_error");
  }
  if (/PayPal|paypal|provider|INSTRUMENT_DECLINED/i.test(trimmed) && /error|message|catch|failed|unavailable|declined/i.test(trimmed) && /\b(error\.message|err\.message|String\((error|err)\)|body\.(error|message)|data\.(error|message))\b/i.test(source) && !safeTranslatorPresent) {
    categories.add("provider_error_without_safe_translation");
  }
  if (/\b(Retry|Try again|try again|retry checkout|Retry checkout)\b/.test(trimmed) && /auth|forbidden|permission|expired|malformed|config|provider/i.test(source) && !/session_expired|forbidden|provider_unavailable|resolveHumanError|getPaymentProblemCopy/i.test(source)) {
    categories.add("retryable_non_retryable_mismatch");
  }
  if (/catch\s*\(|console\.error/i.test(trimmed) && !/fingerprint|debugId|recordDebugEvidence|handleApiError/i.test(source)) {
    categories.add("missing_debug_fingerprint");
  }
  if (/\b(set[A-Za-z]*Error|toast\.error|userMessage|error:)\b/i.test(trimmed) && !/primaryAction|secondaryAction|actionLabel|HumanErrorNotice|get[A-Za-z]+ProblemCopy|resolveHumanError/i.test(source)) {
    categories.add("missing_recovery_action");
  }

  return Array.from(categories);
}

function scanErrorTranslationCoverage(): ErrorCoverageFinding[] {
  const files = SCAN_ROOTS.flatMap((root) => walkSourceFiles(root)).sort();
  const findings: ErrorCoverageFinding[] = [];

  for (const path of files) {
    const source = readSource(path);
    const safeTranslatorPresent = fileHasSafeTranslator(source);
    const lines = source.split(/\r?\n/);

    lines.forEach((line, index) => {
      const categories = categoryCandidatesForLine(line, source, safeTranslatorPresent);
      for (const category of categories) {
        const lineNumber = index + 1;
        const protectedDomain = protectedDomainForPath(path, line);
        findings.push({
          id: stableFindingId(path, category, lineNumber),
          category,
          severity: severityForFinding(category, protectedDomain),
          path,
          line: lineNumber,
          surface: surfaceForPath(path),
          protectedDomain,
          ...riskForFinding(category, protectedDomain),
          evidence: lineEvidence(line),
          safeTranslatorPresent,
          recommendedAction: recommendedActionForFinding(category, protectedDomain),
        });
      }
    });
  }

  return findings
    .sort((left, right) => {
      const severityRank = { p0: 3, p1: 2, p2: 1 };
      const protectedRank = (value: ProtectedDomain) => value === "none" ? 0 : 1;
      return severityRank[right.severity] - severityRank[left.severity]
        || protectedRank(right.protectedDomain) - protectedRank(left.protectedDomain)
        || left.path.localeCompare(right.path)
        || left.line - right.line
        || left.category.localeCompare(right.category);
    })
    .slice(0, 40);
}

const findings: Finding[] = [];

for (const key of REQUIRED_HUMAN_ERROR_KEYS) {
  if (!HUMAN_ERROR_DICTIONARY[key]) {
    findings.push({
      id: `missing-${key}`,
      severity: "p0",
      status: "deferred",
      detail: `Dictionary is missing required error key ${key}.`,
    });
  }
}

for (const descriptor of Object.values(HUMAN_ERROR_DICTIONARY)) {
  if (rawUserCopyPattern.test(descriptor.userMessage)) {
    findings.push({
      id: `raw-user-copy-${descriptor.errorKey}`,
      severity: "p0",
      status: "deferred",
      detail: `User message for ${descriptor.errorKey} contains raw developer/provider wording.`,
    });
  }
  if (!descriptor.userTitle.trim() || !descriptor.userMessage.trim() || !descriptor.operatorMessage.trim()) {
    findings.push({
      id: `missing-copy-${descriptor.errorKey}`,
      severity: "p0",
      status: "deferred",
      detail: `Descriptor ${descriptor.errorKey} is missing title, user message, or operator message.`,
    });
  }
}

const internalServer = HUMAN_ERROR_DICTIONARY.internal_server_error;
if (!internalServer.bugReportEligible) {
  findings.push({
    id: "internal-server-bug-report",
    severity: "p0",
    status: "deferred",
    detail: "internal_server_error must be bug report eligible.",
  });
}

const insufficientPaid = HUMAN_ERROR_DICTIONARY.insufficient_paid_gumdrops;
if (!insufficientPaid.userMessage.includes("paid GumDrops") || !insufficientPaid.userMessage.includes("not reward balance")) {
  findings.push({
    id: "insufficient-paid-copy",
    severity: "p0",
    status: "deferred",
    detail: "insufficient_paid_gumdrops must mention paid GumDrops and not reward balance.",
  });
}

if (!/pick another/i.test(HUMAN_ERROR_DICTIONARY.slot_unavailable.userMessage)) {
  findings.push({
    id: "slot-unavailable-copy",
    severity: "p0",
    status: "deferred",
    detail: "slot_unavailable must tell users to pick another slot.",
  });
}

const noticeSource = readSource("src/components/errors/HumanErrorNotice.tsx");
if (/debugOnlyDetails|operatorMessage/.test(noticeSource)) {
  findings.push({
    id: "notice-renders-debug-details",
    severity: "p0",
    status: "deferred",
    detail: "HumanErrorNotice must not render operator or debug-only details by default.",
  });
}

const resolverSource = readSource("src/lib/errors/resolve-human-error.ts");
if (/return\s+error\.message|return\s+String\(error\)/.test(resolverSource)) {
  findings.push({
    id: "resolver-raw-message-return",
    severity: "p0",
    status: "deferred",
    detail: "Resolver must not directly return raw error.message or String(error) as user copy.",
  });
}

const typeSource = readSource("src/lib/errors/error-language.ts");
if (!typeSource.includes('"submit_bug"') || !typeSource.includes("bugReportEligible") || !typeSource.includes("rewardEligible")) {
  findings.push({
    id: "bug-report-contract-shape",
    severity: "p0",
    status: "deferred",
    detail: "Descriptor shape must include submit_bug, bugReportEligible, and rewardEligible.",
  });
}

const entries = (Object.values(HUMAN_ERROR_DICTIONARY) as HumanErrorDescriptor[]).map((descriptor) => ({
  errorKey: descriptor.errorKey,
  surface: descriptor.surface,
  severity: descriptor.severity,
  owner: descriptor.owner,
  primaryAction: descriptor.primaryAction,
  secondaryAction: descriptor.secondaryAction ?? null,
  bugReportEligible: descriptor.bugReportEligible,
  rewardEligible: descriptor.rewardEligible,
}));

const bugReportEligibleCount = entries.filter((entry) => entry.bugReportEligible).length;
const rewardEligibleCount = entries.filter((entry) => entry.rewardEligible).length;
const surfacesCovered = Array.from(new Set(entries.map((entry) => entry.surface))).sort();
const rawErrorFindings = deferredRawSources.filter((entry) => entry.status === "deferred_phase_two_wiring");
const errorCoverageQueue = scanErrorTranslationCoverage();
const coverageCategoryCounts = errorCoverageQueue.reduce<Record<ErrorCoverageCategory, number>>((counts, finding) => {
  counts[finding.category] = (counts[finding.category] ?? 0) + 1;
  return counts;
}, {
  raw_user_facing_error: 0,
  raw_debug_only_error: 0,
  unknown_catch_block: 0,
  provider_error_without_safe_translation: 0,
  retryable_non_retryable_mismatch: 0,
  missing_debug_fingerprint: 0,
  missing_recovery_action: 0,
});
const protectedDomainCounts = errorCoverageQueue.reduce<Record<ProtectedDomain, number>>((counts, finding) => {
  counts[finding.protectedDomain] = (counts[finding.protectedDomain] ?? 0) + 1;
  return counts;
}, {
  auth: 0,
  payment_provider: 0,
  external_provider: 0,
  firebase_runtime: 0,
  locked_content: 0,
  none: 0,
});

const nextFixOrder = [
  "Adopt resolveHumanError in creator dashboard managers that currently display body.error or body.message.",
  "Adopt buildHumanApiErrorPayload in creator experience routes after preserving existing problem codes.",
  "Connect translated platform errors to the future bug-report reward flow without exposing raw details.",
];

const report = {
  generatedAtUtc: new Date().toISOString(),
  reportKey: "error-language-contract",
  currentHead: currentHead(),
  summary: {
    dictionaryEntries: entries.length,
    rawErrorPatternsBlocked: 9,
    surfacesCovered,
    bugReportEligibleCount,
    rewardEligibleCount,
    unresolvedRawErrorSources: rawErrorFindings.length,
    p0Count: findings.filter((finding) => finding.severity === "p0").length,
    p1Count: findings.filter((finding) => finding.severity === "p1").length,
    p2Count: rawErrorFindings.length,
    errorCoverageFindingCount: errorCoverageQueue.length,
    protectedErrorFindingCount: errorCoverageQueue.filter((finding) => finding.protectedDomain !== "none").length,
    coverageCategoryCounts,
    protectedDomainCounts,
  },
  entries,
  rawErrorFindings,
  errorTranslationCoverage: {
    categories: [
      "raw_user_facing_error",
      "raw_debug_only_error",
      "unknown_catch_block",
      "provider_error_without_safe_translation",
      "retryable_non_retryable_mismatch",
      "missing_debug_fingerprint",
      "missing_recovery_action",
    ],
    sourceInputs: SCAN_ROOTS,
    queueCap: 40,
    compactQueue: errorCoverageQueue.slice(0, 40),
  },
  deferredSurfaces: [
    {
      surface: "creator_dashboard",
      reason: "Managers still need Phase 2 adoption of translated payloads.",
    },
    {
      surface: "wallet",
      reason: "Payment provider behavior is forbidden in this phase; translation adoption is deferred.",
    },
    {
      surface: "creator_chat",
      reason: "Chat send/realtime error translation needs a focused wiring pass.",
    },
  ],
  nextFixOrder,
};

if (report.nextFixOrder.length === 0) {
  findings.push({
    id: "missing-next-fix-order",
    severity: "p0",
    status: "deferred",
    detail: "Report must emit nextFixOrder.",
  });
}

writeJson(ARTIFACT_PATH, report);

const doc = `# Error Language Contract

Generated: ${report.generatedAtUtc}

Current head: \`${report.currentHead}\`

## Status

Phase 1 creates the shared human error contract, dictionary, resolver, API payload helper, and client notice component. It does not wire every product surface yet.

## Rules

- Normal user and creator UI must show plain-language messages, not raw route, provider, Firebase, validation, or stack details.
- Raw details stay in route diagnostics, Debug, and operator evidence.
- User copy explains what happened, what it blocks, who can fix it, and what action to take next.
- \`rewardEligible\` marks translated platform errors that can use the Phase 2 bug-report reward flow.

## Coverage

- Dictionary entries: ${report.summary.dictionaryEntries}
- Bug-report eligible entries: ${report.summary.bugReportEligibleCount}
- Reward eligible entries: ${report.summary.rewardEligibleCount}
- Surfaces covered: ${surfacesCovered.join(", ")}
- Error translation queue findings: ${report.summary.errorCoverageFindingCount}
- Protected-domain queue findings: ${report.summary.protectedErrorFindingCount}

## Error Translation Coverage Queue

Categories: ${report.errorTranslationCoverage.categories.join(", ")}

Top findings:

${report.errorTranslationCoverage.compactQueue.slice(0, 10).map((entry, index) => `${index + 1}. ${entry.category} in \`${entry.path}:${entry.line}\` (${entry.surface}, protected=${entry.protectedDomain}) - ${entry.recommendedAction}`).join("\n")}

## Deferred Wiring

${report.deferredSurfaces.map((entry) => `- ${entry.surface}: ${entry.reason}`).join("\n")}

## Next Fix Order

${nextFixOrder.map((step, index) => `${index + 1}. ${step}`).join("\n")}
`;

writeFileSync(DOC_PATH, doc);

if (findings.length > 0) {
  console.error(JSON.stringify({ ok: false, findings }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    dictionaryEntries: report.summary.dictionaryEntries,
    unresolvedRawErrorSources: report.summary.unresolvedRawErrorSources,
    artifact: ARTIFACT_PATH,
    doc: DOC_PATH,
  }, null, 2));
}
