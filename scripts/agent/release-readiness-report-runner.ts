import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildReleaseReadinessContext,
  buildReleaseReadinessReport,
  RELEASE_READINESS_OUTPUTS,
  renderReleaseReadinessDoc,
  type ReleaseReadinessReportKind,
} from "../../src/lib/release-readiness/final-release-readiness";
import { withGeneratedReportEnvelope } from "./generated-report-envelope";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runReleaseReadinessReport(kind: ReleaseReadinessReportKind) {
  const context = buildReleaseReadinessContext(ROOT);
  const report = buildReleaseReadinessReport(kind, context);
  const envelopeReport = withGeneratedReportEnvelope(report as unknown as Record<string, unknown>, {
    reportKey: kind,
    status: report.validationFailures.length > 0 ? "fail" : "pass",
    generatedAtUtc: report.generatedAtUtc,
    currentHead: report.currentHead,
    evidenceClass: "source_snapshot",
    canClearSourceGate: report.validationFailures.length === 0,
    nextExactSteps: Array.isArray((report as Record<string, unknown>).nextExactSteps)
      ? ((report as Record<string, unknown>).nextExactSteps as unknown[]).filter((step): step is string => typeof step === "string")
      : ["Use the owning release-readiness validator, then attach source/site-activity/deployed-route/admin-source evidence separately."],
    validationFailures: report.validationFailures,
    doesNotProve: [
      "Does not prove deployed runtime behavior.",
      "Does not prove provider-backed site activity.",
      "Does not prove current admin source activity samples.",
      "Does not prove external billing or GitHub PR state unless an opt-in fresh evidence artifact says so.",
    ],
  });
  const output = RELEASE_READINESS_OUTPUTS[kind];

  mkdirSync(join(ROOT, dirname(output.statePath)), { recursive: true });
  mkdirSync(join(ROOT, dirname(output.docPath)), { recursive: true });
  writeFileSync(join(ROOT, output.statePath), `${JSON.stringify(envelopeReport, null, 2)}\n`);
  writeFileSync(join(ROOT, output.docPath), renderReleaseReadinessDoc(kind, envelopeReport as unknown as typeof report));

  if (report.validationFailures.length > 0) {
    console.error(`${kind} validation failed:`);
    for (const failure of report.validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`${kind} passed. currentHead=${report.currentHead}`);
}
