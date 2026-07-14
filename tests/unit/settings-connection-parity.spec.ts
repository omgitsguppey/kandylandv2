import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { expectSourceValidatorWithDirtyTreeIsolation } from "./utils/source-validator-contract";

const ROOT = process.cwd();

function read(path: string) {
  return readFileSync(`${ROOT}/${path}`, "utf8");
}

describe("settings connection parity", () => {
  it("passes source checks or reports only the exact dirty-tree isolation blocker", () => {
    expectSourceValidatorWithDirtyTreeIsolation({
      command: "npm run check:settings-connection-parity",
      artifact: "agent/state/settings-connection-parity.generated.json",
      isolationCheck: "protectedSurfacesUntouched",
      expectedIsolationFailure: "protectedSurfacesUntouched failed.",
    });
  }, 30000);

  it("maps every visible account and creator setting through one canonical contract", () => {
    const contract = read("src/lib/settings/settings-surface-contract.ts");

    [
      "activity_recommendations",
      "honor_global_privacy_control",
      "essential_only_mode",
      "download_my_data",
      "privacy_policy",
      "faq",
      "support",
      "policies",
      "sign_out",
      "delete_account",
      "profile_basics",
      "fan_pass_enabled",
      "fan_pass_pricing",
      "creator_experiences_enabled",
      "broadcasts_enabled",
      "broadcast_audience",
      "timeline_enabled",
      "show_drops_on_timeline",
      "show_broadcasts_on_timeline",
      "creator_drop_manager",
      "creator_profile_visibility",
    ].forEach((settingId) => {
      expect(contract).toContain(`settingId: "${settingId}"`);
    });

    expect(contract).toContain("SETTINGS_DEBUG_LANE");
    expect(contract).toContain("settings_health");
  });

  it("keeps old profile rewrite generators removed instead of retaining duplicate settings logic", () => {
    expect(existsSync(`${ROOT}/scripts/shred_profile.py`)).toBe(false);
    expect(existsSync(`${ROOT}/scripts/shred_profile_components.py`)).toBe(false);
    expect(existsSync(`${ROOT}/scripts/rewrite_profile_page.py`)).toBe(false);
  });
});
