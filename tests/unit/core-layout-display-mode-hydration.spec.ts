import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("CoreLayoutWrapper display mode hydration", () => {
  it("matches server markup before detecting browser display mode after mount", () => {
    const source = readFileSync("src/components/CoreLayoutWrapper.tsx", "utf8");

    expect(source).toContain('useState<DeviceDisplayMode>("unknown")');
    expect(source).toContain("setDisplayMode(detectDeviceDisplayMode())");
    expect(source).not.toContain('useState<DeviceDisplayMode>(() => typeof window === "undefined" ? "unknown" : detectDeviceDisplayMode())');
    expect(source).toContain("data-display-mode={displayMode}");
  });
});
