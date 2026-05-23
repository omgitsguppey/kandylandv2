import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function read(path: string) {
  return readFileSync(`${ROOT}/${path}`, "utf8");
}

describe("settings connection parity", () => {
  it("passes the source-level settings connection parity validator", () => {
    expect(() => {
      execSync("npm run check:settings-connection-parity", {
        cwd: ROOT,
        stdio: "pipe",
        encoding: "utf8",
      });
    }).not.toThrow();
  }, 20000);

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
