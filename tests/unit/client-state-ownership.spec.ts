import { describe, expect, it } from "vitest";

import {
  CLIENT_STATE_OWNERSHIP_RULES,
  buildClientStateOwnershipReport,
  validateClientStateOwnershipReport,
} from "@/lib/frontend-hardening/client-state-ownership";

describe("client state ownership", () => {
  it("maps duplicated client state lanes to existing canonical owners", () => {
    const report = buildClientStateOwnershipReport({ currentHead: "test-head" });

    expect(CLIENT_STATE_OWNERSHIP_RULES.map((rule) => rule.stateLane)).toContain("auth");
    expect(CLIENT_STATE_OWNERSHIP_RULES.map((rule) => rule.stateLane)).toContain("wallet");
    expect(CLIENT_STATE_OWNERSHIP_RULES.map((rule) => rule.stateLane)).toContain("admin_analytics");
    expect(report.ownershipRules.length).toBeGreaterThanOrEqual(10);
    expect(report.duplicateLocalStateRemoved).toBeGreaterThan(0);
  });

  it("does not permit unsafe unknown state ownership", () => {
    const report = buildClientStateOwnershipReport({ currentHead: "test-head" });
    const validation = validateClientStateOwnershipReport(report);

    expect(report.unsafeUnknowns).toEqual([]);
    expect(validation.failures).toEqual([]);
  });
});
