import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { validateTelemetryPersistenceBindings, validateTelemetryDependencyGraph } from "../../scripts/agent/validate-telemetry-dependency-graph";

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

describe("telemetry persistence reader follows actual owners", () => {
  const paths = ["src/components/Analytics/DeepTracker.tsx", "src/lib/telemetry.ts", "src/app/api/analytics/ingest/route.ts",
    "src/app/api/analytics/ingest-identified/route.ts", "src/lib/analytics/ingest-contract.ts", "src/lib/server/analytics-governance.ts"];
  const sources = () => Object.fromEntries(paths.map(path => [path, readFileSync(path, "utf8")]));
  it("accepts the actual guest and identified transport/persistence owners", () => {
    expect(validateTelemetryPersistenceBindings(sources())).toEqual({ guest: true, identified: true });
    const report = validateTelemetryDependencyGraph();
    expect(report.blockingFailures).toEqual([]);
  });
  it.each([
    [paths[0], "await submitGuestAnalyticsIngestPayload({", "await disconnectedGuestTransport({", "guest"],
    [paths[1], 'fetch("/api/analytics/ingest",', 'fetch("/api/disconnected",', "guest"],
    [paths[4], 'guestBatches: "analytics_guest_batches"', 'guestBatches: "disconnected_batches"', "guest"],
    [paths[2], "transaction.create(guestBatchRef,", "transaction.create(disconnectedRef,", "guest"],
    [paths[2], "await writeBehavioralTimelineProjection({", "await disconnectedProjection({", "guest"],
    [paths[3], "createRuntimeFactFirestoreDocument({", "disconnectedDocument({", "identified"],
    [paths[5], 'runtimeFacts: "analytics_event_facts"', 'runtimeFacts: "disconnected_facts"', "identified"],
    [paths[3], "batch.create(ref, eventFactDocument)", "batch.create(disconnectedRef, eventFactDocument)", "identified"],
    [paths[3], "await writeBehavioralTimelineProjection({", "await disconnectedProjection({", "identified"],
  ])("rejects severed binding in %s: %s", (path, before, after, lane) => {
    const input = sources();
    expect(input[path]).toContain(before);
    input[path] = input[path].replace(before, after) + `\n// ${before}\n`;
    expect(validateTelemetryPersistenceBindings(input)[lane as "guest" | "identified"]).toBe(false);
  });
  it("rejects fake comment-only calls while retaining real imports", () => {
    const input = sources();
    input[paths[0]] = input[paths[0]].replace("await submitGuestAnalyticsIngestPayload({", "await disconnectedGuestTransport({")
      + "\n// submitGuestAnalyticsIngestPayload({});\n";
    expect(validateTelemetryPersistenceBindings(input).guest).toBe(false);
  });
  it("accepts a real imported alias and renamed guest reference", () => {
    const input = sources();
    input[paths[0]] = input[paths[0]].replace("submitGuestAnalyticsIngestPayload,", "submitGuestAnalyticsIngestPayload as flushGuest,")
      .replace("await submitGuestAnalyticsIngestPayload({", "await flushGuest({");
    input[paths[2]] = input[paths[2]].replaceAll("guestBatchRef", "retainedBatchReference");
    expect(validateTelemetryPersistenceBindings(input)).toEqual({ guest: true, identified: true });
  });
});
