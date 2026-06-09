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

  it("keeps provider presence external and reports only redacted env metadata", () => {
    const report = buildConfigEnvContractReport({ generatedAtUtc: "2026-06-08T00:00:00.000Z" });
    const validation = validateConfigEnvContractReport(report);
    const serialized = JSON.stringify(report);

    expect(report.providerPresenceEvidence.status).toBe("external_evidence_required");
    expect(report.providerPresenceEvidence.evidenceKind).toBe("external_provider_presence");
    expect(report.providerPresenceEvidence.providerEnvVarCount).toBeGreaterThan(0);
    expect(report.providerPresenceEvidence.secretNamesOnly).toBe(true);
    expect(report.providerPresenceEvidence.secretValuesPrinted).toBe(false);
    expect(report.providerPresenceEvidence.sourceCheckCanPass).toBe(true);
    expect(report.providerPresenceEvidence.doesNotProve).toContain("does not prove credentials");
    expect(report.remainingGaps).toContain("No unregistered env variables found; provider presence remains external evidence.");
    expect(serialized).not.toContain("BEGIN PRIVATE KEY");
    expect(serialized).not.toContain("paypal_live_");
    expect(serialized).not.toContain("access_token");
    expect(validation.ok).toBe(true);
  });
});
