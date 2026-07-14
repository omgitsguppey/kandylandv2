import { describe, expect, it } from "vitest";

import {
  resolveCreatorDropMetrics,
} from "../../src/lib/drops/drop-metrics-resolver";
import {
  resolveDropStatus,
} from "../../src/lib/drops/drop-status-resolver";
import {
  buildCreatorDropStatusMetricsReport,
  validateCreatorDropStatusMetricsReport,
} from "../../scripts/agent/validate-creator-drop-status-metrics";

const now = Date.UTC(2026, 4, 20);

describe("creator drop status and metrics", () => {
  it("resolves creator lifecycle states separately from public visibility", () => {
    expect(resolveDropStatus({ createdByRole: "admin", status: "active", approvalStatus: "approved", publicDiscovery: true, rotationEligibility: true }, { now }).creatorStatusKey).toBe("admin_created");
    expect(resolveDropStatus({ reviewStatus: "pending_admin_approval", approvalStatus: "pending_review" }, { now }).creatorStatusKey).toBe("pending_review");
    expect(resolveDropStatus({ reviewStatus: "needs_changes" }, { now }).creatorStatusKey).toBe("needs_changes");
    expect(resolveDropStatus({ reviewStatus: "rejected" }, { now }).creatorStatusKey).toBe("rejected");
    expect(resolveDropStatus({ reviewStatus: "approved", status: "active", publicDiscovery: true, rotationEligibility: true }, { now }).creatorStatusKey).toBe("approved_live");
    expect(resolveDropStatus({ reviewStatus: "approved", status: "active", validUntil: now - 1 }, { now }).creatorStatusKey).toBe("expired");
  });

  it("does not display missing metrics as zero without proof", () => {
    const missing = resolveCreatorDropMetrics({});
    expect(missing.source).toBe("unavailable");
    expect(missing.views.displayValue).toBe("Collecting");
    expect(missing.views.provenZero).toBe(false);

    const proven = resolveCreatorDropMetrics({ totalViews: 0, totalClicks: 0, totalUnlocks: 0, metricsSource: "admin_snapshot" });
    expect(proven.source).toBe("admin_snapshot");
    expect(proven.views.displayValue).toBe("0");
    expect(proven.views.provenZero).toBe(true);
  });

  it("validates source wiring for creator-safe cards and API fields", () => {
    const source = [
      "CreatorDropManager",
      "Submit drop",
      'data-creator-drop-card-status={status.creatorStatusKey}',
      'data-creator-drop-metrics-source={metrics.source}',
      'data-creator-drop-expired={String(status.isExpired)}',
      'data-creator-drop-mobile-density="compact"',
      "resolveDropStatus(drop",
      "resolveCreatorDropMetrics(drop)",
      "Views",
      "Clicks",
      "Unwraps",
      "MarqueeText",
      "statusToneClassName",
    ].join(" ");
    const api = [
      "creator/drops",
      "resolveDropStatus",
      "resolveCreatorDropMetrics",
      "metrics: metrics.serialized",
      "statusResolution: status",
      "publicDiscovery",
      "rotationEligibility",
      "createdByRole",
      "assignedCreatorIds",
    ].join(" ");
    const report = buildCreatorDropStatusMetricsReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      changedFiles: [
        "src/components/Creators/CreatorDropManager.tsx",
        "src/app/api/creator/drops/route.ts",
      ],
      sources: {
        packageJson: "check:creator-drop-status-metrics",
        manager: source,
        apiRoute: api,
        statusResolver: "admin_created creator_submitted draft pending_review needs_changes approved_live rejected expired archived unavailable canCreatorEdit canCreatorResubmit sourceTruth",
      metricsResolver: 'views clicks unwraps source freshness provenZero displayValue: "Collecting" provenZero: false Unavailable',
        testSource: "missing metrics as zero expired creator drop",
      },
    });

    expect(report.summary.statusResolverReady).toBe(true);
    expect(report.summary.metricsResolverReady).toBe(true);
    expect(report.summary.creatorCardStatusChipReady).toBe(true);
    expect(validateCreatorDropStatusMetricsReport(report)).toEqual([]);
  });

  it("fails if the creator card has no status chip or metrics source", () => {
    const report = buildCreatorDropStatusMetricsReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      changedFiles: ["src/components/Creators/CreatorDropManager.tsx"],
      sources: {
        packageJson: "check:creator-drop-status-metrics",
        manager: "Submit drop",
        apiRoute: "",
        statusResolver: "",
        metricsResolver: "",
        testSource: "",
      },
    });

    expect(validateCreatorDropStatusMetricsReport(report)).toContain("creator drop card lacks status chip or inline metrics.");
  });
});
