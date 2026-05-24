import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { DEVICE_VIEWPORT_QUERIES } from "@/lib/device-layout-contract";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("device breakpoint contract cleanup", () => {
  it("keeps compact viewport behavior but sources the media query from the device contract", () => {
    expect(DEVICE_VIEWPORT_QUERIES.compact).toBe("(max-width: 767px)");

    const hook = read("src/hooks/useCompactViewport.ts");
    const chatShell = read("src/components/Chat/ChatRouteShell.tsx");

    expect(hook).toContain("DEVICE_VIEWPORT_QUERIES");
    expect(hook).not.toContain('COMPACT_VIEWPORT_QUERY = "(max-width: 767px)"');
    expect(chatShell).toContain("DEVICE_VIEWPORT_QUERIES.compact");
    expect(chatShell).not.toContain('window.matchMedia("(max-width: 767px)")');
  });
});
