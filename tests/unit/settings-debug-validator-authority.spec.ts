import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("settings debug validator authority", () => {
  it("passes the source-level settings debug validator authority check", () => {
    expect(() => {
      execSync("npm run check:settings-debug-validator-authority", {
        cwd: root,
        stdio: "pipe",
        encoding: "utf8",
      });
    }).not.toThrow();
  }, 20000);

  it("declares one canonical settings validator authority with active and superseded lanes", async () => {
    expect(existsSync(join(root, "src/lib/debug/settings-debug-validator-authority.ts"))).toBe(true);
    const contract = await import("../../src/lib/debug/settings-debug-validator-authority");

    expect(contract.SETTINGS_DEBUG_VALIDATOR_AUTHORITY_VERSION).toBe("2026.05.settings-debug-validator-authority.1");
    expect(contract.SETTINGS_HEALTH_DEBUG_LANE.laneId).toBe("settings_health");
    expect(contract.SETTINGS_HEALTH_DEBUG_LANE.label).toBe("Settings health");
    expect(contract.SETTINGS_HEALTH_COMPONENTS.map((component: { id: string }) => component.id)).toEqual([
      "settings_connection_parity",
      "settings_route_alias_cleanup",
      "stale_client_preferences_cleanup",
      "support_policy_surface_cleanup",
      "user_profile_api_contract",
      "account_settings_delete_flow",
    ]);

    const activeScripts = contract.ACTIVE_SETTINGS_VALIDATORS.map((validator: { script: string }) => validator.script);
    expect(activeScripts).toContain("scripts/agent/validate-settings-connection-parity.ts");
    expect(activeScripts).toContain("scripts/agent/validate-settings-route-alias-cleanup.ts");
    expect(activeScripts).toContain("scripts/agent/validate-stale-client-preferences-cleanup.ts");
    expect(activeScripts).toContain("scripts/agent/validate-support-policy-surface-cleanup.ts");
    expect(activeScripts).toContain("scripts/agent/validate-user-profile-api-contract.ts");
    expect(activeScripts).toContain("scripts/agent/validate-account-settings-delete-flow.ts");

    expect(contract.SUPERSEDED_SETTINGS_VALIDATORS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          script: "scripts/agent/validate-settings-creator-dashboard-split.ts",
          status: "superseded",
        }),
      ]),
    );
  });

  it("maps settings validators in validator authority and validator map", () => {
    const authority = read("agent/context/validator-authority.json");
    const validatorMap = read("agent/context/validator-map.json");

    expect(authority).toContain("scripts/agent/validate-settings-debug-validator-authority.ts");
    expect(authority).toContain('"surface": "settings"');
    expect(authority).toContain('"status": "superseded"');
    expect(authority).toContain("scripts/agent/validate-settings-creator-dashboard-split.ts");
    expect(authority).toContain("scripts/agent/validate-user-profile-api-contract.ts");

    expect(validatorMap).toContain('"settings"');
    expect(validatorMap).toContain("check:settings-debug-validator-authority");
    expect(validatorMap).toContain("check:user-profile-api-contract");
  });

  it("exposes one settings health lane and no duplicate settings debug lane", () => {
    const debugSummary = read("src/lib/debug/debug-panel-tracking-summary.ts");
    const settingsSurface = read("src/lib/settings/settings-surface-contract.ts");

    expect(debugSummary).toContain("settings_health");
    expect(debugSummary).toContain("Settings health");
    expect(debugSummary).toContain("SETTINGS_HEALTH_COMPONENTS");
    expect(debugSummary).not.toContain("settings_connection_health");
    expect(settingsSurface).toContain('laneId: "settings_health"');
    expect(settingsSurface).toContain('label: "Settings health"');
  });

  it("exposes validator artifacts and package script", () => {
    const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
    const validator = read("scripts/agent/validate-settings-debug-validator-authority.ts");

    expect(packageJson.scripts?.["check:settings-debug-validator-authority"]).toBe("tsx scripts/agent/validate-settings-debug-validator-authority.ts");
    expect(validator).toContain("agent/state/settings-debug-validator-authority.generated.json");
    expect(validator).toContain("docs/agent-truth/settings-debug-validator-authority.md");
    expect(validator).toContain("duplicate active settings validators overlap without authority");
    expect(validator).toContain("stale settings artifact still affects score");
    expect(validator).toContain("active failing validator hidden");
  });
});
