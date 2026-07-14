import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import { expectSourceValidatorWithDirtyTreeIsolation } from "./utils/source-validator-contract";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("support policy surface cleanup", () => {
  it("passes source checks or reports only the exact dirty-tree isolation blocker", () => {
    expectSourceValidatorWithDirtyTreeIsolation({
      command: "npm run check:support-policy-surface-cleanup",
      artifact: "agent/state/support-policy-surface-cleanup.generated.json",
      isolationCheck: "protectedSurfacesUntouched",
      expectedIsolationFailure: "protectedSurfacesUntouched failed.",
    });
  }, 30000);

  it("declares canonical trust routes with honest implementation states", async () => {
    expect(existsSync(join(root, "src/lib/support-policy/support-policy-surface-contract.ts"))).toBe(true);
    const contract = await import("../../src/lib/support-policy/support-policy-surface-contract");

    expect(contract.SUPPORT_POLICY_SURFACE_CONTRACT_VERSION).toBe("2026.05.support-policy-surface.1");
    expect(contract.SUPPORT_POLICY_DEBUG_LANE.laneId).toBe("support_policy_surface_health");
    expect(contract.SUPPORT_POLICY_SURFACES.map((surface: { id: string }) => surface.id)).toEqual([
      "faq",
      "support",
      "policies",
      "privacy_policy",
      "data_export",
      "account_recovery_support",
    ]);
    expect(contract.getBrokenSupportPolicySurfaces()).toEqual([]);
    expect(contract.getDuplicateSupportPolicyRoutesWithoutRedirect()).toEqual([]);
    expect(contract.SUPPORT_POLICY_SURFACES.every((surface: { featureRegistrationId: string; debugVisibility: string }) =>
      surface.featureRegistrationId && surface.debugVisibility === "support_policy_surface_health"
    )).toBe(true);
  });

  it("keeps Account Settings trust links on canonical working surfaces", () => {
    const supportSafety = read("src/app/dashboard/profile/components/ProfileSupportSafetySection.tsx");
    const privacyData = read("src/app/dashboard/profile/components/ProfilePrivacyDataSection.tsx");
    const settingsContract = read("src/lib/settings/settings-surface-contract.ts");
    const dataRoute = read("src/app/api/user/data/route.ts");

    expect(supportSafety).toContain('href="/faq"');
    expect(supportSafety).toContain('href="/dashboard/support"');
    expect(supportSafety).toContain('href="/privacy"');
    expect(privacyData).toContain('href="/privacy"');
    expect(privacyData).toContain("handleDownloadData");
    expect(settingsContract).toContain('settingId: "download_my_data"');
    expect(settingsContract).toContain('backendRouteOrAction: "/api/user/data"');
    expect(dataRoute).toContain('Content-Disposition');
  });

  it("registers support and policy surfaces with debug visibility", () => {
    const featureRegistry = read("src/lib/features/feature-registration-registry.ts");
    const debugTower = read("src/lib/admin-debug-control-tower.ts");
    const validator = read("scripts/agent/validate-support-policy-surface-cleanup.ts");
    const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };

    expect(featureRegistry).toContain('featureId: "support"');
    expect(featureRegistry).toContain("src/app/faq");
    expect(featureRegistry).toContain("src/app/dashboard/support");
    expect(featureRegistry).toContain("src/app/(legal)/privacy");
    expect(featureRegistry).toContain("src/app/api/user/data");
    expect(debugTower).toContain("support-policy-surface-cleanup.generated.json");
    expect(debugTower).toContain("support_policy_surface_health");
    expect(packageJson.scripts?.["check:support-policy-surface-cleanup"]).toBe("tsx scripts/agent/validate-support-policy-surface-cleanup.ts");
    expect(validator).toContain("FAQ/Support/Policies/Privacy links are dead");
    expect(validator).toContain("Download My Data links to broken action");
    expect(validator).toContain("approvedChatErrorLanguageChange");
  });

  it("keeps support recovery errors typed without exposing raw request failures", () => {
    const supportInbox = read("src/components/Support/SupportInbox.tsx");

    expect(supportInbox).toContain("class SupportRequestError extends Error");
    expect(supportInbox).toContain('errorKey === "forbidden"');
    expect(supportInbox).toContain('errorKey === "not_found"');
    expect(supportInbox).toContain('errorKey === "rate_limited"');
    expect(supportInbox).toContain("This support ticket is not available on this account.");
    expect(supportInbox).toContain("This support ticket could not be found. Open a new ticket if you still need help.");
    expect(supportInbox).toContain("Too many support requests came through. Wait a minute, then try again.");
    expect(supportInbox).toContain("selectedThread?.success && selectedThread.thread === null");
    expect(supportInbox).not.toContain("detail: { message: error instanceof Error ? error.message : messageText }");
  });
});
