import { describe, expect, it } from "vitest";

import {
  DELETE_ACCOUNT_RETENTION_STAGES,
  DELETE_ACCOUNT_RETENTION_TARGETS,
  validateDeleteAccountRetentionPolicy,
} from "@/lib/privacy-data/delete-account-retention-policy";

describe("delete account retention policy", () => {
  it("defines every delete stage and keeps ledger/security retention explicit", () => {
    expect(validateDeleteAccountRetentionPolicy()).toEqual([]);
    expect(DELETE_ACCOUNT_RETENTION_STAGES).toEqual(
      expect.arrayContaining(["requested", "verified", "data_delete_queue", "retain_ledger_required", "retain_security_required", "completed"]),
    );
    expect(DELETE_ACCOUNT_RETENTION_TARGETS.some((target) => target.deleteEligibility === "retain_ledger")).toBe(true);
    expect(DELETE_ACCOUNT_RETENTION_TARGETS.some((target) => target.deleteEligibility === "retain_security")).toBe(true);
  });

  it("removes push tokens, anonymizes behavioral data, and redacts admin debug references", () => {
    const notification = DELETE_ACCOUNT_RETENTION_TARGETS.find((target) => target.targetKey === "notification_push_tokens");
    const behavioral = DELETE_ACCOUNT_RETENTION_TARGETS.find((target) => target.targetKey === "behavioral_journey_records");
    const debug = DELETE_ACCOUNT_RETENTION_TARGETS.find((target) => target.targetKey === "admin_debug_references");

    expect(notification?.deleteAction).toContain("revoke");
    expect(behavioral?.deleteEligibility).toBe("anonymize");
    expect(debug?.deleteAction).toContain("redact");
  });
});
