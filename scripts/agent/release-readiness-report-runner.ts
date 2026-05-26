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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runReleaseReadinessReport(kind: ReleaseReadinessReportKind) {
  const context = buildReleaseReadinessContext(ROOT);
  const report = buildReleaseReadinessReport(kind, context);
  const output = RELEASE_READINESS_OUTPUTS[kind];

  mkdirSync(join(ROOT, dirname(output.statePath)), { recursive: true });
  mkdirSync(join(ROOT, dirname(output.docPath)), { recursive: true });
  writeFileSync(join(ROOT, output.statePath), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(ROOT, output.docPath), renderReleaseReadinessDoc(kind, report));

  if (report.validationFailures.length > 0) {
    console.error(`${kind} validation failed:`);
    for (const failure of report.validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`${kind} passed. currentHead=${report.currentHead}`);
}
