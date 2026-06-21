import { describe, expect, it } from "vitest";

import {
  BODY_SYSTEM_IDS,
  PRODUCT_LIMB_KINDS,
  PRODUCT_LIMB_STATUSES,
} from "@/lib/product-integrity/product-body-system-contract";
import {
  buildProductBodyMapDebugLane,
  buildProductBodyMapReport,
  getProductBodySystemForFeature,
  listProductBodyLimbs,
  validateProductBodyMapReport,
} from "@/lib/product-integrity/product-body-map";
import { FEATURE_REGISTRATION_REGISTRY } from "@/lib/features/feature-registration-registry";
import { SURFACE_PARITY_REGISTRY } from "@/lib/parity/surface-parity-registry";
import { TELEMETRY_EVENT_EXTENSION_METADATA } from "@/lib/telemetry-catalog";
import { PERSON_METRIC_DEFINITIONS } from "@/lib/analytics/person-metrics-contract";
import { buildDebugPanelTrackingSummary } from "@/lib/debug/debug-panel-tracking-summary";
import { compactProductBodyMapReportForArtifact } from "../../scripts/agent/validate-product-body-map";

describe("product body map", () => {
  it("defines the canonical body systems and limb vocabulary", () => {
    expect(BODY_SYSTEM_IDS).toEqual(expect.arrayContaining([
      "identity_auth",
      "onboarding_signup",
      "wallet_commerce",
      "gumdrop_economy",
      "drops_unwrap_watch",
      "creator_profile_discovery",
      "creator_monetization",
      "fan_pass_entitlements",
      "chat_messaging",
      "daily_tasks_rewards",
      "notifications_pwa",
      "account_settings_support",
      "media_storage_access",
      "admin_debug_ops",
      "telemetry_behavioral_intelligence",
      "cost_runtime_infrastructure",
    ]));
    expect(PRODUCT_LIMB_KINDS).toContain("telemetry_event");
    expect(PRODUCT_LIMB_STATUSES).toContain("unsafe_unknown");
  });

  it("assigns every registered feature, surface, telemetry event, and person metric to a body system", () => {
    const limbs = listProductBodyLimbs();
    const limbIds = new Set(limbs.map((limb) => limb.limbId));

    for (const feature of FEATURE_REGISTRATION_REGISTRY) {
      expect(limbIds.has(`feature:${feature.featureId}`)).toBe(true);
      expect(getProductBodySystemForFeature(feature.featureId)).toBeDefined();
    }

    for (const surface of SURFACE_PARITY_REGISTRY) {
      expect(limbIds.has(`surface:${surface.surfaceId}`)).toBe(true);
    }

    for (const event of TELEMETRY_EVENT_EXTENSION_METADATA) {
      expect(limbIds.has(`telemetry_event:${event.eventName}`)).toBe(true);
    }

    for (const metric of PERSON_METRIC_DEFINITIONS) {
      expect(limbIds.has(`metric:person:${metric.id}`)).toBe(true);
    }
  });

  it("reports disconnected limbs without allowing unsafe unknowns", () => {
    const report = buildProductBodyMapReport({
      packageScripts: {
        "check:product-body-map": "tsx scripts/agent/validate-product-body-map.ts",
      },
      dirtyFiles: [],
      openPullRequests: [],
    });

    expect(report.reportKey).toBe("product-body-map");
    expect(report.bodySystemsCovered).toBe(BODY_SYSTEM_IDS.length);
    expect(report.telemetryEventsMapped).toBe(TELEMETRY_EVENT_EXTENSION_METADATA.length);
    expect(report.majorFeaturesMapped).toBe(FEATURE_REGISTRATION_REGISTRY.length);
    expect(report.majorSurfacesMapped).toBe(SURFACE_PARITY_REGISTRY.length);
    expect(report.disconnectedByStatus.unsafe_unknown).toBe(0);
    expect(validateProductBodyMapReport(report)).toEqual([]);
  });

  it("fails validation for unclassified dirty files and open PRs", () => {
    const report = buildProductBodyMapReport({
      packageScripts: {
        "check:product-body-map": "tsx scripts/agent/validate-product-body-map.ts",
      },
      dirtyFiles: [{ path: "src/lib/wallet/runtime.ts", classification: "unsafe_unknown" }],
      openPullRequests: [{ number: 1, title: "unknown", url: "", mergeStateStatus: "UNKNOWN", isDraft: false, classification: "unsafe_unknown" }],
    });

    expect(validateProductBodyMapReport(report)).toEqual(expect.arrayContaining([
      "Dirty file src/lib/wallet/runtime.ts is unsafe_unknown.",
      "Open PR #1 is unsafe_unknown.",
    ]));
  });

  it("surfaces the Product body map debug lane as issues-only by default", () => {
    const report = buildProductBodyMapReport({
      packageScripts: {
        "check:product-body-map": "tsx scripts/agent/validate-product-body-map.ts",
      },
      dirtyFiles: [],
      openPullRequests: [],
    });
    const debugLane = buildProductBodyMapDebugLane(report);
    const debugSummary = buildDebugPanelTrackingSummary({
      productBodyMap: { debugLane },
    });
    const lane = debugSummary.lanes.find((entry) => entry.id === "product_body_map");

    expect(debugLane.defaultView).toBe("disconnected_only");
    expect(lane).toBeDefined();
    expect(lane?.label).toBe("Product body map");
    expect(lane?.primarySignal).toContain("systems=");
    expect(lane?.rawDetailsDefaultOpen).toBe(false);
  });

  it("keeps the generated artifact compact while preserving full catalog counts", () => {
    const report = buildProductBodyMapReport({
      packageScripts: {
        "check:product-body-map": "tsx scripts/agent/validate-product-body-map.ts",
      },
      dirtyFiles: [],
      openPullRequests: [],
    });
    const compact = compactProductBodyMapReportForArtifact(report);

    expect(compact.reportCompleteness).toBe("capped_catalog");
    expect(compact.totalLimbs).toBe(report.limbs.length);
    expect(compact.fullLimbCatalogOmittedCount).toBe(report.limbs.length);
    expect("limbs" in compact).toBe(false);
    expect(compact.bodySystemSummaries.identity_auth.exampleLimbIds.length).toBeGreaterThan(0);
    expect(compact.emittedDisconnectedLimbCount).toBeLessThanOrEqual(80);
  });
});
