import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAuth, handleApiError } from "@/lib/server/auth";
import { checkRateLimit, STANDARD } from "@/lib/server/rate-limit";
import { recordCanonicalTaskEvent } from "@/lib/server/daily-tasks";
import { PRIVACY_POLICY_VERSION } from "@/lib/privacy-policy";

const ALLOWED_TIMEZONES = new Set([
    "Auto",
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Berlin",
    "Asia/Tokyo",
]);

import { normalizeUsername } from "@/lib/user-utils";

function normalizeNotificationSettings(value: unknown): {
    inAppEnabled: boolean;
    browserPushEnabled: boolean;
    newDropAlerts: boolean;
    expiringSoonAlerts: boolean;
} | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const source = value as {
        inAppEnabled?: unknown;
        browserPushEnabled?: unknown;
        newDropAlerts?: unknown;
        expiringSoonAlerts?: unknown;
    };

    return {
        inAppEnabled: source.inAppEnabled !== false,
        browserPushEnabled: source.browserPushEnabled === true,
        newDropAlerts: source.newDropAlerts !== false,
        expiringSoonAlerts: source.expiringSoonAlerts !== false,
    };
}

function normalizePrivacySettings(value: unknown): {
    allowRecommendations: boolean;
    showInAnonymousStats: boolean;
    anonymousAnalyticsEnabled: boolean;
    identifiedAnalyticsEnabled: boolean;
    honorGlobalPrivacyControl: boolean;
    consentUpdatedAt: number;
    privacyPolicyVersion: string;
} | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const source = value as {
        allowRecommendations?: unknown;
        showInAnonymousStats?: unknown;
        anonymousAnalyticsEnabled?: unknown;
        identifiedAnalyticsEnabled?: unknown;
        honorGlobalPrivacyControl?: unknown;
    };

    const anonymousAnalyticsEnabled = source.anonymousAnalyticsEnabled === true;
    const identifiedAnalyticsEnabled = source.identifiedAnalyticsEnabled === true;
    const allowRecommendations = source.allowRecommendations === true;
    const showInAnonymousStats = source.showInAnonymousStats === true;

    return {
        allowRecommendations: allowRecommendations && identifiedAnalyticsEnabled,
        showInAnonymousStats: showInAnonymousStats && anonymousAnalyticsEnabled,
        anonymousAnalyticsEnabled: anonymousAnalyticsEnabled || identifiedAnalyticsEnabled || showInAnonymousStats,
        identifiedAnalyticsEnabled,
        honorGlobalPrivacyControl: source.honorGlobalPrivacyControl !== false,
        consentUpdatedAt: Date.now(),
        privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    };
}

function normalizeAccountSettings(value: unknown): { timezone: string } | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const source = value as { timezone?: unknown };
    if (typeof source.timezone !== "string") {
        return null;
    }

    const normalizedTimezone = source.timezone.trim();
    if (!ALLOWED_TIMEZONES.has(normalizedTimezone)) {
        return null;
    }

    return { timezone: normalizedTimezone };
}

function normalizeBrowserPushToken(value: unknown): string | null {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    if (trimmed.length < 32 || trimmed.length > 4096) {
        return null;
    }

    return trimmed;
}

function parseAdultDateOfBirth(value: unknown) {
    if (typeof value !== "string") {
        return { ok: false as const, error: "Invalid date of birth format" };
    }

    const trimmed = value.trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(trimmed);
    if (!match) {
        return { ok: false as const, error: "Date of birth must use YYYY-MM-DD" };
    }

    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const day = Number.parseInt(match[3], 10);
    const utcDate = new Date(Date.UTC(year, month - 1, day));
    if (
        !Number.isFinite(utcDate.getTime())
        || utcDate.getUTCFullYear() !== year
        || utcDate.getUTCMonth() !== month - 1
        || utcDate.getUTCDate() !== day
    ) {
        return { ok: false as const, error: "Invalid date of birth" };
    }

    const now = new Date();
    let age = now.getUTCFullYear() - year;
    const currentMonth = now.getUTCMonth() + 1;
    const currentDay = now.getUTCDate();
    if (currentMonth < month || (currentMonth === month && currentDay < day)) {
        age -= 1;
    }

    if (age < 18) {
        return { ok: false as const, error: "Must be 18+ to join", status: 403 };
    }

    return { ok: true as const, value: trimmed };
}

export async function PUT(request: NextRequest) {
    try {
        await checkRateLimit(request, "user/profile", STANDARD);
        const caller = await verifyAuth(request);

        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const payload = await request.json();
        const updates: Record<string, unknown> = {};

        if (typeof payload.displayName === "string" && payload.displayName.trim().length > 0) {
            updates.displayName = payload.displayName.trim();
        }

        if (payload.username !== undefined) {
            const normalizedUsername = normalizeUsername(payload.username);
            if (!normalizedUsername) {
                return NextResponse.json({ error: "Invalid username format" }, { status: 400 });
            }

            const existing = await adminDb.collection("users").where("username", "==", normalizedUsername).limit(1).get();
            if (!existing.empty && existing.docs[0].id !== caller.uid) {
                return NextResponse.json({ error: "Username already taken" }, { status: 409 });
            }

            updates.username = normalizedUsername;
        }

        let requestedBrowserPushToken: string | null | undefined;
        if (payload.notificationSettings !== undefined) {
            const normalizedNotificationSettings = normalizeNotificationSettings(payload.notificationSettings);
            if (!normalizedNotificationSettings) {
                return NextResponse.json({ error: "Invalid notification settings" }, { status: 400 });
            }
            updates.notificationSettings = normalizedNotificationSettings;
        }
        if (payload.browserPushToken !== undefined) {
            const normalizedBrowserPushToken = normalizeBrowserPushToken(payload.browserPushToken);
            if (normalizedBrowserPushToken === null && payload.browserPushToken !== null && payload.browserPushToken !== "") {
                return NextResponse.json({ error: "Invalid browser push token" }, { status: 400 });
            }
            requestedBrowserPushToken = normalizedBrowserPushToken;
        }

        if (payload.privacySettings !== undefined) {
            const normalizedPrivacySettings = normalizePrivacySettings(payload.privacySettings);
            if (!normalizedPrivacySettings) {
                return NextResponse.json({ error: "Invalid privacy settings" }, { status: 400 });
            }
            updates.privacySettings = normalizedPrivacySettings;
        }

        if (payload.accountSettings !== undefined) {
            const normalizedAccountSettings = normalizeAccountSettings(payload.accountSettings);
            if (!normalizedAccountSettings) {
                return NextResponse.json({ error: "Invalid account settings" }, { status: 400 });
            }
            updates.accountSettings = normalizedAccountSettings;
        }

        const userRef = adminDb.collection("users").doc(caller.uid);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const existingUserData = userSnap.data() ?? {};
        const existingFcmTokens = Array.isArray(existingUserData.fcmTokens)
            ? existingUserData.fcmTokens.filter((entry): entry is string => typeof entry === "string")
            : [];
        const existingNotificationSettings = normalizeNotificationSettings(existingUserData.notificationSettings) ?? {
            inAppEnabled: true,
            browserPushEnabled: false,
            newDropAlerts: true,
            expiringSoonAlerts: true,
        };
        const nextNotificationSettings = normalizeNotificationSettings(updates.notificationSettings);
        const shouldTrackNotificationsEnabled = Boolean(
            nextNotificationSettings?.browserPushEnabled
            && !existingNotificationSettings.browserPushEnabled,
        );
        const shouldClearBrowserPushTokens = Boolean(
            (payload.browserPushToken === null || payload.browserPushToken === "")
            || (nextNotificationSettings?.browserPushEnabled === false && existingFcmTokens.length > 0),
        );
        if (requestedBrowserPushToken) {
            updates.fcmTokens = FieldValue.arrayUnion(requestedBrowserPushToken);
        } else if (shouldClearBrowserPushTokens) {
            updates.fcmTokens = [];
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
        }

        const username = typeof existingUserData.username === "string" && existingUserData.username.trim().length > 0
            ? existingUserData.username.trim()
            : typeof existingUserData.displayName === "string" && existingUserData.displayName.trim().length > 0
                ? existingUserData.displayName.trim()
                : caller.email || caller.uid;

        await userRef.update(updates);

        if (shouldTrackNotificationsEnabled) {
            await recordCanonicalTaskEvent(caller.uid, username, "task_notifications_enabled", {
                source: "profile_api",
                browser_push_enabled: true,
                transaction_id: `${caller.uid}:browser_push_enabled`,
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "Profile.PUT");
    }
}

export async function POST(request: NextRequest) {
    try {
        await checkRateLimit(request, "user/profile", STANDARD);
        const caller = await verifyAuth(request);

        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const { username, dateOfBirth, bio, photoURL } = await request.json();
        const userId = caller.uid;

        if (username) {
            const normalized = normalizeUsername(username);
            if (!normalized) {
                return NextResponse.json({ error: "Invalid username format" }, { status: 400 });
            }
            const existing = await adminDb.collection("users").where("username", "==", normalized).limit(1).get();
            if (!existing.empty && existing.docs[0].id !== userId) {
                return NextResponse.json({ error: "Username already taken" }, { status: 409 });
            }
        }

        let normalizedDateOfBirth: string | undefined;
        if (dateOfBirth) {
            const parsedDob = parseAdultDateOfBirth(dateOfBirth);
            if (!parsedDob.ok) {
                return NextResponse.json(
                    { error: parsedDob.error },
                    { status: parsedDob.status ?? 400 },
                );
            }
            normalizedDateOfBirth = parsedDob.value;
        }

        const updates: Record<string, unknown> = {};
        if (username) updates.username = normalizeUsername(username);
        if (normalizedDateOfBirth) updates.dateOfBirth = normalizedDateOfBirth;
        if (bio !== undefined) updates.bio = bio;
        if (photoURL) updates.photoURL = photoURL;

        const userRef = adminDb.collection("users").doc(userId);
        await userRef.update(updates);

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "Profile.POST");
    }
}
