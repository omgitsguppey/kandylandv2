import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const phaseOneSource = readFileSync(join(process.cwd(), "scripts/agent/validate-phase-one-lock.ts"), "utf8");
const generatedReportValidatorSource = readFileSync(
  join(process.cwd(), "scripts/agent/validate-generated-report-authority.ts"),
  "utf8",
);
const paypalCaptureSource = readFileSync(join(process.cwd(), "src/app/api/paypal/capture/route.ts"), "utf8");

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/gu, " ").trim();
}

describe("Phase One lock source assertions", () => {
  it("recognizes the paid-refill threshold across formatter line wrapping", () => {
    expect(phaseOneSource).toContain("function assertIncludesNormalized");
    expect(phaseOneSource).toContain("assertIncludesNormalized(paypalCapture");
    expect(normalizeWhitespace(paypalCaptureSource)).toContain(
      "sourceAwareBalance.purchased < 100 && nextSourceAwareBalance.purchased >= 100",
    );
  });

  it("checks generated-report enforcement primitives instead of one guidance sentence", () => {
    for (const primitive of [
      "GENERATED_REPORT_RUNTIME_FORBIDDEN_ROOTS",
      "findGeneratedReportRuntimeRead",
      "runtimeViolations",
    ]) {
      expect(generatedReportValidatorSource).toContain(primitive);
      expect(phaseOneSource).toContain(`assertIncludes(generatedReportValidator, "${primitive}"`);
    }

    expect(phaseOneSource).not.toContain(
      'assertIncludes(generatedReportValidator, "Runtime src/app, src/components, and src/lib/server',
    );
  });
});
