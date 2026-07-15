import { describe, expect, it } from "vitest";

import {
  validateGeneratedChildReportEvidence,
  validateGeneratedReportEnvelope,
  withGeneratedReportEnvelope,
} from "../../scripts/agent/generated-report-envelope";

const TEST_HEAD = "a".repeat(40);
const NOW_MS = Date.parse("2026-07-14T12:00:00.000Z");
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function passingChild() {
  return {
    reportKey: "child-report",
    generatedAtUtc: "2026-07-14T11:00:00.000Z",
    currentHead: TEST_HEAD,
    sourceCommit: TEST_HEAD,
    status: "pass",
    passed: true,
    canClearSourceGate: true,
    validationFailures: [],
  };
}

describe("generated child report evidence", () => {
  it("accepts an identified, current, fresh, coherent source child", () => {
    expect(validateGeneratedChildReportEvidence({
      report: passingChild(),
      expectedReportKey: "child-report",
      currentHead: TEST_HEAD,
      nowMs: NOW_MS,
      requireSourceGate: true,
    })).toEqual([]);
  });

  it("rejects wrong identity, contradictory provenance, stale failures, and a blocked source gate", () => {
    const failures = validateGeneratedChildReportEvidence({
      report: {
        ...passingChild(),
        reportKey: "other-report",
        currentHead: "b".repeat(40),
        sourceCommit: "c".repeat(40),
        generatedAtUtc: "2026-07-13T11:59:59.999Z",
        status: "fail",
        passed: false,
        canClearSourceGate: false,
        validationFailures: ["child failed"],
      },
      expectedReportKey: "child-report",
      currentHead: TEST_HEAD,
      nowMs: NOW_MS,
      requireSourceGate: true,
    });

    expect(failures).toEqual(expect.arrayContaining([
      "child-report child reportKey must be child-report.",
      "child-report child currentHead must match the current full Git SHA.",
      "child-report child sourceCommit must match currentHead.",
      `child-report child generatedAtUtc must be non-future and fresh within ${MAX_AGE_MS}ms.`,
      "child-report child status must be pass.",
      "child-report child validationFailures must be an explicit empty array.",
      "child-report child canClearSourceGate must be true.",
    ]));
  });

  it("rejects malformed reports and incoherent optional passed flags", () => {
    expect(validateGeneratedChildReportEvidence({
      report: null,
      expectedReportKey: "child-report",
      currentHead: TEST_HEAD,
    })).toEqual(["child-report child report must be an object."]);

    expect(validateGeneratedChildReportEvidence({
      report: { ...passingChild(), passed: "yes", validationFailures: "none" },
      expectedReportKey: "child-report",
      currentHead: TEST_HEAD,
      nowMs: NOW_MS,
    })).toEqual(expect.arrayContaining([
      "child-report child passed must be boolean when present.",
      "child-report child validationFailures must be an explicit empty array.",
    ]));
  });

  it("accepts the exact freshness boundary and rejects future evidence", () => {
    expect(validateGeneratedChildReportEvidence({
      report: { ...passingChild(), generatedAtUtc: new Date(NOW_MS - MAX_AGE_MS).toISOString() },
      expectedReportKey: "child-report",
      currentHead: TEST_HEAD,
      nowMs: NOW_MS,
      maxAgeMs: MAX_AGE_MS,
    })).toEqual([]);
    expect(validateGeneratedChildReportEvidence({
      report: { ...passingChild(), generatedAtUtc: new Date(NOW_MS + 1).toISOString() },
      expectedReportKey: "child-report",
      currentHead: TEST_HEAD,
      nowMs: NOW_MS,
    })).toContain(`child-report child generatedAtUtc must be non-future and fresh within ${MAX_AGE_MS}ms.`);
  });

  it("pins envelope sourceCommit to currentHead", () => {
    const report = withGeneratedReportEnvelope({ sourceCommit: "b".repeat(40) }, {
      reportKey: "child-report",
      status: "pass",
      generatedAtUtc: "2026-07-14T11:00:00.000Z",
      currentHead: TEST_HEAD,
      evidenceClass: "source_snapshot",
      canClearSourceGate: true,
      nextExactSteps: ["Keep source validation current."],
      validationFailures: [],
      doesNotProve: ["Does not prove runtime evidence."],
    });

    expect(report.currentHead).toBe(TEST_HEAD);
    expect(report.sourceCommit).toBe(TEST_HEAD);
    expect(validateGeneratedReportEnvelope(report)).toEqual([]);
    expect(validateGeneratedReportEnvelope({ ...report, sourceCommit: "b".repeat(40) })).toContain("sourceCommit must match currentHead");
  });
});
