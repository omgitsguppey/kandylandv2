import { describe, expect, it } from "vitest";

import { TELEMETRY_EVENT_OPTIONS } from "@/lib/telemetry-catalog";
import {
  findUnmappedTelemetryEvents,
  getTelemetryDependencyGraph,
  getTelemetryDependencyLane,
  resolveTelemetryLaneForEvent,
  validateTelemetryDependencyGraphClosure,
} from "@/lib/analytics/telemetry-dependency-graph";

const REQUIRED_LANES = [
  "page_view",
  "session",
  "guest_event",
  "auth_transition",
  "identity_link",
  "purchase",
  "gumdrop_balance",
  "creator_experience",
  "creator_subscription",
  "creator_drop_submission",
  "runtime_watch",
  "behavior_signal",
  "admin_evidence",
  "external_ga4_evidence",
] as const;

describe("telemetry dependency graph", () => {
  it("defines every required telemetry lane with route closure details", () => {
    const graph = getTelemetryDependencyGraph();

    expect(graph.map((lane) => lane.id)).toEqual(REQUIRED_LANES);

    for (const lane of graph) {
      expect(lane.producer).toBeTruthy();
      expect(lane.routeApi).toBeTruthy();
      expect(lane.persistenceDestination).toBeTruthy();
      expect(lane.materializerExportDestination).toBeTruthy();
      expect(lane.adminEvidenceConsumer).toBeTruthy();
      expect(lane.requiredIdentityFields.length).toBeGreaterThan(0);
      expect(lane.enabledBehavior).toBeTruthy();
      expect(lane.disabledBehavior).toBeTruthy();
      expect(lane.failureBehavior).toBeTruthy();
      expect(lane.costPriority).toBeTruthy();
    }
  });

  it("keeps priority lanes persisted or explicitly queued", () => {
    const graph = getTelemetryDependencyGraph();
    const priorityLanes = graph.filter((lane) => lane.costPriority !== "evidence_only");

    expect(priorityLanes.length).toBeGreaterThan(0);
    expect(priorityLanes.every((lane) => lane.destinationState === "persisted" || lane.destinationState === "queued")).toBe(true);
  });

  it("maps every catalog telemetry event to a canonical lane", () => {
    expect(findUnmappedTelemetryEvents(TELEMETRY_EVENT_OPTIONS)).toEqual([]);
    expect(resolveTelemetryLaneForEvent({ eventName: "creator_drop_submitted" })?.id).toBe("creator_drop_submission");
    expect(resolveTelemetryLaneForEvent({ eventName: "identity_linked" })?.id).toBe("identity_link");
    expect(resolveTelemetryLaneForEvent({ eventName: "server_purchase_verified" })?.id).toBe("purchase");
  });

  it("does not pretend the standalone runtime watch tracker is the persisted route", () => {
    const runtimeWatch = getTelemetryDependencyLane("runtime_watch");

    expect(runtimeWatch?.routeApi).toContain("/api/viewer/watch-session");
    expect(runtimeWatch?.persistenceDestination).toContain("analytics_watch_sessions");
    expect(runtimeWatch?.sourceReadyButNotTracked).toContain("RuntimeWatchTracker");
    expect(runtimeWatch?.producer).toContain("useViewerWatchSession");
  });

  it("keeps GA4 external evidence separate from product truth", () => {
    const ga4 = getTelemetryDependencyLane("external_ga4_evidence");

    expect(ga4?.evidenceOnly).toBe(true);
    expect(ga4?.productTruth).toBe(false);
    expect(ga4?.destinationState).toBe("external_evidence_only");
    expect(ga4?.persistenceDestination).not.toContain("analytics_event_facts product truth");
  });

  it("reports no route closure blockers for the current graph", () => {
    const result = validateTelemetryDependencyGraphClosure(TELEMETRY_EVENT_OPTIONS);

    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
  });
});
