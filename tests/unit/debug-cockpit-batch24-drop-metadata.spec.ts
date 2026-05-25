import { describe, expect, it } from "vitest";

import {
  buildDebugCockpitBatch24DropMetadataReport,
  validateDebugCockpitBatch24DropMetadataReport,
} from "@/lib/debug/debug-cockpit-batch24-drop-metadata";

describe("debug cockpit batch24 drop metadata", () => {
  it("reports scheduler parsing and queue metadata enrichment cleanup", () => {
    const report = buildDebugCockpitBatch24DropMetadataReport();

    expect(report.unknownDropRowsBefore).toBeGreaterThan(report.unknownDropRowsAfter);
    expect(report.schedulerKeysParsed).toBe(report.validDropIdRows);
    expect(report.scheduledUtcUnknownAfter).toBe(0);
    expect(report.sentOutcomes).toBeGreaterThan(0);
    expect(report.failedOutcomes).toBe(0);
    expect(report.boundedLookupUsed).toBe(true);
    expect(report.broadDropReadsUsed).toBe(false);
    expect(validateDebugCockpitBatch24DropMetadataReport(report)).toEqual([]);
  });
});
