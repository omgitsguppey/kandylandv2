import { User } from "firebase/auth";
import { UserProfile } from "@/types/db";
import { BUILT_IN_DAILY_TASK_MAP, type DailyTaskAssignment } from "@/lib/tasks/task-catalog";

/**
 * Normalizes a username by trimming, lowercasing, and allowing only alphanumerics/underscores.
 * Returns null if the resulting username is invalid (empty or too long).
 */
export function normalizeUsername(raw: unknown): string | null {
    if (typeof raw !== "string") return null;
    const cleaned = raw.trim().toLowerCase().replace(/[^a-z0-px_]/g, "");
    if (cleaned.length < 3 || cleaned.length > 20) return null;
    return cleaned;
}

/**
 * Normalizes a raw Firestore user document into a typed UserProfile.
 * Merges data from the Firebase User object where applicable.
 */
export function normalizeUserProfile(raw: unknown, user: User): UserProfile | null {
    if (!raw || typeof raw !== "object") {
        return null;
    }

    const source = raw as Partial<UserProfile>;

    const toStringArray = (value: unknown) =>
        Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

    const toStringNumberRecord = (value: unknown): Record<string, number> => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            return {};
        }

        const entries = Object.entries(value as Record<string, unknown>);
        const normalizedEntries = entries
            .filter(([key, entry]) => typeof key === "string" && Number.isFinite(entry))
            .map(([key, entry]) => [key, Number(entry)] as const);

        return Object.fromEntries(normalizedEntries);
    };

    return {
        uid: typeof source.uid === "string" ? source.uid : user.uid,
        email: typeof source.email === "string" || source.email === null ? source.email : user.email,
        displayName:
            typeof source.displayName === "string" || source.displayName === null
                ? source.displayName
                : user.displayName,
        username: typeof source.username === "string" ? source.username : undefined,
        dateOfBirth: typeof source.dateOfBirth === "string" ? source.dateOfBirth : undefined,
        photoURL: typeof source.photoURL === "string" || source.photoURL === null ? source.photoURL : user.photoURL,
        bannerUrl: typeof source.bannerUrl === "string" ? source.bannerUrl : undefined,
        bio: typeof source.bio === "string" ? source.bio : undefined,
        role: source.role === "admin" || source.role === "creator" || source.role === "user" ? source.role : "user",


        isVerified: source.isVerified === true,
        gumDropsBalance: Number.isFinite(source.gumDropsBalance) ? Number(source.gumDropsBalance) : 0,
        unlockedContent: toStringArray(source.unlockedContent),
        unlockedContentTimestamps: toStringNumberRecord(source.unlockedContentTimestamps),
        following: toStringArray(source.following),
        createdAt: Number.isFinite(source.createdAt) ? Number(source.createdAt) : Date.now(),
        lastCheckIn: Number.isFinite(source.lastCheckIn) ? Number(source.lastCheckIn) : undefined,
        streakCount: Number.isFinite(source.streakCount) ? Number(source.streakCount) : undefined,
        status: source.status === "active" || source.status === "suspended" || source.status === "banned" ? source.status : "active",
        statusReason: typeof source.statusReason === "string" ? source.statusReason : undefined,
        onboardingCompleted: source.onboardingCompleted === true,
        preferences: source.preferences && typeof source.preferences.flavor === "string"
            ? { flavor: source.preferences.flavor }
            : undefined,
        notificationSettings: {
            inAppEnabled: source.notificationSettings?.inAppEnabled !== false,
            browserPushEnabled: source.notificationSettings?.browserPushEnabled === true,
            newDropAlerts: source.notificationSettings?.newDropAlerts !== false,
            expiringSoonAlerts: source.notificationSettings?.expiringSoonAlerts !== false,
        },
        fcmTokens: toStringArray(source.fcmTokens),
        privacySettings: {
            allowRecommendations: source.privacySettings?.allowRecommendations !== false,
            showInAnonymousStats: source.privacySettings?.showInAnonymousStats !== false,
        },
        accountSettings: {
            timezone: typeof source.accountSettings?.timezone === "string" && source.accountSettings.timezone.trim().length > 0
                ? source.accountSettings.timezone.trim()
                : "Auto",
        },
        dailyTasksState: source.dailyTasksState ? {
            lastResetMs: Number(source.dailyTasksState.lastResetMs) || 0,
            nextRefreshMs: Number(source.dailyTasksState.nextRefreshMs) || 0,
            lastProgressAt: Number(source.dailyTasksState.lastProgressAt) || 0,
            lastDeadlineReminderAt: Number(source.dailyTasksState.lastDeadlineReminderAt) || 0,
            tasks: Array.isArray(source.dailyTasksState.tasks)
                ? source.dailyTasksState.tasks.reduce<DailyTaskAssignment[]>((acc, task: any) => {
                        if (!task || typeof task !== "object") {
                            return acc;
                        }

                        acc.push({
                            id: String(task.id),
                            source: task.source === "global" || task.source === "user" ? task.source : "built_in",
                            title: typeof task.title === "string"
                                ? task.title
                                : BUILT_IN_DAILY_TASK_MAP[String(task.id)]?.title ?? "",
                            subtitle: typeof task.subtitle === "string"
                                ? task.subtitle
                                : BUILT_IN_DAILY_TASK_MAP[String(task.id)]?.subtitle ?? "",
                            reward: Number(task.reward) || BUILT_IN_DAILY_TASK_MAP[String(task.id)]?.reward || 0,
                            maxProgress: Number(task.maxProgress) || BUILT_IN_DAILY_TASK_MAP[String(task.id)]?.maxProgress || 1,
                            eventName: typeof task.eventName === "string"
                                ? task.eventName
                                : BUILT_IN_DAILY_TASK_MAP[String(task.id)]?.eventName ?? "",
                            actionType: typeof task.actionType === "string"
                                ? task.actionType
                                : BUILT_IN_DAILY_TASK_MAP[String(task.id)]?.actionType ?? "open_experiences",
                            ctaLabel: typeof task.ctaLabel === "string"
                                ? task.ctaLabel
                                : BUILT_IN_DAILY_TASK_MAP[String(task.id)]?.ctaLabel ?? "Keep going",
                            icon: typeof task.icon === "string"
                                ? task.icon
                                : BUILT_IN_DAILY_TASK_MAP[String(task.id)]?.icon ?? "gift",
                            group: typeof task.group === "string"
                                ? task.group
                                : BUILT_IN_DAILY_TASK_MAP[String(task.id)]?.group ?? "visit",
                            progress: Number(task.progress) || 0,
                            claimed: Boolean(task.claimed),
                            assignedAt: Number(task.assignedAt) || 0,
                            startedAt: Number.isFinite(task.startedAt) ? Number(task.startedAt) : undefined,
                            claimedAt: Number.isFinite(task.claimedAt) ? Number(task.claimedAt) : undefined,
                            progressKeys: toStringArray(task.progressKeys),
                            uniqueByParamKey: typeof task.uniqueByParamKey === "string"
                                ? task.uniqueByParamKey
                                : BUILT_IN_DAILY_TASK_MAP[String(task.id)]?.uniqueByParamKey,
                            targetUserId: typeof task.targetUserId === "string" ? task.targetUserId : undefined,
                            customTaskId: typeof task.customTaskId === "string" ? task.customTaskId : undefined,
                            cooldownDays: Number(task.cooldownDays) || BUILT_IN_DAILY_TASK_MAP[String(task.id)]?.cooldownDays || undefined,
                            oneTime: task.oneTime === true || BUILT_IN_DAILY_TASK_MAP[String(task.id)]?.oneTime === true,
                            criteria: task.criteria && typeof task.criteria === "object"
                                ? task.criteria
                                : BUILT_IN_DAILY_TASK_MAP[String(task.id)]?.criteria,
                        } satisfies DailyTaskAssignment);

                        return acc;
                    }, [])
                : [],
            retiredTaskIds: toStringArray(source.dailyTasksState.retiredTaskIds),
            completedTaskHistory: source.dailyTasksState.completedTaskHistory && typeof source.dailyTasksState.completedTaskHistory === "object"
                ? Object.fromEntries(
                    Object.entries(source.dailyTasksState.completedTaskHistory as Record<string, unknown>)
                        .filter(([, rawValue]) => Number.isFinite(rawValue))
                        .map(([key, rawValue]) => [key, Number(rawValue)]),
                )
                : {},
        } : undefined,
        securityFlags: source.securityFlags ? {
            ripAttempts: Number(source.securityFlags.ripAttempts) || 0,
            lastViolation: typeof source.securityFlags.lastViolation === "string" ? source.securityFlags.lastViolation : undefined,
            lastViolationReason: typeof source.securityFlags.lastViolationReason === "string" ? source.securityFlags.lastViolationReason : undefined,
            lastViolationDropId: typeof source.securityFlags.lastViolationDropId === "string" ? source.securityFlags.lastViolationDropId : undefined,
            lastViolationMessage: typeof source.securityFlags.lastViolationMessage === "string" ? source.securityFlags.lastViolationMessage : undefined,
            reasonCounts: source.securityFlags.reasonCounts && typeof source.securityFlags.reasonCounts === "object"
                ? Object.fromEntries(
                    Object.entries(source.securityFlags.reasonCounts as Record<string, unknown>)
                        .filter(([, rawValue]) => Number.isFinite(rawValue))
                        .map(([key, rawValue]) => [key, Number(rawValue)]),
                )
                : undefined,
        } : undefined,
    };
}
