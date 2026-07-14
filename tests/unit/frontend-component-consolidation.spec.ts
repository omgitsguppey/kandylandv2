import { describe, expect, it } from "vitest";

import {
  buildFrontendComponentConsolidationReport,
  buildFrontendSurfaceInventoryReport,
  classifyFrontendConsolidationDirtyFile,
  compactFrontendConsolidationDirtyClassifications,
  validateFrontendComponentConsolidationReport,
} from "@/lib/frontend-hardening/frontend-surface-inventory";

describe("frontend component consolidation", () => {
  it("inventories major client surfaces without backend route ownership overlap", () => {
    const report = buildFrontendSurfaceInventoryReport({ currentHead: "test-head" });

    expect(report.majorSurfacesAudited).toBeGreaterThanOrEqual(16);
    expect(report.entries.map((entry) => entry.surfaceId)).toContain("chat");
    expect(report.entries.map((entry) => entry.surfaceId)).toContain("admin_debug");
    expect(report.forbiddenOverlapPaths).toEqual([]);
    expect(report.entries.some((entry) => entry.componentPaths.length > 0)).toBe(true);
  });

  it("keeps the consolidation report compact and classifies bloat without unsafe unknowns", () => {
    const report = buildFrontendComponentConsolidationReport({ currentHead: "test-head" });
    const validation = validateFrontendComponentConsolidationReport(report);

    expect(report.componentsAudited).toBeGreaterThan(100);
    expect(report.bloatedComponentsFound.length).toBeGreaterThan(0);
    expect(report.componentsConsolidated).toContain("component bloat now routes through frontend surface inventory");
    expect(validation.failures).toEqual([]);
  }, 20_000);

  it("separates known cross-lane work from genuinely unknown dirty paths", () => {
    expect(classifyFrontendConsolidationDirtyFile("src/app/api/chat/attachments/cancel/route.ts"))
      .toBe("real_source_change_needs_review");
    expect(classifyFrontendConsolidationDirtyFile("tests/unit/chat-attachments-route.spec.ts"))
      .toBe("test_change_needs_review");
    expect(classifyFrontendConsolidationDirtyFile("functions/src/user-index-materializer-schedule.ts"))
      .toBe("function_source_change_needs_separate_review");
    expect(classifyFrontendConsolidationDirtyFile("apphosting.yaml"))
      .toBe("configuration_change_needs_separate_review");
    expect(classifyFrontendConsolidationDirtyFile("agent/prompts/task-prompt.standard.md"))
      .toBe("generated_context_noise_leave_unstaged");
    expect(classifyFrontendConsolidationDirtyFile("agent/schemas/repo-inventory.schema.json"))
      .toBe("tooling_change_needs_separate_review");
    expect(classifyFrontendConsolidationDirtyFile("scripts\\local-exe\\KandyDropsLauncher.cs"))
      .toBe("tooling_change_needs_separate_review");

    expect(classifyFrontendConsolidationDirtyFile(".env.production"))
      .toBe("unsafe_unknown");
    expect(classifyFrontendConsolidationDirtyFile("unowned-root-artifact.bin"))
      .toBe("unsafe_unknown");
  });

  it("keeps generated dirty-tree evidence bounded without hiding unsafe or owning-lane paths", () => {
    const classifications = Object.fromEntries([
      ["src/lib/frontend-hardening/frontend-surface-inventory.ts", "real_source_change_needs_review"],
      ["unowned-root-artifact.bin", "unsafe_unknown"],
      ...Array.from({ length: 20 }, (_, index) => [
        `docs/archive/report-${String(index).padStart(2, "0")}.md`,
        "documentation_change_needs_separate_review",
      ]),
    ]);
    const compact = compactFrontendConsolidationDirtyClassifications(classifications, 5);

    expect(compact.total).toBe(22);
    expect(compact.retained).toBe(5);
    expect(compact.omitted).toBe(17);
    expect(compact.summary).toEqual({
      documentation_change_needs_separate_review: 20,
      real_source_change_needs_review: 1,
      unsafe_unknown: 1,
    });
    expect(compact.classifications).toMatchObject({
      "src/lib/frontend-hardening/frontend-surface-inventory.ts": "real_source_change_needs_review",
      "unowned-root-artifact.bin": "unsafe_unknown",
    });
  });

  it("retains every unsafe path even when the safety evidence exceeds the display limit", () => {
    const compact = compactFrontendConsolidationDirtyClassifications({
      "unknown-a.bin": "unsafe_unknown",
      "unknown-b.bin": "unsafe_unknown",
      "unknown-c.bin": "unsafe_unknown",
      "src/app/page.tsx": "real_source_change_needs_review",
    }, 2);

    expect(compact.classifications).toEqual({
      "unknown-a.bin": "unsafe_unknown",
      "unknown-b.bin": "unsafe_unknown",
      "unknown-c.bin": "unsafe_unknown",
    });
    expect(compact.retained).toBe(3);
    expect(compact.omitted).toBe(1);
  });
});
