import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import {
  buildLegacyEventRecoveryCandidate,
  buildMarchFirstEventRecoveryDryRun,
  dryRunOnly,
  recoveryStartDate,
} from "@/lib/legacy/march-first-event-recovery";
import { LEGACY_EVENT_RECOVERY_DOMAINS } from "@/lib/legacy/legacy-event-recovery-contract";

const REPORT_PATH = "agent/state/march-first-event-recovery.generated.json";
const DOC_PATH = "docs/agent-truth/march-first-event-recovery.md";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function gitOutput(command: string) {
  try {
    return execSync(command, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function listChangedFiles() {
  const names = new Set<string>();
  for (const command of ["git diff --name-only", "git diff --cached --name-only", "git ls-files --others --exclude-standard"]) {
    for (const line of gitOutput(command).split(/\r?\n/u)) {
      if (line.trim()) names.add(line.trim());
    }
  }
  return [...names].sort();
}

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function countOccurrences(source: string, text: string) {
  return source.split(text).length - 1;
}

function writeDoc(report: {
  generatedAtUtc: string;
  status: "pass" | "fail";
  currentHead: string;
  changedFiles: string[];
  checks: Record<string, boolean>;
  validationFailures: string[];
  dryRun: ReturnType<typeof buildMarchFirstEventRecoveryDryRun>;
}) {
  mkdirSync(dirname(DOC_PATH), { recursive: true });
  writeFileSync(DOC_PATH, [
    "# March First Event Recovery",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Contract",
    "",
    "- Recovery starts at `2026-03-01`.",
    "- Recovery is dry-run only: no production reads, live backfill, or mutations.",
    "- Legacy records produce normalized event envelope candidates with confidence, consent assumption, duplicate risk, and action labels.",
    "- Unknown or weak legacy evidence stays weak or unknown and cannot become exact current user truth.",
    "- Missing consent falls back to minimal page/session evidence when safe, or necessary-only archive evidence; it never becomes full behavioral tracking.",
    "- Wallet/payment lifecycle records are manual-review candidates only. Payment, wallet crediting, pricing, and GumDrop math are untouched.",
    "- Admin Debug exposes one `Legacy recovery` lane with counts by confidence/action and raw dumps collapsed.",
    "",
    "## Supported Domains",
    "",
    ...LEGACY_EVENT_RECOVERY_DOMAINS.map((domain) => `- ${domain}`),
    "",
    "## Dry-Run Summary",
    "",
    `- Input records: ${report.dryRun.summary.inputRecords}`,
    `- Candidate count: ${report.dryRun.summary.candidateCount}`,
    `- Recovery start date: ${report.dryRun.recoveryStartDate}`,
    `- Mutations allowed: ${String(report.dryRun.mutationsAllowed)}`,
    `- Raw records included: ${String(report.dryRun.rawRecordsIncluded)}`,
    "",
    "## Checks",
    "",
    ...Object.entries(report.checks).map(([key, passed]) => `- ${passed ? "pass" : "fail"}: ${key}`),
    "",
    "## Changed Files",
    "",
    ...(report.changedFiles.length > 0 ? report.changedFiles.map((file) => `- ${file}`) : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(report.validationFailures.length > 0 ? report.validationFailures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n"));
}

function main() {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = gitOutput("git rev-parse HEAD") || "unknown";
  const changedFiles = listChangedFiles();
  const failures: string[] = [];

  const contractSource = read("src/lib/legacy/legacy-event-recovery-contract.ts");
  const recoverySource = read("src/lib/legacy/march-first-event-recovery.ts");
  const adminDebugRouteSource = read("src/app/api/admin/debug/route.ts");
  const adminDebugSummarySource = read("src/lib/server/admin-debug/legacy-recovery-summary.ts");
  const testSource = read("tests/unit/march-first-event-recovery.spec.ts");
  const packageJson = read("package.json");

  const unknownCandidate = buildLegacyEventRecoveryCandidate({
    legacyEventId: "validator_unknown",
    rawEventName: "unknown_legacy",
    occurredAt: "2026-03-02T00:00:00.000Z",
    source: "old_events",
    userId: "old-user",
  });
  const missingConsentCandidate = buildLegacyEventRecoveryCandidate({
    legacyEventId: "validator_missing_consent",
    rawEventName: "semantic_page_viewed",
    occurredAt: "2026-03-02T00:00:00.000Z",
    source: "analytics_sessions",
    guestId: "guest-1",
    sessionId: "session-1",
  });
  const dryRun = buildMarchFirstEventRecoveryDryRun({
    records: [
      {
        legacyEventId: "validator_drop",
        rawEventName: "drop_opened",
        occurredAt: "2026-03-03T00:00:00.000Z",
        source: "analytics_event_facts",
        guestId: "guest-2",
        sessionId: "session-2",
        consentMode: "full_behavioral",
      },
      {
        legacyEventId: "validator_payment",
        rawEventName: "wallet_purchase_completed",
        occurredAt: "2026-03-04T00:00:00.000Z",
        source: "transactions",
        userId: "user-1",
        consentMode: "necessary_only",
      },
      {
        legacyEventId: "validator_unknown",
        rawEventName: "unknown_legacy",
        occurredAt: "2026-03-02T00:00:00.000Z",
        source: "old_events",
        userId: "old-user",
      },
    ],
  });
  const protectedChangedFiles = changedFiles.filter((file) =>
    /(^|\/)(chat|top-nav|bottom-nav|navbar|navigation)(\/|\.|$)/iu.test(file)
      || /paypal|payment|gumdrop/iu.test(file));

  const checks = {
    recoveryDateIsMarchFirst: recoveryStartDate === "2026-03-01" && dryRun.recoveryStartDate === "2026-03-01",
    dryRunOnlyNoLiveMutation: dryRunOnly === true
      && dryRun.mode === "dry_run_only"
      && dryRun.readsProduction === false
      && dryRun.liveBackfill === false
      && dryRun.mutationsAllowed === false
      && dryRun.mutationPrevention.productionMutationBlocked === true,
    noMutationExports: !/\bexport\s+function\s+(?:backfill|mutate|write|commit|apply)/iu.test(recoverySource),
    domainsCovered: LEGACY_EVENT_RECOVERY_DOMAINS.every((domain) => contractSource.includes(`"${domain}"`)),
    unknownLegacyNotExactUser: unknownCandidate.normalizedEnvelopeCandidate.identityState === "legacy_unknown"
      && unknownCandidate.normalizedEnvelopeCandidate.identityConfidence !== "exact"
      && unknownCandidate.normalizedEnvelopeCandidate.userRef === null,
    missingConsentNotFullBehavioral: missingConsentCandidate.normalizedEnvelopeCandidate.consentMode !== "full_behavioral",
    duplicateRiskPresent: dryRun.candidates.every((candidate) => Boolean(candidate.duplicateRisk)),
    everyLegacyEventHasEnvelopeCandidate: dryRun.candidates.every((candidate) => Boolean(candidate.normalizedEnvelopeCandidate?.eventId)),
    paymentLifecycleManualReviewOnly: dryRun.candidates
      .filter((candidate) => candidate.domain === "wallet_payment_lifecycle")
      .every((candidate) => candidate.action === "needs_manual_review" && candidate.canMutateProduction === false),
    debugPanelHasSingleLegacyRecoveryLane: countOccurrences(adminDebugRouteSource, "legacyRecovery") === 1
      && adminDebugSummarySource.includes('lane: "Legacy recovery"')
      && adminDebugSummarySource.includes("rawDumpsCollapsed: true")
      && adminDebugSummarySource.includes("duplicateLegacyWidgetsConsolidated: true"),
    testCoversBoundaryConsentAndUnknown: testSource.includes("2026-03-01")
      && testSource.includes("unknown legacy")
      && testSource.includes("full behavioral"),
    packageScriptPresent: packageJson.includes('"check:march-first-event-recovery": "tsx scripts/agent/validate-march-first-event-recovery.ts"'),
    chatNavPaymentGumdropRuntimeUntouched: protectedChangedFiles.length === 0,
  };

  for (const [key, passed] of Object.entries(checks)) {
    if (!passed) failures.push(`${key} failed.`);
  }
  if (protectedChangedFiles.length > 0) {
    failures.push(`protected files changed: ${protectedChangedFiles.join(", ")}`);
  }

  const report = {
    reportKey: "march-first-event-recovery",
    generatedAtUtc,
    currentHead,
    status: failures.length === 0 ? "pass" as const : "fail" as const,
    productionReadsRequired: false,
    liveBackfill: false,
    mutationsAllowed: false,
    fakeEventsUsed: false,
    dryRun,
    protectedRuntimeStatus: {
      paymentPaypalUntouched: !changedFiles.some((file) => /paypal|payment/iu.test(file)),
      gumdropMathUntouched: !changedFiles.some((file) => /gumdrop/iu.test(file)),
      chatNavUntouched: !changedFiles.some((file) => /(^|\/)(chat|top-nav|bottom-nav|navbar|navigation)(\/|\.|$)/iu.test(file)),
    },
    checks,
    changedFiles,
    validationFailures: failures,
    debugPanelLane: {
      name: "Legacy recovery",
      rawDumpsCollapsed: true,
      duplicateLegacyWidgetsConsolidated: true,
      recoveryStartDate,
      mutationPrevention: "blocked",
    },
    releaseNote: [
      "Added dry-run legacy event recovery from March 1.",
      "Mapped older events into the new identity-aware envelope model.",
      "Simplified debug legacy recovery into one lane.",
    ],
  };

  writeJson(REPORT_PATH, report);
  writeDoc({ ...report, dryRun });

  if (failures.length > 0) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  console.log(`March first event recovery passed: ${Object.keys(checks).length} checks.`);
}

main();
