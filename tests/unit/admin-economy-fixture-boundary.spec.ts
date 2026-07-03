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
    expect(consoleSource).toContain("Economy source is not loaded here");
    expect(consoleSource).toContain("protected treasury, ledger, provider, and reconciliation reads stay blocked");
    expect(stripSource).toContain('data-admin-economy-strip-source-state={sourceState}');
    expect(stripSource).toContain('export type PlatformEconomyStripSourceState = "live" | "review" | "collecting" | "failed" | "source_missing"');
    expect(stripSource).toContain("sourceState: PlatformEconomyStripSourceState;");
    expect(stripSource).not.toContain('sourceState = "live"');
    expect(stripSource).toContain('if (sourceState === "source_missing") return "No source"');
    expect(stripSource).toContain("formatStripSourceStateLabel(sourceState)");
  });

  it("skips protected economy route reads in fixture mode", () => {
    const fixtureBranch = consoleSource.indexOf("if (isLocalAdminUiTestSession) {");
    const economyFetch = consoleSource.indexOf("const response = await authFetch(url);");

    expect(fixtureBranch).toBeGreaterThan(-1);
    expect(economyFetch).toBeGreaterThan(fixtureBranch);
    expect(consoleSource).toContain("setState(createSourceMissingState())");
    expect(consoleSource).toContain("getTreasuryStripSourceState(state.treasury, isLocalAdminUiTestSession)");
    expect(consoleSource).toContain("sourceState={treasuryStripSourceState}");
    expect(consoleSource).toContain("source_missing: treasury source is not loaded in this fixture");
    expect(consoleSource).toContain("source_missing: economy warning source is not loaded in this fixture.");
  });

  it("keeps treasury source warnings visible without broken encoded copy", () => {
    expect(consoleSource).toContain("summarizeSourceWarnings(row.sourceWarnings)");
    expect(consoleSource).toContain("paid-source");
    expect(consoleSource).toContain("reward/free");
    expect(typesSource).toContain("row.sourceWarnings.forEach");
    expect(`${consoleSource}\n${stripSource}`).not.toMatch(/[ÂâÃ]/u);
  });
});
