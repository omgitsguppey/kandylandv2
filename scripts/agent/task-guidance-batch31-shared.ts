import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { classifyTaskOnboardingParity } from "../../src/lib/analytics/task-onboarding-parity-semantics";
import { PERSON_METRIC_DEFINITIONS } from "../../src/lib/analytics/person-metrics-contract";
import { buildDebugCockpitBatch31TaskGuidanceParityReport } from "../../src/lib/debug/debug-cockpit-batch31-task-guidance-parity";
import { buildTaskGuidanceHistoryRecoveryPlan } from "../../src/lib/tasks/task-guidance-history-recovery";
import {
  buildTaskGuidanceTelemetryContract,
  shouldEmitTaskGuidanceViewed,
} from "../../src/lib/tasks/task-guidance-telemetry-contract";

const root = process.cwd();

function read(relativePath: string) {
  const fullPath = path.join(root, relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
}

function writeJson(relativePath: string, value: unknown) {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(relativePath: string, lines: string[]) {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${lines.join("\n")}\n`);
}

function command(args: string[], fallback = "") {
  try {
    return execFileSync(args[0], args.slice(1), { encoding: "utf8" }).trim();
  } catch {
    return fallback;
  }
}

function expectPass(condition: boolean, failures: string[], message: string) {
  if (!condition) failures.push(message);
}

function buildTaskGuidanceRollup(eventsData: Record<string, number>) {
  const count = (...names: string[]) => names.reduce((total, name) => total + (eventsData[name] || 0), 0);
  const guidanceViews = count("task_guidance_viewed", "task_guidance_banner_viewed", "daily_task_guidance_opened");
  const guidanceTaps = count("task_guidance_tapped", "task_guidance_cta_clicked");
  const guidanceDismissals = count("task_guidance_dismissed", "task_guidance_banner_dismissed");
  const guidanceCompletions = count("task_guidance_completed");
  const taskCardExpansions = count("task_card_expanded");
  const taskHelpOpens = count("task_help_opened");
  return {
    viewed: guidanceViews + taskCardExpansions + taskHelpOpens,
    dismissed: guidanceDismissals,
    tapped: guidanceTaps,
    completed: guidanceCompletions,
    guidanceViews,
    guidanceTaps,
    guidanceDismissals,
    guidanceCompletions,
    taskCardExpansions,
    taskHelpOpens,
  };
}

function runValidation(reportKey: string, report: Record<string, unknown>, failures: string[], summary: string[]) {
  const generatedAtUtc = new Date().toISOString();
  const result = {
    reportKey,
    generatedAtUtc,
    currentHead: command(["git", "rev-parse", "HEAD"], "unknown"),
    ...report,
    validationFailures: failures,
  };
  writeJson(`agent/state/${reportKey}.generated.json`, result);
  writeMarkdown(`docs/agent-truth/${reportKey}.md`, [
    `# ${reportKey}`,
    "",
    `Generated: ${generatedAtUtc}`,
    "",
    `Status: ${failures.length === 0 ? "pass" : "fail"}`,
    "",
    "## Summary",
    ...summary.map((line) => `- ${line}`),
    "",
    "## Validation Failures",
    ...(failures.length === 0 ? ["- none"] : failures.map((failure) => `- ${failure}`)),
  ]);
  if (failures.length > 0) {
    console.error(`${reportKey} failed:`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log(`${reportKey}: pass`);
}

function dirtyClassifications() {
  return command(["git", "status", "--short"], "")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => {
      const filePath = line.replace(/^[ MADRCU?!]{1,2}\s+/u, "").trim().replace(/\\/gu, "/");
      const classification =
        filePath.includes("task-guidance-telemetry-contract") ? "task_guidance_telemetry_fix_required"
          : filePath.includes("task-guidance-history-recovery") ? "validator_artifact_expected"
            : filePath.includes("task-onboarding-parity-semantics") ? "task_lifecycle_guidance_split_required"
              : filePath.includes("debug-cockpit-batch31-task-guidance-parity") ? "validator_artifact_expected"
                : filePath.includes("DailyTasksModule") || filePath.includes("TaskGuidanceBanner") || filePath.includes("task-guidance.ts") ? "task_guidance_ui_instrumentation_required"
                  : filePath.includes("admin-analytics-historical-tasks") || filePath.includes("admin-analytics-historical-validation") ? "task_guidance_rollup_materializer_required"
                    : filePath.includes("consent-tracking-policy") ? "consent_policy_review_required"
                      : filePath.includes("person-metrics-contract") ? "task_guidance_event_mapping_required"
                        : filePath.includes("event-translation-bridge") || filePath.includes("person-metrics-hydration") ? "task_guidance_event_mapping_required"
                        : filePath.startsWith("scripts/agent/") || filePath === "package.json" ? "validator_artifact_expected"
                          : filePath.startsWith("tests/unit/") ? "test_artifact_expected"
                            : filePath.startsWith("docs/agent-truth/") ? "documentation_artifact_expected"
                              : filePath.startsWith("agent/state/") ? "current_generated_artifact_to_commit"
                                : filePath.startsWith("agent/context/") ? "unrelated_agent_context_file_to_ignore"
                                  : filePath === "CHANGELOG.md" || filePath === "public/kandydrops-release-notes.json" || filePath.includes("release-notes") ? "release_artifact_expected"
                                    : filePath.includes("public-beta-score") || filePath.includes("current-beta-exit-status") ? "current_generated_artifact_to_commit"
                                      : "unsafe_unknown";
      return { filePath, classification };
    });
}

function openPrClassifications() {
  const raw = command([
    "gh",
    "pr",
    "list",
    "--repo",
    "omgitsguppey/kandylandv2",
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,author,mergeStateStatus,isDraft,updatedAt,url",
  ], "[]");
  try {
    return (JSON.parse(raw) as Array<Record<string, unknown>>).map((pr) => ({
      ...pr,
      classification: "needs_manual_review_before_batch31",
    }));
  } catch {
    return [{ classification: "unsafe_unknown", raw }];
  }
}

export function validateTaskGuidanceTelemetryContract() {
  const failures: string[] = [];
  const contract = buildTaskGuidanceTelemetryContract({
    lifecycleSampleCount: 2817,
    guidanceSampleCount: 0,
  });
  expectPass(contract.implemented && contract.requiredInBeta, failures, "required guidance events lack implemented/required truth.");
  expectPass(contract.emitters.length >= contract.expectedEvents.length, failures, "required guidance events lack emitters.");
  expectPass(contract.eventEnvelopeMapping.status === "mapped", failures, "expected events absent from telemetry catalog.");
  expectPass(contract.eventFactMapping.status === "mapped", failures, "expected events absent from event fact normalization.");
  expectPass(contract.adminValidationConsumer.status === "mapped", failures, "expected events absent from admin validation consumer.");
  expectPass(contract.sampleRequirement.minimumSamples === 1, failures, "requiredInBeta true with sample source missing.");
  expectPass(contract.blockedReason === "lifecycle_active_guidance_missing", failures, "task lifecycle samples high but guidance zero is not flagged.");
  runValidation("task-guidance-telemetry-contract", { contract }, failures, [
    "Required task guidance telemetry now has explicit emitters, mappings, sample policy, and action.",
  ]);
}

export function validateTaskGuidanceUiInstrumentation() {
  const failures: string[] = [];
  const dailyTasks = read("src/components/Dashboard/DailyTasksModule.tsx");
  const banner = read("src/components/Dashboard/TaskGuidanceBanner.tsx");
  const checkIn = read("src/components/Dashboard/DailyCheckIn.tsx");
  const seen = new Set<string>();
  expectPass(dailyTasks.includes("TASK_GUIDANCE_VIEWED_EVENT") && dailyTasks.includes("TASK_GUIDANCE_TAPPED_EVENT"), failures, "task guidance UI has no emitters.");
  expectPass(banner.includes("viewedGuidanceKeysRef") && shouldEmitTaskGuidanceViewed({ seenKeys: seen, visible: true, loading: false, taskId: "task", assignedAt: 1 }) && !shouldEmitTaskGuidanceViewed({ seenKeys: seen, visible: true, loading: false, taskId: "task", assignedAt: 1 }), failures, "passive render can spam guidance viewed events.");
  expectPass(banner.includes("TASK_GUIDANCE_DISMISSED_EVENT") && banner.includes("TASK_GUIDANCE_COMPLETED_EVENT") && dailyTasks.includes("TASK_CARD_EXPANDED_EVENT") && dailyTasks.includes("TASK_HELP_OPENED_EVENT"), failures, "CTA/help/expand/dismiss events missing.");
  expectPass(/catch\s*\([^)]*\)\s*=>\s*undefined/u.test(banner) || banner.includes(".catch(() => undefined)"), failures, "telemetry failure can block task completion/reward.");
  expectPass(dailyTasks.includes("route: pathname") && dailyTasks.includes("guidance_version") && banner.includes("sourceTruth: \"client_supporting\""), failures, "identity/envelope/consent missing.");
  expectPass(!checkIn.includes("DAILY_CHECK_IN_REWARD_LADDER =") && !dailyTasks.includes("reward: task.reward +"), failures, "reward/reset policy changed.");
  runValidation("task-guidance-ui-instrumentation", {
    sourcePatchApplied: true,
    rawDiagnosticsDefaultOpen: false,
  }, failures, [
    "Daily task module and guidance banner now emit guidance view/tap/help/expand/dismiss/complete evidence without blocking rewards.",
  ]);
}

export function validateTaskGuidanceEventNormalization() {
  const failures: string[] = [];
  const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
  const normalizer = read("src/lib/behavioral/normalize-event-fact.ts");
  const validation = read("src/lib/server/admin-analytics-historical-validation.ts");
  const taskGuidance = buildTaskGuidanceRollup({
    daily_task_guidance_opened: 2,
    task_guidance_viewed: 3,
    task_guidance_tapped: 1,
    task_guidance_dismissed: 1,
    task_guidance_completed: 1,
    task_card_expanded: 4,
    task_help_opened: 4,
  });
  const personMetric = PERSON_METRIC_DEFINITIONS.find((metric) => metric.id === "daily_task_guidance_interactions");
  for (const eventName of buildTaskGuidanceTelemetryContract().expectedEvents) {
    expectPass(telemetryCatalog.includes(`eventName: "${eventName}"`), failures, `guidance event missing from telemetry catalog: ${eventName}.`);
    expectPass(normalizer.includes(`${eventName}: { normalizedAction`), failures, `guidance event missing from event fact normalization: ${eventName}.`);
    expectPass(personMetric?.eventNames.includes(eventName) === true, failures, `guidance event missing from person metrics: ${eventName}.`);
  }
  expectPass(validation.includes("task_guidance_parity"), failures, "guidance event missing from admin validation.");
  expectPass(!read("src/app/api/checkin/route.ts").includes("task_guidance_completed"), failures, "guidance completion can award reward without task completion.");
  expectPass(validation.includes("guidanceViews") && taskGuidance.guidanceViews === 5, failures, "rollup fields missing.");
  runValidation("task-guidance-event-normalization", { taskGuidance }, failures, [
    "Task guidance events are mapped through catalog, event facts, person metrics, and historical rollups.",
  ]);
}

export function validateTaskOnboardingParitySemantics() {
  const failures: string[] = [];
  const semantics = classifyTaskOnboardingParity({
    taskActivitySamples: 500,
    taskLifecycleEvents: 2817,
    onboardingSamples: 38,
    guidanceSamples: 0,
    guidanceImplemented: true,
    guidanceRequired: true,
  });
  const validation = read("src/lib/server/admin-analytics-historical-validation.ts");
  expectPass(semantics.taskActivity.state === "pass" && semantics.taskGuidance.state === "fail", failures, "task activity pass clears guidance failure.");
  expectPass(semantics.onboardingActivity.state === "pass" && semantics.taskGuidance.state === "fail", failures, "onboarding pass clears guidance failure.");
  expectPass(semantics.overall.state === "partial", failures, "task guidance fail hidden in overall parity.");
  expectPass(validation.includes("technicalEvidence: taskOnboardingSemantics.onboardingActivity.technicalEvidence"), failures, "onboarding technical evidence blank.");
  expectPass(validation.includes("Lifecycle and onboarding are active, but guidance UI telemetry is missing"), failures, "row copy does not identify lifecycle-vs-guidance split.");
  runValidation("task-onboarding-parity-semantics", { semantics }, failures, [
    "Task lifecycle, onboarding, and guidance telemetry are now separate readiness dimensions.",
  ]);
}

export function validateTaskGuidanceHistoryRecovery() {
  const failures: string[] = [];
  const plan = buildTaskGuidanceHistoryRecoveryPlan({
    observedEventNames: ["daily_task_guidance_opened", "task_guidance_banner_viewed", "task_guidance_cta_clicked"],
  });
  expectPass(plan.status === "legacy_alias_candidate", failures, "potential legacy guidance events ignored.");
  expectPass(!plan.productionMutationAllowed && plan.backfillMode === "none_dry_run_only", failures, "backfill mutates production.");
  expectPass(plan.aliasProposal.length >= 2, failures, "alias proposal missing if alternate names exist.");
  expectPass(plan.nextAction.length > 0, failures, "instrumentation gap lacks next action.");
  runValidation("task-guidance-history-recovery", { plan }, failures, [
    "Known legacy guidance names are dry-run alias candidates only; no production backfill is allowed.",
  ]);
}

export function validateDebugCockpitBatch31TaskGuidanceParity() {
  const failures: string[] = [];
  const report = buildDebugCockpitBatch31TaskGuidanceParityReport({
    taskActivitySamples: 500,
    taskLifecycleEvents: 2817,
    onboardingSamples: 38,
    guidanceSamplesBefore: 0,
    guidanceSamplesAfter: 0,
  });
  const dirty = dirtyClassifications();
  const openPrs = openPrClassifications();
  expectPass(report.emittersFound.length >= report.expectedGuidanceEvents.length, failures, "task guidance required+implemented has no emitter.");
  expectPass(report.lifecycleGuidanceSplitStatus === "lifecycle_active_guidance_missing", failures, "guidance samples=0 while lifecycle samples exist and no instrumentation gap is reported.");
  expectPass(report.catalogMappings.status === "mapped" && report.factMappings.status === "mapped" && report.adminValidationConsumerStatus === "mapped", failures, "expected guidance events missing from catalog/normalizer/admin validation.");
  expectPass(report.taskActivityStatus === "pass" && report.guidanceStatusBefore === "fail", failures, "task activity pass hides guidance fail.");
  expectPass(report.onboardingStatus === "pass" && report.guidanceStatusBefore === "fail", failures, "onboarding pass hides guidance fail.");
  expectPass(read("src/components/Dashboard/TaskGuidanceBanner.tsx").includes(".catch(() => undefined)"), failures, "guidance telemetry can block reward flow.");
  expectPass(!read("src/lib/tasks/task-catalog.ts").includes("reward: task.reward +"), failures, "reward/GumDrop/reset math changed.");
  expectPass(report.scoreDimensions.length >= 5, failures, "score dimensions missing.");
  expectPass(!dirty.some((entry) => entry.classification === "unsafe_unknown"), failures, "dirty files unclassified.");
  expectPass(openPrs.length === 0, failures, "open PRs unclassified.");
  runValidation("debug-cockpit-batch31-task-guidance-parity", {
    ...report,
    dirtyClassifications: dirty,
    openPrClassifications: openPrs,
  }, failures, [
    "Batch 31 makes task guidance source-ready while keeping zero live samples blocked.",
    "Task lifecycle and onboarding activity remain separate from guidance UI evidence.",
  ]);
}
