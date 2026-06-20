import { describe, expect, it } from "vitest";

import { createCanonicalAnalyticsEvent } from "@/lib/analytics/analytics-event-contract";
import {
  ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS,
  LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT,
  LAUNCH_CRITICAL_EVENT_FAMILIES,
  RECOVERED_METRIC_METADATA_PROOF_BOUNDARY,
  RECOVERY_METRIC_DEDUPE_DIMENSIONS,
  RECOVERY_METRIC_DEDUPE_RULES,
  RECOVERED_METRIC_REQUIRED_METADATA_FIELDS,
  RECOVERY_METRIC_CONFIDENCE_BANDS,
  RECOVERY_METRIC_EVIDENCE_KINDS,
  RECOVERY_METRIC_FRESHNESS_STATES,
  RECOVERY_METRIC_MODELING_POLICY,
  RECOVERY_METRIC_POLICY_PROOF_BOUNDARY,
  RECOVERY_METRIC_PRODUCT_TRUTH_POLICY,
  RECOVERY_METRIC_SOURCE_TRUTHS,
  RECOVERY_TIMELINE_SOURCE_PRECEDENCE,
  GA4_RECOVERY_EVENT_MAPPINGS,
  buildLaunchAnalyticsRecoveryDedupeKey,
  buildLaunchCriticalFamilyProofBoundary,
  buildLaunchCriticalActiveSourceCoverageReport,
  buildLaunchCriticalCatalogCoverage,
  buildLaunchCriticalRecoveryCoverageFromEvidence,
  buildLaunchCriticalRecoveryCoverageReport,
  buildLaunchCriticalObservedEventNamesFromSourceEvidence,
  buildLaunchCriticalRecoveredMetricsFromSourceEvidence,
  buildFormalLaunchHistoryDayRecoveryState,
  buildFormalLaunchRangeRecoveryState,
  buildAllLaunchHistoricalRouteRangeProofState,
  buildLaunchHistoryRangeProofState,
  buildLaunchHistoryCoverageRangeProofEligibility,
  buildLaunchHistoryDisplaySummaryState,
  buildLaunchHistorySourceDayCoverageState,
  buildLaunchHistorySourceCoverageRowsState,
  buildLaunchHistoryCoverageSummaryState,
  buildLaunchHistoryDayRecoveryState,
  buildLaunchHistoryDayRecoveryStatesFromSources,
  buildLaunchRecoverySourceGateState,
  buildGumdropRecoveryQueue,
  collapseLaunchRecoveryDayRanges,
  buildRecoveryMetricIdentityStitchingState,
  buildRecoveredLaunchMetricState,
  buildRecoveryTimelineEntryFromGa4Event,
  buildRecoveryTimelineEntryFromCanonicalEvent,
  classifyRecoveryMetricConfidenceBand,
  getLaunchCriticalEventFamily,
  getLaunchCriticalActiveSourceEventNames,
  getLaunchCriticalDedupeDimensions,
  getGa4RecoveryEventMapping,
  inferRecoveryProductDomain,
  normalizeLaunchHistoryRangeProofKind,
  normalizeRecoveryMetricEvidenceKind,
  reconcileAnalyticsEventFactsWithRecoveryTimeline,
  reconcileTreasuryEventsWithRecoveryTimeline,
  summarizeLaunchActiveSourceFamilyStates,
  summarizeLaunchRecoveryConfidenceBands,
  summarizeLaunchRecoveryDayEvidence,
  summarizeLaunchRecoveryFamilySourceStates,
  summarizeRecoveredMetricMetadataCompleteness,
  validateGumdropRecoveryQueue,
  validateRecoveryTimelineEntries,
} from "@/lib/analytics/recovery-timeline-spine";
import {
  TELEMETRY_CANONICAL_EVENT_NAMES,
  TELEMETRY_EVENT_ALIAS_TO_CANONICAL,
} from "../../shared/runtime/telemetry-event-manifest";

describe("recovery timeline spine", () => {
  it("owns launch recovery day range collapsing", () => {
    expect(collapseLaunchRecoveryDayRanges([
      "2026-02-12",
      "2026-02-14",
      "2026-02-13",
      "2026-02-20",
      "2026-02-20",
      "2026-02-21",
    ])).toEqual(["2026-02-12..2026-02-14", "2026-02-20..2026-02-21"]);
  });

  it("keeps first-party and ledger sources ahead of legacy and GA4 evidence", () => {
    expect(RECOVERY_TIMELINE_SOURCE_PRECEDENCE.slice(0, 3)).toEqual([
      "first_party_event_fact",
      "transaction_ledger",
      "gumdrop_ledger",
    ]);
    expect(RECOVERY_TIMELINE_SOURCE_PRECEDENCE.indexOf("ga4_evidence")).toBeGreaterThan(
      RECOVERY_TIMELINE_SOURCE_PRECEDENCE.indexOf("behavioral_timeline_fact"),
    );
  });

  it("classifies viewer sessions as telemetry behavior before identity-session text", () => {
    expect(inferRecoveryProductDomain("watch_duration_legacy", "viewer_session")).toBe("telemetry_behavior");
  });

  it("requires treasury ledger corroboration for payment recovery eligibility", () => {
    const event = createCanonicalAnalyticsEvent({
      eventId: "ga4:purchase",
      eventName: "gumdrops_purchase_completed",
      occurredAt: "2026-06-07T00:00:00.000Z",
      receivedAt: "2026-06-07T12:00:00.000Z",
      actorType: "unknown",
      source: "ga4_daily",
      consentState: "unknown",
      objectType: "purchase",
      objectId: "txn_1",
      legacySource: "ga4_daily",
      legacyId: "row_1",
      legacyConfidence: "medium",
      mappingWarnings: [],
    });

    const entry = buildRecoveryTimelineEntryFromCanonicalEvent(event, {
      source: "ga4_evidence",
      sourceRecordId: "row_1",
    });

    expect(entry.productDomain).toBe("wallet_payment");
    expect(entry.classification).toBe("corroborating_evidence");
    expect(entry.recoveryEligibility).toBe("ledger_corroboration_required");
    expect(entry.evidenceLabels).toContain("ga4_evidence_only");
  });

  it("maps GA4 page events into evidence-only timeline entries", () => {
    const entry = buildRecoveryTimelineEntryFromGa4Event({
      ga4EventName: "page_view",
      ga4EventId: "ga4_page_1",
      occurredAt: "2026-06-07T00:00:00.000Z",
      userPseudoId: "pseudo_1",
      sessionId: "session_1",
      pagePath: "/drops",
    });

    expect(getGa4RecoveryEventMapping("page_view").canonicalEventName).toBe("page_viewed");
    expect(entry.source).toBe("ga4_evidence");
    expect(entry.productDomain).toBe("telemetry_behavior");
    expect(entry.recoveryEligibility).toBe("evidence_only");
    expect(entry.evidenceLabels).toContain("ga4_evidence_only");
  });

  it("declares 100% launch-critical event family mapping with recovery metadata", () => {
    const familyIds = LAUNCH_CRITICAL_EVENT_FAMILIES.map((family) => family.familyId);
    const expectedDedupeDimensions = [
      "event_id",
      "session_id",
      "identity_link_id",
      "user_id",
      "guest_id",
      "route",
      "object_id",
      "timestamp_window",
      "semantic_action",
    ];

    expect(new Set(familyIds).size).toBe(13);
    expect(familyIds).toEqual([
      "page_view",
      "auth_signup",
      "wallet_open",
      "purchase",
      "drop_preview",
      "cta",
      "unlock",
      "viewer_open",
      "watch_start",
      "watch_end",
      "creator_follow",
      "creator_drop_submit",
      "admin_review",
    ]);
    expect(getLaunchCriticalEventFamily("admin_creator_drop_reviewed")).toMatchObject({
      familyId: "admin_review",
      defaultSourceTruth: "admin_action_fact",
      identityScope: ["admin_operator"],
    });
    expect(getLaunchCriticalEventFamily("watch_session_ended")).toMatchObject({
      familyId: "watch_end",
      defaultSourceTruth: "watch_session_rollup",
    });
    expect(getLaunchCriticalEventFamily("server_purchase_verified")).toMatchObject({
      familyId: "purchase",
      defaultSourceTruth: "server_ledger",
    });
    expect(buildLaunchCriticalFamilyProofBoundary(getLaunchCriticalEventFamily("server_purchase_verified")!)).toMatchObject({
      productTruthSource: "server_ledger",
      sourceRole: "ledger_protected_truth",
      externalEvidenceCanClearProductTruth: false,
      missingCanRenderAsZero: false,
      requiresLedgerCorroboration: true,
    });
    expect(buildLaunchCriticalFamilyProofBoundary(getLaunchCriticalEventFamily("watch_session_ended")!)).toMatchObject({
      productTruthSource: "watch_session_rollup",
      sourceRole: "watch_session_truth",
      requiresWatchSessionRollup: true,
      missingCanRenderAsZero: false,
    });
    expect(buildLaunchCriticalFamilyProofBoundary(getLaunchCriticalEventFamily("admin_creator_drop_reviewed")!)).toMatchObject({
      productTruthSource: "admin_action_fact",
      sourceRole: "admin_audit_truth",
      requiresAdminAuditFact: true,
      missingCanRenderAsZero: false,
    });
    expect(RECOVERY_METRIC_DEDUPE_DIMENSIONS).toEqual(expectedDedupeDimensions);
    expect(RECOVERY_METRIC_DEDUPE_RULES.dedupeDimensions).toEqual(expectedDedupeDimensions);
    expect(RECOVERY_METRIC_POLICY_PROOF_BOUNDARY).toBe("policy_metadata_only_not_runtime_provider_or_admin_truth_proof");
    expect(RECOVERED_METRIC_METADATA_PROOF_BOUNDARY).toBe("metadata_completeness_only_not_source_runtime_provider_or_admin_truth_proof");
    expect(LAUNCH_CRITICAL_EVENT_FAMILIES.every((family) =>
      family.dedupeWindowMs > 0
      && getLaunchCriticalDedupeDimensions(family).join("|") === expectedDedupeDimensions.join("|")
    )).toBe(true);
    expect(LAUNCH_CRITICAL_EVENT_FAMILIES.every((family) => family.recoveryNotes.length > 0)).toBe(true);
  });

  it("maps every launch-critical family to the catalog-derived telemetry manifest", () => {
    const report = buildLaunchCriticalCatalogCoverage({
      catalogEventNames: TELEMETRY_CANONICAL_EVENT_NAMES,
      aliasToCanonical: TELEMETRY_EVENT_ALIAS_TO_CANONICAL,
    });

    expect(report).toMatchObject({
      reportKey: "launch-critical-analytics-catalog-coverage",
      familyCount: 13,
      catalogMappedFamilyCount: 13,
      catalogMappingCoveragePercent: 100,
      missingFamilies: [],
      policy: {
        requiresOneCatalogEventPerFamily: true,
        compatibilityAliasesAllowed: true,
        missingCompatibilityAliasIsNotSourceCoverageFailure: true,
      },
    });
    expect(report.familyCatalogStates.every((family) => family.catalogMapped)).toBe(true);
    expect(report.familyCatalogStates.find((family) => family.familyId === "watch_end")).toMatchObject({
      primaryResolvedEventName: "watch_session_ended",
    });
  });

  it("maps GA/custom recovery evidence into every launch-critical family without clearing product truth", () => {
    const mappedFamilyIds = new Set(
      GA4_RECOVERY_EVENT_MAPPINGS
        .map((mapping) => getLaunchCriticalEventFamily(mapping.canonicalEventName)?.familyId ?? null)
        .filter(Boolean),
    );

    expect(mappedFamilyIds).toEqual(new Set(LAUNCH_CRITICAL_EVENT_FAMILIES.map((family) => family.familyId)));
    expect(getGa4RecoveryEventMapping("sign_up")).toMatchObject({
      canonicalEventName: "auth_registration_completed",
      productDomain: "identity_handoff",
      commerceTruthRequiresLedger: false,
    });
    expect(getGa4RecoveryEventMapping("purchase")).toMatchObject({
      canonicalEventName: "gumdrops_purchase_completed",
      commerceTruthRequiresLedger: true,
    });
    expect(getGa4RecoveryEventMapping("admin_creator_drop_reviewed")).toMatchObject({
      canonicalEventName: "admin_creator_drop_reviewed",
      productDomain: "admin_debug",
      confidence: "low",
    });

    const creatorFollow = buildRecoveryTimelineEntryFromGa4Event({
      ga4EventName: "creator_followed",
      ga4EventId: "ga4_creator_follow",
      occurredAt: "2026-06-07T00:00:00.000Z",
      userPseudoId: "pseudo_creator_follow",
      sessionId: "session_creator_follow",
      objectId: "creator_1",
    });

    expect(creatorFollow.productDomain).toBe("telemetry_behavior");
    expect(creatorFollow.classification).toBe("corroborating_evidence");
    expect(creatorFollow.recoveryEligibility).toBe("evidence_only");
    expect(creatorFollow.evidenceLabels).toContain("ga4_evidence_only");
  });

  it("does not let broad GA purchase vocabulary inflate active source coverage", () => {
    const purchaseFamily = LAUNCH_CRITICAL_EVENT_FAMILIES.find((family) => family.familyId === "purchase");
    expect(purchaseFamily).toBeDefined();
    expect(getLaunchCriticalActiveSourceEventNames(purchaseFamily!)).toEqual([
      "gumdrops_purchase_completed",
      "checkout_completed",
      "server_purchase_verified",
    ]);
    expect(getLaunchCriticalActiveSourceEventNames(purchaseFamily!)).not.toContain("purchase");

    const report = buildLaunchCriticalActiveSourceCoverageReport({
      generatedAtUtc: "2026-06-07T12:00:00.000Z",
      sourceReferencesByEventName: {
        purchase: ["src/app/legal/privacy/page.tsx"],
      },
      materializerReferencesByEventName: {
        purchase: ["src/lib/server/not-a-purchase-materializer.ts"],
      },
    });

    expect(report.familySourceStates.find((family) => family.familyId === "purchase")).toMatchObject({
      activeSourceEventNames: [
        "gumdrops_purchase_completed",
        "checkout_completed",
        "server_purchase_verified",
      ],
      activeSourceReferenceCount: 0,
      materializerReferenceCount: 0,
      sourceCoverageState: "source_missing",
      countsForActiveSourceCoverage: false,
      sourceTruth: "source_missing",
      evidenceKind: "missing",
      confidenceBand: "missing",
    });
  });

  it("does not let broad GA purchase vocabulary inflate recovered launch coverage", () => {
    const report = buildLaunchCriticalRecoveryCoverageReport({
      generatedAtUtc: "2026-06-07T12:00:00.000Z",
      observedEventNames: ["purchase"],
    });

    expect(report.familySourceStates.find((family) => family.familyId === "purchase")).toMatchObject({
      observedFirstParty: false,
      sourceTruth: "source_missing",
      freshnessState: "source_missing",
      evidenceKind: "missing",
      sourceCoverageState: "source_missing",
      productTruthEligible: false,
      sourceRole: "missing_source",
    });
    expect(report.missingFamilies).toContain("purchase");
    expect(report.sourceCoverageStatus).toBe("blocked");
    expect(report.holdbackValidation).toMatchObject({
      observedFirstPartyRequired: true,
      modeledOrInferredCanCalibrateOnly: true,
      status: "blocked",
    });
  });

  it("separates active source-code coverage from historical launch proof", () => {
    const sourceReferencesByEventName = Object.fromEntries(
      LAUNCH_CRITICAL_EVENT_FAMILIES.map((family) => [
        family.canonicalEventNames[0],
        [`src/active/${family.familyId}.ts`],
      ]),
    );
    const materializerReferencesByEventName = Object.fromEntries(
      LAUNCH_CRITICAL_EVENT_FAMILIES.map((family) => [
        family.canonicalEventNames[0],
        [`src/materializers/${family.materializerLane}.ts`],
      ]),
    );
    const report = buildLaunchCriticalActiveSourceCoverageReport({
      generatedAtUtc: "2026-06-07T12:00:00.000Z",
      sourceReferencesByEventName,
      materializerReferencesByEventName,
    });

    expect(report).toMatchObject({
      reportKey: "launch-critical-active-source-coverage",
      familyCount: 13,
      activeSourceFamilyCount: 13,
      activeSourceCoveragePercent: 100,
      targetCoveragePercent: LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT,
      sourceCoverageStatus: "pass",
      canClearHistoricalLaunchProof: false,
      canClearRuntimeGate: false,
      canClearProviderGate: false,
      canClearAdminTruthGate: false,
      policy: {
        catalogMappingRequiredSeparately: true,
        activeSourceScanIsNotRuntimeProof: true,
        historicalRowsStillRequired: true,
        missingIsNotZero: true,
      },
    });
    expect(report.familySourceStates.every((family) => family.countsForActiveSourceCoverage)).toBe(true);
    expect(report.familySourceStates.every((family) => family.productTruthEligibleFromSourceScan === false)).toBe(true);
    expect(report.familySourceStates.every((family) =>
      family.freshnessState === "source_current"
      && family.evidenceKind === "observed"
      && family.sourceTruth !== "source_missing"
      && family.dedupeKey.includes(`launch_recovery|${family.familyId}`)
      && family.dedupeDimensions.join("|") === RECOVERY_METRIC_DEDUPE_DIMENSIONS.join("|")
      && family.lateArrivalWindowDays === ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS
    )).toBe(true);
  });

  it("centralizes compact launch recovery evidence summaries for rebuild dry-runs", () => {
    const firstPartyDay = buildLaunchHistoryDayRecoveryState({
      dayKey: "2026-05-01",
      firstPartyCount: 1,
    });
    const modeledDay = buildLaunchHistoryDayRecoveryState({
      dayKey: "2026-05-02",
      ga4Count: 2,
    });
    const missingFormalDay = buildFormalLaunchHistoryDayRecoveryState({
      dayKey: "2026-05-03",
      localDay: null,
    });

    expect(summarizeLaunchRecoveryDayEvidence([firstPartyDay, modeledDay, missingFormalDay])).toMatchObject({
      dayCount: 3,
      confidenceBandCounts: {
        verified: 1,
        directional: 1,
        missing: 1,
      },
      evidenceKindCounts: {
        observed: 1,
        modeled: 1,
        missing: 1,
      },
      sourceTruthCounts: {
        first_party_event_fact: 1,
        ga4_evidence_only: 1,
        source_missing: 1,
      },
      sourceCountsKnownDayCount: 2,
      lateArrivalWindowDays: ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS,
      missingDaySamples: ["2026-05-03"],
    });

    const familySummary = summarizeLaunchRecoveryFamilySourceStates(
      buildLaunchCriticalRecoveryCoverageReport({
        generatedAtUtc: "2026-06-07T12:00:00.000Z",
        observedEventNames: ["page_viewed"],
      }).familySourceStates,
    );

    expect(familySummary).toMatchObject({
      familyCount: 13,
      confidenceBandCounts: {
        verified: 1,
        missing: 12,
      },
      evidenceKindCounts: {
        observed: 1,
        missing: 12,
      },
      sourceRoleCounts: {
        product_truth: 1,
        missing_source: 12,
      },
      observedFirstPartyFamilySamples: ["page_view"],
    });
    expect(familySummary.missingFirstPartyFamilySamples[0]).toMatchObject({
      confidenceBand: "missing",
      evidenceKind: "missing",
      sourceRole: "missing_source",
      sourceCoverageState: "source_missing",
      mathReason: expect.stringContaining("must not render as zero"),
    });

    const sourceReferencesByEventName = Object.fromEntries(
      LAUNCH_CRITICAL_EVENT_FAMILIES.map((family) => [
        family.canonicalEventNames[0],
        [`src/active/${family.familyId}.ts`],
      ]),
    );
    const activeSourceSummary = summarizeLaunchActiveSourceFamilyStates(
      buildLaunchCriticalActiveSourceCoverageReport({
        generatedAtUtc: "2026-06-07T12:00:00.000Z",
        sourceReferencesByEventName,
      }).familySourceStates,
    );

    expect(activeSourceSummary).toMatchObject({
      familyCount: 13,
      connectedFamilyCount: 13,
      disconnectedFamilySamples: [],
      confidenceBandCounts: {
        verified: 13,
      },
      evidenceKindCounts: {
        observed: 13,
      },
    });
  });

  it("summarizes recovered metric metadata completeness without promoting evidence gates", () => {
    const firstPartyDay = buildLaunchHistoryDayRecoveryState({
      dayKey: "2026-05-01",
      firstPartyCount: 1,
    });
    const activeFamily = buildLaunchCriticalActiveSourceCoverageReport({
      generatedAtUtc: "2026-06-07T12:00:00.000Z",
      sourceReferencesByEventName: {
        page_viewed: ["src/app/page.tsx"],
      },
    }).familySourceStates.find((family) => family.familyId === "page_view");

    expect(summarizeRecoveredMetricMetadataCompleteness([firstPartyDay, activeFamily!])).toMatchObject({
      status: "complete",
      rowCount: 2,
      completeRowCount: 2,
      requiredFields: [...RECOVERED_METRIC_REQUIRED_METADATA_FIELDS],
      expectedLateArrivalWindowDays: ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS,
      missingFieldCounts: {
        sourceTruth: 0,
        freshnessState: 0,
        confidenceScore: 0,
        evidenceKind: 0,
        dedupeKey: 0,
        dedupeDimensions: 0,
        lateArrivalWindowDays: 0,
      },
      missingRowSamples: [],
    });

    const incomplete = summarizeRecoveredMetricMetadataCompleteness([
      {
        familyId: "purchase",
        sourceTruth: "first_party_event_fact",
        freshnessState: "source_current",
        evidenceKind: "observed",
        lateArrivalWindowDays: 10,
      },
    ]);

    expect(incomplete).toMatchObject({
      status: "incomplete",
      rowCount: 1,
      completeRowCount: 0,
      missingFieldCounts: {
        confidenceScore: 1,
        dedupeKey: 1,
        dedupeDimensions: 1,
        lateArrivalWindowDays: 1,
      },
      missingRowSamples: [
        {
          rowKey: "purchase",
          missingFields: ["confidenceScore", "dedupeKey", "dedupeDimensions", "lateArrivalWindowDays"],
        },
      ],
    });
  });

  it("builds recovered launch metric states with source truth, evidence kind, dedupe, and late-arrival metadata", () => {
    const state = buildRecoveredLaunchMetricState({
      eventName: "drop_preview_opened",
      eventId: "event_1",
      sessionId: "session_1",
      identityLinkId: "link_1",
      userId: "user_1",
      route: "/drops/drop_1",
      objectId: "drop_1",
      timestampMs: Date.parse("2026-06-07T00:00:00.000Z"),
      insideLateArrivalWindow: true,
    });

    expect(state).toMatchObject({
      metricKey: "drop_preview",
      sourceTruth: "first_party_event_fact",
      freshnessState: "late_arrival_window",
      evidenceKind: "observed",
      confidenceBand: "verified",
      dedupeDimensions: [...RECOVERY_METRIC_DEDUPE_DIMENSIONS],
      lateArrivalWindowDays: ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS,
      missingVsZeroState: "source_present",
      identityStitching: {
        usesIdentityLink: true,
        countsGlobalOnce: true,
        countsLinkedPersonOnce: true,
        doubleCountingPreventedBy: "event_id",
      },
    });
    expect(state.confidenceScore).toBeGreaterThanOrEqual(95);
    expect(state.dedupeKey).toBe("launch_recovery|drop_preview|event:event_1");
  });

  it("uses event id as the primary dedupe key when present", () => {
    const first = buildLaunchAnalyticsRecoveryDedupeKey({
      semanticAction: "drop_preview",
      eventId: "event_1",
      sessionId: "session_1",
      identityLinkId: "link_1",
      route: "/drops/drop_1",
      objectId: "drop_1",
      timestampMs: 120_000,
      timestampWindowMs: 10_000,
    });
    const retriedWithShiftedMetadata = buildLaunchAnalyticsRecoveryDedupeKey({
      semanticAction: "drop_preview",
      eventId: "event_1",
      sessionId: "session_retry",
      userId: "user_retry",
      route: "/drops/drop_1?retry=1",
      objectId: "drop_retry",
      timestampMs: 180_000,
      timestampWindowMs: 10_000,
    });

    expect(first).toBe("launch_recovery|drop_preview|event:event_1");
    expect(retriedWithShiftedMetadata).toBe(first);
  });

  it("uses deterministic session identity dedupe when event id is absent", () => {
    const first = buildLaunchAnalyticsRecoveryDedupeKey({
      semanticAction: "wallet_open",
      sessionId: "session_1",
      userId: "user_1",
      route: "/wallet",
      timestampMs: 120_000,
      timestampWindowMs: 60_000,
    });
    const replay = buildLaunchAnalyticsRecoveryDedupeKey({
      semanticAction: "wallet_open",
      sessionId: "session_1",
      userId: "user_1",
      route: "/wallet",
      timestampMs: 179_999,
      timestampWindowMs: 60_000,
    });
    const nextWindow = buildLaunchAnalyticsRecoveryDedupeKey({
      semanticAction: "wallet_open",
      sessionId: "session_1",
      userId: "user_1",
      route: "/wallet",
      timestampMs: 180_000,
      timestampWindowMs: 60_000,
    });

    expect(first).toBe(replay);
    expect(nextWindow).not.toBe(first);
    expect(first).toContain("event:no_event_id");
    expect(first).toContain("session:session_1");
    expect(first).toContain("user:user_1");
    expect(first).toContain("route:/wallet");
  });

  it("centralizes identity stitching double-count prevention for recovered metrics", () => {
    expect(buildRecoveryMetricIdentityStitchingState({
      eventId: "event_1",
      identityLinkId: "link_1",
    })).toEqual({
      usesIdentityLink: true,
      countsGlobalOnce: true,
      countsLinkedPersonOnce: true,
      doubleCountingPreventedBy: "event_id",
    });
    expect(buildRecoveryMetricIdentityStitchingState({
      identityLinkId: "link_1",
    })).toEqual({
      usesIdentityLink: true,
      countsGlobalOnce: true,
      countsLinkedPersonOnce: true,
      doubleCountingPreventedBy: "identity_link_id",
    });
    expect(buildRecoveryMetricIdentityStitchingState({})).toEqual({
      usesIdentityLink: false,
      countsGlobalOnce: true,
      countsLinkedPersonOnce: false,
      doubleCountingPreventedBy: "session_semantic_window",
    });
  });

  it("keeps GA4 and missing launch metrics out of product truth and zero rendering", () => {
    const modeled = buildRecoveredLaunchMetricState({
      eventName: "semantic_page_viewed",
      sourceTruth: "ga4_evidence_only",
      sourceObserved: true,
      evidenceKind: "modelled",
      anonymousVisitorId: "pseudo_1",
      sessionId: "ga_session",
      route: "/",
      timestampMs: 120_000,
    });
    const missing = buildRecoveredLaunchMetricState({
      eventName: "creator_drop_submitted",
      sourceTruth: "source_missing",
      sourceObserved: false,
    });

    expect(modeled).toMatchObject({
      evidenceKind: "modeled",
      confidenceBand: "directional",
      freshnessState: "external_evidence_required",
      missingVsZeroState: "source_present",
    });
    expect(modeled.confidenceScore).toBeLessThan(70);
    expect(missing).toMatchObject({
      metricKey: "creator_drop_submit",
      confidenceScore: 0,
      confidenceBand: "missing",
      evidenceKind: "missing",
      freshnessState: "source_missing",
      missingVsZeroState: "source_missing",
    });
    expect(missing.mathReason).toContain("keep it missing rather than rendering zero");
  });

  it("normalizes external modelled spelling into the canonical modeled evidence kind", () => {
    expect(normalizeRecoveryMetricEvidenceKind("modelled")).toBe("modeled");
    expect(normalizeRecoveryMetricEvidenceKind("modeled")).toBe("modeled");
    expect(normalizeRecoveryMetricEvidenceKind("unknown_external_state")).toBe("missing");

    const modeledAlias = buildRecoveredLaunchMetricState({
      eventName: "drop_preview_opened",
      sourceTruth: "ga4_evidence_only",
      sourceObserved: true,
      evidenceKind: "modelled",
    });
    const missingWins = buildRecoveredLaunchMetricState({
      eventName: "drop_preview_opened",
      sourceTruth: "source_missing",
      sourceObserved: false,
      evidenceKind: "modelled",
    });

    expect(modeledAlias.evidenceKind).toBe("modeled");
    expect(modeledAlias.confidenceBand).toBe("directional");
    expect(modeledAlias.sourceTruth).toBe("ga4_evidence_only");
    expect(missingWins.evidenceKind).toBe("missing");
    expect(missingWins.confidenceBand).toBe("missing");
    expect(missingWins.missingVsZeroState).toBe("source_missing");
  });

  it("classifies recovered metric confidence bands from canonical score thresholds", () => {
    expect(RECOVERY_METRIC_CONFIDENCE_BANDS).toEqual(["verified", "strong", "directional", "weak", "missing"]);
    expect(classifyRecoveryMetricConfidenceBand(98)).toBe("verified");
    expect(classifyRecoveryMetricConfidenceBand(82)).toBe("strong");
    expect(classifyRecoveryMetricConfidenceBand(58)).toBe("directional");
    expect(classifyRecoveryMetricConfidenceBand(36)).toBe("weak");
    expect(classifyRecoveryMetricConfidenceBand(0)).toBe("missing");
    expect(classifyRecoveryMetricConfidenceBand(Number.NaN)).toBe("missing");
  });

  it("centralizes day-level launch recovery source state and recovered metric metadata", () => {
    const firstPartyWithGa4 = buildLaunchHistoryDayRecoveryState({
      dayKey: "2026-05-01",
      firstPartyCount: 3,
      ga4Count: 2,
      historicalSnapshotCount: 0,
      legacySupportCount: 0,
      internalAdminExcludedCount: 1,
    });
    const gaOnly = buildLaunchHistoryDayRecoveryState({
      dayKey: "2026-05-02",
      ga4Count: 4,
    });
    const cachedOnly = buildLaunchHistoryDayRecoveryState({
      dayKey: "2026-05-03",
      historicalSnapshotCount: 2,
    });
    const missing = buildLaunchHistoryDayRecoveryState({
      dayKey: "2026-05-04",
    });

    expect(firstPartyWithGa4).toMatchObject({
      recovered: true,
      productTruthRecovered: true,
      sourceTruthState: "mixed_evidence",
      confidence: "verified",
      sourceTruth: "first_party_event_fact",
      freshnessState: "source_current",
      evidenceKind: "observed",
      confidenceScore: 95,
      confidenceBand: "verified",
      internalAdminExcludedCount: 1,
      duplicateSourceCount: 1,
      sourceCounts: {
        first_party: 3,
        ga4: 2,
        historicalSnapshot: 0,
        legacySupport: 0,
      },
    });
    expect(firstPartyWithGa4.dedupeKey).toContain("launch_recovery|page_view");
    expect(firstPartyWithGa4.dedupeKey).toContain("object:2026-05-01");
    expect(firstPartyWithGa4.lateArrivalWindowDays).toBe(12);
    expect(gaOnly).toMatchObject({
      sourceTruthState: "second_source_only",
      productTruthRecovered: false,
      sourceTruth: "ga4_evidence_only",
      freshnessState: "external_evidence_required",
      evidenceKind: "modeled",
      confidenceBand: "directional",
      duplicateSourceCount: 0,
    });
    expect(cachedOnly).toMatchObject({
      sourceTruthState: "fallback_only",
      productTruthRecovered: false,
      sourceTruth: "hot_cache_snapshot",
      freshnessState: "cached",
      evidenceKind: "cached",
      confidenceBand: "strong",
    });
    expect(missing).toMatchObject({
      recovered: false,
      evidenceObserved: false,
      productTruthRecovered: false,
      sourceTruthState: "source_missing",
      confidence: "unknown",
      sourceTruth: "source_missing",
      freshnessState: "source_missing",
      evidenceKind: "missing",
      confidenceScore: 0,
      confidenceBand: "missing",
      duplicateSourceCount: 0,
      sourceCounts: {
        first_party: 0,
        ga4: 0,
        historicalSnapshot: 0,
        legacySupport: 0,
      },
      missingRangesBySource: {
        first_party: ["2026-05-04"],
        ga4: ["2026-05-04"],
        historicalSnapshot: ["2026-05-04"],
        legacySupport: ["2026-05-04"],
      },
    });
    expect(missing.nextAction).toContain("first-party materialization");
  });

  it("centralizes formal launch range day rows without turning unknown source counts into zero", () => {
    const localDay = buildLaunchHistoryDayRecoveryState({
      dayKey: "2026-05-01",
      firstPartyCount: 2,
      ga4Count: 1,
    });
    const localFormalDay = buildFormalLaunchHistoryDayRecoveryState({
      dayKey: "2026-05-01",
      localDay,
    });
    const outsideEvidenceDay = buildFormalLaunchHistoryDayRecoveryState({
      dayKey: "2026-02-12",
    });

    expect(localFormalDay).toMatchObject({
      formalEvidenceState: "local_evidence_window",
      sourceCountsKnown: true,
      sourceCounts: {
        first_party: 2,
        ga4: 1,
      },
      sourceTruth: "first_party_event_fact",
      evidenceKind: "observed",
    });
    expect(outsideEvidenceDay).toMatchObject({
      dayKey: "2026-02-12",
      formalEvidenceState: "outside_evidence_window",
      sourceCountsKnown: false,
      recovered: false,
      evidenceObserved: false,
      productTruthRecovered: false,
      sourceTruthState: "source_missing",
      sourceTruth: "source_missing",
      freshnessState: "source_missing",
      evidenceKind: "missing",
      confidenceScore: 0,
      lateArrivalWindowDays: ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS,
      sourceCounts: {
        first_party: null,
        ga4: null,
        historicalSnapshot: null,
        legacySupport: null,
      },
    });
    expect(outsideEvidenceDay.reason).toContain("unknown, not zero");
    expect(outsideEvidenceDay.dedupeKey).toContain("launch_recovery|page_view");
    expect(outsideEvidenceDay.dedupeKey).toContain("object:2026-02-12");
  });

  it("centralizes formal launch range proof without letting local evidence narrow launch history", () => {
    const firstLocalDay = buildLaunchHistoryDayRecoveryState({
      dayKey: "2026-05-01",
      firstPartyCount: 2,
    });
    const secondLocalDay = buildLaunchHistoryDayRecoveryState({
      dayKey: "2026-05-03",
      ga4Count: 4,
    });

    const missingRange = buildFormalLaunchRangeRecoveryState({
      launchStartDayKey: "2026-05-01",
      generatedAtUtc: "2026-05-04T18:00:00.000Z",
      allLaunchRangeProven: false,
      expectedDayKeys: ["2026-05-01", "2026-05-03"],
      localEvidenceDays: [firstLocalDay, secondLocalDay],
    });

    expect(missingRange).toMatchObject({
      launchStartDayKey: "2026-05-01",
      expectedThroughDayKey: "2026-05-04",
      expectedDayCount: 4,
      localEvidenceDayCount: 2,
      approvedCoverageDayCount: 0,
      localEvidenceRanges: ["2026-05-01", "2026-05-03"],
      unprovenRanges: ["2026-05-01..2026-05-04"],
      state: "formal_proof_missing",
      unprovenDayCount: 2,
    });
    expect(missingRange.dayCoverage).toHaveLength(4);
    expect(missingRange.dayCoverage.find((day) => day.dayKey === "2026-05-02")).toMatchObject({
      formalEvidenceState: "outside_evidence_window",
      sourceCountsKnown: false,
      sourceTruthState: "source_missing",
      sourceCounts: {
        first_party: null,
        ga4: null,
        historicalSnapshot: null,
        legacySupport: null,
      },
    });
    expect(missingRange.dayCoverage.find((day) => day.dayKey === "2026-05-03")).toMatchObject({
      formalEvidenceState: "local_evidence_window",
      sourceCountsKnown: true,
      sourceTruth: "ga4_evidence_only",
      evidenceKind: "modeled",
    });

    const provenLocalDays = ["2026-05-01", "2026-05-02"].map((dayKey) =>
      buildLaunchHistoryDayRecoveryState({ dayKey, firstPartyCount: 1 }),
    );
    const provenRange = buildFormalLaunchRangeRecoveryState({
      launchStartDayKey: "2026-05-01",
      generatedAtUtc: "2026-05-04T18:00:00.000Z",
      allLaunchRangeProven: true,
      expectedDayKeys: provenLocalDays.map((day) => day.dayKey),
      localEvidenceDays: provenLocalDays,
    });

    expect(provenRange).toMatchObject({
      expectedThroughDayKey: "2026-05-02",
      expectedDayCount: 2,
      approvedCoverageDayCount: 2,
      unprovenRanges: [],
      state: "all_launch_range_proven",
      unprovenDayCount: 0,
    });
  });

  it("centralizes launch recovery source-gate reasons without clearing formal proof from local evidence", () => {
    const blocked = buildLaunchRecoverySourceGateState({
      localEvidenceDayCount: 3,
      staleEvidence: false,
      allLaunchRangeProven: false,
      coverageWindowKind: "fixture_only_local_window",
      launchCoverageState: "partial",
      firstPartyCoverageState: "partial",
      launchCriticalSourceCoverageStatus: "blocked",
      launchCriticalObservedFirstPartyCoveragePercent: 0,
      sourceAgreementState: "failed",
    });

    expect(blocked).toMatchObject({
      canClearSourceGate: false,
      sourceGateReason: "The evidence window is not proven to cover the full launch range; attach an all-range historical export or admin truth sample before clearing source truth.",
      allLaunchRangeProofReason: "The source-agreement detail is fixture/local-evidence only, not a formal all-launch proof. Formal all-launch recovery still needs the all-range historical route/admin truth sample or an approved export.",
    });
    expect(blocked.sourceGateBlockers.map((entry) => entry.blocker)).toEqual([
      "all_launch_range_proof_missing",
      "first_party_coverage_incomplete",
      "launch_critical_family_coverage_below_floor",
      "source_agreement_failed",
      "launch_history_coverage_unavailable",
    ]);
    expect(blocked.sourceGateBlockers.every((entry) => entry.reason && entry.nextAction)).toBe(true);

    const stale = buildLaunchRecoverySourceGateState({
      localEvidenceDayCount: 128,
      staleEvidence: true,
      allLaunchRangeProven: true,
      coverageWindowKind: "all_range_historical_export",
      launchCoverageState: "available",
      firstPartyCoverageState: "available",
      launchCriticalSourceCoverageStatus: "pass",
      launchCriticalObservedFirstPartyCoveragePercent: 100,
      sourceAgreementState: "pass",
    });

    expect(stale).toMatchObject({
      canClearSourceGate: false,
      sourceGateReason: "Launch recovery source evidence is stale relative to current HEAD.",
      allLaunchRangeProofReason: "The source-agreement detail includes explicit all-launch range proof from an approved all-range historical export.",
    });
    expect(stale.sourceGateBlockers.map((entry) => entry.blocker)).toEqual(["stale_evidence"]);

    const clear = buildLaunchRecoverySourceGateState({
      localEvidenceDayCount: 128,
      staleEvidence: false,
      allLaunchRangeProven: true,
      coverageWindowKind: "admin_truth_sample",
      launchCoverageState: "available",
      firstPartyCoverageState: "available",
      launchCriticalSourceCoverageStatus: "pass",
      launchCriticalObservedFirstPartyCoveragePercent: 100,
      sourceAgreementState: "pass",
    });

    expect(clear).toMatchObject({
      canClearSourceGate: true,
      sourceGateReason: "First-party coverage is available for the all-launch window, source agreement passed, and evidence is current.",
      allLaunchRangeProofReason: "The source-agreement detail includes explicit all-launch range proof from a formal admin truth sample.",
    });
    expect(clear.sourceGateBlockers).toEqual([]);

    const missingLaunchFamilies = buildLaunchRecoverySourceGateState({
      localEvidenceDayCount: 128,
      staleEvidence: false,
      allLaunchRangeProven: true,
      coverageWindowKind: "all_range_historical_export",
      launchCoverageState: "available",
      firstPartyCoverageState: "available",
      launchCriticalSourceCoverageStatus: "blocked",
      launchCriticalObservedFirstPartyCoveragePercent: 69.2,
      sourceAgreementState: "pass",
    });

    expect(missingLaunchFamilies).toMatchObject({
      canClearSourceGate: false,
      sourceGateReason: `Launch-critical first-party family coverage is 69.2%; source truth needs at least ${LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT}% observed first-party coverage before clearing.`,
    });
    expect(missingLaunchFamilies.sourceGateBlockers).toEqual([
      {
        blocker: "launch_critical_family_coverage_below_floor",
        reason: `Launch-critical first-party family coverage is 69.2%; source truth needs at least ${LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT}% observed first-party coverage before clearing.`,
        nextAction: "Recover or materialize observed first-party evidence for missing launch-critical families before canonical chart promotion.",
      },
    ]);
  });

  it("centralizes launch history range proof payloads for generated reports and server adapters", () => {
    const localDays = ["2026-05-01", "2026-05-02", "2026-05-03"].map((dayKey) =>
      buildLaunchHistoryDayRecoveryState({ dayKey, firstPartyCount: 1 }),
    );
    const formalLaunchRange = buildFormalLaunchRangeRecoveryState({
      launchStartDayKey: "2026-05-01",
      generatedAtUtc: "2026-05-03T12:00:00.000Z",
      allLaunchRangeProven: true,
      expectedDayKeys: localDays.map((day) => day.dayKey),
      localEvidenceDays: localDays,
    });

    expect(buildLaunchHistoryRangeProofState({
      expectedRangeSource: "admin_truth_sample",
      coverageWindowKind: "admin_truth_sample",
      allLaunchRangeProven: true,
      formalLaunchRange,
      reason: "Formal admin truth sample covers launch history.",
    })).toMatchObject({
      expectedRangeSource: "admin_truth_sample",
      coverageWindowKind: "admin_truth_sample",
      allLaunchRangeProven: true,
      formalRangeStartDayKey: "2026-05-01",
      formalRangeEndDayKey: "2026-05-03",
      formalExpectedDayCount: 3,
      evidenceDayCount: 3,
      unprovenRanges: [],
      reason: "Formal admin truth sample covers launch history.",
    });

    const historicalRouteProof = buildAllLaunchHistoricalRouteRangeProofState({
      launchStartDayKey: "2026-05-01",
      generatedAtUtc: "2026-05-03T12:00:00.000Z",
      rawExpectedDayKeys: ["2026-05-01", "2026-05-02", "2026-05-03"],
      expectedDayKeys: ["2026-05-02", "2026-05-03"],
      localEvidenceDays: localDays.slice(1),
      launchStartBoundaryProven: false,
      preLaunchIgnoredDayCount: 1,
      firstRecoveredDayKey: "2026-05-02",
      unionPresentDayCount: 2,
      missingDayCount: 0,
      firstPartyCoverageState: "available",
      sourceAgreementState: "pass",
    });

    expect(historicalRouteProof).toMatchObject({
      allLaunchRangeProven: false,
      rangeProof: {
        expectedRangeSource: "all_range_historical_route",
        coverageWindowKind: "all_range_historical_route",
        allLaunchRangeProven: false,
        formalRangeStartDayKey: "2026-05-01",
        formalRangeEndDayKey: "2026-05-03",
        formalExpectedDayCount: 3,
        evidenceDayCount: 2,
        unprovenRanges: ["2026-05-01..2026-05-03"],
      },
    });
    expect(historicalRouteProof.rangeProof.reason).toContain("first recovered source day (2026-05-02)");
    expect(historicalRouteProof.formalLaunchRange.dayCoverage.find((day) => day.dayKey === "2026-05-01")).toMatchObject({
      formalEvidenceState: "outside_evidence_window",
      sourceCountsKnown: false,
    });
  });

  it("centralizes launch history coverage proof eligibility for source agreement callers", () => {
    const expectedDayKeys = ["2026-02-12", "2026-02-13", "2026-02-14"];

    const approvedExport = buildLaunchHistoryCoverageRangeProofEligibility({
      proofMode: "local_export",
      expectedDayKeys,
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
    });

    expect(approvedExport).toMatchObject({
      coverageWindowKind: "all_range_historical_export",
      proofModeAllowsLaunchRangeProof: true,
      explicitAllLaunchRangeProof: true,
      declaredCountsMatchRows: true,
      allLaunchRangeProven: true,
    });

    const localWindow = buildLaunchHistoryCoverageRangeProofEligibility({
      proofMode: "local_export",
      expectedDayKeys,
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
    });

    expect(localWindow).toMatchObject({
      coverageWindowKind: "local_source_window",
      proofModeAllowsLaunchRangeProof: false,
      explicitAllLaunchRangeProof: true,
      declaredCountsMatchRows: true,
      allLaunchRangeProven: false,
    });

    const mismatchedAdminTruth = buildLaunchHistoryCoverageRangeProofEligibility({
      proofMode: "admin_truth_sample",
      expectedDayKeys,
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
    });

    expect(mismatchedAdminTruth).toMatchObject({
      coverageWindowKind: "admin_truth_sample",
      proofModeAllowsLaunchRangeProof: true,
      explicitAllLaunchRangeProof: true,
      declaredCountsMatchRows: false,
      allLaunchRangeProven: false,
    });
  });

  it("normalizes launch range proof aliases in the recovery spine", () => {
    expect(normalizeLaunchHistoryRangeProofKind("caller_supplied_expected_days")).toBe("local_source_window");
    expect(normalizeLaunchHistoryRangeProofKind("fixture_window")).toBe("local_source_window");
    expect(normalizeLaunchHistoryRangeProofKind("approved_all_launch_export")).toBe("all_range_historical_export");
    expect(normalizeLaunchHistoryRangeProofKind("all_range_historical_route")).toBe("all_range_historical_route");
    expect(normalizeLaunchHistoryRangeProofKind("unexpected_source")).toBe("unknown");
  });

  it("builds launch day recovery rows from source-day sets in the recovery spine", () => {
    const rows = buildLaunchHistoryDayRecoveryStatesFromSources({
      expectedDayKeys: ["2026-05-01", "2026-05-02", "2026-05-03"],
      firstPartyDayKeys: ["2026-05-01"],
      ga4DayKeys: ["2026-05-01", "2026-05-02"],
      historicalSnapshotDayKeys: ["2026-05-03"],
      sourceCountsByDay: {
        "2026-05-01": { first_party: 3, ga4: 4 },
      },
      internalAdminExcludedCountByDay: {
        "2026-05-01": 2,
      },
    });

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      dayKey: "2026-05-01",
      sourceTruthState: "mixed_evidence",
      sourceCounts: { first_party: 3, ga4: 4 },
      internalAdminExcludedCount: 2,
    });
    expect(rows[1]).toMatchObject({
      dayKey: "2026-05-02",
      sourceTruthState: "second_source_only",
      sourceTruth: "ga4_evidence_only",
      evidenceKind: "modeled",
    });
    expect(rows[2]).toMatchObject({
      dayKey: "2026-05-03",
      sourceTruthState: "fallback_only",
      sourceTruth: "hot_cache_snapshot",
      evidenceKind: "cached",
    });
  });

  it("centralizes launch history coverage state without letting second-source evidence promote product truth", () => {
    const firstPartyDay = buildLaunchHistoryDayRecoveryState({
      dayKey: "2026-05-01",
      firstPartyCount: 3,
    });
    const gaOnlyDay = buildLaunchHistoryDayRecoveryState({
      dayKey: "2026-05-02",
      ga4Count: 7,
    });
    const cachedOnlyDay = buildLaunchHistoryDayRecoveryState({
      dayKey: "2026-05-03",
      historicalSnapshotCount: 2,
    });

    const partial = buildLaunchHistoryCoverageSummaryState({
      expectedDayKeys: ["2026-05-01", "2026-05-02", "2026-05-03"],
      dayCoverage: [firstPartyDay, gaOnlyDay, cachedOnlyDay],
      firstPartyMissingDayKeys: ["2026-05-02", "2026-05-03"],
      sourceMissingDayKeys: [],
      staleEvidence: false,
      sourceAgreementState: "pass",
    });

    expect(partial).toMatchObject({
      firstRecoveredDayKey: "2026-05-01",
      lastRecoveredDayKey: "2026-05-03",
      recoveredDayCount: 3,
      evidenceObservedDayCount: 3,
      productTruthRecoveredDayCount: 1,
      secondSourceOnlyDayCount: 1,
      fallbackOnlyDayCount: 1,
      firstPartyCoverage: {
        state: "partial",
        canPromoteProductTruth: false,
      },
      launchCoverage: {
        state: "partial",
      },
    });
    expect(partial.firstPartyCoverage.reason).toContain("GA4/fallback evidence cannot replace");

    const sourceMissing = buildLaunchHistoryCoverageSummaryState({
      expectedDayKeys: ["2026-05-04"],
      dayCoverage: [
        buildLaunchHistoryDayRecoveryState({
          dayKey: "2026-05-04",
        }),
      ],
      firstPartyMissingDayKeys: ["2026-05-04"],
      sourceMissingDayKeys: ["2026-05-04"],
      staleEvidence: false,
      sourceAgreementState: "not_enough_sources",
    });

    expect(sourceMissing).toMatchObject({
      firstRecoveredDayKey: null,
      lastRecoveredDayKey: null,
      recoveredDayCount: 0,
      firstPartyCoverage: {
        state: "source_missing",
        canPromoteProductTruth: false,
      },
      launchCoverage: {
        state: "source_missing",
      },
    });
    expect(sourceMissing.launchCoverage.reason).toContain("No launch-history source evidence");

    const clear = buildLaunchHistoryCoverageSummaryState({
      expectedDayKeys: ["2026-05-01", "2026-05-02"],
      dayCoverage: [
        buildLaunchHistoryDayRecoveryState({ dayKey: "2026-05-01", firstPartyCount: 1 }),
        buildLaunchHistoryDayRecoveryState({ dayKey: "2026-05-02", firstPartyCount: 1 }),
      ],
      firstPartyMissingDayKeys: [],
      sourceMissingDayKeys: [],
      staleEvidence: false,
      sourceAgreementState: "pass",
    });

    expect(clear).toMatchObject({
      firstPartyCoverage: {
        state: "available",
        canPromoteProductTruth: true,
      },
      launchCoverage: {
        state: "available",
        reason: "Every expected launch day is first-party backed and source agreement passed; source agreement still controls when charts can be treated as canonical.",
      },
    });
  });

  it("centralizes launch history source day coverage without treating missing source days as zero", () => {
    const coverage = buildLaunchHistorySourceDayCoverageState({
      expectedDayKeys: ["2026-02-12", "2026-02-13", "2026-02-14"],
      firstPartyDayKeys: ["2026-02-12", "2026-02-99"],
      ga4DayKeys: ["2026-02-12", "2026-02-13"],
      historicalSnapshotDayKeys: [],
      legacySupportDayKeys: ["2026-02-14"],
    });

    expect(coverage).toMatchObject({
      expectedDayKeys: ["2026-02-12", "2026-02-13", "2026-02-14"],
      sourceDayCounts: {
        firstParty: 1,
        first_party: 1,
        ga4: 2,
        historicalSnapshot: 0,
        legacySupport: 1,
      },
      missingDaysBySource: {
        first_party: ["2026-02-13", "2026-02-14"],
        ga4: ["2026-02-14"],
        historical_snapshot: ["2026-02-12", "2026-02-13", "2026-02-14"],
        legacy_support: ["2026-02-12", "2026-02-13"],
      },
      firstPartyMissingDayKeys: ["2026-02-13", "2026-02-14"],
      sourceMissingDayKeys: [],
    });
  });

  it("centralizes launch source coverage rows for report and server callers", () => {
    const inferred = buildLaunchHistorySourceCoverageRowsState({
      firstPartyDayKeys: ["2026-02-12"],
      ga4DayKeys: ["2026-02-12", "2026-02-13"],
      historicalSnapshotDayKeys: ["2026-02-99"],
      legacySupportDayKeys: ["2026-02-14"],
      sourceCountsByDay: {
        "2026-02-12": { first_party: 4, ga4: 2 },
        "2026-02-13": { ga4: 1 },
        "2026-02-14": { legacySupport: 1 },
      },
    });

    expect(inferred.expectedDayKeys).toEqual(["2026-02-12", "2026-02-13", "2026-02-14", "2026-02-99"]);
    expect(inferred.sourceDayCounts).toMatchObject({
      firstParty: 1,
      first_party: 1,
      ga4: 2,
      historicalSnapshot: 1,
      legacySupport: 1,
    });
    expect(inferred.firstPartyMissingDayKeys).toEqual(["2026-02-13", "2026-02-14", "2026-02-99"]);
    expect(inferred.sourceMissingDayKeys).toEqual([]);
    expect(inferred.duplicateDayKeys).toEqual(["2026-02-12"]);
    expect(inferred.dayCoverage.find((day) => day.dayKey === "2026-02-12")).toMatchObject({
      sourceCounts: {
        first_party: 4,
        ga4: 2,
      },
      duplicateSourceCount: 1,
      sourceTruth: "first_party_event_fact",
      evidenceKind: "observed",
    });

    const bounded = buildLaunchHistorySourceCoverageRowsState({
      expectedDayKeys: ["2026-02-12", "2026-02-13"],
      firstPartyDayKeys: ["2026-02-12"],
      ga4DayKeys: ["2026-02-99"],
      legacySupportDayKeys: ["2026-02-13"],
      sourceCountsByDay: {
        "2026-02-99": { ga4: 10 },
      },
    });

    expect(bounded.expectedDayKeys).toEqual(["2026-02-12", "2026-02-13"]);
    expect(bounded.sourceDayCounts.ga4).toBe(0);
    expect(bounded.sourceMissingDayKeys).toEqual([]);
    expect(bounded.dayCoverage.map((day) => day.dayKey)).toEqual(["2026-02-12", "2026-02-13"]);
  });

  it("centralizes launch recovery display summaries without turning missing product truth into zero", () => {
    expect(summarizeLaunchRecoveryConfidenceBands(["verified", "strong"])).toBe("strong");
    expect(summarizeLaunchRecoveryConfidenceBands(["verified", "directional", "strong"])).toBe("directional");
    expect(summarizeLaunchRecoveryConfidenceBands(["verified", "weak"])).toBe("weak");
    expect(summarizeLaunchRecoveryConfidenceBands(["missing", null, undefined])).toBe("unknown");

    expect(buildLaunchHistoryDisplaySummaryState({
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
        days: [
          { confidenceBand: "directional" },
          { confidenceBand: "directional" },
          { confidenceBand: "directional" },
        ],
      },
    })).toMatchObject({
      sourceLabel: "GA4",
      confidenceLabel: "directional",
      coverageLabel: "Product-truth source missing for launch days (evidence window 3) - evidence present 3/3 days",
      coverageDenominatorKind: "formal_launch_range",
      missingRangeCount: 1,
      sourceAgreementState: "review",
    });

    expect(buildLaunchHistoryDisplaySummaryState({
      sourceAgreementState: "pass",
      launchHistoryCoverage: {
        expectedDayCount: 11,
        recoveredDayCount: 11,
        evidenceObservedDayCount: 11,
        productTruthRecoveredDayCount: 11,
        state: "available",
        sourceDayCounts: {
          firstParty: 11,
          ga4: 0,
          historicalSnapshot: 0,
          legacySupport: 0,
        },
        firstPartyCoverage: {
          state: "available",
          coveredDayCount: 11,
          missingRanges: [],
        },
        rangeProof: {
          allLaunchRangeProven: true,
          formalExpectedDayCount: 11,
          evidenceDayCount: 11,
          coverageWindowKind: "approved_all_range",
        },
        eventFamilyCoverage: {
          familySourceStates: buildLaunchCriticalRecoveryCoverageReport({
            generatedAtUtc: "2026-06-07T12:00:00.000Z",
            observedEventNames: ["page_viewed"],
          }).familySourceStates,
        },
        days: [
          { confidenceBand: "verified" },
          { confidenceBand: "strong" },
        ],
      },
    })).toMatchObject({
      sourceLabel: "First-party",
      confidenceLabel: "strong",
      coverageLabel: "11/11 product-truth launch days",
      coverageDenominatorKind: "approved_launch_range",
      missingRangeCount: 0,
      sourceAgreementState: "pass",
      sourceRoleCounts: {
        product_truth: 1,
        missing_source: 12,
      },
    });
    const displaySummary = buildLaunchHistoryDisplaySummaryState({
      sourceAgreementState: "pass",
      launchHistoryCoverage: {
        expectedDayCount: 11,
        recoveredDayCount: 11,
        evidenceObservedDayCount: 11,
        productTruthRecoveredDayCount: 11,
        state: "available",
        eventFamilyCoverage: {
          familySourceStates: buildLaunchCriticalRecoveryCoverageReport({
            generatedAtUtc: "2026-06-07T12:00:00.000Z",
            observedEventNames: ["page_viewed"],
          }).familySourceStates,
        },
      },
    });
    expect(displaySummary.mathReasonSamples?.[0]).toMatchObject({
      sourceRole: "missing_source",
      mathReason: expect.stringContaining("must not render as zero"),
    });

    expect(buildLaunchHistoryDisplaySummaryState({
      sourceAgreementState: "review",
      launchHistoryCoverage: {
        expectedDayCount: 3,
        recoveredDayCount: 3,
        evidenceObservedDayCount: 3,
        productTruthRecoveredDayCount: 3,
        state: "available",
        sourceDayCounts: {
          firstParty: 3,
          ga4: 3,
          historicalSnapshot: 0,
          legacySupport: 0,
        },
        firstPartyCoverage: {
          state: "available",
          coveredDayCount: 3,
          missingRanges: [],
        },
        rangeProof: {
          allLaunchRangeProven: false,
          formalExpectedDayCount: 83,
          evidenceDayCount: 3,
          coverageWindowKind: "all_range_historical_route",
        },
        days: [
          { confidenceBand: "verified" },
          { confidenceBand: "verified" },
          { confidenceBand: "verified" },
        ],
      },
    })).toMatchObject({
      sourceLabel: "Mixed",
      confidenceLabel: "verified",
      coverageLabel: "3/83 product-truth launch days (evidence window 3)",
      coverageDenominatorKind: "formal_launch_range",
      sourceAgreementState: "review",
    });
  });

  it("summarizes launch-critical recovery coverage without treating missing as zero", () => {
    const report = buildLaunchCriticalRecoveryCoverageReport({
      generatedAtUtc: "2026-06-07T12:00:00.000Z",
      observedEventNames: LAUNCH_CRITICAL_EVENT_FAMILIES.map((family) => family.canonicalEventNames[0] ?? family.familyId),
    });

    expect(report).toMatchObject({
      reportKey: "launch-critical-analytics-recovery-coverage",
      lateArrivalWindowDays: 12,
      targetCoveragePercent: LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT,
      familyCount: 13,
      canonicalMappedFamilyCount: 13,
      canonicalMappingCoveragePercent: 100,
      mappedFamilyCount: 13,
      coveragePercent: 100,
      observedFirstPartyFamilyCount: 13,
      observedFirstPartyCoveragePercent: 100,
      sourceCoverageStatus: "pass",
      missingFamilies: [],
      holdbackValidation: {
        observedFirstPartyRequired: true,
        modeledOrInferredCanCalibrateOnly: true,
        minObservedFirstPartyCoveragePercent: LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT,
        status: "pass",
      },
      dedupeRules: RECOVERY_METRIC_DEDUPE_RULES,
      productTruthPolicy: RECOVERY_METRIC_PRODUCT_TRUTH_POLICY,
      modelingPolicy: RECOVERY_METRIC_MODELING_POLICY,
    });
    expect(report.modelingPolicy).toMatchObject({
      canonicalModeledSpelling: "modeled",
      acceptsBritishModelledAlias: true,
      modeledEvidenceCanCalibrateOnly: true,
      observedFirstPartyHoldbackRequired: true,
      consentModeLikeSignalsAreEvidenceOnly: true,
      lateArrivalWindowDays: ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS,
      visibilityMinimumVisiblePercent: 50,
      visibilityMinimumVisibleMs: 1_000,
      productTruthRequiresFirstPartyOrLedgerCorroboration: true,
    });
    expect(report.dedupeRules).toMatchObject({
      includesObjectId: true,
      eventIdIsPrimaryWhenPresent: true,
      identityLinkPrecedesUserOrGuestWhenPresent: true,
      fallbackUsesSessionIdentityRouteObjectAndTimestampWindow: true,
    });
    expect(report.sourceTruthStates).toEqual([...RECOVERY_METRIC_SOURCE_TRUTHS]);
    expect(report.evidenceKinds).toEqual([...RECOVERY_METRIC_EVIDENCE_KINDS]);
    expect(report.confidenceBands).toEqual([...RECOVERY_METRIC_CONFIDENCE_BANDS]);
    expect(report.freshnessStates).toEqual([...RECOVERY_METRIC_FRESHNESS_STATES]);
    expect(report.familySourceStates.every((family) => family.observedFirstParty)).toBe(true);
    expect(report.familySourceStates.every((family) => family.confidenceBand === "verified")).toBe(true);
    expect(report.familySourceStates.every((family) => family.sourceRole === "product_truth")).toBe(true);
    expect(report.familySourceStates.every((family) =>
      family.proofBoundary.externalEvidenceCanClearProductTruth === false
      && family.proofBoundary.missingCanRenderAsZero === false
      && typeof family.proofBoundary.recoveryBoundary === "string"
      && family.proofBoundary.recoveryBoundary.length > 0
    )).toBe(true);
    expect(report.familySourceStates.find((family) => family.familyId === "purchase")?.proofBoundary).toMatchObject({
      productTruthSource: "server_ledger",
      sourceRole: "ledger_protected_truth",
      requiresLedgerCorroboration: true,
    });
    expect(report.familySourceStates.find((family) => family.familyId === "watch_end")?.proofBoundary).toMatchObject({
      productTruthSource: "watch_session_rollup",
      sourceRole: "watch_session_truth",
      requiresWatchSessionRollup: true,
    });
    expect(report.familySourceStates.find((family) => family.familyId === "admin_review")?.proofBoundary).toMatchObject({
      productTruthSource: "admin_action_fact",
      sourceRole: "admin_audit_truth",
      requiresAdminAuditFact: true,
    });
    expect(report.familySourceStates.every((family) => family.mathReason.includes("observed product-truth evidence"))).toBe(true);
    expect(report.familySourceStates.every((family) => family.productTruthEligible)).toBe(true);
    expect(report.familySourceStates.every((family) =>
      family.sourceTruth === family.strongestSourceTruth
      && family.evidenceKind === family.strongestEvidenceKind
      && family.freshnessState === "source_current"
      && family.dedupeKey.includes(`launch_recovery|${family.familyId}`)
      && family.dedupeDimensions.join("|") === RECOVERY_METRIC_DEDUPE_DIMENSIONS.join("|")
      && family.lateArrivalWindowDays === ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS
    )).toBe(true);
  });

  it("keeps modeled GA evidence from clearing first-party launch source coverage", () => {
    const modeledMetrics = LAUNCH_CRITICAL_EVENT_FAMILIES.map((family) => buildRecoveredLaunchMetricState({
      eventName: family.canonicalEventNames[0] ?? family.familyId,
      sourceTruth: "ga4_evidence_only",
      sourceObserved: true,
      sessionId: `ga4_${family.familyId}`,
      anonymousVisitorId: "ga4_pseudo",
      route: `/${family.familyId}`,
      timestampMs: Date.parse("2026-06-07T00:00:00.000Z"),
    }));
    const report = buildLaunchCriticalRecoveryCoverageReport({
      generatedAtUtc: "2026-06-07T12:00:00.000Z",
      observedEventNames: [],
      recoveredMetrics: modeledMetrics,
    });

    expect(report.canonicalMappingCoveragePercent).toBe(100);
    expect(report.observedFirstPartyFamilyCount).toBe(0);
    expect(report.observedFirstPartyCoveragePercent).toBe(0);
    expect(report.sourceCoverageStatus).toBe("blocked");
    expect(report.holdbackValidation.status).toBe("blocked");
    expect(report.holdbackValidation.reason).toContain(`cannot clear the ${LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT}% first-party recovery calibration floor`);
    expect(report.familySourceStates.every((family) => family.sourceCoverageState === "modeled_second_source")).toBe(true);
    expect(report.familySourceStates.every((family) => family.sourceRole === "calibration_only")).toBe(true);
    expect(report.familySourceStates.every((family) => family.mathReason.includes("calibration evidence only"))).toBe(true);
    expect(report.familySourceStates.every((family) => family.confidenceBand === "directional")).toBe(true);
    expect(report.familySourceStates.every((family) => family.productTruthEligible === false)).toBe(true);
    expect(report.familySourceStates.every((family) =>
      family.sourceTruth === "ga4_evidence_only"
      && family.evidenceKind === "modeled"
      && family.freshnessState === "external_evidence_required"
      && family.dedupeKey.includes(`launch_recovery|${family.familyId}`)
      && family.dedupeDimensions.join("|") === RECOVERY_METRIC_DEDUPE_DIMENSIONS.join("|")
      && family.lateArrivalWindowDays === ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS
    )).toBe(true);
  });

  it("keeps first-party source evidence ahead of modeled corroboration for a launch family", () => {
    const report = buildLaunchCriticalRecoveryCoverageReport({
      generatedAtUtc: "2026-06-07T12:00:00.000Z",
      observedEventNames: ["semantic_page_viewed"],
      recoveredMetrics: [
        buildRecoveredLaunchMetricState({
          eventName: "semantic_page_viewed",
          sourceTruth: "ga4_evidence_only",
          sourceObserved: true,
          anonymousVisitorId: "ga4_pseudo",
          sessionId: "ga4_session",
          route: "/",
          timestampMs: Date.parse("2026-06-07T00:00:00.000Z"),
        }),
      ],
    });

    expect(report.familySourceStates.find((family) => family.familyId === "page_view")).toMatchObject({
      observedFirstParty: true,
      strongestSourceTruth: "first_party_event_fact",
      strongestEvidenceKind: "observed",
      confidenceBand: "verified",
      sourceRole: "product_truth",
      sourceCoverageState: "observed_first_party",
      mathReason: expect.stringContaining("observed product-truth evidence"),
      productTruthEligible: true,
    });
  });

  it("centralizes first-party source evidence counts for launch-critical family coverage", () => {
    const observedNames = buildLaunchCriticalObservedEventNamesFromSourceEvidence({
      canonicalEventCounts: {
        semantic_page_viewed: 12,
        wallet_opened: 3,
        creator_drop_submitted: 1,
      },
      telemetryEventCounts: {
        drop_preview_cta_clicked: 2,
      },
    });
    const recoveredMetrics = buildLaunchCriticalRecoveredMetricsFromSourceEvidence({
      firstPartyPurchaseCount: 2,
      firstPartyUnlockCount: 4,
      viewerSessionFactCount: 5,
      watchSessionCount: 5,
      watchCaptureFullCount: 4,
    });
    const report = buildLaunchCriticalRecoveryCoverageReport({
      observedEventNames: observedNames,
      recoveredMetrics,
    });

    expect(observedNames).toEqual(expect.arrayContaining([
      "semantic_page_viewed",
      "wallet_opened",
      "creator_drop_submitted",
      "drop_preview_cta_clicked",
    ]));
    expect(recoveredMetrics.map((metric) => metric.metricKey)).toEqual(expect.arrayContaining([
      "purchase",
      "unlock",
      "viewer_open",
      "watch_start",
      "watch_end",
    ]));
    expect(report.observedFirstPartyFamilyCount).toBe(9);
    expect(report.sourceCoverageStatus).toBe("blocked");
    expect(report.familySourceStates.find((family) => family.familyId === "purchase")).toMatchObject({
      strongestSourceTruth: "server_ledger",
      sourceCoverageState: "observed_first_party",
      productTruthEligible: true,
    });
  });

  it("combines launch day rows and source evidence through one coverage helper", () => {
    const report = buildLaunchCriticalRecoveryCoverageFromEvidence({
      generatedAtUtc: "2026-06-07T12:00:00.000Z",
      launchHistoryDays: [
        buildLaunchHistoryDayRecoveryState({
          dayKey: "2026-05-01",
          firstPartyCount: 2,
          ga4Count: 1,
        }),
        buildLaunchHistoryDayRecoveryState({
          dayKey: "2026-05-02",
          historicalSnapshotCount: 1,
        }),
      ],
      sourceEvidence: {
        canonicalEventCounts: {
          creator_followed: 3,
        },
        telemetryEventCounts: {
          drop_preview_cta_clicked: 1,
        },
        firstPartyPurchaseCount: 1,
      },
    });

    expect(report.familySourceStates.find((family) => family.familyId === "page_view")).toMatchObject({
      observedFirstParty: true,
      strongestEvidenceKind: "observed",
      productTruthEligible: true,
    });
    expect(report.familySourceStates.find((family) => family.familyId === "creator_follow")).toMatchObject({
      observedFirstParty: true,
      strongestEvidenceKind: "observed",
    });
    expect(report.familySourceStates.find((family) => family.familyId === "cta")).toMatchObject({
      observedFirstParty: true,
      strongestEvidenceKind: "observed",
    });
    expect(report.familySourceStates.find((family) => family.familyId === "purchase")).toMatchObject({
      observedFirstParty: true,
      strongestSourceTruth: "server_ledger",
    });
    expect(report.familySourceStates.find((family) => family.familyId === "auth_signup")).toMatchObject({
      observedFirstParty: false,
      sourceCoverageState: "source_missing",
      productTruthEligible: false,
    });
  });

  it("rejects GA4 commerce evidence as product truth without ledger corroboration", () => {
    const entry = buildRecoveryTimelineEntryFromGa4Event({
      ga4EventName: "purchase",
      ga4EventId: "ga4_purchase_1",
      occurredAt: "2026-06-07T00:00:00.000Z",
      transactionId: "txn_from_ga4",
    });

    expect(entry.productDomain).toBe("wallet_payment");
    expect(entry.classification).toBe("rejected");
    expect(entry.recoveryEligibility).toBe("rejected");
    expect(validateRecoveryTimelineEntries([entry]).ok).toBe(true);
  });

  it("allows ledger-backed payment entries to be product-truth eligible", () => {
    const event = createCanonicalAnalyticsEvent({
      eventId: "transaction:purchase",
      eventName: "gumdrops_purchase_completed",
      occurredAt: "2026-06-07T00:00:00.000Z",
      receivedAt: "2026-06-07T00:00:01.000Z",
      actorType: "user",
      userId: "user_1",
      source: "server",
      consentState: "not_required",
      objectType: "purchase",
      objectId: "txn_1",
    });

    const entry = buildRecoveryTimelineEntryFromCanonicalEvent(event, {
      source: "transaction_ledger",
      sourceRecordId: "txn_1",
      corroboration: {
        transactionId: "txn_1",
        gumdropLedgerId: "ledger_1",
        sourceCount: 2,
        treasuryLedgerCorroborated: true,
      },
    });

    expect(entry.recoveryEligibility).toBe("product_truth_eligible");
    expect(validateRecoveryTimelineEntries([entry]).ok).toBe(true);
  });

  it("blocks legacy evidence from directly overwriting product truth", () => {
    const event = createCanonicalAnalyticsEvent({
      eventId: "legacy:support",
      eventName: "support_ticket_created",
      occurredAt: "2026-06-07T00:00:00.000Z",
      receivedAt: "2026-06-07T00:00:00.000Z",
      actorType: "guest",
      anonymousVisitorId: "anon_1",
      source: "legacy_firestore",
      consentState: "unknown",
      objectType: "system",
      objectId: "support_1",
      legacySource: "legacy_support",
      legacyId: "support_1",
      legacyConfidence: "low",
      mappingWarnings: ["legacy support row only"],
    });

    const entry = buildRecoveryTimelineEntryFromCanonicalEvent(event, {
      source: "legacy_analytics",
      sourceRecordId: "support_1",
    });

    expect(entry.classification).toBe("weak_match");
    expect(entry.recoveryEligibility).toBe("manual_review_required");
    expect(entry.evidenceLabels).toContain("legacy_directional_only");
    expect(validateRecoveryTimelineEntries([entry]).ok).toBe(true);
  });

  it("reconciles recovery timeline entries against first-party event facts as primary truth", () => {
    const firstPartyTimeline = buildRecoveryTimelineEntryFromCanonicalEvent(createCanonicalAnalyticsEvent({
      eventId: "event_fact:drop-clicked",
      eventName: "drop_clicked",
      occurredAt: "2026-06-07T00:00:00.000Z",
      receivedAt: "2026-06-07T00:00:01.000Z",
      actorType: "user",
      userId: "user_1",
      sessionId: "session_1",
      source: "server",
      consentState: "not_required",
      objectType: "drop",
      objectId: "drop_1",
    }));
    const ga4Only = buildRecoveryTimelineEntryFromGa4Event({
      ga4EventName: "page_view",
      ga4EventId: "ga4_page_only",
      occurredAt: "2026-06-07T00:05:00.000Z",
      userPseudoId: "anon_1",
      sessionId: "session_ga4",
      pagePath: "/drops",
    });
    const unknownLegacy = buildRecoveryTimelineEntryFromCanonicalEvent(createCanonicalAnalyticsEvent({
      eventId: "legacy:unknown-actor",
      eventName: "notification_read",
      occurredAt: "2026-06-07T00:07:00.000Z",
      receivedAt: "2026-06-07T00:07:00.000Z",
      actorType: "unknown",
      source: "legacy_firestore",
      consentState: "unknown",
      objectType: "notification",
      objectId: "notification_1",
      legacySource: "notifications",
      legacyId: "notification_1",
      legacyConfidence: "unknown",
      mappingWarnings: ["Actor lane could not be recovered."],
    }), {
      source: "unknown_legacy",
      sourceRecordId: "notification_1",
    });

    const report = reconcileAnalyticsEventFactsWithRecoveryTimeline({
      generatedAtUtc: "2026-06-07T12:00:00.000Z",
      firstPartyEventFacts: [{
        eventId: "event_fact:drop-clicked",
        eventName: "drop_clicked",
        timestamp: Date.parse("2026-06-07T00:00:00.000Z"),
        userId: "user_1",
        sessionId: "session_1",
        dropId: "drop_1",
      }],
      timelineEntries: [firstPartyTimeline, ga4Only, unknownLegacy],
    });

    expect(report.reportKey).toBe("analytics-event-facts-recovery-reconciliation");
    expect(report.summary).toMatchObject({
      firstPartyFactCount: 1,
      timelineEntryCount: 3,
      firstPartyPresent: 1,
      ga4Only: 1,
      identityMissing: 1,
      productTruthEligible: 1,
    });
    expect(report.productTruthPolicy).toMatchObject({
      firstPartyEventFactsPrimary: true,
      legacyCanOnlyCorroborate: true,
      ga4CanOnlyCorroborate: true,
      duplicateEventsNotImported: true,
      missingWindowNotZero: true,
    });
  });

  it("classifies duplicate actor/session/action windows and timestamp conflicts without importing duplicates", () => {
    const duplicateTimeline = buildRecoveryTimelineEntryFromCanonicalEvent(createCanonicalAnalyticsEvent({
      eventId: "event_fact:duplicate-a",
      eventName: "drop_clicked",
      occurredAt: "2026-06-07T00:00:00.000Z",
      receivedAt: "2026-06-07T00:00:01.000Z",
      actorType: "user",
      userId: "user_1",
      sessionId: "session_1",
      source: "server",
      consentState: "not_required",
      objectType: "drop",
      objectId: "drop_1",
    }), {
      classification: "duplicate_candidate",
    });
    const conflictedTimeline = buildRecoveryTimelineEntryFromCanonicalEvent(createCanonicalAnalyticsEvent({
      eventId: "legacy:conflicted",
      eventName: "drop_clicked",
      occurredAt: "2026-06-07T00:03:00.000Z",
      receivedAt: "2026-06-07T00:03:00.000Z",
      actorType: "user",
      userId: "user_2",
      sessionId: "session_2",
      source: "legacy_firestore",
      consentState: "unknown",
      objectType: "drop",
      objectId: "drop_2",
      legacySource: "legacy_clicks",
      legacyId: "legacy_conflict",
      legacyConfidence: "medium",
      mappingWarnings: [],
    }), {
      source: "legacy_analytics",
      sourceRecordId: "legacy_conflict",
    });

    const report = reconcileAnalyticsEventFactsWithRecoveryTimeline({
      generatedAtUtc: "2026-06-07T12:00:00.000Z",
      firstPartyEventFacts: [
        {
          eventId: "event_fact:duplicate-a",
          eventName: "drop_clicked",
          timestamp: Date.parse("2026-06-07T00:00:00.000Z"),
          userId: "user_1",
          sessionId: "session_1",
          dropId: "drop_1",
        },
        {
          eventId: "event_fact:duplicate-b",
          eventName: "drop_clicked",
          timestamp: Date.parse("2026-06-07T00:00:20.000Z"),
          userId: "user_1",
          sessionId: "session_1",
          dropId: "drop_1",
        },
        {
          eventId: "event_fact:conflict-source",
          eventName: "drop_clicked",
          timestamp: Date.parse("2026-06-07T00:00:00.000Z"),
          userId: "user_2",
          sessionId: "session_2",
          dropId: "drop_2",
        },
      ],
      timelineEntries: [duplicateTimeline, conflictedTimeline],
    });

    expect(report.summary.duplicateCandidate).toBe(2);
    expect(report.summary.timestampConflict).toBe(1);
    expect(report.matches.find((entry) => entry.timelineId === duplicateTimeline.timelineId)).toMatchObject({
      gapClassification: "duplicate_candidate",
      duplicateCandidate: true,
      productTruthEligible: false,
    });
    expect(report.matches.find((entry) => entry.timelineId === conflictedTimeline.timelineId)).toMatchObject({
      gapClassification: "timestamp_conflict",
      productTruthEligible: false,
    });
  });

  it("reconciles GumDrop treasury ledger events with analytics evidence without creating money truth", () => {
    const purchaseEvidence = buildRecoveryTimelineEntryFromCanonicalEvent(createCanonicalAnalyticsEvent({
      eventId: "event_fact:purchase",
      eventName: "gumdrops_purchase_completed",
      occurredAt: "2026-06-07T00:00:00.000Z",
      receivedAt: "2026-06-07T00:00:01.000Z",
      actorType: "user",
      userId: "user_1",
      sessionId: "session_1",
      source: "server",
      consentState: "not_required",
      objectType: "purchase",
      objectId: "txn_1",
    }), {
      source: "first_party_event_fact",
      corroboration: {
        transactionId: "txn_1",
        eventFactId: "event_fact:purchase",
        sourceCount: 1,
        treasuryLedgerCorroborated: false,
      },
    });
    const ga4PurchaseOnly = buildRecoveryTimelineEntryFromGa4Event({
      ga4EventName: "purchase",
      ga4EventId: "ga4_purchase_only",
      occurredAt: "2026-06-07T00:02:00.000Z",
      userPseudoId: "anon_1",
      sessionId: "session_ga4",
      transactionId: "txn_missing",
    });

    const report = reconcileTreasuryEventsWithRecoveryTimeline({
      generatedAtUtc: "2026-06-07T12:00:00.000Z",
      ledgerEvents: [
        {
          ledgerId: "ledger_purchase_1",
          transactionId: "txn_1",
          eventType: "purchase",
          eventName: "gumdrops_purchase_completed",
          occurredAt: "2026-06-07T00:00:00.000Z",
          actor: { userId: "user_1", sessionId: "session_1" },
          amountGd: 550,
          sourceBucket: "paid_gd",
          direction: "credit",
          sourceTruth: "server_transaction",
        },
        {
          ledgerId: "ledger_reward_1",
          eventType: "reward",
          eventName: "daily_reward_claimed",
          occurredAt: "2026-06-07T00:01:00.000Z",
          actor: { userId: "user_1", sessionId: "session_1" },
          amountGd: 25,
          sourceBucket: "task_reward_gd",
          direction: "credit",
          sourceTruth: "reward_ledger",
        },
      ],
      timelineEvidence: [
        { entry: purchaseEvidence, expectedSourceBucket: "paid_gd" },
        { entry: ga4PurchaseOnly, expectedSourceBucket: "paid_gd" },
      ],
    });

    expect(report.productTruthPolicy).toMatchObject({
      treasuryLedgersPrimary: true,
      analyticsCanOnlyCorroborate: true,
      ga4CanCreditOrDebitGumdrops: false,
      legacyCanCreditOrDebitGumdrops: false,
    });
    expect(report.summary.ledger_confirmed).toBe(2);
    expect(report.summary.analytics_correlated).toBe(1);
    expect(report.summary.analytics_missing).toBe(1);
    expect(report.summary.ledger_missing_protected).toBe(1);
    expect(report.findings.find((finding) => finding.status === "ledger_missing_protected")).toMatchObject({
      timelineId: ga4PurchaseOnly.timelineId,
      productTruthAllowed: false,
    });
  });

  it("flags source bucket mismatches and duplicate treasury evidence without changing ledger truth", () => {
    const unlockEvidence = buildRecoveryTimelineEntryFromCanonicalEvent(createCanonicalAnalyticsEvent({
      eventId: "event_fact:unlock",
      eventName: "drop_unwrapped",
      occurredAt: "2026-06-07T00:00:00.000Z",
      receivedAt: "2026-06-07T00:00:01.000Z",
      actorType: "user",
      userId: "user_1",
      sessionId: "session_1",
      source: "server",
      consentState: "not_required",
      objectType: "unlock",
      objectId: "unlock_1",
    }), {
      source: "first_party_event_fact",
      corroboration: {
        unlockId: "unlock_1",
        eventFactId: "event_fact:unlock",
        sourceCount: 1,
        treasuryLedgerCorroborated: false,
      },
    });

    const report = reconcileTreasuryEventsWithRecoveryTimeline({
      ledgerEvents: [{
        ledgerId: "ledger_unlock_1",
        transactionId: "unlock_1",
        eventType: "unlock_spend",
        eventName: "drop_unwrapped",
        occurredAt: "2026-06-07T00:00:00.000Z",
        actor: { userId: "user_1", sessionId: "session_1" },
        amountGd: 100,
        sourceBucket: "paid_gd",
        direction: "debit",
        sourceTruth: "unlock_record",
      }],
      timelineEvidence: [
        { entry: unlockEvidence, expectedSourceBucket: "reward_gd" },
        { entry: unlockEvidence, expectedSourceBucket: "reward_gd" },
      ],
    });

    expect(report.status).toBe("review");
    expect(report.summary.duplicate_risk).toBe(1);
    expect(report.summary.source_bucket_mismatch).toBe(1);
    expect(report.findings.find((finding) => finding.status === "source_bucket_mismatch")).toMatchObject({
      sourceBucket: "paid_gd",
      evidenceSourceBucket: "reward_gd",
      productTruthAllowed: false,
    });
  });

  it("builds a manual GumDrop recovery queue that rejects analytics-only balance recovery", () => {
    const ga4PurchaseOnly = buildRecoveryTimelineEntryFromGa4Event({
      ga4EventName: "purchase",
      ga4EventId: "ga4_purchase_only",
      occurredAt: "2026-06-07T00:02:00.000Z",
      userPseudoId: "anon_1",
      sessionId: "session_ga4",
      transactionId: "txn_missing",
    });
    const rewardEvidence = buildRecoveryTimelineEntryFromCanonicalEvent(createCanonicalAnalyticsEvent({
      eventId: "event_fact:reward",
      eventName: "daily_reward_claimed",
      occurredAt: "2026-06-07T00:01:00.000Z",
      receivedAt: "2026-06-07T00:01:01.000Z",
      actorType: "user",
      userId: "user_1",
      sessionId: "session_1",
      source: "server",
      consentState: "not_required",
      objectType: "system",
      objectId: "reward_1",
    }), {
      source: "first_party_event_fact",
      corroboration: {
        rewardEventId: "reward_1",
        eventFactId: "event_fact:reward",
        sourceCount: 1,
        treasuryLedgerCorroborated: false,
      },
    });
    const ledgerEvents = [{
      ledgerId: "ledger_reward_1",
      transactionId: "reward_1",
      eventType: "reward" as const,
      eventName: "daily_reward_claimed",
      occurredAt: "2026-06-07T00:01:00.000Z",
      actor: { userId: "user_1", sessionId: "session_1" },
      amountGd: 25,
      sourceBucket: "task_reward_gd" as const,
      direction: "credit" as const,
      sourceTruth: "reward_ledger" as const,
    }];
    const timelineEvidence = [
      { entry: rewardEvidence, expectedSourceBucket: "task_reward_gd" as const },
      { entry: ga4PurchaseOnly, expectedSourceBucket: "paid_gd" as const },
    ];
    const reconciliation = reconcileTreasuryEventsWithRecoveryTimeline({
      ledgerEvents,
      timelineEvidence,
    });

    const queue = buildGumdropRecoveryQueue({
      generatedAtUtc: "2026-06-07T12:00:00.000Z",
      reconciliation,
      ledgerEvents,
      timelineEvidence,
    });

    expect(queue.schema).toMatchObject({
      moneyTruthRule: "ledger_or_server_proof_required_before_balance_recovery",
      analyticsOnlyRecoveryAllowed: false,
    });
    expect(queue.productTruthPolicy).toMatchObject({
      dryRunOnly: true,
      creditsOrDebitsUsers: false,
      backfillsTransactions: false,
      analyticsOnlyCanChangeBalance: false,
      requiresLedgerOrServerProofBeforeMoneyAction: true,
    });
    expect(queue.summary.analyticsOnlyRejectedCount).toBe(1);
    expect(queue.summary.moneyAffectingRecoveryAllowedCount).toBe(0);
    expect(queue.items.find((item) => item.ledgerCorroboration.status === "ledger_missing")).toMatchObject({
      suspectedAction: "purchase",
      allowedRecoveryAction: "reject_analytics_only_balance_recovery",
    });
    expect(validateGumdropRecoveryQueue(queue)).toEqual([]);
  });
});
