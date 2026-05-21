import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { HUMAN_ERROR_DICTIONARY } from "@/lib/errors/error-dictionary";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("route diagnostics error map", () => {
  it("keeps required route diagnostic artifacts and validator wired", () => {
    expect(existsSync(join(process.cwd(), "scripts/agent/validate-route-diagnostics-error-map.ts"))).toBe(true);
    expect(existsSync(join(process.cwd(), "agent/state/route-diagnostics-error-map.generated.json"))).toBe(true);
    expect(existsSync(join(process.cwd(), "docs/agent-truth/route-diagnostics-error-map.md"))).toBe(true);
  });

  it("maps route diagnostics to human owner, surface, next action, and error key", () => {
    const source = readSource("src/lib/server/route-diagnostics.ts");

    expect(source).toContain("resolveHumanError");
    expect(source).toContain("diagnosticDescriptor?.owner");
    expect(source).toContain("diagnosticDescriptor?.surface");
    expect(source).toContain("diagnosticDescriptor?.primaryAction");
    expect(source).toContain("diagnosticDescriptor?.errorKey");
    expect(source).toContain("humanMessage: diagnosticDescriptor.operatorMessage");
  });

  it("covers debug-facing route families in the human error dictionary", () => {
    for (const key of [
      "creator_settings_unavailable",
      "creator_drops_unavailable",
      "wallet_packages_unavailable",
      "analytics_source_unavailable",
      "debug_route_degraded",
      "admin_truth_unavailable",
    ]) {
      expect(HUMAN_ERROR_DICTIONARY[key as keyof typeof HUMAN_ERROR_DICTIONARY], key).toBeTruthy();
    }
  });

  it("does not classify 4xx validation failures as direct retry actions", () => {
    expect(HUMAN_ERROR_DICTIONARY.validation_failed.primaryAction).not.toBe("retry");
    expect(HUMAN_ERROR_DICTIONARY.missing_required_field.primaryAction).not.toBe("retry");
  });

  it("keeps raw internal server errors out of mapped route responses", () => {
    const authSource = readSource("src/lib/server/auth.ts");
    const walletPackages = readSource("src/app/api/wallet/packages/route.ts");
    const adminUsername = readSource("src/app/api/admin/users/[userId]/username/route.ts");

    expect(authSource).toContain("buildHumanApiErrorResponse");
    expect(authSource).not.toContain('{ error: "Internal server error" }');
    expect(walletPackages).toContain("wallet_packages_unavailable");
    expect(walletPackages).not.toContain('"Failed to fetch packages"');
    expect(adminUsername).toContain("buildHumanApiErrorResponse");
    expect(adminUsername).not.toContain('error.message || "Internal server error"');
  });
});
