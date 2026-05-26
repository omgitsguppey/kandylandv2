import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildTruthReconciliationReport,
  renderTruthReconciliationDoc,
  TRUTH_RECONCILIATION_OUTPUTS,
  type TruthReconciliationReportKind,
} from "../../src/lib/release-readiness/automated-truth-reconciliation";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runTruthReconciliationReport(kind: TruthReconciliationReportKind) {
  const report = buildTruthReconciliationReport(kind, ROOT);
  const output = TRUTH_RECONCILIATION_OUTPUTS[kind];

  mkdirSync(join(ROOT, dirname(output.statePath)), { recursive: true });
  mkdirSync(join(ROOT, dirname(output.docPath)), { recursive: true });
  writeFileSync(join(ROOT, output.statePath), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(ROOT, output.docPath), renderTruthReconciliationDoc(kind, report));

  if (report.validationFailures.length > 0) {
    console.error(`${kind} validation failed:`);
    for (const failure of report.validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`${kind} passed. currentHead=${report.currentHead}`);
}
