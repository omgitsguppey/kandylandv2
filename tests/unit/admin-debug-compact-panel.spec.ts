import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("admin debug compact panel", () => {
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
