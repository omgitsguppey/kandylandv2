import { describe, expect, it } from "vitest";

import {
  CREATOR_DROP_4XX_CLASSES,
  CREATOR_DROP_4XX_POLICIES,
  getCreatorDrop4xxPolicy,
  isCreatorDrop4xxRetryable,
} from "@/lib/creator/drops/creator-drop-4xx-policy";

describe("creator drop 4xx policy", () => {
  it("covers the expected creator drop client error classes", () => {
    expect(CREATOR_DROP_4XX_CLASSES).toEqual(expect.arrayContaining([
      "creator_not_configured",
      "creator_permission_denied",
      "creator_status_conflict",
      "stale_creator_draft",
      "missing_creator_drop_id",
      "invalid_creator_drop_payload",
      "media_required",
      "media_access_denied",
      "approval_required",
      "admin_review_conflict",
      "expired_drop_unavailable",
      "unknown_legacy_drop",
      "suspicious_creator_request",
    ]));
  });

  it("makes permanent creator workflow errors non-retryable and readable", () => {
    for (const key of [
      "invalid_creator_drop_payload",
      "creator_permission_denied",
      "stale_creator_draft",
      "approval_required",
      "missing_creator_drop_id",
    ] as const) {
      const policy = getCreatorDrop4xxPolicy(key);
      expect(policy.retryable).toBe(false);
      expect(policy.safeCreatorCopy).not.toMatch(/raw|server|undefined/i);
      expect(policy.recoveryAction.length).toBeGreaterThan(8);
      expect(policy.diagnosticRollupFingerprint).toContain(key);
      expect(isCreatorDrop4xxRetryable(key)).toBe(false);
    }
  });

  it("keeps every policy tied to telemetry and diagnostic rollup", () => {
    for (const policy of CREATOR_DROP_4XX_POLICIES) {
      expect(policy.statusCode).toBeGreaterThanOrEqual(400);
      expect(policy.statusCode).toBeLessThan(500);
      expect(policy.telemetryEvent).toMatch(/creator_drop_submit_failed|admin_creator_drop/);
      expect(policy.diagnosticRollupFingerprint).toContain("{hour}");
    }
  });
});
