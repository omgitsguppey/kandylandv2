import { describe, expect, it } from "vitest";

import { buildDebugPanelTrackingSummary } from "@/lib/debug/debug-panel-tracking-summary";
import {
  CENTRAL_NORMALIZER_LEGACY_PATHWAYS,
  buildCentralNormalizerDebugLane,
  explainNormalizationFailure,
  normalizeProductSignal,
  normalizeToDebug,
  normalizeToEventEnvelope,
  normalizeToEventFact,
  normalizeToExport,
  normalizeToJourney,
  normalizeToMetrics,
  normalizeToScore,
  routeSignalToBodySystem,
} from "@/lib/product-integrity/central-normalizer";
import {
  CENTRAL_NORMALIZER_OUTPUT_KEYS,
  PRODUCT_SIGNAL_KINDS,
} from "@/lib/product-integrity/central-normalizer-contract";

describe("central normalizer spine", () => {
  const dropSignal = {
    signalId: "sig-drop-preview-1",
    signalKind: "UserActionSignal" as const,
    eventName: "drop_preview_opened",
    featureId: "drops",
    surface: "drops_library",
    who: {
      userId: "user_1",
      sessionId: "session_1",
      actorKind: "signed_in_user" as const,
    },
    what: {
      objectType: "drop",
      objectId: "drop_1",
      dropId: "drop_1",
    },
    when: {
      occurredAtUtc: "2026-05-26T12:00:00.000Z",
      timestampMs: 1_779_800_000_000,
    },
    where: {
      route: "/drops/drop_1",
      surface: "drops_library",
      sourceComponent: "DropCard",
    },
    how: {
      action: "click",
      method: "tap",
      source: "client" as const,
    },
    howLong: {
      durationMs: 1200,
      activeMs: 900,
    },
    identityState: "signed_in",
    confidence: "exact" as const,
    sourceTruth: "client",
    dedupeKey: "drop-preview-user-1-drop-1",
    privacyClass: "minimal_product" as const,
    costClass: "hot_path_summary" as const,
    debugVisibility: "debug_visible",
    scoreImpact: ["evidenceCompleteness" as const, "runtimeHealth" as const],
  };

  it("defines all signal and normalized output channels", () => {
    expect(PRODUCT_SIGNAL_KINDS).toEqual(expect.arrayContaining([
      "RawProductSignal",
      "SurfaceStateSignal",
      "UserActionSignal",
      "BackendRouteSignal",
      "LifecycleSignal",
      "ErrorSignal",
      "PermissionSignal",
      "TransactionSignal",
      "MediaSignal",
      "AuthSignal",
      "NotificationSignal",
      "ChatSignal",
      "TaskSignal",
      "CreatorMonetizationSignal",
    ]));
    expect(CENTRAL_NORMALIZER_OUTPUT_KEYS).toEqual(expect.arrayContaining([
      "canonicalEventEnvelope",
      "normalizedEventFact",
      "globalMetricFact",
      "userMetricFact",
      "journeyEvent",
      "debugSignal",
      "scoreSignal",
      "exportFact",
      "costSignal",
    ]));
  });

  it("routes a product signal through envelope, fact, metrics, journey, debug, score, and export adapters", () => {
    const normalized = normalizeProductSignal(dropSignal);

    expect(normalized.status).toBe("normalized");
    expect(normalized.bodySystem).toBe("drops_unwrap_watch");
    expect(normalized.requiredFields.who).toBe(true);
    expect(normalized.requiredFields.what).toBe(true);
    expect(normalized.requiredFields.when).toBe(true);
    expect(normalized.requiredFields.where).toBe(true);
    expect(normalized.requiredFields.how).toBe(true);
    expect(normalized.requiredFields.howLong).toBe(true);
    expect(normalized.canonicalEventEnvelope.eventName).toBe("drop_preview_opened");
    expect(normalized.normalizedEventFact?.normalizedAction).toBe("drop_preview_opened");
    expect(normalized.globalMetricFact?.metricScope).toBe("global");
    expect(normalized.userMetricFact?.metricScope).toBe("user");
    expect(normalized.journeyEvent?.sourceEventName).toBe("drop_preview_opened");
    expect(normalized.debugSignal.status).toBe("normalized");
    expect(normalized.scoreSignal.dimensions).toEqual(expect.arrayContaining(["evidenceCompleteness"]));
    expect(normalized.exportFact?.exportRowKind).toBe("event_fact");
    expect(normalized.costSignal.costClass).toBe("hot_path_summary");
  });

  it("exposes each adapter wrapper directly for legacy systems to adopt", () => {
    const envelope = normalizeToEventEnvelope(dropSignal);
    const fact = normalizeToEventFact(dropSignal, envelope);
    const metrics = normalizeToMetrics(dropSignal, envelope, fact);
    const journey = normalizeToJourney(dropSignal, fact);
    const debug = normalizeToDebug(dropSignal, { envelope, fact, bodySystem: "drops_unwrap_watch" });
    const score = normalizeToScore(dropSignal, "drops_unwrap_watch");
    const exportFact = normalizeToExport(fact, journey);

    expect(envelope.eventName).toBe("drop_preview_opened");
    expect(fact?.dedupeKey).toContain("drop_preview_opened");
    expect(metrics.personMetricsReport.fakeMetricsUsed).toBe(false);
    expect(journey?.journeyEventId).toContain("drop_preview_opened");
    expect(debug.bodySystem).toBe("drops_unwrap_watch");
    expect(score.canFeedScore).toBe(true);
    expect(exportFact?.globalSummary.summaryKind).toBe("globalSummary");
  });

  it("fails closed when a signal lacks a body system or required identity context", () => {
    const broken = normalizeProductSignal({
      ...dropSignal,
      eventName: "unknown_future_signal",
      featureId: "unknown_feature",
      who: { sessionId: "" },
      dedupeKey: "",
    });

    expect(broken.status).toBe("failed");
    expect(broken.bodySystem).toBe("telemetry_behavioral_intelligence");
    expect(broken.normalizationFailures).toEqual(expect.arrayContaining([
      "missing_identity",
      "missing_dedupeKey",
      "event_envelope_quarantined",
      "normalized_event_fact_missing",
    ]));
    expect(explainNormalizationFailure(broken)).toContain("missing_identity");
  });

  it("classifies legacy direct pathways instead of leaving bypasses unsafe", () => {
    expect(CENTRAL_NORMALIZER_LEGACY_PATHWAYS.length).toBeGreaterThan(0);
    expect(CENTRAL_NORMALIZER_LEGACY_PATHWAYS.every((pathway) =>
      pathway.classification === "central_normalizer_adapter"
      || pathway.classification === "legacy_alias_still_required"
      || pathway.classification === "exemption_documented"
    )).toBe(true);
    expect(CENTRAL_NORMALIZER_LEGACY_PATHWAYS.some((pathway) => pathway.classification === "legacy_alias_still_required")).toBe(true);
  });

  it("adds an issue-first Central normalizer debug lane", () => {
    const normalized = normalizeProductSignal(dropSignal);
    const lane = buildCentralNormalizerDebugLane([normalized]);
    const summary = buildDebugPanelTrackingSummary({
      centralNormalizerSpine: { debugLane: lane },
    });

    expect(routeSignalToBodySystem(dropSignal)).toBe("drops_unwrap_watch");
    expect(lane.defaultView).toBe("issues_only");
    expect(lane.normalizedSuccessfully).toBe(1);
    expect(summary.lanes.find((entry) => entry.id === "central_normalizer")?.label).toBe("Central normalizer");
  });
});
