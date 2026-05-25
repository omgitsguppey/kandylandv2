import { describe, expect, it } from "vitest";

import { PERSON_METRIC_DEFINITIONS } from "@/lib/analytics/person-metrics-contract";
import {
  SEARCH_COST_DEBUG_LANE,
  SEARCH_COST_POLICY,
  classifySearchRouteCostRisk,
  validateSearchCostPolicy,
} from "@/lib/discovery/search-cost-contract";
import {
  SEARCH_DISCOVERY_DEBUG_LANE,
  SEARCH_DISCOVERY_EVENTS,
  buildSearchDiscoveryDebugLane,
  buildSearchTelemetryPayload,
  validateSearchDiscoveryCostReport,
} from "@/lib/discovery/search-telemetry-contract";
import { TELEMETRY_EVENT_OPTIONS } from "@/lib/telemetry-catalog";

describe("search discovery query quality and cost", () => {
  it("defines the canonical search event spine", () => {
    expect(SEARCH_DISCOVERY_EVENTS).toEqual([
      "search_focused",
      "search_query_changed",
      "search_submitted",
      "search_results_loaded",
      "search_zero_results",
      "search_result_clicked",
      "search_failed",
      "search_cleared",
    ]);
  });

  it("redacts raw search text from broad telemetry", () => {
    const payload = buildSearchTelemetryPayload({
      eventName: "search_submitted",
      surface: "drops",
      sourceComponent: "compact_drops_filter_bar",
      queryText: "email me at fan@example.com about spicy drops",
      resultCount: 0,
      resultType: "drop",
      executionMode: "local_filter",
    });

    expect(payload).toMatchObject({
      event_name: "search_submitted",
      surface: "drops",
      source_component: "compact_drops_filter_bar",
      query_length: 45,
      raw_query_stored: false,
      result_count: 0,
      result_type: "drop",
      execution_mode: "local_filter",
      debug_lane: SEARCH_DISCOVERY_DEBUG_LANE,
      privacy_class: "product_behavior_redacted",
    });
    expect(payload.query_hash).toMatch(/^q_[a-z0-9]+$/u);
    expect(JSON.stringify(payload)).not.toContain("fan@example.com");
    expect(JSON.stringify(payload)).not.toContain("spicy drops");
    expect(JSON.stringify(payload)).not.toContain("queryText");
  });

  it("requires debounce, minimum length, paging, cache reuse, and no broad reads", () => {
    expect(SEARCH_COST_POLICY).toMatchObject({
      debugLane: SEARCH_COST_DEBUG_LANE,
      clientDebounceMs: 350,
      backendMinQueryLength: 3,
      backendCallPerKeystrokeAllowed: false,
      pageSizeMax: 24,
      broadUnboundedReadsAllowed: false,
      rawQueryTextInBroadTelemetryAllowed: false,
      zeroResultSummaryTracked: true,
      clickedResultTracked: true,
    });

    expect(validateSearchCostPolicy(SEARCH_COST_POLICY)).toEqual([]);
    expect(classifySearchRouteCostRisk({
      route: "src/app/drops/DropsClient.tsx",
      executionMode: "local_filter",
      debounced: true,
      minQueryLength: 3,
      paged: true,
      broadRawRead: false,
    })).toBe("cost_safe_local_filter");
    expect(classifySearchRouteCostRisk({
      route: "src/app/api/search/route.ts",
      executionMode: "backend_query",
      debounced: false,
      minQueryLength: 0,
      paged: false,
      broadRawRead: true,
    })).toBe("broad_read_risk");
  });

  it("registers events in telemetry catalog and person metrics", () => {
    const catalogEvents = new Set(TELEMETRY_EVENT_OPTIONS.map((event) => event.eventName));
    const personMetricEvents = new Set(PERSON_METRIC_DEFINITIONS.flatMap((metric) => metric.eventNames));

    for (const eventName of SEARCH_DISCOVERY_EVENTS) {
      expect(catalogEvents.has(eventName), `${eventName} missing from telemetry catalog`).toBe(true);
      expect(personMetricEvents.has(eventName), `${eventName} missing from person metrics`).toBe(true);
    }
  });

  it("builds debug evidence for zero-result, click, failure, and cost policy risks", () => {
    const lane = buildSearchDiscoveryDebugLane([
      { eventName: "search_zero_results", resultCount: 0, queryLength: 8 },
      { eventName: "search_result_clicked", resultType: "drop", resultPosition: 2 },
      { eventName: "search_failed", failureReason: "route_failed" },
      { eventName: "search_query_changed", broadReadRisk: true },
    ]);

    expect(lane.label).toBe("Search/discovery");
    expect(lane.zeroResultCount).toBe(1);
    expect(lane.clickedResultCount).toBe(1);
    expect(lane.failedSearchCount).toBe(1);
    expect(lane.broadReadRiskCount).toBe(1);
    expect(lane.costPolicyStatus).toBe("review");

    expect(validateSearchDiscoveryCostReport({
      events: SEARCH_DISCOVERY_EVENTS,
      costPolicy: SEARCH_COST_POLICY,
      debugLane: lane,
      scoreDimensions: {
        before: { evidenceCompleteness: 84, costRisk: 84, regressionRisk: 84 },
        after: { evidenceCompleteness: 88, costRisk: 88, regressionRisk: 87 },
      },
    })).toEqual([]);
  });
});
