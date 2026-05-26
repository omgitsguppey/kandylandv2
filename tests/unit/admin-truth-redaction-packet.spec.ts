import { describe, expect, it } from "vitest";

import {
  buildAdminTruthRedactionPacketReport,
  buildReleaseReadinessContext,
  validateAdminTruthRedactionPacketReport,
} from "@/lib/release-readiness/final-release-readiness";

describe("admin truth redaction packet", () => {
  it("defines a redaction-only packet and keeps formal sample proof missing", () => {
    const context = buildReleaseReadinessContext(process.cwd(), { currentHead: "head", openPrs: [], artifacts: [], dirtyFiles: [] });
    const report = buildAdminTruthRedactionPacketReport(context);

    expect(report.environment).toBe("source_schema_only_no_production_read");
    expect(report.redactionPolicy.forbiddenRawFields).toContain("email");
    expect(report.missingFormalProof).toContain("redacted production admin truth sample");
    expect(validateAdminTruthRedactionPacketReport(report)).toEqual([]);
  });
});
