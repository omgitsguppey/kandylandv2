import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  GA4_RECOVERY_EVENT_MAPPINGS,
  RECOVERY_TIMELINE_SOURCE_PRECEDENCE,
  RECOVERY_TIMELINE_SPINE_VERSION,
  TREASURY_TIMELINE_EVENT_MAP,
  buildGumdropRecoveryQueue,
  buildRecoveryTimelineEntryFromCanonicalEvent,
  buildRecoveryTimelineEntryFromGa4Event,
  reconcileAnalyticsEventFactsWithRecoveryTimeline,
  reconcileTreasuryEventsWithRecoveryTimeline,
  validateGumdropRecoveryQueue,
  validateRecoveryTimelineEntries,
  type RecoveryTimelineEntry,
  type TreasuryLedgerRecoveryInput,
  type TreasuryTimelineEvidenceInput,
} from "../../src/lib/analytics/recovery-timeline-spine";
import { createCanonicalAnalyticsEvent } from "../../src/lib/analytics/analytics-event-contract";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/recovery-timeline-spine.generated.json";

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function writeJson(path: string, value: unknown) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function exists(path: string) {
  return existsSync(join(ROOT, path));
}

function buildSampleTimeline(): RecoveryTimelineEntry[] {
  const canonicalEvent = createCanonicalAnalyticsEvent({
    eventId: "event_fact:support-ticket-created",
    eventName: "support_ticket_created",
    occurredAt: "2026-06-07T00:00:00.000Z",
    receivedAt: "2026-06-07T00:00:01.000Z",
    actorType: "user",
    userId: "sample_user",
    source: "server",
    consentState: "not_required",
    objectType: "system",
    objectId: "support_thread_sample",
  });

  const ledgerBackedPurchase = createCanonicalAnalyticsEvent({
    eventId: "event_fact:purchase-completed",
    eventName: "gumdrops_purchase_completed",
    occurredAt: "2026-06-07T00:05:00.000Z",
    receivedAt: "2026-06-07T00:05:01.000Z",
    actorType: "user",
    userId: "sample_user",
    source: "server",
    consentState: "not_required",
    objectType: "purchase",
    objectId: "txn_sample",
  });

  const unknownLegacyWatch = createCanonicalAnalyticsEvent({
    eventId: "legacy:watch-duration",
    eventName: "watch_duration_legacy",
    occurredAt: "2026-06-07T00:10:00.000Z",
    receivedAt: "2026-06-07T00:10:00.000Z",
    actorType: "unknown",
    source: "legacy_firestore",
    consentState: "unknown",
    objectType: "viewer_session",
    objectId: "legacy_watch_sample",
    legacySource: "legacy_page_duration_events",
    legacyId: "legacy_watch_sample",
    legacyConfidence: "unknown",
    mappingWarnings: ["Legacy page duration is not canonical watch time."],
  });

  return [
    buildRecoveryTimelineEntryFromCanonicalEvent(canonicalEvent),
    buildRecoveryTimelineEntryFromCanonicalEvent(ledgerBackedPurchase, {
      source: "transaction_ledger",
      sourceRecordId: "txn_sample",
      corroboration: {
        transactionId: "txn_sample",
        gumdropLedgerId: "ledger_sample",
        sourceCount: 2,
        treasuryLedgerCorroborated: true,
      },
      notes: ["Payment product-truth eligibility requires transaction/GumDrop ledger corroboration."],
    }),
    buildRecoveryTimelineEntryFromGa4Event({
      ga4EventName: "purchase",
      ga4EventId: "ga4_row_sample",
      occurredAt: "2026-06-07T00:05:00.000Z",
      importedAt: "2026-06-07T12:00:00.000Z",
      transactionId: "txn_sample",
    }),
    buildRecoveryTimelineEntryFromCanonicalEvent(unknownLegacyWatch, {
      source: "unknown_legacy",
      sourceRecordId: "legacy_watch_sample",
      notes: ["Unknown legacy watch duration remains archive/debug evidence only."],
    }),
  ];
}

function includes(source: string, needle: string) {
  return source.includes(needle);
}

function main() {
  const contract = read("src/lib/analytics/recovery-timeline-spine.ts");
  const materializationContract = read("src/lib/analytics/materialization-contract.ts");
  const legacyContract = read("src/lib/analytics/legacy-recovery-contract.ts");
  const ga4Truth = read("src/lib/analytics/ga4-truth.ts");
  const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
  const timeline = buildSampleTimeline();
  const validation = validateRecoveryTimelineEntries(timeline);
  const eventFactReconciliation = reconcileAnalyticsEventFactsWithRecoveryTimeline({
    generatedAtUtc: "2026-06-07T12:00:00.000Z",
    firstPartyEventFacts: [
      {
        eventId: "event_fact:support-ticket-created",
        eventName: "support_ticket_created",
        timestamp: Date.parse("2026-06-07T00:00:00.000Z"),
        userId: "sample_user",
        sessionId: "support_session",
        sourceSurface: "server",
      },
      {
        eventId: "event_fact:duplicate-click-a",
        eventName: "drop_clicked",
        timestamp: Date.parse("2026-06-07T00:03:00.000Z"),
        userId: "sample_user",
        sessionId: "dup_session",
        dropId: "drop_duplicate",
      },
      {
        eventId: "event_fact:duplicate-click-b",
        eventName: "drop_clicked",
        timestamp: Date.parse("2026-06-07T00:03:20.000Z"),
        userId: "sample_user",
        sessionId: "dup_session",
        dropId: "drop_duplicate",
      },
    ],
    timelineEntries: [
      timeline[0],
      buildRecoveryTimelineEntryFromCanonicalEvent(createCanonicalAnalyticsEvent({
        eventId: "event_fact:duplicate-click-a",
        eventName: "drop_clicked",
        occurredAt: "2026-06-07T00:03:00.000Z",
        receivedAt: "2026-06-07T00:03:01.000Z",
        actorType: "user",
        userId: "sample_user",
        sessionId: "dup_session",
        source: "server",
        consentState: "not_required",
        objectType: "drop",
        objectId: "drop_duplicate",
      }), {
        source: "first_party_event_fact",
        sourceRecordId: "event_fact:duplicate-click-a",
        classification: "duplicate_candidate",
      }),
      buildRecoveryTimelineEntryFromGa4Event({
        ga4EventName: "page_view",
        ga4EventId: "ga4_gap",
        occurredAt: "2026-06-07T00:20:00.000Z",
        userPseudoId: "ga4_anon",
        sessionId: "ga4_session",
        pagePath: "/drops",
      }),
      timeline[3],
    ],
  });
  const purchaseEvidence = buildRecoveryTimelineEntryFromCanonicalEvent(createCanonicalAnalyticsEvent({
    eventId: "event_fact:purchase-completed",
    eventName: "gumdrops_purchase_completed",
    occurredAt: "2026-06-07T00:05:00.000Z",
    receivedAt: "2026-06-07T00:05:01.000Z",
    actorType: "user",
    userId: "sample_user",
    sessionId: "purchase_session",
    source: "server",
    consentState: "not_required",
    objectType: "purchase",
    objectId: "txn_sample",
  }), {
    source: "first_party_event_fact",
    corroboration: {
      transactionId: "txn_sample",
      eventFactId: "event_fact:purchase-completed",
      sourceCount: 1,
      treasuryLedgerCorroborated: false,
    },
  });
  const unlockEvidence = buildRecoveryTimelineEntryFromCanonicalEvent(createCanonicalAnalyticsEvent({
    eventId: "event_fact:unlock",
    eventName: "drop_unwrapped",
    occurredAt: "2026-06-07T00:06:00.000Z",
    receivedAt: "2026-06-07T00:06:01.000Z",
    actorType: "user",
    userId: "sample_user",
    sessionId: "unlock_session",
    source: "server",
    consentState: "not_required",
    objectType: "unlock",
    objectId: "unlock_sample",
  }), {
    source: "first_party_event_fact",
    corroboration: {
      unlockId: "unlock_sample",
      eventFactId: "event_fact:unlock",
      sourceCount: 1,
      treasuryLedgerCorroborated: false,
    },
  });
  const analyticsOnlyPurchase = buildRecoveryTimelineEntryFromGa4Event({
    ga4EventName: "purchase",
    ga4EventId: "ga4_purchase_without_ledger",
    occurredAt: "2026-06-07T00:07:00.000Z",
    userPseudoId: "ga4_sample_user",
    sessionId: "ga4_purchase_session",
    transactionId: "txn_missing",
  });
  const creatorAccrualEvidence = buildRecoveryTimelineEntryFromCanonicalEvent(createCanonicalAnalyticsEvent({
    eventId: "legacy:creator-accrual",
    eventName: "creator_revenue_accrued",
    occurredAt: "2026-06-07T00:08:00.000Z",
    receivedAt: "2026-06-07T00:08:00.000Z",
    actorType: "creator",
    userId: "sample_creator",
    sessionId: "creator_session",
    source: "legacy_firestore",
    consentState: "unknown",
    objectType: "purchase",
    objectId: "creator_accrual_missing",
    legacySource: "legacy_creator_revenue",
    legacyId: "legacy_creator_accrual_missing",
    legacyConfidence: "low",
    mappingWarnings: ["Legacy creator revenue is evidence only until creator ledger proof exists."],
  }), {
    source: "legacy_analytics",
    sourceRecordId: "legacy_creator_accrual_missing",
  });
  const treasuryLedgerEvents: TreasuryLedgerRecoveryInput[] = [
    {
      ledgerId: "ledger_purchase_sample",
      transactionId: "txn_sample",
      eventType: "purchase",
      eventName: "gumdrops_purchase_completed",
      occurredAt: "2026-06-07T00:05:00.000Z",
      actor: { userId: "sample_user", sessionId: "purchase_session" },
      amountGd: 550,
      sourceBucket: "paid_gd",
      direction: "credit",
      sourceTruth: "server_transaction",
    },
    {
      ledgerId: "ledger_reward_sample",
      eventType: "reward",
      eventName: "daily_reward_claimed",
      occurredAt: "2026-06-07T00:05:30.000Z",
      actor: { userId: "sample_user", sessionId: "reward_session" },
      amountGd: 25,
      sourceBucket: "task_reward_gd",
      direction: "credit",
      sourceTruth: "reward_ledger",
    },
    {
      ledgerId: "ledger_unlock_sample",
      transactionId: "unlock_sample",
      eventType: "unlock_spend",
      eventName: "drop_unwrapped",
      occurredAt: "2026-06-07T00:06:00.000Z",
      actor: { userId: "sample_user", sessionId: "unlock_session" },
      amountGd: 100,
      sourceBucket: "paid_gd",
      direction: "debit",
      sourceTruth: "unlock_record",
    },
  ];
  const treasuryTimelineEvidence: TreasuryTimelineEvidenceInput[] = [
    { entry: purchaseEvidence, expectedSourceBucket: "paid_gd" },
    { entry: unlockEvidence, expectedSourceBucket: "reward_gd" },
    { entry: analyticsOnlyPurchase, expectedSourceBucket: "paid_gd" },
    { entry: creatorAccrualEvidence, expectedSourceBucket: "paid_gd" },
  ];
  const treasuryTimelineReconciliation = reconcileTreasuryEventsWithRecoveryTimeline({
    generatedAtUtc: "2026-06-07T12:00:00.000Z",
    ledgerEvents: treasuryLedgerEvents,
    timelineEvidence: treasuryTimelineEvidence,
  });
  const gumdropRecoveryQueue = buildGumdropRecoveryQueue({
    generatedAtUtc: "2026-06-07T12:00:00.000Z",
    reconciliation: treasuryTimelineReconciliation,
    ledgerEvents: treasuryLedgerEvents,
    timelineEvidence: treasuryTimelineEvidence,
  });
  const gumdropRecoveryQueueFailures = validateGumdropRecoveryQueue(gumdropRecoveryQueue);

  const checks = {
    packageScriptPresent: packageJson.scripts?.["check:recovery-timeline-spine"] === "tsx scripts/agent/validate-recovery-timeline-spine.ts",
    schemaVersioned: RECOVERY_TIMELINE_SPINE_VERSION === "2026.06.recovery-timeline-spine.1",
    sourcePrecedenceDeclared: RECOVERY_TIMELINE_SOURCE_PRECEDENCE[0] === "first_party_event_fact"
      && RECOVERY_TIMELINE_SOURCE_PRECEDENCE.includes("ga4_evidence")
      && RECOVERY_TIMELINE_SOURCE_PRECEDENCE.includes("unknown_legacy"),
    classificationStatesPresent: ["canonical", "corroborating_evidence", "weak_match", "unknown_legacy", "duplicate_candidate", "rejected"]
      .every((needle) => includes(contract, `"${needle}"`)),
    missingIsNotZeroStatesPresent: ["source_missing", "bridge_missing", "materializer_missing", "permission_blocked"]
      .every((needle) => includes(contract, `"${needle}"`)),
    ga4EvidenceOnly: includes(ga4Truth, "ga4EvidenceOnly") && includes(contract, "GA4 evidence cannot be product_truth_eligible"),
    legacyDryRunOnly: includes(legacyContract, "dryRun: true")
      && includes(legacyContract, "serverConfirmed: false")
      && includes(contract, "legacy evidence cannot directly be product_truth_eligible"),
    materializationReused: includes(materializationContract, "analytics_event_facts")
      && includes(materializationContract, "transactions")
      && includes(materializationContract, "daily_task_events"),
    paymentLedgerGuard: includes(contract, "ledger_corroboration_required")
      && includes(contract, "treasuryLedgerCorroborated")
      && timeline.some((entry) => entry.productDomain === "wallet_payment" && entry.recoveryEligibility === "rejected"),
    ga4MappingsPresent: GA4_RECOVERY_EVENT_MAPPINGS.some((entry) => entry.ga4EventName === "purchase" && entry.commerceTruthRequiresLedger)
      && GA4_RECOVERY_EVENT_MAPPINGS.some((entry) => entry.ga4EventName === "page_view" && entry.productDomain === "telemetry_behavior"),
    validationPasses: validation.ok,
    eventFactReconciliationPresent: eventFactReconciliation.reportKey === "analytics-event-facts-recovery-reconciliation"
      && eventFactReconciliation.productTruthPolicy.firstPartyEventFactsPrimary
      && eventFactReconciliation.productTruthPolicy.legacyCanOnlyCorroborate
      && eventFactReconciliation.productTruthPolicy.ga4CanOnlyCorroborate,
    eventFactGapClassesPresent: eventFactReconciliation.summary.firstPartyPresent > 0
      && eventFactReconciliation.summary.ga4Only > 0
      && eventFactReconciliation.summary.identityMissing > 0
      && eventFactReconciliation.summary.duplicateCandidate > 0,
    treasuryEventMapPresent: TREASURY_TIMELINE_EVENT_MAP.length === 6
      && TREASURY_TIMELINE_EVENT_MAP.some((entry) => entry.eventType === "purchase" && entry.productTruthRule.includes("server transaction"))
      && TREASURY_TIMELINE_EVENT_MAP.some((entry) => entry.eventType === "refund_void"),
    treasuryReconciliationStatusesPresent: treasuryTimelineReconciliation.summary.ledger_confirmed > 0
      && treasuryTimelineReconciliation.summary.analytics_correlated > 0
      && treasuryTimelineReconciliation.summary.analytics_missing > 0
      && treasuryTimelineReconciliation.summary.ledger_missing_protected > 0
      && treasuryTimelineReconciliation.summary.source_bucket_mismatch > 0,
    treasuryAnalyticsExcludedFromMoneyTruth: treasuryTimelineReconciliation.productTruthPolicy.treasuryLedgersPrimary
      && treasuryTimelineReconciliation.productTruthPolicy.analyticsCanOnlyCorroborate
      && !treasuryTimelineReconciliation.productTruthPolicy.ga4CanCreditOrDebitGumdrops
      && !treasuryTimelineReconciliation.productTruthPolicy.legacyCanCreditOrDebitGumdrops
      && treasuryTimelineReconciliation.findings
        .filter((finding) => finding.status !== "ledger_confirmed" && finding.status !== "analytics_missing")
        .every((finding) => finding.productTruthAllowed === false),
    gumdropRecoveryQueuePresent: gumdropRecoveryQueue.reportKey === "gumdrop-recovery-queue"
      && gumdropRecoveryQueue.productTruthPolicy.dryRunOnly
      && !gumdropRecoveryQueue.productTruthPolicy.creditsOrDebitsUsers
      && !gumdropRecoveryQueue.productTruthPolicy.backfillsTransactions
      && !gumdropRecoveryQueue.productTruthPolicy.analyticsOnlyCanChangeBalance,
    gumdropRecoveryQueueRejectsAnalyticsOnlyBalanceRecovery: gumdropRecoveryQueue.summary.analyticsOnlyRejectedCount > 0
      && gumdropRecoveryQueue.summary.moneyAffectingRecoveryAllowedCount === 0
      && gumdropRecoveryQueue.items
        .filter((item) => item.evidenceSources.length > 0 && item.evidenceSources.every((source) => source.kind !== "treasury_ledger"))
        .every((item) => item.allowedRecoveryAction === "reject_analytics_only_balance_recovery"),
    gumdropRecoveryQueueValidationPasses: gumdropRecoveryQueueFailures.length === 0,
  };

  const failures = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => `${key} failed`);

  const report = {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "recovery-timeline-spine",
    version: RECOVERY_TIMELINE_SPINE_VERSION,
    status: failures.length === 0 ? "pass" : "fail",
    sourcePrecedence: RECOVERY_TIMELINE_SOURCE_PRECEDENCE,
    schema: {
      requiredFields: [
        "timelineId",
        "source",
        "timestamp",
        "eventName",
        "actor",
        "identityConfidence",
        "eventConfidence",
        "productDomain",
        "classification",
        "recoveryEligibility",
        "missingVsZeroState",
        "corroboration",
        "evidenceLabels",
      ],
      classificationStates: ["canonical", "corroborating_evidence", "weak_match", "unknown_legacy", "duplicate_candidate", "rejected"],
      productTruthEligibleSources: ["first_party_event_fact", "transaction_ledger", "gumdrop_ledger", "unlock_record", "reward_record"],
      evidenceOnlySources: ["ga4_evidence", "legacy_analytics", "unknown_legacy"],
      ga4EventMappings: GA4_RECOVERY_EVENT_MAPPINGS.map((entry) => ({
        ga4EventName: entry.ga4EventName,
        canonicalEventName: entry.canonicalEventName,
        confidence: entry.confidence,
        productDomain: entry.productDomain,
        commerceTruthRequiresLedger: entry.commerceTruthRequiresLedger,
      })),
    },
    compactTimelineSample: timeline.map((entry) => ({
      timelineId: entry.timelineId,
      source: entry.source,
      eventName: entry.eventName,
      actorType: entry.actor.actorType,
      identityConfidence: entry.identityConfidence,
      eventConfidence: entry.eventConfidence,
      productDomain: entry.productDomain,
      classification: entry.classification,
      recoveryEligibility: entry.recoveryEligibility,
      missingVsZeroState: entry.missingVsZeroState,
      treasuryLedgerCorroborated: entry.corroboration.treasuryLedgerCorroborated,
      evidenceLabels: entry.evidenceLabels,
    })),
    productTruthPolicy: {
      ga4CanAffectProductTruth: false,
      legacyCanOverwriteCurrentTruth: false,
      missingCanRenderAsZero: false,
      paymentAndGumdropRequireLedgerCorroboration: true,
      writesRecoveredEventsToProductTruth: false,
    },
    analyticsEventFactReconciliation: {
      matchingRules: eventFactReconciliation.matchingRules,
      summary: eventFactReconciliation.summary,
      compactMatches: eventFactReconciliation.matches.map((entry) => ({
        firstPartyEventFactId: entry.firstPartyEventFactId,
        timelineId: entry.timelineId,
        eventName: entry.eventName,
        gapClassification: entry.gapClassification,
        duplicateCandidate: entry.duplicateCandidate,
        productTruthEligible: entry.productTruthEligible,
        reason: entry.reason,
      })),
      productTruthPolicy: eventFactReconciliation.productTruthPolicy,
    },
    treasuryTimelineReconciliation: {
      eventMap: treasuryTimelineReconciliation.eventMap,
      summary: treasuryTimelineReconciliation.summary,
      compactFindings: treasuryTimelineReconciliation.findings.slice(0, 20).map((finding) => ({
        findingId: finding.findingId,
        status: finding.status,
        eventType: finding.eventType,
        ledgerId: finding.ledgerId,
        timelineId: finding.timelineId,
        eventName: finding.eventName,
        sourceBucket: finding.sourceBucket,
        evidenceSourceBucket: finding.evidenceSourceBucket,
        productTruthAllowed: finding.productTruthAllowed,
        reason: finding.reason,
        nextAction: finding.nextAction,
      })),
      productTruthPolicy: treasuryTimelineReconciliation.productTruthPolicy,
    },
    gumdropRecoveryQueue: {
      schema: gumdropRecoveryQueue.schema,
      summary: gumdropRecoveryQueue.summary,
      compactItems: gumdropRecoveryQueue.items.slice(0, 20),
      productTruthPolicy: gumdropRecoveryQueue.productTruthPolicy,
      validationFailures: gumdropRecoveryQueueFailures,
    },
    manualRecoveryInputs: [
      "redacted operator evidence packet",
      "transaction id or GumDrop ledger id for wallet/economy recovery",
      "unlock id or entitlement record for drop access recovery",
      "identity link id for guest-to-user continuity review",
      "source freshness window and materializer status",
    ],
    checks,
    validationFindings: validation.findings,
    failures,
  };

  writeJson(REPORT_PATH, report);

  if (failures.length > 0) {
    console.error("Recovery timeline spine validation failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log(`Recovery timeline spine validation passed: ${timeline.length} compact sample entries.`);
}

main();
