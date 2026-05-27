import { describe, expect, it } from "vitest";

import {
  SUPPORT_ACCOUNT_SAFETY_CATEGORIES,
  validateSupportAccountSafetyConsolidation,
} from "@/lib/privacy-data/support-account-safety-contract";

describe("support account safety consolidation", () => {
  it("maps every support category to privacy, retention, redaction, owner, telemetry, and user copy", () => {
    expect(validateSupportAccountSafetyConsolidation()).toEqual([]);
    expect(SUPPORT_ACCOUNT_SAFETY_CATEGORIES.map((entry) => entry.category)).toEqual(
      expect.arrayContaining(["bug_report", "account_delete_request", "data_export_request", "payment_issue", "privacy_request"]),
    );
    for (const entry of SUPPORT_ACCOUNT_SAFETY_CATEGORIES) {
      expect(entry.privacyClass).toBeTruthy();
      expect(entry.retentionClass).toBeTruthy();
      expect(entry.redaction).toBeTruthy();
      expect(entry.userCopy).not.toContain("Internal server error");
    }
  });

  it("keeps payment, auth, and privacy support issues redacted in admin summaries", () => {
    const sensitive = SUPPORT_ACCOUNT_SAFETY_CATEGORIES.filter((entry) => ["payment_issue", "auth_issue", "privacy_request"].includes(entry.category));

    expect(sensitive.every((entry) => entry.adminVisibility === "redacted_summary")).toBe(true);
  });
});
