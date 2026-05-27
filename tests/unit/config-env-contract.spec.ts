import { describe, expect, it } from "vitest";

import {
  buildConfigEnvContractReport,
  validateConfigEnvContractReport,
} from "../../src/lib/config-hardening/config-env-contract";

describe("config env contract", () => {
  it("registers every discovered env var without leaking values", () => {
    const report = buildConfigEnvContractReport();
    const validation = validateConfigEnvContractReport(report);

    expect(report.envVars.length).toBeGreaterThan(20);
    expect(report.envVars.some((entry) => entry.name === "FIREBASE_PRIVATE_KEY")).toBe(true);
    expect(report.envVars.some((entry) => entry.name === "NEXT_PUBLIC_FIREBASE_API_KEY")).toBe(true);
    expect(report.secretValueLeakCount).toBe(0);
    expect(validation.ok).toBe(true);
  });
});
