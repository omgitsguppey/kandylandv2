import { describe, expect, it } from "vitest";

import {
  buildCanonicalEventEnvelopeFixture,
  buildCanonicalUserFixture,
} from "../../src/lib/testing/canonical-test-factories";
import {
  buildTestFixtureInventoryReport,
  validateTestFixtureInventoryReport,
} from "../../src/lib/test-hardening/test-fixture-inventory";

describe("test fixture inventory", () => {
  it("classifies fixtures against canonical production contracts", () => {
    const report = buildTestFixtureInventoryReport();
    const validation = validateTestFixtureInventoryReport(report);

    expect(report.fixturesAudited).toBeGreaterThan(10);
    expect(report.canonicalFactories).toContain("buildCanonicalEventEnvelopeFixture");
    expect(report.unsafeUnknowns).toBe(0);
    expect(report.mockEvidenceClasses).toContain("fixture_only");
    expect(validation.ok).toBe(true);
  });

  it("uses deterministic canonical fixture factories", () => {
    const user = buildCanonicalUserFixture();
    const envelope = buildCanonicalEventEnvelopeFixture();

    expect(user.uid).toBe("test-user-1");
    expect(user.email).toBeNull();
    expect(envelope.eventId).toBe("test-event-1");
    expect(envelope.privacyClass).toBe("minimal_product");
    expect(envelope.includeInUserBehavior).toBe(true);
  });
});
