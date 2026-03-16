import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAdmin, handleApiError } from "@/lib/server/auth";
import { checkRateLimit, ADMIN } from "@/lib/server/rate-limit";
import { BUILT_IN_DAILY_TASKS, DAILY_TASK_LIMIT, type DailyTaskAssignment } from "@/lib/tasks/task-catalog";
import { CANONICAL_TASK_EVENT_NAMES } from "@/lib/server/daily-tasks";
import { TELEMETRY_EVENT_LABELS, TELEMETRY_EVENT_NAMES } from "@/lib/telemetry-catalog";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function toNumber(value: unknown) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
}

function toStringValue(value: unknown) {
    return typeof value === "string" ? value : "";
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
            id: toStringValue(task.id),
            title: toStringValue(task.title),
            progress: toNumber(task.progress),
            maxProgress: toNumber(task.maxProgress) || 1,
            claimed: task.claimed === true,
            claimedAt: toNumber(task.claimedAt),
            assignedAt: toNumber(task.assignedAt),
        }))
        .filter((task) => task.id.length > 0);
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

export async function GET(request: NextRequest) {
    try {
        await checkRateLimit(request, "admin/debug", ADMIN);
        await verifyAdmin(request);

        const nowMs = Date.now();
        const weekAgoMs = nowMs - ONE_WEEK_MS;

        const [
            usersSnapshot,
            taskEventsSnapshot,
            receiptsSnapshot,
            eventStatsSnapshot,
            transactionsSnapshot,
            taskRollupSnapshot,
            taskDailySnapshot,
        ] = await Promise.all([
            adminDb.collection("users").get(),
            adminDb.collection("daily_task_events").orderBy("timestamp", "desc").limit(300).get(),
            adminDb.collection("daily_task_event_receipts").orderBy("timestamp", "desc").limit(300).get(),
            adminDb.collection("analytics_event_stats").get(),
            adminDb.collection("transactions").orderBy("timestamp", "desc").limit(600).get(),
            adminDb.collection("analytics_task_rollup").get(),
            adminDb.collection("analytics_task_daily").orderBy("lastEventAt", "desc").limit(30).get(),
        ]);

        const coverage = BUILT_IN_DAILY_TASKS.map((task) => ({
            taskId: task.id,
            title: task.title,
            eventName: task.eventName,
            eventLabel: TELEMETRY_EVENT_LABELS[task.eventName] || task.eventName,
            trackingSource: inferTrackingSource(task.eventName),
            oneTime: task.oneTime === true,
            hasUniqueKey: Boolean(task.uniqueByParamKey),
            reward: task.reward,
            maxProgress: task.maxProgress,
        }));

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

        const transactionEntries = transactionsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Record<string, unknown>),
        })) as Array<Record<string, unknown> & { id: string }>;

        const rewardTransactions7d = transactionEntries
            .filter((entry) => toStringValue(entry.type) === "daily_reward" && toNumber(entry.timestamp) >= weekAgoMs);
        const completedEvents7d = recentTaskEvents.filter((event) => event.type === "completed" && event.timestamp >= weekAgoMs);
        const receiptEvents7d = recentReceipts.filter((entry) => entry.timestamp >= weekAgoMs);

        const rewardParityByTask = new Map<string, {
            taskId: string;
            title: string;
            completedCount: number;
            rewardedCount: number;
            rewardTotal: number;
            receiptCount: number;
        }>();

        completedEvents7d.forEach((event) => {
            const current = rewardParityByTask.get(event.taskId) || {
                taskId: event.taskId,
                title: event.title,
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
            const matchedTask = BUILT_IN_DAILY_TASKS.find((task) => task.title === taskTitle);
            const taskId = matchedTask?.id || taskTitle || "unknown";
            const current = rewardParityByTask.get(taskId) || {
                taskId,
                title: taskTitle || taskId,
                completedCount: 0,
                rewardedCount: 0,
                rewardTotal: 0,
                receiptCount: 0,
            };
            current.rewardedCount += 1;
            rewardParityByTask.set(taskId, current);
        });

        receiptEvents7d.forEach((entry) => {
            if (!CANONICAL_TASK_EVENT_NAMES.has(entry.eventName)) {
                return;
            }

            const matchedTask = BUILT_IN_DAILY_TASKS.find((task) => task.eventName === entry.eventName);
            const taskId = matchedTask?.id || entry.eventName;
            const current = rewardParityByTask.get(taskId) || {
                taskId,
                title: matchedTask?.title || entry.eventName,
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

        const eventStats = eventStatsSnapshot.docs.map((doc) => {
            const data = doc.data() as Record<string, unknown>;
            const taskMatches = BUILT_IN_DAILY_TASKS.filter((task) => task.eventName === doc.id);
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

        const orphanedEventStats = eventStats
            .filter((entry) => entry.mappedTaskCount === 0)
            .slice(0, 20);

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

        return NextResponse.json({
            success: true,
            stats: {
                builtInTasks: BUILT_IN_DAILY_TASKS.length,
                canonicalTasks: canonicalTasks.length,
                telemetryOnlyTasks: telemetryOnlyTasks.length,
                unsupportedTasks: unsupportedTasks.length,
                usersWithTaskIssues: assignmentIssues.length,
                receiptsLast7d: receiptEvents7d.length,
                completedEventsLast7d: completedEvents7d.length,
                rewardTransactionsLast7d: rewardTransactions7d.length,
                rewardEventDeltaLast7d: completedEvents7d.length - rewardTransactions7d.length,
                trackedTelemetryEvents: eventStats.length,
                orphanedTelemetryEvents: orphanedEventStats.length,
            },
            coverage,
            unsupportedTasks,
            telemetryOnlyTasks,
            assignmentIssues,
            taskParity,
            recentTaskEvents: recentTaskEvents.slice(0, 80),
            recentReceipts: recentReceipts.slice(0, 80),
            receiptSummary,
            eventStats: eventStats.slice(0, 40),
            orphanedEventStats,
            taskRollups: taskRollups.slice(0, 30),
            dailyTaskSeries,
        });
    } catch (error) {
        return handleApiError(error, "Admin.Debug.GET");
    }
}
