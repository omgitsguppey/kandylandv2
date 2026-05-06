import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include "${needle}".`);
  }
}

function requireExcludes(source: string, needle: string, label: string) {
  if (source.includes(needle)) {
    failures.push(`${label} must not include "${needle}".`);
  }
}

const packageJson = JSON.parse(readRequired("package.json") || "{}") as {
  scripts?: Record<string, string>;
};
const dailyCheckIn = readRequired("src/components/Dashboard/DailyCheckIn.tsx");
const dailyTasksModule = readRequired("src/components/Dashboard/DailyTasksModule.tsx");
const taskGuidanceBanner = readRequired("src/components/Dashboard/TaskGuidanceBanner.tsx");
const taskCatalog = readRequired("src/lib/tasks/task-catalog.ts");
const taskGuidance = readRequired("src/lib/task-guidance.ts");
const telemetryCatalog = readRequired("src/lib/telemetry-catalog.ts");
const identifiedIngestRoute = readRequired("src/app/api/analytics/ingest-identified/route.ts");
const checkInRoute = readRequired("src/app/api/checkin/route.ts");
const dailyTasksServer = readRequired("src/lib/server/daily-tasks.ts");
const adminDebugRoute = readRequired("src/app/api/admin/debug/route.ts");
const debugTabActions = readRequired("src/app/admin/debug/components/DebugTabActions.tsx");
const debugAdvancedTelemetry = readRequired("src/app/admin/debug/components/DebugAdvancedTelemetry.tsx");
const pipelineModule = readRequired("src/components/Admin/Analytics/AdminDailyTaskPipelineModule.tsx");
const eventFactNormalizer = readRequired("src/lib/behavioral/normalize-event-fact.ts");
const deterministicTruth = readRequired("src/lib/deterministic-admin-truth.ts");
const ingestTests = readRequired("tests/unit/analytics-ingest-identified-route.spec.ts");
const eventFactTests = readRequired("tests/unit/event-fact-truth.spec.ts");

if (packageJson.scripts?.["check:daily-task-telemetry-truth"] !== "tsx scripts/agent/validate-daily-task-telemetry-truth.ts") {
  failures.push("package.json must expose check:daily-task-telemetry-truth.");
}

requireIncludes(dailyCheckIn, 'trackEvent("daily_checkin_claimed"', "DailyCheckIn");
requireIncludes(dailyCheckIn, 'task_id: "check_in_today"', "DailyCheckIn");
requireIncludes(dailyCheckIn, "reward_gd: reward", "DailyCheckIn");
requireIncludes(dailyCheckIn, 'sourceTruth: "client_supporting"', "DailyCheckIn");
requireIncludes(dailyCheckIn, "day_key: getCSTDateKey(claimedAt)", "DailyCheckIn");
requireExcludes(dailyCheckIn, 'trackEvent("daily_check_in_claim"', "DailyCheckIn");

requireIncludes(dailyTasksModule, 'trackEvent("daily_task_action_clicked"', "DailyTasksModule");
requireIncludes(dailyTasksModule, "TASK_GUIDANCE_EVENT_NAMES", "DailyTasksModule guidance telemetry contract");
requireIncludes(dailyTasksModule, 'trackEvent(TASK_CARD_EXPANDED_EVENT', "DailyTasksModule task-card expansion telemetry");
requireIncludes(dailyTasksModule, 'trackEvent(TASK_HELP_OPENED_EVENT', "DailyTasksModule task-help telemetry");
requireIncludes(dailyTasksModule, "daily_task_window_id: taskWindowId", "DailyTasksModule guidance telemetry daily window");
requireIncludes(dailyTasksModule, 'source_component: "daily_tasks_module"', "DailyTasksModule guidance telemetry source component");
requireIncludes(dailyTasksModule, "reward_gd: task.reward", "DailyTasksModule");
requireIncludes(dailyTasksModule, "day_key: dailyTaskState?.lastResetMs ? getCSTDateKey(dailyTaskState.lastResetMs) : getCSTDateKey(Date.now())", "DailyTasksModule");
requireIncludes(dailyTasksModule, 'sourceTruth: "client_supporting"', "DailyTasksModule");

requireIncludes(taskGuidanceBanner, "TASK_GUIDANCE_EVENT_NAMES", "TaskGuidanceBanner guidance telemetry contract");
requireIncludes(taskGuidanceBanner, "trackEvent(TASK_GUIDANCE_VIEWED_EVENT", "TaskGuidanceBanner viewed telemetry");
requireIncludes(taskGuidanceBanner, "trackEvent(TASK_GUIDANCE_TAPPED_EVENT", "TaskGuidanceBanner tapped telemetry");
requireIncludes(taskGuidanceBanner, "trackEvent(TASK_GUIDANCE_DISMISSED_EVENT", "TaskGuidanceBanner dismissed telemetry");
requireIncludes(taskGuidanceBanner, "trackEvent(TASK_GUIDANCE_COMPLETED_EVENT", "TaskGuidanceBanner completed telemetry");
requireIncludes(taskGuidanceBanner, 'source_component: "task_guidance_banner"', "TaskGuidanceBanner source component");
requireIncludes(taskGuidanceBanner, "daily_task_window_id: guidance.dailyTaskWindowId", "TaskGuidanceBanner daily window context");

requireIncludes(taskGuidance, "TASK_GUIDANCE_IMPLEMENTED = true", "Task guidance doctrine truth");
requireIncludes(taskGuidance, "TASK_GUIDANCE_REQUIRED_IN_BETA = true", "Task guidance beta requirement");
requireIncludes(taskGuidance, '"task_guidance_viewed"', "Task guidance canonical viewed event");
requireIncludes(taskGuidance, '"task_guidance_tapped"', "Task guidance canonical tapped event");
requireIncludes(taskGuidance, '"task_guidance_dismissed"', "Task guidance canonical dismissed event");
requireIncludes(taskGuidance, '"task_guidance_completed"', "Task guidance canonical completed event");
requireIncludes(taskGuidance, '"task_card_expanded"', "Task guidance canonical task-card event");
requireIncludes(taskGuidance, '"task_help_opened"', "Task guidance canonical task-help event");

requireIncludes(taskCatalog, 'eventName: "daily_checkin_claimed"', "Task catalog daily check-in");
requireIncludes(telemetryCatalog, '{ eventName: "daily_checkin_claimed"', "Telemetry catalog daily check-in");
requireIncludes(telemetryCatalog, 'aliases: ["daily_check_in_claim", "daily_reward_claimed"]', "Telemetry catalog daily check-in aliases");
requireIncludes(telemetryCatalog, '{ eventName: "task_completed"', "Telemetry catalog task completed");
requireIncludes(telemetryCatalog, 'aliases: ["daily_task_completed"]', "Telemetry catalog task completed aliases");
requireIncludes(telemetryCatalog, '{ eventName: "task_guidance_viewed"', "Telemetry catalog task guidance viewed");
requireIncludes(telemetryCatalog, 'aliases: ["task_guidance_banner_viewed"]', "Telemetry catalog task guidance viewed alias");
requireIncludes(telemetryCatalog, '{ eventName: "task_guidance_tapped"', "Telemetry catalog task guidance tapped");
requireIncludes(telemetryCatalog, 'aliases: ["task_guidance_cta_clicked"]', "Telemetry catalog task guidance tapped alias");
requireIncludes(telemetryCatalog, '{ eventName: "task_guidance_dismissed"', "Telemetry catalog task guidance dismissed");
requireIncludes(telemetryCatalog, 'aliases: ["task_guidance_banner_dismissed"]', "Telemetry catalog task guidance dismissed alias");
requireIncludes(telemetryCatalog, '{ eventName: "task_card_expanded"', "Telemetry catalog task-card expansion");
requireIncludes(telemetryCatalog, '{ eventName: "task_help_opened"', "Telemetry catalog task-help event");
requireIncludes(telemetryCatalog, 'rewardGd: "reward_gd"', "Telemetry catalog reward alias");
requireIncludes(telemetryCatalog, 'sourceTruth: "source_truth"', "Telemetry catalog sourceTruth alias");

requireIncludes(identifiedIngestRoute, 'canonicalEventName === "daily_checkin_claimed"', "Identified ingest daily check-in truth");
requireIncludes(identifiedIngestRoute, 'canonicalEventName === "task_completed"', "Identified ingest task truth");
requireIncludes(checkInRoute, '"daily_checkin_claimed"', "Check-in route canonical event");
requireIncludes(checkInRoute, 'sourceTruth: "canonical"', "Check-in route source truth");
requireIncludes(dailyTasksServer, 'incrementEventStat(transaction, "task_completed"', "Daily tasks server task completion stats");
requireIncludes(dailyTasksServer, 'sourceTruth: "canonical"', "Daily tasks server source truth");
requireIncludes(dailyTasksServer, 'day_key: getCSTDateKey(nowMs)', "Daily tasks server day-key tracking");
requireIncludes(dailyTasksServer, "getDailyTaskWindow", "Daily tasks server window truth");
requireIncludes(dailyTasksServer, "daily_task_assignment_backfilled_on_open", "Daily tasks on-demand backfill diagnostic");
requireIncludes(dailyTasksServer, "daily_window_expired", "Daily tasks server daily-window expiration reason");
requireIncludes(dailyTasksServer, "potentialRewardGd", "Daily tasks server potential reward tracking");
requireIncludes(dailyTasksServer, "creditedRewardGd", "Daily tasks server credited reward tracking");
requireIncludes(dailyTasksServer, "forfeitedPotentialRewardGd", "Daily tasks server forfeited reward tracking");
requireIncludes(dailyTasksServer, "rewardCreditIdempotencyKey", "Daily tasks server reward credit idempotency");
requireIncludes(dailyTasksServer, "historical_reward_out_of_bounds", "Daily tasks server historical reward audit flag");
requireExcludes(dailyTasksServer, "daily_task_reset_due_inactivity", "Daily tasks server should not use inactivity reset as primary reason");
requireIncludes(adminDebugRoute, "TaskIssueAttribution", "Admin debug task attribution model");
requireIncludes(adminDebugRoute, "expectedSource", "Admin debug task attribution expected source");
requireIncludes(adminDebugRoute, "foundSource", "Admin debug task attribution found source");
requireIncludes(adminDebugRoute, "issueType", "Admin debug task attribution issue type");
requireIncludes(adminDebugRoute, "sourceFreshness", "Admin debug task attribution source freshness");
requireIncludes(adminDebugRoute, "eligibleForTasks", "Admin debug task attribution task eligibility");
requireIncludes(adminDebugRoute, "expectedSource: \"task_catalog\"", "Admin debug task attribution must cite task catalog expected source");
requireIncludes(adminDebugRoute, "foundSource: \"task_assignments\"", "Admin debug task attribution must use assignment truth before telemetry samples");
requireIncludes(adminDebugRoute, "assignment_missing", "Admin debug task attribution missing assignment classification");
requireIncludes(adminDebugRoute, "onboarding_not_complete", "Admin debug task attribution incomplete onboarding classification");
requireIncludes(adminDebugRoute, "Rebuild task assignment for this user from canonical daily task rotation.", "Admin debug task attribution self-heal action");
requireIncludes(adminDebugRoute, "No task assignment repair is required until onboarding is complete.", "Admin debug task attribution ineligible user action");
requireIncludes(adminDebugRoute, "TaskTelemetryMappingSummary", "Admin debug task telemetry mapping summary model");
requireIncludes(adminDebugRoute, "SharedTaskEventGroup", "Admin debug shared event group model");
requireIncludes(adminDebugRoute, "TaskTelemetryAlignmentWarning", "Admin debug telemetry alignment warning model");
requireIncludes(adminDebugRoute, "TaskTelemetryMappingRow", "Admin debug telemetry mapping row model");
requireIncludes(adminDebugRoute, "TaskTelemetryEventPurpose", "Admin debug telemetry event purpose model");
requireIncludes(adminDebugRoute, "TelemetryCoverageRow", "Admin debug telemetry coverage row model");
requireIncludes(adminDebugRoute, "TelemetryCoverageEventPurpose", "Admin debug telemetry coverage purpose model");
requireIncludes(adminDebugRoute, "telemetryCoverageRows", "Admin debug telemetry coverage row payload");
requireIncludes(adminDebugRoute, "classifyTelemetryCoveragePurpose", "Admin debug telemetry coverage purpose classifier");
requireIncludes(adminDebugRoute, "inferTelemetryCoverageSourceState", "Admin debug telemetry coverage source classifier");
requireIncludes(adminDebugRoute, "buildTelemetryCoverageExplanation", "Admin debug telemetry coverage explanation builder");
requireIncludes(adminDebugRoute, "\"daily_check_in_claim\"", "Admin debug telemetry coverage daily-check-in alias input");
requireIncludes(adminDebugRoute, "\"notification_marked_read\"", "Admin debug telemetry coverage notification-read alias input");
requireIncludes(adminDebugRoute, "\"viewer_asset_changed\"", "Admin debug telemetry coverage viewer alias input");
requireIncludes(adminDebugRoute, "\"daily_tasks_viewed\"", "Admin debug telemetry coverage daily-tasks surface input");
requireIncludes(adminDebugRoute, "\"identity\"", "Admin debug telemetry coverage identity purpose");
requireIncludes(adminDebugRoute, "\"viewer_support\"", "Admin debug telemetry coverage viewer-support purpose");
requireIncludes(adminDebugRoute, "\"viewer_task_trigger\"", "Admin debug telemetry coverage viewer-trigger purpose");
requireIncludes(adminDebugRoute, "\"semantic_ux\"", "Admin debug telemetry coverage semantic purpose");
requireIncludes(adminDebugRoute, "\"task_mapping_missing\"", "Admin debug telemetry coverage missing-task state");
requireIncludes(adminDebugRoute, "\"supporting\"", "Admin debug telemetry coverage supporting state");
requireIncludes(adminDebugRoute, "\"unsupported\"", "Admin debug telemetry coverage unsupported state");
requireIncludes(adminDebugRoute, "taskTelemetryMappingSummary", "Admin debug task telemetry mapping payload");
requireIncludes(adminDebugRoute, "mappingRows", "Admin debug task telemetry mapping rows payload");
requireIncludes(adminDebugRoute, "TaskReceiptMappingGroup", "Admin debug receipt mapping group model");
requireIncludes(adminDebugRoute, "receiptMappingGroups", "Admin debug receipt mapping groups payload");
requireIncludes(adminDebugRoute, "\"daily_checkin_reward\"", "Admin debug daily check-in receipt lane");
requireIncludes(adminDebugRoute, "\"alias_mapped\"", "Admin debug alias-mapped receipt state");
requireIncludes(adminDebugRoute, "daily_checkin_claimed and classified as the daily check-in reward lane", "Admin debug daily check-in receipt explanation");
requireIncludes(adminDebugRoute, "separate pinned daily check-in reward lane", "Admin debug daily check-in coverage explanation");
requireIncludes(adminDebugRoute, "Daily tasks surface telemetry. It measures task-module visibility and is not a task completion trigger.", "Admin debug daily-tasks-viewed explanation");
requireIncludes(adminDebugRoute, "\"feedback_reward\"", "Admin debug feedback receipt lane");
requireIncludes(adminDebugRoute, "Feedback receipt lane is shared across feedback tasks", "Admin debug feedback receipt explanation");
requireIncludes(adminDebugRoute, "sharedByCount", "Admin debug shared event diagnostic count");
requireIncludes(adminDebugRoute, "receiptMeaning", "Admin debug shared event receipt meaning");
requireIncludes(adminDebugRoute, "sharedTasks", "Admin debug shared task diagnostic rows");
requireIncludes(adminDebugRoute, "requiredCount", "Admin debug shared task count threshold");
requireIncludes(adminDebugRoute, "requiredEntity", "Admin debug shared task entity requirement");
requireIncludes(adminDebugRoute, "criteriaState", "Admin debug shared task criteria state");
requireIncludes(adminDebugRoute, "\"safe_with_keying\"", "Admin debug shared event safe-with-keying state");
requireIncludes(adminDebugRoute, "\"partial\"", "Admin debug shared event partial state");
requireIncludes(adminDebugRoute, "\"task_lifecycle\"", "Admin debug lifecycle purpose classification");
requireIncludes(adminDebugRoute, "\"onboarding_telemetry\"", "Admin debug onboarding purpose classification");
requireIncludes(adminDebugRoute, "\"supporting_not_task\"", "Admin debug supporting telemetry state");
requireIncludes(adminDebugRoute, "\"needs_task_mapping\"", "Admin debug expected mapping state");
requireIncludes(adminDebugRoute, "\"shared_receipts\"", "Admin debug shared receipts state");
requireIncludes(adminDebugRoute, "\"shared_event_missing_criteria\"", "Admin debug shared event missing criteria warning");
requireIncludes(adminDebugRoute, "\"shared_event_missing_unique_keying\"", "Admin debug shared event missing unique keying warning");
requireIncludes(adminDebugRoute, "\"event_stats_not_task_scoped\"", "Admin debug event-stats warning");
requireIncludes(adminDebugRoute, "\"completion_source_mismatch\"", "Admin debug completion source mismatch warning");
requireIncludes(debugTabActions, "Expected source", "Task Issues Attribution UI expected source");
requireIncludes(debugTabActions, "Found source", "Task Issues Attribution UI found source");
requireIncludes(debugTabActions, "Issue type", "Task Issues Attribution UI issue type");
requireIncludes(debugTabActions, "Freshness", "Task Issues Attribution UI source freshness");
requireIncludes(debugTabActions, "Eligible", "Task Issues Attribution UI eligibility");
requireIncludes(debugTabActions, "canSelfHeal", "Task Issues Attribution UI self-heal state");

requireIncludes(eventFactNormalizer, 'daily_reward_claimed: { normalizedAction: "daily_checkin_claimed"', "Event fact normalizer daily check-in alias");
requireIncludes(eventFactNormalizer, 'daily_task_completed: { normalizedAction: "task_completed"', "Event fact normalizer task alias");
requireIncludes(eventFactNormalizer, 'fact.normalizedAction === "daily_checkin_claimed"', "Event fact normalizer day-key dedupe check-in");
requireIncludes(eventFactNormalizer, 'fact.normalizedAction === "task_completed"', "Event fact normalizer day-key dedupe tasks");
requireIncludes(eventFactNormalizer, 'fact.normalizedAction === "task_guidance_completed"', "Event fact normalizer day-key dedupe guidance completion");
requireIncludes(pipelineModule, "Task guidance telemetry is missing; guidance impact cannot be evaluated.", "Daily task pipeline module guidance telemetry gap warning");
requireIncludes(deterministicTruth, "background_task_engine", "Deterministic task event context classifier");
requireIncludes(deterministicTruth, "classifyEventContext", "Deterministic task event context classifier");

requireIncludes(debugAdvancedTelemetry, "label=\"Task trigger events\"", "Telemetry mapping panel trigger summary");
requireIncludes(debugAdvancedTelemetry, "Kind: receipt", "Telemetry mapping panel grouped receipt kind");
requireIncludes(debugAdvancedTelemetry, "label=\"Lane\"", "Telemetry mapping panel receipt lane");
requireIncludes(debugAdvancedTelemetry, "Sample receipts:", "Telemetry mapping panel receipt sample ids");
requireIncludes(debugAdvancedTelemetry, "No grouped receipt mapping issues were detected in the sampled data.", "Telemetry mapping panel grouped receipt empty state");
requireIncludes(debugAdvancedTelemetry, "label=\"Lifecycle events\"", "Telemetry mapping panel lifecycle summary");
requireIncludes(debugAdvancedTelemetry, "label=\"Supporting telemetry\"", "Telemetry mapping panel supporting summary");
requireIncludes(debugAdvancedTelemetry, "label=\"Shared by\"", "Telemetry mapping panel shared-by count");
requireIncludes(debugAdvancedTelemetry, "label=\"Event stats\"", "Telemetry mapping panel event-stats count");
requireIncludes(debugAdvancedTelemetry, "criteria state", "Telemetry mapping panel criteria state text");
requireIncludes(debugAdvancedTelemetry, "Receipts here are purchase receipts, not task reward receipts.", "Telemetry mapping panel purchase receipt meaning");
requireIncludes(debugAdvancedTelemetry, "Receipts here are shared unlock receipts and do not prove task-specific reward credit.", "Telemetry mapping panel unlock receipt meaning");
requireIncludes(debugAdvancedTelemetry, "Lifecycle event, not a task trigger", "Telemetry mapping panel lifecycle explanation");
requireIncludes(debugAdvancedTelemetry, "Supporting telemetry, not a task trigger", "Telemetry mapping panel supporting explanation");
requireIncludes(debugAdvancedTelemetry, "Missing task mapping: expected by task catalog", "Telemetry mapping panel missing mapping explanation");
requireIncludes(debugAdvancedTelemetry, "Event stats are raw trigger evidence.", "Telemetry mapping panel must not treat event stats as completions");
requireIncludes(debugAdvancedTelemetry, "titleForCoveragePurpose", "Telemetry coverage sample purpose grouping");
requireIncludes(debugAdvancedTelemetry, "labelForCoverageState", "Telemetry coverage sample state labels");
requireIncludes(debugAdvancedTelemetry, "toneForCoverageState", "Telemetry coverage sample state tones");
requireIncludes(debugAdvancedTelemetry, "label=\"Tracked events\"", "Telemetry coverage sample tracked count");
requireIncludes(debugAdvancedTelemetry, "label=\"Task triggers\"", "Telemetry coverage sample task-trigger count");
requireIncludes(debugAdvancedTelemetry, "label=\"Supporting/lifecycle\"", "Telemetry coverage sample supporting count");
requireIncludes(debugAdvancedTelemetry, "label=\"Alias needed\"", "Telemetry coverage sample alias-needed count");
requireIncludes(debugAdvancedTelemetry, "label=\"True unsupported/orphaned\"", "Telemetry coverage sample unsupported count");
requireIncludes(debugAdvancedTelemetry, "Aliases seen:", "Telemetry coverage sample alias detail");

requireIncludes(ingestTests, 'eventName: "daily_checkin_claimed"', "Ingest tests daily check-in canonicalization");
requireIncludes(ingestTests, 'eventName: "task_completed"', "Ingest tests task completion canonicalization");
requireIncludes(eventFactTests, 'eventName: "task_completed"', "Event fact tests task completion coverage");
requireIncludes(eventFactTests, 'day_key: "2026-05-04"', "Event fact tests day-key dedupe");

if (failures.length > 0) {
  console.error("Daily task telemetry truth validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Daily task telemetry truth validator passed.");
