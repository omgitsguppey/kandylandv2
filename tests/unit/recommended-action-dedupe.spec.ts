import { describe, expect, it } from "vitest";

import {
  dedupeRecommendedActions,
  validateRecommendedActionDedupe,
  type RecommendedActionInput,
} from "../../src/lib/debug/recommended-action-dedupe";
import {
  buildRecommendedActionDedupeReport,
  validateRecommendedActionDedupeReport,
} from "../../scripts/agent/debug-cockpit-batch14-shared";

describe("recommended action dedupe", () => {
  it("collapses duplicate root causes while keeping unresolved security actions visible", () => {
    const actions: RecommendedActionInput[] = [
      {
        id: "a",
        title: "Admin balance body cap",
        owner: "security",
        sourceFile: "src/app/api/admin/balance/route.ts",
        findingKind: "request_body_cap",
        rootCause: "admin_request_body_cap",
        refreshCommand: "npm run check:speed-security",
        severity: "major",
        resolved: false,
      },
      {
        id: "b",
        title: "Admin balance body cap duplicate",
        owner: "security",
        sourceFile: "src/app/api/admin/balance/route.ts",
        findingKind: "request_body_cap",
        rootCause: "admin_request_body_cap",
        refreshCommand: "npm run check:speed-security",
        severity: "moderate",
        resolved: false,
      },
    ];

    const result = dedupeRecommendedActions(actions);

    expect(result.visibleActions).toHaveLength(1);
    expect(result.visibleActions[0]?.alsoAffects).toEqual(["b"]);
    expect(result.visibleActions[0]?.severity).toBe("major");
    expect(result.visibleActions[0]?.resolved).toBe(false);
    expect(validateRecommendedActionDedupe(result)).toEqual([]);
  });

  it("summarizes Batch 9/10 duplicates without hiding the root security work", () => {
    const report = buildRecommendedActionDedupeReport();

    expect(report.status).toBe("duplicate_action_collapsed");
    expect(report.recommendedActionsAfter).toBeLessThan(report.recommendedActionsBefore);
    expect(report.unresolvedSecurityActions).toEqual(
      expect.arrayContaining([
        "admin_balance_body_cap",
        "creator_account_controls_body_cap",
        "creator_account_controls_typed_errors",
        "creator_agreements_typed_errors",
        "viewer_entitlement",
        "ai_budget_guard",
      ]),
    );
    expect(validateRecommendedActionDedupeReport(report)).toEqual([]);
  });
});
