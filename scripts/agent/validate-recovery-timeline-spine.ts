import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS,
  LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT,
  LAUNCH_CRITICAL_EVENT_FAMILIES,
  GA4_RECOVERY_EVENT_MAPPINGS,
  RECOVERY_METRIC_CONFIDENCE_BANDS,
  RECOVERY_METRIC_DEDUPE_DIMENSIONS,
  RECOVERY_METRIC_EVIDENCE_KINDS,
  RECOVERY_METRIC_FRESHNESS_STATES,
  RECOVERY_METRIC_DEDUPE_RULES,
  RECOVERY_METRIC_MODELING_POLICY,
  RECOVERY_METRIC_PRODUCT_TRUTH_POLICY,
  RECOVERY_METRIC_SOURCE_TRUTHS,
  RECOVERY_TIMELINE_SOURCE_PRECEDENCE,
  RECOVERY_TIMELINE_SPINE_VERSION,
  TREASURY_TIMELINE_EVENT_MAP,
  buildLaunchCriticalFamilyProofBoundary,
  buildLaunchCriticalActiveSourceCoverageReport,
  buildLaunchCriticalCatalogCoverage,
  buildLaunchCriticalRecoveryCoverageReport,
  buildLaunchCriticalRecoveryCoverageFromEvidence,
  buildFormalLaunchHistoryDayRecoveryState,
  buildLaunchHistoryCoverageRangeProofEligibility,
  buildLaunchHistoryDayRecoveryState,
  buildLaunchHistoryDisplaySummaryState,
  buildLaunchHistorySourceDayCoverageState,
  buildGumdropRecoveryQueue,
  buildRecoveryMetricIdentityStitchingState,
  buildRecoveredLaunchMetricState,
  buildRecoveryTimelineEntryFromCanonicalEvent,
  buildRecoveryTimelineEntryFromGa4Event,
  getLaunchCriticalEventFamily,
  reconcileAnalyticsEventFactsWithRecoveryTimeline,
  reconcileTreasuryEventsWithRecoveryTimeline,
  classifyRecoveryMetricConfidenceBand,
  normalizeRecoveryMetricEvidenceKind,
  summarizeLaunchRecoveryDayEvidence,
  validateGumdropRecoveryQueue,
  validateRecoveryTimelineEntries,
  type RecoveryTimelineEntry,
  type TreasuryLedgerRecoveryInput,
  type TreasuryTimelineEvidenceInput,
} from "../../src/lib/analytics/recovery-timeline-spine";
import { createCanonicalAnalyticsEvent } from "../../src/lib/analytics/analytics-event-contract";
import {
  TELEMETRY_CANONICAL_EVENT_NAMES,
  TELEMETRY_EVENT_ALIAS_TO_CANONICAL,
} from "../../shared/runtime/telemetry-event-manifest";

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
  const launchCoverage = buildLaunchCriticalRecoveryCoverageFromEvidence({
    generatedAtUtc: "2026-06-07T12:00:00.000Z",
    sourceEvidence: {
      canonicalEventCounts: Object.fromEntries(
        LAUNCH_CRITICAL_EVENT_FAMILIES.map((family) => [family.canonicalEventNames[0] ?? family.familyId, 1]),
      ),
    },
  });
  const launchCatalogCoverage = buildLaunchCriticalCatalogCoverage({
    catalogEventNames: TELEMETRY_CANONICAL_EVENT_NAMES,
    aliasToCanonical: TELEMETRY_EVENT_ALIAS_TO_CANONICAL,
  });
  const ga4MappedLaunchCriticalFamilyIds = new Set(
    GA4_RECOVERY_EVENT_MAPPINGS
      .map((entry) => getLaunchCriticalEventFamily(entry.canonicalEventName)?.familyId ?? null)
      .filter(Boolean),
  );
  const activeSourceCoverage = buildLaunchCriticalActiveSourceCoverageReport({
    generatedAtUtc: "2026-06-07T12:00:00.000Z",
    sourceReferencesByEventName: Object.fromEntries(
      LAUNCH_CRITICAL_EVENT_FAMILIES.flatMap((family) =>
        family.canonicalEventNames.map((eventName) => [eventName, [`src/source/${family.familyId}.ts`]]),
      ),
    ),
    materializerReferencesByEventName: Object.fromEntries(
      LAUNCH_CRITICAL_EVENT_FAMILIES.flatMap((family) =>
        family.canonicalEventNames.map((eventName) => [eventName, [`src/materializer/${family.familyId}.ts`]]),
      ),
    ),
  });
  const launchMetricSamples = [
    buildRecoveredLaunchMetricState({
      eventName: "semantic_page_viewed",
      eventId: "event_fact:page",
      sessionId: "launch_session",
      identityLinkId: "identity_link_sample",
      userId: "sample_user",
      route: "/",
      timestampMs: Date.parse("2026-06-07T00:00:00.000Z"),
      insideLateArrivalWindow: true,
    }),
    buildRecoveredLaunchMetricState({
      eventName: "page_viewed",
      sourceTruth: "ga4_evidence_only",
      sourceObserved: true,
      sessionId: "ga4_session",
      anonymousVisitorId: "ga4_pseudo",
      route: "/drops",
      timestampMs: Date.parse("2026-06-07T00:01:00.000Z"),
    }),
    buildRecoveredLaunchMetricState({
      eventName: "creator_drop_submitted",
      sourceTruth: "source_missing",
      sourceObserved: false,
    }),
  ];
  const ga4OnlyLaunchCoverage = buildLaunchCriticalRecoveryCoverageReport({
    generatedAtUtc: "2026-06-07T12:00:00.000Z",
    observedEventNames: [],
    recoveredMetrics: [launchMetricSamples[1]],
  });
  const launchRangeEligibilitySamples = {
    approvedExport: buildLaunchHistoryCoverageRangeProofEligibility({
      proofMode: "local_export",
      expectedDayKeys: ["2026-02-12", "2026-02-13", "2026-02-14"],
      declaredExpectedDayCount: 3,
      declaredRecoveredDayCount: 3,
      recoveredDayCount: 3,
      rangeStartDayKey: "2026-02-12",
      rangeEndDayKey: "2026-02-14",
      rangeProof: {
        allLaunchRangeProven: true,
        expectedRangeSource: "approved_all_launch_export",
        coverageWindowKind: "all_range_historical_export",
      },
      launchCoverageState: "available",
      firstPartyCoverageState: "available",
      productTruthRecoveredDayCount: 3,
      sourceAgreementState: "pass",
    }),
    localWindow: buildLaunchHistoryCoverageRangeProofEligibility({
      proofMode: "local_export",
      expectedDayKeys: ["2026-02-12", "2026-02-13", "2026-02-14"],
      declaredExpectedDayCount: 3,
      declaredRecoveredDayCount: 3,
      recoveredDayCount: 3,
      rangeStartDayKey: "2026-02-12",
      rangeEndDayKey: "2026-02-14",
      rangeProof: {
        allLaunchRangeProven: true,
        expectedRangeSource: "fixture_window",
        coverageWindowKind: "fixture_only_local_window",
      },
      launchCoverageState: "available",
      firstPartyCoverageState: "available",
      productTruthRecoveredDayCount: 3,
      sourceAgreementState: "pass",
    }),
    mismatchedAdminTruth: buildLaunchHistoryCoverageRangeProofEligibility({
      proofMode: "admin_truth_sample",
      expectedDayKeys: ["2026-02-12", "2026-02-13", "2026-02-14"],
      declaredExpectedDayCount: 3,
      declaredRecoveredDayCount: 2,
      recoveredDayCount: 3,
      rangeStartDayKey: "2026-02-12",
      rangeEndDayKey: "2026-02-14",
      rangeProof: {
        allLaunchRangeProven: true,
        expectedRangeSource: "admin_truth_sample",
        coverageWindowKind: "admin_truth_sample",
      },
      launchCoverageState: "available",
      firstPartyCoverageState: "available",
      productTruthRecoveredDayCount: 3,
      sourceAgreementState: "pass",
    }),
  };
  const launchSourceDayCoverageSample = buildLaunchHistorySourceDayCoverageState({
    expectedDayKeys: ["2026-02-12", "2026-02-13", "2026-02-14"],
    firstPartyDayKeys: ["2026-02-12"],
    ga4DayKeys: ["2026-02-12", "2026-02-13"],
    historicalSnapshotDayKeys: [],
    legacySupportDayKeys: ["2026-02-14"],
  });
  const launchDayEvidenceSummarySample = summarizeLaunchRecoveryDayEvidence([
    buildLaunchHistoryDayRecoveryState({
      dayKey: "2026-02-12",
      firstPartyCount: 1,
    }),
    buildLaunchHistoryDayRecoveryState({
      dayKey: "2026-02-13",
      ga4Count: 1,
    }),
    buildFormalLaunchHistoryDayRecoveryState({
      dayKey: "2026-02-14",
      localDay: null,
    }),
  ]);
  const launchDisplaySummarySamples = {
    sourceMissing: buildLaunchHistoryDisplaySummaryState({
      sourceAgreementState: "review",
      launchHistoryCoverage: {
        expectedDayCount: 3,
        recoveredDayCount: 3,
        evidenceObservedDayCount: 3,
        productTruthRecoveredDayCount: 0,
        state: "partial",
        sourceDayCounts: {
          firstParty: 0,
          ga4: 3,
          historicalSnapshot: 0,
          legacySupport: 0,
        },
        firstPartyCoverage: {
          state: "source_missing",
          coveredDayCount: 0,
          missingRanges: ["2026-02-12..2026-06-20"],
        },
        rangeProof: {
          allLaunchRangeProven: false,
          formalExpectedDayCount: 129,
          evidenceDayCount: 3,
          coverageWindowKind: "fixture_only_local_window",
        },
        days: [{ confidenceBand: "directional" }],
      },
    }),
    firstParty: buildLaunchHistoryDisplaySummaryState({
      sourceAgreementState: "pass",
      launchHistoryCoverage: {
        expectedDayCount: 2,
        recoveredDayCount: 2,
        evidenceObservedDayCount: 2,
        productTruthRecoveredDayCount: 2,
        state: "available",
        sourceDayCounts: {
          firstParty: 2,
          ga4: 0,
          historicalSnapshot: 0,
          legacySupport: 0,
        },
        firstPartyCoverage: {
          state: "available",
          coveredDayCount: 2,
          missingRanges: [],
        },
        rangeProof: {
          allLaunchRangeProven: true,
          formalExpectedDayCount: 2,
          evidenceDayCount: 2,
          coverageWindowKind: "admin_truth_sample",
        },
        days: [{ confidenceBand: "strong" }],
      },
    }),
  };

  const checks = {
    packageScriptPresent: packageJson.scripts?.["check:recovery-timeline-spine"] === "tsx scripts/agent/validate-recovery-timeline-spine.ts",
    schemaVersioned: RECOVERY_TIMELINE_SPINE_VERSION === "2026.06.recovery-timeline-spine.1",
    lateArrivalWindowDeclared: ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS === 12,
    launchCriticalFamiliesMapped: LAUNCH_CRITICAL_EVENT_FAMILIES.length === 13
      && launchCoverage.canonicalMappedFamilyCount === 13
      && launchCoverage.canonicalMappingCoveragePercent === 100
      && launchCoverage.coveragePercent === 100
      && launchCoverage.missingFamilies.length === 0,
    launchCriticalCatalogMapped: launchCatalogCoverage.catalogMappedFamilyCount === 13
      && launchCatalogCoverage.catalogMappingCoveragePercent === 100
      && launchCatalogCoverage.missingFamilies.length === 0
      && launchCatalogCoverage.familyCatalogStates.every((entry) => entry.catalogMapped),
    launchCriticalFirstPartyHoldbackRequired: launchCoverage.observedFirstPartyFamilyCount === 13
      && launchCoverage.observedFirstPartyCoveragePercent === 100
      && launchCoverage.sourceCoverageStatus === "pass"
      && launchCoverage.holdbackValidation.observedFirstPartyRequired
      && launchCoverage.holdbackValidation.modeledOrInferredCanCalibrateOnly
      && launchCoverage.targetCoveragePercent === LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT
      && launchCoverage.holdbackValidation.minObservedFirstPartyCoveragePercent === LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT
      && launchCoverage.familySourceStates.length === LAUNCH_CRITICAL_EVENT_FAMILIES.length
      && launchCoverage.familySourceStates.every((entry) => entry.observedFirstParty && entry.productTruthEligible),
    launchFamilySourceRolesAndMathReasons: launchCoverage.familySourceStates.every((entry) =>
      entry.sourceRole === "product_truth"
      && entry.mathReason.includes("observed product-truth evidence")
    )
      && ga4OnlyLaunchCoverage.familySourceStates.some((entry) =>
        entry.sourceRole === "calibration_only"
        && entry.sourceCoverageState === "modeled_second_source"
        && entry.mathReason.includes("calibration evidence only")
      ),
    launchFamilyMetadataComplete: launchCoverage.familySourceStates.every((entry) =>
      entry.sourceTruth === entry.strongestSourceTruth
      && entry.evidenceKind === entry.strongestEvidenceKind
      && RECOVERY_METRIC_SOURCE_TRUTHS.includes(entry.sourceTruth)
      && RECOVERY_METRIC_EVIDENCE_KINDS.includes(entry.evidenceKind)
      && RECOVERY_METRIC_FRESHNESS_STATES.includes(entry.freshnessState)
      && entry.proofBoundary.externalEvidenceCanClearProductTruth === false
      && entry.proofBoundary.missingCanRenderAsZero === false
      && typeof entry.proofBoundary.recoveryBoundary === "string"
      && typeof entry.dedupeKey === "string"
      && entry.dedupeKey.includes(`launch_recovery|${entry.familyId}`)
      && entry.lateArrivalWindowDays === ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS
    )
      && ga4OnlyLaunchCoverage.familySourceStates.every((entry) =>
        entry.sourceTruth === entry.strongestSourceTruth
        && entry.evidenceKind === entry.strongestEvidenceKind
        && RECOVERY_METRIC_SOURCE_TRUTHS.includes(entry.sourceTruth)
        && RECOVERY_METRIC_EVIDENCE_KINDS.includes(entry.evidenceKind)
        && RECOVERY_METRIC_FRESHNESS_STATES.includes(entry.freshnessState)
        && entry.proofBoundary.externalEvidenceCanClearProductTruth === false
        && entry.proofBoundary.missingCanRenderAsZero === false
        && typeof entry.proofBoundary.recoveryBoundary === "string"
        && typeof entry.dedupeKey === "string"
        && entry.dedupeKey.includes(`launch_recovery|${entry.familyId}`)
        && entry.lateArrivalWindowDays === ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS
      )
      && ga4OnlyLaunchCoverage.familySourceStates.some((entry) =>
        entry.sourceTruth === "ga4_evidence_only"
        && entry.evidenceKind === "modeled"
        && entry.freshnessState === "external_evidence_required"
      ),
    launchDedupeDimensionsCanonical: RECOVERY_METRIC_DEDUPE_RULES.dedupeDimensions.join("|") === RECOVERY_METRIC_DEDUPE_DIMENSIONS.join("|")
      && RECOVERY_METRIC_DEDUPE_DIMENSIONS.join("|") === "event_id|session_id|identity_link_id|user_id|guest_id|route|object_id|timestamp_window|semantic_action"
      && launchCoverage.familySourceStates.every((entry) =>
        entry.dedupeDimensions?.join("|") === RECOVERY_METRIC_DEDUPE_DIMENSIONS.join("|")
      )
      && ga4OnlyLaunchCoverage.familySourceStates.every((entry) =>
        entry.dedupeDimensions?.join("|") === RECOVERY_METRIC_DEDUPE_DIMENSIONS.join("|")
      )
      && activeSourceCoverage.familySourceStates.every((entry) =>
        entry.dedupeDimensions?.join("|") === RECOVERY_METRIC_DEDUPE_DIMENSIONS.join("|")
      ),
    activeSourceFamilyMetadataComplete: activeSourceCoverage.familySourceStates.every((entry) =>
      RECOVERY_METRIC_SOURCE_TRUTHS.includes(entry.sourceTruth)
      && RECOVERY_METRIC_EVIDENCE_KINDS.includes(entry.evidenceKind)
      && RECOVERY_METRIC_FRESHNESS_STATES.includes(entry.freshnessState)
      && entry.proofBoundary.externalEvidenceCanClearProductTruth === false
      && entry.proofBoundary.missingCanRenderAsZero === false
      && typeof entry.dedupeKey === "string"
      && entry.dedupeKey.includes(`launch_recovery|${entry.familyId}`)
      && entry.lateArrivalWindowDays === ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS
    ),
    launchRecoveryStatesPresent: launchCoverage.sourceTruthStates.includes("first_party_event_fact")
      && launchCoverage.sourceTruthStates.includes("ga4_evidence_only")
      && launchCoverage.sourceTruthStates.includes("source_missing")
      && launchCoverage.sourceTruthStates.join("|") === RECOVERY_METRIC_SOURCE_TRUTHS.join("|")
      && launchCoverage.evidenceKinds.join("|") === RECOVERY_METRIC_EVIDENCE_KINDS.join("|")
      && launchCoverage.confidenceBands.join("|") === RECOVERY_METRIC_CONFIDENCE_BANDS.join("|")
      && launchCoverage.freshnessStates.join("|") === RECOVERY_METRIC_FRESHNESS_STATES.join("|")
      && launchCoverage.productTruthPolicy.missingIsNotZero,
    launchRecoveryPoliciesCanonical: JSON.stringify(launchCoverage.dedupeRules) === JSON.stringify(RECOVERY_METRIC_DEDUPE_RULES)
      && JSON.stringify(launchCoverage.productTruthPolicy) === JSON.stringify(RECOVERY_METRIC_PRODUCT_TRUTH_POLICY)
      && JSON.stringify(launchCoverage.modelingPolicy) === JSON.stringify(RECOVERY_METRIC_MODELING_POLICY)
      && launchCoverage.modelingPolicy.lateArrivalWindowDays === ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS
      && launchCoverage.modelingPolicy.visibilityMinimumVisiblePercent === 50
      && launchCoverage.modelingPolicy.visibilityMinimumVisibleMs === 1_000
      && launchCoverage.modelingPolicy.modeledEvidenceCanCalibrateOnly
      && launchCoverage.modelingPolicy.productTruthRequiresFirstPartyOrLedgerCorroboration,
    modelledAliasNormalizesToModeled: normalizeRecoveryMetricEvidenceKind("modelled") === "modeled"
      && normalizeRecoveryMetricEvidenceKind("modeled") === "modeled"
      && !launchCoverage.evidenceKinds.includes("modelled" as never),
    launchDedupeEventIdPrimary: launchMetricSamples[0].dedupeKey === "launch_recovery|page_view|event:event_fact:page",
    launchDedupeFallbackIncludesIdentityRouteObjectAndWindow: launchMetricSamples[1].dedupeKey.includes("event:no_event_id")
      && launchMetricSamples[1].dedupeKey.includes("session:ga4_session")
      && launchMetricSamples[1].dedupeKey.includes("guest:ga4_pseudo")
      && launchMetricSamples[1].dedupeKey.includes("route:/drops")
      && launchMetricSamples[1].dedupeKey.includes("object:no_object")
      && launchMetricSamples[1].dedupeKey.includes("bucket:"),
    launchMetricDedupeDimensionsPresent: launchMetricSamples.every((entry) =>
      entry.dedupeDimensions.join("|") === RECOVERY_METRIC_DEDUPE_DIMENSIONS.join("|")
    ),
    launchIdentityStitchingCanonical: buildRecoveryMetricIdentityStitchingState({
      eventId: "event_fact:page",
      identityLinkId: "identity_link_sample",
    }).doubleCountingPreventedBy === "event_id"
      && buildRecoveryMetricIdentityStitchingState({
        identityLinkId: "identity_link_sample",
      }).doubleCountingPreventedBy === "identity_link_id"
      && buildRecoveryMetricIdentityStitchingState({}).doubleCountingPreventedBy === "session_semantic_window",
    launchMetricMissingNotZero: launchMetricSamples[2].evidenceKind === "missing"
      && launchMetricSamples[2].confidenceScore === 0
      && launchMetricSamples[2].confidenceBand === "missing"
      && launchMetricSamples[2].missingVsZeroState === "source_missing",
    launchHistoryRangeEligibilityCentralized: launchRangeEligibilitySamples.approvedExport.allLaunchRangeProven
      && launchRangeEligibilitySamples.approvedExport.coverageWindowKind === "all_range_historical_export"
      && launchRangeEligibilitySamples.approvedExport.proofModeAllowsLaunchRangeProof
      && !launchRangeEligibilitySamples.localWindow.allLaunchRangeProven
      && launchRangeEligibilitySamples.localWindow.coverageWindowKind === "local_source_window"
      && !launchRangeEligibilitySamples.localWindow.proofModeAllowsLaunchRangeProof
      && !launchRangeEligibilitySamples.mismatchedAdminTruth.allLaunchRangeProven
      && launchRangeEligibilitySamples.mismatchedAdminTruth.coverageWindowKind === "admin_truth_sample"
      && !launchRangeEligibilitySamples.mismatchedAdminTruth.declaredCountsMatchRows,
    launchSourceDayCoverageCentralized: launchSourceDayCoverageSample.sourceDayCounts.firstParty === 1
      && launchSourceDayCoverageSample.sourceDayCounts.first_party === 1
      && launchSourceDayCoverageSample.sourceDayCounts.ga4 === 2
      && launchSourceDayCoverageSample.sourceDayCounts.historicalSnapshot === 0
      && launchSourceDayCoverageSample.sourceDayCounts.legacySupport === 1
      && launchSourceDayCoverageSample.firstPartyMissingDayKeys.length === 2
      && launchSourceDayCoverageSample.sourceMissingDayKeys.length === 0,
    launchDayEvidenceSummaryCountsKnownSources: launchDayEvidenceSummarySample.dayCount === 3
      && launchDayEvidenceSummarySample.sourceCountsKnownDayCount === 2
      && launchDayEvidenceSummarySample.evidenceKindCounts.observed === 1
      && launchDayEvidenceSummarySample.evidenceKindCounts.modeled === 1
      && launchDayEvidenceSummarySample.evidenceKindCounts.missing === 1,
    launchHistoryDisplaySummaryCentralized: launchDisplaySummarySamples.sourceMissing.sourceLabel === "GA4"
      && launchDisplaySummarySamples.sourceMissing.confidenceLabel === "directional"
      && launchDisplaySummarySamples.sourceMissing.coverageLabel.includes("Product-truth source missing")
      && launchDisplaySummarySamples.sourceMissing.coverageLabel.includes("evidence present")
      && !launchDisplaySummarySamples.sourceMissing.coverageLabel.includes("observed 3/3 evidence days")
      && launchDisplaySummarySamples.sourceMissing.missingRangeCount === 1
      && launchDisplaySummarySamples.firstParty.sourceLabel === "First-party"
      && launchDisplaySummarySamples.firstParty.coverageLabel === "2/2 product-truth launch days",
    ga4MetricModeledEvidenceOnly: launchMetricSamples[1].evidenceKind === "modeled"
      && launchMetricSamples[1].sourceTruth === "ga4_evidence_only"
      && launchMetricSamples[1].freshnessState === "external_evidence_required"
      && launchMetricSamples[1].confidenceBand === "directional",
    launchMetricConfidenceBandsCanonical: launchMetricSamples.every((entry) =>
      entry.confidenceBand === classifyRecoveryMetricConfidenceBand(entry.confidenceScore)
    )
      && launchCoverage.familySourceStates.every((entry) =>
        entry.confidenceBand === classifyRecoveryMetricConfidenceBand(entry.confidenceScore)
      ),
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
      && GA4_RECOVERY_EVENT_MAPPINGS.some((entry) => entry.ga4EventName === "page_view" && entry.productDomain === "telemetry_behavior")
      && LAUNCH_CRITICAL_EVENT_FAMILIES.every((family) => ga4MappedLaunchCriticalFamilyIds.has(family.familyId)),
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
      evidenceKindAliases: {
        modelled: "modeled",
      },
      modelingPolicy: RECOVERY_METRIC_MODELING_POLICY,
      productTruthEligibleSources: ["first_party_event_fact", "transaction_ledger", "gumdrop_ledger", "unlock_record", "reward_record"],
      evidenceOnlySources: ["ga4_evidence", "legacy_analytics", "unknown_legacy"],
      ga4EventMappings: GA4_RECOVERY_EVENT_MAPPINGS.map((entry) => ({
        ga4EventName: entry.ga4EventName,
        canonicalEventName: entry.canonicalEventName,
        confidence: entry.confidence,
        productDomain: entry.productDomain,
        commerceTruthRequiresLedger: entry.commerceTruthRequiresLedger,
      })),
      ga4LaunchCriticalFamilyCoverage: {
        mappedFamilyCount: ga4MappedLaunchCriticalFamilyIds.size,
        requiredFamilyCount: LAUNCH_CRITICAL_EVENT_FAMILIES.length,
        mappedFamilies: [...ga4MappedLaunchCriticalFamilyIds].sort(),
        missingFamilies: LAUNCH_CRITICAL_EVENT_FAMILIES
          .map((family) => family.familyId)
          .filter((familyId) => !ga4MappedLaunchCriticalFamilyIds.has(familyId)),
      },
    },
    launchCriticalRecovery: {
      coverage: launchCoverage,
      catalogCoverage: launchCatalogCoverage,
      activeSourceCoverage,
      compactMetricSamples: launchMetricSamples.map((entry) => ({
        metricKey: entry.metricKey,
        eventName: entry.eventName,
        sourceTruth: entry.sourceTruth,
        freshnessState: entry.freshnessState,
        confidenceScore: entry.confidenceScore,
        confidenceBand: entry.confidenceBand,
        evidenceKind: entry.evidenceKind,
        dedupeKey: entry.dedupeKey,
        lateArrivalWindowDays: entry.lateArrivalWindowDays,
        missingVsZeroState: entry.missingVsZeroState,
        identityStitching: entry.identityStitching,
        mathReason: entry.mathReason,
      })),
      familyMap: LAUNCH_CRITICAL_EVENT_FAMILIES.map((family) => ({
        familyId: family.familyId,
        canonicalEventNames: family.canonicalEventNames,
        activeSourceEventNames: family.activeSourceEventNames ?? family.canonicalEventNames,
        defaultSourceTruth: family.defaultSourceTruth,
        defaultEvidenceKind: family.defaultEvidenceKind,
        productDomain: family.productDomain,
        materializerLane: family.materializerLane,
        identityScope: family.identityScope,
        dedupeWindowMs: family.dedupeWindowMs,
        dedupeDimensions: family.dedupeDimensions ?? RECOVERY_METRIC_DEDUPE_DIMENSIONS,
        proofBoundary: buildLaunchCriticalFamilyProofBoundary(family),
        recoveryNotes: family.recoveryNotes,
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
