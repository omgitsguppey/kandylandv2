import { describe, expect, it } from "vitest";

import { buildFormalGateDisplay } from "@/lib/agent-score/formal-gate-display";

describe("control tower formal gate display", () => {
  it("keeps operator payment confirmation separate from formal provider and runtime smoke", () => {
    const display = buildFormalGateDisplay({
      gateId: "runtime_provider_smoke",
      operatorConfirmedPaymentUsd: 50,
      operatorConfirmedProduct: "GumDrops",
      formalProviderArtifactAttached: false,
      deployedRuntimeSmokeAttached: false,
      sourceReady: true,
    });

    expect(display.displayStatus).toBe("operator_confirmed_partial");
    expect(display.notSourceBug).toBe(true);
    expect(display.operatorSignal).toContain("$50 GumDrop payment");
    expect(display.formalProviderGateCleared).toBe(false);
    expect(display.deployedRuntimeGateCleared).toBe(false);
    expect(display.evidencePaths).toContain("agent/state/provider-smoke-evidence.generated.json");
    expect(display.evidencePaths).toContain("agent/state/runtime-smoke-evidence.generated.json");
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
    expect(display.nextAction).toContain("redacted first-party admin truth sample");
  });
});
