import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const launcher = readFileSync(join(root, "scripts/local-exe/KandyDropsLauncher.cs"), "utf8");
const buildScript = readFileSync(join(root, "scripts/local-exe/build-local-exes.ps1"), "utf8");

describe("local Windows connected launcher", () => {
  it("builds locally with the Windows-stable Next builder and verifies app identity", () => {
    expect(launcher).toContain('private const string Host = "127.0.0.1";');
    expect(launcher).toContain("npm run build -- --webpack");
    expect(launcher).toContain('"/api/health"');
    expect(launcher).toContain('body.IndexOf("\\\"status\\\":\\\"healthy\\\""');
    expect(launcher).toContain("IsPortInUse()");
  });

  it("retires the unsafe fixture launcher and labels connected behavior explicitly", () => {
    expect(launcher).toContain('KANDYDROPS_LOCAL_EXE"] = "connected_live"');
    expect(launcher).toContain("it is not an offline audit sandbox");
    expect(launcher).not.toContain("auditMode");
    expect(launcher).not.toContain("NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION");
    expect(buildScript).toContain('"KandyDrops-Connected.exe"');
    expect(buildScript).toContain('$retiredTargets = @(');
    expect(buildScript).toContain('"KandyDrops-Audit.exe"');
    expect(buildScript).toContain("is not an offline sandbox");
    expect(buildScript.match(/\$targets = @\([\s\S]*?\)/u)?.[0]).not.toContain("KandyDrops-Audit.exe");

    for (const forbidden of ["firebase deploy", "gcloud ", "api-m.paypal.com", "PAYPAL_CLIENT_SECRET_LIVE"]) {
      expect(launcher.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });
});
