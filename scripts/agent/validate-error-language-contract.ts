import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
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
  return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
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
  },
  entries,
  rawErrorFindings,
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
