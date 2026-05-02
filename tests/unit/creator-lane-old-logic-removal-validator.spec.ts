import { describe, expect, it } from "vitest";

import {
  evaluateCreatorLaneOldLogicPatterns,
  type CreatorLaneLegacyException,
  type ScannedFile,
} from "../../scripts/agent/validate-creator-lane-old-logic-removal";

function evaluate(files: ScannedFile[], exceptions: CreatorLaneLegacyException[] = []) {
  return evaluateCreatorLaneOldLogicPatterns(files, exceptions).violations.map((entry) => entry.pattern);
}

describe("creator lane old logic removal validator", () => {
  it("catches Admin Roster attempts to PUT creatorApplication lifecycle blobs", () => {
    const patterns = evaluate([
      {
        filePath: "src/app/admin/roster/page.tsx",
        content: 'authFetch("/api/admin/users", { method: "PUT", body: JSON.stringify({ updates: { creatorApplication: { approvalStatus: "creator_approved" } } }) });',
      },
    ]);

    expect(patterns).toContain("admin_roster_generic_creator_application_put");
  });

  it("catches raw enum label replacement in primary creator UI", () => {
    const patterns = evaluate([
      {
        filePath: "src/app/admin/roster/page.tsx",
        content: 'const label = status.replaceAll("_", " ");',
      },
    ]);

    expect(patterns).toContain("raw_enum_label_in_primary_creator_ui");
  });

  it("allows a named deprecated creatorApplication compatibility bridge", () => {
    const exception: CreatorLaneLegacyException = {
      filePath: "src/app/api/admin/users/route.ts",
      pattern: "legacy_creator_application_direct_patch_bridge",
      allowedReason: "Sanitized compatibility bridge.",
      owner: "creator_onboarding_admin_compatibility",
      removalPlan: "Remove after migration.",
      risk: "Medium.",
    };

    const patterns = evaluate([
      {
        filePath: "src/app/api/admin/users/route.ts",
        content: "const creatorApplicationPatch = updates.creatorApplication;",
      },
    ], [exception]);

    expect(patterns).not.toContain("legacy_creator_application_direct_patch_bridge");
  });
});
