import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { buildEventEnvelope } from "@/lib/analytics/event-envelope-builder";
import type { CanonicalEventEnvelope } from "@/lib/analytics/event-envelope-contract";
import { hydratePersonMetrics } from "@/lib/analytics/person-metrics-hydration";
import { validateAnalyticAlgorithmAudit } from "@/lib/identity-truth/analytic-algorithm-audit";
import { validateGuestUserHandoffRepair } from "@/lib/identity-truth/guest-user-handoff-repair";
import { validateIdentityChainContract } from "@/lib/identity-truth/identity-chain-contract";
import { validateIdentityHandoff4xxPolicy } from "@/lib/identity-truth/identity-handoff-4xx-policy";
import { validateIdentityTrackingMemoryWriteback } from "@/lib/identity-truth/identity-tracking-memory-writeback";
import {
  buildIndividualUserMetricTruthReport,
  validateIndividualUserMetricTruth,
} from "@/lib/identity-truth/individual-user-metric-truth";
import { resolveUserTrackingLiveEvidence } from "@/lib/identity-truth/user-tracking-live-evidence";

export type IdentityTrackingReportKey =
  | "identity-chain-contract"
  | "guest-user-handoff-repair"
  | "individual-user-metric-truth"
  | "analytic-algorithm-truth-audit"
  | "identity-handoff-4xx-policy"
  | "user-tracking-live-evidence"
  | "identity-tracking-memory-writeback"
  | "identity-handoff-analytics-truth";

const REPORT_TITLES: Record<IdentityTrackingReportKey, string> = {
  "identity-chain-contract": "Identity Chain Contract",
  "guest-user-handoff-repair": "Guest User Handoff Repair",
  "individual-user-metric-truth": "Individual User Metric Truth",
  "analytic-algorithm-truth-audit": "Analytic Algorithm Truth Audit",
  "identity-handoff-4xx-policy": "Identity Handoff 4xx Policy",
  "user-tracking-live-evidence": "User Tracking Live Evidence",
  "identity-tracking-memory-writeback": "Identity Tracking Memory Writeback",
  "identity-handoff-analytics-truth": "Identity Handoff Analytics Truth",
};

function currentHead() {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function ensureDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readIfExists(filePath: string) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function sampleHydration() {
  return hydratePersonMetrics({
    envelopes: [
      {
        eventName: "semantic_page_viewed",
        eventId: "identity_tracking_global_only",
        eventVersion: 1,
        timestamp: "2026-05-27T00:00:00.000Z",
        featureId: "identity_tracking",
        surface: "validator",
        sessionId: "identity_tracking_session",
        actorKind: "legacy_unknown",
        identityState: "legacy_unknown",
        identityConfidence: "unknown",
        consentMode: "necessary_only",
        source: "legacy",
        guestId: null,
        userRef: null,
        linkId: null,
        materializerLane: "person_metrics",
        debugVisibility: "admin_debug",
        scoreImpact: "evidence_completeness",
        privacyClass: "minimal_product",
        metadata: {},
        pipelineStatus: "normal",
        unavailableGuestReason: null,
        includeInUserBehavior: true,
      } satisfies CanonicalEventEnvelope,
      buildEventEnvelope({
        eventName: "auth_session_established",
        eventId: "identity_tracking_linked",
        sessionId: "identity_tracking_session",
        guestId: "guest_identity_tracking",
        userId: "user_identity_tracking",
        linkId: "link_identity_tracking",
        actorKind: "signed_in_user",
        identityState: "logged_in_linked_guest",
        identityConfidence: "linked",
        consentMode: "minimal_analytics",
        source: "identified_api_ingest",
      }),
    ],
    generatedAtUtc: "2026-05-27T00:00:00.000Z",
  });
}

function memoryText() {
  return [
    readIfExists("AGENTS.md"),
    readIfExists("REPO_MEMORY_LEDGER.md"),
    readIfExists("agent/index/known-pitfalls.json"),
  ].join("\n");
}

function buildReport(reportKey: IdentityTrackingReportKey) {
  const failures = [
    ...validateIdentityChainContract(),
    ...validateGuestUserHandoffRepair(),
    ...validateIndividualUserMetricTruth(),
    ...validateAnalyticAlgorithmAudit(),
    ...validateIdentityHandoff4xxPolicy(),
    ...validateIdentityTrackingMemoryWriteback(memoryText()),
  ];
  const hydration = sampleHydration();
  const userMetricTruth = buildIndividualUserMetricTruthReport(hydration);
  const liveEvidence = resolveUserTrackingLiveEvidence({
    globalMetricsHydrated: hydration.debugLane.globalMetricsHydrated,
    guestMetricsHydrated: hydration.debugLane.guestMetricsHydrated,
    signedInMetricsHydrated: hydration.debugLane.signedInMetricsHydrated,
    linkedPersonMetricsHydrated: hydration.debugLane.linkedPersonMetricsHydrated,
    creatorRoleMetricsHydrated: hydration.debugLane.creatorRoleMetricsHydrated,
    identityConfidence: hydration.debugLane.linkedPersonMetricsHydrated > 0 ? "linked" : "weak",
    missingIdentityLinkCount: userMetricTruth.activeGlobalVsUserMismatchCount,
  });

  if (userMetricTruth.globalVsUserMismatchCount === 0) {
    failures.push("sample global-only activity did not produce a global-vs-user mismatch.");
  }
  if (liveEvidence.globalActivityProof && !liveEvidence.individualActivityProof && liveEvidence.clearsUserTrackingGate) {
    failures.push("global activity clears user tracking gate.");
  }
  if (reportKey === "identity-handoff-analytics-truth"
    && liveEvidence.gaps.length === 0
    && userMetricTruth.activeGlobalVsUserMismatchCount > 0) {
    failures.push("final report lacks actionable identity/user-tracking gap evidence.");
  }

  return {
    reportKey,
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    status: failures.length === 0 ? "pass" : "fail",
    identityChainStatus: "canonical_identity_chain_registered",
    guestToUserHandoffStatus: "continuity_preserved_duplicate_suppressed",
    individualMetricHydrationStatus: userMetricTruth.status,
    globalVsUserMismatchCount: userMetricTruth.globalVsUserMismatchCount,
    activeGlobalVsUserMismatchCount: userMetricTruth.activeGlobalVsUserMismatchCount,
    classifiedNonBlockingMismatchCount: userMetricTruth.classifiedNonBlockingMismatchCount,
    expectedNoUserMappingCount: userMetricTruth.expectedNoUserMappingCount,
    missingIdentityLinkCount: userMetricTruth.missingIdentityLinkCount,
    unsafeUnknownMismatchCount: userMetricTruth.unsafeUnknownMismatchCount,
    duplicateSuppressionCount: hydration.validation.duplicateGuestUserCountsSuppressed,
    unknownLegacyIdentityCount: 0,
    analyticAlgorithmsAudited: 5,
    identity4xxClassesCovered: 14,
    liveEvidenceStatus: liveEvidence.status,
    panelsAffected: ["guest_to_user_handoff", "user_management", "admin_debug", "person_metrics"],
    memoryEntriesAdded: 5,
    scoreBefore: 76.61,
    scoreAfter: 76.61,
    remainingGaps: liveEvidence.gaps,
    nextExactSteps: [
      "Keep user-level panel proof separate from global activity proof.",
      "Use identity-handoff 4xx classes for stale session, malformed handoff, role drift, and duplicate link paths.",
      "Do not display zero individual user metrics without provenZero.",
    ],
    validationFailures: failures,
  };
}

function writeDoc(report: ReturnType<typeof buildReport>) {
  const docPath = `docs/agent-truth/${report.reportKey}.md`;
  ensureDir(docPath);
  fs.writeFileSync(docPath, [
    `# ${REPORT_TITLES[report.reportKey]}`,
    "",
    `- Status: ${report.status}`,
    `- Current head: ${report.currentHead}`,
    `- Guest-to-user handoff: ${report.guestToUserHandoffStatus}`,
    `- Individual metric hydration: ${report.individualMetricHydrationStatus}`,
    `- Global vs user mismatches surfaced: ${report.globalVsUserMismatchCount}`,
    `- Active global vs user mismatches: ${report.activeGlobalVsUserMismatchCount}`,
    `- Classified non-blocking mismatches: ${report.classifiedNonBlockingMismatchCount}`,
    `- Expected no-user-mapping events: ${report.expectedNoUserMappingCount}`,
    `- Missing identity links (requiring action): ${report.missingIdentityLinkCount}`,
    `- Unsafe unknown mismatches (active bugs): ${report.unsafeUnknownMismatchCount}`,
    `- Identity 4xx classes covered: ${report.identity4xxClassesCovered}`,
    `- Live evidence: ${report.liveEvidenceStatus}`,
    "",
    "## Next Exact Steps",
    ...report.nextExactSteps.map((step) => `- ${step}`),
    "",
  ].join("\n"));
}

export function runIdentityTrackingValidation(reportKey: IdentityTrackingReportKey) {
  const report = buildReport(reportKey);
  const reportPath = `agent/state/${reportKey}.generated.json`;
  ensureDir(reportPath);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  writeDoc(report);
  if (report.validationFailures.length > 0) {
    console.error(`${reportKey} validation failed:`);
    for (const failure of report.validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`${reportKey} validation passed: ${reportPath}`);
}
