import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("design system drift launch contracts", () => {
  it("keeps central admin badges on the launch palette with overflow containment", () => {
    const source = read("src/components/Admin/AdminStatusBadge.tsx");

    expect(source).toContain("LAUNCH_BADGE_CONTAINMENT_CLASSNAME");
    expect(source).toContain("border-brand-purple/30 bg-brand-purple/10");
    expect(source).toContain("border-gray-500/30 bg-gray-500/10");
    expect(source).not.toContain("cyan-");
    expect(source).not.toContain("sky-");
    expect(source).not.toContain("slate-");
  });

  it("keeps drop and preview badges contained without fake interactive affordance", () => {
    const dropCardParts = read("src/components/DropCardParts.tsx");
    const previewModal = read("src/components/DropPreviewModal.tsx");

    expect(dropCardParts).toContain("LAUNCH_BADGE_CONTAINMENT_CLASSNAME");
    expect(dropCardParts).toContain("LAUNCH_STATIC_BADGE_CLASSNAME");
    expect(previewModal).toContain("LAUNCH_BADGE_CONTAINMENT_CLASSNAME");
    expect(previewModal).toContain("LAUNCH_STATIC_BADGE_CLASSNAME");
  });

  it("keeps countdown timers on inherited site typography and final-day copy contract", () => {
    const dropCardParts = read("src/components/DropCardParts.tsx");
    const countdown = read("src/lib/drop-countdown.ts");

    expect(dropCardParts).not.toContain("font-mono");
    expect(dropCardParts).toContain("aria-live=\"off\"");
    expect(countdown).toContain("if (msLeft > DROP_COUNTDOWN_ONE_DAY_MS)");
    expect(countdown).toContain("visibleLabel: formatCountdownClock(msLeft)");
  });

  it("keeps admin chart colors in shared design-system tokens", () => {
    const helper = read("src/lib/design-system.ts");
    const charts = read("src/components/Admin/AdminAnalyticsCharts.tsx");

    expect(helper).toContain("KANDYDROPS_CHART_COLORS");
    expect(charts).toContain("KANDYDROPS_CHART_COLORS.grid");
    expect(charts).toContain("KANDYDROPS_CHART_COLORS.axis");
    expect(charts).toContain("KANDYDROPS_CHART_COLORS.legend");
    expect(charts).not.toContain("stroke=\"#6b7280\"");
    expect(charts).not.toContain("color: \"#9ca3af\"");
  });

  it("records the launch audit and validation gate", () => {
    const audit = JSON.parse(read("agent/state/design-system-drift-audit.generated.json")) as {
      issues: { id: string }[];
    };

    expect(audit.issues.map((issue) => issue.id)).toEqual(
      expect.arrayContaining(["DSD-001", "DSD-002", "DSD-003", "DSD-004", "DSD-008"]),
    );
    expect(read("docs/agent-truth/design-system-drift.md")).toContain("Drop timers inherit the site font");
    expect(read("package.json")).toContain("\"check:design-system-drift\"");
  });
});
