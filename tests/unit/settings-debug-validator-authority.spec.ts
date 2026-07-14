import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import { expectSourceValidatorWithDirtyTreeIsolation } from "./utils/source-validator-contract";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("settings debug validator authority", () => {
  it("passes source checks or reports only the exact dirty-tree isolation blocker", () => {
    expectSourceValidatorWithDirtyTreeIsolation({
      command: "npm run check:settings-debug-validator-authority",
      artifact: "agent/state/settings-debug-validator-authority.generated.json",
      isolationCheck: "protectedSurfacesUntouched",
      expectedIsolationFailure: /protected surfaces changed:/u,
    });
  }, 30000);

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

  it("maps settings validators in validator authority and validator map", async () => {
    const authority = read("agent/context/validator-authority.json");
    const authorityDocument = JSON.parse(authority) as {
      validators?: Record<string, { authority?: string; status?: string }>;
      packageScripts?: Record<string, { authority?: string; status?: string }>;
    };
    const validatorMap = JSON.parse(read("agent/context/validator-map.json")) as {
      bySurface?: Record<string, string[]>;
      validators?: Record<string, string>;
    };
    const generator = read("scripts/agent/build-compact-agent-context.ts");
    const authorityScorer = read("scripts/agent/score-validator-authority.ts");
    const { getSettingsValidatorAuthorityRecords } = await import("../../src/lib/debug/settings-debug-validator-authority");
    const records = getSettingsValidatorAuthorityRecords();
    const activePackageScripts = records
      .filter((record) => record.status === "active")
      .map((record) => record.packageScript)
      .sort();
    const supersededPackageScripts = records
      .filter((record) => record.status === "superseded")
      .map((record) => record.packageScript);

    expect(authority).toContain("scripts/agent/validate-settings-debug-validator-authority.ts");
    expect(authority).toContain('"surface": "settings"');
    expect(authority).toContain('"status": "superseded"');
    expect(authority).toContain("scripts/agent/validate-settings-creator-dashboard-split.ts");
    expect(authority).toContain("scripts/agent/validate-user-profile-api-contract.ts");

    expect(generator).toContain("getSettingsValidatorAuthorityRecords");
    expect(authorityScorer).toContain("getSettingsValidatorAuthorityRecords");
    expect(validatorMap.bySurface?.settings).toEqual(activePackageScripts);
    for (const record of records) {
      expect(validatorMap.validators?.[record.packageScript]).toBe("settings");
      const expectedStatus = record.status === "superseded"
        ? "superseded"
        : record.status === "deprecated"
          ? "legacy"
          : record.authority === "supporting_contract"
            ? "supporting"
            : "canonical";
      const expectedAuthority = record.status === "deprecated" ? "legacy_reference" : record.authority;
      expect(authorityDocument.validators?.[record.script]).toMatchObject({
        authority: expectedAuthority,
        status: expectedStatus,
      });
      expect(authorityDocument.packageScripts?.[record.packageScript]).toMatchObject({
        authority: expectedAuthority,
        status: expectedStatus,
      });
    }
    for (const packageScript of supersededPackageScripts) {
      expect(validatorMap.bySurface?.settings).not.toContain(packageScript);
    }
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
