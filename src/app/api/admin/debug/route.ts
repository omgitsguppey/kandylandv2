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
import { CREATOR_SPEND_POLICIES } from "@/lib/server/creator-experiences";
import { CREATOR_SPEND_TRANSACTION_TYPES, getTransactionBadgeLabel } from "@/lib/transaction-normalizers";
import { buildAdminPanelSystemLogs, syncAdminPanelSystemLogs } from "@/lib/server/admin-panel-system-logs";
import { buildCreatorOnboardingDiagnostics } from "@/lib/server/creator-onboarding-diagnostics";
import { CREATOR_ONBOARDING_COLLECTION, CREATOR_REVIEW_QUEUE_COLLECTION } from "@/lib/server/creator-onboarding";
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

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const TASK_AUDIT_SAMPLE_LIMIT = 2_000;
const TASK_DAILY_SERIES_LIMIT = 60;
const TASK_GROUP_SET = new Set<string>(["visit", "notifications", "unwrap", "watch", "wallet", "purchase", "feedback", "share"]);
const TASK_ACTION_SET = new Set<string>(DAILY_TASK_ACTION_OPTIONS.map((option) => option.value));
const TASK_ICON_SET = new Set<string>(DAILY_TASK_ICON_OPTIONS.map((option) => option.value));

function toNumber(value: unknown) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
}

function toStringValue(value: unknown) {
    return typeof value === "string" ? value : "";
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

function inferTrackingSource(eventName: string) {
    if (CANONICAL_TASK_EVENT_NAMES.has(eventName)) {
        return "canonical";
    }

    if (TELEMETRY_EVENT_NAMES.includes(eventName)) {
        return "telemetry";
    }

    return "unsupported";
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

    return {
        definition: {
            id,
            source: scope as DailyTaskDefinition["source"],
            title,
            subtitle,
            reward: resolveDailyTaskReward(rawValue.reward, rawValue.rewardVersion),
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

function hasInvalidRefreshMetadata(state: Record<string, unknown> | undefined, nowMs: number) {
    const nextRefreshMs = toNumber(state?.nextRefreshMs);
    const lastResetMs = toNumber(state?.lastResetMs);

    if (nextRefreshMs <= 0) {
        return true;
    }

    if (lastResetMs > nowMs) {
        return true;
    }

    return lastResetMs > 0 && nextRefreshMs <= lastResetMs;
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
            commerceSummarySnapshot,
            feedbackSnapshot,
            orchestrationEventsSnapshot,
            orchestrationFindingsSnapshot,
            orchestrationRepairProposalsSnapshot,
            orchestrationActorSummariesSnapshot,
            orchestrationRepairActionsSnapshot,
            creatorOnboardingSnapshot,
            creatorReviewQueueSnapshot,
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
            adminDb.collection("analytics_commerce_rollup").doc("summary").get(),
            adminDb.collection("platform_feedback").orderBy("timestamp", "desc").limit(160).get(),
            adminDb.collection(ORCHESTRATION_COLLECTIONS.events).orderBy("observedAtMs", "desc").limit(120).get(),
            adminDb.collection(ORCHESTRATION_COLLECTIONS.findings).orderBy("updatedAtMs", "desc").limit(80).get(),
            adminDb.collection(ORCHESTRATION_COLLECTIONS.repairProposals).orderBy("updatedAtMs", "desc").limit(80).get(),
            adminDb.collection(ORCHESTRATION_COLLECTIONS.actorSummaries).orderBy("lastSeenAtMs", "desc").limit(60).get(),
            adminDb.collection(ORCHESTRATION_COLLECTIONS.repairActions).orderBy("createdAtMs", "desc").limit(60).get(),
            adminDb.collection(CREATOR_ONBOARDING_COLLECTION).get(),
            adminDb.collection(CREATOR_REVIEW_QUEUE_COLLECTION).get(),
        ]);

        const [routeRuntimeHealth, runtimeWarnings, queueJobHeartbeats, notificationDispatchOutcomes, behavioralSnapshotStatus, behavioralDrops, analyticsTruthRecovery, analyticsTruthDrops, analyticsTruthUsers, analyticsTruthRepairs] = await Promise.all([
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
        const queueRuntimeSummary = {
            jobHeartbeats: queueJobHeartbeatSummary,
            warnings: runtimeWarningSummary,
            missingNotificationOutcomes: runtimeWarnings.filter((entry) => toStringValue(entry.code) === QUEUE_RUNTIME_WARNING_CODES.activationMissingOutcome).length,
            recentOutcomes: notificationDispatchOutcomes.length,
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
            commerceSummaryDoc: commerceSummarySnapshot,
        });
        const creatorOnboardingDiagnostics = buildCreatorOnboardingDiagnostics({
            users: usersSnapshot.docs.map((doc) => ({
                uid: doc.id,
                raw: doc.data() as Record<string, unknown>,
            })),
            onboardingRecords: creatorOnboardingSnapshot.docs.map((doc) => doc.data() as Record<string, unknown>),
            queueRecords: creatorReviewQueueSnapshot.docs.map((doc) => doc.data() as Record<string, unknown>),
        });

        const coverage = buildDailyTaskInventory();
        const taskInventorySummary = summarizeDailyTaskInventory(coverage);

        const unsupportedTasks = coverage.filter((task) => task.trackingSource === "unsupported");
        const telemetryOnlyTasks = coverage.filter((task) => task.trackingSource === "telemetry");
        const canonicalTasks = coverage.filter((task) => task.trackingSource === "canonical");

        const assignmentIssues = usersSnapshot.docs.flatMap((doc) => {
            const data = doc.data() as Record<string, unknown>;
            const username = toStringValue(data.username) || toStringValue(data.displayName) || doc.id;
            const dailyTasksState = data.dailyTasksState as Record<string, unknown> | undefined;
            const tasks = normalizeTaskIds(dailyTasksState?.tasks);
            const issues: string[] = [];
            const ids = tasks.map((task) => task.id);
            const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);

            if (tasks.length !== DAILY_TASK_LIMIT) {
                issues.push(`Expected ${DAILY_TASK_LIMIT} tasks, found ${tasks.length}`);
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
            if (tasks.length > 0 && hasInvalidRefreshMetadata(dailyTasksState, nowMs)) {
                issues.push("Invalid refresh metadata for assigned tasks");
            }

            if (issues.length === 0) {
                return [];
            }

            return [{
                uid: doc.id,
                username,
                issueCount: issues.length,
                issues,
                taskIds: ids,
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
                progress: toNumber(data.progress),
                maxProgress: toNumber(data.maxProgress),
                timestamp: toNumber(data.timestamp),
                durationMs: toNumber(data.durationMs),
                reason: toStringValue(data.reason),
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
            return {
                uid: doc.id,
                username,
                tasks: normalizeTaskIds(dailyTasksState?.tasks),
                completedTaskHistory: normalizeHistory(dailyTasksState?.completedTaskHistory),
                retiredTaskIds: normalizeStringArray(dailyTasksState?.retiredTaskIds),
                hasInvalidRefreshMetadata: hasInvalidRefreshMetadata(dailyTasksState, nowMs),
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
            .filter((entry) => toStringValue(entry.type) === "daily_reward" && toNumber(entry.timestampMs) >= weekAgoMs);
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
                    rewardTotal: toNumber(data.rewardTotal),
                    completed: toNumber((data.types as Record<string, unknown> | undefined)?.completed),
                    started: toNumber((data.types as Record<string, unknown> | undefined)?.started),
                    failed: toNumber((data.types as Record<string, unknown> | undefined)?.failed),
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
            current.rewardTotal += event.reward;
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

        const taskRollups = taskRollupSnapshot.docs.map((doc) => {
            const data = doc.data() as Record<string, unknown>;
            return {
                taskId: doc.id,
                title: toStringValue(data.title) || doc.id,
                eventCount: toNumber(data.eventCount),
                rewardTotal: toNumber(data.rewardTotal),
                completed: toNumber((data.types as Record<string, unknown> | undefined)?.completed),
                started: toNumber((data.types as Record<string, unknown> | undefined)?.started),
                failed: toNumber((data.types as Record<string, unknown> | undefined)?.failed),
                reminders: toNumber((data.types as Record<string, unknown> | undefined)?.reminder_sent),
                lastEventAt: toNumber(data.lastEventAt),
            };
        }).sort((left, right) => right.completed - left.completed || right.eventCount - left.eventCount);

        const dailyTaskSeries = taskDailySnapshot.docs.map((doc) => {
            const data = doc.data() as Record<string, unknown>;
            return {
                dayKey: doc.id,
                eventCount: toNumber(data.eventCount),
                rewardTotal: toNumber(data.rewardTotal),
                completed: toNumber((data.types as Record<string, unknown> | undefined)?.completed),
                failed: toNumber((data.types as Record<string, unknown> | undefined)?.failed),
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

        const bugReports = feedbackSnapshot.docs
            .map((doc) => {
                const data = doc.data() as Record<string, unknown>;
                return {
                    id: doc.id,
                    userId: toStringValue(data.userId),
                    email: toStringValue(data.email) || null,
                    summary: toStringValue(data.summary) || toStringValue(data.message),
                    message: toStringValue(data.message),
                    category: toStringValue(data.category) || "general",
                    status: toStringValue(data.status) || "new",
                    issueType: toStringValue(data.issueType) || "other",
                    severity: toStringValue(data.severity) || "medium",
                    contextId: toStringValue(data.contextId),
                    currentPath: toStringValue(data.currentPath),
                    componentName: toStringValue(data.componentName),
                    diagnosticsCount: toNumber(data.diagnosticsCount),
                    breadcrumbsCount: toNumber(data.breadcrumbsCount),
                    rolloutCount: toNumber(data.rolloutCount),
                    timestamp: toTimestampNumber(data.timestamp),
                    autoContext: (data.autoContext as Record<string, unknown> | undefined) ?? null,
                    component: (data.component as Record<string, unknown> | undefined) ?? null,
                };
            })
            .filter((item) => item.category === "bug_report")
            .slice(0, 100);

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
            bugReportsLast7d: bugReports.filter((report) => report.timestamp >= weekAgoMs).length,
            rolloutCount: rollouts.length,
            releaseEntryCount: changeLog.length,
            creatorSpendViolationsLast7d: creatorSpendParity.restrictedSpendViolationCount,
            opsHealth,
            orchestration: orchestration.summary,
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
                bugReportsLast7d: bugReports.filter((report) => report.timestamp >= weekAgoMs).length,
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
            notificationDispatchOutcomes,
            queueRuntimeSummary,
            behavioralSnapshotStatus,
            behavioralDrops,
            analyticsTruthRecovery,
            analyticsTruthDrops,
            analyticsTruthUsers,
            analyticsTruthRepairs,
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
