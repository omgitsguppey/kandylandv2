import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const WIRED_SURFACES = [
  "src/components/Creators/CreatorExperiencesPanel.tsx",
  "src/components/Creators/CreatorRequestsManager.tsx",
  "src/components/Creators/CreatorBookingsManager.tsx",
  "src/components/Creators/CreatorFanPassManager.tsx",
  "src/components/Creators/CreatorBroadcastManager.tsx",
  "src/components/PurchaseModal.tsx",
];

describe("human error surface wiring", () => {
  it("uses the client human-error adapter in wired user and creator surfaces", () => {
    for (const path of WIRED_SURFACES) {
      const source = readSource(path);
      expect(source, path).toContain("resolveClientActionError");
      expect(source, path).toContain("HumanErrorNotice");
    }
  });

  it("does not render raw error.message or String(error) in wired visible UI", () => {
    for (const path of WIRED_SURFACES) {
      const source = readSource(path);
      expect(source, path).not.toMatch(/toast\.error\([^)]*error\.message/u);
      expect(source, path).not.toMatch(/>\s*\{\s*[^}]*error\.message[^}]*\}\s*</u);
      expect(source, path).not.toContain("String(error)");
    }
  });

  it("keeps bug reward copy on reward GumDrops only", () => {
    const noticeSource = readSource("src/components/errors/HumanErrorNotice.tsx");

    expect(noticeSource).toContain("reward GumDrops added");
    expect(noticeSource).not.toContain("purchased GumDrops added");
  });
});
