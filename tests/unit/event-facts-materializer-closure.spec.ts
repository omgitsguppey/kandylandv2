import { describe, expect, it } from "vitest";

import {
  ANALYTICS_INGEST_EVENT_TYPES,
} from "@/lib/analytics/ingest-contract";
import {
  MATERIALIZATION_CONTRACT,
  getMaterializationClassification,
  listBigQueryExportCandidates,
  validateMaterializationContractClosure,
} from "@/lib/analytics/materialization-contract";
import { TELEMETRY_DEPENDENCY_GRAPH } from "@/lib/analytics/telemetry-dependency-graph";

describe("event facts materializer closure", () => {
  it("classifies persisted telemetry collections into downstream lanes", () => {
    const requiredCollections = [
      "analytics_event_facts",
      "analytics_guest_batches",
      "analytics_sessions",
      "behavioral_timeline_facts",
      "analytics_watch_sessions",
      "analytics_event_rollup_batches",
      "analytics_rollups_daily",
      "analytics_event_stats",
      "analytics_semantic_daily",
      "analytics_page_daily",
      "analytics_admin_metric_snapshots",
    ];

    for (const collection of requiredCollections) {
      const classification = getMaterializationClassification(collection);
      expect(classification, collection).toBeTruthy();
      expect(classification?.downstreamClassification).toMatch(/^(event_fact|materialized_summary|admin_evidence|bigquery_candidate|archive_debug_only)$/u);
      expect(classification?.adminConsumers.length, collection).toBeGreaterThan(0);
    }
  });

  it("keeps every produced telemetry persistence destination classified", () => {
    const producerCollections = new Set<string>();

    for (const lane of TELEMETRY_DEPENDENCY_GRAPH) {
      for (const collection of MATERIALIZATION_CONTRACT.producerCollectionMap[lane.id] ?? []) {
        producerCollections.add(collection);
      }
    }

    producerCollections.add("analytics_guest_batches");
    producerCollections.add("analytics_sessions");
    producerCollections.add("behavioral_timeline_facts");

    const unclassified = [...producerCollections]
      .filter((collection) => !getMaterializationClassification(collection));

    expect(unclassified).toEqual([]);
  });

  it("maps ingest event types to event facts or deferred summaries", () => {
    for (const eventType of ANALYTICS_INGEST_EVENT_TYPES) {
      const eventRule = MATERIALIZATION_CONTRACT.ingestEventMaterialization[eventType];
      expect(eventRule, eventType).toBeTruthy();
      expect(eventRule.dedupeKey).toBe("session_batch");
      expect(eventRule.outputCollections.length).toBeGreaterThan(0);
      expect(eventRule.outputCollections).toEqual(expect.arrayContaining([
        "analytics_guest_batches",
        "behavioral_timeline_facts",
      ]));
    }
  });

  it("prevents low-priority rollups from hot-writing per event", () => {
    const eventFacts = getMaterializationClassification("analytics_event_facts");
    const guestBatches = getMaterializationClassification("analytics_guest_batches");

    expect(eventFacts?.lowPriorityBehavior).toBe("deferred_minute_batch");
    expect(eventFacts?.rollupOutputs).toContain("analytics_event_rollup_batches");
    expect(guestBatches?.lowPriorityBehavior).toBe("bounded_batch_rollup");
    expect(MATERIALIZATION_CONTRACT.rollupCadence).toEqual(expect.arrayContaining(["minute", "hour", "day", "deferred"]));
  });

  it("marks BigQuery candidates and unknown legacy records explicitly", () => {
    expect(listBigQueryExportCandidates()).toEqual(expect.arrayContaining([
      "analytics_event_facts",
      "analytics_guest_batches",
      "analytics_watch_sessions",
    ]));

    const legacy = getMaterializationClassification("legacy_page_duration_events");
    expect(legacy).toMatchObject({
      currentTruth: false,
      legacyState: "unknown_legacy",
      downstreamClassification: "archive_debug_only",
    });
  });

  it("validates the materialization contract without unclosed telemetry records", () => {
    const result = validateMaterializationContractClosure();

    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
    expect(result.unclassifiedCollections).toEqual([]);
  });
});
