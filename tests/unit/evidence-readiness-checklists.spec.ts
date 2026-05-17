import { describe, expect, it } from "vitest";

import { validateEvidenceReadinessChecklists } from "../../scripts/agent/validate-evidence-readiness-checklists";

const manual = [
  "/",
  "/drops",
  "/drops/[id]/preview",
  "/dashboard",
  "/dashboard/creator",
  "/dashboard/profile",
  "/dashboard/settings",
  "/dashboard/library",
  "/dashboard/chat",
  "/creators/[username]",
  "Wallet / GumDrop purchase modal",
  "Creator profile Fan Pass",
  "Creator profile requests",
  "Creator profile booking slots",
  "Creator owner profile mode",
  "Beta release notes drawer",
  "Mobile nav/sidebar/profile dropdown",
  "What to capture",
  "Failure looks like",
  "Evidence filename pattern",
  "Source validator/report",
  "Blocking beta exit",
  "screenshotEvidenceAttached=false",
].join("\n");

const provider = [
  "PayPal order create",
  "PayPal capture",
  "GumDrop purchased balance increase",
  "Paid bonus remains purchased balance",
  "Reward balance does not fund creator experience",
  "Creator request paid spend",
  "Booking slot paid spend",
  "Subscription paid spend if safe",
  "Do not paste secrets",
  "redactionsApplied",
].join("\n");

const runtime = [
  "Deployed home route `/` loads",
  "`/drops` loads public discovery",
  "`/creators/[username]` loads a creator profile",
  "Booking slot flow renders",
  "`/dashboard/creator` loads",
  "`/dashboard/chat` shell loads",
  "Beta release notes drawer opens",
  "API health/runtime route if an existing safe route is available",
  "Do not make provider calls",
].join("\n");

const adminTruth = [
  "Redaction rules",
  "sourceFreshnessUtc",
  "sampleCount",
  "Redacted screenshot",
  "Redacted JSON sample",
  "Do not call admin truth passed without an attached artifact path",
].join("\n");

function statusFixture(canStartBetaExitReview = false) {
  return {
    summary: {
      visualEvidenceStatus: "source_only_screenshotEvidenceAttached_false",
      providerSmokeStatus: "missing_formal_evidence",
      runtimeSmokeStatus: "runtime_unverified",
      adminTruthSampleStatus: "missing_or_unknown",
      canStartBetaExitReview,
    },
    nextExactSteps: [
      "Use docs/agent-truth/manual-screenshot-qa-checklist.md.",
      "Use docs/agent-truth/provider-smoke-evidence-checklist.md.",
      "Use docs/agent-truth/runtime-smoke-evidence-checklist.md.",
      "Use docs/agent-truth/admin-truth-sample-evidence-checklist.md.",
    ],
  };
}

describe("evidence readiness checklists", () => {
  it("accepts checklist docs that prepare evidence without marking it passed", () => {
    expect(validateEvidenceReadinessChecklists({
      manual,
      provider,
      runtime,
      adminTruth,
      currentBetaExitStatus: statusFixture(),
    })).toEqual([]);
  });

  it("fails when the manual screenshot route list is incomplete", () => {
    const failures = validateEvidenceReadinessChecklists({
      manual: manual.replace("/dashboard/chat", ""),
      provider,
      runtime,
      adminTruth,
      currentBetaExitStatus: statusFixture(),
    });

    expect(failures).toContain('manual screenshot checklist must include "/dashboard/chat".');
  });

  it("fails when provider requirements omit paid bonus source truth", () => {
    const failures = validateEvidenceReadinessChecklists({
      manual,
      provider: provider.replace("Paid bonus remains purchased balance", ""),
      runtime,
      adminTruth,
      currentBetaExitStatus: statusFixture(),
    });

    expect(failures).toContain('provider smoke checklist must include "Paid bonus remains purchased balance".');
  });

  it("fails when runtime requirements omit creator routes", () => {
    const failures = validateEvidenceReadinessChecklists({
      manual,
      provider,
      runtime: runtime.replace("`/creators/[username]` loads a creator profile", ""),
      adminTruth,
      currentBetaExitStatus: statusFixture(),
    });

    expect(failures).toContain('runtime smoke checklist must include "`/creators/[username]` loads a creator profile".');
  });

  it("fails when admin truth sample rules omit redaction or freshness", () => {
    const failures = validateEvidenceReadinessChecklists({
      manual,
      provider,
      runtime,
      adminTruth: adminTruth.replace("sourceFreshnessUtc", ""),
      currentBetaExitStatus: statusFixture(),
    });

    expect(failures).toContain('admin truth sample checklist must include "sourceFreshnessUtc".');
  });

  it("fails when beta exit is marked ready while evidence is missing", () => {
    const failures = validateEvidenceReadinessChecklists({
      manual,
      provider,
      runtime,
      adminTruth,
      currentBetaExitStatus: statusFixture(true),
    });

    expect(failures).toContain("current beta exit status must not mark beta exit ready while evidence is missing.");
  });
});
