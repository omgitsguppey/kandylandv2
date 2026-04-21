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

  it("splits admin UI work into fast coverage/runtime and signoff audits", () => {
    const plan = selectVerificationPlan({
      paths: ["src/app/admin/debug/page.tsx"],
    });

    expect(plan.fastCommands).toContain("npm run check:ui:coverage");
    expect(plan.fastCommands).toContain("npm run check:ui:runtime");
    expect(plan.signoffCommands).toContain("npm run check:ui:audits");
    expect(plan.signoffCommands).toContain("npm run check:continuity");
  });

  it("adds analytics semantics fast checks and continuity at signoff", () => {
    const plan = selectVerificationPlan({
      paths: ["src/lib/telemetry.ts"],
    });

    expect(plan.fastCommands).toContain("npm run check:telemetry");
    expect(plan.fastCommands).toContain("npm run check:analytics-semantics");
    expect(plan.signoffCommands).toContain("npm run check:analytics:continuity");
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
});
