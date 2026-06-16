import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const consoleSource = readFileSync(
  join(process.cwd(), "src/app/admin/economy/components/PlatformEconomyConsole.tsx"),
  "utf8",
);
const stripSource = readFileSync(
  join(process.cwd(), "src/app/admin/economy/components/PlatformEconomyStrip.tsx"),
  "utf8",
);

describe("admin economy local fixture boundary", () => {
  it("labels local admin UI fixture economy evidence as source_missing", () => {
    expect(consoleSource).toContain("isAdminUiTestSessionUser(user)");
    expect(consoleSource).toContain('data-admin-economy-fixture-boundary="true"');
    expect(consoleSource).toContain('data-admin-economy-fixture-state="source_missing"');
    expect(consoleSource).toContain("Economy layout is inspectable");
    expect(consoleSource).toContain("treasury, ledger, balance, provider, and reconciliation samples remain source_missing");
    expect(stripSource).toContain('data-admin-economy-strip-source-state={sourceState}');
    expect(stripSource).toContain('sourceState?: "live" | "source_missing"');
  });

  it("skips protected economy route reads in fixture mode", () => {
    const fixtureBranch = consoleSource.indexOf("if (isLocalAdminUiTestSession) {");
    const economyFetch = consoleSource.indexOf("const response = await authFetch(url);");

    expect(fixtureBranch).toBeGreaterThan(-1);
    expect(economyFetch).toBeGreaterThan(fixtureBranch);
    expect(consoleSource).toContain("setState(createSourceMissingState())");
    expect(consoleSource).toContain('sourceState={isLocalAdminUiTestSession ? "source_missing" : "live"}');
    expect(consoleSource).toContain("Treasury source_missing in local UI review");
    expect(consoleSource).toContain("Economy warnings are source_missing in local UI review.");
  });
});
