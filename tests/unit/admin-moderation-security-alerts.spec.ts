import { describe, expect, it } from "vitest";

import {
  clusterAdminModerationSecurityAlerts,
  normalizeAdminModerationSecurityAlert,
} from "@/lib/admin-moderation-security-alerts";

describe("admin moderation security alert normalization", () => {
  it("adds confidence, source, context, and action labels for known heuristic events", () => {
    const alert = normalizeAdminModerationSecurityAlert("alert-1", {
      userId: "user-1",
      username: "viewer",
      reason: "screenshot_hotkey",
      source: "protected_viewer",
      pagePath: "/dashboard/viewer",
      dropId: "drop-1234567890",
      timestamp: "2026-04-30T12:00:00.000Z",
      repeatCount: "2",
    });

    expect(alert.confidence).toBe("heuristic");
    expect(alert.accuracyLabel).toBe("Needs review");
    expect(alert.falsePositiveRisk).toBe("high");
    expect(alert.riskTier).toBe("low");
    expect(alert.riskScore).toBeLessThanOrEqual(5);
    expect(alert.recommendedAction).toBe("Do not act on this alone. Monitor for repeats or stronger signals.");
    expect(alert.sourceVerified).toBe(true);
    expect(alert.sourceLabel).toBe("Server log");
    expect(alert.contextLabel).toContain("/dashboard/viewer");
    expect(alert.contextLabel).toContain("Drop drop-1...7890");
    expect(alert.actionLabel).toBe("Do not act on this alone. Monitor for repeats or stronger signals.");
    expect(alert.timestamp).toBe(Date.parse("2026-04-30T12:00:00.000Z"));
    expect(alert.evidenceCount).toBe(2);
  });

  it("does not pretend unknown alert reasons are high-confidence detections", () => {
    const alert = normalizeAdminModerationSecurityAlert("alert-unknown", {
      userId: "user-1",
      reason: "new_unmapped_signal",
      label: "Unmapped browser signal",
      message: "Raw security signal",
      timestamp: 100,
    });

    expect(alert.confidence).toBe("unknown");
    expect(alert.accuracyLabel).toBe("Source unknown");
    expect(alert.falsePositiveRisk).toBe("unknown");
    expect(alert.priorityLabel).toBe("Check");
    expect(alert.actionLabel).toBe("Check the raw log before acting.");
  });

  it("clusters only same user/object/security bursts in a short window", () => {
    const first = normalizeAdminModerationSecurityAlert("first", {
      userId: "user-1",
      reason: "confirmed_save_shortcut",
      source: "protected_viewer",
      dropId: "drop-a",
      pagePath: "/dashboard/viewer",
      timestamp: 600_000,
    });
    const second = normalizeAdminModerationSecurityAlert("second", {
      userId: "user-1",
      reason: "confirmed_save_shortcut",
      source: "protected_viewer",
      dropId: "drop-a",
      pagePath: "/dashboard/viewer",
      timestamp: 601_000,
    });
    const differentDrop = normalizeAdminModerationSecurityAlert("different-drop", {
      userId: "user-1",
      reason: "confirmed_save_shortcut",
      source: "protected_viewer",
      dropId: "drop-b",
      pagePath: "/dashboard/viewer",
      timestamp: 602_000,
    });

    const clustered = clusterAdminModerationSecurityAlerts([first, second, differentDrop]);

    expect(clustered).toHaveLength(2);
    expect(clustered.find((alert) => alert.dropId === "drop-a")?.repeatCount).toBe(2);
    expect(clustered.find((alert) => alert.dropId === "drop-b")?.repeatCount).toBe(1);
  });
});
