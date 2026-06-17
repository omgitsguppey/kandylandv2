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
const typesSource = readFileSync(
  join(process.cwd(), "src/app/admin/economy/components/types.ts"),
  "utf8",
);

describe("admin economy local fixture boundary", () => {
  it("labels local admin UI fixture economy evidence as source_missing", () => {
    expect(consoleSource).toContain("isAdminUiTestSessionUser(user)");
    expect(consoleSource).toContain('data-admin-economy-fixture-boundary="true"');
    expect(consoleSource).toContain('data-admin-economy-fixture-state="source_missing"');
    expect(consoleSource).toContain("Economy evidence is source_missing here");
    expect(consoleSource).toContain("reviewing treasury, ledger, balance, provider, or reconciliation samples");
    expect(stripSource).toContain('data-admin-economy-strip-source-state={sourceState}');
    expect(stripSource).toContain('export type PlatformEconomyStripSourceState = "live" | "review" | "collecting" | "failed" | "source_missing"');
  });

  it("skips protected economy route reads in fixture mode", () => {
    const fixtureBranch = consoleSource.indexOf("if (isLocalAdminUiTestSession) {");
    const economyFetch = consoleSource.indexOf("const response = await authFetch(url);");

    expect(fixtureBranch).toBeGreaterThan(-1);
    expect(economyFetch).toBeGreaterThan(fixtureBranch);
    expect(consoleSource).toContain("setState(createSourceMissingState())");
    expect(consoleSource).toContain("getTreasuryStripSourceState(state.treasury, isLocalAdminUiTestSession)");
    expect(consoleSource).toContain("sourceState={treasuryStripSourceState}");
    expect(consoleSource).toContain("Treasury evidence is source_missing in local review");
    expect(consoleSource).toContain("Economy warnings are source_missing in local review.");
  });

  it("keeps treasury source warnings visible without broken encoded copy", () => {
    expect(consoleSource).toContain("summarizeSourceWarnings(row.sourceWarnings)");
    expect(consoleSource).toContain("paid-source");
    expect(consoleSource).toContain("reward/free");
    expect(typesSource).toContain("row.sourceWarnings.forEach");
    expect(`${consoleSource}\n${stripSource}`).not.toMatch(/[ÂâÃ]/u);
  });
});
