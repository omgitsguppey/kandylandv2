import { assertBatch17, buildChatRouteCohortValidationReport, writeJson, writeMarkdown } from "./debug-cockpit-batch17-shared";

const REPORT_PATH = "agent/state/chat-route-cohort-runtime.generated.json";
const DOC_PATH = "docs/agent-truth/chat-route-cohort-runtime.md";

export function validateChatRouteCohortRuntime() {
  const report = buildChatRouteCohortValidationReport();
  const failures: string[] = [];
  assertBatch17(report.nativeChat.narrativeContradictionCount === 0, "native chat top counts contradict narrative copy.", failures);
  assertBatch17(report.compatChat.narrativeContradictionCount === 0, "compat chat top counts contradict narrative copy.", failures);
  assertBatch17(report.compatChat.legacyRemovalDate === "2026-07-31", "compat legacy removal date missing.", failures);
  assertBatch17(report.nativeChat.errorThreshold > 0, "native chat error rate lacks threshold.", failures);
  assertBatch17(report.nativeChat.errorSamples === 14, "native chat error samples are hidden.", failures);
  assertBatch17(report.compatChat.status !== "failed", "compat traffic is classified as failure solely for being legacy-visible.", failures);
  if (failures.length > 0) throw new Error(`Chat route cohort runtime validation failed:\n- ${failures.join("\n- ")}`);

  report.validationFailures = failures;
  writeJson(REPORT_PATH, report);
  writeMarkdown(DOC_PATH, [
    "# Chat Route Cohort Runtime",
    "",
    "Status: native chat and compatibility chat are separate route runtime cohorts.",
    `- Native chat: ${report.nativeChat.narrative}`,
    `- Native threshold: ${(report.nativeChat.errorThreshold * 100).toFixed(1)}%`,
    `- Compat chat: ${report.compatChat.narrative}`,
    `- Compat migration: ${report.compatChat.migrationStatus}; removal after ${report.compatChat.legacyRemovalDate}`,
  ]);
  return report;
}

if (require.main === module) {
  const report = validateChatRouteCohortRuntime();
  console.log(`Chat route cohort runtime passed: native=${report.nativeChat.status}, compat=${report.compatChat.status}.`);
}
