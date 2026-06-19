import { describe, expect, it } from "vitest";

import { validateEvidenceReadinessChecklists } from "../../scripts/agent/validate-evidence-readiness-checklists";

const uiSourceCoverage = [
  "UI Surface Coverage Gate",
  "codebase tell on itself",
  "Screenshots are optional follow-up evidence only",
  "source_surface_checked",
  "codexScoreBlocking=false",
  "npm run check:ui:coverage",
  "npm run check:admin-browser-surface-smoke",
  "npm run check:device-ui",
  "not as the readiness gate",
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
      "Use docs/agent-truth/ui-visual-smoke-minimal.md.",
      "Use docs/agent-truth/provider-smoke-evidence-checklist.md.",
      "Use docs/agent-truth/runtime-smoke-evidence-checklist.md.",
      "Use docs/agent-truth/admin-truth-sample-evidence-checklist.md.",
    ],
  };
}

describe("evidence readiness checklists", () => {
  it("accepts checklist docs that prepare evidence without marking it passed", () => {
    expect(validateEvidenceReadinessChecklists({
      uiSourceCoverage,
      provider,
      runtime,
      adminTruth,
      currentBetaExitStatus: statusFixture(),
    })).toEqual([]);
  });

  it("fails when UI source coverage instructions omit the source gate", () => {
    const failures = validateEvidenceReadinessChecklists({
      uiSourceCoverage: uiSourceCoverage.replace("codebase tell on itself", ""),
      provider,
      runtime,
      adminTruth,
      currentBetaExitStatus: statusFixture(),
    });

    expect(failures).toContain('UI source coverage checklist must include "codebase tell on itself".');
  });

  it("fails when provider requirements omit paid bonus source truth", () => {
    const failures = validateEvidenceReadinessChecklists({
      uiSourceCoverage,
      provider: provider.replace("Paid bonus remains purchased balance", ""),
      runtime,
      adminTruth,
      currentBetaExitStatus: statusFixture(),
    });

    expect(failures).toContain('provider smoke checklist must include "Paid bonus remains purchased balance".');
  });

  it("fails when runtime requirements omit creator routes", () => {
    const failures = validateEvidenceReadinessChecklists({
      uiSourceCoverage,
      provider,
      runtime: runtime.replace("`/creators/[username]` loads a creator profile", ""),
      adminTruth,
      currentBetaExitStatus: statusFixture(),
    });

    expect(failures).toContain('runtime smoke checklist must include "`/creators/[username]` loads a creator profile".');
  });

  it("fails when admin truth sample rules omit redaction or freshness", () => {
    const failures = validateEvidenceReadinessChecklists({
      uiSourceCoverage,
      provider,
      runtime,
      adminTruth: adminTruth.replace("sourceFreshnessUtc", ""),
      currentBetaExitStatus: statusFixture(),
    });

    expect(failures).toContain('admin truth sample checklist must include "sourceFreshnessUtc".');
  });

  it("fails when beta exit is marked ready while evidence is missing", () => {
    const failures = validateEvidenceReadinessChecklists({
      uiSourceCoverage,
      provider,
      runtime,
      adminTruth,
      currentBetaExitStatus: statusFixture(true),
    });

    expect(failures).toContain("current beta exit status must not mark beta exit ready while evidence is missing.");
  });
});
