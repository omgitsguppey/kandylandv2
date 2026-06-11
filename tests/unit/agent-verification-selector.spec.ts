import { describe, expect, it } from "vitest";

import { selectVerificationPlan } from "../../scripts/agent/verification-selector";

describe("agent verification selector", () => {
  it("keeps narrow route fixes on a targeted fast loop", () => {
    const plan = selectVerificationPlan({
      paths: ["src/app/api/creator/settings/route.ts"],
    });

    expect(plan.fastCommands).toContain("npm run typecheck");
    expect(plan.fastCommands.some((entry) => entry.includes("npm run agent:test -- src/app/api/creator/settings/route.ts"))).toBe(true);
    expect(plan.signoffCommands).not.toContain("npm run check:continuity");
    expect(plan.forbiddenSurfaces).toContain("src/lib/gumdrop-ledger.ts");
  });

  it("routes admin UI work to the dedicated authenticated browser smoke lane", () => {
    const plan = selectVerificationPlan({
      paths: ["src/app/admin/debug/page.tsx"],
    });

    expect(plan.fastCommands).toContain("npm run check:ui:coverage");
    expect(plan.fastCommands).toContain("npm run check:admin-browser-surface-smoke");
    expect(plan.fastCommands).not.toContain("npm run check:ui:runtime");
    expect(plan.signoffCommands).toContain("npm run check:admin-browser-surface-smoke:browser");
    expect(plan.signoffCommands).not.toContain("npm run check:ui:audits");
    expect(plan.signoffCommands).toContain("npm run check:continuity");
    expect(plan.manualEvidenceRequirements).toContain("admin_browser_auth: authenticated admin browser signoff requires ADMIN_BROWSER_SMOKE_STORAGE_STATE and does not clear provider/runtime/admin-truth gates.");
  });

  it("adds analytics semantics fast checks and continuity at signoff", () => {
    const plan = selectVerificationPlan({
      paths: ["src/lib/telemetry.ts"],
    });

    expect(plan.fastCommands).toContain("npm run check:telemetry-dependency-graph");
    expect(plan.fastCommands).toContain("npm run check:telemetry");
    expect(plan.fastCommands).toContain("npm run check:analytics-semantics");
    expect(plan.fastCommands).toContain("npm run check:telemetry-parity-score");
    expect(plan.signoffCommands).toContain("npm run check:analytics:continuity");
    expect(plan.manualEvidenceRequirements).toContain("telemetry_runtime: source checks cannot prove provider/runtime/admin sample evidence.");
  });

  it("keeps functions runtime checks separate from scheduler signoff lanes", () => {
    const plan = selectVerificationPlan({
      paths: ["functions/src/queue-runtime.ts"],
    });

    expect(plan.fastCommands).toContain("npm --prefix functions run check");
    expect(plan.signoffCommands).toContain("npm run check:scheduler:freshness");
    expect(plan.signoffCommands).toContain("npm run check:queue:runtime");
    expect(plan.signoffCommands).toContain("npm run check:runtime:continuity");
  });

  it("treats repo tooling as broad work and requires agent intelligence signoff", () => {
    const plan = selectVerificationPlan({
      paths: ["scripts/agent/build-task-context.ts"],
    });

    expect(plan.broadWork).toBe(true);
    expect(plan.fastCommands).toContain("npm run check:agent-context");
    expect(plan.signoffCommands).toContain("npm run check:agent-intelligence");
    expect(plan.signoffCommands).toContain("npm run eval:agent-context");
    expect(plan.signoffCommands).toContain("npm run check:continuity");
  });

  it("escalates payment-adjacent files without selecting provider or broad checks", () => {
    const plan = selectVerificationPlan({
      paths: ["src/components/PurchaseModal.tsx"],
    });

    expect(plan.fastCommands).toContain("npm run typecheck");
    expect(plan.fastCommands).toContain("npm run check:payment-unlock-security");
    expect(plan.fastCommands).toContain("npm run check:purchase-telemetry-truth");
    expect(plan.signoffCommands).toContain("npm run check:legal-payment-copy");
    expect(plan.manualEvidenceRequirements).toContain("payment_provider: PayPal/provider success requires formal external smoke evidence, not source-only checks.");
    expect(plan.protectedDomainEscalations.some((entry) => entry.startsWith("payment_economy_unlock:"))).toBe(true);
    expect(plan.fastCommands).not.toContain("npm run check");
    expect(plan.forbiddenByDefaultCommands).toContain("provider API calls");
  });

  it("routes generated agent artifacts to authority/context checks", () => {
    const plan = selectVerificationPlan({
      paths: ["agent/state/signal-telemetry-graph.generated.json"],
    });

    expect(plan.fastCommands).toContain("npm run check:generated-report-authority");
    expect(plan.fastCommands).toContain("npm run check:agent-context");
    expect(plan.manualEvidenceRequirements).toContain("generated_artifacts: refresh only consumed artifacts; stale reports remain evidence, not runtime truth.");
  });
});
