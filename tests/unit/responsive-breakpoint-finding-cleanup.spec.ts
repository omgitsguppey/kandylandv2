import { describe, expect, it } from "vitest";

import {
  buildResponsiveBreakpointFindingCleanupReport,
  validateResponsiveBreakpointFindingCleanupReport,
} from "../../scripts/agent/debug-cockpit-batch11-shared";

describe("responsive breakpoint finding cleanup", () => {
  it("maps safe breakpoints and classifies the global admin shell breakpoint", () => {
    const report = buildResponsiveBreakpointFindingCleanupReport();

    expect(report.breakpointFindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          filePath: "src/app/admin/ai/components/AdminAiReviewgallerySection.tsx",
          classification: "mapped_to_device_contract",
        }),
        expect.objectContaining({
          filePath: "src/app/faq/page.tsx",
          classification: "mapped_to_device_contract",
        }),
        expect.objectContaining({
          filePath: "src/app/globals.css",
          classification: "intentional_design_exception",
        }),
      ]),
    );
    expect(validateResponsiveBreakpointFindingCleanupReport(report)).toEqual([]);
  });
});
