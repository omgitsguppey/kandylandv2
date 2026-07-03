import { describe, expect, it } from "vitest";

import { classifyNoSampleRouteCohort, BATCH21_NO_SAMPLE_ROUTE_KEYS } from "@/lib/debug/no-sample-route-cohort-classifier";

describe("no-sample route cohort finalization", () => {
  it("classifies every Batch 21 no-sample route without live health", () => {
    const records = BATCH21_NO_SAMPLE_ROUTE_KEYS.map((routeKey) => classifyNoSampleRouteCohort(routeKey));

    expect(records).toHaveLength(22);
    expect(records.every((record) => record.displaysLive === false)).toBe(true);
    expect(records.every((record) => record.cohort !== "unknown")).toBe(true);
    expect(records.every((record) => record.nextAction.length > 10)).toBe(true);
  });

  it("keeps high-risk no-sample routes out of optional quiet", () => {
    expect(classifyNoSampleRouteCohort("__/auth/[...path]:POST")).toMatchObject({
      cohort: "auth_proxy_high_risk",
      risk: "high",
      sampleRequiredForLaunch: true,
      canBeQuiet: false,
    });
    const securityRoute = classifyNoSampleRouteCohort("user/revoke-sessions:POST");
    expect(securityRoute).toMatchObject({
      cohort: "user_security_write",
      risk: "high",
      status: "unseen_required_smoke_needed",
      sampleRequiredForBeta: true,
    });
    expect(securityRoute.nextAction).toContain("source/contract route evidence");
    expect(securityRoute.nextAction).not.toContain("smoke");
    expect(classifyNoSampleRouteCohort("creator/payouts:POST")).toMatchObject({
      cohort: "creator_payouts_write",
      risk: "critical",
      status: "unseen_required_smoke_needed",
    });
    expect(classifyNoSampleRouteCohort("notifications:POST")).toMatchObject({
      cohort: "notification_dispatch_write",
      status: "source_ready_no_sample_loaded",
    });
  });

  it("keeps legacy and infra proxy routes explicitly classified", () => {
    expect(classifyNoSampleRouteCohort("creator/messages:DELETE")).toMatchObject({
      cohort: "creator_legacy_messages_compat",
      status: "unseen_legacy_compat_quiet",
      canBeQuiet: true,
    });
    expect(classifyNoSampleRouteCohort("__/firebase/[...path]:HEAD")).toMatchObject({
      cohort: "firebase_proxy_infra",
      status: "source_ready_no_sample_loaded",
    });
  });
});
