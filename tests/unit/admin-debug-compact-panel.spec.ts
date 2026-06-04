import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("admin debug compact panel", () => {
  it("keeps the top debug console to one status strip and one collapsed evidence drawer", () => {
    const page = read("src/app/admin/debug/page.tsx");

    expect(page).toContain('data-admin-debug-summary="compact"');
    expect(page).toContain('data-admin-debug-detail-density="single_evidence_drawer"');
    expect(page).toContain("detailItems");
    expect(page).toContain("sourceStateLabel");
    expect(page).not.toContain("import { StatCard }");
    expect(page).not.toContain("<StatCard");
    expect(page).not.toContain(">Live</span>");
  });

  it("keeps tracking and source-heavy debug lanes behind the collapsed Now drilldown", () => {
    const page = read("src/app/admin/debug/page.tsx");
    const nowTab = read("src/app/admin/debug/components/DebugTabNow.tsx");

    expect(page).toContain('data-admin-debug-sprawl-reduction="target-75-95"');
    expect(page).not.toContain("<DebugTrackingSummaryPanel trackingSummary={data?.trackingSummary} />");
    expect(page).toContain("trackingSummary={data?.trackingSummary}");

    expect(nowTab).toContain("trackingSummary");
    expect(nowTab).toContain("<DebugTrackingSummaryPanel trackingSummary={trackingSummary} />");
    expect(nowTab).toContain('data-admin-debug-now-density="single_drilldown_drawer"');
    expect(nowTab).toContain('data-admin-debug-source-heavy-default="collapsed"');
  });
});
