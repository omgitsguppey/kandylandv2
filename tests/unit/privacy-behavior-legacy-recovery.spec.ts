import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  PRIVACY_BEHAVIOR_LEGACY_RECOVERY_START_DATE,
  buildPrivacyBehaviorLegacyRecoveryPlan,
} from "@/lib/legacy/privacy-behavior-legacy-recovery";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("privacy behavior legacy recovery", () => {
  it("maps March 1+ privacy and behavior legacy records without promoting unknown consent or orphaned data", () => {
    const plan = buildPrivacyBehaviorLegacyRecoveryPlan({
      records: [
        {
          legacyId: "before-window",
          legacyClass: "legacy_user_behavior_probable",
          legacySource: "analytics_event_facts",
          timestampMs: Date.parse("2026-02-28T23:59:59.000Z"),
          fields: { eventName: "creator_profile_viewed", userId: "user-old" },
        },
        {
          legacyId: "unknown-consent",
          legacyClass: "legacy_consent_unknown",
          legacySource: "legacy_cookie_banner_state",
          timestampMs: Date.parse("2026-03-01T00:00:00.000Z"),
          fields: { consentMode: "unknown", anonymousVisitorId: "guest-1" },
        },
        {
          legacyId: "probable-user-behavior",
          legacyClass: "legacy_user_behavior_probable",
          legacySource: "analytics_event_facts",
          timestampMs: Date.parse("2026-03-02T00:00:00.000Z"),
          fields: { eventName: "creator_profile_viewed", userId: "user-1", sessionId: "session-1" },
        },
        {
          legacyId: "orphaned-guest-session",
          legacyClass: "orphaned_guest_session",
          legacySource: "analytics_guest_batches",
          timestampMs: Date.parse("2026-03-03T00:00:00.000Z"),
          fields: { sessionId: "session-orphan", anonymousVisitorId: "guest-orphan" },
        },
        {
          legacyId: "orphaned-materialized-metric",
          legacyClass: "orphaned_materialized_metric",
          legacySource: "analytics_users_rollup",
          timestampMs: Date.parse("2026-03-04T00:00:00.000Z"),
          fields: { metricId: "profile_views", userId: "user-1", count: 4 },
        },
      ],
    });

    expect(PRIVACY_BEHAVIOR_LEGACY_RECOVERY_START_DATE).toBe("2026-03-01");
    expect(plan.mode).toBe("dry_run_only");
    expect(plan.readsProduction).toBe(false);
    expect(plan.liveBackfill).toBe(false);
    expect(plan.mutationsAllowed).toBe(false);
    expect(plan.records).toHaveLength(4);

    expect(plan.records.find((record) => record.legacyId === "unknown-consent")).toMatchObject({
      normalizedCategory: "legacy_consent_unknown",
      confidence: "unknown",
      duplicateRisk: "high",
      consentAssumption: "unknown_consent_treat_as_necessary_only",
      action: "archive_only",
      currentTruthEligible: false,
      requiresUserConfirmation: true,
    });
    expect(plan.records.find((record) => record.legacyId === "unknown-consent")?.candidateNormalizedRecord).toMatchObject({
      consentMode: "necessary_only",
      consentSource: "legacy_default",
    });
    expect(plan.records.find((record) => record.legacyId === "unknown-consent")?.forbiddenUsage).toEqual(expect.arrayContaining([
      "full_behavioral_tracking",
      "person_level_behavior",
      "current_truth",
    ]));

    expect(plan.records.find((record) => record.legacyId === "probable-user-behavior")).toMatchObject({
      normalizedCategory: "behavior_event",
      confidence: "probable",
      duplicateRisk: "medium",
      action: "normalize_candidate",
      currentTruthEligible: false,
    });
    expect(plan.records.find((record) => record.legacyId === "orphaned-materialized-metric")).toMatchObject({
      normalizedCategory: "orphaned_materialized_metric",
      action: "archive_only",
      currentTruthEligible: false,
    });
    expect(plan.summary.currentTruthEligibleCount).toBe(0);
    expect(plan.summary.orphanCountsByClass.orphaned_guest_session).toBe(1);
    expect(plan.summary.orphanCountsByClass.orphaned_materialized_metric).toBe(1);
    expect(plan.adminDebugVisibility.cannotSafelyRecover).toEqual(expect.arrayContaining([
      "legacy_consent_unknown",
      "orphaned_materialized_metric",
    ]));
  });

  it("wires recovery into admin/debug generated report visibility and blocks mutation-capable code paths", () => {
    const recoverySource = read("src/lib/legacy/privacy-behavior-legacy-recovery.ts");
    const controlTower = read("src/lib/admin-debug-control-tower.ts");
    const validator = read("scripts/agent/validate-privacy-behavior-legacy-recovery.ts");

    expect(controlTower).toContain("privacy-behavior-legacy-recovery.generated.json");
    expect(controlTower).toContain("npm run check:privacy-behavior-legacy-recovery");
    expect(validator).toContain("protectedChanges");
    expect(recoverySource).not.toMatch(/firebase-admin|adminDb|writeBatch|runTransaction|\.set\s*\(|\.update\s*\(|\.delete\s*\(|fetch\s*\(/u);
  });
});
