import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildGlobalMarqueeTruncatedTitlesReport,
  validateGlobalMarqueeTruncatedTitlesReport,
} from "../../scripts/agent/validate-global-marquee-truncated-titles";

const repoRoot = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("global truncated title marquee rollout", () => {
  it("shares the existing drop marquee implementation through MarqueeText", () => {
    const marquee = read("src/components/ui/MarqueeText.tsx");
    const titleMarquee = read("src/components/ui/TitleMarquee.tsx");
    const globals = read("src/app/globals.css");

    expect(marquee).toContain("title-marquee-active");
    expect(marquee).toContain("onlyWhenTruncated");
    expect(titleMarquee).toContain("MarqueeText");
    expect(titleMarquee).not.toContain("ResizeObserver");
    expect(globals).toContain("@media (prefers-reduced-motion: reduce)");
    expect(globals).toContain(".title-marquee-active");
  });

  it("uses the shared marquee on title/name surfaces without touching body copy", () => {
    const creatorTimeline = read("src/components/Creators/CreatorProfileTimelineFeed.tsx");
    const creatorDrops = read("src/components/Creators/CreatorDropManager.tsx");
    const fanPassRow = read("src/components/Creators/FanPassSubscriberRow.tsx");
    const adminOps = read("src/components/Admin/AdminAiDescriptionOperations.tsx");
    const topDrops = read("src/components/Admin/TopDropsTable.tsx");

    expect(creatorTimeline).toContain("MarqueeText");
    expect(creatorTimeline).toContain("item.title");
    expect(creatorDrops).toContain("MarqueeText");
    expect(creatorDrops).toContain("drop.title");
    expect(fanPassRow).toContain("MarqueeText");
    expect(fanPassRow).toContain("fanLabel");
    expect(adminOps).toContain("MarqueeText");
    expect(topDrops).toContain("MarqueeText");
    const marqueeLines = `${creatorTimeline}\n${creatorDrops}\n${fanPassRow}\n${adminOps}\n${topDrops}`
      .split(/\r?\n/u)
      .filter((line) => line.includes("MarqueeText"));
    expect(marqueeLines.join("\n")).not.toMatch(/\b(description|body|preview|copy|detail|subtitle)\b/u);
  });

  it("keeps protected navigation and chat surfaces out of the rollout report", () => {
    const report = buildGlobalMarqueeTruncatedTitlesReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      changedFiles: [
        "src/components/ui/MarqueeText.tsx",
        "src/components/ui/TitleMarquee.tsx",
        "src/components/Creators/CreatorDropManager.tsx",
      ],
      packageJson: '"check:global-marquee-truncated-titles"',
      fileContents: new Map([
        ["src/components/ui/MarqueeText.tsx", read("src/components/ui/MarqueeText.tsx")],
        ["src/components/ui/TitleMarquee.tsx", read("src/components/ui/TitleMarquee.tsx")],
        ["src/app/globals.css", read("src/app/globals.css")],
      ]),
    });

    expect(report.summary.protectedNavUntouched).toBe(true);
    expect(report.summary.protectedChatUntouched).toBe(true);
    expect(report.summary.sharedMarqueeComponentReady).toBe(true);
    expect(validateGlobalMarqueeTruncatedTitlesReport(report)).toEqual([]);
  });

  it("fails reports that animate body text or change protected surfaces", () => {
    const report = buildGlobalMarqueeTruncatedTitlesReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      changedFiles: [
        "src/components/Navigation/ProfileSidebar.tsx",
        "src/components/Chat/ChatExperience.tsx",
      ],
      packageJson: '"check:global-marquee-truncated-titles"',
      fileContents: new Map([
        ["src/components/ui/MarqueeText.tsx", "export function MarqueeText() { return null; }"],
        ["src/components/ui/TitleMarquee.tsx", "export function TitleMarquee() { return null; }"],
        ["src/app/globals.css", ""],
        ["src/components/Example.tsx", "<MarqueeText>{description}</MarqueeText>"],
      ]),
    });

    expect(validateGlobalMarqueeTruncatedTitlesReport(report)).toContain("protected nav/chat files changed by this pass.");
    expect(validateGlobalMarqueeTruncatedTitlesReport(report)).toContain("body or description text uses marquee.");
  });
});
