import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const UI_DEBUG_SOURCE = readFileSync(
  join(__dirname, "../../src/components/UIDebug.tsx"),
  "utf-8",
);

describe("UIDebug dev instrumentation policy", () => {
  it("keeps heavy browser audit tools opt-in during development", () => {
    expect(UI_DEBUG_SOURCE).toContain("NEXT_PUBLIC_ENABLE_UI_DEBUG_TOOLS");
    expect(UI_DEBUG_SOURCE).toContain('process.env.NEXT_PUBLIC_ENABLE_UI_DEBUG_TOOLS === "1"');
    expect(UI_DEBUG_SOURCE).toContain("if (!ENABLE_UI_DEBUG_TOOLS || process.env.NODE_ENV === \"production\" || !mounted)");
  });

  it("does not load axe or React Scan unless the opt-in gate is enabled", () => {
    expect(UI_DEBUG_SOURCE).toContain("ENABLE_UI_DEBUG_TOOLS && process.env.NODE_ENV !== \"production\"");
    expect(UI_DEBUG_SOURCE).toContain("@axe-core/react");
    expect(UI_DEBUG_SOURCE).toContain("https://unpkg.com/react-scan/dist/auto.global.js");
  });
});
