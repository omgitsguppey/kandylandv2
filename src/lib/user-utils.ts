import { User } from "firebase/auth";
import { UserProfile } from "@/types/db";
import { BUILT_IN_DAILY_TASK_MAP, buildDailyTaskRewardContract, type DailyTaskAssignment } from "@/lib/tasks/task-catalog";
import { readTaskTimestampMs } from "@/lib/tasks/task-timestamps";
import { normalizeCreatorRestrictions, normalizeCreatorSettings } from "@/lib/creator-experiences";
import { normalizeCreatorApplication } from "@/lib/creator-application";
import { normalizeSyntheticLegalEvidenceMode } from "@/lib/admin/synthetic-creators-view-as";

/**
 * Normalizes a username by trimming, lowercasing, and allowing only alphanumerics, hyphens, and underscores.
 * Returns null if the resulting username is invalid (empty or too long).
 */
export function normalizeUsername(raw: unknown): string | null {
    if (typeof raw !== "string") return null;
    const cleaned = raw
        .trim()
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/[-_]{2,}/g, "-")
        .replace(/^[-_]+|[-_]+$/g, "");
    if (cleaned.length < 3 || cleaned.length > 20) return null;
    return cleaned;
}

export function buildUsernameBaseCandidates(input: { displayName?: string | null; email?: string | null }) {
    const candidates: string[] = [];

    const pushCandidate = (value: string) => {
        const normalized = normalizeUsername(value);
        if (!normalized || candidates.includes(normalized)) {
            return;
        }
        candidates.push(normalized);
    };

    const displayName = typeof input.displayName === "string" ? input.displayName.trim() : "";
    if (displayName) {
        const parts = displayName
            .split(/[\s._]+/)
            .map((part) => normalizeUsername(part))
            .filter((part): part is string => Boolean(part));

        if (parts.length >= 2) {
            pushCandidate(`${parts[0]}-${parts[parts.length - 1]}`);
            pushCandidate(`${parts[0]}${parts[parts.length - 1]}`);
            pushCandidate(`${parts[0]}-${parts[parts.length - 1][0]}`);
        }

        if (parts.length >= 1) {
            pushCandidate(parts.join("-"));
            pushCandidate(parts.join(""));
        }
    }

    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    if (email.includes("@")) {
        const localPart = email.split("@")[0];
        pushCandidate(localPart.replace(/[._]+/g, "-"));
        pushCandidate(localPart.replace(/[^a-z0-9]+/g, "-"));
    }

    return candidates.slice(0, 8);
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

    const legacyCreatorFlag = (source as Record<string, unknown>).creator === true;
    const normalizedRole = source.role === "admin" || source.role === "creator" || source.role === "user"
        ? source.role
        : legacyCreatorFlag
            ? "creator"
            : "user";
    const syntheticCreatorType = source.syntheticCreatorType === "internal_character"
        || source.syntheticCreatorType === "test_creator"
        || source.syntheticCreatorType === "ai_creator"
        || source.syntheticCreatorType === "demo_creator"
        ? source.syntheticCreatorType
        : undefined;

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
        role: normalizedRole,
        isSyntheticCreator: source.isSyntheticCreator === true,
        syntheticCreatorType,
        syntheticCreatedByUid: typeof source.syntheticCreatedByUid === "string" ? source.syntheticCreatedByUid : undefined,
        syntheticCreatedAt: Number.isFinite(source.syntheticCreatedAt) ? Number(source.syntheticCreatedAt) : undefined,
        syntheticReason: typeof source.syntheticReason === "string" ? source.syntheticReason : undefined,
        humanOperatorRequired: source.isSyntheticCreator === true ? source.humanOperatorRequired !== false : undefined,
        publicDisclosureMode: typeof source.publicDisclosureMode === "string" ? source.publicDisclosureMode : undefined,
        syntheticLegalEvidenceMode: source.isSyntheticCreator === true
            ? normalizeSyntheticLegalEvidenceMode(source.syntheticLegalEvidenceMode)
            : undefined,


        isVerified: source.isVerified === true,
        gumDropsBalance: Number.isFinite(source.gumDropsBalance) ? Number(source.gumDropsBalance) : 0,
        gumDropsPurchasedBalance: Number.isFinite(source.gumDropsPurchasedBalance) ? Number(source.gumDropsPurchasedBalance) : undefined,
        gumDropsRewardBalance: Number.isFinite(source.gumDropsRewardBalance) ? Number(source.gumDropsRewardBalance) : undefined,
        unlockedContent: toStringArray(source.unlockedContent),
        unlockedContentTimestamps: toStringNumberRecord(source.unlockedContentTimestamps),
        following: toStringArray(source.following),
        creatorNotificationPreferences: source.creatorNotificationPreferences && typeof source.creatorNotificationPreferences === "object"
            ? Object.fromEntries(
                Object.entries(source.creatorNotificationPreferences as Record<string, unknown>)
                    .filter(([key, value]) => typeof key === "string" && typeof value === "boolean")
                    .map(([key, value]) => [key, Boolean(value)]),
            )
            : {},
        createdAt: Number.isFinite(source.createdAt) ? Number(source.createdAt) : 0,
        lastCheckIn: Number.isFinite(source.lastCheckIn) ? Number(source.lastCheckIn) : undefined,
        streakCount: Number.isFinite(source.streakCount) ? Number(source.streakCount) : undefined,
        status: source.status === "active" || source.status === "suspended" || source.status === "banned" ? source.status : "active",
        statusReason: typeof source.statusReason === "string" ? source.statusReason : undefined,
        onboardingCompleted: source.onboardingCompleted === true,
        creatorApplication: normalizeCreatorApplication(source.creatorApplication),
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
            allowRecommendations: source.privacySettings?.allowRecommendations === true,
            showInAnonymousStats: source.privacySettings?.showInAnonymousStats === true,
            anonymousAnalyticsEnabled: source.privacySettings?.anonymousAnalyticsEnabled === true,
            identifiedAnalyticsEnabled: source.privacySettings?.identifiedAnalyticsEnabled === true,
            honorGlobalPrivacyControl: source.privacySettings?.honorGlobalPrivacyControl !== false,
            consentUpdatedAt: Number.isFinite(source.privacySettings?.consentUpdatedAt)
                ? Number(source.privacySettings?.consentUpdatedAt)
                : undefined,
            privacyPolicyVersion: typeof source.privacySettings?.privacyPolicyVersion === "string"
                ? source.privacySettings.privacyPolicyVersion
                : undefined,
        },
        accountSettings: {
            timezone: typeof source.accountSettings?.timezone === "string" && source.accountSettings.timezone.trim().length > 0
                ? source.accountSettings.timezone.trim()
                : "Auto",
        },
        dailyTasksState: source.dailyTasksState ? {
            lastResetMs: readTaskTimestampMs(source.dailyTasksState.lastResetMs),
            nextRefreshMs: readTaskTimestampMs(source.dailyTasksState.nextRefreshMs),
            lastProgressAt: readTaskTimestampMs(source.dailyTasksState.lastProgressAt),
            lastDeadlineReminderAt: readTaskTimestampMs(source.dailyTasksState.lastDeadlineReminderAt),
            tasks: Array.isArray(source.dailyTasksState.tasks)
                ? source.dailyTasksState.tasks.reduce<DailyTaskAssignment[]>((acc, task: any) => {
                        if (!task || typeof task !== "object") {
                            return acc;
                        }

                        const builtInTask = BUILT_IN_DAILY_TASK_MAP[String(task.id)];
                        const rewardContract = buildDailyTaskRewardContract({
                            id: String(task.id),
                            title: typeof task.title === "string"
                                ? task.title
                                : builtInTask?.title ?? "",
                            eventName: typeof task.eventName === "string"
                                ? task.eventName
                                : builtInTask?.eventName ?? "",
                            reward: Number(task.reward) || builtInTask?.reward || 0,
                            maxProgress: Number(task.maxProgress) || builtInTask?.maxProgress || 1,
                        });

                        acc.push({
                            id: String(task.id),
                            source: task.source === "global" || task.source === "user" ? task.source : "built_in",
                            title: typeof task.title === "string"
                                ? task.title
                                : builtInTask?.title ?? "",
                            subtitle: typeof task.subtitle === "string"
                                ? task.subtitle
                                : builtInTask?.subtitle ?? "",
                            reward: Number(task.reward) || builtInTask?.reward || 0,
                            rewardTier: typeof task.rewardTier === "string" ? task.rewardTier : rewardContract.rewardTier,
                            minRewardGd: Number(task.minRewardGd) || builtInTask?.minRewardGd || rewardContract.minRewardGd,
                            maxRewardGd: Number(task.maxRewardGd) || builtInTask?.maxRewardGd || rewardContract.maxRewardGd,
                            rewardSource: task.rewardSource === "daily_task" ? task.rewardSource : "daily_task",
                            payoutPolicy: task.payoutPolicy === "on_completion_only" ? task.payoutPolicy : "on_completion_only",
                            repeatPolicy: task.repeatPolicy === "limited" || task.repeatPolicy === "once_per_daily_window"
                                ? task.repeatPolicy
                                : builtInTask?.repeatPolicy || rewardContract.repeatPolicy,
                            economyRisk: task.economyRisk === "low" || task.economyRisk === "medium" || task.economyRisk === "high"
                                ? task.economyRisk
                                : builtInTask?.economyRisk || rewardContract.economyRisk,
                            maxProgress: Number(task.maxProgress) || builtInTask?.maxProgress || 1,
                            eventName: typeof task.eventName === "string"
                                ? task.eventName
                                : builtInTask?.eventName ?? "",
                            actionType: typeof task.actionType === "string"
                                ? task.actionType
                                : builtInTask?.actionType ?? "open_experiences",
                            ctaLabel: typeof task.ctaLabel === "string"
                                ? task.ctaLabel
                                : builtInTask?.ctaLabel ?? "Keep going",
                            icon: typeof task.icon === "string"
                                ? task.icon
                                : builtInTask?.icon ?? "gift",
                            group: typeof task.group === "string"
                                ? task.group
                                : builtInTask?.group ?? "visit",
                            progress: Number(task.progress) || 0,
                            claimed: Boolean(task.claimed),
                            assignedAt: Number(task.assignedAt) || 0,
                            startedAt: Number.isFinite(task.startedAt) ? Number(task.startedAt) : undefined,
                            claimedAt: Number.isFinite(task.claimedAt) ? Number(task.claimedAt) : undefined,
                            progressKeys: toStringArray(task.progressKeys),
                            uniqueByParamKey: typeof task.uniqueByParamKey === "string"
                                ? task.uniqueByParamKey
                                : builtInTask?.uniqueByParamKey,
                            targetUserId: typeof task.targetUserId === "string" ? task.targetUserId : undefined,
                            customTaskId: typeof task.customTaskId === "string" ? task.customTaskId : undefined,
                            cooldownDays: Number(task.cooldownDays) || builtInTask?.cooldownDays || undefined,
                            oneTime: task.oneTime === true || builtInTask?.oneTime === true,
                            criteria: task.criteria && typeof task.criteria === "object"
                                ? task.criteria
                                : builtInTask?.criteria,
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
        creatorSettings: normalizedRole === "creator" || normalizedRole === "admin" || source.creatorSettings
            ? normalizeCreatorSettings(source.creatorSettings)
            : undefined,
        creatorRestrictions: normalizedRole === "creator" || normalizedRole === "admin" || source.creatorRestrictions
            ? normalizeCreatorRestrictions(source.creatorRestrictions)
            : undefined,
    };
}
