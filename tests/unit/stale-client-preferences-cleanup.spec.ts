import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("stale client preferences cleanup", () => {
  it("declares client preference storage roles without allowing local storage settings truth", async () => {
    const contract = await import("../../src/lib/settings/client-preferences-contract");

    expect(contract.SETTINGS_CLIENT_PREFERENCE_CONTRACT_VERSION).toBe("2026.05.stale-client-preferences.1");
    expect(contract.SETTINGS_CLIENT_PREFERENCE_DEBUG_LANE.laneId).toBe("settings_health");
    expect(contract.SETTINGS_CLIENT_PREFERENCE_ITEMS.some((item) => item.classification === "stale_bypass")).toBe(false);
    expect(contract.SETTINGS_CLIENT_PREFERENCE_ITEMS.some((item) => item.storageRole === "backend_truth")).toBe(false);
    expect(contract.SETTINGS_CLIENT_PREFERENCE_ITEMS.every((item) => item.debugVisibility === "settings_health")).toBe(true);
  });

  it("keeps privacy and creator settings writes on canonical backend contracts", () => {
    const profileState = read("src/app/dashboard/profile/hooks/useProfileState.tsx");
    const profileRoute = read("src/app/api/user/profile/route.ts");
    const creatorHub = read("src/components/Creators/CreatorDashboardSettingsHub.tsx");
    const creatorRoute = read("src/app/api/creator/settings/route.ts");
    const debugSummary = read("src/lib/debug/debug-panel-tracking-summary.ts");

    expect(profileState).toContain('authFetch("/api/user/profile"');
    expect(profileState).toContain("persistPrivacySettingsSnapshot");
    expect(profileRoute).toContain("normalizePrivacySettings");
    expect(creatorHub).toContain('authFetch(`/api/creator/settings${query}`');
    expect(creatorRoute).toContain("sanitizeCreatorSettingsControlPlaneUpdate");
    expect(debugSummary).toContain("staleClientPreferences");
    expect(debugSummary).toContain("stale client preference bypass");
  });

  it("exposes the validator package script and artifact writer", () => {
    const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
    const validator = read("scripts/agent/validate-stale-client-preferences-cleanup.ts");

    expect(packageJson.scripts?.["check:stale-client-preferences-cleanup"]).toBe("tsx scripts/agent/validate-stale-client-preferences-cleanup.ts");
    expect(validator).toContain("agent/state/stale-client-preferences-cleanup.generated.json");
    expect(validator).toContain("docs/agent-truth/stale-client-preferences-cleanup.md");
    expect(validator).toContain("persisted localStorage setting bypasses backend truth");
  });
});
