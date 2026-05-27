import { describe, expect, it } from "vitest";

import {
  ADMIN_REDACTION_DRILLDOWN_RULES,
  validateAdminRedactionDrilldownPolicy,
} from "@/lib/privacy-data/admin-redaction-drilldown-policy";

describe("admin redaction drilldown policy", () => {
  it("defaults admin panels to redacted summaries and requires audit reasons for raw drilldown", () => {
    expect(validateAdminRedactionDrilldownPolicy()).toEqual([]);
    expect(ADMIN_REDACTION_DRILLDOWN_RULES.every((rule) => rule.defaultAdminView === "redacted_summary")).toBe(true);
    expect(ADMIN_REDACTION_DRILLDOWN_RULES.every((rule) => rule.rawDrilldownRequires.auditReason === true)).toBe(true);
  });

  it("never shows tokens, provider ids, private media urls, storage paths, or chat content raw by default", () => {
    for (const rule of ADMIN_REDACTION_DRILLDOWN_RULES) {
      expect(rule.rawDefaultAllowed).toBe(false);
      expect(rule.summaryRedaction).toMatch(/redact|fingerprint|hide/iu);
    }
  });
});
