import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import { expectSourceValidatorWithDirtyTreeIsolation } from "./utils/source-validator-contract";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("user profile api contract", () => {
  it("passes source checks or reports only the exact dirty-tree isolation blocker", () => {
    expectSourceValidatorWithDirtyTreeIsolation({
      command: "npm run check:user-profile-api-contract",
      artifact: "agent/state/user-profile-api-contract.generated.json",
      isolationCheck: "protectedSurfacesUntouched",
      expectedIsolationFailure: /protected surfaces changed:/u,
    });
  }, 30000);

  it("declares readable, writable, server-only, display-only, and telemetry fields", async () => {
    expect(existsSync(join(root, "src/lib/user/user-profile-contract.ts"))).toBe(true);
    const contract = await import("../../src/lib/user/user-profile-contract");

    expect(contract.USER_PROFILE_CONTRACT_VERSION).toBe("2026.05.user-profile-api.1");
    expect(contract.USER_PROFILE_READABLE_FIELDS).toContain("displayName");
    expect(contract.USER_PROFILE_WRITABLE_FIELDS).toContain("privacySettings");
    expect(contract.USER_PROFILE_SERVER_ONLY_FIELDS).toContain("role");
    expect(contract.USER_PROFILE_SERVER_ONLY_FIELDS).toContain("creatorSettings");
    expect(contract.USER_PROFILE_DISPLAY_ONLY_FIELDS).toContain("avatarFallback");
    expect(contract.USER_PROFILE_IDENTITY_TELEMETRY_FIELDS).toContain("actorUserId");
    expect(contract.isWritableUserProfileField("displayName")).toBe(true);
    expect(contract.isWritableUserProfileField("creatorSettings")).toBe(false);
    expect(contract.getServerOnlyUserProfilePayloadKeys({ userId: "bad", role: "admin", displayName: "Safe" })).toEqual(["userId", "role"]);
  });

  it("keeps Account Settings consuming the canonical profile endpoint and shape", () => {
    const userSettingsContract = read("src/lib/settings/user-settings-contract.ts");
    const clientPreferences = read("src/lib/settings/client-preferences-contract.ts");
    const profileState = read("src/app/dashboard/profile/hooks/useProfileState.tsx");
    const route = read("src/app/api/user/profile/route.ts");

    expect(userSettingsContract).toContain('readEndpoint: "/api/user/profile"');
    expect(userSettingsContract).toContain('writeEndpoint: "/api/user/profile"');
    expect(clientPreferences).toContain('backendRouteOrContract: "/api/user/profile"');
    expect(profileState).toContain('authFetch("/api/user/profile"');
    expect(route).toContain("buildCanonicalUserProfileResponse");
    expect(route).toContain("sanitizeUserProfileWritePayload");
  });

  it("blocks arbitrary user identity and stale creator settings writes on the profile route", () => {
    const route = read("src/app/api/user/profile/route.ts");

    expect(route).toContain("getServerOnlyUserProfilePayloadKeys");
    expect(route).toContain("USER_PROFILE_HUMAN_ERRORS.serverOnlyField");
    expect(route).toContain('routeName: "user/profile"');
    expect(route).toContain("scopeToCaller: true");
    expect(route).toContain('trackServerEvent("setting_save_succeeded"');
    expect(route).not.toContain("updates.creatorSettings = normalizeCreatorSettings");
  });

  it("exposes validator artifacts and package script", () => {
    const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
    const validator = read("scripts/agent/validate-user-profile-api-contract.ts");

    expect(packageJson.scripts?.["check:user-profile-api-contract"]).toBe("tsx scripts/agent/validate-user-profile-api-contract.ts");
    expect(validator).toContain("agent/state/user-profile-api-contract.generated.json");
    expect(validator).toContain("docs/agent-truth/user-profile-api-contract.md");
    expect(validator).toContain("profile response shape differs across consumers");
    expect(validator).toContain("stale profile routes remain active");
  });
});
