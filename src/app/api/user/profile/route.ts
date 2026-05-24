import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { recordCanonicalTaskEvent } from "@/lib/server/daily-tasks";
import { PRIVACY_POLICY_VERSION } from "@/lib/platform-config";
import { normalizeUsername } from "@/lib/user-utils";
import { guardApiRequest } from "@/lib/server/request-guard";
import { parseAdultDateOfBirth } from "@/lib/user-profile-validation";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample , withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { reserveUsernameForUser } from "@/lib/server/username-suggestions";
import { buildNotFoundResponse } from "@/lib/server/not-found";
import { trackServerEvent } from "@/lib/server/analytics";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import {
    USER_PROFILE_HUMAN_ERRORS,
    buildCanonicalUserProfileResponse,
    getServerOnlyUserProfilePayloadKeys,
    sanitizeUserProfileWritePayload,
} from "@/lib/user/user-profile-contract";

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
const MAX_USER_PROFILE_BODY_BYTES = 16 * 1024;

function buildUserProfileErrorResponse(
    status: number,
    errorCode:
        | "unauthorized"
        | "invalid_request"
        | "validation_failed"
        | "conflict"
        | "username_taken"
        | "profile_missing"
        | "payload_too_large",
    message: string,
) {
    return NextResponse.json({
        success: false,
        error: message,
        errorCode,
        routeStatus: "expected_typed_client_error",
        retryable: false,
    }, { status });
}

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

async function reserveProfileUsername(input: {
    requestedUsername: string;
    userId: string;
    previousUsername?: string | null;
    applyUserMutation: (transaction: FirebaseFirestore.Transaction, normalizedUsername: string) => void | Promise<void>;
}) {
    const reservation = await reserveUsernameForUser({
        requestedUsername: input.requestedUsername,
        uid: input.userId,
        previousUsername: input.previousUsername,
        source: "user_profile",
        applyUserMutation: input.applyUserMutation,
    });

    if (!reservation.ok) {
        if (reservation.reason === "invalid") {
            return buildUserProfileErrorResponse(400, "validation_failed", "Invalid username format");
        }

        return buildUserProfileErrorResponse(409, "username_taken", "Username already taken");
    }

    return reservation.normalizedUsername;
}

async function PUT_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "user/profile",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const rawPayload = await readBoundedJsonBody<unknown>(request, {
            maxBytes: MAX_USER_PROFILE_BODY_BYTES,
            routeName: "user/profile",
            allowedContentTypes: ["application/json"],
        });
        const blockedServerOnlyKeys = getServerOnlyUserProfilePayloadKeys(rawPayload);
        const sanitizedPayload = sanitizeUserProfileWritePayload(rawPayload);
        if (!sanitizedPayload.ok) {
            const serverOnlyFieldError = USER_PROFILE_HUMAN_ERRORS.serverOnlyField;
            return NextResponse.json({
                error: blockedServerOnlyKeys.length > 0 ? serverOnlyFieldError : sanitizedPayload.error,
                errorCode: blockedServerOnlyKeys.length > 0 ? "forbidden" : "invalid_request",
                retryable: false,
                blockedFields: blockedServerOnlyKeys,
            }, { status: sanitizedPayload.status });
        }

        const payload = sanitizedPayload.payload;
        const updates: Record<string, unknown> = {};

        if (typeof payload.displayName === "string" && payload.displayName.trim().length > 0) {
            updates.displayName = payload.displayName.trim();
        }

        if (payload.username !== undefined) {
            const normalizedUsername = normalizeUsername(payload.username);
            if (!normalizedUsername) {
                return buildUserProfileErrorResponse(400, "validation_failed", "Invalid username format");
            }

            updates.username = normalizedUsername;
        }

        let requestedBrowserPushToken: string | null | undefined;
        if (payload.notificationSettings !== undefined) {
            const normalizedNotificationSettings = normalizeNotificationSettings(payload.notificationSettings);
            if (!normalizedNotificationSettings) {
                return buildUserProfileErrorResponse(400, "validation_failed", "Invalid notification settings");
            }
            updates.notificationSettings = normalizedNotificationSettings;
        }
        if (payload.browserPushToken !== undefined) {
            const normalizedBrowserPushToken = normalizeBrowserPushToken(payload.browserPushToken);
            if (normalizedBrowserPushToken === null && payload.browserPushToken !== null && payload.browserPushToken !== "") {
                return buildUserProfileErrorResponse(400, "validation_failed", "Invalid browser push token");
            }
            requestedBrowserPushToken = normalizedBrowserPushToken;
        }

        if (payload.privacySettings !== undefined) {
            const normalizedPrivacySettings = normalizePrivacySettings(payload.privacySettings);
            if (!normalizedPrivacySettings) {
                return buildUserProfileErrorResponse(400, "validation_failed", "Invalid privacy settings");
            }
            updates.privacySettings = normalizedPrivacySettings;
        }

        if (payload.accountSettings !== undefined) {
            const normalizedAccountSettings = normalizeAccountSettings(payload.accountSettings);
            if (!normalizedAccountSettings) {
                return buildUserProfileErrorResponse(400, "validation_failed", "Invalid account settings");
            }
            updates.accountSettings = normalizedAccountSettings;
        }

        if (payload.dateOfBirth !== undefined) {
            if (payload.dateOfBirth === null || payload.dateOfBirth === "") {
                return buildUserProfileErrorResponse(400, "validation_failed", "Date of birth cannot be removed.");
            } else {
                const parsedDob = parseAdultDateOfBirth(payload.dateOfBirth);
                if (!parsedDob.ok) {
                    return buildUserProfileErrorResponse(parsedDob.status ?? 400, "validation_failed", parsedDob.error);
                }
                updates.dateOfBirth = parsedDob.value;
            }
        }

        const userRef = adminDb.collection("users").doc(caller.uid);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            return buildNotFoundResponse("user", "User not found");
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
            return buildUserProfileErrorResponse(400, "invalid_request", USER_PROFILE_HUMAN_ERRORS.noValidUpdates);
        }

        const username = typeof existingUserData.username === "string" && existingUserData.username.trim().length > 0
            ? existingUserData.username.trim()
            : typeof existingUserData.displayName === "string" && existingUserData.displayName.trim().length > 0
                ? existingUserData.displayName.trim()
                : caller.email || caller.uid;

        if (typeof updates.username === "string") {
            const updatesWithoutUsername = { ...updates };
            delete updatesWithoutUsername.username;
            const reservedUsername = await reserveProfileUsername({
                requestedUsername: updates.username,
                userId: caller.uid,
                previousUsername: typeof existingUserData.username === "string" ? existingUserData.username : null,
                applyUserMutation: async (transaction, normalizedUsername) => {
                    transaction.update(userRef, {
                        ...updatesWithoutUsername,
                        username: normalizedUsername,
                    });
                },
            });
            if (reservedUsername instanceof NextResponse) {
                return reservedUsername;
            }
        } else {
            await userRef.update(updates);
        }

        if (shouldTrackNotificationsEnabled) {
            await recordCanonicalTaskEvent(caller.uid, username, "task_notifications_enabled", {
                source: "profile_api",
                browser_push_enabled: true,
                transaction_id: `${caller.uid}:browser_push_enabled`,
            });
        }

        await trackServerEvent("setting_save_succeeded", {
            source: "profile_api",
            route: "/api/user/profile",
            settings_surface: "account",
            setting_id: "account_profile",
            changed_field_count: Object.keys(updates).length,
        }, caller.uid);

        return NextResponse.json({ success: true });
    } catch (error) {
        if (isBoundedJsonBodyError(error)) {
            return buildUserProfileErrorResponse(
                error.status,
                error.code === "payload_too_large" ? "payload_too_large" : "invalid_request",
                error.message,
            );
        }
        return handleApiError(error, "Profile.PUT");
    }
}

export async function GET(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "user/profile:GET",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const caller = await guardApiRequest(request, {
            routeName: "user/profile",
            rateLimit: STANDARD,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller) {
            return finalize(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }

        if (!adminDb) {
            return finalize(NextResponse.json({ error: "Database not available" }, { status: 500 }));
        }

        const userSnapshot = await adminDb.collection("users").doc(caller.uid).get();
        if (!userSnapshot.exists) {
            return finalize(buildNotFoundResponse("user", "User not found"));
        }

        return finalize(NextResponse.json(buildCanonicalUserProfileResponse({
            userId: caller.uid,
            profile: userSnapshot.data() ?? null,
        })));
    } catch (error) {
        return finalize(handleApiError(error, "Profile.GET"), error);
    }
}

async function POST_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "user/profile",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const rawPayload = await readBoundedJsonBody<unknown>(request, {
            maxBytes: MAX_USER_PROFILE_BODY_BYTES,
            routeName: "user/profile",
            allowedContentTypes: ["application/json"],
        });
        const blockedServerOnlyKeys = getServerOnlyUserProfilePayloadKeys(rawPayload);
        const sanitizedPayload = sanitizeUserProfileWritePayload(rawPayload);
        if (!sanitizedPayload.ok) {
            const serverOnlyFieldError = USER_PROFILE_HUMAN_ERRORS.serverOnlyField;
            return NextResponse.json({
                error: blockedServerOnlyKeys.length > 0 ? serverOnlyFieldError : sanitizedPayload.error,
                errorCode: blockedServerOnlyKeys.length > 0 ? "forbidden" : "invalid_request",
                retryable: false,
                blockedFields: blockedServerOnlyKeys,
            }, { status: sanitizedPayload.status });
        }

        const { username, dateOfBirth, bio, photoURL } = sanitizedPayload.payload;
        const userId = caller.uid;

        if (username) {
            const normalized = normalizeUsername(username);
            if (!normalized) {
                return buildUserProfileErrorResponse(400, "validation_failed", "Invalid username format");
            }
        }

        let normalizedDateOfBirth: string | undefined;
        if (dateOfBirth) {
            const parsedDob = parseAdultDateOfBirth(dateOfBirth);
            if (!parsedDob.ok) {
                return buildUserProfileErrorResponse(parsedDob.status ?? 400, "validation_failed", parsedDob.error);
            }
            normalizedDateOfBirth = parsedDob.value;
        }

        const updates: Record<string, unknown> = {};
        if (username) updates.username = normalizeUsername(username);
        if (normalizedDateOfBirth) updates.dateOfBirth = normalizedDateOfBirth;
        if (bio !== undefined) updates.bio = bio;
        if (photoURL) updates.photoURL = photoURL;

        if (Object.keys(updates).length === 0) {
            return buildUserProfileErrorResponse(400, "invalid_request", USER_PROFILE_HUMAN_ERRORS.noValidUpdates);
        }

        const userRef = adminDb.collection("users").doc(userId);
        if (typeof updates.username === "string") {
            const userSnap = await userRef.get();
            const existingUserData = userSnap.data() ?? {};
            const updatesWithoutUsername = { ...updates };
            delete updatesWithoutUsername.username;
            const reservedUsername = await reserveProfileUsername({
                requestedUsername: updates.username,
                userId,
                previousUsername: typeof existingUserData.username === "string" ? existingUserData.username : null,
                applyUserMutation: async (transaction, normalizedUsername) => {
                    transaction.update(userRef, {
                        ...updatesWithoutUsername,
                        username: normalizedUsername,
                    });
                },
            });
            if (reservedUsername instanceof NextResponse) {
                return reservedUsername;
            }
        } else {
            await userRef.update(updates);
        }

        await trackServerEvent("setting_save_succeeded", {
            source: "profile_api",
            route: "/api/user/profile",
            settings_surface: "account",
            setting_id: "account_profile",
            changed_field_count: Object.keys(updates).length,
        }, caller.uid);

        return NextResponse.json({ success: true });
    } catch (error) {
        if (isBoundedJsonBodyError(error)) {
            return buildUserProfileErrorResponse(
                error.status,
                error.code === "payload_too_large" ? "payload_too_large" : "invalid_request",
                error.message,
            );
        }
        return handleApiError(error, "Profile.POST");
    }
}

export let PUT = withRouteRuntimeHealth("user/profile:PUT", PUT_handler);
export let POST = withRouteRuntimeHealth("user/profile:POST", POST_handler);
