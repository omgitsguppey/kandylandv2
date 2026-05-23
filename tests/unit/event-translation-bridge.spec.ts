import { describe, expect, it } from "vitest";

import {
  buildEventTranslationBridgeReport,
  classifyWaitingOnActivityReason,
  detectTranslationGap,
  translateEnvelopeToDebugEvidence,
  translateEnvelopeToFeatureActivity,
  translateEnvelopeToPersonMetric,
  translateRawEventToEnvelope,
} from "@/lib/analytics/event-translation-bridge";

describe("event translation bridge", () => {
  it("translates a raw event through envelope, feature activity, person metric, debug evidence, and score inputs", () => {
    const envelope = translateRawEventToEnvelope({
      eventId: "evt_bridge_drop",
      eventName: "drop_clicked",
      timestamp: "2026-05-23T00:00:00.000Z",
      guestId: "guest_bridge",
      userId: "user_bridge",
      linkId: "link_bridge",
      sessionId: "sess_bridge",
      consentMode: "full_behavioral",
      source: "client",
      metadata: { dropId: "drop_1", email: "person@example.com" },
    });

    expect(envelope.pipelineStatus).toBe("normal");
    expect(envelope.eventName).toBe("drop_clicked");
    expect(envelope.featureId).toBe("drops");
    expect(envelope.metadata).toEqual({ dropId: "drop_1" });

    const activity = translateEnvelopeToFeatureActivity({ envelope });
    expect(activity).toMatchObject({
      featureId: "drops",
      producerRegistered: true,
      producerConnected: true,
      envelopeTranslated: true,
      materializerMapped: true,
      debugLaneMapped: true,
      scoreInputMapped: true,
      activityStatus: "translated",
    });

    const metric = translateEnvelopeToPersonMetric({ envelope });
    expect(metric).toMatchObject({
      classificationStatus: "mapped",
      metricIds: ["drop_opens"],
      debugOwner: "analytics",
      scoreImpact: "behavior_confidence",
    });

    const debugEvidence = translateEnvelopeToDebugEvidence({ envelope, featureActivity: activity, personMetric: metric });
    expect(debugEvidence).toMatchObject({
      lane: "Event translation bridge",
      status: "live",
      producerRegistered: true,
      envelopeTranslated: true,
      featureActivityMapped: true,
      personMetricMapped: true,
      materializerMapped: true,
      scoreDimensionInputs: ["sourceHealth", "runtimeHealth", "evidenceCompleteness"],
    });

    expect(classifyWaitingOnActivityReason({ envelope, featureActivity: activity, personMetric: metric })).toMatchObject({
      reason: "activity_translated",
      scoreDrag: false,
    });
    expect(detectTranslationGap({ envelope, featureActivity: activity, personMetric: metric }).hasGap).toBe(false);
  });

  it("keeps source-ready future activity from becoming a score drag when the bridge is wired", () => {
    const envelope = translateRawEventToEnvelope({
      eventId: "evt_bridge_wallet",
      eventName: "wallet_opened",
      timestamp: "2026-05-23T00:00:00.000Z",
      sessionId: "sess_wallet",
      userId: "user_wallet",
      consentMode: "minimal_analytics",
      source: "client",
    });
    const featureActivity = translateEnvelopeToFeatureActivity({ envelope, observedActivityCount: 0 });
    const personMetric = translateEnvelopeToPersonMetric({ envelope });
    const waiting = classifyWaitingOnActivityReason({ envelope, featureActivity, personMetric });

    expect(featureActivity.activityStatus).toBe("source_ready_future_activity");
    expect(waiting).toMatchObject({
      reason: "future_real_activity_pending",
      missingProducer: null,
      scoreDrag: false,
    });
    expect(detectTranslationGap({ envelope, featureActivity, personMetric }).hasGap).toBe(false);
  });

  it("flags exact missing producers and materializer gaps without faking activity", () => {
    const unregisteredEnvelope = translateRawEventToEnvelope({
      eventId: "evt_bridge_unknown",
      eventName: "unknown_activity_from_ui",
      timestamp: "2026-05-23T00:00:00.000Z",
      sessionId: "sess_unknown",
      source: "client",
    });
    const unregisteredActivity = translateEnvelopeToFeatureActivity({ envelope: unregisteredEnvelope });
    const unregisteredMetric = translateEnvelopeToPersonMetric({ envelope: unregisteredEnvelope });
    const unregisteredGap = detectTranslationGap({
      envelope: unregisteredEnvelope,
      featureActivity: unregisteredActivity,
      personMetric: unregisteredMetric,
    });

    expect(unregisteredGap).toMatchObject({
      hasGap: true,
      gapType: "producer_missing",
      missingProducer: "unknown_activity_from_ui",
    });

    const report = buildEventTranslationBridgeReport({
      sourceEvents: [
        {
          eventName: "drop_clicked",
          observedActivityCount: 1,
          sourcePath: "tests/unit/event-translation-bridge.spec.ts",
        },
        {
          eventName: "unknown_activity_from_ui",
          observedActivityCount: 1,
          sourcePath: "tests/unit/event-translation-bridge.spec.ts",
        },
      ],
      dirtyFiles: [],
      generatedAtUtc: "2026-05-23T00:00:00.000Z",
      currentHead: "test",
    });

    expect(report.fakeActivityUsed).toBe(false);
    expect(report.debugLane).toMatchObject({
      label: "Event translation bridge",
      producersRegistered: expect.any(Number),
      producersConnected: expect.any(Number),
      eventEnvelopesTranslated: expect.any(Number),
      materializersMapped: expect.any(Number),
      personMetricsMapped: expect.any(Number),
      gaps: 1,
    });
    expect(report.validationFailures).toContain("unknown_activity_from_ui producer is not registered.");
  });
});
