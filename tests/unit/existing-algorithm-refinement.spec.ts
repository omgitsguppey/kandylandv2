import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  REQUIRED_EXISTING_ALGORITHM_LANES,
  buildExistingAlgorithmRefinementReport,
  validateExistingAlgorithmRefinementReport,
} from "../../scripts/agent/validate-existing-algorithm-refinement";
import { DEFAULT_CREATOR_SETTINGS } from "../../src/lib/creator-experiences";
import { resolveCreatorPublicExperienceState } from "../../src/lib/creator-public-pages";
import { resolveDropLifecycleStatus } from "../../src/lib/drop-status";
import { assertNoDesktopStuffing } from "../../src/lib/ui/mobile-scale-contract";

const repoRoot = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("existing algorithm refinement", () => {
  it("maps every existing algorithm lane without inventing a competing system", () => {
    const report = buildExistingAlgorithmRefinementReport({
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      currentHead: "head",
      changedFiles: [],
      untrackedFiles: [],
      openPrs: [],
      fileContents: new Map(),
      packageJson: read("package.json"),
    });

    expect(report.algorithms.map((entry) => entry.name).sort()).toEqual([...REQUIRED_EXISTING_ALGORITHM_LANES].sort());
    expect(report.algorithms.every((entry) => entry.file && entry.consumers.length > 0)).toBe(true);
    expect(report.nextFixOrder.length).toBeGreaterThan(0);
    expect(validateExistingAlgorithmRefinementReport(report)).toEqual([]);
  });

  it("uses the creator pricing resolver for public creator experience summaries", () => {
    const source = read("src/lib/creator-public-pages.ts");
    expect(source).toContain("resolveCreatorPricing");
    expect(source).not.toContain("settings.subscriptionPriceGd || CREATOR_SUBSCRIPTION_MIN_GD");
    expect(source).not.toContain("CREATOR_BOOKING_RATES");

    const state = resolveCreatorPublicExperienceState({
      ...DEFAULT_CREATOR_SETTINGS,
      subscriptionsEnabled: true,
      subscriptionPriceGd: 900,
      bookingsEnabled: true,
      phoneRatePerMinuteGd: 700,
      videoRatePerMinuteGd: 1200,
      bookingMinimumMinutes: 3,
    }, 0);

    expect(state.summaryCards.find((card) => card.key === "subscriptions")).toMatchObject({
      label: "900 GD monthly",
      source: "creator_settings",
      paidOnly: true,
    });
    expect(state.summaryCards.find((card) => card.key === "bookings")).toMatchObject({
      label: "700/1200 GD per min",
      source: "creator_settings",
      paidOnly: true,
    });
  });

  it("resolves creator lifecycle status separately from public visibility", () => {
    const now = Date.UTC(2026, 4, 20);

    expect(resolveDropLifecycleStatus({ reviewStatus: "pending_admin_approval", status: "active" }, { audience: "creator", now }).status).toBe("pending");
    expect(resolveDropLifecycleStatus({ reviewStatus: "pending_admin_approval", status: "active" }, { audience: "public", now }).status).toBe("unavailable");
    expect(resolveDropLifecycleStatus({ reviewStatus: "needs_changes", status: "active" }, { audience: "creator", now }).status).toBe("needs_changes");
    expect(resolveDropLifecycleStatus({ reviewStatus: "rejected", status: "active" }, { audience: "creator", now }).status).toBe("rejected");
    expect(resolveDropLifecycleStatus({ reviewStatus: "approved", status: "active", validUntil: now - 1 }, { audience: "creator", now }).status).toBe("expired");
    expect(resolveDropLifecycleStatus({ reviewStatus: "approved", status: "active", publicDiscovery: false }, { audience: "public", now }).status).toBe("unavailable");
  });

  it("flags mobile desktop-stuffing thresholds through the shared density contract", () => {
    const result = assertNoDesktopStuffing({
      surface: "creator",
      moduleType: "manager",
      deviceBand: "mobile",
      className: "rounded-3xl p-6 text-3xl",
    });

    expect(result.ok).toBe(false);
    expect(result.failures.join("\n")).toContain("p-6");
    expect(result.failures.join("\n")).toContain("text-3xl");
  });

  it("fails reports that lose canonical drop, pricing, telemetry, or beta safeguards", () => {
    const report = buildExistingAlgorithmRefinementReport({
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      currentHead: "head",
      changedFiles: ["src/components/Chat/ChatExperience.tsx"],
      untrackedFiles: [],
      openPrs: [],
      packageJson: "{}",
      fileContents: new Map([
        ["src/lib/drop-status.ts", "export function resolveDropLifecycleStatus() { return 'active' }"],
        ["src/lib/creator-public-pages.ts", "settings.subscriptionPriceGd || CREATOR_SUBSCRIPTION_MIN_GD"],
        ["src/lib/analytics/client-tracking-policy.ts", "behavior_signal"],
        ["src/lib/agent-score/core.ts", "source_ready runtime_proven"],
        ["src/lib/ui/mobile-scale-contract.ts", "p-8 text-4xl"],
      ]),
    });

    const failures = validateExistingAlgorithmRefinementReport(report);
    expect(failures).toContain("protected chat files changed.");
    expect(failures).toContain("drop status resolver is missing required lifecycle states.");
    expect(failures).toContain("creator pricing resolver is bypassed by a user-facing experience flow.");
    expect(failures).toContain("telemetry classifier ignores disabled/enabled state.");
    expect(failures).toContain("check:existing-algorithm-refinement package script is missing.");
  });
});
