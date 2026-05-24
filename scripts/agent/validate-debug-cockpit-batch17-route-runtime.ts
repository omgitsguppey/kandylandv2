import { assertBatch17, buildFinalBatch17ValidationReport, writeJson, writeMarkdown } from "./debug-cockpit-batch17-shared";

const REPORT_PATH = "agent/state/debug-cockpit-batch17-route-runtime.generated.json";
const DOC_PATH = "docs/agent-truth/debug-cockpit-batch17-route-runtime.md";

export function validateDebugCockpitBatch17RouteRuntime() {
  const report = buildFinalBatch17ValidationReport();
  const failures: string[] = [...report.validationFailures];
  assertBatch17(report.trackedRoutes === report.observedRoutes + report.unseenRoutes, "route runtime count reconciliation fails.", failures);
  assertBatch17(report.exactFailRoutes.length > 0, "exact current failing route is missing.", failures);
  assertBatch17(report.currentFailsAfter === 1, "current fail count should preserve the one real failure.", failures);
  assertBatch17(report.warningGroupsAfter > 0 && report.warningGroupsAfter < report.warningSamplesBefore, "warn samples are not grouped.", failures);
  assertBatch17(report.currentSlowRoutes < report.slowSamples, "slow samples treated as raw warnings.", failures);
  assertBatch17(report.nativeChatStatusAfter !== "contradictory_copy" && report.compatChatStatusAfter !== "contradictory_copy", "native/compat chat copy contradicts counts.", failures);
  assertBatch17(report.compatLegacyRemovalDate === "2026-07-31", "legacy compat date missing.", failures);
  assertBatch17(report.displayContradictionsAfter === 0, "display still shows LIVE for stale/unseen/fail/warn submetrics.", failures);
  assertBatch17(report.scoreDimensions.length >= 6, "score dimensions missing.", failures);
  assertBatch17(report.dirtyFilesClassified === true, "dirty files unclassified.", failures);
  assertBatch17(report.openPrsClassified === true, "open PRs unclassified.", failures);
  if (failures.length > 0) throw new Error(`Debug cockpit Batch 17 route runtime validation failed:\n- ${failures.join("\n- ")}`);

  report.validationFailures = failures;
  writeJson(REPORT_PATH, report);
  writeMarkdown(DOC_PATH, [
    "# Debug Cockpit Batch 17 Route Runtime",
    "",
    "Status: route runtime rollups are classified by current failure, stale route, unseen route, warning group, and slow sample history.",
    `- Tracked/observed/unseen/stale: ${report.trackedRoutes}/${report.observedRoutes}/${report.unseenRoutes}/${report.staleRoutes}`,
    `- Current failures: ${report.currentFailsAfter} (${report.exactFailRoutes.join(", ")})`,
    `- Warnings: ${report.warningSamplesBefore} samples -> ${report.warningGroupsAfter} groups`,
    `- Slow: ${report.slowSamples} samples -> ${report.currentSlowRoutes} current slow routes`,
    `- Native chat: ${report.nativeChatStatusAfter}, error rate ${report.nativeChatErrorRate}, threshold ${report.nativeChatThreshold}`,
    `- Compat chat: ${report.compatChatStatusAfter}, removal after ${report.compatLegacyRemovalDate}`,
    "",
    "## Release Notes",
    ...report.releaseNotes.map((note) => `- ${note}`),
  ]);
  return report;
}

if (require.main === module) {
  const report = validateDebugCockpitBatch17RouteRuntime();
  console.log(`Debug cockpit Batch 17 route runtime passed: fail=${report.currentFailsAfter}, native=${report.nativeChatStatusAfter}, compat=${report.compatChatStatusAfter}.`);
}
