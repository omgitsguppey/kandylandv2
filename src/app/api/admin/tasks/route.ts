import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  DAILY_TASK_ACTION_OPTIONS,
  DAILY_TASK_COOLDOWN_DAYS,
  DAILY_TASK_ICON_OPTIONS,
  DAILY_TASK_MAX_REWARD,
  DAILY_TASK_MIN_REWARD,
  DAILY_TASK_REWARD_VERSION,
  normalizeDailyTaskReward,
  resolveDailyTaskReward,
} from "@/lib/tasks/task-catalog";
import { TELEMETRY_EVENT_OPTIONS } from "@/lib/telemetry-catalog";
import { adminDb } from "@/lib/server/firebase-admin";
import { ADMIN } from "@/lib/server/rate-limit";
import { handleApiError } from "@/lib/server/auth";
import { guardApiRequest } from "@/lib/server/request-guard";

const scalarValueSchema = z.union([z.string().min(1).max(120), z.number().finite(), z.boolean()]);
const criteriaSchema = z.object({
  paramEquals: z.object({
    key: z.string().trim().min(1).max(60),
    value: scalarValueSchema,
  }).optional(),
  minNumberParam: z.object({
    key: z.string().trim().min(1).max(60),
    value: z.number().finite(),
  }).optional(),
  includesAnyParam: z.object({
    key: z.string().trim().min(1).max(60),
    values: z.array(z.string().trim().min(1).max(60)).min(1).max(12),
  }).optional(),
}).refine((value) => {
  const ruleCount = [value.paramEquals, value.minNumberParam, value.includesAnyParam].filter(Boolean).length;
  return ruleCount === 1;
}, { message: "Criteria must define exactly one rule" });

const taskSchema = z.object({
  title: z.string().min(3).max(60),
  subtitle: z.string().min(8).max(160),
  reward: z.number().int().min(DAILY_TASK_MIN_REWARD).max(DAILY_TASK_MAX_REWARD),
  maxProgress: z.number().int().min(1).max(10),
  cooldownDays: z.number().int().min(1).max(30),
  oneTime: z.boolean().optional().default(false),
  eventName: z.string().min(1),
  actionType: z.enum(DAILY_TASK_ACTION_OPTIONS.map((option) => option.value) as [string, ...string[]]),
  ctaLabel: z.string().min(2).max(32),
  icon: z.enum(DAILY_TASK_ICON_OPTIONS.map((option) => option.value) as [string, ...string[]]),
  group: z.enum(["visit", "notifications", "unwrap", "watch", "wallet", "purchase", "feedback", "share"]),
  scope: z.enum(["global", "user"]),
  targetUserId: z.string().optional().nullable(),
  uniqueByParamKey: z.string().trim().min(1).max(60).optional().nullable(),
  criteria: criteriaSchema.optional(),
});

const updateSchema = z.object({
  taskId: z.string().min(1),
  active: z.boolean(),
});

export async function GET(request: NextRequest) {
  try {
    await guardApiRequest(request, {
      routeName: "admin/tasks",
      rateLimit: ADMIN,
      auth: "admin",
    });

    const [taskSnapshot, taskEventsSnapshot, eventStatsSnapshot, taskRollupSnapshot] = await Promise.all([
      adminDb.collection("daily_task_definitions").orderBy("createdAt", "desc").limit(100).get(),
      adminDb.collection("daily_task_events").orderBy("timestamp", "desc").limit(60).get(),
      adminDb.collection("analytics_event_stats").orderBy("lastSeenAt", "desc").limit(80).get(),
      adminDb.collection("analytics_task_rollup").orderBy("lastEventAt", "desc").limit(60).get(),
    ]);

    const customTasks = taskSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        reward: resolveDailyTaskReward(data.reward, data.rewardVersion),
        rewardVersion: data.rewardVersion === DAILY_TASK_REWARD_VERSION ? DAILY_TASK_REWARD_VERSION : undefined,
      };
    });
    const recentTaskEvents = taskEventsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const eventStats = eventStatsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const taskRollups = taskRollupSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({
      success: true,
      customTasks,
      recentTaskEvents,
      eventStats,
      taskRollups,
      eventOptions: TELEMETRY_EVENT_OPTIONS,
      actionOptions: DAILY_TASK_ACTION_OPTIONS,
      iconOptions: DAILY_TASK_ICON_OPTIONS,
      defaultCooldownDays: DAILY_TASK_COOLDOWN_DAYS,
    });
  } catch (error) {
    return handleApiError(error, "admin/tasks.GET");
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await guardApiRequest(request, {
      routeName: "admin/tasks",
      rateLimit: ADMIN,
      auth: "admin",
    });
    const parsed = taskSchema.parse(await request.json());

    if (!TELEMETRY_EVENT_OPTIONS.some((option) => option.eventName === parsed.eventName)) {
      return NextResponse.json({ error: "Unknown event trigger" }, { status: 400 });
    }

    if (parsed.scope === "user" && !parsed.targetUserId) {
      return NextResponse.json({ error: "User-specific tasks need a target user" }, { status: 400 });
    }

    const nowMs = Date.now();
    const payload = {
      ...parsed,
      source: parsed.scope,
      reward: normalizeDailyTaskReward(parsed.reward),
      rewardVersion: DAILY_TASK_REWARD_VERSION,
      active: true,
      cooldownDays: parsed.cooldownDays,
      oneTime: parsed.oneTime,
      targetUserId: parsed.scope === "user" ? parsed.targetUserId ?? null : null,
      uniqueByParamKey: parsed.uniqueByParamKey?.trim() || null,
      criteria: parsed.criteria ?? null,
      createdAt: nowMs,
      updatedAt: nowMs,
      createdBy: adminUser?.uid ?? "",
    };

    const docRef = await adminDb.collection("daily_task_definitions").add(payload);

    return NextResponse.json({
      success: true,
      task: {
        id: docRef.id,
        ...payload,
      },
    });
  } catch (error) {
    return handleApiError(error, "admin/tasks.POST");
  }
}

export async function PUT(request: NextRequest) {
  try {
    await guardApiRequest(request, {
      routeName: "admin/tasks",
      rateLimit: ADMIN,
      auth: "admin",
    });
    const { taskId, active } = updateSchema.parse(await request.json());

    await adminDb.collection("daily_task_definitions").doc(taskId).set({
      active,
      updatedAt: Date.now(),
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "admin/tasks.PUT");
  }
}
