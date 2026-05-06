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
    buildDailyTaskInventory,
    buildDailyTaskRuntimeAudit,
    CANONICAL_TASK_EVENT_NAMES,
    summarizeDailyTaskInventory,
} from "@/lib/tasks/task-observability";
import {
    buildTelemetryEventMetadata,
    TELEMETRY_EVENT_LABELS,
    TELEMETRY_EVENT_NAMES,
} from "@/lib/telemetry-catalog";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { buildAdminOpsHealth } from "@/lib/server/admin-ops-health";
import { buildAdminOrchestrationSnapshot } from "@/lib/server/admin-orchestration";
import { getConfiguredRollouts, getRolloutEvaluationSamples } from "@/lib/rollouts";
import { getChangelogEntries, getCurrentRelease } from "@/lib/release-tracking";
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
        const pkgPath = path.join(process.cwd(), "package.json");
        let pkg: any = { dependencies: {}, devDependencies: {} };
        if (fs.existsSync(pkgPath)) {
            pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        }
        
        // Lightweight connection pings
        let firestorePing = "unverified";
        try {
            await adminDb.collection("server_diagnostics").limit(1).get();
            firestorePing = "live";
        } catch (e) {
            firestorePing = "failed";
        }

        return {
            timestamp: Date.now(),
            dependencies: {
                firebase: pkg.dependencies?.firebase || "unknown",
                "firebase-admin": pkg.dependencies?.["firebase-admin"] || "unknown",
                next: pkg.dependencies?.next || "unknown",
                react: pkg.dependencies?.react || "unknown",
                "@google-cloud/pubsub": pkg.dependencies?.["@google-cloud/pubsub"] || "unknown",
                "@google-cloud/storage": pkg.dependencies?.["@google-cloud/storage"] || "unknown",
            },
            devDependencies: {
                typescript: pkg.devDependencies?.typescript || "unknown",
                eslint: pkg.devDependencies?.eslint || "unknown",
                tailwindcss: pkg.devDependencies?.tailwindcss || "unknown",
            },
            nodeVersion: process.version,
            pings: {
                firestore: firestorePing,
            }
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

        const coverage = buildDailyTaskInventory();
        const taskInventorySummary = summarizeDailyTaskInventory(coverage);

        const unsupportedTasks = coverage.filter((task) => task.trackingSource === "unsupported");
        const telemetryOnlyTasks = coverage.filter((task) => task.trackingSource === "telemetry");
        const canonicalTasks = coverage.filter((task) => task.trackingSource === "canonical");

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

        const recentReceipts = receiptsSnapshot.docs.map((doc) => {
            const data = doc.data() as Record<string, unknown>;
            return {
                id: doc.id,
                eventName: toStringValue(data.eventName),
                receiptKey: toStringValue(data.receiptKey),
                uid: toStringValue(data.uid),
                timestamp: toNumber(data.timestamp),
                source: toStringValue(data.source) || "canonical",
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
        const receiptEvents7d = recentReceipts.filter((entry) => entry.timestamp >= weekAgoMs);
        const rewardClaimNormalizationIssues: Array<{
            kind: "reward_claim";
            taskId: string;
            title: string;
            eventName: string;
            userId: string;
            detail: string;
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
            });
            return [];
        });

        const runtimeTaskAudit = buildDailyTaskRuntimeAudit({
            definitions: allTaskDefinitions,
            userStates: runtimeUserStates,
            taskEvents: recentTaskEvents,
            receipts: recentReceipts,
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

        const rewardParityByTask = new Map<string, {
            taskId: string;
            title: string;
            definitionOrigin: "built_in" | "custom" | "unknown";
            completedCount: number;
            rewardedCount: number;
            rewardTotal: number;
            receiptCount: number;
        }>();

        completedEvents7d.forEach((event) => {
            const matchedDefinition = taskDefinitionsById.get(event.taskId);
            const current = rewardParityByTask.get(event.taskId) || {
                taskId: event.taskId,
                title: matchedDefinition?.title || event.title,
                definitionOrigin: matchedDefinition?.source === "built_in" ? "built_in" : matchedDefinition ? "custom" : "unknown",
                completedCount: 0,
                rewardedCount: 0,
                rewardTotal: 0,
                receiptCount: 0,
            };
            current.completedCount += 1;
            current.rewardTotal += event.creditedRewardGd || event.reward;
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
                title: taskTitle || taskId,
                definitionOrigin: matchedTask?.source === "built_in" ? "built_in" : matchedTask ? "custom" : "unknown",
                completedCount: 0,
                rewardedCount: 0,
                rewardTotal: 0,
                receiptCount: 0,
            };
            current.rewardedCount += 1;
            rewardParityByTask.set(taskId, current);
        });

        receiptEvents7d.forEach((entry) => {
            const matchedTaskIds = eventNamesToTaskIds.get(entry.eventName) ?? [];
            if (matchedTaskIds.length !== 1) {
                return;
            }

            const taskId = matchedTaskIds[0];
            const matchedTask = taskDefinitionsById.get(taskId);
            const current = rewardParityByTask.get(taskId) || {
                taskId,
                title: matchedTask?.title || entry.eventName,
                definitionOrigin: matchedTask?.source === "built_in" ? "built_in" : matchedTask ? "custom" : "unknown",
                completedCount: 0,
                rewardedCount: 0,
                rewardTotal: 0,
                receiptCount: 0,
            };
            current.receiptCount += 1;
            rewardParityByTask.set(taskId, current);
        });

        const taskParity = Array.from(rewardParityByTask.values())
            .sort((left, right) => right.completedCount - left.completedCount || right.rewardTotal - left.rewardTotal);
        const totalRewardTransactionsAmount7d = rewardTransactions7d.reduce((sum, entry) => sum + Math.abs(toNumber(entry.amount)), 0);
        const taskParitySummary = {
            completedCount7d: completedEvents7d.length,
            receiptCount7d: receiptEvents7d.length,
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

        const eventStats = eventStatsSnapshot.docs.map((doc) => {
            const data = doc.data() as Record<string, unknown>;
            const taskMatches = allTaskDefinitions.filter((task) => task.eventName === doc.id);
            return {
                eventName: doc.id,
                label: TELEMETRY_EVENT_LABELS[doc.id] || doc.id,
                totalCount: toNumber(data.totalCount),
                lastSeenAt: toNumber(data.lastSeenAt),
                mappedTaskCount: taskMatches.length,
                mappedTaskTitles: taskMatches.map((task) => task.title),
                trackingSource: inferTrackingSource(doc.id),
            };
        }).sort((left, right) => right.totalCount - left.totalCount);

        const orphanedEventStats = runtimeTaskAudit.telemetryAlignment
            .filter((entry) => (
                entry.driftReasons.includes("tracked_without_task_mapping")
                && (entry.eventCategory === "tasks" || entry.eventModules.includes("tasks") || entry.eventModules.includes("task_guidance"))
            ))
            .slice(0, 20)
            .map((entry) => ({
                eventName: entry.eventName,
                label: entry.eventLabel,
                totalCount: entry.eventStatTotalCount,
                lastSeenAt: entry.lastSeenAt,
                mappedTaskCount: entry.mappedTaskCount,
                mappedTaskTitles: [] as string[],
                trackingSource: entry.trackingSource,
            }));

        const receiptSummary = Array.from(receiptEvents7d.reduce((map, entry) => {
            const current = map.get(entry.eventName) || {
                eventName: entry.eventName,
                count: 0,
                lastSeenAt: 0,
            };
            current.count += 1;
            current.lastSeenAt = Math.max(current.lastSeenAt, entry.timestamp);
            map.set(entry.eventName, current);
            return map;
        }, new Map<string, { eventName: string; count: number; lastSeenAt: number }>()).values())
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
            })),
        }));
        const rolloutSampleSnapshot = {
            generatedAtMs: nowMs,
            stale: false,
            source: "live_config_evaluation",
        };
        const release = getCurrentRelease();
        const changeLog = getChangelogEntries(8);

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
            trackedTelemetryEvents: eventStats.length,
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
                builtInTasks: BUILT_IN_DAILY_TASKS.length,
                validatedTasks: canonicalTasks.length + telemetryOnlyTasks.length,
                canonicalTasks: canonicalTasks.length,
                telemetryValidatedTasks: telemetryOnlyTasks.length,
                telemetryOnlyTasks: telemetryOnlyTasks.length,
                unsupportedTasks: unsupportedTasks.length,
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
                runtimeSharedEventMappings: runtimeTaskAudit.summary.sharedEventMappings,
                telemetryAlignmentWarnings: runtimeTaskAudit.summary.telemetryAlignmentWarnings,
                taskEventsSamplePartial: taskAuditSample.taskEventsPartial ? 1 : 0,
                taskReceiptsSamplePartial: taskAuditSample.receiptsPartial ? 1 : 0,
                receiptsLast7d: receiptEvents7d.length,
                completedEventsLast7d: completedEvents7d.length,
                rewardTransactionsLast7d: rewardTransactions7d.length,
                rewardEventDeltaLast7d: taskParitySummary.mismatchDelta7d,
                legacyTaskRewardVersions: legacyRewardVersionCount,
                creatorSpendViolationsLast7d: creatorSpendParity.restrictedSpendViolationCount,
                trackedTelemetryEvents: eventStats.length,
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
            coverage,
            taskInventorySummary,
            unsupportedTasks,
            telemetryOnlyTasks,
            assignmentIssues,
            taskParity,
            taskParitySummary,
            taskAuditSample,
            recentTaskEvents: recentTaskEvents.slice(0, 80),
            recentReceipts: recentReceipts.slice(0, 80),
            receiptSummary,
            eventStats: eventStats.slice(0, 40),
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
                    "timingMissingReason",
                    "missingStartCount",
                    "missingFinishCount",
                    "unfinishedTimeoutWindow",
                    "methodBreakdown",
                    "rawEventNames",
                    "casingDriftDetected",
                    "reconciliationDelta",
                    "registeredUsersClassifiedAsMethod",
                    "registeredUsersMovedToOutcome",
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
