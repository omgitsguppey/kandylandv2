import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("module coverage UI cleanup", () => {
  it("renders required and optional modules separately with accepted substitutes", () => {
    const source = readFileSync("src/app/admin/debug/components/DebugAdvancedDataValidation.tsx", "utf8");

    expect(source).toContain("Required modules");
    expect(source).toContain("Optional modules");
    expect(source).toContain("Accepted sources");
    expect(source).toContain("Canonical gaps");
    expect(source).toContain("External optional gaps");
    expect(source).toContain("data-module-coverage-tier");
    expect(source).toContain("data-raw-validation-rows-default-open=\"false\"");
  });
});
