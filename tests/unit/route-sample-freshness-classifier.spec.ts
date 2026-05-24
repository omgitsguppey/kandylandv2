import { describe, expect, it } from "vitest";

import { classifyRouteSampleFreshness } from "@/lib/debug/route-sample-freshness-classifier";

describe("route sample freshness classifier", () => {
  const nowMs = Date.UTC(2026, 4, 24);

  it("classifies stale success and stale server errors without trusting them as current health", () => {
    expect(classifyRouteSampleFreshness({
      routeKey: "paypal/capture:POST",
      method: "POST",
      risk: "critical",
      optionality: "required",
      cluster: "payment",
      hasSample: true,
      lastResult: "success",
      lastSampleAgeMs: 2 * 24 * 60 * 60 * 1000,
      freshnessWindowMs: 24 * 60 * 60 * 1000,
    }, { nowMs }).status).toBe("stale_critical_evidence_required");

    const staleFailure = classifyRouteSampleFreshness({
      routeKey: "creator/bookings:POST",
      method: "POST",
      risk: "high",
      optionality: "required",
      cluster: "creator",
      hasSample: true,
      lastResult: "server_error",
      lastSampleAgeMs: 20 * 24 * 60 * 60 * 1000,
      freshnessWindowMs: 24 * 60 * 60 * 1000,
    }, { nowMs });

    expect(staleFailure.status).toBe("stale_server_error");
    expect(staleFailure.currentResultTrusted).toBe(false);
    expect(staleFailure.nextAction).toContain("fresh");
  });

  it("classifies no-sample routes as unseen cohorts instead of live", () => {
    expect(classifyRouteSampleFreshness({
      routeKey: "admin/ai/drop-covers/template:DELETE",
      method: "DELETE",
      risk: "medium",
      optionality: "optional",
      cluster: "ai",
      hasSample: false,
      lastResult: "no_sample",
      lastSampleAgeMs: null,
      freshnessWindowMs: 24 * 60 * 60 * 1000,
    }).status).toBe("unseen_optional_quiet");

    expect(classifyRouteSampleFreshness({
      routeKey: "admin/creator-account-controls:POST",
      method: "POST",
      risk: "high",
      optionality: "required",
      cluster: "admin",
      hasSample: false,
      lastResult: "no_sample",
      lastSampleAgeMs: null,
      freshnessWindowMs: 24 * 60 * 60 * 1000,
      sampleRequiredForBeta: true,
    }).status).toBe("unseen_required_smoke_needed");
  });
});
