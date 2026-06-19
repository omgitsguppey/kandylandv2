import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const componentSource = readFileSync(join(process.cwd(), "src/app/admin/AdminPrivacyPreflight.tsx"), "utf8");
const hookSource = readFileSync(join(process.cwd(), "src/hooks/useAdminPrivacyPreflight.ts"), "utf8");

describe("admin privacy fixture boundary", () => {
  it("labels local admin UI fixture privacy evidence as no-source", () => {
    expect(componentSource).toContain('data-admin-privacy-fixture-boundary="true"');
    expect(componentSource).toContain('data-admin-privacy-fixture-state="source_missing"');
    expect(componentSource).toContain("No verified privacy source is loaded in local review");
    expect(componentSource).toContain("consent, export, duplicate prevention, and guest identity preflight samples");
    expect(componentSource).toContain('data-privacy-console-overall-state={isLocalFixtureSourceMissing ? "source_missing"');
  });

  it("keeps privacy evidence drilldown compact", () => {
    expect(componentSource).toContain(">Details</summary>");
    expect(componentSource).not.toContain("Source notes");
  });

  it("skips privacy preflight route reads in fixture mode", () => {
    expect(hookSource).toContain("isAdminUiTestSessionUser(user)");
    expect(hookSource).toContain('"local_fixture_source_missing"');
    expect(hookSource).toContain('adminSessionState === "local_fixture_source_missing"');
    expect(hookSource).toContain("setData(null)");
    expect(hookSource).toContain("setIsLoading(false)");

    const fixtureBranch = hookSource.indexOf('adminSessionState === "local_fixture_source_missing"');
    const routeFetch = hookSource.indexOf("authFetch(`/api/admin/privacy/preflight?range=");

    expect(fixtureBranch).toBeGreaterThan(-1);
    expect(routeFetch).toBeGreaterThan(fixtureBranch);
  });
});
