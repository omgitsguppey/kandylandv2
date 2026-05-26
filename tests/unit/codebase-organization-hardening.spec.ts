import { describe, expect, it } from "vitest";

import {
  CODEBASE_ORGANIZATION_HARDENING_RULES,
  buildCodebaseOrganizationHardeningSummary,
  classifyCodebaseOrganizationDirtyFile,
  validateCodebaseOrganizationHardeningSummary,
} from "@/lib/codebase-hardening/codebase-organization-hardening";

describe("codebase organization hardening", () => {
  it("requires every new limb to declare owner, pipeline, debug, score, cost, and validator wiring", () => {
    const summary = buildCodebaseOrganizationHardeningSummary({
      packageScripts: {
        "check:codebase-organization-hardening": "tsx scripts/agent/validate-codebase-organization-hardening.ts",
        "check:mega-legacy-pipeline-hardening": "tsx scripts/agent/validate-mega-legacy-pipeline-hardening.ts",
      },
      dirtyFiles: [],
      openPullRequests: [],
    });

    expect(CODEBASE_ORGANIZATION_HARDENING_RULES).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: "feature-body-system-required" }),
      expect.objectContaining({ ruleId: "telemetry-event-envelope-required" }),
      expect.objectContaining({ ruleId: "metric-math-owner-required" }),
      expect.objectContaining({ ruleId: "debug-interpretive-brain-required" }),
      expect.objectContaining({ ruleId: "cost-class-required" }),
      expect.objectContaining({ ruleId: "legacy-alias-canonical-map-required" }),
    ]));
    expect(summary.status).toBe("pass");
    expect(summary.productionReadsPerformed).toBe(false);
    expect(summary.providerCallsPerformed).toBe(false);
    expect(summary.requiredRulesSatisfied).toBe(CODEBASE_ORGANIZATION_HARDENING_RULES.length);
    expect(summary.selfCheck.packageScriptsPresent).toBe(true);
    expect(validateCodebaseOrganizationHardeningSummary(summary)).toEqual([]);
  });

  it("fails if a route or telemetry change is unclassified or lacks a validator", () => {
    const summary = buildCodebaseOrganizationHardeningSummary({
      packageScripts: {},
      dirtyFiles: ["src/app/api/example/route.ts"],
      openPullRequests: [],
    });

    expect(validateCodebaseOrganizationHardeningSummary(summary)).toEqual(expect.arrayContaining([
      "Required package script check:codebase-organization-hardening is missing.",
      "Required package script check:mega-legacy-pipeline-hardening is missing.",
      "src/app/api/example/route.ts is unsafe_unknown for codebase organization hardening.",
    ]));
  });

  it("classifies expected hardening artifacts and blocks protected runtime edits", () => {
    expect(classifyCodebaseOrganizationDirtyFile("src/lib/codebase-hardening/codebase-organization-hardening.ts"))
      .toBe("real_source_change_needs_review");
    expect(classifyCodebaseOrganizationDirtyFile("agent/state/codebase-organization-hardening.generated.json"))
      .toBe("current_generated_artifact_to_commit");
    expect(classifyCodebaseOrganizationDirtyFile("docs/agent-truth/codebase-organization-hardening.md"))
      .toBe("documentation_artifact_expected");
    expect(classifyCodebaseOrganizationDirtyFile("scripts/agent/validate-codebase-organization-hardening.ts"))
      .toBe("validator_artifact_expected");
    expect(classifyCodebaseOrganizationDirtyFile("tests/unit/codebase-organization-hardening.spec.ts"))
      .toBe("test_artifact_expected");
    expect(classifyCodebaseOrganizationDirtyFile("src/app/api/paypal/capture/route.ts"))
      .toBe("unsafe_unknown");
  });
});
