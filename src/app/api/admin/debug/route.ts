import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { ADMIN, HEAVY_READ } from "@/lib/server/rate-limit";
import {
    BUILT_IN_DAILY_TASKS,
    DAILY_TASK_ACTION_OPTIONS,
    DAILY_TASK_COOLDOWN_DAYS,
    DAILY_TASK_ICON_OPTIONS,
    DAILY_TASK_LIMIT,
    DAILY_TASK_REWARD_MULTIPLIER,
    DAILY_TASK_REWARD_VERSION,
    buildDailyTaskRewardContract,
    isRetiredLegacyDailyTaskId,
    resolveLegacyDailyTaskId,
    resolveDailyTaskReward,
    type DailyTaskAssignment,
    type DailyTaskDefinition,
} from "@/lib/tasks/task-catalog";
import {
    buildTaskCatalogCoverage,
    buildDailyTaskInventory,
    buildDailyTaskRuntimeAudit,
    CANONICAL_TASK_EVENT_NAMES,
    summarizeDailyTaskInventory,
    summarizeTaskCatalogCoverage,
} from "@/lib/tasks/task-observability";
import {
    buildTelemetryEventMetadata,
    getTelemetryEventOption,
    TELEMETRY_EVENT_LABELS,
    TELEMETRY_EVENT_NAMES,
} from "@/lib/telemetry-catalog";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { buildAdminOpsHealth } from "@/lib/server/admin-ops-health";
import { buildAdminOrchestrationSnapshot } from "@/lib/server/admin-orchestration";
import { getConfiguredRollouts, getRolloutEvaluationSamples } from "@/lib/rollouts";
import { getChangelogEntries, getCurrentRelease } from "@/lib/release-tracking";
import { PUBLIC_RELEASE_NOTES_FALLBACK } from "@/lib/release-notes/public-release-notes";
import { getCSTDateKey } from "@/lib/timezone";
import { ORCHESTRATION_COLLECTIONS } from "@/lib/orchestration/contract";
import { CREATOR_COLLECTIONS } from "@/lib/creator-experiences";
import { CREATOR_SPEND_POLICIES } from "@/lib/server/creator-experiences";
import { CREATOR_SPEND_TRANSACTION_TYPES, getTransactionBadgeLabel } from "@/lib/transaction-normalizers";
import { buildAdminPanelSystemLogs, syncAdminPanelSystemLogs } from "@/lib/server/admin-panel-system-logs";
import { buildCreatorOnboardingDiagnostics } from "@/lib/server/creator-onboarding-diagnostics";
import {
    CREATOR_ONBOARDING_COLLECTION,
    CREATOR_ONBOARDING_HISTORY_SUBCOLLECTION,
    CREATOR_REVIEW_QUEUE_COLLECTION,
} from "@/lib/server/creator-onboarding";
import { listRouteRuntimeHealth, recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";
import {
    listNotificationDispatchOutcomes,
    listQueueJobHeartbeats,
    listRuntimeWarnings,
} from "@/lib/server/runtime-warning-store";
import { summarizeRouteRuntimeHealth } from "@/lib/route-runtime-health";
import { QUEUE_RUNTIME_WARNING_CODES } from "../../../../../shared/runtime/runtime-warning-contract";
import { getBehavioralSnapshotStatus, listDropIntelligence } from "@/lib/server/behavioral-intelligence";
import { getAnalyticsTruthRecoverySummary, listAnalyticsTruthDrops, listAnalyticsTruthRepairs, listAnalyticsTruthUsers } from "@/lib/server/analytics-truth-recovery";
import { buildServerAdminModuleVerification } from "@/lib/server/admin-source-verification";
import { ANALYTICS_OPERATIONAL_COLLECTIONS } from "@/lib/server/analytics-governance";
import { getDailyTaskRefreshMetadataIssue } from "@/lib/tasks/task-timestamps";
import { getDailyTaskWindow } from "@/lib/server/daily-tasks";
import { buildAdminShellLayoutDebugMetadata } from "@/lib/admin-shell-spacing";
import { listAdminMetricSnapshotDebugMetadata } from "@/lib/server/admin-analytics-snapshots";
import { ADMIN_ANALYTICS_MATERIALIZER_REGISTRY } from "@/lib/server/admin-analytics-materializers";
import { buildAdminOverviewFallbackIdentity, buildAdminOverviewUserIdentityMap, shortenAdminOverviewUserId, type AdminOverviewUserIdentity } from "@/lib/server/admin-overview-users";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const TASK_AUDIT_SAMPLE_LIMIT = 2_000;
const TASK_DAILY_SERIES_LIMIT = 60;
const TASK_GROUP_SET = new Set<string>(["visit", "notifications", "unwrap", "watch", "wallet", "purchase", "feedback", "share"]);
const TASK_ACTION_SET = new Set<string>(DAILY_TASK_ACTION_OPTIONS.map((option) => option.value));
const TASK_ICON_SET = new Set<string>(DAILY_TASK_ICON_OPTIONS.map((option) => option.value));

type TaskIssueAttribution = {
    userId: string;
    displayName: string;
    expectedTaskCount: number;
    foundTaskCount: number;
    expectedSource: "task_catalog" | "assignment_policy" | "materialized_rollup";
    foundSource: "task_assignments" | "daily_task_events" | "analytics_event_facts" | "sample" | "none";
    issueType: "assignment_missing" | "task_rollup_stale" | "telemetry_missing" | "onboarding_not_complete" | "user_exempt" | "sample_window_incomplete" | "catalog_mismatch" | "unknown";
    severity: "info" | "review" | "error";
    canSelfHeal: boolean;
    recommendedAction: string;
    sourceFreshness: "live" | "stale" | "sample_only" | "unknown";
    eligibleForTasks: boolean;
    evidence: {
        onboardingCompleted?: boolean;
        userCreatedAt?: number;
        lastTaskAssignmentAt?: number | null;
        lastTaskEventAt?: number | null;
        materializedAt?: number | null;
        sampleWindowMs?: number;
    };
};

type BugReportStatus = "new" | "triaged" | "in_progress" | "resolved" | "dismissed";
type BugReportSeverity = "low" | "medium" | "high" | "critical";
type BugReportAgeBucket = "last_7d" | "older_backlog";
type BugReportTriageState = "new" | "review" | "in_progress" | "resolved";

type BugReportTriageCard = {
    reportId: string;
    id: string;
    title: string;
    path: string;
    currentPath: string;
    sourceComponent: string;
    componentName: string;
    status: BugReportStatus;
    severity: BugReportSeverity;
    issueType: string;
    userMessage: string;
    message: string;
    breadcrumbsCount: number;
    diagnosticsCount: number;
    rolloutCount: number;
    createdAtUtc: string;
    timestamp: number;
    ageLabel: string;
    ageBucket: BugReportAgeBucket;
    state: BugReportTriageState;
    inventoryState: "loaded" | "missing" | "partial";
};

type BugIntakeTriageSummary = {
    loadedCount: number;
    last7dCount: number;
    backlogCount: number;
    newCount: number;
    mediumCount: number;
    highCount: number;
    needsTriageCount: number;
    groupedByPath: Array<{
        path: string;
        count: number;
        newestAtUtc: string;
        highestSeverity: BugReportSeverity;
    }>;
    generatedAtUtc: string;
    freshnessState: "live" | "stale" | "failed" | "unknown";
};

type QueueRuntimeOutcomeRow = {
    stable_id: string;
    schedulerKey: string;
    activationKey: string;
    queueKind: "drop_activation" | "notification_dispatch" | "unknown";
    dropId?: string;
    dropTitle: string;
    dropIdentityState: "resolved" | "missing" | "unknown";
    creatorId?: string;
    creatorName?: string;
    status?: string;
    scheduledForUtc?: string;
    lastOutcomeAtUtc?: string;
    validUntilUtc?: string;
    outcome: "sent" | "skipped" | "failed" | "pending" | "unknown";
    error: string | null;
    errorCode: string | null;
    recipientCount?: number;
    notificationCount?: number;
    adminDropHref?: string;
    adminCreatorHref?: string;
    rawKeyCollapsed: boolean;
    updatedAt: number;
    createdAt: number;
    shortDropId: string;
};

type ReceiptSampleView = {
    receiptId: string;
    rawEventName: string;
    normalizedAction: string;
    displayLabel: string;
    aliasCount: number;
    actorUserId?: string;
    actorDisplayName: string;
    shortUserId: string;
    userIdentityState: "resolved" | "fallback_uid" | "missing";
    adminUserHref?: string;
    targetDropId?: string;
    targetDropTitle?: string;
    shortDropId?: string;
    dropIdentityState?: "resolved" | "fallback_id" | "missing";
    amountDisplay?: string;
    sourceDetail?: string;
    dedupeKey: string;
    dedupeKeyLabel: string;
    sourceTruth: "canonical" | "server" | "client" | "legacy";
    sourceState: "live" | "info" | "review" | "unknown";
    createdAtUtc: string;
    ageLabel: string;
    rawDetailsCollapsed: true;
};

type ReceiptSummaryRow = {
    groupKey: string;
    displayLabel: string;
    dedupeKeyLabel: string;
    count: number;
    aliasCount: number;
    lastSeenAt: number;
    lastSeenAtUtc: string;
    sourceTruth: ReceiptSampleView["sourceTruth"];
    sourceState: ReceiptSampleView["sourceState"];
};

type TaskReceiptPolicy = "required" | "not_required" | "legacy_optional" | "unknown";
type TaskReceiptParityState = "live" | "review" | "error";

type TaskReceiptParityRow = {
    taskId: string;
    taskTitle: string;
    completedCount: number;
    rewardedCount: number;
    taskRewardReceiptCount: number;
    relatedActionReceiptCount: number;
    relatedActionReceiptLabel?: string;
    purchaseReceiptCount: number;
    paidRewardTotalGd: number;
    potentialRewardTotalGd: number;
    expectedReceiptPolicy: TaskReceiptPolicy;
    receiptParityState: TaskReceiptParityState;
    explanation: string;
};

type TaskGumdropGuardrailState = {
    generatedAtUtc: string;
    affectedUsersCount: number;
    rewardDelta7d: number;
    creatorSpendViolations: number;
    overallState: "live" | "review" | "error";
    rewardSettings: {
        version: number;
        multiplierPct: number;
        builtInAverageRewardGd: number;
        legacyCustomCount: number;
        state: "live" | "review" | "error";
    };
    creatorSpend: {
        trackedSpendCount: number;
        purchasedSpendCount: number;
        rewardSpendCount: number;
        amountMismatchCount: number;
        state: "live" | "review" | "error";
        explanation: string;
    };
    receiptParity: {
        okCount: number;
        reviewCount: number;
        errorCount: number;
        state: "live" | "review" | "error";
    };
    taskReceiptParity: TaskReceiptParityRow[];
    affectedUsers: TaskIssueAttribution[];
};

type RuntimeUnsupportedReason =
    | "task_id_not_in_catalog"
    | "trigger_event_not_supported"
    | "runtime_action_missing"
    | "legacy_task_alias_unmapped"
    | "custom_task_without_definition"
    | "assignment_without_catalog_version"
    | "unknown";

type RuntimeUnsupportedGroup = {
    groupKey: string;
    count: number;
    taskId?: string;
    taskTitle?: string;
    triggerEvent?: string;
    runtimeAction?: string;
    source: "assignment" | "task_event" | "receipt" | "reward_claim" | "rollup" | "unknown";
    reason: RuntimeUnsupportedReason;
    activityScope: "active" | "historical" | "mixed";
    affectedUsersSample: Array<{
        userId: string;
        displayName?: string;
        shortUserId: string;
    }>;
    firstSeenAtUtc: string | null;
    lastSeenAtUtc: string | null;
    severity: "info" | "review" | "error";
    suggestedAction: string;
};

type RuntimeTaskDriftSummary = {
    generatedAtUtc: string;
    sampledUsers: number;
    assignmentCount: number;
    customAssignedCount: number;
    cooldownDriftCount: number;
    unsupportedRuntimeCount: number;
    unsupportedRuntimeGroups: RuntimeUnsupportedGroup[];
    tasksSampled: number;
    alignedCount: number;
    partialCount: number;
    mismatchCount: number;
    unknownCount: number;
    sourceParityRows: RuntimeTaskSourceParityRow[];
    state: "live" | "review" | "error";
};

type TaskSourceMismatchReason =
    | "rollup_completed_exceeds_task_completed"
    | "event_stats_exceeds_assignments"
    | "rewarded_without_receipts"
    | "receipts_without_task_completion"
    | "claims_without_completion"
    | "completion_without_reward"
    | "event_stats_not_task_scoped"
    | "legacy_alias_mismatch"
    | "unknown";

type RuntimeTaskSourceParityRow = {
    taskId: string;
    taskTitle: string;
    triggerEvent: string;
    origin: "built_in" | "custom" | "legacy";
    mode: "route" | "runtime" | "background";
    scope: "built_in" | "custom" | "legacy";
    cooldown: string;
    assignedUsers: number;
    claimedCount: number;
    taskCompletedCount: number;
    rewardClaimCount: number;
    receiptCount: number;
    rollupCompletedCount: number;
    eventStatsCount: number;
    sourceParityState: "aligned" | "partial" | "mismatch" | "unknown";
    mismatchReasons: TaskSourceMismatchReason[];
    canonicalCompletionSource: "task_completion" | "reward_receipt" | "rollup" | "event_stats" | "unknown";
    explanation: string;
};

type SharedTaskEventGroup = {
    eventName: string;
    displayLabel: string;
    normalizedAction: string;
    sharedByCount: number;
    assignedCount: number;
    receiptCount: number;
    eventStatsCount: number;
    receiptMeaning: string;
    sharedTasks: Array<{
        taskId: string;
        title: string;
        requiredCount: number;
        keying: "unique_entity" | "count" | "any" | "filtered" | "unknown";
        requiredEntity?: "drop" | "file" | "session" | "notification" | "purchase" | "feedback" | "none";
        criteria: string[];
        criteriaState: "complete" | "partial" | "missing" | "not_required";
    }>;
    taskIds: string[];
    taskTitles: string[];
    ambiguityState: "safe_with_keying" | "safe_with_criteria" | "partial" | "unsafe_shared_event";
    requiredDisambiguators: string[];
    presentDisambiguators: string[];
    missingDisambiguators: string[];
    missingEvidence: string[];
    severity: "info" | "review" | "error";
    explanation: string;
};

type TaskTelemetryAlignmentWarning = {
    taskId: string;
    taskTitle: string;
    triggerEvent: string;
    warningType:
    | "shared_event_missing_criteria"
    | "shared_event_missing_unique_keying"
    | "telemetry_event_unsupported"
    | "canonical_alias_missing"
    | "runtime_action_missing"
    | "event_stats_not_task_scoped"
    | "completion_source_mismatch";
    severity: "info" | "review" | "error";
    suggestedAction: string;
};

type TaskTelemetryMappingSummary = {
    generatedAtUtc: string;
    alignmentWarningCount: number;
    sharedEventCount: number;
    unsupportedRuntimeCount: number;
    unsafeSharedEventCount: number;
    unsupportedActiveAssignments: number;
    taskTriggerReadyCount: number;
    taskTriggerPartialCount: number;
    taskTriggerMissingCount: number;
    lifecycleExpectedCount: number;
    supportingTelemetryCount: number;
    sharedEventGroups: SharedTaskEventGroup[];
    receiptMappingGroups: TaskReceiptMappingGroup[];
    unsupportedRuntimeGroups: RuntimeUnsupportedGroup[];
    alignmentWarnings: TaskTelemetryAlignmentWarning[];
    mappingRows: TaskTelemetryMappingRow[];
};

type TaskReceiptMappingGroup = {
    eventName: string;
    normalizedAction: string;
    kind: "receipt";
    count: number;
    mappedTaskIds: string[];
    mappedTaskTitles: string[];
    receiptLane:
    | "daily_checkin_reward"
    | "task_reward"
    | "feedback_reward"
    | "purchase_receipt"
    | "unlock_receipt"
    | "not_task_receipt"
    | "unknown";
    mappingState:
    | "mapped"
    | "alias_mapped"
    | "lane_classified"
    | "unmapped_needs_task"
    | "not_task_receipt"
    | "unknown";
    severity: "info" | "review" | "error";
    explanation: string;
    sampleReceiptIds: string[];
    firstSeenAtUtc: string | null;
    lastSeenAtUtc: string | null;
};

type TaskTelemetryEventPurpose =
    | "task_trigger"
    | "task_lifecycle"
    | "task_guidance"
    | "supporting_telemetry"
    | "onboarding_telemetry"
    | "reward_receipt"
    | "commerce_event"
    | "viewer_event"
    | "notification_event"
    | "unmapped_unknown";

type TaskTelemetryMappingRow = {
    displayLabel: string;
    eventName: string;
    normalizedAction: string;
    eventPurpose: TaskTelemetryEventPurpose;
    mappedTaskCount: number;
    mappedBuiltInCount: number;
    mappedCustomCount: number;
    assignedCount: number;
    eventStatsCount: number;
    receiptCount: number;
    trackingSource: "canonical" | "telemetry" | "legacy" | "mixed";
    mappingState:
    | "ready"
    | "supporting_not_task"
    | "lifecycle_not_task"
    | "needs_task_mapping"
    | "needs_criteria"
    | "shared_receipts"
    | "unsupported";
    explanation: string;
    expectedMapping: boolean;
    missingMappingReason?: string;
    affectedTasks: Array<{
        taskId: string;
        title: string;
        criteria?: string[];
        keying?: string;
    }>;
};

type TelemetryCoverageEventPurpose =
    | "task_trigger"
    | "task_lifecycle"
    | "onboarding"
    | "identity"
    | "viewer_support"
    | "viewer_task_trigger"
    | "notification"
    | "semantic_ux"
    | "commerce"
    | "security"
    | "supporting_telemetry"
    | "unknown";

type TelemetryCoverageRow = {
    eventName: string;
    normalizedAction: string;
    displayLabel: string;
    eventPurpose: TelemetryCoverageEventPurpose;
    totalCount: number;
    mappedTaskCount: number;
    mappedTaskTitles: string[];
    lastSeenAtUtc: string | null;
    sourceState: "canonical" | "telemetry" | "alias_mapped" | "unsupported" | "legacy" | "unknown";
    coverageState: "ready" | "supporting" | "alias_needed" | "task_mapping_missing" | "unsupported" | "review";
    explanation: string;
    rawEventNames: string[];
};

type BehavioralIntelligenceValidationMetrics = {
    precisionAt5?: number;
    precisionAt10?: number;
    purchaseHitRate7d?: number;
    unlockHitRate24h?: number;
    watchCompletionHitRate?: number;
    returnHitRate7d?: number;
    calibrationError?: number;
    baselineComparison?: "beats_baseline" | "under_baseline" | "not_tested";
};

type BehavioralConnectedModules = {
    purchasePrediction: boolean;
    unlockPrediction: boolean;
    watchPrediction: boolean;
    returnPrediction: boolean;
    negativeSuppression: boolean;
    diversityReranking: boolean;
    integrityDemotion: boolean;
    creatorSupplyQuality: boolean;
    explorationBudget: boolean;
};

type BehavioralDropPanelRow = {
    dropId: string;
    dropTitle: string;
    creatorName?: string | null;
    profileFreshnessState: "fresh" | "stale" | "missing" | "unknown";
    lastUpdatedAtUtc: string | null;
    sourceTruthScore: number;
    confidenceScore: number;
    confidenceFormula: string;
    sampleSize: number;
    previews: number;
    viewerOpens: number;
    unlocks: number;
    purchases: number;
    completionRate: number | null;
    completionExplanation: string;
    negativeRate: number | null;
    negativeExplanation: string;
    pPurchase7d?: number | null;
    pUnlock24h?: number | null;
    pWatchComplete?: number | null;
    pReturn7d?: number | null;
    suppressionScore?: number | null;
    diversityPenalty?: number | null;
    integrityMultiplier?: number | null;
    creatorSupplyScore?: number | null;
    finalRankScore?: number | null;
    rankEligibility: "eligible" | "low_sample" | "stale" | "blocked" | "unknown";
    topReasons: string[];
    missingInputs: string[];
};

type BehavioralIntelligencePanelState = {
    generatedAtUtc: string;
    latestRebuildAtUtc: string | null;
    sourceWindowStartUtc: string;
    sourceWindowEndUtc: string;
    rebuildFreshnessState: "live" | "partial" | "stale" | "failed" | "unknown";
    dropProfileFreshnessState: "live" | "partial" | "stale" | "failed" | "unknown";
    overallFreshnessState: "live" | "partial" | "stale" | "failed" | "unknown";
    overallFreshnessExplanation: string;
    userProfiles: number;
    guestProfiles: number;
    dropProfiles: number;
    staleDropProfiles: number;
    freshDropProfiles: number;
    activeRankingMode: "deterministic" | "hybrid" | "ml_experimental" | "ml_active" | "unknown";
    mlValidationState: "not_enough_sample" | "under_baseline" | "experimental" | "active" | "missing";
    deterministicBaselineState: "available" | "missing";
    modelVersion?: string;
    sampleSize: number;
    validationMetrics?: BehavioralIntelligenceValidationMetrics;
    connectedModules: BehavioralConnectedModules;
    connectedModuleCount: number;
    missingModuleCount: number;
    confidenceFormula: string;
    dropRows: BehavioralDropPanelRow[];
};

type TelemetryTruthRecoveryFreshnessState = "live" | "stale" | "expired" | "unknown";
type TelemetryTruthRecoveryQualityState = "verified" | "mixed" | "estimated" | "degraded" | "unknown";
type TelemetryTruthRecoveryFormulaState = "documented" | "unknown";

type TelemetryTruthRecoverySourceLayer = {
    layer: "observed" | "checked" | "final" | "estimated" | "recovered";
    source: string;
    count: number;
    freshnessState: TelemetryTruthRecoveryFreshnessState;
    explanation: string;
};

type TelemetryTruthRecoveryRepairGroup = {
    repairType: "missing source context" | "dedupe repair" | "recovered session review" | "stale metric rebuild" | "unknown";
    count: number;
    actionability: "actionable" | "inspect_only";
    explanation: string;
    latestAtUtc: string | null;
};

type EstimatedWatchRecoveryRow = {
    sessionId: string;
    shortSessionId: string;
    dropId?: string;
    dropTitle?: string;
    userId?: string;
    actorDisplayName?: string;
    confidence: number;
    recoveredWatchSeconds: number;
    completionRepairCount: number;
    provenance: string;
    createdAtUtc?: string;
};

type EstimatedWatchRecoveryGroup = {
    recoveryKind: "estimated_drop_session_end";
    provenance: "stale_open_session_timeout" | string;
    layer: "estimated";
    count: number;
    confidenceMin: number;
    confidenceMax: number;
    confidenceAvg: number;
    recoveredWatchSecondsTotal: number;
    recoveredWatchSecondsPerSession: {
        min: number;
        max: number;
        mode: number;
    };
    completionRepairCount: number;
    firstSeenAtUtc: string | null;
    lastSeenAtUtc: string | null;
    affectedSessionSample: EstimatedWatchRecoveryRow[];
    estimationFormula: string;
    confidenceFactors: string;
    countsTowardVerifiedWatch: false;
    countsTowardEstimatedWatch: true;
    state: "review" | "info" | "error";
    explanation: string;
};

type DropTelemetryRecoveryRow = {
    dropId: string;
    shortDropId: string;
    dropTitle: string;
    creatorId?: string;
    creatorName?: string;
    dropIdentityState: "resolved" | "fallback_id" | "missing";
    adminDropHref?: string;
    quality: "verified" | "mixed" | "estimated" | "degraded" | "unknown";
    rawViews: number;
    validatedViews: number;
    estimatedViews: number;
    finalizedViews: number;
    duplicateRatePct: number;
    repairedPct: number;
    watchSeconds: number;
    watchDurationDisplay: string;
    metricExplanation: {
        rawViews: string;
        validatedViews: string;
        estimatedViews: string;
        finalizedViews: string;
        duplicateRate: string;
        repairedPct: string;
    };
    state: "live" | "review" | "error";
    warnings: string[];
};

type UserWatchRecoveryRow = {
    userId: string;
    shortUserId: string;
    userDisplayName: string;
    username?: string;
    userIdentityState: "resolved" | "fallback_uid" | "missing";
    adminUserHref?: string;
    totalWatchSeconds: number;
    verifiedWatchSeconds: number;
    estimatedWatchSeconds: number;
    fallbackWatchSeconds: number;
    watchDurationDisplay: string;
    uniqueViewerCount: number;
    sessionCount: number;
    unlockCount: number;
    rawGapCount: number;
    quality: "exact" | "mixed" | "estimated" | "fallback" | "degraded" | "unknown";
    confidencePct: number;
    qualityReasons: string[];
    mathExplanation: {
        totalWatch: string;
        verifiedWatch: string;
        estimatedWatch: string;
        fallbackWatch: string;
        rawGaps: string;
        confidence: string;
    };
    state: "live" | "review" | "error";
};

type TelemetryTruthRecoveryState = {
    generatedAtUtc: string;
    lastRebuildAtUtc: string | null;
    rebuildAgeHours: number | null;
    freshnessState: TelemetryTruthRecoveryFreshnessState;
    qualityState: TelemetryTruthRecoveryQualityState;
    formulaState: TelemetryTruthRecoveryFormulaState;
    overallState: "live" | "review" | "error";
    dropMetricCount: number;
    userMetricCount: number;
    openRepairCount: number;
    actionableRepairCount: number;
    inspectOnlyRepairCount: number;
    observedViews: number;
    checkedViews: number;
    finalViews: number;
    estimatedViews: number;
    estimatedRatioPct: number;
    duplicateRatePct: number;
    recoveredSessionCount: number;
    confidencePct: number;
    formulas: {
        observedViews: string;
        checkedViews: string;
        finalViews: string;
        estimatedRatio: string;
        duplicateRate: string;
        confidence: string;
    };
    sourceLayers: TelemetryTruthRecoverySourceLayer[];
    repairGroups: TelemetryTruthRecoveryRepairGroup[];
    estimatedWatchRecoveryGroups: EstimatedWatchRecoveryGroup[];
    dropRows: DropTelemetryRecoveryRow[];
    userRows: UserWatchRecoveryRow[];
    warnings: string[];
};

type RolloutRegistryPanelState = {
    generatedAtUtc: string;
    currentTrain: {
        label: string;
        id: string;
        channel: "alpha" | "beta" | "stable" | "internal";
        declaredAtUtc: string;
        freshnessState: "current" | "stale" | "historical" | "unknown";
        relationToCurrentBeta: string;
        notesCount: number;
        changelogEntryCount: number;
    };
    currentBetaNotes: {
        channel: string;
        currentVersion: string;
        latestEntryAtUtc: string | null;
        entryCount: number;
    };
    summary: {
        configuredRollouts: number;
        sampleActors: number;
        activeExperiments: number;
        fullyRolledOutFeatures: number;
        internalFeatures: number;
        killSwitchReady: number;
        staleRollouts: number;
    };
    rollouts: RolloutRegistryItem[];
    actorEvaluation: RolloutActorEvaluationPanel;
    alphaBaselineChangelog: Array<{
        id: string;
        date: string;
        title: string;
        summary: string;
        areas: string[];
    }>;
};

type RolloutActorEvaluationPanel = {
    generatedAtUtc: string;
    mode: "dry_run_representative" | "live_sample" | "mixed" | "unknown";
    actorCount: number;
    actorRows: RolloutActorEvaluationRow[];
    explanation: string;
};

type RolloutActorEvaluationRow = {
    label: string;
    route: string;
    role: "guest" | "user" | "creator" | "admin";
    actorSource: "representative_fixture" | "live_user" | "current_admin_session" | "unknown";
    actorId?: string | null;
    isSimulated: boolean;
    evaluations: Array<{
        rolloutId: string;
        rolloutName: string;
        variant: string;
        reason: "assigned" | "ineligible" | "disabled" | "excluded" | "defaulted" | "unknown";
        reasonDetail: string;
        state: "assigned" | "ineligible" | "info" | "review";
    }>;
};

type RolloutRegistryItem = {
    id: string;
    name: string;
    humanSummary: string;
    kind: "experiment" | "feature" | "baseline" | "holdout" | "unknown";
    stage: "alpha" | "beta" | "stable" | "internal";
    owner: "product" | "platform" | "growth" | "admin" | "unknown";
    audience: string;
    rolloutPct: number;
    defaultVariant: string;
    activeVariants: string[];
    hasHoldout: boolean;
    effectiveState:
    | "active_experiment"
    | "fully_rolled_out"
    | "baseline"
    | "internal_feature"
    | "stale_alpha"
    | "disabled";
    killSwitchReady: boolean;
    requirements: string[];
    exclusions: string[];
    lastUpdatedAtUtc?: string | null;
    explanation: string;
};

const TELEMETRY_COVERAGE_LEGACY_EVENT_NAMES = new Set([
    "unlock_drop_success",
]);

const TELEMETRY_COVERAGE_ALIAS_EVENT_NAMES = [
    "daily_check_in_claim",
    "notification_marked_read",
    "viewer_asset_changed",
    "viewer_asset_started",
    "daily_task_completed",
] as const;

type DependencyPackageName = "root" | "functions" | "workspace" | "unknown";
type DependencyType = "runtime" | "dev" | "optional";
type DependencyCategory =
    | "framework"
    | "firebase_google"
    | "payments"
    | "analytics"
    | "ui"
    | "forms"
    | "testing"
    | "build"
    | "agent_tooling"
    | "security"
    | "unknown";

type DependencyEntry = {
    name: string;
    declaredVersion: string;
    sourcePackage: DependencyPackageName;
    dependencyType: DependencyType;
    installedVersion?: string;
    installedVersionState: "from_lockfile" | "not_checked" | "not_installed" | "unknown";
    direct: true;
    category: DependencyCategory;
};

type DependencyGroup = {
    key: string;
    label: string;
    count: number;
    entries: DependencyEntry[];
    topEntries: string[];
};

type DependencyPackageSource = {
    name: DependencyPackageName;
    path: string;
    dependencies: DependencyEntry[];
    devDependencies: DependencyEntry[];
    optionalDependencies: DependencyEntry[];
};

type DependencyInventory = {
    generatedAtUtc: string;
    nodeVersion: string;
    firestoreConnectivity: "live" | "failed" | "unknown";
    lastTelemetryPingAtUtc: string | null;
    packageSources: DependencyPackageSource[];
    totals: {
        runtimeDependencies: number;
        devDependencies: number;
        optionalDependencies: number;
        functionsDependencies: number;
        overrideCount: number;
        unknownDisplayed: number;
    };
    groups: DependencyGroup[];
    overrides: Array<{
        sourcePackage: "root" | "functions";
        count: number;
        names: string[];
    }>;
    notDirectDependencies: Array<{
        name: string;
        state: "transitive/not direct" | "absent";
        installedVersion?: string;
    }>;
    freshnessState: "fresh" | "stale" | "unknown";
    rootPackageUpdatedAtUtc: string | null;
    functionsPackageUpdatedAtUtc: string | null;
};

function toNumber(value: unknown) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
}

function toStringValue(value: unknown) {
    return typeof value === "string" ? value : "";
}

function toOptionalString(value: unknown) {
    const stringValue = toStringValue(value).trim();
    return stringValue.length > 0 ? stringValue : undefined;
}

function toUtcString(value: unknown) {
    const timestamp = toNumber(value);
    return timestamp > 0 ? new Date(timestamp).toISOString() : undefined;
}

function shortenDebugId(value: string) {
    const trimmed = value.trim();
    if (trimmed.length <= 12) return trimmed || "unknown";
    return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

function normalizeSourceTruth(value: unknown): ReceiptSampleView["sourceTruth"] {
    const truth = toStringValue(value).trim().toLowerCase();
    if (truth === "server" || truth === "client" || truth === "legacy") {
        return truth;
    }
    return "canonical";
}

function normalizeSourceState(sourceTruth: ReceiptSampleView["sourceTruth"]): ReceiptSampleView["sourceState"] {
    if (sourceTruth === "canonical" || sourceTruth === "server") return "live";
    if (sourceTruth === "client") return "info";
    if (sourceTruth === "legacy") return "review";
    return "unknown";
}

function buildReceiptAgeLabel(nowMs: number, timestamp: number) {
    if (!timestamp) return "unknown age";
    const deltaMs = Math.max(0, nowMs - timestamp);
    const minutes = Math.floor(deltaMs / 60_000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function buildUserIdentityFromSnapshot(userId: string, raw: Record<string, unknown>): AdminOverviewUserIdentity {
    const username = toOptionalString(raw.username);
    const displayName = toOptionalString(raw.displayName);
    const email = toOptionalString(raw.email);
    const emailPrefix = email ? (email.split("@")[0] || "") : "";
    const userDisplayName = username || displayName || emailPrefix || shortenAdminOverviewUserId(userId);

    return {
        userId,
        userDisplayName,
        username,
        shortUserId: shortenAdminOverviewUserId(userId),
        userIdentityState: username || displayName || emailPrefix ? "resolved" : "fallback_uid",
    };
}

function parseReceiptDateKey(receiptKey: string, timestamp: number) {
    const match = /(\d{4}-\d{2}-\d{2})/u.exec(receiptKey);
    if (match?.[1]) return match[1];
    return timestamp > 0 ? new Date(timestamp).toISOString().slice(0, 10) : "unknown-date";
}

function readJsonFile<T>(filePath: string, fallback: T): T {
    if (!fs.existsSync(filePath)) {
        return fallback;
    }

    try {
        return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
    } catch {
        return fallback;
    }
}

function normalizeDependencyCategory(name: string): DependencyCategory {
    if (["next", "react", "react-dom", "@next/third-parties", "server-only", "swr"].includes(name)) return "framework";
    if (
        name.startsWith("firebase")
        || name.startsWith("@google-")
        || name.startsWith("google-")
    ) return "firebase_google";
    if (name.includes("paypal")) return "payments";
    if (name.includes("posthog") || name.includes("analytics")) return "analytics";
    if (
        name.startsWith("@radix-ui/")
        || name.startsWith("@tailwindcss/")
        || name.includes("tailwind")
        || name.includes("lucide")
        || name.includes("motion")
        || name.includes("recharts")
        || name.includes("embla")
        || name.includes("skeleton")
        || name.includes("sonner")
        || name.includes("confetti")
        || name.includes("crop")
    ) return "ui";
    if (name.includes("hook-form") || name === "zod" || name.includes("resolver")) return "forms";
    if (
        name.includes("vitest")
        || name.includes("playwright")
        || name.includes("cypress")
        || name.includes("puppeteer")
        || name.includes("storybook")
        || name.includes("testing-library")
        || name === "msw"
        || name === "happy-dom"
        || name.includes("axe")
    ) return "testing";
    if (
        name.includes("eslint")
        || name === "esbuild"
        || name === "vite"
        || name === "postcss"
        || name === "tsx"
        || name === "cross-env"
        || name === "typescript"
        || name === "dotenv"
    ) return "build";
    if (
        name.includes("ts-morph")
        || name.includes("dependency-cruiser")
        || name.includes("madge")
        || name.includes("knip")
        || name.includes("syncpack")
        || name.includes("ast-grep")
        || name.includes("npm-check-updates")
        || name.includes("firebase-tools")
    ) return "agent_tooling";
    if (name.includes("auth") || name.includes("dompurify")) return "security";
    return "unknown";
}

function buildDependencyEntry(
    sourcePackage: "root" | "functions",
    dependencyType: DependencyType,
    name: string,
    declaredVersion: string,
    installedVersion?: string,
): DependencyEntry {
    return {
        name,
        declaredVersion,
        sourcePackage,
        dependencyType,
        installedVersion,
        installedVersionState: installedVersion ? "from_lockfile" : "not_installed",
        direct: true,
        category: normalizeDependencyCategory(name),
    };
}

function getLockfileInstalledVersion(lockfile: Record<string, unknown>, packageName: string) {
    const packages = lockfile.packages;
    if (!packages || typeof packages !== "object") {
        return undefined;
    }
    const packageEntry = (packages as Record<string, unknown>)[`node_modules/${packageName}`];
    if (!packageEntry || typeof packageEntry !== "object") {
        return undefined;
    }
    return toOptionalString((packageEntry as Record<string, unknown>).version);
}

function buildDependencyEntries(
    sourcePackage: "root" | "functions",
    dependencyType: DependencyType,
    source: Record<string, string>,
    lockfile: Record<string, unknown>,
) {
    return Object.entries(source)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, declaredVersion]) => buildDependencyEntry(
            sourcePackage,
            dependencyType,
            name,
            declaredVersion,
            getLockfileInstalledVersion(lockfile, name),
        ));
}

function getDependencyGroupLabel(category: DependencyCategory) {
    const labels: Record<DependencyCategory, string> = {
        framework: "Framework / runtime",
        firebase_google: "Firebase / Google",
        payments: "Payments",
        analytics: "Analytics / telemetry",
        ui: "UI / design",
        forms: "Forms / validation",
        testing: "Testing / QA",
        build: "Build / dev",
        agent_tooling: "Agent / repo tooling",
        security: "Security / overrides",
        unknown: "Other direct dependencies",
    };

    return labels[category];
}

function parseQueueActivationKey(value: unknown) {
    const activationKey = toStringValue(value);
    const match = /^drop-activation:([^:]+):(\d+)$/u.exec(activationKey);
    if (!match) {
        return {
            queueKind: activationKey ? "notification_dispatch" as const : "unknown" as const,
            dropId: "",
            scheduledForMs: 0,
        };
    }

    return {
        queueKind: "drop_activation" as const,
        dropId: match[1] ?? "",
        scheduledForMs: toNumber(match[2]),
    };
}

function normalizeBugReportStatus(value: unknown): BugReportStatus {
    const status = toStringValue(value);
    if (status === "triaged" || status === "in_progress" || status === "resolved" || status === "dismissed") return status;
    return "new";
}

function normalizeBugReportSeverity(value: unknown): BugReportSeverity {
    const severity = toStringValue(value);
    if (severity === "low" || severity === "high" || severity === "critical") return severity;
    return "medium";
}

function getBugReportAgeLabel(nowMs: number, timestamp: number) {
    if (timestamp <= 0) return "unknown age";
    const minutes = Math.floor(Math.max(0, nowMs - timestamp) / 60_000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function getBugReportTriageState(status: BugReportStatus, severity: BugReportSeverity): BugReportTriageState {
    if (status === "resolved" || status === "dismissed") return "resolved";
    if (status === "in_progress") return "in_progress";
    if (status === "new" && (severity === "medium" || severity === "high" || severity === "critical")) return "review";
    return "new";
}

function bugReportNeedsTriage(report: Pick<BugReportTriageCard, "status" | "severity">) {
    return (report.status === "new" || report.status === "in_progress")
        && (report.severity === "medium" || report.severity === "high" || report.severity === "critical");
}

function getHighestBugSeverity(reports: Array<Pick<BugReportTriageCard, "severity">>): BugReportSeverity {
    const rank: Record<BugReportSeverity, number> = { low: 1, medium: 2, high: 3, critical: 4 };
    return reports.reduce<BugReportSeverity>((highest, report) => rank[report.severity] > rank[highest] ? report.severity : highest, "low");
}

function buildBugIntakeTriageSummary(reports: BugReportTriageCard[], nowMs: number): BugIntakeTriageSummary {
    const pathGroups = new Map<string, BugReportTriageCard[]>();
    reports.forEach((report) => {
        const key = report.path || "Unknown path";
        pathGroups.set(key, [...(pathGroups.get(key) ?? []), report]);
    });
    return {
        loadedCount: reports.length,
        last7dCount: reports.filter((report) => report.ageBucket === "last_7d").length,
        backlogCount: reports.filter((report) => report.ageBucket === "older_backlog").length,
        newCount: reports.filter((report) => report.status === "new").length,
        mediumCount: reports.filter((report) => report.severity === "medium").length,
        highCount: reports.filter((report) => report.severity === "high" || report.severity === "critical").length,
        needsTriageCount: reports.filter(bugReportNeedsTriage).length,
        groupedByPath: Array.from(pathGroups.entries())
            .map(([path, group]) => ({
                path,
                count: group.length,
                newestAtUtc: new Date(group.reduce((latest, report) => Math.max(latest, report.timestamp), 0) || nowMs).toISOString(),
                highestSeverity: getHighestBugSeverity(group),
            }))
            .sort((left, right) => right.count - left.count || Date.parse(right.newestAtUtc) - Date.parse(left.newestAtUtc)),
        generatedAtUtc: new Date(nowMs).toISOString(),
        freshnessState: reports.length > 0 ? "live" : "unknown",
    };
}

async function buildQueueRuntimeOutcomeRows(input: {
    outcomes: Array<Record<string, unknown>>;
}) {
    if (!adminDb || input.outcomes.length === 0) {
        return [];
    }

    const parsedOutcomes = input.outcomes.map((outcome) => {
        const parsedKey = parseQueueActivationKey(outcome.activationKey);
        const dropId = toOptionalString(outcome.dropId) || parsedKey.dropId;
        return { outcome, parsedKey, dropId };
    });
    const dropIds = Array.from(new Set(parsedOutcomes.map((entry) => entry.dropId).filter(Boolean)));
    const dropRefs = dropIds.map((dropId) => adminDb.collection("drops").doc(dropId));
    const dropSnapshots = dropRefs.length > 0 ? await adminDb.getAll(...dropRefs) : [];
    const dropMap = new Map<string, Record<string, unknown>>();

    dropSnapshots.forEach((snapshot) => {
        if (snapshot.exists) {
            dropMap.set(snapshot.id, snapshot.data() as Record<string, unknown>);
        }
    });

    const creatorIds = Array.from(new Set(
        Array.from(dropMap.values())
            .flatMap((drop) => {
                const creatorId = toOptionalString(drop.creatorId) || toOptionalString(drop.submittedByCreatorId);
                return creatorId ? [creatorId] : [];
            }),
    ));
    const creatorRefs = creatorIds.map((creatorId) => adminDb.collection("users").doc(creatorId));
    const creatorSnapshots = creatorRefs.length > 0 ? await adminDb.getAll(...creatorRefs) : [];
    const creatorMap = new Map<string, string>();

    creatorSnapshots.forEach((snapshot) => {
        if (!snapshot.exists) return;
        const raw = snapshot.data() as Record<string, unknown>;
        const username = toOptionalString(raw.username);
        const displayName = toOptionalString(raw.displayName);
        creatorMap.set(snapshot.id, username ? `@${username}` : displayName || shortenDebugId(snapshot.id));
    });

    return parsedOutcomes.map<QueueRuntimeOutcomeRow>(({ outcome, parsedKey, dropId }) => {
        const drop = dropId ? dropMap.get(dropId) : undefined;
        const creatorId = drop ? toOptionalString(drop.creatorId) || toOptionalString(drop.submittedByCreatorId) : undefined;
        const rawStatus = toStringValue(outcome.status);
        const normalizedOutcome: QueueRuntimeOutcomeRow["outcome"] = rawStatus === "sent"
            ? "sent"
            : rawStatus === "failed"
                ? "failed"
                : rawStatus === "skipped_existing_owner" || rawStatus === "duplicate"
                    ? "skipped"
                    : rawStatus === "pending"
                        ? "pending"
                        : "unknown";
        const scheduledForMs = parsedKey.scheduledForMs || toNumber(drop?.validFrom);
        const updatedAt = toNumber(outcome.updatedAt);

        return {
            stable_id: toStringValue(outcome.stable_id) || toStringValue(outcome.activationKey) || `${dropId || "unknown"}:${updatedAt}`,
            schedulerKey: toStringValue(outcome.activationKey),
            activationKey: toStringValue(outcome.activationKey),
            queueKind: parsedKey.queueKind,
            dropId,
            dropTitle: drop ? toStringValue(drop.title) || "Untitled drop" : "Unknown drop",
            dropIdentityState: drop ? "resolved" : dropId ? "missing" : "unknown",
            creatorId,
            creatorName: creatorId ? creatorMap.get(creatorId) || shortenDebugId(creatorId) : undefined,
            status: drop ? toStringValue(drop.status) || undefined : undefined,
            scheduledForUtc: toUtcString(scheduledForMs),
            lastOutcomeAtUtc: toUtcString(updatedAt),
            validUntilUtc: toUtcString(drop?.validUntil),
            outcome: normalizedOutcome,
            error: toOptionalString(outcome.errorCode) ?? null,
            errorCode: toOptionalString(outcome.errorCode) ?? null,
            recipientCount: toNumber((outcome.detail as Record<string, unknown> | undefined)?.recipientCount) || undefined,
            notificationCount: toNumber((outcome.detail as Record<string, unknown> | undefined)?.notificationCount) || undefined,
            adminDropHref: dropId ? `/admin/drops?dropId=${encodeURIComponent(dropId)}` : undefined,
            adminCreatorHref: creatorId ? `/admin/user/${encodeURIComponent(creatorId)}` : undefined,
            rawKeyCollapsed: true,
            updatedAt,
            createdAt: toNumber(outcome.createdAt),
            shortDropId: dropId ? shortenDebugId(dropId) : "unknown",
        };
    });
}

function getLatestTaskAssignmentAt(tasks: Array<{ assignedAt?: number }>) {
    const latest = tasks.reduce((max, task) => Math.max(max, toNumber(task.assignedAt)), 0);
    return latest > 0 ? latest : null;
}

function buildTaskIssueAttribution(input: {
    userId: string;
    displayName: string;
    userData: Record<string, unknown>;
    tasks: Array<{ assignedAt?: number }>;
    taskEvents: Array<{ userId: string; timestamp: number }>;
    materializedAt: number | null;
    sampleWindowMs: number;
}): TaskIssueAttribution | null {
    const expectedTaskCount = DAILY_TASK_LIMIT;
    const foundTaskCount = input.tasks.length;
    const onboardingCompleted = typeof input.userData.onboardingCompleted === "boolean"
        ? input.userData.onboardingCompleted
        : undefined;
    const explicitlyIncomplete = input.userData.onboardingCompleted === false;
    const eligibleForTasks = !explicitlyIncomplete;
    const lastTaskEventAt = input.taskEvents
        .filter((event) => event.userId === input.userId)
        .reduce((max, event) => Math.max(max, event.timestamp), 0) || null;
    const lastTaskAssignmentAt = getLatestTaskAssignmentAt(input.tasks);
    const userCreatedAt = toNumber(input.userData.createdAtMs)
        || toTimestampNumber(input.userData.createdAt)
        || toNumber(input.userData.createdAt);
    const evidence = {
        onboardingCompleted,
        userCreatedAt: userCreatedAt || undefined,
        lastTaskAssignmentAt,
        lastTaskEventAt,
        materializedAt: input.materializedAt,
        sampleWindowMs: input.sampleWindowMs,
    };

    if (foundTaskCount === expectedTaskCount) {
        return null;
    }

    if (!eligibleForTasks) {
        return {
            userId: input.userId,
            displayName: input.displayName,
            expectedTaskCount,
            foundTaskCount,
            expectedSource: "assignment_policy",
            foundSource: foundTaskCount > 0 ? "task_assignments" : "none",
            issueType: "onboarding_not_complete",
            severity: "info",
            canSelfHeal: false,
            recommendedAction: "No task assignment repair is required until onboarding is complete.",
            sourceFreshness: "live",
            eligibleForTasks,
            evidence,
        };
    }

    if (foundTaskCount === 0) {
        return {
            userId: input.userId,
            displayName: input.displayName,
            expectedTaskCount,
            foundTaskCount,
            expectedSource: "task_catalog",
            foundSource: "task_assignments",
            issueType: "assignment_missing",
            severity: "error",
            canSelfHeal: true,
            recommendedAction: "Rebuild task assignment for this user from canonical daily task rotation.",
            sourceFreshness: "live",
            eligibleForTasks,
            evidence,
        };
    }

    return {
        userId: input.userId,
        displayName: input.displayName,
        expectedTaskCount,
        foundTaskCount,
        expectedSource: "task_catalog",
        foundSource: "task_assignments",
        issueType: foundTaskCount > expectedTaskCount ? "catalog_mismatch" : "assignment_missing",
        severity: "review",
        canSelfHeal: false,
        recommendedAction: "Verify assignment source / rerun task materializer without overwriting existing progress.",
        sourceFreshness: "live",
        eligibleForTasks,
        evidence,
    };
}

function toTimestampNumber(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (
        value
        && typeof value === "object"
        && "toMillis" in value
        && typeof (value as { toMillis: () => number }).toMillis === "function"
    ) {
        return (value as { toMillis: () => number }).toMillis();
    }

    return 0;
}

function isDailyTaskRewardTransaction(entry: Record<string, unknown> & { timestampMs: number }, weekAgoMs: number) {
    if (toStringValue(entry.type) !== "daily_reward" || toNumber(entry.timestampMs) < weekAgoMs) {
        return false;
    }

    const rewardSource = toStringValue(entry.rewardSource);
    if (rewardSource === "task") {
        return true;
    }

    return rewardSource === "" && toStringValue(entry.description).startsWith("Daily Task: ");
}

function inferTrackingSource(eventName: string) {
    if (CANONICAL_TASK_EVENT_NAMES.has(eventName)) {
        return "canonical";
    }

    if (TELEMETRY_EVENT_NAMES.includes(eventName)) {
        return "telemetry";
    }

    return "unsupported";
}

function readTaskCriteriaParam(params: Record<string, unknown>, key: string) {
    return params[key]
        ?? params[key.replace(/_([a-z])/gu, (_, char: string) => char.toUpperCase())]
        ?? params[key.replace(/[A-Z]/gu, (char) => `_${char.toLowerCase()}`)];
}

function normalizeCriteriaStringArray(value: unknown) {
    if (Array.isArray(value)) {
        return value.map((entry) => toStringValue(entry).trim()).filter(Boolean);
    }
    const text = toStringValue(value).trim();
    if (!text) {
        return [];
    }
    return text.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function receiptMatchesTaskCriteria(definition: DailyTaskDefinition, params: Record<string, unknown>) {
    if (!definition.criteria) {
        return true;
    }

    if (definition.criteria.paramEquals) {
        const actual = readTaskCriteriaParam(params, definition.criteria.paramEquals.key);
        return String(actual) === String(definition.criteria.paramEquals.value);
    }

    if (definition.criteria.minNumberParam) {
        const actual = Number(readTaskCriteriaParam(params, definition.criteria.minNumberParam.key));
        return Number.isFinite(actual) && actual >= definition.criteria.minNumberParam.value;
    }

    if (definition.criteria.includesAnyParam) {
        const actualValues = normalizeCriteriaStringArray(readTaskCriteriaParam(params, definition.criteria.includesAnyParam.key));
        return definition.criteria.includesAnyParam.values.some((value) => actualValues.includes(value));
    }

    return true;
}

function getExpectedTaskReceiptPolicy(definition: DailyTaskDefinition): TaskReceiptPolicy {
    if (definition.group === "purchase") {
        return "required";
    }
    if (definition.id === "check_in_today") {
        return "not_required";
    }
    if (definition.eventName === "unlock_drop_success") {
        return "legacy_optional";
    }
    if (definition.rewardSource === "daily_task") {
        return "required";
    }
    return "unknown";
}

function scoreTaskCriteriaSpecificity(definition: DailyTaskDefinition) {
    if (definition.criteria?.minNumberParam) {
        return definition.criteria.minNumberParam.value;
    }
    if (definition.criteria?.includesAnyParam) {
        return definition.criteria.includesAnyParam.values.length;
    }
    if (definition.criteria?.paramEquals) {
        return 1;
    }
    return 0;
}

function classifyRuntimeUnsupportedReason(record: {
    kind: string;
    taskId?: string;
    eventName?: string;
    detail?: string;
}) : RuntimeUnsupportedReason {
    const taskId = toStringValue(record.taskId);
    const eventName = toStringValue(record.eventName);
    const detail = toStringValue(record.detail).toLowerCase();

    if (detail.includes("catalog version")) {
        return "assignment_without_catalog_version";
    }
    if (eventName && !getTelemetryEventOption(eventName).option) {
        return "trigger_event_not_supported";
    }
    if (taskId && resolveLegacyDailyTaskId(taskId) !== taskId) {
        return "legacy_task_alias_unmapped";
    }
    if (record.kind === "assignment" && taskId.startsWith("custom_")) {
        return "custom_task_without_definition";
    }
    if (record.kind === "assignment" || record.kind === "event" || record.kind === "reward_claim" || record.kind === "rollup") {
        if (taskId) {
            return "task_id_not_in_catalog";
        }
    }
    return "unknown";
}

function suggestedActionForRuntimeUnsupportedReason(reason: RuntimeUnsupportedReason) {
    switch (reason) {
        case "task_id_not_in_catalog":
            return "Check task assignment/runtime writers for stale task ids and compare against the active catalog.";
        case "trigger_event_not_supported":
            return "Validate telemetry event support and normalize or remove the unsupported trigger.";
        case "runtime_action_missing":
            return "Verify the task action path still exists and resolves to a reachable runtime surface.";
        case "legacy_task_alias_unmapped":
            return "Map the legacy task alias to the canonical task id before treating runtime drift as resolved.";
        case "custom_task_without_definition":
            return "Reconcile custom-task assignment state against current custom task definitions.";
        case "assignment_without_catalog_version":
            return "Inspect assignment materialization and ensure catalog version metadata is stored with assignments.";
        default:
            return "Inspect normalization evidence and runtime task writers for the missing source context.";
    }
}

function sourceLabelForRuntimeDriftKind(kind: string): RuntimeUnsupportedGroup["source"] {
    if (kind === "event") return "task_event";
    if (kind === "assignment" || kind === "receipt" || kind === "reward_claim" || kind === "rollup") {
        return kind;
    }
    return "unknown";
}

function resolveRuntimeTaskParityOrigin(entry: {
    definitionOrigin: "built_in" | "custom";
    taskId: string;
    eventName: string;
}): RuntimeTaskSourceParityRow["origin"] {
    if (entry.definitionOrigin === "custom") {
        return "custom";
    }
    if (isRetiredLegacyDailyTaskId(entry.taskId) || entry.eventName === "unlock_drop_success") {
        return "legacy";
    }
    return "built_in";
}

function resolveRuntimeTaskParityScope(entry: {
    definitionOrigin: "built_in" | "custom";
    scope: string;
    taskId: string;
    eventName: string;
}): RuntimeTaskSourceParityRow["scope"] {
    if (entry.scope === "built_in") {
        return "built_in";
    }
    if (isRetiredLegacyDailyTaskId(entry.taskId) || entry.eventName === "unlock_drop_success") {
        return "legacy";
    }
    return "custom";
}

function resolveRuntimeTaskCanonicalCompletionSource(entry: {
    recentCompletedCount: number;
    recentRewardClaimCount: number;
    recentReceiptCount: number;
    rollupCompletedCount: number;
    eventStatTotalCount: number;
}): RuntimeTaskSourceParityRow["canonicalCompletionSource"] {
    if (entry.recentCompletedCount > 0) return "task_completion";
    if (entry.recentRewardClaimCount > 0 || entry.recentReceiptCount > 0) return "reward_receipt";
    if (entry.rollupCompletedCount > 0) return "rollup";
    if (entry.eventStatTotalCount > 0) return "event_stats";
    return "unknown";
}

function buildRuntimeTaskMismatchReasons(entry: {
    taskId: string;
    eventName: string;
    definitionOrigin: "built_in" | "custom";
    assignedUsers: number;
    claimedAssignments: number;
    recentCompletedCount: number;
    recentRewardClaimCount: number;
    recentReceiptCount: number;
    rollupCompletedCount: number;
    eventStatTotalCount: number;
}): TaskSourceMismatchReason[] {
    const reasons = new Set<TaskSourceMismatchReason>();

    if (entry.rollupCompletedCount > entry.recentCompletedCount) {
        reasons.add("rollup_completed_exceeds_task_completed");
    }
    if (entry.eventStatTotalCount > Math.max(entry.assignedUsers, entry.claimedAssignments, 0)) {
        reasons.add("event_stats_exceeds_assignments");
    }
    if (entry.eventStatTotalCount > 0 && entry.recentCompletedCount === 0) {
        reasons.add("event_stats_not_task_scoped");
    }
    if (entry.recentRewardClaimCount > entry.recentReceiptCount) {
        reasons.add("rewarded_without_receipts");
    }
    if (entry.recentReceiptCount > entry.recentCompletedCount) {
        reasons.add("receipts_without_task_completion");
    }
    if (entry.claimedAssignments > 0 && entry.recentCompletedCount === 0) {
        reasons.add("claims_without_completion");
    }
    if (entry.recentCompletedCount > 0 && entry.recentRewardClaimCount === 0) {
        reasons.add("completion_without_reward");
    }
    if ((entry.definitionOrigin === "built_in" && isRetiredLegacyDailyTaskId(entry.taskId)) || entry.eventName === "unlock_drop_success") {
        reasons.add("legacy_alias_mismatch");
    }

    return Array.from(reasons);
}

function resolveRuntimeTaskSourceParityState(reasons: TaskSourceMismatchReason[]): RuntimeTaskSourceParityRow["sourceParityState"] {
    if (reasons.length === 0) return "aligned";

    if (reasons.some((reason) => (
        reason === "rollup_completed_exceeds_task_completed"
        || reason === "rewarded_without_receipts"
        || reason === "receipts_without_task_completion"
        || reason === "legacy_alias_mismatch"
        || reason === "unknown"
    ))) {
        return "mismatch";
    }

    if (reasons.some((reason) => (
        reason === "event_stats_exceeds_assignments"
        || reason === "event_stats_not_task_scoped"
        || reason === "claims_without_completion"
        || reason === "completion_without_reward"
    ))) {
        return "partial";
    }

    return "unknown";
}

function explainRuntimeTaskSourceParity(row: Omit<RuntimeTaskSourceParityRow, "explanation">) {
    if (row.sourceParityState === "aligned") {
        return `Assignment, completion, reward, and receipt signals are aligned. Canonical completion source: ${row.canonicalCompletionSource}.`;
    }

    const details: string[] = [];
    row.mismatchReasons.forEach((reason) => {
        switch (reason) {
            case "rollup_completed_exceeds_task_completed":
                details.push(`Rollup completions exceed task completion records by ${Math.max(0, row.rollupCompletedCount - row.taskCompletedCount)}.`);
                break;
            case "event_stats_exceeds_assignments":
                details.push(`Trigger event stats exceed assigned users by ${Math.max(0, row.eventStatsCount - row.assignedUsers)}.`);
                break;
            case "rewarded_without_receipts":
                details.push("Reward claims exist without matching task reward receipts.");
                break;
            case "receipts_without_task_completion":
                details.push(`Receipts exceed task completions by ${Math.max(0, row.receiptCount - row.taskCompletedCount)}; this may be related sample evidence instead of task-scoped reward receipts.`);
                break;
            case "claims_without_completion":
                details.push(`Assignments were claimed ${row.claimedCount} time(s) without task completion records.`);
                break;
            case "completion_without_reward":
                details.push("Task completions exist without matching reward claims.");
                break;
            case "event_stats_not_task_scoped":
                details.push("Event stats are trigger evidence only and are not task-scoped completion proof.");
                break;
            case "legacy_alias_mismatch":
                details.push("Legacy unlock/task alias evidence is still in the path and should not be treated as canonical completion proof.");
                break;
            default:
                details.push("Source mismatch reason is unknown; inspect runtime evidence directly.");
                break;
        }
    });

    return details.length > 0
        ? `${details.join(" ")} Canonical completion source: ${row.canonicalCompletionSource}.`
        : `Runtime task source parity is ${row.sourceParityState}; inspect the underlying sampled records.`;
}

function buildSharedTaskEventDisambiguators(definition: DailyTaskDefinition) {
    const required = new Set<string>();
    const present = new Set<string>();

    if (definition.maxProgress > 1) {
        required.add("count threshold");
    }
    if (definition.uniqueByParamKey) {
        required.add(`distinct ${definition.uniqueByParamKey}`);
        present.add(`distinct ${definition.uniqueByParamKey}`);
    } else if (definition.maxProgress > 1) {
        required.add("distinct keying");
    }
    if (definition.criteria?.paramEquals) {
        required.add(`${definition.criteria.paramEquals.key} filter`);
        present.add(`${definition.criteria.paramEquals.key} filter`);
    }
    if (definition.criteria?.minNumberParam) {
        required.add(`${definition.criteria.minNumberParam.key} threshold`);
        present.add(`${definition.criteria.minNumberParam.key} threshold`);
    }
    if (definition.criteria?.includesAnyParam) {
        required.add(`${definition.criteria.includesAnyParam.key} category`);
        present.add(`${definition.criteria.includesAnyParam.key} category`);
    }

    if (definition.eventName === "feedback_submitted") {
        required.add("feedback category/rating criteria");
        if (definition.criteria) {
            present.add("feedback category/rating criteria");
        }
    }
    if (definition.eventName === "unlock_drop_success" && definition.criteria) {
        required.add("unlock category criteria");
        present.add("unlock category criteria");
    }

    return {
        required: Array.from(required),
        present: Array.from(present),
    };
}

function buildSharedTaskEventExplanation(group: Omit<SharedTaskEventGroup, "explanation">) {
    if (group.ambiguityState === "safe_with_keying") {
        return `Shared by ${group.sharedByCount} tasks. Distinct keying and count thresholds are present, so this shared event is safely disambiguated. ${group.receiptMeaning}`;
    }
    if (group.ambiguityState === "safe_with_criteria") {
        return `Shared by ${group.sharedByCount} tasks. Criteria and keying are present for the current tasks. ${group.receiptMeaning}`;
    }
    if (group.ambiguityState === "partial") {
        return `Shared by ${group.sharedByCount} tasks. Some disambiguation exists, but this group still needs ${group.missingEvidence.join(", ")}. ${group.receiptMeaning}`;
    }
    return `Shared by ${group.sharedByCount} tasks. This event is unsafe for task attribution until ${group.missingEvidence.join(", ")} is added. ${group.receiptMeaning}`;
}

function inferSharedTaskEntity(definition: DailyTaskDefinition): "drop" | "file" | "session" | "notification" | "purchase" | "feedback" | "none" {
    if (definition.eventName === "unlock_drop_success" || definition.eventName === "drop_preview_opened" || definition.eventName === "view_drop_details" || definition.eventName === "viewer_opened") {
        return "drop";
    }
    if (definition.eventName === "viewer_asset_consumed" || definition.eventName === "viewer_asset_completed" || definition.eventName === "file_viewed") {
        return "file";
    }
    if (definition.eventName === "viewer_session_completed" || definition.eventName === "viewer_watch_checkpoint") {
        return "session";
    }
    if (definition.eventName === "notification_opened" || definition.eventName === "notification_read") {
        return "notification";
    }
    if (definition.eventName === "gumdrops_purchase_completed") {
        return "purchase";
    }
    if (definition.eventName === "feedback_submitted") {
        return "feedback";
    }
    return "none";
}

function inferSharedTaskKeying(definition: DailyTaskDefinition): "unique_entity" | "count" | "any" | "filtered" | "unknown" {
    if (definition.criteria && definition.uniqueByParamKey) return "filtered";
    if (definition.uniqueByParamKey) return "unique_entity";
    if (definition.maxProgress > 1) return "count";
    return "any";
}

function inferSharedTaskCriteriaState(definition: DailyTaskDefinition): "complete" | "partial" | "missing" | "not_required" {
    if (!definition.criteria) return "not_required";
    const parts = buildSharedTaskEventDisambiguators(definition);
    if (parts.required.length === 0) return "not_required";
    return parts.present.length >= parts.required.length ? "complete" : "partial";
}

function classifyTaskTelemetryEventPurpose(eventName: string): TaskTelemetryEventPurpose {
    if (eventName === "daily_task_assigned" || eventName === "daily_task_started" || eventName === "task_completed" || eventName === "daily_task_failed" || eventName === "daily_task_deadline_reminder_sent") {
        return "task_lifecycle";
    }
    if (eventName === "daily_tasks_viewed") {
        return "supporting_telemetry";
    }
    if (eventName.startsWith("task_guidance_") || eventName === "task_card_expanded" || eventName === "task_help_opened") {
        return "task_guidance";
    }
    if (eventName.startsWith("guided_onboarding_")) {
        return "onboarding_telemetry";
    }
    if (eventName === "notification_opened" || eventName === "notification_read" || eventName === "notifications_dropdown_opened") {
        return "notification_event";
    }
    if (eventName === "viewer_opened" || eventName === "viewer_session_completed" || eventName === "viewer_asset_consumed" || eventName === "viewer_asset_completed" || eventName === "viewer_watch_checkpoint" || eventName === "file_viewed") {
        return "viewer_event";
    }
    if (eventName === "begin_checkout" || eventName === "gumdrops_purchase_completed" || eventName === "unlock_drop_success") {
        return "commerce_event";
    }
    if (eventName === "daily_checkin_claimed") {
        return "task_trigger";
    }
    if (eventName.includes("receipt")) {
        return "reward_receipt";
    }
    if (eventName === "dashboard_viewed" || eventName === "drops_page_viewed" || eventName === "wallet_opened" || eventName === "drop_preview_opened" || eventName === "view_drop_details" || eventName === "experience_hub_viewed" || eventName === "library_viewed") {
        return "task_trigger";
    }
    return "unmapped_unknown";
}

function classifyTelemetryCoveragePurpose(
    eventName: string,
    mappedTaskCount: number,
): TelemetryCoverageEventPurpose {
    if (eventName === "daily_tasks_viewed") {
        return "supporting_telemetry";
    }
    if (
        eventName === "daily_task_assigned"
        || eventName === "daily_task_started"
        || eventName === "task_completed"
        || eventName === "daily_task_failed"
        || eventName === "daily_task_deadline_reminder_sent"
    ) {
        return "task_lifecycle";
    }
    if (eventName.startsWith("guided_onboarding_") || eventName.startsWith("onboarding_")) {
        return "onboarding";
    }
    if (eventName === "identity_linked") {
        return "identity";
    }
    if (
        eventName === "viewer_asset_changed"
        || eventName === "viewer_asset_started"
        || eventName === "viewer_content_loaded"
        || eventName === "file_viewed"
    ) {
        return mappedTaskCount > 0 ? "viewer_task_trigger" : "viewer_support";
    }
    if (
        eventName === "viewer_opened"
        || eventName === "viewer_session_completed"
        || eventName === "viewer_asset_consumed"
        || eventName === "viewer_asset_completed"
        || eventName === "viewer_watch_checkpoint"
    ) {
        return "viewer_task_trigger";
    }
    if (
        eventName === "notification_read"
        || eventName === "notification_marked_read"
        || eventName === "notification_opened"
        || eventName === "notifications_dropdown_opened"
        || eventName === "notification_clicked"
        || eventName === "notification_action_clicked"
    ) {
        return "notification";
    }
    if (eventName.startsWith("semantic_")) {
        return "semantic_ux";
    }
    if (
        eventName === "begin_checkout"
        || eventName === "gumdrops_purchase_completed"
        || eventName === "server_purchase_verified"
        || eventName === "unlock_drop_success"
        || eventName === "wallet_opened"
    ) {
        return "commerce";
    }
    if (eventName.startsWith("security_") || eventName.startsWith("confirmed_") || eventName.startsWith("heuristic_")) {
        return "security";
    }
    if (
        eventName === "dashboard_viewed"
        || eventName === "drops_page_viewed"
        || eventName === "drop_preview_opened"
        || eventName === "view_drop_details"
        || eventName === "experience_hub_viewed"
        || eventName === "library_viewed"
        || eventName === "daily_checkin_claimed"
    ) {
        return "task_trigger";
    }
    if (mappedTaskCount > 0) {
        return "task_trigger";
    }
    if (
        eventName === "drop_card_impression"
        || eventName === "page_viewed"
        || eventName.endsWith("_viewed")
        || eventName.endsWith("_clicked")
    ) {
        return "supporting_telemetry";
    }
    return "unknown";
}

function inferTelemetryCoverageSourceState(
    rawEventName: string,
    canonicalEventName: string,
): TelemetryCoverageRow["sourceState"] {
    const { option } = getTelemetryEventOption(rawEventName);
    const knownAliasInput = TELEMETRY_COVERAGE_ALIAS_EVENT_NAMES.includes(rawEventName as (typeof TELEMETRY_COVERAGE_ALIAS_EVENT_NAMES)[number]);
    if (!option) {
        return "unsupported";
    }
    if (rawEventName !== canonicalEventName || knownAliasInput) {
        return "alias_mapped";
    }
    if (TELEMETRY_COVERAGE_LEGACY_EVENT_NAMES.has(canonicalEventName)) {
        return "legacy";
    }
    if (CANONICAL_TASK_EVENT_NAMES.has(canonicalEventName) || option.sources?.includes("canonical")) {
        return "canonical";
    }
    return "telemetry";
}

function buildTelemetryCoverageExplanation(input: {
    eventName: string;
    purpose: TelemetryCoverageEventPurpose;
    mappedTaskCount: number;
    mappedTaskTitles: string[];
    sourceState: TelemetryCoverageRow["sourceState"];
    coverageState: TelemetryCoverageRow["coverageState"];
}) {
    if (input.eventName === "daily_checkin_claimed") {
        return input.mappedTaskCount > 0
            ? "Alias-mapped to Daily check-in claimed and used by Claim today's reward / the separate pinned daily check-in lane."
            : "Alias-mapped to Daily check-in claimed and classified as the canonical separate pinned daily check-in reward lane.";
    }
    if (input.eventName === "daily_tasks_viewed") {
        return "Daily tasks surface telemetry. It measures task-module visibility and is not a task completion trigger.";
    }
    if (input.eventName === "notification_read") {
        return input.mappedTaskCount > 0
            ? "Alias-mapped to Notification read. Used by Clear one alert where that task is configured."
            : "Alias-mapped to Notification read. This is a foreground notification event and should map to a task only if the catalog expects it.";
    }
    if (input.eventName === "task_completed") {
        return "Task lifecycle event. Not expected to map to a user-facing task.";
    }
    if (input.eventName === "file_viewed") {
        return input.mappedTaskCount > 0
            ? "Viewer/file task trigger with mapped task coverage."
            : "Used for viewer analytics, not daily task completion. File and viewer completion tasks rely on task-scoped viewer events.";
    }
    if (input.eventName === "identity_linked") {
        return "Identity linkage telemetry. Not a daily task trigger.";
    }
    if (input.purpose === "task_lifecycle") {
        return "Task lifecycle event. Not expected to map to a user-facing task.";
    }
    if (input.purpose === "onboarding") {
        return "Supporting onboarding telemetry. Tracked for onboarding visibility, not daily task completion.";
    }
    if (input.purpose === "semantic_ux") {
        return "Supporting UX telemetry, not a daily task trigger.";
    }
    if (input.purpose === "viewer_support") {
        return "Viewer support telemetry, not a direct daily task trigger.";
    }
    if (input.purpose === "supporting_telemetry") {
        return "Supporting telemetry, not a direct daily task trigger.";
    }
    if (input.coverageState === "task_mapping_missing") {
        return `Expected task trigger is tracked, but no task mapping was found for ${input.eventName}.`;
    }
    if (input.coverageState === "unsupported") {
        return "Tracked event is still unsupported or lacks a canonical alias/purpose classification.";
    }
    if (input.sourceState === "legacy") {
        return "Legacy canonical task trigger. Mapping exists, but legacy compatibility still needs careful validation.";
    }
    if (input.mappedTaskCount > 0) {
        return `Mapped to ${input.mappedTaskCount} task${input.mappedTaskCount === 1 ? "" : "s"}: ${input.mappedTaskTitles.join(", ")}.`;
    }
    return "Tracked event is known and classified, but it is not expected to map to a daily task.";
}

function resolveTaskTelemetryTrackingSource(entries: Array<{ trackingSource?: string }>): TaskTelemetryMappingRow["trackingSource"] {
    const values = Array.from(new Set(entries.map((entry) => entry.trackingSource).filter(Boolean)));
    if (values.length === 0) return "telemetry";
    if (values.length > 1) return "mixed";
    const only = values[0];
    if (only === "canonical" || only === "telemetry" || only === "legacy") return only;
    return "mixed";
}

function classifyTaskReceiptLane(
    normalizedAction: string,
    mappedDefinitions: DailyTaskDefinition[],
    rawEventName: string,
): Pick<TaskReceiptMappingGroup, "receiptLane" | "mappingState" | "severity" | "explanation"> {
    if (normalizedAction === "daily_checkin_claimed") {
        const aliasMapped = rawEventName !== normalizedAction;
        return {
            receiptLane: "daily_checkin_reward",
            mappingState: aliasMapped ? "alias_mapped" : "lane_classified",
            severity: "info",
            explanation: aliasMapped
                ? "Alias mapped to daily_checkin_claimed and classified as the daily check-in reward lane tied to Claim today’s reward."
                : "Classified as the daily check-in reward lane tied to Claim today’s reward.",
        };
    }
    if (normalizedAction === "feedback_submitted") {
        return {
            receiptLane: "feedback_reward",
            mappingState: "lane_classified",
            severity: "review",
            explanation: mappedDefinitions.length > 0
                ? "Feedback receipt lane is shared across feedback tasks and requires feedback type or rating criteria before task-specific reward attribution is trusted."
                : "Feedback receipt lane is tracked, but it is not currently mapped to a task-specific reward path.",
        };
    }
    if (normalizedAction === "gumdrops_purchase_completed") {
        return {
            receiptLane: "purchase_receipt",
            mappingState: "not_task_receipt",
            severity: "info",
            explanation: "Purchase receipt lane. These receipts prove package purchase, not task reward credit.",
        };
    }
    if (normalizedAction === "unlock_drop_success") {
        return {
            receiptLane: "unlock_receipt",
            mappingState: "lane_classified",
            severity: "review",
            explanation: "Unlock receipt lane is shared across unwrap tasks and cannot prove task-specific reward credit without taskId linkage.",
        };
    }
    if (mappedDefinitions.length === 1) {
        return {
            receiptLane: "task_reward",
            mappingState: "mapped",
            severity: "info",
            explanation: "Receipt event maps to a single task reward lane.",
        };
    }
    if (mappedDefinitions.length > 1) {
        return {
            receiptLane: "task_reward",
            mappingState: "lane_classified",
            severity: "review",
            explanation: "Receipt event maps to multiple task lanes and needs criteria before task-specific reward attribution is safe.",
        };
    }
    return {
        receiptLane: "unknown",
        mappingState: "unknown",
        severity: "review",
        explanation: "Receipt event has no task mapping or known receipt lane classification yet.",
    };
}

function readGeneratedAnalyticsStateFile(fileName: string): Record<string, unknown> | null {
    const filePath = path.join(process.cwd(), "agent", "state", fileName);
    if (!fs.existsSync(filePath)) {
        return null;
    }

    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
    } catch (error) {
        return {
            readError: getErrorMessage(error),
            fileName,
        };
    }
}

function readRepoSourceFile(relativePath: string) {
    const filePath = path.join(process.cwd(), relativePath);
    if (!fs.existsSync(filePath)) {
        return "";
    }

    try {
        return fs.readFileSync(filePath, "utf8");
    } catch {
        return "";
    }
}

function normalizeBehavioralFreshnessState(value: unknown): "fresh" | "stale" | "missing" | "unknown" {
    if (value === "live" || value === "fresh") return "fresh";
    if (value === "stale") return "stale";
    if (value === "missing") return "missing";
    return "unknown";
}

function formatUtcFromMs(value: unknown) {
    const ms = toNumber(value);
    return ms > 0 ? new Date(ms).toISOString() : null;
}

function normalizeTelemetryTruthQualityState(value: unknown): TelemetryTruthRecoveryQualityState {
    const normalized = toOptionalString(value)?.toLowerCase() || "";
    if (normalized === "exact" || normalized === "verified") return "verified";
    if (normalized === "mixed" || normalized === "partial") return "mixed";
    if (normalized === "estimated") return "estimated";
    if (normalized === "degraded" || normalized === "fallback" || normalized === "failed") return "degraded";
    return "unknown";
}

function resolveTelemetryTruthFreshnessState(nowMs: number, lastRebuildAtMs: number): TelemetryTruthRecoveryFreshnessState {
    if (lastRebuildAtMs <= 0) return "unknown";
    const ageMs = Math.max(0, nowMs - lastRebuildAtMs);
    if (ageMs <= 2 * 60 * 60 * 1000) return "live";
    if (ageMs <= 24 * 60 * 60 * 1000) return "stale";
    if (ageMs <= 72 * 60 * 60 * 1000) return "stale";
    return "expired";
}

function classifyTelemetryTruthRepairGroup(entry: Record<string, unknown>): TelemetryTruthRecoveryRepairGroup["repairType"] {
    const repairType = `${toOptionalString(entry.repairType) || ""} ${toOptionalString(entry.provenance) || ""}`.toLowerCase();
    if (repairType.includes("source") || repairType.includes("context")) return "missing source context";
    if (repairType.includes("dedupe") || repairType.includes("duplicate")) return "dedupe repair";
    if (repairType.includes("recover") || repairType.includes("session")) return "recovered session review";
    if (repairType.includes("stale") || repairType.includes("rebuild") || repairType.includes("refresh")) return "stale metric rebuild";
    return "unknown";
}

function isTelemetryTruthRepairActionable(repairType: TelemetryTruthRecoveryRepairGroup["repairType"]) {
    return repairType === "stale metric rebuild";
}

function buildEstimatedWatchRecoveryGroups(repairs: Array<Record<string, unknown>>): EstimatedWatchRecoveryGroup[] {
    const estimatedRows = repairs
        .map((entry) => {
            const repairType = toOptionalString(entry.repairType);
            const sourceLayer = toOptionalString(entry.sourceLayer) || toOptionalString(entry.truthLabel);
            if (repairType !== "estimated_drop_session_end" || sourceLayer !== "estimated") {
                return null;
            }

            const sessionId = toOptionalString(entry.scopeKey) || toOptionalString(entry.sessionId) || toOptionalString(entry.repairId) || "unknown-session";
            const confidence = Math.max(0, Math.round(toNumber(entry.confidenceScore) * 100));
            const recoveredWatchSeconds = Math.max(0, Math.round(toNumber(entry.recoveredWatchTimeMs) / 1000));

            return {
                recoveryKind: "estimated_drop_session_end" as const,
                provenance: toOptionalString(entry.provenance) || "unknown",
                layer: "estimated" as const,
                recoveredWatchSeconds,
                row: {
                    sessionId,
                    shortSessionId: shortenDebugId(sessionId),
                    dropId: toOptionalString(entry.dropId) || undefined,
                    dropTitle: toOptionalString(entry.dropTitle) || undefined,
                    userId: toOptionalString(entry.userId) || undefined,
                    actorDisplayName: toOptionalString(entry.actorDisplayName) || (toOptionalString(entry.userId) ? shortenDebugId(toOptionalString(entry.userId) || "") : undefined),
                    confidence,
                    recoveredWatchSeconds,
                    completionRepairCount: toNumber(entry.repairedCompletionCount),
                    provenance: toOptionalString(entry.provenance) || "unknown",
                    createdAtUtc: formatUtcFromMs(entry.repairedAtMs) || undefined,
                } satisfies EstimatedWatchRecoveryRow,
            };
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    const grouped = new Map<string, {
        recoveryKind: "estimated_drop_session_end";
        provenance: string;
        layer: "estimated";
        rows: EstimatedWatchRecoveryRow[];
    }>();

    for (const entry of estimatedRows) {
        const key = `${entry.recoveryKind}:${entry.provenance}:${entry.recoveredWatchSeconds}:${entry.layer}`;
        const existing = grouped.get(key);
        if (existing) {
            existing.rows.push(entry.row);
            continue;
        }
        grouped.set(key, {
            recoveryKind: entry.recoveryKind,
            provenance: entry.provenance,
            layer: entry.layer,
            rows: [entry.row],
        });
    }

    return Array.from(grouped.values()).map((group) => {
        const confidenceValues = group.rows.map((row) => row.confidence);
        const recoveredValues = group.rows.map((row) => row.recoveredWatchSeconds);
        const recoveredMode = recoveredValues.reduce<Record<number, number>>((accumulator, value) => {
            accumulator[value] = (accumulator[value] || 0) + 1;
            return accumulator;
        }, {});
        const modeSeconds = Object.entries(recoveredMode).sort((left, right) => {
            if (right[1] !== left[1]) return right[1] - left[1];
            return Number(left[0]) - Number(right[0]);
        })[0];
        const firstSeenAtUtc = group.rows
            .map((row) => row.createdAtUtc)
            .filter((value): value is string => Boolean(value))
            .sort()[0] || null;
        const lastSeenAtUtc = group.rows
            .map((row) => row.createdAtUtc)
            .filter((value): value is string => Boolean(value))
            .sort()
            .slice(-1)[0] || null;
        const completionRepairCount = group.rows.reduce((sum, row) => sum + row.completionRepairCount, 0);
        const confidenceAvg = confidenceValues.length > 0
            ? Math.round((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length) * 10) / 10
            : 0;

        return {
            recoveryKind: group.recoveryKind,
            provenance: group.provenance,
            layer: group.layer,
            count: group.rows.length,
            confidenceMin: confidenceValues.length > 0 ? Math.min(...confidenceValues) : 0,
            confidenceMax: confidenceValues.length > 0 ? Math.max(...confidenceValues) : 0,
            confidenceAvg,
            recoveredWatchSecondsTotal: recoveredValues.reduce((sum, value) => sum + value, 0),
            recoveredWatchSecondsPerSession: {
                min: recoveredValues.length > 0 ? Math.min(...recoveredValues) : 0,
                max: recoveredValues.length > 0 ? Math.max(...recoveredValues) : 0,
                mode: modeSeconds ? Number(modeSeconds[0]) : 0,
            },
            completionRepairCount,
            firstSeenAtUtc,
            lastSeenAtUtc,
            affectedSessionSample: group.rows.slice(0, 5),
            estimationFormula: "stale-open timeout fallback = min(15s, max(3s, round((totalVisibleSeconds - totalWatchSeconds) * 250ms))).",
            confidenceFactors: "Confidence starts at 100%, then subtracts 25% for stale-open timeout, 25% when no raw watch observations exist, and 20% when capture was degraded.",
            countsTowardVerifiedWatch: false as const,
            countsTowardEstimatedWatch: true as const,
            state: "review" as const,
            explanation: completionRepairCount > 0
                ? "Estimated session end contributes only to estimated watch recovery and may include completion repair side effects."
                : "Estimated session end contributes only to estimated watch recovery. No completion state changed.",
        } satisfies EstimatedWatchRecoveryGroup;
    }).sort((left, right) => right.count - left.count);
}

function formatDurationCompactFromSeconds(seconds: number) {
    const safeSeconds = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;
    if (minutes <= 0) {
        return `${remainingSeconds}s`;
    }
    return `${minutes}m ${remainingSeconds}s`;
}

function normalizeRolloutStage(stage: unknown): RolloutRegistryItem["stage"] {
    const raw = toOptionalString(stage)?.toLowerCase();
    if (raw === "alpha" || raw === "beta") return raw;
    if (raw === "ga" || raw === "stable") return "stable";
    if (raw === "internal") return "internal";
    return "internal";
}

function buildRolloutRegistryPanelState(input: {
    nowMs: number;
    rollouts: Array<Record<string, unknown>>;
    rolloutSamples: Array<Record<string, unknown>>;
    release: Record<string, unknown> | null;
    changeLog: Array<Record<string, unknown>>;
}): RolloutRegistryPanelState {
    const latestBetaEntryAtUtc = PUBLIC_RELEASE_NOTES_FALLBACK.notes[0]?.generatedAtUtc
        ?? PUBLIC_RELEASE_NOTES_FALLBACK.notes[0]?.committedAtUtc
        ?? null;
    const releaseChannel = toOptionalString(input.release?.channel)?.toLowerCase();
    const declaredAtUtc = (() => {
        const declaredAt = toOptionalString(input.release?.declaredAt);
        if (!declaredAt) return "unknown";
        const parsed = Date.parse(declaredAt);
        return Number.isFinite(parsed) ? new Date(parsed).toISOString() : declaredAt;
    })();
    const currentTrainFreshnessState: RolloutRegistryPanelState["currentTrain"]["freshnessState"] =
        releaseChannel === "alpha" && PUBLIC_RELEASE_NOTES_FALLBACK.channel === "beta"
            ? "historical"
            : releaseChannel === PUBLIC_RELEASE_NOTES_FALLBACK.channel
                ? "current"
                : "unknown";
    const relationToCurrentBeta = currentTrainFreshnessState === "historical"
        ? `Alpha baseline preserved for history; current Beta release notes are tracked separately in ${PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion} (${latestBetaEntryAtUtc ?? "unknown update time"}).`
        : currentTrainFreshnessState === "current"
            ? `This train matches the current ${PUBLIC_RELEASE_NOTES_FALLBACK.channel} release notes context.`
            : "Current beta relationship is not documented in the loaded rollout registry.";

    const rolloutItems: RolloutRegistryItem[] = input.rollouts.map((rollout) => {
        const kindRaw = toOptionalString(rollout.kind)?.toLowerCase();
        const baseKind: RolloutRegistryItem["kind"] =
            kindRaw === "experiment" || kindRaw === "feature"
                ? kindRaw
                : "unknown";
        const ownerRaw = toOptionalString(rollout.owner)?.toLowerCase();
        const owner: RolloutRegistryItem["owner"] =
            ownerRaw === "product" || ownerRaw === "platform" || ownerRaw === "growth" || ownerRaw === "admin"
                ? ownerRaw
                : "unknown";
        const enabled = Boolean(rollout.enabled);
        const rolloutPct = toNumber(rollout.rolloutPercent);
        const activeVariants = Array.isArray(rollout.variants)
            ? Array.from(new Set(
                (rollout.variants as Array<Record<string, unknown>>)
                    .map((variant) => toOptionalString(variant.key))
                    .filter((value): value is string => Boolean(value)),
            ))
            : [];
        const sampleAssignments = input.rolloutSamples.flatMap((sample) => {
            const assignments = Array.isArray(sample.assignments) ? sample.assignments as Array<Record<string, unknown>> : [];
            return assignments.filter((assignment) => toOptionalString(assignment.id) === toOptionalString(rollout.id));
        });
        const hasHoldout = rolloutPct < 100 || sampleAssignments.some((assignment) => toOptionalString(assignment.reason) === "holdout");
        const stage = owner === "admin" || toOptionalString(rollout.audience) === "admin" ? "internal" : normalizeRolloutStage(rollout.stage);
        let effectiveState: RolloutRegistryItem["effectiveState"] = "disabled";
        let kind: RolloutRegistryItem["kind"] = baseKind;

        if (!enabled) {
            effectiveState = "disabled";
        } else if (owner === "admin" || toOptionalString(rollout.audience) === "admin") {
            effectiveState = "internal_feature";
        } else if (baseKind === "experiment" && (hasHoldout || activeVariants.length > 1)) {
            effectiveState = "active_experiment";
            kind = hasHoldout ? "holdout" : "experiment";
        } else if (baseKind === "experiment" && rolloutPct === 100) {
            effectiveState = "fully_rolled_out";
        } else if (baseKind === "feature" && rolloutPct === 100 && activeVariants.length <= 1) {
            effectiveState = "baseline";
            kind = "baseline";
        } else if (baseKind === "feature") {
            effectiveState = "fully_rolled_out";
        }

        const requirements = Array.isArray(rollout.requiredSegments) ? (rollout.requiredSegments as string[]) : [];
        const exclusions = Array.isArray(rollout.excludedSegments) ? (rollout.excludedSegments as string[]) : [];
        const killSwitchReady = rollout.killSwitchable !== false;
        const name = toOptionalString(rollout.label) || "Unnamed rollout";
        const audience = toOptionalString(rollout.audience) || "unknown";
        const humanSummary = effectiveState === "internal_feature"
            ? `${name} is an internal admin feature for ${audience} operators.`
            : effectiveState === "baseline"
                ? `${name} is fully rolled out baseline behavior for ${audience} users.`
                : effectiveState === "fully_rolled_out"
                    ? `${name} is fully rolled out for ${audience} users.`
                    : `${name} is still operating as a live rollout with variant logic for ${audience} users.`;
        const explanation = effectiveState === "active_experiment"
            ? hasHoldout
                ? `Active experiment with holdout coverage. ${activeVariants.length} configured variant${activeVariants.length === 1 ? "" : "s"} remain available for comparison.`
                : `All eligible users are inside the experiment, but ${activeVariants.length} configured variant${activeVariants.length === 1 ? "" : "s"} still make this a live comparison rather than a baseline feature.`
            : effectiveState === "fully_rolled_out"
                ? "Fully rolled out; no active holdout detected."
                : effectiveState === "baseline"
                    ? "Fully rolled out baseline feature. Not currently an A/B test."
                    : effectiveState === "internal_feature"
                        ? "Internal admin feature. Kill switch configured only means a config toggle exists; rollback test evidence is not attached here."
                        : "Rollout is disabled in the current registry snapshot.";

        return {
            id: toOptionalString(rollout.id) || "unknown",
            name,
            humanSummary,
            kind,
            stage,
            owner,
            audience,
            rolloutPct,
            defaultVariant: toOptionalString(rollout.defaultVariant) || "unknown",
            activeVariants,
            hasHoldout,
            effectiveState,
            killSwitchReady,
            requirements,
            exclusions,
            lastUpdatedAtUtc: declaredAtUtc === "unknown" ? null : declaredAtUtc,
            explanation,
        };
    });

    const actorRows: RolloutActorEvaluationRow[] = input.rolloutSamples.map((sample) => {
        const assignments = Array.isArray(sample.assignments) ? sample.assignments as Array<Record<string, unknown>> : [];
        const roleRaw = toOptionalString(sample.role);
        const role: RolloutActorEvaluationRow["role"] =
            roleRaw === "user" || roleRaw === "creator" || roleRaw === "admin"
                ? roleRaw
                : "guest";
        const actorSource: RolloutActorEvaluationRow["actorSource"] = "representative_fixture";
        const actorId = null;
        const evaluations = assignments.map((assignment) => {
                const match = rolloutItems.find((item) => item.id === toOptionalString(assignment.id));
                const reasonRaw = toOptionalString(assignment.reason);
                const assignedVariant = toOptionalString(assignment.variant) || "unknown";
                const defaultVariant = toOptionalString(assignment.defaultVariant) || match?.defaultVariant || "unknown";
                const reason: RolloutActorEvaluationRow["evaluations"][number]["reason"] =
                    reasonRaw === "assigned" || reasonRaw === "ineligible" || reasonRaw === "disabled"
                        ? reasonRaw
                        : reasonRaw === "holdout"
                            ? "defaulted"
                            : "unknown";
                const reasonDetail =
                    reason === "assigned"
                        ? `${match?.name || toOptionalString(assignment.id) || "Rollout"} assigned ${assignedVariant} variant.`
                        : reason === "ineligible"
                            ? `${match?.name || toOptionalString(assignment.id) || "Rollout"} is ineligible for this ${role} context. Fallback: ${defaultVariant}.`
                            : reason === "disabled"
                                ? `${match?.name || toOptionalString(assignment.id) || "Rollout"} is disabled. Fallback: ${defaultVariant}.`
                                : `${match?.name || toOptionalString(assignment.id) || "Rollout"} defaulted to ${defaultVariant} because no active assignment was given.`;
                const state: RolloutActorEvaluationRow["evaluations"][number]["state"] =
                    reason === "assigned"
                        ? "assigned"
                        : reason === "ineligible"
                            ? "ineligible"
                            : reason === "disabled"
                                ? "review"
                                : "info";
                return {
                    rolloutId: toOptionalString(assignment.id) || "unknown",
                    rolloutName: match?.name || toOptionalString(assignment.id) || "unknown",
                    variant: reason === "assigned" ? assignedVariant : `Fallback: ${defaultVariant}`,
                    reason,
                    reasonDetail,
                    state,
                };
            });

        return {
            label: toOptionalString(sample.label) || "Unknown actor",
            route: toOptionalString(sample.path) || "unknown",
            role,
            actorSource,
            actorId,
            isSimulated: true,
            evaluations,
        };
    });

    const actorEvaluation: RolloutActorEvaluationPanel = {
        generatedAtUtc: new Date(input.nowMs).toISOString(),
        mode: "dry_run_representative",
        actorCount: actorRows.length,
        actorRows,
        explanation: "These are fixture contexts used to verify registry rules. They are not live user assignments.",
    };

    return {
        generatedAtUtc: new Date(input.nowMs).toISOString(),
        currentTrain: {
            label: toOptionalString(input.release?.label) || "Unknown train",
            id: toOptionalString(input.release?.id) || "unknown-train",
            channel: releaseChannel === "alpha" || releaseChannel === "beta"
                ? releaseChannel
                : releaseChannel === "ga"
                    ? "stable"
                    : "internal",
            declaredAtUtc,
            freshnessState: currentTrainFreshnessState,
            relationToCurrentBeta,
            notesCount: Array.isArray(input.release?.releaseNotes) ? input.release.releaseNotes.length : 0,
            changelogEntryCount: input.changeLog.length,
        },
        currentBetaNotes: {
            channel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
            currentVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
            latestEntryAtUtc: latestBetaEntryAtUtc,
            entryCount: PUBLIC_RELEASE_NOTES_FALLBACK.notes.length,
        },
        summary: {
            configuredRollouts: rolloutItems.length,
            sampleActors: actorRows.length,
            activeExperiments: rolloutItems.filter((item) => item.effectiveState === "active_experiment").length,
            fullyRolledOutFeatures: rolloutItems.filter((item) => item.effectiveState === "fully_rolled_out" || item.effectiveState === "baseline").length,
            internalFeatures: rolloutItems.filter((item) => item.effectiveState === "internal_feature").length,
            killSwitchReady: rolloutItems.filter((item) => item.killSwitchReady).length,
            staleRollouts: rolloutItems.filter((item) => item.stage === "alpha" && currentTrainFreshnessState === "historical").length,
        },
        rollouts: rolloutItems,
        actorEvaluation,
        alphaBaselineChangelog: input.changeLog.map((entry) => ({
            id: toOptionalString(entry.id) || "unknown",
            date: toOptionalString(entry.date) || "unknown",
            title: toOptionalString(entry.title) || "Untitled changelog entry",
            summary: toOptionalString(entry.summary) || "No summary recorded.",
            areas: Array.isArray(entry.areas) ? entry.areas.map((area) => String(area)) : [],
        })),
    };
}

function buildTelemetryTruthRecoveryState(input: {
    nowMs: number;
    analyticsTruthRecovery: Record<string, unknown> | null;
    analyticsTruthDrops: Array<Record<string, unknown>>;
    analyticsTruthUsers: Array<Record<string, unknown>>;
    analyticsTruthRepairs: Array<Record<string, unknown>>;
    dropLookup: Map<string, { title: string; creatorId?: string; creatorName?: string }>;
    userIdentityLookup: Map<string, AdminOverviewUserIdentity>;
}): TelemetryTruthRecoveryState {
    const globalRecord = input.analyticsTruthRecovery?.global && typeof input.analyticsTruthRecovery.global === "object"
        ? input.analyticsTruthRecovery.global as Record<string, unknown>
        : {};
    const statusRecord = input.analyticsTruthRecovery?.status && typeof input.analyticsTruthRecovery.status === "object"
        ? input.analyticsTruthRecovery.status as Record<string, unknown>
        : {};
    const truthLayers = globalRecord.truthLayers && typeof globalRecord.truthLayers === "object"
        ? globalRecord.truthLayers as Record<string, unknown>
        : {};
    const rawLayer = truthLayers.raw && typeof truthLayers.raw === "object" ? truthLayers.raw as Record<string, unknown> : {};
    const validatedLayer = truthLayers.validated && typeof truthLayers.validated === "object" ? truthLayers.validated as Record<string, unknown> : {};
    const finalizedLayer = truthLayers.finalized && typeof truthLayers.finalized === "object" ? truthLayers.finalized as Record<string, unknown> : {};
    const estimatedLayer = truthLayers.estimated && typeof truthLayers.estimated === "object" ? truthLayers.estimated as Record<string, unknown> : {};

    const observedViews = toNumber(rawLayer.raw_view_count);
    const checkedViews = toNumber(validatedLayer.deduped_view_count);
    const finalViews = toNumber(finalizedLayer.finalized_view_count);
    const estimatedViews = toNumber(estimatedLayer.estimated_recovered_view_count);
    const duplicateCandidates = toNumber(validatedLayer.duplicate_candidate_count);
    const duplicateRateRatio = typeof validatedLayer.duplicate_event_rate === "number"
        ? Number(validatedLayer.duplicate_event_rate)
        : checkedViews + duplicateCandidates > 0
            ? duplicateCandidates / (checkedViews + duplicateCandidates)
            : 0;
    const duplicateRatePct = Math.max(0, Math.round(duplicateRateRatio * 100));
    const recoveredSessionCount = toNumber(estimatedLayer.recovered_sessions_count);
    const lastRebuildAtMs = toNumber(statusRecord.lastComputedAtMs);
    const rebuildAgeHours = lastRebuildAtMs > 0
        ? Math.round((Math.max(0, input.nowMs - lastRebuildAtMs) / (60 * 60 * 1000)) * 10) / 10
        : null;
    const freshnessState = resolveTelemetryTruthFreshnessState(input.nowMs, lastRebuildAtMs);
    const qualityState = normalizeTelemetryTruthQualityState(globalRecord.qualityLabel);
    const estimatedRatioRaw = typeof estimatedLayer.estimated_data_ratio === "number"
        ? Number(estimatedLayer.estimated_data_ratio)
        : finalViews > 0
            ? estimatedViews / finalViews
            : 0;
    const estimatedRatioPct = Math.max(0, Math.round(estimatedRatioRaw * 100));
    const confidencePct = Math.max(0, Math.round(toNumber(globalRecord.confidenceScore) * 100));
    const formulas = {
        observedViews: "Raw viewer-open and session-start events from the observed analytics layer.",
        checkedViews: "Deduped eligible view candidates after duplicate/page-load collapse in the checked layer.",
        finalViews: "Reporting value after checked views plus recovered or estimated adjustments from the finalized layer. Estimated watch remains non-verified even when final reporting includes it.",
        estimatedRatio: "estimatedViews / finalViews from the estimated layer.",
        duplicateRate: "duplicateCandidates / rawCandidates in the checked layer.",
        confidence: "Weighted source truth, rebuild freshness, sample quality, and repair burden.",
    };
    const formulaState: TelemetryTruthRecoveryFormulaState = Object.values(formulas).every(Boolean) ? "documented" : "unknown";

    const repairGroupMap = new Map<string, TelemetryTruthRecoveryRepairGroup>();
    for (const rawEntry of input.analyticsTruthRepairs) {
        const entry = rawEntry as Record<string, unknown>;
        const repairType = classifyTelemetryTruthRepairGroup(entry);
        const actionability = isTelemetryTruthRepairActionable(repairType) ? "actionable" : "inspect_only";
        const key = `${repairType}:${actionability}`;
        const existing = repairGroupMap.get(key);
        const repairedAtUtc = formatUtcFromMs(entry.repairedAtMs);
        if (existing) {
            existing.count += 1;
            if (!existing.latestAtUtc || (repairedAtUtc && repairedAtUtc > existing.latestAtUtc)) {
                existing.latestAtUtc = repairedAtUtc;
            }
            continue;
        }
        repairGroupMap.set(key, {
            repairType,
            count: 1,
            actionability,
            explanation: repairType === "missing source context"
                ? "Missing source context repairs need manual evidence review before metrics can be trusted."
                : repairType === "dedupe repair"
                    ? "Duplicate-candidate repairs explain checked-layer collapse and need inspection before changing truth."
                    : repairType === "recovered session review"
                        ? "Recovered-session repairs explain estimated additions and should stay visible until reviewed."
                        : repairType === "stale metric rebuild"
                            ? "Stale metric rebuild repairs point to rebuild work rather than data mutation."
                            : "Repair exists but the underlying type was not classified yet.",
            latestAtUtc: repairedAtUtc,
        });
    }
    const repairGroups = Array.from(repairGroupMap.values()).sort((left, right) => right.count - left.count);
    const estimatedWatchRecoveryGroups = buildEstimatedWatchRecoveryGroups(input.analyticsTruthRepairs);
    const dropRows: DropTelemetryRecoveryRow[] = input.analyticsTruthDrops.map((entry) => {
        const dropId = toOptionalString(entry.dropId) || "unknown-drop";
        const dropIdentity = input.dropLookup.get(dropId);
        const rawLayer = entry.truthLayers && typeof entry.truthLayers === "object"
            ? ((entry.truthLayers as Record<string, unknown>).raw as Record<string, unknown> | undefined)
            : undefined;
        const validatedLayer = entry.truthLayers && typeof entry.truthLayers === "object"
            ? ((entry.truthLayers as Record<string, unknown>).validated as Record<string, unknown> | undefined)
            : undefined;
        const estimatedLayer = entry.truthLayers && typeof entry.truthLayers === "object"
            ? ((entry.truthLayers as Record<string, unknown>).estimated as Record<string, unknown> | undefined)
            : undefined;
        const finalizedLayer = entry.truthLayers && typeof entry.truthLayers === "object"
            ? ((entry.truthLayers as Record<string, unknown>).finalized as Record<string, unknown> | undefined)
            : undefined;
        const rawViews = toNumber(rawLayer?.raw_view_count);
        const validatedViews = toNumber(validatedLayer?.deduped_view_count);
        const estimatedViewsForRow = toNumber(estimatedLayer?.estimated_recovered_view_count);
        const finalizedViewsForRow = toNumber(finalizedLayer?.finalized_view_count);
        const duplicateRateForRow = Math.max(0, Math.round(toNumber(validatedLayer?.duplicate_event_rate) * 100));
        const repairedPctForRow = Math.max(0, Math.round(toNumber(entry.repairedDataRatio) * 100));
        const watchSeconds = Math.max(0, Math.round(toNumber(finalizedLayer?.finalized_watch_time_ms) / 1000));
        const quality = normalizeTelemetryTruthQualityState(entry.qualityLabel);
        const warningsForRow: string[] = [];
        if (!dropIdentity?.title) {
            warningsForRow.push("missing_drop_identity");
        }
        if (finalizedViewsForRow !== validatedViews + estimatedViewsForRow) {
            warningsForRow.push("finalized_formula_mismatch");
        }
        if (quality === "estimated") {
            warningsForRow.push("estimated_quality");
        }
        const hasEstimatedReason = estimatedViewsForRow > 0
            ? "Estimated/recovered views exist for this drop, so quality remains estimated."
            : repairedPctForRow > 0
                ? "Recovery share remains non-zero for this drop even though current estimated view count is zero."
                : "No explicit estimated-view reason was attached.";
        if (quality === "estimated" && estimatedViewsForRow <= 0 && repairedPctForRow <= 0) {
            warningsForRow.push("missing_estimated_reason");
        }
        if (rawViews < validatedViews) {
            warningsForRow.push("raw_layer_narrower_than_validated");
        }
        const metricExplanation = {
            rawViews: "Observed raw views are directly observed viewer-open and session-start events before recovery review.",
            validatedViews: rawViews < validatedViews
                ? "Validated views are accepted candidates after dedupe and eligibility checks. This can exceed observed raw views because raw only counts direct viewer-open/session-start events while validated also includes checked page/session candidates."
                : "Validated views are accepted candidates after dedupe and eligibility checks.",
            estimatedViews: estimatedViewsForRow > 0
                ? "Estimated/recovered views come from the repair layer and are not verified watch truth."
                : "No estimated/recovered views were added for this drop in the current bounded sample.",
            finalizedViews: finalizedViewsForRow === validatedViews + estimatedViewsForRow
                ? "Final reporting views equal validated views plus estimated/recovered views."
                : "Final reporting views do not equal validated plus estimated views in this sample; inspect finalized_formula_mismatch.",
            duplicateRate: "Duplicate rate = duplicate candidates / checked raw candidates before validated collapse.",
            repairedPct: "Recovery share = repairedDataRatio * 100; it shows the share of finalized reporting affected by recovery or repair logic.",
        };
        const state: DropTelemetryRecoveryRow["state"] =
            !dropIdentity?.title
                ? "review"
                : warningsForRow.includes("finalized_formula_mismatch")
                    ? "error"
                    : quality === "estimated" || quality === "degraded" || repairedPctForRow > 0
                        ? "review"
                        : "live";

        return {
            dropId,
            shortDropId: shortenDebugId(dropId),
            dropTitle: dropIdentity?.title || "Unknown drop",
            creatorId: dropIdentity?.creatorId,
            creatorName: dropIdentity?.creatorName,
            dropIdentityState: dropIdentity?.title ? "resolved" : dropId ? "fallback_id" : "missing",
            adminDropHref: dropId ? `/admin/drops?dropId=${encodeURIComponent(dropId)}` : undefined,
            quality,
            rawViews,
            validatedViews,
            estimatedViews: estimatedViewsForRow,
            finalizedViews: finalizedViewsForRow,
            duplicateRatePct: duplicateRateForRow,
            repairedPct: repairedPctForRow,
            watchSeconds,
            watchDurationDisplay: formatDurationCompactFromSeconds(watchSeconds),
            metricExplanation,
            state,
            warnings: [
                ...warningsForRow,
                ...(quality === "estimated" ? [hasEstimatedReason] : []),
            ],
        };
    });
    const userRows: UserWatchRecoveryRow[] = input.analyticsTruthUsers.map((entry) => {
        const userId = toOptionalString(entry.userId) || "";
        const identity = userId
            ? input.userIdentityLookup.get(userId) || buildAdminOverviewFallbackIdentity(userId)
            : {
                userId: "",
                userDisplayName: "Unknown user",
                shortUserId: "unknown",
                userIdentityState: "missing" as const,
            };
        const truthLayers = entry.truthLayers && typeof entry.truthLayers === "object"
            ? entry.truthLayers as Record<string, unknown>
            : {};
        const validatedLayer = truthLayers.validated && typeof truthLayers.validated === "object"
            ? truthLayers.validated as Record<string, unknown>
            : {};
        const finalizedLayer = truthLayers.finalized && typeof truthLayers.finalized === "object"
            ? truthLayers.finalized as Record<string, unknown>
            : {};
        const estimatedLayer = truthLayers.estimated && typeof truthLayers.estimated === "object"
            ? truthLayers.estimated as Record<string, unknown>
            : {};
        const totalWatchSeconds = Math.max(0, Math.round(toNumber(finalizedLayer.finalized_watch_time_ms) / 1000));
        const estimatedWatchSeconds = Math.max(0, Math.round(toNumber(estimatedLayer.estimated_watch_time_ms) / 1000));
        const rawGapCount = toNumber(estimatedLayer.raw_coverage_gap_count);
        const qualityRaw = toOptionalString(entry.qualityLabel)?.toLowerCase() || "unknown";
        const fallbackWatchSeconds = qualityRaw === "fallback"
            ? Math.max(0, totalWatchSeconds - estimatedWatchSeconds)
            : 0;
        const verifiedWatchSeconds = Math.max(0, totalWatchSeconds - estimatedWatchSeconds - fallbackWatchSeconds);
        const confidencePct = Math.max(0, Math.round(toNumber(entry.confidenceScore) * 100));
        const qualityReasons: string[] = [];
        let quality: UserWatchRecoveryRow["quality"] = qualityRaw === "exact" ? "exact"
            : qualityRaw === "estimated" ? "estimated"
                : qualityRaw === "fallback" ? "fallback"
                    : qualityRaw === "mixed" ? "mixed"
                        : qualityRaw === "degraded" ? "degraded"
                            : "unknown";

        if (estimatedWatchSeconds > 0) {
            qualityReasons.push(`estimated share ${(totalWatchSeconds > 0 ? Math.round((estimatedWatchSeconds / totalWatchSeconds) * 100) : 0)}% of total watch`);
        }
        if (fallbackWatchSeconds > 0) {
            qualityReasons.push(`fallback share ${(totalWatchSeconds > 0 ? Math.round((fallbackWatchSeconds / totalWatchSeconds) * 100) : 0)}% of total watch`);
        }
        if (rawGapCount > 0) {
            qualityReasons.push("raw_gaps_present");
        }
        if (confidencePct <= 0) {
            qualityReasons.push("confidence_formula_missing");
        }
        if (quality === "exact" && (estimatedWatchSeconds > 0 || fallbackWatchSeconds > 0)) {
            quality = estimatedWatchSeconds > 0 && fallbackWatchSeconds > 0 ? "mixed" : estimatedWatchSeconds > 0 ? "estimated" : "fallback";
            qualityReasons.push("exact_quality_downgraded");
        }
        if (quality === "exact" && rawGapCount > 0) {
            quality = "mixed";
            qualityReasons.push("exact_invalid_due_to_raw_gaps");
        }
        if (quality === "unknown" && estimatedWatchSeconds > 0) {
            quality = "estimated";
        } else if (quality === "unknown" && fallbackWatchSeconds > 0) {
            quality = "fallback";
        } else if (quality === "unknown" && rawGapCount > 0) {
            quality = "degraded";
        } else if (quality === "unknown" && totalWatchSeconds > 0) {
            quality = "exact";
        }

        const mathExplanation = {
            totalWatch: "Total watch is finalized watch time in the bounded user recovery row, after any estimated or fallback contributions already included in reporting.",
            verifiedWatch: "Verified watch excludes estimated and fallback watch contributions.",
            estimatedWatch: estimatedWatchSeconds > 0
                ? "Estimated watch is diagnostics-only recovery time and does not count as verified watch."
                : "No estimated watch was added for this user in the current sample.",
            fallbackWatch: fallbackWatchSeconds > 0
                ? "Fallback watch represents non-verified fallback contribution that kept this row out of exact quality."
                : "No fallback watch contributed to this row.",
            rawGaps: rawGapCount > 0
                ? "Raw gaps count missing raw watch evidence such as start/end events, asset events, route/session context, or close signals."
                : "No raw watch evidence gaps were recorded in this bounded sample.",
            confidence: "Confidence reflects verified session share, raw-gap burden, estimated or fallback share, close/end-signal availability, and sample completeness.",
        };

        const state: UserWatchRecoveryRow["state"] =
            identity.userIdentityState === "missing"
                ? "error"
                : quality === "exact" && rawGapCount === 0 && estimatedWatchSeconds === 0 && fallbackWatchSeconds === 0
                    ? "live"
                    : "review";

        return {
            userId,
            shortUserId: identity.shortUserId,
            userDisplayName: identity.userIdentityState === "resolved" ? identity.userDisplayName : identity.userIdentityState === "fallback_uid" ? identity.shortUserId : "Unknown user",
            username: identity.username,
            userIdentityState: identity.userIdentityState,
            adminUserHref: userId ? `/admin/user/${encodeURIComponent(userId)}` : undefined,
            totalWatchSeconds,
            verifiedWatchSeconds,
            estimatedWatchSeconds,
            fallbackWatchSeconds,
            watchDurationDisplay: formatDurationCompactFromSeconds(totalWatchSeconds),
            uniqueViewerCount: toNumber(finalizedLayer.finalized_unique_viewers),
            sessionCount: toNumber(validatedLayer.total_drop_view_sessions),
            unlockCount: toNumber(finalizedLayer.unlock_count),
            rawGapCount,
            quality,
            confidencePct,
            qualityReasons,
            mathExplanation,
            state,
        };
    });
    const actionableRepairCount = repairGroups
        .filter((group) => group.actionability === "actionable")
        .reduce((sum, group) => sum + group.count, 0);
    const inspectOnlyRepairCount = repairGroups
        .filter((group) => group.actionability === "inspect_only")
        .reduce((sum, group) => sum + group.count, 0);

    const sourceLayers: TelemetryTruthRecoverySourceLayer[] = [
        {
            layer: "observed",
            source: "analytics_truth_global_metrics.truthLayers.raw.raw_view_count",
            count: observedViews,
            freshnessState,
            explanation: formulas.observedViews,
        },
        {
            layer: "checked",
            source: "analytics_truth_global_metrics.truthLayers.validated.deduped_view_count",
            count: checkedViews,
            freshnessState,
            explanation: `${formulas.checkedViews} Duplicate denominator uses ${Math.max(checkedViews + duplicateCandidates, 0)} raw candidates.`,
        },
        {
            layer: "final",
            source: "analytics_truth_global_metrics.truthLayers.finalized.finalized_view_count",
            count: finalViews,
            freshnessState,
            explanation: formulas.finalViews,
        },
        {
            layer: "estimated",
            source: "analytics_truth_global_metrics.truthLayers.estimated.estimated_recovered_view_count",
            count: estimatedViews,
            freshnessState,
            explanation: formulas.estimatedRatio,
        },
        {
            layer: "recovered",
            source: "analytics_truth_global_metrics.truthLayers.estimated.recovered_sessions_count",
            count: recoveredSessionCount,
            freshnessState,
            explanation: "Recovered sessions are restored sessions used by the estimated layer; they do not mean raw observed opens increased one-for-one.",
        },
    ];

    const warnings: string[] = [];
    if (freshnessState === "stale" || freshnessState === "expired") {
        warnings.push(`Last rebuild is ${rebuildAgeHours === null ? "unknown" : `${rebuildAgeHours}h`} old. Metrics are estimated/stale until analytics truth is rebuilt.`);
    }
    if (qualityState === "estimated") {
        warnings.push("Quality is estimated, so recovered and inferred layers must stay visible before trusting the final reporting value.");
    }
    if (estimatedWatchRecoveryGroups.length > 0) {
        warnings.push("Estimated watch recovery is displayed separately from verified watch. These timeout repairs count toward estimated/final reporting only, not verified watch time.");
    }
    if (input.analyticsTruthRepairs.length > 0) {
        warnings.push(`${input.analyticsTruthRepairs.length} open repairs remain in the truth window. Review grouped repair types before treating these metrics as verified.`);
    }
    if (checkedViews > observedViews) {
        warnings.push("Observed layer only counts viewer opens/session starts; checked layer also includes eligible page-load candidates after dedupe review.");
    }
    if (finalViews < checkedViews) {
        warnings.push("Final views are lower than checked views. Inspect final-layer exclusions before treating this as expected.");
    }
    const expectedEstimatedRatioPct = finalViews > 0 ? Math.round((estimatedViews / finalViews) * 100) : 0;
    if (Math.abs(expectedEstimatedRatioPct - estimatedRatioPct) > 1) {
        warnings.push("Estimated ratio does not match estimated views divided by final views. Inspect estimated-layer math.");
    }
    if (duplicateCandidates <= 0 && duplicateRatePct > 0) {
        warnings.push("Duplicate rate is present without an explicit duplicate-candidate denominator. Inspect validated-layer source fields.");
    }
    if (formulaState === "unknown") {
        warnings.push("One or more telemetry truth formulas are undocumented.");
    }

    const overallState: TelemetryTruthRecoveryState["overallState"] =
        freshnessState === "expired"
            ? "error"
            : qualityState === "estimated" || qualityState === "degraded" || input.analyticsTruthRepairs.length > 0 || freshnessState === "stale" || formulaState === "unknown"
                ? "review"
                : "live";

    return {
        generatedAtUtc: new Date(input.nowMs).toISOString(),
        lastRebuildAtUtc: lastRebuildAtMs > 0 ? new Date(lastRebuildAtMs).toISOString() : null,
        rebuildAgeHours,
        freshnessState,
        qualityState,
        formulaState,
        overallState,
        dropMetricCount: input.analyticsTruthDrops.length,
        userMetricCount: input.analyticsTruthUsers.length,
        openRepairCount: input.analyticsTruthRepairs.length,
        actionableRepairCount,
        inspectOnlyRepairCount,
        observedViews,
        checkedViews,
        finalViews,
        estimatedViews,
        estimatedRatioPct,
        duplicateRatePct,
        recoveredSessionCount,
        confidencePct,
        formulas,
        sourceLayers,
        repairGroups,
        estimatedWatchRecoveryGroups,
        dropRows,
        userRows,
        warnings,
    };
}

function buildBehavioralIntelligencePanelState(input: {
    nowMs: number;
    behavioralSnapshotStatus: Record<string, unknown> | null;
    behavioralDrops: Array<Record<string, unknown>>;
}): BehavioralIntelligencePanelState {
    const calibrationReport = readGeneratedAnalyticsStateFile("behavioral-math-calibration.generated.json");
    const modelValidationReport = readGeneratedAnalyticsStateFile("behavioral-model-validation.generated.json");
    const recommendationArtifact = readGeneratedAnalyticsStateFile("recommendation-model.generated.json");
    const behavioralRuntimeSource = readRepoSourceFile("functions/src/behavioral-intelligence-runtime.ts");
    const rankingFeaturesSource = readRepoSourceFile("src/lib/recommendations/ranking-features.ts");
    const serverBehaviorSource = readRepoSourceFile("src/lib/server/behavioral-intelligence.ts");
    const deterministicRankerSource = readRepoSourceFile("src/lib/recommendations/deterministic-ranker.ts");
    const mlRankerSource = readRepoSourceFile("src/lib/recommendations/ml-ranker.ts");
    const negativePreferenceSource = readRepoSourceFile("src/lib/recommendations/suppression-rules.ts");
    const diversitySource = readRepoSourceFile("src/lib/recommendations/diversity-reranker.ts");
    const integritySource = readRepoSourceFile("src/lib/recommendations/integrity-demotions.ts");
    const creatorSupplySource = readRepoSourceFile("src/lib/recommendations/creator-quality-adjustment.ts");
    const explorationSource = readRepoSourceFile("src/lib/recommendations/exploration-policy.ts");

    const connectedModules: BehavioralConnectedModules = {
        purchasePrediction: rankingFeaturesSource.includes("pPurchase7d") && behavioralRuntimeSource.includes("pPurchase7d"),
        unlockPrediction: rankingFeaturesSource.includes("pUnlock24h") && behavioralRuntimeSource.includes("pUnlock24h"),
        watchPrediction: rankingFeaturesSource.includes("pWatchComplete") && behavioralRuntimeSource.includes("pWatchComplete"),
        returnPrediction: rankingFeaturesSource.includes("pReturn7d") && behavioralRuntimeSource.includes("pReturn7d"),
        negativeSuppression: negativePreferenceSource.includes("buildRecommendationSuppression") && rankingFeaturesSource.includes("suppressionScore"),
        diversityReranking: serverBehaviorSource.includes("rerankRecommendationsForDiversity") && diversitySource.includes("rerankRecommendationsForDiversity"),
        integrityDemotion: serverBehaviorSource.includes("applyIntegrityDemotions") && integritySource.includes("applyIntegrityDemotions"),
        creatorSupplyQuality: serverBehaviorSource.includes("buildCreatorSupplyQualityMap") && creatorSupplySource.includes("buildCreatorSupplyQualityMap"),
        explorationBudget: serverBehaviorSource.includes("applyExplorationBudget") && explorationSource.includes("applyExplorationBudget"),
    };
    const connectedModuleCount = Object.values(connectedModules).filter(Boolean).length;
    const missingModuleCount = Object.values(connectedModules).length - connectedModuleCount;

    const validationMetricsRecord = (calibrationReport?.validationMetrics && typeof calibrationReport.validationMetrics === "object")
        ? calibrationReport.validationMetrics as Record<string, unknown>
        : {};
    const sampleSize = toNumber(validationMetricsRecord.sampleSize)
        || toNumber(recommendationArtifact?.sampleCount)
        || toNumber(modelValidationReport?.models && typeof modelValidationReport.models === "object"
            ? (modelValidationReport.models as Record<string, unknown>).recommendationRanker && typeof (modelValidationReport.models as Record<string, unknown>).recommendationRanker === "object"
                ? ((modelValidationReport.models as Record<string, unknown>).recommendationRanker as Record<string, unknown>).trainingSampleSize
                : 0
            : 0);

    const activeModeRaw = toOptionalString(calibrationReport?.activeMode)
        || toOptionalString(modelValidationReport?.overallActiveMode)
        || (serverBehaviorSource.includes("scoreRecommendationWithArtifact") ? "hybrid" : "deterministic");
    const activeRankingMode: BehavioralIntelligencePanelState["activeRankingMode"] = activeModeRaw === "ml_active"
        ? "ml_active"
        : activeModeRaw === "hybrid"
            ? "hybrid"
            : activeModeRaw === "ml_experimental"
                ? "ml_experimental"
                : activeModeRaw === "deterministic" || activeModeRaw === "deterministic-fallback"
                    ? "deterministic"
                    : "unknown";

    const beatsBaseline = Boolean(
        validationMetricsRecord.deterministicBaselineComparison
        && typeof validationMetricsRecord.deterministicBaselineComparison === "object"
        && ((validationMetricsRecord.deterministicBaselineComparison as Record<string, unknown>).beatsBaseline === true),
    );
    const mlValidationState: BehavioralIntelligencePanelState["mlValidationState"] = sampleSize < 50
        ? "not_enough_sample"
        : sampleSize < 200
            ? "experimental"
            : activeRankingMode === "ml_active"
                ? "active"
                : activeRankingMode === "hybrid"
                    ? "experimental"
                    : beatsBaseline
                        ? "experimental"
                        : "under_baseline";

    const latestRebuildAtMs = toNumber(input.behavioralSnapshotStatus?.updatedAtMs);
    const sourceWindowStartMs = toNumber(input.behavioralSnapshotStatus?.sourceWindowStartMs);
    const rebuildFreshnessState: BehavioralIntelligencePanelState["rebuildFreshnessState"] =
        latestRebuildAtMs <= 0
            ? "unknown"
            : input.nowMs - latestRebuildAtMs <= 24 * 60 * 60 * 1000
                ? "live"
                : "stale";

    const dropRows: BehavioralDropPanelRow[] = input.behavioralDrops.map((entry) => {
        const previewOpens = toNumber(entry.previewOpens);
        const viewerOpens = toNumber(entry.viewerOpens);
        const unlocks = toNumber(entry.unlocks);
        const purchases = toNumber(entry.purchasesAfterView24h);
        const watchSampleCount = toNumber(entry.provenance && typeof entry.provenance === "object" ? (entry.provenance as Record<string, unknown>).watchSamples : 0);
        const feedbackCount = toNumber(entry.negativeFeedbackCount) + toNumber(entry.positiveFeedbackCount);
        const sampleCount = Math.max(0, previewOpens + viewerOpens + unlocks + watchSampleCount);
        const predictionOutputs = entry.predictionOutputs && typeof entry.predictionOutputs === "object"
            ? entry.predictionOutputs as Record<string, unknown>
            : {};
        const profileFreshnessState = normalizeBehavioralFreshnessState(entry.freshnessLabel);
        const completionRateValue = typeof entry.completionRate === "number" ? Number(entry.completionRate) : null;
        const completionRate = completionRateValue !== null ? Math.max(0, Math.min(100, Math.round(completionRateValue * 100))) : null;
        const negativeRateValue = typeof entry.negativeSignalRate === "number" && feedbackCount > 0 ? Number(entry.negativeSignalRate) : null;
        const negativeRate = negativeRateValue !== null ? Math.max(0, Math.min(100, Math.round(negativeRateValue * 100))) : null;
        const completionExplanation = completionRateValue === null
            ? "Completion rate is missing because no watch completion data was materialized for this drop."
            : completionRateValue === 0 && viewerOpens <= 0
                ? "Completion is effectively unavailable because the drop has no viewer-open sample yet."
                : completionRateValue === 0
                    ? "Completion is an actual zero from current watch-session truth for the sampled viewers."
                    : `Completion is derived from watch-session truth over ${viewerOpens} viewer opens.`;
        const negativeExplanation = feedbackCount <= 0
            ? "No explicit negative-feedback sample is available yet, so negative suppression remains sample-limited."
            : `Negative rate is derived from explicit negative feedback (${toNumber(entry.negativeFeedbackCount)} of ${feedbackCount} feedback samples).`;
        const missingInputs: string[] = [];
        if (profileFreshnessState !== "fresh") missingInputs.push("fresh_profile_snapshot");
        if (!predictionOutputs.pPurchase7d) missingInputs.push("purchase_prediction_signal");
        if (!predictionOutputs.pUnlock24h) missingInputs.push("unlock_prediction_signal");
        if (!predictionOutputs.pWatchComplete) missingInputs.push("watch_completion_signal");
        if (!predictionOutputs.pReturn7d) missingInputs.push("return_prediction_signal");
        if (watchSampleCount <= 0) missingInputs.push("watch_completion_sample");
        if (feedbackCount <= 0) missingInputs.push("negative_feedback_sample");
        const topReasons: string[] = [];
        if (toNumber(predictionOutputs.pPurchase7d) > 0) topReasons.push(`Purchase ${Math.round(toNumber(predictionOutputs.pPurchase7d) * 100)}%`);
        if (toNumber(predictionOutputs.pUnlock24h) > 0) topReasons.push(`Unlock ${Math.round(toNumber(predictionOutputs.pUnlock24h) * 100)}%`);
        if (toNumber(predictionOutputs.pWatchComplete) > 0) topReasons.push(`Watch ${Math.round(toNumber(predictionOutputs.pWatchComplete) * 100)}%`);
        if (negativeRate !== null && negativeRate > 0) topReasons.push(`Negative suppression ${negativeRate}%`);
        if (profileFreshnessState === "stale") topReasons.push("Profile snapshot is stale");
        const rankEligibility: BehavioralDropPanelRow["rankEligibility"] = profileFreshnessState === "stale"
            ? "stale"
            : sampleCount < 5
                ? "low_sample"
                : toOptionalString(entry.status) && toOptionalString(entry.status) !== "active"
                    ? "blocked"
                    : "eligible";

        return {
            dropId: toOptionalString(entry.dropId) || "unknown-drop",
            dropTitle: toOptionalString(entry.dropTitle) || toOptionalString(entry.dropId) || "Unknown drop",
            creatorName: toOptionalString(entry.creatorName) || toOptionalString(entry.creatorId) || null,
            profileFreshnessState,
            lastUpdatedAtUtc: formatUtcFromMs(entry.updatedAtMs),
            sourceTruthScore: Math.round(toNumber(entry.truthScore) * 100),
            confidenceScore: Math.round(toNumber(entry.confidenceScore) * 100),
            confidenceFormula: "35% source agreement + 25% freshness + 25% sample + 15% schema - issue penalty.",
            sampleSize,
            previews: previewOpens,
            viewerOpens,
            unlocks,
            purchases,
            completionRate,
            completionExplanation,
            negativeRate,
            negativeExplanation,
            pPurchase7d: typeof predictionOutputs.pPurchase7d === "number" ? Math.round(Number(predictionOutputs.pPurchase7d) * 100) : null,
            pUnlock24h: typeof predictionOutputs.pUnlock24h === "number" ? Math.round(Number(predictionOutputs.pUnlock24h) * 100) : null,
            pWatchComplete: typeof predictionOutputs.pWatchComplete === "number" ? Math.round(Number(predictionOutputs.pWatchComplete) * 100) : null,
            pReturn7d: typeof predictionOutputs.pReturn7d === "number" ? Math.round(Number(predictionOutputs.pReturn7d) * 100) : null,
            suppressionScore: typeof predictionOutputs.pNegativeFeedback === "number" ? Math.round(Number(predictionOutputs.pNegativeFeedback) * 100) : null,
            diversityPenalty: null,
            integrityMultiplier: null,
            creatorSupplyScore: typeof entry.creatorBaselineMomentumScore === "number" ? Math.round(Number(entry.creatorBaselineMomentumScore)) : null,
            finalRankScore: typeof entry.dropRecommendationScore === "number" ? Math.round(Number(entry.dropRecommendationScore) * 100) / 100 : null,
            rankEligibility,
            topReasons: topReasons.slice(0, 3),
            missingInputs,
        };
    });

    const freshDropProfiles = dropRows.filter((entry) => entry.profileFreshnessState === "fresh").length;
    const staleDropProfiles = dropRows.filter((entry) => entry.profileFreshnessState === "stale").length;
    const dropProfileFreshnessState: BehavioralIntelligencePanelState["dropProfileFreshnessState"] =
        dropRows.length === 0
            ? "unknown"
            : staleDropProfiles === 0
                ? "live"
                : freshDropProfiles === 0
                    ? "stale"
                    : "partial";
    const overallFreshnessState: BehavioralIntelligencePanelState["overallFreshnessState"] =
        rebuildFreshnessState === "live" && dropProfileFreshnessState === "live"
            ? "live"
            : rebuildFreshnessState === "live" && dropProfileFreshnessState === "stale"
                ? "partial"
                : rebuildFreshnessState === "live" && dropProfileFreshnessState === "partial"
                    ? "partial"
                    : rebuildFreshnessState === "stale" || dropProfileFreshnessState === "stale"
                        ? "stale"
                        : "unknown";
    const overallFreshnessExplanation = rebuildFreshnessState === "live" && dropProfileFreshnessState === "stale"
        ? "Profile snapshot rebuilt recently, but the visible drop profiles are stale."
        : rebuildFreshnessState === "live" && dropProfileFreshnessState === "partial"
            ? "Snapshot rebuild is live, but some drop profiles are still stale."
            : rebuildFreshnessState === "stale"
                ? "Behavioral snapshot rebuild itself is stale."
                : "Behavioral freshness could not be proven from the current debug sample.";

    return {
        generatedAtUtc: new Date(input.nowMs).toISOString(),
        latestRebuildAtUtc: latestRebuildAtMs > 0 ? new Date(latestRebuildAtMs).toISOString() : null,
        sourceWindowStartUtc: sourceWindowStartMs > 0 ? new Date(sourceWindowStartMs).toISOString() : "unknown",
        sourceWindowEndUtc: latestRebuildAtMs > 0 ? new Date(latestRebuildAtMs).toISOString() : "unknown",
        rebuildFreshnessState,
        dropProfileFreshnessState,
        overallFreshnessState,
        overallFreshnessExplanation,
        userProfiles: toNumber(input.behavioralSnapshotStatus?.userProfileCount),
        guestProfiles: toNumber(input.behavioralSnapshotStatus?.guestProfileCount),
        dropProfiles: toNumber(input.behavioralSnapshotStatus?.dropProfileCount),
        staleDropProfiles,
        freshDropProfiles,
        activeRankingMode,
        mlValidationState,
        deterministicBaselineState: deterministicRankerSource.includes("computeDropRecommendationScore") || mlRankerSource.includes("deterministicPrecisionAt5")
            ? "available"
            : "missing",
        modelVersion: toOptionalString(
            modelValidationReport?.models
            && typeof modelValidationReport.models === "object"
            && (modelValidationReport.models as Record<string, unknown>).recommendationRanker
            && typeof (modelValidationReport.models as Record<string, unknown>).recommendationRanker === "object"
                ? ((modelValidationReport.models as Record<string, unknown>).recommendationRanker as Record<string, unknown>).modelVersion
                : recommendationArtifact?.version,
        ),
        sampleSize,
        validationMetrics: {
            precisionAt5: toNumber(validationMetricsRecord.precisionAt5),
            precisionAt10: toNumber(validationMetricsRecord.precisionAt10),
            purchaseHitRate7d: toNumber(validationMetricsRecord.purchaseHitRateWithin7d),
            unlockHitRate24h: toNumber(validationMetricsRecord.unlockHitRateWithin24h),
            watchCompletionHitRate: toNumber(validationMetricsRecord.watchCompletionHitRate),
            returnHitRate7d: toNumber(validationMetricsRecord.returnHitRateWithin7d),
            calibrationError: toNumber(validationMetricsRecord.calibrationError),
            baselineComparison: sampleSize < 50
                ? "not_tested"
                : beatsBaseline
                    ? "beats_baseline"
                    : "under_baseline",
        },
        connectedModules,
        connectedModuleCount,
        missingModuleCount,
        confidenceFormula: "35% source agreement + 25% freshness + 25% sample + 15% schema - issue penalty.",
        dropRows,
    };
}

function toRecordArray(value: unknown): Array<Record<string, unknown>> {
    return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
}

function buildAnalyticsLegacyParityDebugMetadata() {
    const inventory = readGeneratedAnalyticsStateFile("analytics-legacy-source-inventory.generated.json");
    const mapping = readGeneratedAnalyticsStateFile("analytics-legacy-mapping-report.generated.json");
    const parity = readGeneratedAnalyticsStateFile("analytics-ecosystem-parity.generated.json");
    const inventorySources = toRecordArray(inventory?.sources);
    const recoveredEvents = toRecordArray(mapping?.recoveredEvents);
    const parityLanes = toRecordArray(parity?.lanes);
    const manualReviewItems = toRecordArray(parity?.manualReviewItems);
    const recoveredTimestamps = recoveredEvents
        .map((event) => Date.parse(String(event.legacyTimestamp ?? "")))
        .filter((timestamp) => Number.isFinite(timestamp));
    const failedParity = parityLanes.filter((lane) => lane.severity === "fail");
    const warnParity = parityLanes.filter((lane) => lane.severity === "warn");

    return {
        surface: "analytics-legacy-parity",
        debugGroupTitle: "Analytics Legacy + Parity",
        inventoryStatus: inventory ? "available" : "missing_report",
        mappingStatus: mapping ? "available" : "missing_report",
        parityStatus: parity ? "available" : "missing_report",
        writeModeEnabled: mapping?.writeModeEnabled === true,
        writeTarget: mapping?.targetCollection ?? "analytics_legacy_recovered_events",
        dryRunDefault: mapping ? mapping.dryRun !== false : true,
        lastLegacyInventoryRun: inventory?.generatedAt ?? null,
        lastLegacyDryRun: mapping?.generatedAt ?? null,
        lastParityRun: parity?.generatedAt ?? null,
        legacySourceCount: inventorySources.length,
        earliestRecoveredDate: recoveredTimestamps.length > 0 ? new Date(Math.min(...recoveredTimestamps)).toISOString() : null,
        latestRecoveredDate: recoveredTimestamps.length > 0 ? new Date(Math.max(...recoveredTimestamps)).toISOString() : null,
        mappedRecordCount: toNumber(mapping?.mapped),
        skippedRecordCount: toNumber(mapping?.skipped),
        duplicateRecordCount: toNumber(mapping?.duplicate),
        lowConfidenceCount: toNumber(mapping?.lowConfidence),
        parityLaneCount: parityLanes.length,
        highestSeverity: parity?.highestSeverity ?? "unknown",
        highestSeverityMismatches: toRecordArray(parity?.highestSeverityMismatches).map((lane) => ({
            lane: lane.lane,
            severity: lane.severity,
            recommendedFix: lane.recommendedFix,
        })),
        manualReviewItems: manualReviewItems.map((lane) => ({
            lane: lane.lane,
            severity: lane.severity,
            recommendedFix: lane.recommendedFix,
        })),
        failedParityLaneCount: failedParity.length,
        warnParityLaneCount: warnParity.length,
        debugFields: [
            "legacySourceCount",
            "mappedRecordCount",
            "skippedRecordCount",
            "duplicateRecordCount",
            "lowConfidenceCount",
            "parityLaneCount",
            "highestSeverity",
            "manualReviewItems",
            "writeModeEnabled",
            "lastLegacyDryRun",
            "lastParityRun",
        ],
        reports: {
            inventory: "agent/state/analytics-legacy-source-inventory.generated.json",
            mapping: "agent/state/analytics-legacy-mapping-report.generated.json",
            parity: "agent/state/analytics-ecosystem-parity.generated.json",
        },
        truthRules: [
            "Legacy mapped records are never server-confirmed current truth.",
            "Legacy data is included in snapshots only when source-specific confidence and parity allow it.",
            "Parity jobs update Debug metadata asynchronously and do not block Admin Analytics rendering.",
        ],
    };
}

function normalizeTaskIds(rawTasks: unknown) {
    if (!Array.isArray(rawTasks)) {
        return [];
    }

    return rawTasks
        .map((task) => (task && typeof task === "object" ? task as DailyTaskAssignment : null))
        .filter((task): task is DailyTaskAssignment => Boolean(task))
        .map((task) => ({
            id: resolveLegacyDailyTaskId(toStringValue(task.id)),
            title: toStringValue(task.title),
            progress: toNumber(task.progress),
            maxProgress: toNumber(task.maxProgress) || 1,
            claimed: task.claimed === true,
            claimedAt: toNumber(task.claimedAt),
            assignedAt: toNumber(task.assignedAt),
            dailyTaskWindowId: toStringValue(task.dailyTaskWindowId),
            status: toStringValue(task.status),
            reasonCode: toStringValue(task.reasonCode),
            source: toStringValue(task.assignmentSource),
        }))
        .filter((task) => task.id.length > 0 && !isRetiredLegacyDailyTaskId(task.id));
}

function normalizeStringArray(rawValue: unknown) {
    if (!Array.isArray(rawValue)) {
        return [];
    }

    return rawValue.filter((value): value is string => typeof value === "string" && value.length > 0);
}

function normalizeHistory(rawValue: unknown) {
    if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) {
        return {} as Record<string, number>;
    }

    return Object.entries(rawValue as Record<string, unknown>).reduce<Record<string, number>>((history, [key, value]) => {
        const numericValue = toNumber(value);
        if (key.length > 0 && numericValue > 0) {
            history[key] = numericValue;
        }
        return history;
    }, {});
}

function normalizeCustomTaskDefinition(id: string, rawValue: Record<string, unknown>) {
    const title = toStringValue(rawValue.title);
    const subtitle = toStringValue(rawValue.subtitle);
    const eventName = toStringValue(rawValue.eventName);
    const actionType = toStringValue(rawValue.actionType);
    const icon = toStringValue(rawValue.icon);
    const group = toStringValue(rawValue.group);
    const scope = toStringValue(rawValue.source) || toStringValue(rawValue.scope);

    const issues: string[] = [];
    if (!title) {
        issues.push("missing title");
    }
    if (!subtitle) {
        issues.push("missing subtitle");
    }
    if (!eventName) {
        issues.push("missing eventName");
    }
    if (!TASK_ACTION_SET.has(actionType)) {
        issues.push("invalid actionType");
    }
    if (!TASK_ICON_SET.has(icon)) {
        issues.push("invalid icon");
    }
    if (!TASK_GROUP_SET.has(group)) {
        issues.push("invalid group");
    }
    if (scope !== "global" && scope !== "user") {
        issues.push("invalid scope");
    }

    if (issues.length > 0) {
        return {
            definition: null,
            issues,
        };
    }

    const rewardContract = buildDailyTaskRewardContract({
        id,
        title,
        eventName: buildTelemetryEventMetadata(eventName).canonicalEventName,
        reward: toNumber(rawValue.reward),
        maxProgress: Math.max(1, toNumber(rawValue.maxProgress) || 1),
    });

    return {
        definition: {
            id,
            source: scope as DailyTaskDefinition["source"],
            title,
            subtitle,
            reward: resolveDailyTaskReward(rawValue.reward, rawValue.rewardVersion),
            rewardTier: rewardContract.rewardTier,
            minRewardGd: rewardContract.minRewardGd,
            maxRewardGd: rewardContract.maxRewardGd,
            rewardSource: rewardContract.rewardSource,
            payoutPolicy: rewardContract.payoutPolicy,
            repeatPolicy: rewardContract.repeatPolicy,
            economyRisk: rewardContract.economyRisk,
            maxProgress: Math.max(1, toNumber(rawValue.maxProgress) || 1),
            eventName: buildTelemetryEventMetadata(eventName).canonicalEventName,
            actionType: actionType as DailyTaskDefinition["actionType"],
            ctaLabel: toStringValue(rawValue.ctaLabel) || "Keep going",
            icon: icon as DailyTaskDefinition["icon"],
            group: group as DailyTaskDefinition["group"],
            cooldownDays: Math.max(1, toNumber(rawValue.cooldownDays) || DAILY_TASK_COOLDOWN_DAYS),
            oneTime: rawValue.oneTime === true,
            criteria: rawValue.criteria as DailyTaskDefinition["criteria"] | undefined,
            uniqueByParamKey: toStringValue(rawValue.uniqueByParamKey) || undefined,
            targetUserId: toStringValue(rawValue.targetUserId) || null,
            customTaskId: id,
            active: rawValue.active !== false,
            createdAt: toNumber(rawValue.createdAt) || undefined,
            updatedAt: toNumber(rawValue.updatedAt) || undefined,
            rewardVersion: toNumber(rawValue.rewardVersion) || undefined,
        } satisfies DailyTaskDefinition,
        issues,
    };
}

async function readInfrastructureDependencies() {
    try {
        const rootDir = process.cwd();
        const rootPackageRelativePath = "package.json";
        const rootLockfileRelativePath = "package-lock.json";
        const functionsPackageRelativePath = "functions/package.json";
        const functionsLockfileRelativePath = "functions/package-lock.json";
        const rootPackagePath = path.join(rootDir, rootPackageRelativePath);
        const rootLockfilePath = path.join(rootDir, rootLockfileRelativePath);
        const functionsPackagePath = path.join(rootDir, functionsPackageRelativePath);
        const functionsLockfilePath = path.join(rootDir, functionsLockfileRelativePath);

        const rootPkg = readJsonFile<Record<string, Record<string, string>>>(rootPackagePath, {});
        const rootLockfile = readJsonFile<Record<string, unknown>>(rootLockfilePath, {});
        const functionsPkg = readJsonFile<Record<string, Record<string, string>>>(functionsPackagePath, {});
        const functionsLockfile = readJsonFile<Record<string, unknown>>(functionsLockfilePath, {});

        const latestTelemetryPingSnapshotPromise = adminDb.collection("server_diagnostics")
            .orderBy("createdAtMs", "desc")
            .limit(1)
            .get();

        let firestorePing: DependencyInventory["firestoreConnectivity"] = "unknown";
        let lastTelemetryPingAtUtc: string | null = null;
        try {
            await adminDb.collection("server_diagnostics").limit(1).get();
            firestorePing = "live";
            const latestTelemetryPingSnapshot = await latestTelemetryPingSnapshotPromise;
            const latestTelemetryPing = latestTelemetryPingSnapshot.docs[0]?.data() as Record<string, unknown> | undefined;
            const latestTelemetryPingMs = toNumber(latestTelemetryPing?.createdAtMs)
                || toNumber(latestTelemetryPing?.timestamp)
                || toNumber(latestTelemetryPing?.timestampMs);
            lastTelemetryPingAtUtc = latestTelemetryPingMs > 0 ? new Date(latestTelemetryPingMs).toISOString() : null;
        } catch {
            firestorePing = "failed";
        }

        const rootDependencies = buildDependencyEntries("root", "runtime", rootPkg.dependencies ?? {}, rootLockfile);
        const rootDevDependencies = buildDependencyEntries("root", "dev", rootPkg.devDependencies ?? {}, rootLockfile);
        const rootOptionalDependencies = buildDependencyEntries("root", "optional", rootPkg.optionalDependencies ?? {}, rootLockfile);

        const functionsDependencies = buildDependencyEntries("functions", "runtime", functionsPkg.dependencies ?? {}, functionsLockfile);
        const functionsDevDependencies = buildDependencyEntries("functions", "dev", functionsPkg.devDependencies ?? {}, functionsLockfile);
        const functionsOptionalDependencies = buildDependencyEntries("functions", "optional", functionsPkg.optionalDependencies ?? {}, functionsLockfile);

        const packageSources: DependencyPackageSource[] = [
            {
                name: "root",
                path: rootPackageRelativePath,
                dependencies: rootDependencies,
                devDependencies: rootDevDependencies,
                optionalDependencies: rootOptionalDependencies,
            },
            {
                name: "functions",
                path: functionsPackageRelativePath,
                dependencies: functionsDependencies,
                devDependencies: functionsDevDependencies,
                optionalDependencies: functionsOptionalDependencies,
            },
        ];

        const allEntries = packageSources.flatMap((source) => [
            ...source.dependencies,
            ...source.devDependencies,
            ...source.optionalDependencies,
        ]);

        const groups = Array.from(allEntries.reduce((map, entry) => {
            const current = map.get(entry.category) || {
                key: entry.category,
                label: getDependencyGroupLabel(entry.category),
                count: 0,
                entries: [] as DependencyEntry[],
                topEntries: [] as string[],
            };
            current.count += 1;
            current.entries.push(entry);
            current.topEntries = current.entries.slice(0, 4).map((currentEntry) => currentEntry.name);
            map.set(entry.category, current);
            return map;
        }, new Map<DependencyCategory, DependencyGroup>()).values()).sort((left, right) => right.count - left.count);

        const rootOverrides = Object.keys(rootPkg.overrides ?? {}).sort();
        const functionsOverrides = Object.keys(functionsPkg.overrides ?? {}).sort();
        const notDirectDependencies = ["@google-cloud/pubsub", "@google-cloud/storage"].map((name) => {
            const installedVersion = getLockfileInstalledVersion(rootLockfile, name) || getLockfileInstalledVersion(functionsLockfile, name);
            const isDirect = allEntries.some((entry) => entry.name === name);
            return {
                name,
                state: isDirect ? "transitive/not direct" as const : (installedVersion ? "transitive/not direct" as const : "absent" as const),
                installedVersion,
            };
        }).filter((entry) => !allEntries.some((dependency) => dependency.name === entry.name));

        const rootPackageUpdatedAtUtc = fs.existsSync(rootPackagePath) ? fs.statSync(rootPackagePath).mtime.toISOString() : null;
        const functionsPackageUpdatedAtUtc = fs.existsSync(functionsPackagePath) ? fs.statSync(functionsPackagePath).mtime.toISOString() : null;

        return {
            generatedAtUtc: new Date().toISOString(),
            timestamp: Date.now(),
            nodeVersion: process.version,
            firestoreConnectivity: firestorePing,
            lastTelemetryPingAtUtc,
            packageSources,
            totals: {
                runtimeDependencies: packageSources.reduce((sum, source) => sum + source.dependencies.length, 0),
                devDependencies: packageSources.reduce((sum, source) => sum + source.devDependencies.length, 0),
                optionalDependencies: packageSources.reduce((sum, source) => sum + source.optionalDependencies.length, 0),
                functionsDependencies: functionsDependencies.length,
                overrideCount: rootOverrides.length + functionsOverrides.length,
                unknownDisplayed: 0,
            },
            groups,
            overrides: [
                { sourcePackage: "root", count: rootOverrides.length, names: rootOverrides },
                { sourcePackage: "functions", count: functionsOverrides.length, names: functionsOverrides },
            ],
            notDirectDependencies,
            freshnessState: "fresh",
            rootPackageUpdatedAtUtc,
            functionsPackageUpdatedAtUtc,
        };
    } catch (e) {
        console.error("Failed to read package.json for infrastructure dependencies", e);
    }
    return { error: "Failed to read infrastructure dependencies", timestamp: Date.now() };
}

export async function GET(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "admin/debug:GET",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        await guardApiRequest(request, {
            routeName: "admin/debug",
            preAuthRouteName: "admin/debug/preauth",
            preAuthRateLimit: HEAVY_READ,
            rateLimit: ADMIN,
            auth: "admin",
            scopeToCaller: true,
        });

        const nowMs = Date.now();
        const weekAgoMs = nowMs - ONE_WEEK_MS;
        const weekAgoDayKey = getCSTDateKey(weekAgoMs);

        const [
            usersSnapshot,
            taskEventsSnapshot,
            receiptsSnapshot,
            eventStatsSnapshot,
            transactionsSnapshot,
            taskRollupSnapshot,
            taskDailySnapshot,
            customTaskDefinitionsSnapshot,
            serverDiagnosticsSnapshot,
            pipelineHealthSnapshot,
            guestBatchesSnapshot,
            securityEventsSnapshot,
            watchSessionsSnapshot,
            watchAssetsSnapshot,
            analyticsExportStatusSnapshot,
            commerceSummarySnapshot,
            feedbackSnapshot,
            orchestrationEventsSnapshot,
            orchestrationFindingsSnapshot,
            orchestrationRepairProposalsSnapshot,
            orchestrationActorSummariesSnapshot,
            orchestrationRepairActionsSnapshot,
            creatorOnboardingSnapshot,
            creatorReviewQueueSnapshot,
            creatorOnboardingHistorySnapshot,
            creatorSubscriptionsSnapshot,
            creatorRequestsSnapshot,
            creatorBookingsSnapshot,
            creatorMessageThreadsSnapshot,
            creatorMessagesSnapshot,
        ] = await Promise.all([
            adminDb.collection("users").get(),
            adminDb.collection("daily_task_events")
                .where("timestamp", ">=", weekAgoMs)
                .orderBy("timestamp", "desc")
                .limit(TASK_AUDIT_SAMPLE_LIMIT)
                .get(),
            adminDb.collection("daily_task_event_receipts")
                .where("timestamp", ">=", weekAgoMs)
                .orderBy("timestamp", "desc")
                .limit(TASK_AUDIT_SAMPLE_LIMIT)
                .get(),
            adminDb.collection("analytics_event_stats").get(),
            adminDb.collection("transactions").orderBy("timestamp", "desc").limit(600).get(),
            adminDb.collection("analytics_task_rollup").get(),
            adminDb.collection("analytics_task_daily").orderBy("lastEventAt", "desc").limit(TASK_DAILY_SERIES_LIMIT).get(),
            adminDb.collection("daily_task_definitions").get(),
            adminDb.collection("server_diagnostics")
                .where("createdAtMs", ">=", weekAgoMs)
                .orderBy("createdAtMs", "desc")
                .limit(120)
                .get(),
            adminDb.collection("analytics_pipeline_daily")
                .where("dayKey", ">=", weekAgoDayKey)
                .get(),
            adminDb.collection("analytics_guest_batches")
                .where("receivedAtMs", ">=", weekAgoMs)
                .orderBy("receivedAtMs", "desc")
                .limit(80)
                .get(),
            adminDb.collection("security_events")
                .where("timestamp", ">=", weekAgoMs)
                .orderBy("timestamp", "desc")
                .limit(80)
                .get(),
            adminDb.collection("analytics_watch_sessions")
                .where("lastSeenAtMs", ">=", weekAgoMs)
                .orderBy("lastSeenAtMs", "desc")
                .limit(120)
                .get(),
            adminDb.collection("analytics_watch_assets")
                .where("lastSeenAtMs", ">=", weekAgoMs)
                .orderBy("lastSeenAtMs", "desc")
                .limit(200)
                .get(),
            adminDb.collection(ANALYTICS_OPERATIONAL_COLLECTIONS.exportStatus).get(),
            adminDb.collection("analytics_commerce_rollup").doc("summary").get(),
            adminDb.collection("platform_feedback").orderBy("timestamp", "desc").limit(160).get(),
            adminDb.collection(ORCHESTRATION_COLLECTIONS.events).orderBy("observedAtMs", "desc").limit(120).get(),
            adminDb.collection(ORCHESTRATION_COLLECTIONS.findings).orderBy("updatedAtMs", "desc").limit(80).get(),
            adminDb.collection(ORCHESTRATION_COLLECTIONS.repairProposals).orderBy("updatedAtMs", "desc").limit(80).get(),
            adminDb.collection(ORCHESTRATION_COLLECTIONS.actorSummaries).orderBy("lastSeenAtMs", "desc").limit(60).get(),
            adminDb.collection(ORCHESTRATION_COLLECTIONS.repairActions).orderBy("createdAtMs", "desc").limit(60).get(),
            adminDb.collection(CREATOR_ONBOARDING_COLLECTION).get(),
            adminDb.collection(CREATOR_REVIEW_QUEUE_COLLECTION).get(),
            adminDb.collectionGroup(CREATOR_ONBOARDING_HISTORY_SUBCOLLECTION).limit(2_000).get(),
            adminDb.collection(CREATOR_COLLECTIONS.subscriptions).limit(1_000).get(),
            adminDb.collection(CREATOR_COLLECTIONS.requests).limit(1_000).get(),
            adminDb.collection(CREATOR_COLLECTIONS.bookings).limit(1_000).get(),
            adminDb.collection(CREATOR_COLLECTIONS.messageThreads).limit(1_000).get(),
            adminDb.collection(CREATOR_COLLECTIONS.messages).limit(1_000).get(),
        ]);

        const [routeRuntimeHealth, runtimeWarnings, queueJobHeartbeats, notificationDispatchOutcomes, behavioralSnapshotStatus, behavioralDrops, analyticsTruthRecovery, analyticsTruthDrops, analyticsTruthUsers, analyticsTruthRepairs, adminMetricSnapshots] = await Promise.all([
            listRouteRuntimeHealth(),
            listRuntimeWarnings(80),
            listQueueJobHeartbeats(),
            listNotificationDispatchOutcomes(80),
            getBehavioralSnapshotStatus(),
            listDropIntelligence(12),
            getAnalyticsTruthRecoverySummary(),
            listAnalyticsTruthDrops(12),
            listAnalyticsTruthUsers(12),
            listAnalyticsTruthRepairs(20),
            listAdminMetricSnapshotDebugMetadata({ limit: 120 }),
        ]);
        const analyticsTruthDropIds = Array.from(new Set(
            (analyticsTruthDrops as Array<Record<string, unknown>>)
                .map((entry) => toOptionalString(entry.dropId))
                .filter((value): value is string => Boolean(value)),
        ));
        const analyticsTruthDropRefs = analyticsTruthDropIds.map((dropId) => adminDb.collection("drops").doc(dropId));
        const analyticsTruthDropSnapshots = analyticsTruthDropRefs.length > 0 ? await adminDb.getAll(...analyticsTruthDropRefs) : [];
        const analyticsTruthDropLookup = new Map<string, { title: string; creatorId?: string; creatorName?: string }>();
        const analyticsTruthCreatorIds = new Set<string>();
        analyticsTruthDropSnapshots.forEach((snapshot) => {
            if (!snapshot.exists) return;
            const raw = snapshot.data() as Record<string, unknown>;
            const creatorId = toOptionalString(raw.creatorId) || toOptionalString(raw.submittedByCreatorId) || undefined;
            if (creatorId) analyticsTruthCreatorIds.add(creatorId);
            analyticsTruthDropLookup.set(snapshot.id, {
                title: toOptionalString(raw.title) || toOptionalString(raw.dropTitle) || `Drop ${shortenDebugId(snapshot.id)}`,
                creatorId,
            });
        });
        const analyticsTruthCreatorRefs = Array.from(analyticsTruthCreatorIds).map((creatorId) => adminDb.collection("users").doc(creatorId));
        const analyticsTruthCreatorSnapshots = analyticsTruthCreatorRefs.length > 0 ? await adminDb.getAll(...analyticsTruthCreatorRefs) : [];
        const analyticsTruthCreatorLookup = new Map<string, string>();
        analyticsTruthCreatorSnapshots.forEach((snapshot) => {
            if (!snapshot.exists) return;
            const raw = snapshot.data() as Record<string, unknown>;
            const username = toOptionalString(raw.username);
            const displayName = toOptionalString(raw.displayName);
            analyticsTruthCreatorLookup.set(snapshot.id, username ? `@${username}` : displayName || shortenDebugId(snapshot.id));
        });
        analyticsTruthDropLookup.forEach((value, key) => {
            if (value.creatorId) {
                analyticsTruthDropLookup.set(key, {
                    ...value,
                    creatorName: analyticsTruthCreatorLookup.get(value.creatorId),
                });
            }
        });
        const analyticsTruthUserIds = Array.from(new Set(
            (analyticsTruthUsers as Array<Record<string, unknown>>)
                .map((entry) => toOptionalString(entry.userId))
                .filter((value): value is string => Boolean(value)),
        ));
        const analyticsTruthUserIdentityLookup = await buildAdminOverviewUserIdentityMap({
            usersCollection: adminDb.collection("users"),
            userIds: analyticsTruthUserIds,
        });
        const behavioralIntelligencePanel = buildBehavioralIntelligencePanelState({
            nowMs,
            behavioralSnapshotStatus: behavioralSnapshotStatus as Record<string, unknown> | null,
            behavioralDrops: behavioralDrops as Array<Record<string, unknown>>,
        });
        const telemetryTruthRecoveryPanel = buildTelemetryTruthRecoveryState({
            nowMs,
            analyticsTruthRecovery: analyticsTruthRecovery as Record<string, unknown> | null,
            analyticsTruthDrops: analyticsTruthDrops as Array<Record<string, unknown>>,
            analyticsTruthUsers: analyticsTruthUsers as Array<Record<string, unknown>>,
            analyticsTruthRepairs: analyticsTruthRepairs as Array<Record<string, unknown>>,
            dropLookup: analyticsTruthDropLookup,
            userIdentityLookup: analyticsTruthUserIdentityLookup,
        });
                const routeRuntimeHealthSummary = summarizeRouteRuntimeHealth(routeRuntimeHealth);
        const queueJobHeartbeatSummary = queueJobHeartbeats.reduce((summary, entry) => {
            const lastTouch = Math.max(
                toNumber(entry.completedAt),
                toNumber(entry.startedAt),
                toNumber(entry.updatedAt),
            );
            const stale = lastTouch <= 0 || (toNumber(entry.staleAfterMs) > 0 && nowMs - lastTouch > toNumber(entry.staleAfterMs));
            return {
                total: summary.total + 1,
                stale: summary.stale + (stale ? 1 : 0),
                failed: summary.failed + (entry.status === "failed" ? 1 : 0),
                running: summary.running + (entry.status === "running" ? 1 : 0),
            };
        }, {
            total: 0,
            stale: 0,
            failed: 0,
            running: 0,
        });
        const runtimeWarningSummary = runtimeWarnings.reduce<{
            total: number;
            failed: number;
            degraded: number;
            fallback: number;
            legacyAdapterUses: number;
            queueDriftWarnings: number;
        }>((summary, entry) => {
            const code = toStringValue(entry.code);
            return {
                total: summary.total + 1,
                failed: summary.failed + (toStringValue(entry.status) === "failed" ? 1 : 0),
                degraded: summary.degraded + (toStringValue(entry.status) === "degraded" ? 1 : 0),
                fallback: summary.fallback + (toStringValue(entry.status) === "fallback" ? 1 : 0),
                legacyAdapterUses: summary.legacyAdapterUses + (code === QUEUE_RUNTIME_WARNING_CODES.legacyAdapterInvoked ? 1 : 0),
                queueDriftWarnings: summary.queueDriftWarnings + (code === QUEUE_RUNTIME_WARNING_CODES.queueMembershipDrift ? 1 : 0),
            };
        }, {
            total: 0,
            failed: 0,
            degraded: 0,
            fallback: 0,
            legacyAdapterUses: 0,
            queueDriftWarnings: 0,
        });
        const queueRuntimeOutcomeRows = await buildQueueRuntimeOutcomeRows({
            outcomes: notificationDispatchOutcomes as Array<Record<string, unknown>>,
        });
        const queueRuntimeWarningReasons = [
            queueJobHeartbeatSummary.total === 0 && queueRuntimeOutcomeRows.length > 0 ? "heartbeat missing" : null,
            runtimeWarningSummary.legacyAdapterUses > 0 ? "legacy adapter use" : null,
            runtimeWarnings.some((entry) => toStringValue(entry.code) === QUEUE_RUNTIME_WARNING_CODES.activationMissingOutcome) ? "recipient outcome missing" : null,
            runtimeWarnings.some((entry) => toStringValue(entry.code) === QUEUE_RUNTIME_WARNING_CODES.notificationDispatchFailed) ? "dispatch mismatch" : null,
            queueRuntimeOutcomeRows.some((entry) => entry.dropIdentityState !== "resolved") ? "drop metadata missing" : null,
            queueJobHeartbeatSummary.stale > 0 ? "stale heartbeat" : null,
        ].filter(Boolean);
        const queueRuntimeSummary = {
            jobHeartbeats: queueJobHeartbeatSummary,
            warnings: runtimeWarningSummary,
            missingNotificationOutcomes: runtimeWarnings.filter((entry) => toStringValue(entry.code) === QUEUE_RUNTIME_WARNING_CODES.activationMissingOutcome).length,
            recentOutcomes: queueRuntimeOutcomeRows.length,
            warningReasons: queueRuntimeWarningReasons,
            heartbeatState: queueJobHeartbeatSummary.total === 0 && queueRuntimeOutcomeRows.length > 0 ? "missing_heartbeat" : queueJobHeartbeatSummary.failed > 0 ? "failed" : queueJobHeartbeatSummary.stale > 0 ? "stale" : "live",
            outcomesState: queueRuntimeOutcomeRows.some((entry) => entry.outcome === "failed") ? "failed" : queueRuntimeOutcomeRows.length > 0 ? "live" : "unknown",
            heartbeatOutcomeExplanation: queueJobHeartbeatSummary.total === 0 && queueRuntimeOutcomeRows.length > 0 ? "No heartbeat records, but dispatch outcome records exist." : null,
        };
        const opsHealth = buildAdminOpsHealth({
            nowMs,
            diagnosticsDocs: serverDiagnosticsSnapshot.docs,
            pipelineDocs: pipelineHealthSnapshot.docs,
            eventStatsDocs: eventStatsSnapshot.docs,
            taskRollupDocs: taskRollupSnapshot.docs,
            guestBatchDocs: guestBatchesSnapshot.docs,
            securityEventDocs: securityEventsSnapshot.docs,
            watchSessionDocs: watchSessionsSnapshot.docs,
            watchAssetDocs: watchAssetsSnapshot.docs,
            exportStatusDocs: analyticsExportStatusSnapshot.docs,
            commerceSummaryDoc: commerceSummarySnapshot,
        });
        const creatorOnboardingDiagnostics = buildCreatorOnboardingDiagnostics({
            users: usersSnapshot.docs.map((doc) => ({
                uid: doc.id,
                raw: doc.data() as Record<string, unknown>,
            })),
            onboardingRecords: creatorOnboardingSnapshot.docs.map((doc) => doc.data() as Record<string, unknown>),
            queueRecords: creatorReviewQueueSnapshot.docs.map((doc) => doc.data() as Record<string, unknown>),
            historyRecords: creatorOnboardingHistorySnapshot.docs.map((doc) => {
                const raw = doc.data() as Record<string, unknown>;
                const userId = doc.ref.parent.parent?.id
                    || toStringValue(raw.targetUserId)
                    || toStringValue(raw.targetCreatorId);
                return { userId, raw };
            }),
            creatorExperienceRecords: [
                ...creatorSubscriptionsSnapshot.docs.map((doc) => {
                    const raw = doc.data() as Record<string, unknown>;
                    return { creatorId: toStringValue(raw.creatorId), userId: toStringValue(raw.userId), raw };
                }),
                ...creatorRequestsSnapshot.docs.map((doc) => {
                    const raw = doc.data() as Record<string, unknown>;
                    return { creatorId: toStringValue(raw.creatorId), userId: toStringValue(raw.userId), raw };
                }),
                ...creatorBookingsSnapshot.docs.map((doc) => {
                    const raw = doc.data() as Record<string, unknown>;
                    return { creatorId: toStringValue(raw.creatorId), userId: toStringValue(raw.userId), raw };
                }),
                ...creatorMessageThreadsSnapshot.docs.map((doc) => {
                    const raw = doc.data() as Record<string, unknown>;
                    return { creatorId: toStringValue(raw.creatorId), userId: toStringValue(raw.userId), raw };
                }),
                ...creatorMessagesSnapshot.docs.map((doc) => {
                    const raw = doc.data() as Record<string, unknown>;
                    return { creatorId: toStringValue(raw.creatorId), userId: toStringValue(raw.userId), raw };
                }),
            ],
        });

        const taskInventory = buildDailyTaskInventory();
        const taskInventorySummary = summarizeDailyTaskInventory(taskInventory);

        const taskEventsForAttribution = taskEventsSnapshot.docs.map((doc) => {
            const data = doc.data() as Record<string, unknown>;
            return {
                userId: toStringValue(data.userId),
                timestamp: toNumber(data.timestamp),
            };
        });
        const materializedTaskRollupAt = taskRollupSnapshot.docs.reduce((latest, doc) => {
            const data = doc.data() as Record<string, unknown>;
            return Math.max(latest, toNumber(data.lastEventAt) || toNumber(data.updatedAt) || toTimestampNumber(data.updatedAt));
        }, 0) || null;
        const currentDailyTaskWindow = getDailyTaskWindow(nowMs);

        const assignmentIssues = usersSnapshot.docs.flatMap((doc) => {
            const data = doc.data() as Record<string, unknown>;
            const username = toStringValue(data.username) || toStringValue(data.displayName) || doc.id;
            const dailyTasksState = data.dailyTasksState as Record<string, unknown> | undefined;
            const tasks = normalizeTaskIds(dailyTasksState?.tasks);
            const currentWindowTasks = tasks.filter((task) => task.dailyTaskWindowId === currentDailyTaskWindow.dailyTaskWindowId
                || (task.assignedAt >= currentDailyTaskWindow.windowStartMs && task.assignedAt < currentDailyTaskWindow.windowEndMs));
            const refreshMetadataIssue = tasks.length > 0
                ? getDailyTaskRefreshMetadataIssue(dailyTasksState, nowMs)
                : null;
            const issues: string[] = [];
            const ids = tasks.map((task) => task.id);
            const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);

            if (toStringValue(dailyTasksState?.dailyTaskWindowId) !== currentDailyTaskWindow.dailyTaskWindowId
                && !(toNumber(dailyTasksState?.lastResetMs) >= currentDailyTaskWindow.windowStartMs && toNumber(dailyTasksState?.lastResetMs) < currentDailyTaskWindow.windowEndMs)) {
                issues.push(`Current daily task window missing: ${currentDailyTaskWindow.dailyTaskWindowId}`);
            }
            if (tasks.length !== DAILY_TASK_LIMIT || currentWindowTasks.length !== DAILY_TASK_LIMIT) {
                issues.push(`Expected ${DAILY_TASK_LIMIT} current-window tasks, found ${currentWindowTasks.length}`);
            }
            if (duplicateIds.length > 0) {
                issues.push(`Duplicate tasks: ${Array.from(new Set(duplicateIds)).join(", ")}`);
            }
            if (tasks.some((task) => task.progress > task.maxProgress)) {
                issues.push("Progress exceeded maxProgress");
            }
            if (tasks.some((task) => task.claimed && !task.claimedAt)) {
                issues.push("Claimed task missing claimedAt");
            }
            if (tasks.some((task) => task.progress > 0 && !task.assignedAt)) {
                issues.push("Progressed task missing assignedAt");
            }
            if (refreshMetadataIssue) {
                issues.push(`Invalid refresh metadata for assigned tasks: ${refreshMetadataIssue}`);
            }

            if (issues.length === 0) {
                return [];
            }

            const attribution = buildTaskIssueAttribution({
                userId: doc.id,
                displayName: username,
                userData: data,
                tasks: currentWindowTasks,
                taskEvents: taskEventsForAttribution,
                materializedAt: materializedTaskRollupAt,
                sampleWindowMs: ONE_WEEK_MS,
            });

            return [{
                uid: doc.id,
                username,
                issueCount: issues.length,
                issues,
                taskIds: ids,
                attribution,
            }];
        }).slice(0, 50);

        const recentTaskEvents = taskEventsSnapshot.docs.map((doc) => {
            const data = doc.data() as Record<string, unknown>;
            return {
                id: doc.id,
                type: toStringValue(data.type),
                taskId: toStringValue(data.taskId),
                title: toStringValue(data.title),
                triggerEvent: toStringValue(data.triggerEvent),
                userId: toStringValue(data.userId),
                username: toStringValue(data.username) || toStringValue(data.userId),
                reward: toNumber(data.reward),
                potentialRewardGd: toNumber(data.potentialRewardGd),
                creditedRewardGd: toNumber(data.creditedRewardGd),
                forfeitedPotentialRewardGd: toNumber(data.forfeitedPotentialRewardGd),
                expiredPotentialRewardGd: toNumber(data.expiredPotentialRewardGd),
                reminderPotentialRewardGd: toNumber(data.reminderPotentialRewardGd),
                progress: toNumber(data.progress),
                maxProgress: toNumber(data.maxProgress),
                timestamp: toNumber(data.timestamp),
                durationMs: toNumber(data.durationMs),
                reason: toStringValue(data.reason),
                reasonCode: toStringValue(data.reasonCode) || toStringValue(data.reason),
                dailyTaskWindowId: toStringValue(data.dailyTaskWindowId),
                source: toStringValue(data.source) || "unknown",
                assignedAt: toNumber(data.assignedAt),
                assignedAtUtc: toStringValue(data.assignedAtUtc),
                updatedAtUtc: toStringValue(data.updatedAtUtc) || toUtcString(data.timestamp),
                expiresAtUtc: toStringValue(data.expiresAtUtc),
                rewardCreditIdempotencyKey: toStringValue(data.rewardCreditIdempotencyKey),
                rewardEventState: toStringValue(data.rewardEventState),
                rewardAuditFlag: toStringValue(data.rewardAuditFlag),
            };
        });

        const rawRecentReceipts = receiptsSnapshot.docs.map((doc) => {
            const data = doc.data() as Record<string, unknown>;
            return {
                id: doc.id,
                eventName: toStringValue(data.eventName),
                receiptKey: toStringValue(data.receiptKey),
                uid: toStringValue(data.uid),
                timestamp: toNumber(data.timestamp),
                source: toStringValue(data.source) || "canonical",
                params: (data.params && typeof data.params === "object" ? data.params : {}) as Record<string, unknown>,
            };
        });

        const receiptUserIdentityMap = usersSnapshot.docs.reduce((map, doc) => {
            const data = doc.data() as Record<string, unknown>;
            map.set(doc.id, buildUserIdentityFromSnapshot(doc.id, data));
            return map;
        }, new Map<string, AdminOverviewUserIdentity>());

        const receiptDropIds = Array.from(new Set(rawRecentReceipts.flatMap((receipt) => {
            const dropId = toOptionalString(receipt.params.drop_id)
                || (buildTelemetryEventMetadata(receipt.eventName).canonicalEventName === "unlock_drop_success"
                    ? toOptionalString(receipt.receiptKey.split("|")[0])
                    : undefined);
            return dropId ? [dropId] : [];
        })));
        const receiptDropRefs = receiptDropIds.map((dropId) => adminDb.collection("drops").doc(dropId));
        const receiptDropSnapshots = receiptDropRefs.length > 0 ? await adminDb.getAll(...receiptDropRefs) : [];
        const receiptDropMap = receiptDropSnapshots.reduce((map, snapshot) => {
            if (snapshot.exists) {
                const raw = snapshot.data() as Record<string, unknown>;
                map.set(snapshot.id, {
                    title: toOptionalString(raw.title) || toOptionalString(raw.dropTitle) || `Drop ${shortenDebugId(snapshot.id)}`,
                });
            }
            return map;
        }, new Map<string, { title: string }>());

        const recentReceipts: ReceiptSampleView[] = rawRecentReceipts.map((receipt) => {
            const metadata = buildTelemetryEventMetadata(receipt.eventName);
            const canonicalEventName = metadata.canonicalEventName;
            const aliasCount = canonicalEventName !== receipt.eventName ? 2 : 1;
            const identity = receipt.uid
                ? receiptUserIdentityMap.get(receipt.uid) || buildAdminOverviewFallbackIdentity(receipt.uid)
                : {
                    userId: "",
                    userDisplayName: "Unknown user",
                    shortUserId: "unknown",
                    userIdentityState: "missing" as const,
                };
            const sourceTruth = normalizeSourceTruth(receipt.params.sourceTruth ?? receipt.source);
            const sourceState = normalizeSourceState(sourceTruth);
            const dropId = toOptionalString(receipt.params.drop_id)
                || (canonicalEventName === "unlock_drop_success" ? toOptionalString(receipt.receiptKey.split("|")[0]) : undefined);
            const drop = dropId ? receiptDropMap.get(dropId) : undefined;
            const shortDropId = dropId ? shortenDebugId(dropId) : undefined;
            const dropIdentityState = dropId
                ? (drop ? "resolved" as const : "fallback_id" as const)
                : undefined;
            const dateKey = parseReceiptDateKey(receipt.receiptKey, receipt.timestamp);
            const orderId = toOptionalString(receipt.params.order_id) || toOptionalString(receipt.params.transaction_id) || toOptionalString(receipt.receiptKey);
            const purchaseValue = Number(receipt.params.purchase_value);
            const deliveredGumDrops = Number(receipt.params.package_drops);
            const browserPushEnabled = receipt.params.browser_push_enabled === true;
            const profileSource = toOptionalString(receipt.params.source);

            let displayLabel = TELEMETRY_EVENT_LABELS[canonicalEventName] || canonicalEventName;
            let dedupeKeyLabel = receipt.receiptKey ? shortenDebugId(receipt.receiptKey) : canonicalEventName;
            let amountDisplay: string | undefined;
            let sourceDetail: string | undefined;

            if (canonicalEventName === "daily_checkin_claimed") {
                displayLabel = "Daily check-in claimed";
                dedupeKeyLabel = receipt.receiptKey.includes("|")
                    ? `Daily check-in · ${dateKey} · legacy key`
                    : `Daily check-in · ${dateKey}`;
            } else if (canonicalEventName === "unlock_drop_success") {
                displayLabel = drop?.title ? `Unlocked ${drop.title}` : `Unlocked unknown drop`;
                dedupeKeyLabel = `Unlock · ${drop?.title || shortDropId || "unknown drop"}`;
                const priceGd = Number(receipt.params.price_gd || receipt.params.unlock_cost);
                if (Number.isFinite(priceGd) && priceGd > 0) {
                    amountDisplay = `${priceGd} GD`;
                }
            } else if (canonicalEventName === "gumdrops_purchase_completed" || canonicalEventName === "purchase") {
                displayLabel = "GumDrops purchased";
                dedupeKeyLabel = `Purchase receipt · ${orderId ? shortenDebugId(orderId) : "unknown id"}`;
                const amountParts: string[] = [];
                if (Number.isFinite(purchaseValue) && purchaseValue > 0) {
                    amountParts.push(`$${purchaseValue.toFixed(2)}`);
                }
                if (Number.isFinite(deliveredGumDrops) && deliveredGumDrops > 0) {
                    amountParts.push(`+${deliveredGumDrops} GD`);
                }
                const bundleKey = toOptionalString(receipt.params.bundle_key);
                if (bundleKey) {
                    amountParts.push(bundleKey);
                }
                amountDisplay = amountParts.length > 0 ? amountParts.join(" · ") : "amount unavailable";
            } else if (canonicalEventName === "task_notifications_enabled") {
                displayLabel = "Task notifications enabled";
                dedupeKeyLabel = `Push notification preference · ${profileSource === "profile_api" ? "profile API" : "browser push"}`;
                sourceDetail = browserPushEnabled ? "browser push" : undefined;
            }

            if (canonicalEventName === "task_notifications_enabled" && profileSource === "profile_api") {
                sourceDetail = sourceDetail ? `${sourceDetail} · profile API` : "profile API";
            }

            return {
                receiptId: receipt.id,
                rawEventName: receipt.eventName,
                normalizedAction: canonicalEventName,
                displayLabel,
                aliasCount,
                actorUserId: receipt.uid || undefined,
                actorDisplayName: receipt.uid ? identity.userDisplayName : "Unknown user",
                shortUserId: receipt.uid ? identity.shortUserId : "unknown",
                userIdentityState: receipt.uid ? identity.userIdentityState : "missing",
                adminUserHref: receipt.uid ? `/admin/user/${encodeURIComponent(receipt.uid)}` : undefined,
                targetDropId: dropId,
                targetDropTitle: drop?.title,
                shortDropId,
                dropIdentityState,
                amountDisplay,
                sourceDetail,
                dedupeKey: receipt.receiptKey,
                dedupeKeyLabel,
                sourceTruth,
                sourceState,
                createdAtUtc: toUtcString(receipt.timestamp) || new Date(0).toISOString(),
                ageLabel: buildReceiptAgeLabel(nowMs, receipt.timestamp),
                rawDetailsCollapsed: true,
            };
        });

        const customTaskDefinitionIssues: Array<{
            kind: "definition";
            taskId: string;
            title: string;
            eventName: string;
            userId: string;
            detail: string;
        }> = [];
        const customTaskDefinitions = customTaskDefinitionsSnapshot.docs.flatMap((doc) => {
            const rawValue = doc.data() as Record<string, unknown>;
            const normalized = normalizeCustomTaskDefinition(doc.id, rawValue);
            if (!normalized.definition) {
                customTaskDefinitionIssues.push({
                    kind: "definition",
                    taskId: doc.id,
                    title: toStringValue(rawValue.title) || doc.id,
                    eventName: toStringValue(rawValue.eventName),
                    userId: "",
                    detail: `custom task definition could not be normalized: ${normalized.issues.join(", ")}`,
                });
                return [];
            }

            return [normalized.definition];
        });
        const allTaskDefinitions = [...BUILT_IN_DAILY_TASKS, ...customTaskDefinitions];
        const taskDefinitionsById = new Map(allTaskDefinitions.map((definition) => [definition.id, definition]));
        const taskIdsByTitle = allTaskDefinitions.reduce<Map<string, string[]>>((map, definition) => {
            const titleKey = definition.title.trim().toLowerCase();
            if (!titleKey) {
                return map;
            }

            const existing = map.get(titleKey) ?? [];
            existing.push(definition.id);
            map.set(titleKey, existing);
            return map;
        }, new Map<string, string[]>());
        const eventNamesToTaskIds = allTaskDefinitions.reduce<Map<string, string[]>>((map, definition) => {
            const existing = map.get(definition.eventName) ?? [];
            existing.push(definition.id);
            map.set(definition.eventName, existing);
            return map;
        }, new Map<string, string[]>());

        const runtimeUserStates = usersSnapshot.docs.map((doc) => {
            const data = doc.data() as Record<string, unknown>;
            const username = toStringValue(data.username) || toStringValue(data.displayName) || doc.id;
            const dailyTasksState = data.dailyTasksState as Record<string, unknown> | undefined;
            const tasks = normalizeTaskIds(dailyTasksState?.tasks);
            const refreshMetadataIssue = tasks.length > 0
                ? getDailyTaskRefreshMetadataIssue(dailyTasksState, nowMs)
                : null;
            return {
                uid: doc.id,
                username,
                tasks,
                completedTaskHistory: normalizeHistory(dailyTasksState?.completedTaskHistory),
                retiredTaskIds: normalizeStringArray(dailyTasksState?.retiredTaskIds),
                hasInvalidRefreshMetadata: refreshMetadataIssue !== null,
                refreshMetadataIssue: refreshMetadataIssue ?? undefined,
            };
        });
        const runtimeUserIdentityMap = runtimeUserStates.reduce((map, entry) => {
            map.set(entry.uid, entry.username);
            return map;
        }, new Map<string, string>());

        const transactionEntries = transactionsSnapshot.docs.map((doc) => {
            const data = doc.data() as Record<string, unknown>;
            const timestampMs = toNumber(data.timestampMs) || toTimestampNumber(data.timestamp);

            return {
                id: doc.id,
                ...data,
                timestampMs,
            };
        }) as Array<Record<string, unknown> & { id: string; timestampMs: number }>;

        const rewardTransactions7d = transactionEntries
            .filter((entry) => isDailyTaskRewardTransaction(entry, weekAgoMs));
        const completedEvents7d = recentTaskEvents.filter((event) => event.type === "completed" && event.timestamp >= weekAgoMs);
        const receiptEvents7d = recentReceipts.filter((entry) => Date.parse(entry.createdAtUtc) >= weekAgoMs);
        const rewardClaimNormalizationIssues: Array<{
            kind: "reward_claim";
            taskId: string;
            title: string;
            eventName: string;
            userId: string;
            detail: string;
            timestamp?: number;
        }> = [];
        const rewardClaims7d = rewardTransactions7d.flatMap((entry) => {
            const description = toStringValue(entry.description);
            const taskTitle = description.startsWith("Daily Task: ") ? description.replace("Daily Task: ", "") : description;
            const titleKey = taskTitle.trim().toLowerCase();
            const matchedTaskIds = titleKey ? (taskIdsByTitle.get(titleKey) ?? []) : [];

            if (matchedTaskIds.length === 1) {
                return [{
                    taskId: matchedTaskIds[0],
                    title: taskTitle || matchedTaskIds[0],
                    timestamp: toNumber(entry.timestampMs),
                    reward: Math.abs(toNumber(entry.amount)),
                }];
            }

            rewardClaimNormalizationIssues.push({
                kind: "reward_claim",
                taskId: matchedTaskIds[0] ?? "",
                title: taskTitle || "unknown",
                eventName: "",
                userId: toStringValue(entry.userId),
                detail: matchedTaskIds.length > 1
                    ? "daily reward transaction title matched multiple task definitions"
                    : "daily reward transaction could not be matched to a task definition",
                timestamp: toNumber(entry.timestampMs),
            });
            return [];
        });

        const runtimeTaskAudit = buildDailyTaskRuntimeAudit({
            definitions: allTaskDefinitions,
            userStates: runtimeUserStates,
            taskEvents: recentTaskEvents,
            receipts: rawRecentReceipts,
            rewardClaims: rewardClaims7d,
            eventStats: eventStatsSnapshot.docs.map((doc) => {
                const data = doc.data() as Record<string, unknown>;
                return {
                    eventName: doc.id,
                    totalCount: toNumber(data.totalCount),
                    lastSeenAt: toNumber(data.lastSeenAt),
                };
            }),
            taskRollups: taskRollupSnapshot.docs.map((doc) => {
                const data = doc.data() as Record<string, unknown>;
                return {
                    taskId: doc.id,
                    title: toStringValue(data.title) || doc.id,
                    eventCount: toNumber(data.eventCount),
                    rewardTotal: toNumber(data.paidRewardTotalGd) || toNumber(data.rewardTotal),
                    paidRewardTotalGd: toNumber(data.paidRewardTotalGd) || toNumber(data.rewardTotal),
                    potentialRewardTotalGd: toNumber(data.potentialRewardTotalGd),
                    forfeitedPotentialRewardGd: toNumber(data.forfeitedPotentialRewardGd),
                    outOfBoundsEventCount: toNumber(data.outOfBoundsEventCount),
                    completed: toNumber((data.types as Record<string, unknown> | undefined)?.completed),
                    started: toNumber((data.types as Record<string, unknown> | undefined)?.started),
                    failed: toNumber((data.types as Record<string, unknown> | undefined)?.failed),
                    assigned: toNumber((data.types as Record<string, unknown> | undefined)?.assigned),
                    reminders: toNumber((data.types as Record<string, unknown> | undefined)?.reminder_sent),
                    lastEventAt: toNumber(data.lastEventAt),
                };
            }),
        });
        runtimeTaskAudit.unsupportedRuntimeRecords.push(...customTaskDefinitionIssues, ...rewardClaimNormalizationIssues);
        runtimeTaskAudit.summary.unsupportedRuntimeRecords = runtimeTaskAudit.unsupportedRuntimeRecords.length;
        const coverage = buildTaskCatalogCoverage(BUILT_IN_DAILY_TASKS, runtimeTaskAudit);
        const taskCoverageSummary = summarizeTaskCatalogCoverage(coverage);
        const unsupportedTasks = coverage.filter((task) => task.coverageState === "unsupported");
        const canonicalTasks = coverage.filter((task) => task.sourceType === "canonical");
        const telemetryOnlyTasks = coverage.filter((task) => task.sourceType === "telemetry");
        const legacyTasks = coverage.filter((task) => task.sourceType === "legacy");

        const taskRollupParityByTaskId = taskRollupSnapshot.docs.reduce((map, doc) => {
            const data = doc.data() as Record<string, unknown>;
            map.set(doc.id, {
                paidRewardTotalGd: toNumber(data.paidRewardTotalGd) || toNumber(data.rewardTotal),
                potentialRewardTotalGd: toNumber(data.potentialRewardTotalGd),
            });
            return map;
        }, new Map<string, { paidRewardTotalGd: number; potentialRewardTotalGd: number }>());

        const rewardParityByTask = new Map<string, {
            taskId: string;
            taskTitle: string;
            definitionOrigin: "built_in" | "custom" | "unknown";
            completedCount: number;
            rewardedCount: number;
            taskRewardReceiptCount: number;
            relatedActionReceiptCount: number;
            purchaseReceiptCount: number;
            paidRewardTotalGd: number;
            potentialRewardTotalGd: number;
            expectedReceiptPolicy: TaskReceiptPolicy;
            receiptParityState: TaskReceiptParityState;
            explanation: string;
            relatedActionReceiptLabel?: string;
        }>();

        completedEvents7d.forEach((event) => {
            const matchedDefinition = taskDefinitionsById.get(event.taskId);
            const current = rewardParityByTask.get(event.taskId) || {
                taskId: event.taskId,
                taskTitle: matchedDefinition?.title || event.title,
                definitionOrigin: matchedDefinition?.source === "built_in" ? "built_in" : matchedDefinition ? "custom" : "unknown",
                completedCount: 0,
                rewardedCount: 0,
                taskRewardReceiptCount: 0,
                relatedActionReceiptCount: 0,
                purchaseReceiptCount: 0,
                paidRewardTotalGd: taskRollupParityByTaskId.get(event.taskId)?.paidRewardTotalGd || 0,
                potentialRewardTotalGd: taskRollupParityByTaskId.get(event.taskId)?.potentialRewardTotalGd || 0,
                expectedReceiptPolicy: matchedDefinition ? getExpectedTaskReceiptPolicy(matchedDefinition) : "unknown",
                receiptParityState: "live" as TaskReceiptParityState,
                explanation: "",
            };
            current.completedCount += 1;
            if ((event.creditedRewardGd || 0) > 0) {
                current.rewardedCount += 1;
            }
            if (!taskRollupParityByTaskId.has(event.taskId)) {
                current.paidRewardTotalGd += event.creditedRewardGd || 0;
                current.potentialRewardTotalGd += event.potentialRewardGd || 0;
            }
            rewardParityByTask.set(event.taskId, current);
        });

        rewardTransactions7d.forEach((entry) => {
            const description = toStringValue(entry.description);
            const taskTitle = description.startsWith("Daily Task: ") ? description.replace("Daily Task: ", "") : description;
            const matchedTaskIds = taskIdsByTitle.get(taskTitle.trim().toLowerCase()) ?? [];
            const matchedTaskId = matchedTaskIds.length === 1 ? matchedTaskIds[0] : "";
            const matchedTask = matchedTaskId ? taskDefinitionsById.get(matchedTaskId) : undefined;
            const taskId = matchedTaskId || taskTitle || "unknown";
            const current = rewardParityByTask.get(taskId) || {
                taskId,
                taskTitle: taskTitle || taskId,
                definitionOrigin: matchedTask?.source === "built_in" ? "built_in" : matchedTask ? "custom" : "unknown",
                completedCount: 0,
                rewardedCount: 0,
                taskRewardReceiptCount: 0,
                relatedActionReceiptCount: 0,
                purchaseReceiptCount: 0,
                paidRewardTotalGd: taskRollupParityByTaskId.get(taskId)?.paidRewardTotalGd || 0,
                potentialRewardTotalGd: taskRollupParityByTaskId.get(taskId)?.potentialRewardTotalGd || 0,
                expectedReceiptPolicy: matchedTask ? getExpectedTaskReceiptPolicy(matchedTask) : "unknown",
                receiptParityState: "live" as TaskReceiptParityState,
                explanation: "",
            };
            current.taskRewardReceiptCount += 1;
            rewardParityByTask.set(taskId, current);
        });

        rawRecentReceipts
            .filter((entry) => entry.timestamp >= weekAgoMs)
            .forEach((receipt) => {
            const metadata = buildTelemetryEventMetadata(receipt.eventName);
            const canonicalEventName = metadata.canonicalEventName;
            const candidateDefinitions = allTaskDefinitions
                .filter((definition) => buildTelemetryEventMetadata(definition.eventName).canonicalEventName === canonicalEventName)
                .filter((definition) => receiptMatchesTaskCriteria(definition, receipt.params))
                .sort((left, right) => scoreTaskCriteriaSpecificity(right) - scoreTaskCriteriaSpecificity(left));
            const strongestSpecificity = candidateDefinitions[0] ? scoreTaskCriteriaSpecificity(candidateDefinitions[0]) : 0;
            const candidateTaskIds = candidateDefinitions
                .filter((definition) => scoreTaskCriteriaSpecificity(definition) === strongestSpecificity)
                .map((definition) => definition.id);
            if (candidateTaskIds.length !== 1) {
                return;
            }

            const taskId = candidateTaskIds[0];
            const matchedTask = taskDefinitionsById.get(taskId);
            const current = rewardParityByTask.get(taskId) || {
                taskId,
                taskTitle: matchedTask?.title || taskId,
                definitionOrigin: matchedTask?.source === "built_in" ? "built_in" : matchedTask ? "custom" : "unknown",
                completedCount: 0,
                rewardedCount: 0,
                taskRewardReceiptCount: 0,
                relatedActionReceiptCount: 0,
                purchaseReceiptCount: 0,
                paidRewardTotalGd: taskRollupParityByTaskId.get(taskId)?.paidRewardTotalGd || 0,
                potentialRewardTotalGd: taskRollupParityByTaskId.get(taskId)?.potentialRewardTotalGd || 0,
                expectedReceiptPolicy: matchedTask ? getExpectedTaskReceiptPolicy(matchedTask) : "unknown",
                receiptParityState: "live" as TaskReceiptParityState,
                explanation: "",
            };
            current.relatedActionReceiptCount += 1;
            current.relatedActionReceiptLabel = canonicalEventName === "gumdrops_purchase_completed"
                ? "purchase receipts"
                : canonicalEventName === "daily_checkin_claimed"
                    ? "related daily check-in receipts"
                    : "related action receipts";
            if (matchedTask?.group === "purchase") {
                current.purchaseReceiptCount += 1;
            }
            rewardParityByTask.set(taskId, current);
        });

        const taskParity: TaskReceiptParityRow[] = Array.from(rewardParityByTask.values())
            .map((entry) => {
                const matchedTask = taskDefinitionsById.get(entry.taskId);
                const expectedReceiptPolicy = matchedTask ? getExpectedTaskReceiptPolicy(matchedTask) : entry.expectedReceiptPolicy;
                const missingRewardReceipts = entry.rewardedCount > 0 && entry.taskRewardReceiptCount === 0;
                const rewardMismatch = entry.rewardedCount !== entry.taskRewardReceiptCount;
                let receiptParityState: TaskReceiptParityState = "live";
                let explanation = "Task completion, reward credit, and receipt evidence are aligned.";

                if (expectedReceiptPolicy === "not_required") {
                    receiptParityState = entry.rewardedCount > 0 ? "live" : "review";
                    explanation = entry.relatedActionReceiptCount > 0
                        ? `Task reward receipts are not required here. ${entry.relatedActionReceiptCount} ${entry.relatedActionReceiptLabel || "related action receipts"} were observed in the sample window.`
                        : "Task reward receipts are not required here; completion and paid reward truth come from task events and reward credit records.";
                } else if (expectedReceiptPolicy === "legacy_optional") {
                    receiptParityState = missingRewardReceipts ? "review" : "live";
                    explanation = missingRewardReceipts
                        ? "Legacy unlock compatibility still allows reward credit without a canonical task receipt. Verify canonical drop_unlocked parity before treating this as fully clean."
                        : "Legacy unlock compatibility is present, but task reward receipts were still found.";
                } else if (missingRewardReceipts) {
                    receiptParityState = "error";
                    explanation = "Task shows rewarded completions but no task reward receipts were found.";
                } else if (rewardMismatch) {
                    receiptParityState = "review";
                    explanation = `Rewarded completions (${entry.rewardedCount}) and task reward receipts (${entry.taskRewardReceiptCount}) do not match exactly.`;
                } else if (matchedTask?.group === "purchase") {
                    receiptParityState = entry.purchaseReceiptCount >= entry.rewardedCount ? "live" : "review";
                    explanation = entry.purchaseReceiptCount >= entry.rewardedCount
                        ? `Purchase receipts (${entry.purchaseReceiptCount}) and task reward receipts (${entry.taskRewardReceiptCount}) both support this purchase task.`
                        : `Task reward receipts were found, but only ${entry.purchaseReceiptCount} purchase receipt(s) matched this task's package criteria.`;
                } else if (entry.relatedActionReceiptCount > 0) {
                    explanation = `${entry.relatedActionReceiptCount} ${entry.relatedActionReceiptLabel || "related action receipts"} support the task trigger path.`;
                }

                return {
                    taskId: entry.taskId,
                    taskTitle: entry.taskTitle,
                    completedCount: entry.completedCount,
                    rewardedCount: entry.rewardedCount,
                    taskRewardReceiptCount: entry.taskRewardReceiptCount,
                    relatedActionReceiptCount: entry.relatedActionReceiptCount,
                    relatedActionReceiptLabel: entry.relatedActionReceiptLabel,
                    purchaseReceiptCount: entry.purchaseReceiptCount,
                    paidRewardTotalGd: entry.paidRewardTotalGd,
                    potentialRewardTotalGd: entry.potentialRewardTotalGd,
                    expectedReceiptPolicy,
                    receiptParityState,
                    explanation,
                } satisfies TaskReceiptParityRow;
            })
            .sort((left, right) => {
                const stateRank: Record<TaskReceiptParityState, number> = { error: 0, review: 1, live: 2 };
                return stateRank[left.receiptParityState] - stateRank[right.receiptParityState]
                    || right.rewardedCount - left.rewardedCount
                    || right.completedCount - left.completedCount
                    || right.paidRewardTotalGd - left.paidRewardTotalGd;
            });
        const totalRewardTransactionsAmount7d = rewardTransactions7d.reduce((sum, entry) => sum + Math.abs(toNumber(entry.amount)), 0);
        const taskParitySummary = {
            completedCount7d: completedEvents7d.length,
            receiptCount7d: rewardTransactions7d.length,
            rewardedCount7d: rewardTransactions7d.length,
            rewardedAmount7d: totalRewardTransactionsAmount7d,
            mismatchDelta7d: completedEvents7d.length - rewardTransactions7d.length,
            checkInToday: taskParity.find((entry) => entry.taskId === "check_in_today") || null,
        };
        const taskAuditSample = {
            windowDays: 7,
            taskEventsSampleCount: taskEventsSnapshot.size,
            receiptsSampleCount: receiptsSnapshot.size,
            taskEventsSampleLimit: TASK_AUDIT_SAMPLE_LIMIT,
            receiptsSampleLimit: TASK_AUDIT_SAMPLE_LIMIT,
            taskEventsPartial: taskEventsSnapshot.size >= TASK_AUDIT_SAMPLE_LIMIT,
            receiptsPartial: receiptsSnapshot.size >= TASK_AUDIT_SAMPLE_LIMIT,
        };

        const telemetryCoverageRowsMap = eventStatsSnapshot.docs.reduce((map, doc) => {
            const data = doc.data() as Record<string, unknown>;
            const rawEventName = doc.id;
            const { canonicalEventName, option } = getTelemetryEventOption(rawEventName);
            const mappedDefinitions = allTaskDefinitions.filter((definition) => buildTelemetryEventMetadata(definition.eventName).canonicalEventName === canonicalEventName);
            const mappedTaskTitles = mappedDefinitions.map((definition) => definition.title);
            const purpose = classifyTelemetryCoveragePurpose(canonicalEventName, mappedDefinitions.length);
            const sourceState = inferTelemetryCoverageSourceState(rawEventName, canonicalEventName);
            const expectedTaskMapping = (
                purpose === "task_trigger"
                || purpose === "viewer_task_trigger"
                || (purpose === "notification" && canonicalEventName === "notification_read")
            );
            let coverageState: TelemetryCoverageRow["coverageState"] = "ready";
            if (sourceState === "unsupported" || purpose === "unknown") {
                coverageState = "unsupported";
            } else if (sourceState === "alias_mapped" && !option) {
                coverageState = "alias_needed";
            } else if (expectedTaskMapping && mappedDefinitions.length === 0) {
                coverageState = "task_mapping_missing";
            } else if (
                purpose === "task_lifecycle"
                || purpose === "onboarding"
                || purpose === "identity"
                || purpose === "viewer_support"
                || purpose === "semantic_ux"
                || purpose === "supporting_telemetry"
            ) {
                coverageState = "supporting";
            } else if (sourceState === "legacy") {
                coverageState = "review";
            } else {
                coverageState = "ready";
            }

            const current = map.get(canonicalEventName) || {
                eventName: rawEventName,
                normalizedAction: canonicalEventName,
                displayLabel: option?.label || TELEMETRY_EVENT_LABELS[canonicalEventName] || canonicalEventName,
                eventPurpose: purpose,
                totalCount: 0,
                mappedTaskCount: mappedDefinitions.length,
                mappedTaskTitles,
                lastSeenAtUtc: null as string | null,
                sourceState,
                coverageState,
                explanation: "",
                rawEventNames: [] as string[],
            } satisfies TelemetryCoverageRow;

            current.totalCount += toNumber(data.totalCount);
            const lastSeenAt = toNumber(data.lastSeenAt);
            const lastSeenAtUtc = lastSeenAt > 0 ? new Date(lastSeenAt).toISOString() : null;
            if (lastSeenAtUtc && (!current.lastSeenAtUtc || lastSeenAtUtc > current.lastSeenAtUtc)) {
                current.lastSeenAtUtc = lastSeenAtUtc;
            }
            if (!current.rawEventNames.includes(rawEventName)) {
                current.rawEventNames.push(rawEventName);
            }
            current.mappedTaskCount = Math.max(current.mappedTaskCount, mappedDefinitions.length);
            current.mappedTaskTitles = Array.from(new Set([...current.mappedTaskTitles, ...mappedTaskTitles]));
            current.sourceState = current.sourceState === "unsupported" || sourceState === "unsupported"
                ? "unsupported"
                : current.sourceState === "alias_mapped" || sourceState === "alias_mapped"
                    ? "alias_mapped"
                    : current.sourceState === "legacy" || sourceState === "legacy"
                        ? "legacy"
                        : current.sourceState === "canonical" || sourceState === "canonical"
                            ? "canonical"
                            : "telemetry";
            current.coverageState = current.coverageState === "unsupported" || coverageState === "unsupported"
                ? "unsupported"
                : current.coverageState === "task_mapping_missing" || coverageState === "task_mapping_missing"
                    ? "task_mapping_missing"
                    : current.coverageState === "review" || coverageState === "review"
                        ? "review"
                        : current.coverageState === "supporting" || coverageState === "supporting"
                            ? "supporting"
                            : current.coverageState === "alias_needed" || coverageState === "alias_needed"
                                ? "alias_needed"
                                : "ready";
            current.explanation = buildTelemetryCoverageExplanation({
                eventName: canonicalEventName,
                purpose: current.eventPurpose,
                mappedTaskCount: current.mappedTaskCount,
                mappedTaskTitles: current.mappedTaskTitles,
                sourceState: current.sourceState,
                coverageState: current.coverageState,
            });
            map.set(canonicalEventName, current);
            return map;
        }, new Map<string, TelemetryCoverageRow>());
        const telemetryCoverageRows = Array.from(telemetryCoverageRowsMap.values()).sort((left, right) => {
            const stateRank = {
                unsupported: 0,
                task_mapping_missing: 1,
                review: 2,
                alias_needed: 3,
                ready: 4,
                supporting: 5,
            } satisfies Record<TelemetryCoverageRow["coverageState"], number>;
            return stateRank[left.coverageState] - stateRank[right.coverageState]
                || right.totalCount - left.totalCount
                || left.displayLabel.localeCompare(right.displayLabel);
        });

        const orphanedEventStats = telemetryCoverageRows
            .filter((entry) => entry.coverageState === "unsupported")
            .slice(0, 20);

        const receiptSummary = Array.from(receiptEvents7d.reduce((map, entry) => {
            const groupKey = `${entry.normalizedAction}:${entry.dedupeKeyLabel}`;
            const current = map.get(groupKey) || {
                groupKey,
                displayLabel: entry.displayLabel,
                dedupeKeyLabel: entry.dedupeKeyLabel,
                count: 0,
                aliasCount: 0,
                lastSeenAt: 0,
                lastSeenAtUtc: entry.createdAtUtc,
                sourceTruth: entry.sourceTruth,
                sourceState: entry.sourceState,
            };
            current.count += 1;
            current.aliasCount = Math.max(current.aliasCount, entry.aliasCount);
            const createdAtMs = Date.parse(entry.createdAtUtc);
            current.lastSeenAt = Math.max(current.lastSeenAt, createdAtMs);
            current.lastSeenAtUtc = current.lastSeenAt > 0 ? new Date(current.lastSeenAt).toISOString() : entry.createdAtUtc;
            map.set(groupKey, current);
            return map;
        }, new Map<string, ReceiptSummaryRow>()).values())
            .sort((left, right) => right.count - left.count);

        const sampleTaskRollupMap = recentTaskEvents.reduce((map, event) => {
            const current = map.get(event.taskId) || {
                taskId: event.taskId,
                title: event.title || event.taskId,
                eventCount: 0,
                paidRewardTotalGd: 0,
                potentialRewardTotalGd: 0,
                forfeitedPotentialRewardGd: 0,
                outOfBoundsEventCount: 0,
                completed: 0,
                started: 0,
                failed: 0,
                assigned: 0,
                reminders: 0,
                lastEventAt: 0,
            };
            current.eventCount += 1;
            current.paidRewardTotalGd += event.creditedRewardGd;
            current.potentialRewardTotalGd += event.potentialRewardGd;
            current.forfeitedPotentialRewardGd += event.forfeitedPotentialRewardGd;
            current.outOfBoundsEventCount += event.rewardAuditFlag === "historical_reward_out_of_bounds" ? 1 : 0;
            current.completed += event.type === "completed" ? 1 : 0;
            current.started += event.type === "started" ? 1 : 0;
            current.failed += event.type === "failed" ? 1 : 0;
            current.assigned += event.type === "assigned" ? 1 : 0;
            current.reminders += event.type === "reminder_sent" ? 1 : 0;
            current.lastEventAt = Math.max(current.lastEventAt, event.timestamp);
            map.set(event.taskId, current);
            return map;
        }, new Map<string, {
            taskId: string;
            title: string;
            eventCount: number;
            paidRewardTotalGd: number;
            potentialRewardTotalGd: number;
            forfeitedPotentialRewardGd: number;
            outOfBoundsEventCount: number;
            completed: number;
            started: number;
            failed: number;
            assigned: number;
            reminders: number;
            lastEventAt: number;
        }>());

        const sampleDailyTaskSeriesMap = recentTaskEvents.reduce((map, event) => {
            const dayKey = getCSTDateKey(event.timestamp || nowMs);
            const current = map.get(dayKey) || {
                dayKey,
                eventCount: 0,
                completedCount: 0,
                failedCount: 0,
                assignedCount: 0,
                paidRewardTotalGd: 0,
                potentialRewardTotalGd: 0,
                forfeitedPotentialRewardGd: 0,
                outOfBoundsEventCount: 0,
            };
            current.eventCount += 1;
            current.completedCount += event.type === "completed" ? 1 : 0;
            current.failedCount += event.type === "failed" ? 1 : 0;
            current.assignedCount += event.type === "assigned" ? 1 : 0;
            current.paidRewardTotalGd += event.creditedRewardGd;
            current.potentialRewardTotalGd += event.potentialRewardGd;
            current.forfeitedPotentialRewardGd += event.forfeitedPotentialRewardGd;
            current.outOfBoundsEventCount += event.rewardAuditFlag === "historical_reward_out_of_bounds" ? 1 : 0;
            map.set(dayKey, current);
            return map;
        }, new Map<string, {
            dayKey: string;
            eventCount: number;
            completedCount: number;
            failedCount: number;
            assignedCount: number;
            paidRewardTotalGd: number;
            potentialRewardTotalGd: number;
            forfeitedPotentialRewardGd: number;
            outOfBoundsEventCount: number;
        }>());

        const taskRollups = taskRollupSnapshot.docs.map((doc) => {
            const data = doc.data() as Record<string, unknown>;
            const sample = sampleTaskRollupMap.get(doc.id);
            const paidRewardTotalGd = toNumber(data.paidRewardTotalGd) || sample?.paidRewardTotalGd || 0;
            const potentialRewardTotalGd = toNumber(data.potentialRewardTotalGd) || sample?.potentialRewardTotalGd || 0;
            const forfeitedPotentialRewardGd = toNumber(data.forfeitedPotentialRewardGd)
                || sample?.forfeitedPotentialRewardGd
                || 0;
            const completed = toNumber((data.types as Record<string, unknown> | undefined)?.completed) || sample?.completed || 0;
            return {
                taskId: doc.id,
                title: toStringValue(data.title) || doc.id,
                eventCount: toNumber(data.eventCount),
                rewardTotal: paidRewardTotalGd,
                paidRewardTotalGd: completed > 0 ? paidRewardTotalGd : 0,
                potentialRewardTotalGd,
                forfeitedPotentialRewardGd,
                outOfBoundsEventCount: toNumber(data.outOfBoundsEventCount) || sample?.outOfBoundsEventCount || 0,
                completed,
                started: toNumber((data.types as Record<string, unknown> | undefined)?.started),
                failed: toNumber((data.types as Record<string, unknown> | undefined)?.failed),
                assigned: toNumber((data.types as Record<string, unknown> | undefined)?.assigned) || sample?.assigned || 0,
                reminders: toNumber((data.types as Record<string, unknown> | undefined)?.reminder_sent),
                lastEventAt: toNumber(data.lastEventAt),
            };
        }).sort((left, right) => right.completed - left.completed || right.eventCount - left.eventCount);

        const dailyTaskSeries = taskDailySnapshot.docs.map((doc) => {
            const data = doc.data() as Record<string, unknown>;
            const sample = sampleDailyTaskSeriesMap.get(doc.id);
            const completedCount = toNumber((data.types as Record<string, unknown> | undefined)?.completed) || sample?.completedCount || 0;
            const paidRewardTotalGd = toNumber(data.paidRewardTotalGd) || sample?.paidRewardTotalGd || 0;
            return {
                dayKey: doc.id,
                eventCount: toNumber(data.eventCount),
                rewardTotal: completedCount > 0 ? paidRewardTotalGd : 0,
                paidRewardTotalGd: completedCount > 0 ? paidRewardTotalGd : 0,
                potentialRewardTotalGd: toNumber(data.potentialRewardTotalGd) || sample?.potentialRewardTotalGd || 0,
                forfeitedPotentialRewardGd: toNumber(data.forfeitedPotentialRewardGd) || sample?.forfeitedPotentialRewardGd || 0,
                completed: completedCount,
                failed: toNumber((data.types as Record<string, unknown> | undefined)?.failed) || sample?.failedCount || 0,
                assigned: toNumber((data.types as Record<string, unknown> | undefined)?.assigned) || sample?.assignedCount || 0,
                outOfBoundsEventCount: toNumber(data.outOfBoundsEventCount) || sample?.outOfBoundsEventCount || 0,
            };
        }).sort((left, right) => left.dayKey.localeCompare(right.dayKey));

        const customTaskDefinitionsSummary = customTaskDefinitions.map((task) => ({
            id: task.id,
            rewardVersion: toNumber(task.rewardVersion),
            reward: toNumber(task.reward),
            active: task.active !== false,
            scope: task.source,
            eventName: task.eventName,
        }));

        const rewardValues = BUILT_IN_DAILY_TASKS.map((task) => task.reward);
        const legacyRewardVersionCount = customTaskDefinitionsSummary.filter((task) => task.rewardVersion !== DAILY_TASK_REWARD_VERSION).length;
        const customRewardAverage = customTaskDefinitionsSummary.length > 0
            ? Math.round(customTaskDefinitionsSummary.reduce((sum, task) => sum + task.reward, 0) / customTaskDefinitionsSummary.length)
            : 0;

        const creatorSpendTransactions7d = transactionEntries.filter((entry) => {
            const type = toStringValue(entry.type);
            return CREATOR_SPEND_TRANSACTION_TYPES.includes(type as typeof CREATOR_SPEND_TRANSACTION_TYPES[number])
                && toNumber(entry.timestampMs) >= weekAgoMs;
        });

        const creatorSpendParity = {
            trackedTransactions: creatorSpendTransactions7d.length,
            totalPurchasedSpent: creatorSpendTransactions7d.reduce((sum, entry) => sum + toNumber(entry.purchasedAmountSpent), 0),
            totalRewardSpent: creatorSpendTransactions7d.reduce((sum, entry) => sum + toNumber(entry.rewardAmountSpent), 0),
            missingLedgerSourceCount: creatorSpendTransactions7d.filter((entry) => !toStringValue(entry.ledgerSource)).length,
            restrictedSpendViolationCount: creatorSpendTransactions7d.filter((entry) => toNumber(entry.rewardAmountSpent) > 0 || toStringValue(entry.ledgerSource) === "reward" || toStringValue(entry.ledgerSource) === "mixed").length,
            amountMismatchCount: creatorSpendTransactions7d.filter((entry) => {
                const spendTotal = toNumber(entry.purchasedAmountSpent) + toNumber(entry.rewardAmountSpent);
                return spendTotal > 0 && spendTotal !== Math.abs(toNumber(entry.amount));
            }).length,
            missingCreatorAccrualCount: creatorSpendTransactions7d.filter((entry) => !toStringValue(entry.creatorAccrualId)).length,
            byType: Array.from(creatorSpendTransactions7d.reduce((map, entry) => {
                const key = toStringValue(entry.type) || "unknown";
                const current = map.get(key) || {
                    type: key,
                    label: getTransactionBadgeLabel({
                        type: key as Parameters<typeof getTransactionBadgeLabel>[0]["type"],
                        rewardSource: undefined,
                    }),
                    count: 0,
                    purchasedSpent: 0,
                    rewardSpent: 0,
                };
                current.count += 1;
                current.purchasedSpent += toNumber(entry.purchasedAmountSpent);
                current.rewardSpent += toNumber(entry.rewardAmountSpent);
                map.set(key, current);
                return map;
            }, new Map<string, { type: string; label: string; count: number; purchasedSpent: number; rewardSpent: number }>()).values())
                .sort((left, right) => right.count - left.count),
            policies: Object.entries(CREATOR_SPEND_POLICIES).map(([key, policy]) => ({
                key,
                label: policy.label,
                purchasedOnly: policy.purchasedOnly,
                description: policy.description,
            })),
        };
        const taskGumdropGuardrails: TaskGumdropGuardrailState = {
            generatedAtUtc: new Date(nowMs).toISOString(),
            affectedUsersCount: assignmentIssues.length,
            rewardDelta7d: taskParitySummary.mismatchDelta7d,
            creatorSpendViolations: creatorSpendParity.restrictedSpendViolationCount,
            overallState: assignmentIssues.length > 0
                ? "review"
                : creatorSpendParity.restrictedSpendViolationCount > 0 || taskParity.some((entry) => entry.receiptParityState === "error")
                    ? "error"
                    : taskParity.some((entry) => entry.receiptParityState === "review")
                        ? "review"
                        : "live",
            rewardSettings: {
                version: DAILY_TASK_REWARD_VERSION,
                multiplierPct: Math.round(DAILY_TASK_REWARD_MULTIPLIER * 100),
                builtInAverageRewardGd: rewardValues.length > 0
                    ? Math.round(rewardValues.reduce((sum, reward) => sum + reward, 0) / rewardValues.length)
                    : 0,
                legacyCustomCount: legacyRewardVersionCount,
                state: legacyRewardVersionCount > 0 ? "review" : "live",
            },
            creatorSpend: {
                trackedSpendCount: creatorSpendParity.trackedTransactions,
                purchasedSpendCount: creatorSpendParity.totalPurchasedSpent,
                rewardSpendCount: creatorSpendParity.totalRewardSpent,
                amountMismatchCount: creatorSpendParity.amountMismatchCount,
                state: creatorSpendParity.restrictedSpendViolationCount > 0 || creatorSpendParity.amountMismatchCount > 0 ? "error" : "live",
                explanation: `${creatorSpendParity.trackedTransactions} creator spend transaction(s) used purchased GD ${creatorSpendParity.totalPurchasedSpent}; reward GD ${creatorSpendParity.totalRewardSpent}.`,
            },
            receiptParity: {
                okCount: taskParity.filter((entry) => entry.receiptParityState === "live").length,
                reviewCount: taskParity.filter((entry) => entry.receiptParityState === "review").length,
                errorCount: taskParity.filter((entry) => entry.receiptParityState === "error").length,
                state: taskParity.some((entry) => entry.receiptParityState === "error")
                    ? "error"
                    : taskParity.some((entry) => entry.receiptParityState === "review")
                        ? "review"
                        : "live",
            },
            taskReceiptParity: taskParity,
            affectedUsers: assignmentIssues
                .map((entry) => entry.attribution)
                .filter((entry): entry is TaskIssueAttribution => Boolean(entry)),
        };
        const unsupportedRuntimeGroupsMap = runtimeTaskAudit.unsupportedRuntimeRecords.reduce((map, record) => {
            const reason = classifyRuntimeUnsupportedReason(record);
            const source = sourceLabelForRuntimeDriftKind(record.kind);
            const taskDefinition = record.taskId ? taskDefinitionsById.get(record.taskId) : undefined;
            const inventoryEntry = record.taskId ? taskInventory.find((entry) => entry.taskId === record.taskId) : undefined;
            const activityScope: RuntimeUnsupportedGroup["activityScope"] = typeof record.timestamp === "number" && record.timestamp >= currentDailyTaskWindow.windowStartMs
                ? "active"
                : "historical";
            const groupKey = [
                source,
                reason,
                record.taskId || "no_task",
                record.eventName || "no_event",
                inventoryEntry?.actionType || "no_action",
            ].join(":");
            const current = map.get(groupKey) || {
                groupKey,
                count: 0,
                taskId: record.taskId || undefined,
                taskTitle: record.title || taskDefinition?.title || undefined,
                triggerEvent: record.eventName || taskDefinition?.eventName || undefined,
                runtimeAction: inventoryEntry?.actionType || undefined,
                source,
                reason,
                activityScope,
                affectedUsersSample: [] as RuntimeUnsupportedGroup["affectedUsersSample"],
                firstSeenAtUtc: null as string | null,
                lastSeenAtUtc: null as string | null,
                severity: "review" as RuntimeUnsupportedGroup["severity"],
                suggestedAction: suggestedActionForRuntimeUnsupportedReason(reason),
            };
            current.count += 1;
            current.activityScope = current.activityScope === activityScope ? current.activityScope : "mixed";
            if (record.userId && !current.affectedUsersSample.some((entry) => entry.userId === record.userId)) {
                current.affectedUsersSample.push({
                    userId: record.userId,
                    displayName: runtimeUserIdentityMap.get(record.userId),
                    shortUserId: shortenAdminOverviewUserId(record.userId),
                });
            }
            if (typeof record.timestamp === "number" && record.timestamp > 0) {
                const timestampUtc = new Date(record.timestamp).toISOString();
                current.firstSeenAtUtc = !current.firstSeenAtUtc || timestampUtc < current.firstSeenAtUtc ? timestampUtc : current.firstSeenAtUtc;
                current.lastSeenAtUtc = !current.lastSeenAtUtc || timestampUtc > current.lastSeenAtUtc ? timestampUtc : current.lastSeenAtUtc;
            }
            current.severity = activityScope === "active"
                ? "error"
                : reason === "legacy_task_alias_unmapped" || reason === "custom_task_without_definition"
                    ? "review"
                    : reason === "unknown"
                        ? "review"
                        : "review";
            map.set(groupKey, current);
            return map;
        }, new Map<string, RuntimeUnsupportedGroup>());
        const unsupportedRuntimeGroups = Array.from(unsupportedRuntimeGroupsMap.values())
            .map((entry) => ({
                ...entry,
                affectedUsersSample: entry.affectedUsersSample.slice(0, 3),
            }))
            .sort((left, right) => {
                const severityRank = { error: 0, review: 1, info: 2 };
                return severityRank[left.severity] - severityRank[right.severity]
                    || right.count - left.count
                    || (left.taskId || "").localeCompare(right.taskId || "");
            });
        const runtimeTaskSourceParityRows: RuntimeTaskSourceParityRow[] = runtimeTaskAudit.distribution.map((entry) => {
            const mismatchReasons = buildRuntimeTaskMismatchReasons(entry);
            const rowBase = {
                taskId: entry.taskId,
                taskTitle: entry.title,
                triggerEvent: entry.eventName,
                origin: resolveRuntimeTaskParityOrigin(entry),
                mode: entry.actionMode === "runtime" ? "runtime" : "route",
                scope: resolveRuntimeTaskParityScope(entry),
                cooldown: `${entry.cooldownDays}d`,
                assignedUsers: entry.assignedUsers,
                claimedCount: entry.claimedAssignments,
                taskCompletedCount: entry.recentCompletedCount,
                rewardClaimCount: entry.recentRewardClaimCount,
                receiptCount: entry.recentReceiptCount,
                rollupCompletedCount: entry.rollupCompletedCount,
                eventStatsCount: entry.eventStatTotalCount,
                sourceParityState: resolveRuntimeTaskSourceParityState(mismatchReasons),
                mismatchReasons,
                canonicalCompletionSource: resolveRuntimeTaskCanonicalCompletionSource(entry),
            } satisfies Omit<RuntimeTaskSourceParityRow, "explanation">;

            return {
                ...rowBase,
                explanation: explainRuntimeTaskSourceParity(rowBase),
            } satisfies RuntimeTaskSourceParityRow;
        });
        const alignedRuntimeTaskCount = runtimeTaskSourceParityRows.filter((entry) => entry.sourceParityState === "aligned").length;
        const partialRuntimeTaskCount = runtimeTaskSourceParityRows.filter((entry) => entry.sourceParityState === "partial").length;
        const mismatchRuntimeTaskCount = runtimeTaskSourceParityRows.filter((entry) => entry.sourceParityState === "mismatch").length;
        const unknownRuntimeTaskCount = runtimeTaskSourceParityRows.filter((entry) => entry.sourceParityState === "unknown").length;
        const sharedEventGroups: SharedTaskEventGroup[] = runtimeTaskAudit.ambiguousEventMappings.map((entry) => {
            const mappedDefinitions = entry.taskIds
                .map((taskId) => taskDefinitionsById.get(taskId))
                .filter((definition): definition is DailyTaskDefinition => Boolean(definition));
            const requiredDisambiguators = new Set<string>();
            const presentDisambiguators = new Set<string>();
            const missingEvidence = new Set<string>();
            const sharedTasks = mappedDefinitions.map((definition) => {
                const disambiguators = buildSharedTaskEventDisambiguators(definition);
                const keying = inferSharedTaskKeying(definition);
                const requiredEntity = inferSharedTaskEntity(definition);
                const criteriaState = inferSharedTaskCriteriaState(definition);
                return {
                    taskId: definition.id,
                    title: definition.title,
                    requiredCount: definition.maxProgress,
                    keying,
                    requiredEntity,
                    criteria: disambiguators.present,
                    criteriaState,
                } satisfies SharedTaskEventGroup["sharedTasks"][number];
            });

            mappedDefinitions.forEach((definition) => {
                const disambiguators = buildSharedTaskEventDisambiguators(definition);
                disambiguators.required.forEach((item) => requiredDisambiguators.add(item));
                disambiguators.present.forEach((item) => presentDisambiguators.add(item));
            });

            const missingDisambiguators = Array.from(requiredDisambiguators).filter((item) => !presentDisambiguators.has(item));
            const allHaveUniqueKeying = sharedTasks.every((task) => task.requiredCount <= 1 || task.keying === "unique_entity" || task.keying === "filtered");
            const anyHaveCriteria = sharedTasks.some((task) => task.criteriaState === "complete" || task.criteriaState === "partial");
            if (!allHaveUniqueKeying && mappedDefinitions.some((definition) => definition.maxProgress > 1)) {
                missingEvidence.add("unique_entity_keying");
            }
            if (entry.eventName === "feedback_submitted" && !sharedTasks.every((task) => task.criteriaState === "complete")) {
                missingEvidence.add("feedback_type_or_rating_criteria");
            }
            if (entry.eventName === "unlock_drop_success" && sharedTasks.some((task) => task.title.toLowerCase().includes("spicy") || task.title.toLowerCase().includes("sweet") || task.title.toLowerCase().includes("raw")) && sharedTasks.some((task) => task.criteriaState !== "complete" && (task.title.toLowerCase().includes("spicy") || task.title.toLowerCase().includes("sweet") || task.title.toLowerCase().includes("raw")))) {
                missingEvidence.add("category_filter");
            }
            if (entry.eventName === "gumdrops_purchase_completed" && !sharedTasks.every((task) => task.criteriaState === "complete")) {
                missingEvidence.add("package_amount_criteria");
            }
            if (entry.eventName === "viewer_watch_checkpoint" && !sharedTasks.every((task) => task.criteriaState === "complete")) {
                missingEvidence.add("duration_threshold");
            }
            const uniqueMissingEvidence = Array.from(missingEvidence);
            const ambiguityState: SharedTaskEventGroup["ambiguityState"] = uniqueMissingEvidence.length === 0
                ? (allHaveUniqueKeying ? "safe_with_keying" : "safe_with_criteria")
                : anyHaveCriteria || allHaveUniqueKeying
                    ? "partial"
                    : "unsafe_shared_event";
            const severity: SharedTaskEventGroup["severity"] = ambiguityState === "safe_with_keying" || ambiguityState === "safe_with_criteria"
                ? "info"
                : ambiguityState === "partial"
                    ? "review"
                    : "error";
            const receiptMeaning = entry.eventName === "gumdrops_purchase_completed"
                ? "Receipts here are purchase receipts, not task reward receipts."
                : entry.eventName === "unlock_drop_success"
                    ? "Receipts here are shared unlock receipts and do not prove task-specific reward credit."
                    : entry.recentReceiptCount > 0
                        ? "Receipts here are related evidence and may not be task-specific."
                        : "No related receipt evidence was found in this sample.";
            const groupBase = {
                eventName: entry.eventName,
                displayLabel: entry.eventLabel,
                normalizedAction: entry.eventName,
                sharedByCount: entry.mappedTaskCount,
                assignedCount: entry.runtimeAssignedCount,
                receiptCount: entry.recentReceiptCount,
                eventStatsCount: entry.eventStatTotalCount,
                receiptMeaning,
                sharedTasks,
                taskIds: entry.taskIds,
                taskTitles: entry.taskTitles,
                ambiguityState,
                requiredDisambiguators: Array.from(requiredDisambiguators),
                presentDisambiguators: Array.from(presentDisambiguators),
                missingDisambiguators,
                missingEvidence: uniqueMissingEvidence,
                severity,
            };

            return {
                ...groupBase,
                explanation: buildSharedTaskEventExplanation(groupBase),
            } satisfies SharedTaskEventGroup;
        }).sort((left, right) => {
            const severityRank = { error: 0, review: 1, info: 2 };
            return severityRank[left.severity] - severityRank[right.severity]
                || right.taskIds.length - left.taskIds.length
                || left.eventName.localeCompare(right.eventName);
        });
        const alignmentWarnings: TaskTelemetryAlignmentWarning[] = [];
        runtimeTaskAudit.distribution.forEach((entry) => {
            const definition = taskDefinitionsById.get(entry.taskId);
            const sourceParity = runtimeTaskSourceParityRows.find((row) => row.taskId === entry.taskId);
            const sharedGroup = sharedEventGroups.find((group) => group.taskIds.includes(entry.taskId));

            if (sharedGroup && (sharedGroup.ambiguityState === "partial" || sharedGroup.ambiguityState === "unsafe_shared_event")) {
                alignmentWarnings.push({
                    taskId: entry.taskId,
                    taskTitle: entry.title,
                    triggerEvent: entry.eventName,
                    warningType: "shared_event_missing_criteria",
                    severity: sharedGroup.severity === "error" ? "error" : "review",
                    suggestedAction: `Add task-specific criteria for shared event ${entry.eventName}.`,
                });
            }
            if (sharedGroup && entry.maxProgress > 1 && !entry.uniqueByParamKey) {
                alignmentWarnings.push({
                    taskId: entry.taskId,
                    taskTitle: entry.title,
                    triggerEvent: entry.eventName,
                    warningType: "shared_event_missing_unique_keying",
                    severity: "error",
                    suggestedAction: "Add distinct/count-safe keying for multi-progress shared events.",
                });
            }
            if (entry.trackingSource === "unsupported") {
                alignmentWarnings.push({
                    taskId: entry.taskId,
                    taskTitle: entry.title,
                    triggerEvent: entry.eventName,
                    warningType: "telemetry_event_unsupported",
                    severity: "error",
                    suggestedAction: "Map the trigger event into the telemetry catalog or replace it with a supported canonical event.",
                });
            }
            if (definition && definition.eventName === "unlock_drop_success") {
                alignmentWarnings.push({
                    taskId: entry.taskId,
                    taskTitle: entry.title,
                    triggerEvent: entry.eventName,
                    warningType: "canonical_alias_missing",
                    severity: "review",
                    suggestedAction: "Verify canonical drop_unlocked alias coverage before treating legacy unlock telemetry as settled.",
                });
            }
            if (!entry.destinationHref) {
                alignmentWarnings.push({
                    taskId: entry.taskId,
                    taskTitle: entry.title,
                    triggerEvent: entry.eventName,
                    warningType: "runtime_action_missing",
                    severity: "review",
                    suggestedAction: "Restore a reachable task action path for this runtime task.",
                });
            }
            if (sourceParity?.mismatchReasons.includes("event_stats_not_task_scoped")) {
                alignmentWarnings.push({
                    taskId: entry.taskId,
                    taskTitle: entry.title,
                    triggerEvent: entry.eventName,
                    warningType: "event_stats_not_task_scoped",
                    severity: "review",
                    suggestedAction: "Do not use raw event stats as completion proof without task-scoped evidence.",
                });
            }
            if (sourceParity && sourceParity.sourceParityState !== "aligned" && sourceParity.mismatchReasons.some((reason) => reason !== "event_stats_not_task_scoped")) {
                alignmentWarnings.push({
                    taskId: entry.taskId,
                    taskTitle: entry.title,
                    triggerEvent: entry.eventName,
                    warningType: "completion_source_mismatch",
                    severity: sourceParity.sourceParityState === "mismatch" ? "error" : "review",
                    suggestedAction: "Inspect task completion, reward receipt, and rollup parity for this task.",
                });
            }
        });
        const dedupedAlignmentWarnings = Array.from(new Map(
            alignmentWarnings.map((warning) => [`${warning.taskId}:${warning.warningType}`, warning]),
        ).values()).sort((left, right) => {
            const severityRank = { error: 0, review: 1, info: 2 };
            return severityRank[left.severity] - severityRank[right.severity]
                || left.taskTitle.localeCompare(right.taskTitle)
                || left.warningType.localeCompare(right.warningType);
        });
        const telemetryAlignmentByCanonicalEvent = runtimeTaskAudit.telemetryAlignment.reduce((map, entry) => {
            const current = map.get(entry.eventName) || {
                eventName: entry.eventName,
                eventLabel: entry.eventLabel,
                trackingEntries: [] as typeof runtimeTaskAudit.telemetryAlignment,
                eventStatsCount: 0,
                receiptCount: 0,
                assignedCount: 0,
            };
            current.trackingEntries.push(entry);
            current.eventStatsCount += entry.eventStatTotalCount;
            current.receiptCount += entry.recentReceiptCount;
            current.assignedCount = Math.max(current.assignedCount, entry.runtimeAssignedCount);
            map.set(entry.eventName, current);
            return map;
        }, new Map<string, {
            eventName: string;
            eventLabel: string;
            trackingEntries: typeof runtimeTaskAudit.telemetryAlignment;
            eventStatsCount: number;
            receiptCount: number;
            assignedCount: number;
        }>());
        const taskTelemetryMappingRows: TaskTelemetryMappingRow[] = Array.from(telemetryAlignmentByCanonicalEvent.values()).map((entry) => {
            const affectedDefinitions = allTaskDefinitions.filter((definition) => buildTelemetryEventMetadata(definition.eventName).canonicalEventName === entry.eventName);
            const sharedGroup = sharedEventGroups.find((group) => group.eventName === entry.eventName);
            const purpose = classifyTaskTelemetryEventPurpose(entry.eventName);
            const expectedMapping = purpose === "task_trigger"
                || (purpose === "notification_event" && (entry.eventName === "notification_read" || entry.eventName === "notification_opened"))
                || (purpose === "viewer_event" && entry.eventName === "file_viewed");
            const affectedTasks = affectedDefinitions.map((definition) => ({
                taskId: definition.id,
                title: definition.title,
                criteria: definition.criteria ? buildSharedTaskEventDisambiguators(definition).present : [],
                keying: definition.uniqueByParamKey || undefined,
            }));
            const trackingSource = resolveTaskTelemetryTrackingSource(entry.trackingEntries);
            let mappingState: TaskTelemetryMappingRow["mappingState"] = "ready";
            let explanation = "Mapped task trigger telemetry is aligned.";
            let missingMappingReason: string | undefined;

            if (trackingSource === "legacy" || entry.eventName === "unlock_drop_success") {
                mappingState = "shared_receipts";
                explanation = "Receipt counts are shared across unlock tasks and cannot be treated as task-specific reward receipts without taskId linkage.";
            }
            if (purpose === "task_lifecycle") {
                mappingState = "lifecycle_not_task";
                explanation = "Lifecycle event, not a task trigger. This is infrastructure telemetry and does not need a task mapping.";
            } else if (purpose === "onboarding_telemetry") {
                mappingState = "supporting_not_task";
                explanation = "Supporting onboarding telemetry. It is tracked for onboarding flow visibility, not daily task completion.";
            } else if (purpose === "task_guidance") {
                mappingState = "supporting_not_task";
                explanation = "Task guidance telemetry supports prompt effectiveness and should not be treated as a task trigger.";
            } else if (entry.eventName === "daily_tasks_viewed") {
                mappingState = "supporting_not_task";
                explanation = "Daily tasks surface telemetry. It tracks task-module visibility and does not map to a specific task completion.";
            } else if (purpose === "viewer_event" && entry.eventName === "file_viewed" && affectedDefinitions.length === 0) {
                mappingState = "supporting_not_task";
                explanation = "Used for viewer analytics, not daily task completion. Task completion uses viewer_asset_consumed or viewer_asset_completed.";
            } else if (expectedMapping && affectedDefinitions.length === 0) {
                mappingState = "needs_task_mapping";
                missingMappingReason = "expected by task catalog";
                explanation = "Missing task mapping: expected by task catalog.";
            } else if (sharedGroup && sharedGroup.ambiguityState !== "safe_with_criteria") {
                mappingState = "needs_criteria";
                explanation = "Shared event needs criteria or distinct keying before task attribution is trustworthy.";
            } else if (purpose === "commerce_event" && entry.eventName === "unlock_drop_success" && sharedGroup) {
                mappingState = "shared_receipts";
                explanation = "Receipt pool shared across tasks. Unlock telemetry maps to multiple unwrap tasks and needs task-specific reward linkage.";
            } else if (trackingSource === "telemetry" && expectedMapping) {
                mappingState = "ready";
                explanation = "Task trigger telemetry maps to active tasks. Event stats remain trigger evidence, not completion proof.";
            } else if (!expectedMapping) {
                mappingState = "supporting_not_task";
                explanation = "Supporting telemetry, not a direct daily task trigger.";
            }
            if (entry.eventName === "daily_checkin_claimed" && affectedDefinitions.length > 0) {
                mappingState = "ready";
                explanation = "Daily check-in claim is the separate pinned daily reward lane. Event stats and receipts are separate evidence lanes from the random three-task pool.";
                missingMappingReason = undefined;
            }
            if (entry.eventName === "notification_read" && affectedDefinitions.length > 0) {
                mappingState = sharedGroup && sharedGroup.ambiguityState !== "safe_with_criteria" ? "needs_criteria" : "ready";
                explanation = sharedGroup && sharedGroup.ambiguityState !== "safe_with_criteria"
                    ? "Notification read maps to a task, but shared event criteria or keying still need tightening."
                    : "Notification read is the task trigger for Clear one alert.";
                missingMappingReason = undefined;
            }

            return {
                displayLabel: entry.eventLabel,
                eventName: entry.eventName,
                normalizedAction: entry.eventName,
                eventPurpose: purpose,
                mappedTaskCount: affectedDefinitions.length,
                mappedBuiltInCount: affectedDefinitions.filter((definition) => definition.source === "built_in").length,
                mappedCustomCount: affectedDefinitions.filter((definition) => definition.source !== "built_in").length,
                assignedCount: entry.assignedCount,
                eventStatsCount: entry.eventStatsCount,
                receiptCount: entry.receiptCount,
                trackingSource,
                mappingState,
                explanation,
                expectedMapping,
                missingMappingReason,
                affectedTasks,
            } satisfies TaskTelemetryMappingRow;
        }).sort((left, right) => {
            const stateRank = {
                needs_task_mapping: 0,
                needs_criteria: 1,
                shared_receipts: 2,
                unsupported: 3,
                ready: 4,
                lifecycle_not_task: 5,
                supporting_not_task: 6,
            } as Record<TaskTelemetryMappingRow["mappingState"], number>;
            return stateRank[left.mappingState] - stateRank[right.mappingState]
                || left.displayLabel.localeCompare(right.displayLabel);
        });
        const receiptMappingGroupsMap = rawRecentReceipts.reduce((map, receipt) => {
            const { canonicalEventName } = getTelemetryEventOption(receipt.eventName);
            const mappedDefinitions = allTaskDefinitions.filter((definition) => buildTelemetryEventMetadata(definition.eventName).canonicalEventName === canonicalEventName);
            const lane = classifyTaskReceiptLane(canonicalEventName, mappedDefinitions, receipt.eventName);
            const groupKey = [receipt.eventName, canonicalEventName, lane.receiptLane, lane.mappingState].join(":");
            const current = map.get(groupKey) || {
                eventName: receipt.eventName,
                normalizedAction: canonicalEventName,
                kind: "receipt" as const,
                count: 0,
                mappedTaskIds: mappedDefinitions.map((definition) => definition.id),
                mappedTaskTitles: mappedDefinitions.map((definition) => definition.title),
                receiptLane: lane.receiptLane,
                mappingState: lane.mappingState,
                severity: lane.severity,
                explanation: lane.explanation,
                sampleReceiptIds: [] as string[],
                firstSeenAtUtc: null as string | null,
                lastSeenAtUtc: null as string | null,
            };
            current.count += 1;
            if (current.sampleReceiptIds.length < 3) {
                current.sampleReceiptIds.push(receipt.id);
            }
            const receiptUtc = receipt.timestamp > 0 ? new Date(receipt.timestamp).toISOString() : null;
            if (receiptUtc) {
                current.firstSeenAtUtc = !current.firstSeenAtUtc || receiptUtc < current.firstSeenAtUtc ? receiptUtc : current.firstSeenAtUtc;
                current.lastSeenAtUtc = !current.lastSeenAtUtc || receiptUtc > current.lastSeenAtUtc ? receiptUtc : current.lastSeenAtUtc;
            }
            map.set(groupKey, current);
            return map;
        }, new Map<string, TaskReceiptMappingGroup>());
        const receiptMappingGroups = Array.from(receiptMappingGroupsMap.values()).sort((left, right) => {
            const severityRank = { error: 0, review: 1, info: 2 };
            return severityRank[left.severity] - severityRank[right.severity]
                || right.count - left.count
                || left.eventName.localeCompare(right.eventName);
        });
        const runtimeTaskDriftSummary: RuntimeTaskDriftSummary = {
            generatedAtUtc: new Date(nowMs).toISOString(),
            sampledUsers: runtimeTaskAudit.summary.sampledUsers,
            assignmentCount: runtimeTaskAudit.summary.totalAssignments,
            customAssignedCount: runtimeTaskAudit.summary.customAssignments,
            cooldownDriftCount: runtimeTaskAudit.summary.cooldownConflictUsers,
            unsupportedRuntimeCount: runtimeTaskAudit.summary.unsupportedRuntimeRecords,
            unsupportedRuntimeGroups,
            tasksSampled: runtimeTaskSourceParityRows.length,
            alignedCount: alignedRuntimeTaskCount,
            partialCount: partialRuntimeTaskCount,
            mismatchCount: mismatchRuntimeTaskCount,
            unknownCount: unknownRuntimeTaskCount,
            sourceParityRows: runtimeTaskSourceParityRows,
            state: mismatchRuntimeTaskCount > 0 || unsupportedRuntimeGroups.some((entry) => entry.severity === "error")
                ? "error"
                : partialRuntimeTaskCount > 0 || unknownRuntimeTaskCount > 0 || unsupportedRuntimeGroups.length > 0
                    ? "review"
                    : "live",
        };
        const taskTelemetryMappingSummary: TaskTelemetryMappingSummary = {
            generatedAtUtc: new Date(nowMs).toISOString(),
            alignmentWarningCount: dedupedAlignmentWarnings.length,
            sharedEventCount: sharedEventGroups.length,
            unsupportedRuntimeCount: unsupportedRuntimeGroups.reduce((sum, group) => sum + group.count, 0),
            unsafeSharedEventCount: sharedEventGroups.filter((group) => group.ambiguityState !== "safe_with_criteria").length,
            unsupportedActiveAssignments: unsupportedRuntimeGroups
                .filter((group) => group.source === "assignment" && (group.activityScope === "active" || group.activityScope === "mixed"))
                .reduce((sum, group) => sum + group.count, 0),
            taskTriggerReadyCount: taskTelemetryMappingRows.filter((row) => row.eventPurpose === "task_trigger" && row.mappingState === "ready").length,
            taskTriggerPartialCount: taskTelemetryMappingRows.filter((row) => row.eventPurpose === "task_trigger" && (row.mappingState === "needs_criteria" || row.mappingState === "shared_receipts")).length,
            taskTriggerMissingCount: taskTelemetryMappingRows.filter((row) => row.eventPurpose === "task_trigger" && row.mappingState === "needs_task_mapping").length,
            lifecycleExpectedCount: taskTelemetryMappingRows.filter((row) => row.eventPurpose === "task_lifecycle").length,
            supportingTelemetryCount: taskTelemetryMappingRows.filter((row) => row.mappingState === "supporting_not_task").length,
            sharedEventGroups,
            receiptMappingGroups,
            unsupportedRuntimeGroups,
            alignmentWarnings: dedupedAlignmentWarnings,
            mappingRows: taskTelemetryMappingRows,
        };

        const bugReports: BugReportTriageCard[] = feedbackSnapshot.docs
            .map((doc) => {
                const data = doc.data() as Record<string, unknown>;
                const status = normalizeBugReportStatus(data.status);
                const severity = normalizeBugReportSeverity(data.severity);
                const timestamp = toTimestampNumber(data.timestamp)
                    || toTimestampNumber(data.createdAt)
                    || toNumber(data.createdAtMs);
                const component = (data.component as Record<string, unknown> | undefined) ?? null;
                const path = toStringValue(data.currentPath) || toStringValue(data.path) || "Unknown path";
                const sourceComponent = toStringValue(data.componentName)
                    || toStringValue(component?.name)
                    || toStringValue(data.sourceComponent)
                    || "Unknown component";
                const diagnosticsCount = toNumber(data.diagnosticsCount);
                const breadcrumbsCount = toNumber(data.breadcrumbsCount);
                const rolloutCount = toNumber(data.rolloutCount);
                const inventoryState: BugReportTriageCard["inventoryState"] = diagnosticsCount > 0 || breadcrumbsCount > 0 || rolloutCount > 0 ? "loaded" : "partial";
                const ageBucket: BugReportAgeBucket = timestamp >= weekAgoMs ? "last_7d" : "older_backlog";
                return {
                    reportId: doc.id,
                    id: doc.id,
                    userId: toStringValue(data.userId),
                    email: toStringValue(data.email) || null,
                    title: toStringValue(data.summary) || toStringValue(data.message) || "Untitled bug report",
                    summary: toStringValue(data.summary) || toStringValue(data.message),
                    userMessage: toStringValue(data.message),
                    message: toStringValue(data.message),
                    category: toStringValue(data.category) || "general",
                    status,
                    issueType: toStringValue(data.issueType) || "other",
                    severity,
                    contextId: toStringValue(data.contextId),
                    path,
                    currentPath: path,
                    sourceComponent,
                    componentName: sourceComponent,
                    diagnosticsCount,
                    breadcrumbsCount,
                    rolloutCount,
                    createdAtUtc: timestamp > 0 ? new Date(timestamp).toISOString() : "unknown",
                    timestamp,
                    ageLabel: getBugReportAgeLabel(nowMs, timestamp),
                    ageBucket,
                    state: getBugReportTriageState(status, severity),
                    inventoryState,
                    autoContext: (data.autoContext as Record<string, unknown> | undefined) ?? null,
                    component,
                };
            })
            .filter((item) => item.category === "bug_report")
            .slice(0, 100);
        const bugIntakeTriage = buildBugIntakeTriageSummary(bugReports, nowMs);

        const rollouts = getConfiguredRollouts().map((rollout) => ({
            id: rollout.id,
            label: rollout.label,
            description: rollout.description,
            kind: rollout.kind,
            stage: rollout.stage,
            owner: rollout.owner,
            audience: rollout.audience,
            enabled: rollout.enabled,
            rolloutPercent: rollout.rolloutPercent,
            defaultVariant: rollout.defaultVariant,
            variants: rollout.variants,
            requiredSegments: rollout.requiredSegments ?? [],
            excludedSegments: rollout.excludedSegments ?? [],
            killSwitchable: rollout.killSwitchable !== false,
        }));
        const rolloutSamples = getRolloutEvaluationSamples().map((sample) => ({
            key: sample.key,
            label: sample.label,
            path: sample.path,
            role: sample.role ?? "guest",
            assignments: sample.assignments.map((assignment) => ({
                id: assignment.id,
                variant: assignment.variant,
                reason: assignment.reason,
                active: assignment.active,
                defaultVariant: assignment.defaultVariant,
            })),
        }));
        const rolloutSampleSnapshot = {
            generatedAtMs: nowMs,
            stale: false,
            source: "live_config_evaluation",
        };
        const release = getCurrentRelease();
        const changeLog = getChangelogEntries(8);
        const rolloutRegistryPanel = buildRolloutRegistryPanelState({
            nowMs,
            rollouts: rollouts as Array<Record<string, unknown>>,
            rolloutSamples: rolloutSamples as Array<Record<string, unknown>>,
            release: release as unknown as Record<string, unknown>,
            changeLog: changeLog as unknown as Array<Record<string, unknown>>,
        });

        const orchestration = buildAdminOrchestrationSnapshot({
            eventDocs: orchestrationEventsSnapshot.docs,
            findingDocs: orchestrationFindingsSnapshot.docs,
            proposalDocs: orchestrationRepairProposalsSnapshot.docs,
            actorSummaryDocs: orchestrationActorSummariesSnapshot.docs,
            repairActionDocs: orchestrationRepairActionsSnapshot.docs,
        });
        const panelSystemLogs = buildAdminPanelSystemLogs({
            nowMs,
            recentTransactionsCount: Math.min(20, transactionEntries.length),
            unsupportedTasks: unsupportedTasks.length,
            telemetryValidatedTasks: telemetryOnlyTasks.length + canonicalTasks.length,
            usersWithTaskIssues: assignmentIssues.length,
            completedEventsLast7d: completedEvents7d.length,
            receiptsLast7d: receiptEvents7d.length,
            rewardEventDeltaLast7d: completedEvents7d.length - rewardTransactions7d.length,
            legacyRewardVersionCount: legacyRewardVersionCount,
            trackedTelemetryEvents: telemetryCoverageRows.length,
            orphanedTelemetryEvents: orphanedEventStats.length,
            bugReportsLast7d: bugIntakeTriage.last7dCount,
            rolloutCount: rollouts.length,
            releaseEntryCount: changeLog.length,
            creatorSpendViolationsLast7d: creatorSpendParity.restrictedSpendViolationCount,
            opsHealth,
            orchestration: orchestration.summary,
            routeRuntimeHealth,
                    });
        await syncAdminPanelSystemLogs(panelSystemLogs);

        return finalize(NextResponse.json({
            success: true,
            stats: {
                builtInTasks: taskCoverageSummary.builtIn,
                validatedTasks: taskCoverageSummary.ready,
                readyTasks: taskCoverageSummary.ready,
                partialTasks: taskCoverageSummary.partial,
                canonicalTasks: canonicalTasks.length,
                telemetryValidatedTasks: telemetryOnlyTasks.length,
                telemetryOnlyTasks: telemetryOnlyTasks.length,
                legacyTasks: legacyTasks.length,
                unsupportedTasks: unsupportedTasks.length,
                rewardRiskTasks: taskCoverageSummary.rewardRisk,
                assignmentGapTasks: taskCoverageSummary.assignmentGap,
                trackingGapTasks: taskCoverageSummary.trackingGap,
                completionGapTasks: taskCoverageSummary.completionGap,
                runtimeTaskActions: taskInventorySummary.runtimeActions,
                navigationTaskActions: taskInventorySummary.navigationActions,
                criteriaTasks: taskInventorySummary.criteriaTasks,
                uniqueByParamTasks: taskInventorySummary.uniqueByParamTasks,
                usersWithTaskIssues: assignmentIssues.length,
                runtimeAssignedTasks: runtimeTaskAudit.summary.totalAssignments,
                runtimeBuiltInAssignments: runtimeTaskAudit.summary.builtInAssignments,
                runtimeCustomAssignments: runtimeTaskAudit.summary.customAssignments,
                runtimeUsersWithTasks: runtimeTaskAudit.summary.usersWithAssignedTasks,
                runtimeUsersWithRefreshIssues: runtimeTaskAudit.summary.usersWithRefreshIssues,
                runtimeUnsupportedTaskRecords: runtimeTaskAudit.summary.unsupportedRuntimeRecords,
                runtimeCooldownConflictUsers: runtimeTaskAudit.summary.cooldownConflictUsers,
                runtimeCustomTaskDrift: runtimeTaskAudit.summary.customDefinitionsWithDrift,
                runtimeSharedEventMappings: taskTelemetryMappingSummary.sharedEventCount,
                telemetryAlignmentWarnings: taskTelemetryMappingSummary.alignmentWarningCount,
                telemetryUnsafeSharedEventGroups: taskTelemetryMappingSummary.unsafeSharedEventCount,
                telemetryUnsupportedActiveAssignments: taskTelemetryMappingSummary.unsupportedActiveAssignments,
                taskEventsSamplePartial: taskAuditSample.taskEventsPartial ? 1 : 0,
                taskReceiptsSamplePartial: taskAuditSample.receiptsPartial ? 1 : 0,
                receiptsLast7d: receiptEvents7d.length,
                completedEventsLast7d: completedEvents7d.length,
                rewardTransactionsLast7d: rewardTransactions7d.length,
                rewardEventDeltaLast7d: taskParitySummary.mismatchDelta7d,
                legacyTaskRewardVersions: legacyRewardVersionCount,
                creatorSpendViolationsLast7d: creatorSpendParity.restrictedSpendViolationCount,
                trackedTelemetryEvents: telemetryCoverageRows.length,
                orphanedTelemetryEvents: orphanedEventStats.length,
                bugReportsLast7d: bugIntakeTriage.last7dCount,
                creatorOnboardingIssues: creatorOnboardingDiagnostics.summary.totalIssues,
                orchestrationEvents: orchestration.summary.eventCount,
                orchestrationOpenFindings: orchestration.summary.openFindings,
                orchestrationActionableRepairs: orchestration.summary.actionableProposals,
                orchestrationLowConfidence: orchestration.summary.lowConfidenceEvents,
                rolloutSamples: rolloutSamples.length,
                rolloutSampleGeneratedAtMs: rolloutSampleSnapshot.generatedAtMs,
                releaseEntries: changeLog.length,
                                                                routeRuntimeHealthTracked: routeRuntimeHealth.length,
                routeRuntimeHealthReported: Math.max(0, routeRuntimeHealth.length - routeRuntimeHealthSummary.unobserved),
                routeRuntimeHealthWarnings: routeRuntimeHealthSummary.warn,
                routeRuntimeHealthFailures: routeRuntimeHealthSummary.fail,
                routeRuntimeHealthUnobserved: routeRuntimeHealthSummary.unobserved,
                queueJobsTracked: queueJobHeartbeatSummary.total,
                queueJobsStale: queueJobHeartbeatSummary.stale,
                queueJobsFailed: queueJobHeartbeatSummary.failed,
                runtimeWarningsTracked: runtimeWarningSummary.total,
                runtimeWarningFailures: runtimeWarningSummary.failed,
                runtimeLegacyAdapterUses: runtimeWarningSummary.legacyAdapterUses,
                queueMissingNotificationOutcomes: queueRuntimeSummary.missingNotificationOutcomes,
                behavioralUserProfiles: Number(behavioralSnapshotStatus?.userProfileCount || 0),
                behavioralGuestProfiles: Number(behavioralSnapshotStatus?.guestProfileCount || 0),
                behavioralDropProfiles: Number(behavioralSnapshotStatus?.dropProfileCount || 0),
                analyticsTruthDropMetrics: analyticsTruthDrops.length,
                analyticsTruthUserMetrics: analyticsTruthUsers.length,
                analyticsTruthRepairs: analyticsTruthRepairs.length,
            },
            taskCoverageSummary,
            coverage,
            taskInventorySummary,
            unsupportedTasks,
            telemetryOnlyTasks,
            assignmentIssues,
            taskParity,
            taskParitySummary,
            taskGumdropGuardrails,
            runtimeTaskDriftSummary,
            taskTelemetryMappingSummary,
            taskAuditSample,
            recentTaskEvents: recentTaskEvents.slice(0, 80),
            recentReceipts: recentReceipts.slice(0, 80),
            receiptSummary,
            telemetryCoverageRows: telemetryCoverageRows.slice(0, 76),
            eventStats: telemetryCoverageRows.slice(0, 76),
            orphanedEventStats,
            runtimeTaskAudit,
            taskRollups: taskRollups.slice(0, 30),
            dailyTaskSeries,
            taskRewardConfig: {
                rewardVersion: DAILY_TASK_REWARD_VERSION,
                multiplierPercent: Math.round(DAILY_TASK_REWARD_MULTIPLIER * 100),
                builtInAverageReward: rewardValues.length > 0
                    ? Math.round(rewardValues.reduce((sum, reward) => sum + reward, 0) / rewardValues.length)
                    : 0,
                builtInMinReward: rewardValues.length > 0 ? Math.min(...rewardValues) : 0,
                builtInMaxReward: rewardValues.length > 0 ? Math.max(...rewardValues) : 0,
                customTaskCount: customTaskDefinitionsSummary.length,
                customAverageReward: customRewardAverage,
                legacyRewardVersionCount,
            },
            creatorSpendParity,
            bugIntakeTriage,
            bugReports,
            creatorOnboardingDiagnostics,
            rollouts,
            rolloutSamples,
            rolloutSampleSnapshot,
            rolloutRegistryPanel,
            release,
            changeLog,
            opsHealth,
            orchestration,
            panelSystemLogs,
            routeRuntimeHealth,
            runtimeWarnings,
            queueJobHeartbeats,
            notificationDispatchOutcomes: queueRuntimeOutcomeRows,
            queueRuntimeSummary,
            behavioralSnapshotStatus,
            behavioralDrops,
            behavioralIntelligencePanel,
            telemetryTruthRecoveryPanel,
            analyticsTruthRecovery,
            analyticsTruthDrops,
            analyticsTruthUsers,
            analyticsTruthRepairs,
            adminAnalyticsHotCache: {
                surface: "admin-analytics-hot-cache",
                dataSource: "analytics_admin_metric_snapshots",
                snapshotMetadata: adminMetricSnapshots,
                sourceModes: ["live", "verified_cache", "stale_cache", "intraday", "estimated", "fallback", "unavailable", "mixed"],
                truthStates: ["verified", "stale", "partial", "unavailable", "failed", "refreshing"],
                refreshStatuses: ["idle", "queued", "refreshing", "completed", "failed", "duplicate_prevented", "unavailable"],
                refreshRoute: "/api/admin/analytics/refresh",
                duplicateRefreshPrevented: adminMetricSnapshots.some((snapshot) => snapshot.duplicateRefreshPrevented === true),
                debugFields: [
                    "moduleKey",
                    "rangeKey",
                    "cacheKey",
                    "refreshVersion",
                    "sourceVersion",
                    "sourceMode",
                    "truthState",
                    "refreshCacheState",
                    "lastVerifiedAt",
                    "lastRefreshRequestedAt",
                    "lastRefreshStartedAt",
                    "lastRefreshCompletedAt",
                    "lastRefreshFailedAt",
                    "generatedAt",
                    "refreshStatus",
                    "refreshStartedAt",
                    "refreshCompletedAt",
                    "duplicateRefreshPrevented",
                    "values",
                    "formulas",
                    "sourceBreakdown",
                    "warnings",
                    "parity",
                    "legacyIncluded",
                    "confidence",
                    "staleReason",
                    "unavailableReason",
                    "displaySource",
                    "displayAllowedBecause",
                    "displayBlockedBecause",
                    "refreshDedupeHit",
                    "staleButVerified",
                    "invalidationReason",
                    "estimatedGuestTraffic",
                    "anonymousBatchStatus",
                    "blocksOnRealtime",
                    "blocksOnRefresh",
                    "blocksOnTimeExpiry",
                    "fakeWaitingPrevented",
                    "fakeZeroPrevented",
                    "routerRefreshUsed",
                    "revalidationUsed",
                    "parityWarnings",
                    "primaryDisplaySource",
                    "latestVerifiedSnapshotExists",
                    "latestVerifiedSnapshotAgeMs",
                    "realtimeListenerState",
                    "realtimeBlocksFirstRender",
                    "fallbackSnapshotUsed",
                    "displayStatePolicyApplied",
                    "pureRealtimeDependencyRemoved",
                    "laneFailures",
                ],
                noBlankLoadingRule: "Admin Analytics must render the latest verified snapshot first when one exists; realtime is an upgrade, not a loading dependency.",
                fakeZeroRule: "Snapshot values use null/unavailable with fakeZeroPrevented=true when a source is missing; missing values must not be coerced to zero.",
                realtimeDependencyPolicy: {
                    primaryDisplaySource: "verified_cache_or_stale_cache_before_realtime",
                    latestVerifiedSnapshotExists: "module-specific boolean from snapshot or hot route cache",
                    latestVerifiedSnapshotAgeMs: "client/server metadata when available",
                    realtimeListenerState: "debug-only listener status; never a first-render blocker when a verified snapshot exists",
                    realtimeBlocksFirstRender: false,
                    fallbackSnapshotUsed: "true when a last validated route snapshot is visible during refresh or realtime delay",
                    refreshStatus: "idle | queued | refreshing | completed | failed | duplicate_prevented | unavailable",
                    refreshCacheStates: ["verified", "refreshing", "refresh_failed", "stale_but_verified", "unavailable", "pending_first_snapshot", "server_confirmed", "cache_confirmed", "estimated", "mixed", "legacy_mapped"],
                    unavailableReason: "only visible when no verified snapshot and no valid realtime source exist",
                    fakeZeroPrevented: "null/unavailable values remain null until a source confirms zero",
                    displayStatePolicyApplied: true,
                    pureRealtimeDependencyRemoved: true,
                    laneFailures: "full realtime lane failures remain in Admin Debug/client debug metadata",
                },
            },
            adminAnalyticsSnapshotMigration: {
                surface: "admin-analytics-snapshot-migration",
                snapshotFirstMigrationEnabled: true,
                verifiedSnapshotFirstRenderPath: true,
                manualRefreshEnabled: true,
                realtimeUpgradeOptional: true,
                dataValidationFullListLocation: "Admin Debug validation groups; Admin Analytics may only show the compact Data Health summary.",
                manualRefreshRoute: "/api/admin/analytics/refresh",
                clientDebugWindow: "window.__KANDYDROPS_ADMIN_ANALYTICS_SNAPSHOT_MIGRATION_DEBUG__",
                actorLaneRules: {
                    guestAuthenticatedCreatorAdminSystemSeparated: true,
                    adminExcludedFromUserGuestBehavior: true,
                    unknownActorNeverPromotedToAuthenticatedUser: true,
                },
                modules: ADMIN_ANALYTICS_MATERIALIZER_REGISTRY.map((entry) => {
                    const latestSnapshot = adminMetricSnapshots.find((snapshot) => snapshot.moduleKey === entry.moduleKey) ?? null;
                    return {
                        moduleKey: entry.moduleKey,
                        label: entry.label,
                        supportedRanges: entry.supportedRanges,
                        currentImplementationStatus: entry.currentImplementationStatus,
                        canonicalSources: entry.canonicalSources,
                        parityChecksRequired: entry.parityChecksRequired,
                        legacySupportStatus: entry.legacySupportStatus,
                        cacheKey: latestSnapshot?.cacheKey ?? null,
                        refreshVersion: latestSnapshot?.refreshVersion ?? 0,
                        sourceVersion: latestSnapshot?.sourceVersion ?? null,
                        sourceMode: latestSnapshot?.sourceMode ?? "unavailable",
                        truthState: latestSnapshot?.truthState ?? "unavailable",
                        refreshCacheState: latestSnapshot?.refreshCacheState ?? "unavailable",
                        lastVerifiedAt: latestSnapshot?.lastVerifiedAt ?? null,
                        lastRefreshRequestedAt: latestSnapshot?.lastRefreshRequestedAt ?? null,
                        lastRefreshStartedAt: latestSnapshot?.lastRefreshStartedAt ?? null,
                        lastRefreshCompletedAt: latestSnapshot?.lastRefreshCompletedAt ?? null,
                        lastRefreshFailedAt: latestSnapshot?.lastRefreshFailedAt ?? null,
                        generatedAt: latestSnapshot?.generatedAt ?? null,
                        refreshStatus: latestSnapshot?.refreshStatus ?? "unavailable",
                        duplicateRefreshPrevented: latestSnapshot?.duplicateRefreshPrevented ?? false,
                        staleButVerified: latestSnapshot?.staleButVerified ?? false,
                        invalidationReason: latestSnapshot?.invalidationReason ?? null,
                        displaySource: latestSnapshot?.displaySource ?? "unavailable",
                        displayAllowedBecause: latestSnapshot?.displayAllowedBecause ?? null,
                        displayBlockedBecause: latestSnapshot?.displayBlockedBecause ?? "no_verified_snapshot",
                        blocksOnRealtime: false,
                        blocksOnRefresh: false,
                        blocksOnTimeExpiry: false,
                        fakeWaitingPrevented: latestSnapshot?.fakeWaitingPrevented ?? false,
                        confidence: latestSnapshot?.confidence ?? 0,
                        warningCount: latestSnapshot?.warningCount ?? 0,
                        parityCount: latestSnapshot?.parityCount ?? 0,
                        legacyIncluded: latestSnapshot?.legacyIncluded ?? false,
                        debugPath: latestSnapshot?.debugPath ?? `/admin/debug?tab=advanced#analytics-snapshots/${entry.moduleKey}`,
                        fakeZeroPreventedPolicy: "Missing source values remain null/unavailable and are detailed in Debug.",
                    };
                }),
                compactAnalyticsRules: [
                    "No giant empty charts.",
                    "No repeated degraded badge spam.",
                    "No backend jargon in visible operator copy.",
                    "Detailed source, parity, legacy, and failure proof lives in Admin Debug.",
                ],
            },
            adminAnalyticsLegacyParity: buildAnalyticsLegacyParityDebugMetadata(),
            adminAnalyticsOverview: {
                surface: "admin-analytics-overview",
                pageId: "admin/analytics",
                badgeLabels: ["LIVE", "STALE", "CACHE", "WAITING", "FALLBACK", "ERROR", "UNAVAILABLE"],
                visibleDegradedCopy: [
                    "Realtime analytics is delayed. Showing the last validated backend snapshot while refresh runs.",
                    "Some guest traffic is estimated until anonymous batches arrive.",
                ],
                fullDegradedReasonsSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_OVERVIEW_DEBUG__.fullDegradedReasons",
                metricsSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_OVERVIEW_DEBUG__.metrics",
                hydrationBudgetMs: 3000,
                detailedLaneFailuresLocation: "Admin Analytics client debug metadata",
                fakeZeroPolicy: "Overview cards show Waiting or Unavailable until a server-confirmed or last validated snapshot value exists.",
            },
            adminAnalyticsAudienceSnapshot: {
                surface: "admin-analytics-audience-snapshot",
                pageId: "admin/analytics?tab=audience",
                selectedRangeSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_AUDIENCE_SNAPSHOT_DEBUG__.selectedRange",
                totalUsersSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_AUDIENCE_SNAPSHOT_DEBUG__.totalUsers.source",
                identifiedUsersSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_AUDIENCE_SNAPSHOT_DEBUG__.identifiedUsers.source",
                guestEstimateFormulaSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_AUDIENCE_SNAPSHOT_DEBUG__.guestEstimateFormula",
                debugFields: [
                    "selectedRange",
                    "totalUsers",
                    "identifiedUsers",
                    "identifiedViews",
                    "guestVisits",
                    "guestEstimateFormula",
                    "guestEstimateFormulaUsed",
                    "guestEstimateClamped",
                    "sessions",
                    "views",
                    "avgSession",
                    "engagementRate",
                    "gaDailyTableAvailability",
                    "gaIntradayTableAvailability",
                    "firstPartyAnonymousBatchAvailability",
                    "firstPartyIdentifiedAvailability",
                    "backendCacheStatus",
                    "lastValidatedAt",
                    "refreshStatus",
                    "chartSeries",
                    "chartHeightClass",
                    "badgeOverflowProtectionEnabled",
                    "fakeZeroPrevented",
                ],
                chartPrimaryLine: "white",
                mobileChartHeightClass: "h-44 md:h-64",
                badgeLabels: ["LIVE", "STALE", "EST", "CACHE", "WAIT", "ERROR"],
            },
            adminAnalyticsCommerceSnapshot: {
                surface: "admin-analytics-commerce-snapshot",
                pageId: "admin/analytics?tab=commerce",
                selectedRangeSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_COMMERCE_SNAPSHOT_DEBUG__.selectedRange",
                revenueSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_COMMERCE_SNAPSHOT_DEBUG__.revenueSource",
                adjustedProfitFormulaSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_COMMERCE_SNAPSHOT_DEBUG__.adjustedProfitFormula",
                yieldFormulaSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_COMMERCE_SNAPSHOT_DEBUG__.yieldPer100GdFormula",
                checkoutConversionFormulaSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_COMMERCE_SNAPSHOT_DEBUG__.checkoutConversionFormula",
                debugFields: [
                    "selectedRange",
                    "revenueValue",
                    "revenueSource",
                    "adjustedProfitValue",
                    "adjustedProfitFormula",
                    "checkoutStartsValue",
                    "checkoutStartsSource",
                    "purchaseCompletionsValue",
                    "purchaseCompletionsSource",
                    "checkoutConversionValue",
                    "checkoutConversionFormula",
                    "walletOpensValue",
                    "walletOpensSource",
                    "gdSpentValue",
                    "gdSpentSource",
                    "paidGdSpentValue",
                    "bonusGdSpentValue",
                    "promoGdSpentValue",
                    "promoValueGranted",
                    "bonusGdGranted",
                    "paypalSourceStatus",
                    "internalPurchaseSourceStatus",
                    "gaCommerceSourceStatus",
                    "backendCacheStatus",
                    "lastValidatedAt",
                    "refreshStatus",
                    "serverConfirmed",
                    "stale",
                    "cache",
                    "fallback",
                    "driftFlags",
                    "fakeZeroPrevented",
                    "duplicateRefreshPrevented",
                    "badgeOverflowProtectionEnabled",
                    "mobileDensityClass",
                ],
                canonicalRevenueRule: "Revenue means completed real-money currency purchases only. Promo, bonus, and admin grant value are excluded.",
                mobileDensityClass: "compact-commerce-panel",
                badgeLabels: ["LIVE", "STALE", "CACHE", "EST", "WAIT", "ERROR"],
            },
            adminAnalyticsLivePulse: {
                surface: "admin-analytics-live-pulse",
                pageId: "admin/analytics?tab=operations",
                debugSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_LIVE_PULSE_DEBUG__",
                livePulseEnabled: "window.__KANDYDROPS_ADMIN_ANALYTICS_LIVE_PULSE_DEBUG__.livePulseEnabled",
                selectedWindow: "window.__KANDYDROPS_ADMIN_ANALYTICS_LIVE_PULSE_DEBUG__.selectedWindow",
                canonicalPresenceSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_LIVE_PULSE_DEBUG__.canonicalPresenceSource",
                rawIdentityIdsLocation: "window.__KANDYDROPS_ADMIN_ANALYTICS_LIVE_PULSE_DEBUG__.rawIdentityIds",
                debugFields: [
                    "activeCount",
                    "guestCount",
                    "authenticatedCount",
                    "adminCount",
                    "topSurface",
                    "surfaces",
                    "activeIdentities",
                    "rawIdentityIds",
                    "presenceSourceStatus",
                    "rtdbPresenceStatus",
                    "onDisconnectRegistered",
                    "reconnectReestablishesOnDisconnect",
                    "firestoreFromCache",
                    "includeMetadataChanges",
                    "backendSnapshotStatus",
                    "gaIntradayStatus",
                    "graphSource",
                    "graphPointCount",
                    "graphHydrated",
                    "graphHydratedMs",
                    "graphSourceMismatch",
                    "graphDerivedFromPresence",
                    "firstPresenceRowMs",
                    "firstGraphPointMs",
                    "stalePresenceRows",
                    "fakeZeroPrevented",
                    "duplicateRefreshPrevented",
                    "hydrationBudgetExceeded",
                ],
                visibleIdentityRule: "Raw IDs are debug-only. The main UI shows actor type, route, action, freshness, and a short session fallback.",
                badgeLabels: ["LIVE", "STALE", "SNAP", "WAIT", "ERROR", "GUEST", "AUTH"],
                mobileChartHeightClass: "h-36 md:h-56",
            },
            adminAnalyticsJourneyFunnel: {
                surface: "admin-analytics-journey-funnel",
                pageId: "admin/analytics?tab=operations",
                debugSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_JOURNEY_FUNNEL_DEBUG__",
                selectedRange: "window.__KANDYDROPS_ADMIN_ANALYTICS_JOURNEY_FUNNEL_DEBUG__.selectedRange",
                funnelMode: "window.__KANDYDROPS_ADMIN_ANALYTICS_JOURNEY_FUNNEL_DEBUG__.funnelMode",
                denominatorMode: "window.__KANDYDROPS_ADMIN_ANALYTICS_JOURNEY_FUNNEL_DEBUG__.denominatorMode",
                debugFields: [
                    "steps",
                    "supportingMetrics",
                    "nonSequentialSteps",
                    "sourceMismatchSteps",
                    "onboardingComparison",
                    "journeyStatsComparison",
                    "biggestDropoffStep",
                    "biggestDropoffPercent",
                    "degradedReasons",
                    "visibleDegradedCopy",
                    "hydrationMs",
                    "duplicateRefreshPrevented",
                    "badgeOverflowProtectionEnabled",
                ],
                countModeRule: "Current Journey Funnel UI is an Event Chain when only raw repeated event counts are available.",
                orderedFunnelRule: "Do not label raw event ratios as ordered conversion without actor/session ordered transitions.",
                badgeLabels: ["LIVE", "STALE", "RAW", "UNIQUE", "ORDERED", "MIXED", "WAIT", "ERROR"],
            },
            adminAnalyticsAuthOutcomeSplit: {
                surface: "admin-analytics-auth-outcome-split",
                pageId: "admin/analytics?tab=operations",
                debugSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_AUTH_OUTCOME_SPLIT_DEBUG__",
                selectedRange: "window.__KANDYDROPS_ADMIN_ANALYTICS_AUTH_OUTCOME_SPLIT_DEBUG__.selectedRange",
                sectionSourceMode: "window.__KANDYDROPS_ADMIN_ANALYTICS_AUTH_OUTCOME_SPLIT_DEBUG__.sectionSourceMode",
                canonicalSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_AUTH_OUTCOME_SPLIT_DEBUG__.canonicalSource",
                currentSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_AUTH_OUTCOME_SPLIT_DEBUG__.currentSource",
                debugFields: [
                    "attempts",
                    "successes",
                    "failures",
                    "unfinished",
                    "successRate",
                    "successRateFormula",
                    "avgFinish",
                    "timingAvailable",
                    "timingState",
                    "timingMissingReason",
                    "generatedAtUtc",
                    "lastAuthEventAtUtc",
                    "methodBreakdown",
                    "lifecycleOutcomes",
                    "rawEventNames",
                    "reconciliationDelta",
                    "weakestMethod",
                    "mostFailuresMethod",
                    "mostUnfinishedMethod",
                    "recommendation",
                    "fakeZeroPrevented",
                    "duplicateRefreshPrevented",
                    "badgeOverflowProtectionEnabled",
                ],
                successRateRule: "Success rate is successes divided by attempts for the selected range.",
                timingRule: "Avg finish is unavailable unless successful attempts include positive start/end duration data.",
                registeredUsersRule: "Registered users is an outcome, not an auth method, unless a canonical source explicitly classifies it as a method.",
                badgeLabels: ["LIVE", "STALE", "RAW", "MIXED", "WAIT", "ERROR"],
                mobileDensityClass: "compact-auth-outcome-panel",
            },
            adminAnalyticsOnboardingVelocity: {
                surface: "admin-analytics-onboarding-velocity",
                pageId: "admin/analytics?tab=operations",
                debugSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_ONBOARDING_VELOCITY_DEBUG__",
                selectedRange: "window.__KANDYDROPS_ADMIN_ANALYTICS_ONBOARDING_VELOCITY_DEBUG__.selectedRange",
                canonicalOnboardingSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_ONBOARDING_VELOCITY_DEBUG__.canonicalOnboardingSource",
                onboardingStartsSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_ONBOARDING_VELOCITY_DEBUG__.onboardingStarts.source",
                debugFields: [
                    "onboardingStarts",
                    "onboardingCompletions",
                    "onboardingDropoffs",
                    "completionRateMetric",
                    "avgCompletionTime",
                    "medianCompletionTime",
                    "durationBucketCounts",
                    "durationBucketTotal",
                    "bucketReconciliationDelta",
                    "authSignups",
                    "onboardingStepFlowStarts",
                    "discrepancyDetected",
                    "discrepancyType",
                    "discrepancySummary",
                    "discrepancyFormula",
                    "discrepancySeverity",
                    "expectedMismatch",
                    "timingMissing",
                    "missingStartTimestampCount",
                    "missingCompletionTimestampCount",
                    "stale",
                    "cache",
                    "serverConfirmed",
                    "fallback",
                    "estimated",
                    "fromCache",
                    "hasPendingWrites",
                    "gaSource",
                    "fakeZeroPrevented",
                    "hydrationMs",
                    "duplicateRefreshPrevented",
                    "compactLayoutApplied",
                ],
                completionRateRule: "Completion rate is onboarding completions divided by canonical onboarding starts.",
                dropoffRule: "Drop-offs are onboarding starts minus onboarding completions.",
                durationRule: "Duration is unavailable unless start and completion timestamps produce a positive completion duration.",
                authSignupRule: "Auth sign-ups and onboarding starts are different events and must not be forced to match.",
                badgeLabels: ["LIVE", "STALE", "MIXED", "WAIT", "ERROR"],
                mobileChartHeightClass: "h-36 md:h-52",
            },
            adminAnalyticsOnboardingPerformance: {
                surface: "admin-analytics-onboarding-performance",
                pageId: "admin/analytics?tab=operations",
                debugSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_ONBOARDING_PERFORMANCE_DEBUG__",
                selectedRange: "window.__KANDYDROPS_ADMIN_ANALYTICS_ONBOARDING_PERFORMANCE_DEBUG__.selectedRange",
                canonicalOnboardingSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_ONBOARDING_PERFORMANCE_DEBUG__.canonicalOnboardingSource",
                onboardingStartsSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_ONBOARDING_PERFORMANCE_DEBUG__.onboardingStarts.source",
                debugFields: [
                    "onboardingStarts",
                    "onboardingCompletions",
                    "onboardingDropoffs",
                    "completionRateMetric",
                    "avgCompletionTime",
                    "medianCompletionTime",
                    "durationBucketCounts",
                    "durationBucketTotal",
                    "bucketReconciliationDelta",
                    "perStep",
                    "stepConversionFormula",
                    "stepDropoffFormula",
                    "biggestDropoffStep",
                    "biggestDropoffCount",
                    "slowestStep",
                    "slowestStepAvgSeconds",
                    "fastestStep",
                    "authSignups",
                    "discrepancyDetected",
                    "discrepancyType",
                    "discrepancySummary",
                    "discrepancyFormula",
                    "discrepancySeverity",
                    "expectedMismatch",
                    "timingMissing",
                    "missingStartTimestampCount",
                    "missingCompletionTimestampCount",
                    "stale",
                    "cache",
                    "serverConfirmed",
                    "fallback",
                    "estimated",
                    "fromCache",
                    "hasPendingWrites",
                    "gaSource",
                    "fakeZeroPrevented",
                    "hydrationMs",
                    "duplicateRefreshPrevented",
                    "consolidatedModuleEnabled",
                ],
                completionRateRule: "Completion rate is onboarding completions divided by canonical onboarding starts.",
                dropoffRule: "Drop-offs are onboarding starts minus onboarding completions.",
                stepConversionRule: "Step conversion is step completions divided by step starts.",
                stepDropoffRule: "Step drop-offs are step starts minus step completions.",
                durationRule: "Duration is unavailable unless start and completion timestamps produce a positive completion duration.",
                authSignupRule: "Auth sign-ups and onboarding starts are different events and must not be forced to match.",
                badgeLabels: ["LIVE", "STALE", "MIXED", "WAIT", "ERROR"],
                mobileDensityClass: "consolidated-compact-onboarding-performance",
            },
            adminAnalyticsGuestBounceQuality: {
                surface: "admin-analytics-guest-bounce-quality",
                pageId: "admin/analytics?tab=operations",
                debugSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_GUEST_BOUNCE_QUALITY_DEBUG__",
                selectedRange: "window.__KANDYDROPS_ADMIN_ANALYTICS_GUEST_BOUNCE_QUALITY_DEBUG__.selectedRange",
                moduleTruthState: "window.__KANDYDROPS_ADMIN_ANALYTICS_GUEST_BOUNCE_QUALITY_DEBUG__.moduleTruthState",
                debugFields: [
                    "guestViews",
                    "guestViewsEstimated",
                    "guestEstimateFormula",
                    "guestEstimateClamped",
                    "guestBounce",
                    "guestEngaged",
                    "signedInBounce",
                    "semanticBatchStatus",
                    "consentedGuestBatchStatus",
                    "anonymousFirstPartyBatchStatus",
                    "identifiedFirstPartyTrafficStatus",
                    "gaTotalsStatus",
                    "gaDailyStatus",
                    "gaIntradayStatus",
                    "backendCacheStatus",
                    "stale",
                    "cache",
                    "serverConfirmed",
                    "fallback",
                    "fromCache",
                    "hasPendingWrites",
                    "chartSeriesStatus",
                    "chartCollapsedBecauseEmpty",
                    "duplicateRefreshPrevented",
                    "visibleCopy",
                    "fullTechnicalReason",
                ],
                guestEstimateRule: "Estimated guest views may use GA total views minus identified first-party views only when definitions and ranges are compatible.",
                guestQualityRule: "Guest bounce and engagement are unavailable without consented guest quality batches.",
                signedInBounceRule: "Signed-in bounce cannot render 0% unless signed-in visit denominator is server-confirmed and non-zero.",
                chartRule: "Collapse the chart when quality series are empty or guest quality is unavailable.",
                badgeLabels: ["LIVE", "EST", "STALE", "WAIT", "PARTIAL", "ERROR", "NO SAMPLE"],
                mobileDensityClass: "compact-guest-quality-panel",
            },
            adminAnalyticsEventMix: {
                surface: "admin-analytics-event-mix",
                pageId: "admin/analytics?tab=operations",
                debugSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_EVENT_MIX_DEBUG__",
                selectedRange: "window.__KANDYDROPS_ADMIN_ANALYTICS_EVENT_MIX_DEBUG__.selectedRange",
                eventMixSourceMode: "window.__KANDYDROPS_ADMIN_ANALYTICS_EVENT_MIX_DEBUG__.eventMixSourceMode",
                debugFields: [
                    "totalEventsInRange",
                    "denominatorAvailable",
                    "topEvent",
                    "topEventShare",
                    "eventRows",
                    "shareFormula",
                    "componentContextStatus",
                    "mappedSurfaceCount",
                    "unmappedEventCount",
                    "missingSurfaceMappings",
                    "contextHydrationStatus",
                    "contextHydrationMs",
                    "refreshStatus",
                    "staleSnapshotUsed",
                    "fakeZeroPrevented",
                    "duplicateRefreshPrevented",
                    "visibleCopy",
                    "fullTechnicalReason",
                ],
                rawCountRule: "Event Mix shows raw event counts unless unique actors or sessions are explicitly available.",
                shareRule: "Share is event count divided by total counted events in the selected range.",
                contextRule: "Do not show 0 surfaces unless mapping ran successfully; use Surface context unavailable when context did not hydrate.",
                labelRule: "Visible labels are readable display labels; raw event keys remain in Debug.",
                badgeLabels: ["RAW", "LIVE", "STALE", "GA", "FIRST", "MIXED", "WAIT", "ERROR"],
                mobileDensityClass: "compact-ranked-event-list",
            },
            adminAnalyticsLiveInteractionStream: {
                surface: "admin-analytics-live-interaction-stream",
                pageId: "admin/analytics?tab=operations",
                debugSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_LIVE_INTERACTION_STREAM_DEBUG__",
                selectedRange: "window.__KANDYDROPS_ADMIN_ANALYTICS_LIVE_INTERACTION_STREAM_DEBUG__.selectedRange",
                streamSourceMode: "window.__KANDYDROPS_ADMIN_ANALYTICS_LIVE_INTERACTION_STREAM_DEBUG__.streamSourceMode",
                debugFields: [
                    "visibleEventCount",
                    "rawEventCount",
                    "adminExcludedCount",
                    "systemExcludedCount",
                    "unknownActorCount",
                    "uniqueActorCount",
                    "failureCount",
                    "duplicateGroupedCount",
                    "topSurface",
                    "lastEventAt",
                    "streamHydratedMs",
                    "streamSourceStatus",
                    "stale",
                    "cache",
                    "serverConfirmed",
                    "fallback",
                    "realtime",
                    "fromCache",
                    "hasPendingWrites",
                    "eventRows",
                    "excludedRows",
                    "rawActorId",
                    "actorClassificationRules",
                    "missingSurfaceMappings",
                    "fakeZeroPrevented",
                    "duplicateRefreshPrevented",
                    "visibleCopy",
                    "streamSourceStatusDetail",
                ],
                adminExclusionRule: "Admin route and admin event rows are excluded from the user/guest interaction stream and counted in adminExcludedCount.",
                systemExclusionRule: "System/internal events stay out of this stream unless a future module explicitly allows them.",
                labelRule: "Visible rows use readable labels and compact event categories; raw event keys and raw actor IDs remain in Debug.",
                liveTruthRule: "Backend snapshots are labeled SNAP or STALE; normal GA/Firebase batch exports must not be called live.",
                duplicateRule: "Repeated task events are compacted by actor, event, route, detail, and a short time bucket.",
                badgeLabels: ["LIVE", "SNAP", "STALE", "MIXED", "WAIT", "ERROR"],
                mobileDensityClass: "compact-live-interaction-stream",
            },
            adminAnalyticsDailyTaskPipeline: {
                surface: "admin-analytics-daily-task-pipeline",
                pageId: "admin/analytics?tab=operations",
                debugSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_DAILY_TASK_PIPELINE_DEBUG__",
                selectedRange: "window.__KANDYDROPS_ADMIN_ANALYTICS_DAILY_TASK_PIPELINE_DEBUG__.selectedRange",
                pipelineMode: "window.__KANDYDROPS_ADMIN_ANALYTICS_DAILY_TASK_PIPELINE_DEBUG__.pipelineMode",
                canonicalTaskSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_DAILY_TASK_PIPELINE_DEBUG__.canonicalTaskSource",
                telemetryTaskSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_DAILY_TASK_PIPELINE_DEBUG__.telemetryTaskSource",
                lifecycleLogSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_DAILY_TASK_PIPELINE_DEBUG__.lifecycleLogSource",
                userTaskStateSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_DAILY_TASK_PIPELINE_DEBUG__.userTaskStateSource",
                debugFields: [
                    "assignedCount",
                    "startedCount",
                    "completedCount",
                    "failedCount",
                    "remindersCount",
                    "guideShownCount",
                    "guideTapCount",
                    "startRate",
                    "completionRate",
                    "failRate",
                    "stuckAssignedCount",
                    "startedNotCompletedCount",
                    "orphanStartedCount",
                    "orphanCompletedCount",
                    "assignmentStateMissingCount",
                    "telemetryStateMismatchCount",
                    "stateTelemetryMissingCount",
                    "topFailingTaskType",
                    "topLeakingStage",
                    "perTaskBreakdown",
                    "taskLeaderboardConsolidated",
                    "standaloneTaskLeaderboardRemoved",
                    "leaderboardMode",
                    "taskCatalogSource",
                    "taskLeaderboardRows",
                    "taskLeaderboardPageSize",
                    "topCompletedTask",
                    "topRewardTask",
                    "topFailingTask",
                    "worstCompletionRateTask",
                    "largestAssignedNotStartedTask",
                    "rewardMismatchCount",
                    "lifecycleMismatchCount",
                    "timingPartialCount",
                    "leaderboardPipelineDelta",
                    "speedTimingDelta",
                    "completionSpeedConsolidated",
                    "standaloneTaskCompletionSpeedRemoved",
                    "speedSource",
                    "totalCompletedCount",
                    "timedCompletionCount",
                    "timingCoveragePercent",
                    "avgCompletionSeconds",
                    "medianCompletionSeconds",
                    "speedBuckets",
                    "fastestBucket",
                    "slowestBucket",
                    "slowTaskCount",
                    "slowThresholdSeconds",
                    "missingStartTimestampCount",
                    "missingCompletionTimestampCount",
                    "durationRejectedCount",
                    "speedBucketReconciliationDelta",
                    "sourceReconciliation",
                    "timingRecommendation",
                    "stale",
                    "cache",
                    "serverConfirmed",
                    "fallback",
                    "estimated",
                    "fromCache",
                    "hasPendingWrites",
                    "fakeZeroPrevented",
                    "duplicateRefreshPrevented",
                    "recommendation",
                    "visibleCopy",
                ],
                lifecycleRule: "Assigned, started, completed, and failed come from task lifecycle logs when available.",
                guidanceRule: "Guide views, guide taps, and reminders are guidance signals and are not rendered as lifecycle stages.",
                strictPipelineRule: "A strict lifecycle pipeline requires identity linkage across userId/sessionId, taskId, assignment, start, and completion/failure timestamps.",
                completionSpeedRule: "Task completion speed is consolidated into Daily Task Pipeline and requires linked start/completion timestamps. Buckets count timed completions only.",
                taskLeaderboardRule: "Task Leaderboard is consolidated into Daily Task Pipeline. Rows are ranked by completions and expose lifecycle, reward, timing, and pipeline parity checks.",
                standaloneTaskCompletionSpeedRemoved: true,
                standaloneTaskLeaderboardRemoved: true,
                badgeLabels: ["STATE", "MIXED", "RAW", "STALE", "WAIT"],
                mobileDensityClass: "compact-task-lifecycle-panel",
            },
            adminAnalyticsNotificationFunnel: {
                surface: "admin-analytics-notification-funnel",
                pageId: "admin/analytics?tab=operations",
                debugSource: "window.__KANDYDROPS_ADMIN_ANALYTICS_NOTIFICATION_FUNNEL_DEBUG__",
                selectedRange: "window.__KANDYDROPS_ADMIN_ANALYTICS_NOTIFICATION_FUNNEL_DEBUG__.selectedRange",
                funnelSourceMode: "window.__KANDYDROPS_ADMIN_ANALYTICS_NOTIFICATION_FUNNEL_DEBUG__.funnelSourceMode",
                promptCount: "window.__KANDYDROPS_ADMIN_ANALYTICS_NOTIFICATION_FUNNEL_DEBUG__.promptCount",
                enabledCount: "window.__KANDYDROPS_ADMIN_ANALYTICS_NOTIFICATION_FUNNEL_DEBUG__.enabledCount",
                sentCount: "window.__KANDYDROPS_ADMIN_ANALYTICS_NOTIFICATION_FUNNEL_DEBUG__.sentCount",
                openCount: "window.__KANDYDROPS_ADMIN_ANALYTICS_NOTIFICATION_FUNNEL_DEBUG__.openCount",
                readCount: "window.__KANDYDROPS_ADMIN_ANALYTICS_NOTIFICATION_FUNNEL_DEBUG__.readCount",
                clearAllCount: "window.__KANDYDROPS_ADMIN_ANALYTICS_NOTIFICATION_FUNNEL_DEBUG__.clearAllCount",
                duplicateCreatedPreventedCount: "window.__KANDYDROPS_ADMIN_ANALYTICS_NOTIFICATION_FUNNEL_DEBUG__.duplicateCreatedPreventedCount",
                duplicatePushPreventedCount: "window.__KANDYDROPS_ADMIN_ANALYTICS_NOTIFICATION_FUNNEL_DEBUG__.duplicatePushPreventedCount",
                duplicateBrowserDisplayPreventedCount: "window.__KANDYDROPS_ADMIN_ANALYTICS_NOTIFICATION_FUNNEL_DEBUG__.duplicateBrowserDisplayPreventedCount",
                skippedPermissionDeniedCount: "window.__KANDYDROPS_ADMIN_ANALYTICS_NOTIFICATION_FUNNEL_DEBUG__.skippedPermissionDeniedCount",
                skippedMissingTokenCount: "window.__KANDYDROPS_ADMIN_ANALYTICS_NOTIFICATION_FUNNEL_DEBUG__.skippedMissingTokenCount",
                skippedPreferencesDisabledCount: "window.__KANDYDROPS_ADMIN_ANALYTICS_NOTIFICATION_FUNNEL_DEBUG__.skippedPreferencesDisabledCount",
                queuedDropReturnLiveNotificationCount: "window.__KANDYDROPS_ADMIN_ANALYTICS_NOTIFICATION_FUNNEL_DEBUG__.queuedDropReturnLiveNotificationCount",
                foregroundMessageCount: "window.__KANDYDROPS_ADMIN_ANALYTICS_NOTIFICATION_FUNNEL_DEBUG__.foregroundMessageCount",
                backgroundMessageCount: "window.__KANDYDROPS_ADMIN_ANALYTICS_NOTIFICATION_FUNNEL_DEBUG__.backgroundMessageCount",
                serviceWorkerDisplayCount: "window.__KANDYDROPS_ADMIN_ANALYTICS_NOTIFICATION_FUNNEL_DEBUG__.serviceWorkerDisplayCount",
                notificationReadPersistenceLagMs: "window.__KANDYDROPS_ADMIN_ANALYTICS_NOTIFICATION_FUNNEL_DEBUG__.notificationReadPersistenceLagMs",
                unreadCountReconciled: "window.__KANDYDROPS_ADMIN_ANALYTICS_NOTIFICATION_FUNNEL_DEBUG__.unreadCountReconciled",
                browserSupportFlags: "window.__KANDYDROPS_ADMIN_ANALYTICS_NOTIFICATION_FUNNEL_DEBUG__.browserSupportFlags",
                dedupeRule: "Drop notifications use deterministic idempotency keys and browser tags. FCM web pushes are data-only so the service worker owns display.",
                readPersistenceRule: "Read and clear actions optimistically update local unread state, then persist through /api/notifications and reconcile on failure.",
                queuedDropReturnLiveRule: "Auto-queued drops returning live use the drop_requeued_live lifecycle key and backend activation reservation.",
                badgeLabels: ["LIVE", "STALE", "PARTIAL", "WAIT"],
                mobileDensityClass: "compact-notification-funnel",
            },
            adminDataValidation: {
                surface: "admin-data-validation",
                dataValidationMovedFromAnalytics: true,
                analyticsValidationSectionRemoved: true,
                analyticsCompactHealthSummaryEnabled: false,
                debugValidationSurfacePath: "/admin/debug?tab=advanced#data-validation",
                debugDeepLinkAvailable: true,
                validationSourceRoute: "/api/admin/analytics/historical?section=dataValidation&period=30d",
                validationChecksSource: "DebugAdvancedDataValidation fetches scoped historical validations and renders grouped rows.",
                validationStatuses: ["pass", "warn", "fail", "unavailable", "stale", "unknown"],
                passRule: "PASS is allowed only when required sources exist, required samples are present, freshness is not stale, and thresholds pass.",
                staleRule: "Stale validation cannot render as PASS unless a future check explicitly validates stale-cache freshness.",
                groupedSections: [
                    "Analytics source health",
                    "Telemetry parity",
                    "Commerce parity",
                    "Unlock/watch parity",
                    "Onboarding/task parity",
                    "Module coverage",
                    "Historical freshness",
                ],
                debugFields: [
                    "checkKey",
                    "title",
                    "status",
                    "source",
                    "selectedRange",
                    "lastValidatedAt",
                    "freshnessState",
                    "confidence",
                    "requiredSourcesPresent",
                    "sampleRequired",
                    "sampleCount",
                    "passAllowed",
                    "passBlockedReason",
                    "action",
                    "fullDetails",
                ],
                duplicateRefreshPrevented: true,
            },
            adminShellLayout: buildAdminShellLayoutDebugMetadata(request.nextUrl.pathname),
            verification: buildServerAdminModuleVerification({
                module: "admin_debug",
                canonicalSource: "runtime_warning_records+route_runtime_health+admin_ui_chart_health",
                fallbackSource: "panel_system_logs",
                freshnessTimestamp: Math.max(
                    routeRuntimeHealth.reduce((latest, item) => Math.max(latest, Number(item.updatedAtMs) || 0), 0),
                                    ),
                degradedReason: routeRuntimeHealthSummary.fail > 0
                    ? `${routeRuntimeHealthSummary.fail} route runtime checks are failed`
                                            : runtimeWarningSummary.failed > 0
                            ? `${runtimeWarningSummary.failed} runtime warnings are failed`
                            : null,
                status: routeRuntimeHealthSummary.fail > 0 
                    ? "failed"
                    : routeRuntimeHealthSummary.warn > 0  || runtimeWarningSummary.failed > 0
                        ? "degraded"
                        : routeRuntimeHealthSummary.stale > 0
                            ? "stale"
                            : "live",
                countComposition: {
                    routeWarnings: routeRuntimeHealthSummary.warn,
                    routeFailures: routeRuntimeHealthSummary.fail,
                                                            runtimeWarnings: runtimeWarningSummary.total,
                },
            }),
            infrastructure: await readInfrastructureDependencies(),

            adminVerification: [
                buildServerAdminModuleVerification({
                    module: "admin_debug_route_runtime",
                    canonicalSource: "route_runtime_health",
                    fallbackSource: "runtime_warning_records",
                    freshnessTimestamp: routeRuntimeHealth.reduce((latest, item) => Math.max(latest, Number(item.updatedAtMs) || 0), 0),
                    degradedReason: routeRuntimeHealthSummary.fail > 0
                        ? `${routeRuntimeHealthSummary.fail} route runtime checks are failed`
                        : routeRuntimeHealthSummary.warn > 0
                            ? `${routeRuntimeHealthSummary.warn} route runtime checks are degraded`
                            : null,
                    status: routeRuntimeHealthSummary.fail > 0
                        ? "failed"
                        : routeRuntimeHealthSummary.warn > 0
                            ? "degraded"
                            : routeRuntimeHealthSummary.stale > 0
                                ? "stale"
                                : "live",
                    countComposition: {
                        tracked: routeRuntimeHealth.length,
                        warn: routeRuntimeHealthSummary.warn,
                        fail: routeRuntimeHealthSummary.fail,
                        stale: routeRuntimeHealthSummary.stale,
                    },
                }),
                
            ],
        }));
    } catch (error) {
        return finalize(handleApiError(error, "Admin.Debug.GET"), error);
    }
}
