import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/admin/roster/page.tsx"), "utf8");

describe("admin roster fixture boundary", () => {
  it("keeps local admin UI test access read-only for creator roster mutations", () => {
    expect(source).toContain("isAdminUiTestSessionUser(user)");
    expect(source).toContain('data-admin-roster-fixture-boundary="true"');
    expect(source).toContain('data-admin-roster-fixture-state="source_missing"');
    expect(source).toContain("No verified creator roster source is loaded in local review");
    expect(source).toContain("Account controls require real admin auth");
    expect(source).toContain("Fan-experience settings require real admin auth");
    expect(source).toContain('{isLocalAdminUiTestSession ? "No source" : entriesByDecision.needs_review.length}');
    expect(source).toContain('{isLocalAdminUiTestSession ? "No source" : entriesByDecision.waiting.length}');
    expect(source).toContain('{isLocalAdminUiTestSession ? "No source" : roster?.summary.creatorCount ?? approvedLiveCreators.length}');
    expect(source).toContain("No creator decision queue source is loaded in local UI review");
    expect(source).toContain('creatorMutationDisabled ? "Create needs admin"');
    expect(source).toContain('className="flex max-w-full flex-wrap gap-1 rounded-2xl');
    expect(source).toContain('className="grid gap-3 sm:grid-cols-3"');
    expect(source).not.toContain("min-w-[180px]");

    expect(source).toContain("disabled={creatorMutationDisabled || creating}");
    expect(source).toContain('disabled={creatorMutationDisabled || agreementSaving === "create_template"}');
    expect(source).toContain('disabled={creatorMutationDisabled || !isOwner || agreementSaving === "activate_template"}');
    expect(source).toContain('disabled={creatorMutationDisabled || saving === "approve"}');
    expect(source).toContain('disabled={creatorMutationDisabled || saving === "return"}');
    expect(source).toContain('disabled={creatorMutationDisabled || saving === "reject"}');
    expect(source).toContain('disabled={creatorMutationDisabled || saving === "owner-override-on"}');
  });

  it("guards mutation handlers before network writes in fixture mode", () => {
    const guardedHandlers = [
      "submitCreatorAction",
      "handleCreateCreator",
      "handleAccountControlSubmit",
      "handleAccountApprovalStatusChange",
      "handleFanExperienceSettingsSubmit",
      "handleCreatorAgreementAction",
      "handleAgreementTemplateSubmit",
    ];

    for (const handlerName of guardedHandlers) {
      const handlerIndex = source.indexOf(handlerName);
      expect(handlerIndex, `${handlerName} should exist`).toBeGreaterThan(-1);
      const handlerBodyStart = source.indexOf("{", handlerIndex);
      const guardIndex = source.indexOf("if (creatorMutationDisabled)", handlerBodyStart);
      expect(guardIndex, `${handlerName} should guard fixture writes`).toBeGreaterThan(handlerBodyStart);
      expect(guardIndex - handlerBodyStart, `${handlerName} guard should be near the start`).toBeLessThan(280);
    }
  });

  it("skips roster, detail, and agreement reads in fixture mode", () => {
    expect(source).toContain("if (isLocalAdminUiTestSession) {\n                setRoster(null);");
    expect(source).toContain("if (isLocalAdminUiTestSession) {\n            setDetail(null);");
    expect(source).toContain("if (isLocalAdminUiTestSession) {\n            setAgreementTemplate(null);");

    const rosterGuard = source.indexOf("setRoster(null);");
    const rosterFetch = source.indexOf("const response = await authFetch(`/api/admin/roster");
    const detailGuard = source.indexOf("setDetail(null);");
    const detailFetch = source.indexOf("const response = await authFetch(`/api/admin/user/${selectedUserId}`);");
    const agreementGuard = source.indexOf("setAgreementTemplate(null);");
    const agreementFetch = source.indexOf('const response = await authFetch("/api/admin/creator-agreements");');

    expect(rosterFetch).toBeGreaterThan(rosterGuard);
    expect(detailFetch).toBeGreaterThan(detailGuard);
    expect(agreementFetch).toBeGreaterThan(agreementGuard);
  });
});
