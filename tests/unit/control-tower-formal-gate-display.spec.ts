import { describe, expect, it } from "vitest";

import {
  buildFormalGateDisplay,
  formatPublicBetaReadinessStatusForAdmin,
  resolvePublicBetaCapDetailForAdmin,
} from "@/lib/agent-score/formal-gate-display";

describe("control tower formal gate display", () => {
  it("keeps operator payment confirmation separate from provider-backed and runtime source evidence", () => {
    const display = buildFormalGateDisplay({
      gateId: "runtime_provider_smoke",
      operatorConfirmedPaymentUsd: 37.5,
      operatorConfirmedProduct: "GumDrops",
      formalProviderArtifactAttached: false,
      deployedRuntimeSmokeAttached: false,
      sourceReady: true,
    });

    expect(display.displayStatus).toBe("operator_confirmed_partial");
    expect(display.notSourceBug).toBe(true);
    expect(display.operatorSignal).toContain("GumDrop payment operator-confirmed");
    expect(display.operatorSignal).not.toContain("$37.5");
    expect(display.formalProviderGateCleared).toBe(false);
    expect(display.deployedRuntimeGateCleared).toBe(false);
    expect(display.evidencePaths).toContain("agent/state/provider-smoke-evidence.generated.json");
    expect(display.evidencePaths).toContain("agent/state/runtime-smoke-evidence.generated.json");
    expect(display.nextAction).toContain("provider-backed source activity evidence");
    expect(display.nextAction).not.toContain("site activity");
  });

  it("shows source-ready admin truth as formal sample required instead of unknown", () => {
    const display = buildFormalGateDisplay({
      gateId: "admin_truth_sample_artifact",
      sourceReady: true,
      adminTruthSourceArtifact: "agent/state/admin-truth-source-sample.generated.json",
      formalAdminTruthSampleAttached: false,
    });

    expect(display.displayStatus).toBe("source_ready_formal_missing");
    expect(display.adminTruthStatus).toBe("source_ready_formal_admin_sample_required");
    expect(display.notSourceBug).toBe(true);
    expect(display.nextAction).toContain("redacted admin source activity sample");
  });

  it("uses source evidence wording for public beta cap display without breaking legacy aliases", () => {
    const display = resolvePublicBetaCapDetailForAdmin(
      "Provider smoke: operator-confirmed PayPal activity exists; provider-backed site activity evidence is missing.",
    );

    expect(display.state).toBe("site_activity_evidence_required");
    expect(display.label).toBe("Source activity evidence required");
    expect(display.detail).toContain("provider-backed source activity evidence");
    expect(display.detail).not.toContain("site activity");
    expect(formatPublicBetaReadinessStatusForAdmin({
      status: "review",
      capDetails: ["provider smoke missing"],
    })).toBe("Source activity evidence required");
  });

  it("only reads an explicit required-report count from refresh detail", () => {
    const timeWindow = resolvePublicBetaCapDetailForAdmin(
      "Report freshness and source integrity: Public beta score is outside the 24-hour freshness window.",
    );
    const reportCount = resolvePublicBetaCapDetailForAdmin(
      "Report freshness: 6 required generated report(s) are outside the freshness window.",
    );

    expect(timeWindow.detail).toBe("Public beta score is outside the 24-hour freshness window.");
    expect(timeWindow.detail).not.toContain("24 required generated reports");
    expect(reportCount.detail).toBe("6 required generated reports are outside the freshness window.");
  });

  it("preserves unknown code-version provenance in refresh copy", () => {
    const display = resolvePublicBetaCapDetailForAdmin(
      "Report freshness and source integrity: Current code version is unavailable, so score provenance is unknown.",
    );

    expect(display.state).toBe("refresh_due");
    expect(display.detail).toBe("Current code version is unavailable, so the canonical score decision cannot be used.");
  });

  it("keeps an explicit failed verdict ahead of secondary evidence copy", () => {
    expect(formatPublicBetaReadinessStatusForAdmin({
      status: "failed",
      reason: "A required validator failed.",
      capDetails: ["Provider smoke evidence remains required."],
    })).toBe("Failed");
  });
});
