import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";
import { checkUsernameAvailability, generateUniqueUsernameSuggestion, reserveUsernameForUser } from "@/lib/server/username-suggestions";
import { STRICT } from "@/lib/server/rate-limit";
import { PRIVACY_POLICY_VERSION, REFERRAL_BONUS_GD } from "@/lib/platform-config";
import { trackServerEvent } from "@/lib/server/analytics";
import { guardApiRequest } from "@/lib/server/request-guard";
import { parseAdultDateOfBirth } from "@/lib/user-profile-validation";
import { buildSourceAwareBalancePatch, creditSourceAwareGumdrops, normalizeGumdropBalance, readSourceAwareBalance } from "@/lib/gumdrop-ledger";
import { buildCompletedGumdropTransaction } from "@/lib/server/gumdrop-ledger";
import { touchUserRuntime } from "@/lib/server/user-runtime";
import { ensureCreatorOnboardingSubmission } from "@/lib/server/creator-onboarding";
import { sendCreatorOnboardingAdminNotification } from "@/lib/server/creator-onboarding-alerts";
import { getErrorMessage, recordRouteWarning } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import { sanitizeCreatorIntakeFields, type CreatorIntakeFields } from "@/lib/creator-intake-flow";
import {
    actorMarkerToTelemetryPayload,
    assertKnownActor,
    buildActorMarker,
    type ActorMarker,
} from "@/lib/identity/actor-markers";

const MAX_USER_REGISTER_BODY_BYTES = 32 * 1024;

function buildUserRegisterErrorResponse(
    status: number,
    errorCode: "unauthorized" | "invalid_request" | "validation_failed" | "username_taken" | "payload_too_large",
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

function normalizeRegistrationMethod(value: unknown) {
    return value === "google" ? "google" : "email";
}

function normalizeSignupIntent(value: unknown) {
    return value === "creator" ? "creator" : "fan";
}

async function resolveRegistrationUsername(input: {
    requestedUsername: unknown;
    displayName: unknown;
    email: string | undefined;
    uid: string;
    excludeUid?: string;
}) {
    const requestedUsername = typeof input.requestedUsername === "string" ? input.requestedUsername.trim() : "";
    if (requestedUsername.length > 0) {
        const availability = await checkUsernameAvailability(requestedUsername, input.excludeUid);
        if (!availability.normalized) {
            return buildUserRegisterErrorResponse(400, "validation_failed", "Use 3-20 lowercase letters, numbers, dashes, or underscores.");
        }

        if (!availability.available) {
            return NextResponse.json(
                {
                    error: "Username is already taken.",
                    errorCode: "username_taken",
                    authErrorCode: "auth/username-already-in-use",
                    retryable: false,
                },
                { status: 409 },
            );
        }

        return availability.normalized;
    }

    return generateUniqueUsernameSuggestion({
        preferredUsername: null,
        displayName: typeof input.displayName === "string" ? input.displayName : null,
        email: input.email,
        uid: input.uid,
        excludeUid: input.excludeUid,
    });
}

async function reserveRegistrationUsername(input: {
    requestedUsername: string;
    userId: string;
    previousUsername?: string | null;
    applyUserMutation?: (transaction: FirebaseFirestore.Transaction, normalizedUsername: string) => void | Promise<void>;
}) {
    const reservation = await reserveUsernameForUser({
        requestedUsername: input.requestedUsername,
        uid: input.userId,
        previousUsername: input.previousUsername,
        source: "user_register",
        applyUserMutation: input.applyUserMutation,
    });

    if (!reservation.ok) {
        if (reservation.reason === "invalid") {
            return buildUserRegisterErrorResponse(400, "validation_failed", "Use 3-20 lowercase letters, numbers, dashes, or underscores.");
        }

        return NextResponse.json(
            {
                error: "Username is already taken.",
                errorCode: "username_taken",
                authErrorCode: "auth/username-already-in-use",
                retryable: false,
            },
            { status: 409 },
        );
    }

    return reservation.normalizedUsername;
}

async function emitCreatorSubmissionSignals(input: {
    userId: string;
    creatorDisplayName: string;
    actorMarker: ActorMarker;
    onboardingStatus?: string;
    legalStatus?: string;
    creatorIntakeFields?: CreatorIntakeFields | null;
}) {
    const actorPayload = actorMarkerToTelemetryPayload(input.actorMarker);
    const selectedGoals = input.creatorIntakeFields?.creatorMonetizationGoals?.join("|") ?? "";
    await Promise.allSettled([
        trackServerEvent("creator_intake_submitted", {
            page_path: "/api/user/register",
            signup_intent: "creator",
            step_key: "submit_for_review",
            selected_goals: selectedGoals,
            creator_recommended_setup: input.creatorIntakeFields?.creatorRecommendedSetup ?? "",
            intake_version: input.creatorIntakeFields?.intakeVersion ?? "",
            ...actorPayload,
            source: "creator_intake",
            route: "/api/user/register",
        }, input.userId),
        trackServerEvent("creator_onboarding_submitted", {
            page_path: "/api/user/register",
            creator_display_name: input.creatorDisplayName,
            onboarding_status: input.onboardingStatus ?? "",
            legal_status: input.legalStatus ?? "",
            selected_goals: selectedGoals,
            creator_recommended_setup: input.creatorIntakeFields?.creatorRecommendedSetup ?? "",
            intake_version: input.creatorIntakeFields?.intakeVersion ?? "",
            ...actorPayload,
        }, input.userId),
        trackServerEvent("creator_admin_queue_materialized", {
            page_path: "/admin/roster",
            creator_display_name: input.creatorDisplayName,
            onboarding_status: input.onboardingStatus ?? "",
            legal_status: input.legalStatus ?? "",
            ...actorPayload,
        }, input.userId),
        sendCreatorOnboardingAdminNotification({
            eventKey: `creator_onboarding_submitted:${input.userId}`,
            title: "New creator onboarding submission",
            message: `${input.creatorDisplayName} is waiting for creator review.`,
            link: `/admin/user/${input.userId}`,
        }),
    ]);
}

function buildCreatorSignupMarker(input: {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    occurredAt: number;
}) {
    return assertKnownActor(buildActorMarker({
        actor: {
            uid: input.uid,
            email: input.email,
            role: "user",
        },
        targetUserId: input.uid,
        targetCreatorId: input.uid,
        performedAs: "own_account",
        surface: "creator_intake",
        route: "/api/user/register",
        actionKey: "creator_signup_submit",
        occurredAt: input.occurredAt,
        dedupeKey: `creator_signup_submit:${input.uid}`,
        source: "user_register",
    }));
}

export async function POST(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "user/register:POST",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const caller = await guardApiRequest(request, {
            routeName: "user/register",
            rateLimit: STRICT,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller) {
            return finalize(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }

        if (!adminDb) {
            return finalize(NextResponse.json({ error: "Database not available" }, { status: 500 }));
        }

        const {
            username,
            dateOfBirth,
            displayName,
            referredBy,
            registrationMethod,
            signupIntent,
            creatorDisplayName,
            creatorMonetizationGoals,
            creatorPrimaryPlatform,
            creatorFollowerRange,
            creatorPostingFrequency,
            creatorContentFocus,
            fansAlreadyAskForAccess,
            creatorRecommendedSetup,
        } = await readBoundedJsonBody<Record<string, unknown>>(request, {
            maxBytes: MAX_USER_REGISTER_BODY_BYTES,
            routeName: "user/register",
            allowedContentTypes: ["application/json"],
        });
        const normalizedRegistrationMethod = normalizeRegistrationMethod(registrationMethod);
        const normalizedSignupIntent = normalizeSignupIntent(signupIntent);
        const isCreatorSignup = normalizedSignupIntent === "creator";
        const registrationTimestampMs = Date.now();
        const creatorIntakeFields = isCreatorSignup
            ? sanitizeCreatorIntakeFields({
                creatorMonetizationGoals,
                creatorFollowerRange,
                creatorPostingFrequency,
                fansAlreadyAskForAccess,
                creatorRecommendedSetup,
            })
            : null;
        const parsedDob = dateOfBirth ? parseAdultDateOfBirth(dateOfBirth) : null;
        if (parsedDob && !parsedDob.ok) {
            return finalize(buildUserRegisterErrorResponse(parsedDob.status ?? 400, "validation_failed", parsedDob.error));
        }

        const userRef = adminDb.collection("users").doc(caller.uid);
        const existingSnap = await userRef.get();
        if (existingSnap.exists) {
            const existingData = existingSnap.data() ?? {};
            const profilePatch: Record<string, unknown> = {};

            if (typeof displayName === "string" && displayName.trim().length > 0) {
                const normalizedDisplayName = displayName.trim();
                if (typeof existingData.displayName !== "string" || existingData.displayName.trim() === "" || existingData.displayName === "User") {
                    profilePatch.displayName = normalizedDisplayName;
                }
            }

            if (parsedDob?.ok && typeof existingData.dateOfBirth !== "string") {
                profilePatch.dateOfBirth = parsedDob.value;
            }

            if (typeof username === "string" && username.trim().length > 0) {
                const existingUsername = typeof existingData.username === "string" ? existingData.username.trim() : "";
                const existingDisplayName = typeof existingData.displayName === "string" ? existingData.displayName.trim() : "";
                const existingDateOfBirth = typeof existingData.dateOfBirth === "string" ? existingData.dateOfBirth.trim() : "";
                if (!existingUsername || existingUsername === "user" || existingUsername === caller.uid || existingDisplayName === "User" || existingDateOfBirth === "") {
                    const resolvedUsername = await resolveRegistrationUsername({
                        requestedUsername: username,
                        displayName,
                        email: caller.email,
                        uid: caller.uid,
                        excludeUid: caller.uid,
                    });
                    if (resolvedUsername instanceof NextResponse) {
                        return finalize(resolvedUsername);
                    }
                    profilePatch.username = resolvedUsername;
                }
            }

            if (typeof profilePatch.username === "string") {
                const profilePatchWithoutUsername = { ...profilePatch };
                delete profilePatchWithoutUsername.username;
                const reservedUsername = await reserveRegistrationUsername({
                    requestedUsername: profilePatch.username,
                    userId: caller.uid,
                    previousUsername: typeof existingData.username === "string" ? existingData.username : null,
                    applyUserMutation: async (transaction, normalizedUsername) => {
                        transaction.set(userRef, {
                            ...profilePatchWithoutUsername,
                            username: normalizedUsername,
                        }, { merge: true });
                    },
                });
                if (reservedUsername instanceof NextResponse) {
                    return finalize(reservedUsername);
                }
            } else if (Object.keys(profilePatch).length > 0) {
                await userRef.set(profilePatch, { merge: true });
            }

            const creatorSignupMarker = isCreatorSignup
                ? buildCreatorSignupMarker({
                    uid: caller.uid,
                    email: caller.email,
                    displayName: typeof displayName === "string" ? displayName : null,
                    occurredAt: registrationTimestampMs,
                })
                : null;
            const creatorSubmission = isCreatorSignup
                ? await ensureCreatorOnboardingSubmission({
                    userId: caller.uid,
                    email: caller.email ?? null,
                    displayName: typeof displayName === "string" && displayName.trim().length > 0
                        ? displayName.trim()
                        : typeof existingData.displayName === "string"
                            ? existingData.displayName
                            : "",
                    username: typeof profilePatch.username === "string"
                        ? profilePatch.username
                        : typeof existingData.username === "string"
                            ? existingData.username
                            : "",
                    photoURL: typeof existingData.photoURL === "string" ? existingData.photoURL : null,
                    role: existingData.role === "creator" || existingData.role === "admin" || existingData.role === "user"
                        ? existingData.role
                        : "user",
                    createdAt: typeof existingData.createdAt === "number" ? existingData.createdAt : Date.now(),
                    creatorDisplayName: typeof creatorDisplayName === "string" && creatorDisplayName.trim().length > 0
                        ? creatorDisplayName.trim()
                        : typeof displayName === "string" && displayName.trim().length > 0
                            ? displayName.trim()
                            : typeof existingData.displayName === "string" && existingData.displayName.trim().length > 0
                                ? existingData.displayName.trim()
                                : typeof profilePatch.username === "string" && profilePatch.username.trim().length > 0
                                    ? profilePatch.username.trim()
                                    : typeof existingData.username === "string" && existingData.username.trim().length > 0
                                        ? existingData.username.trim()
                                        : "Creator",
                    creatorMonetizationGoals: creatorIntakeFields?.creatorMonetizationGoals,
                    creatorPrimaryPlatform: typeof creatorPrimaryPlatform === "string" ? creatorPrimaryPlatform : undefined,
                    creatorFollowerRange: creatorIntakeFields?.creatorFollowerRange,
                    creatorPostingFrequency: creatorIntakeFields?.creatorPostingFrequency,
                    creatorContentFocus: typeof creatorContentFocus === "string" ? creatorContentFocus : undefined,
                    fansAlreadyAskForAccess: creatorIntakeFields?.fansAlreadyAskForAccess,
                    creatorRecommendedSetup: creatorIntakeFields?.creatorRecommendedSetup,
                    intakeVersion: creatorIntakeFields?.intakeVersion,
                    intakeSubmittedAt: registrationTimestampMs,
                    intakeSource: creatorIntakeFields?.intakeSource,
                    actor: creatorSignupMarker
                        ? {
                            id: creatorSignupMarker.actorUid ?? caller.uid,
                            role: "user",
                            label: creatorSignupMarker.actorEmail ?? caller.uid,
                            marker: creatorSignupMarker,
                        }
                        : undefined,
                })
                : null;

            if (creatorSubmission?.created) {
                await emitCreatorSubmissionSignals({
                    userId: caller.uid,
                    creatorDisplayName: creatorSubmission.creatorApplication.creatorDisplayName,
                    actorMarker: creatorSignupMarker!,
                    onboardingStatus: creatorSubmission.creatorApplication.submissionStatus,
                    legalStatus: creatorSubmission.creatorApplication.legalStatus,
                    creatorIntakeFields,
                });
            }

            return finalize(NextResponse.json({
                success: true,
                existing: true,
                welcomeBonus: 0,
                creatorApplication: creatorSubmission?.creatorApplication ?? existingData.creatorApplication ?? null,
            }));
        }

        const resolvedUsername = await resolveRegistrationUsername({
            requestedUsername: username,
            displayName,
            email: caller.email,
            uid: caller.uid,
        });
        if (resolvedUsername instanceof NextResponse) {
            return finalize(resolvedUsername);
        }

        const welcomeBonus = isCreatorSignup ? 0 : 50;
        const newProfile: Record<string, unknown> = {
            uid: caller.uid,
            email: caller.email,
            displayName: (isCreatorSignup ? creatorDisplayName : displayName) || displayName || "User",
            username: resolvedUsername,
            onboardingCompleted: false,
            gumDropsBalance: welcomeBonus,
            gumDropsPurchasedBalance: 0,
            gumDropsRewardBalance: welcomeBonus,
            unlockedContent: [],
            unlockedContentTimestamps: {},
            notificationSettings: {
                inAppEnabled: true,
                browserPushEnabled: false,
                newDropAlerts: true,
                expiringSoonAlerts: true,
            },
            privacySettings: {
                anonymousAnalyticsEnabled: false,
                identifiedAnalyticsEnabled: false,
                allowRecommendations: false,
                showInAnonymousStats: false,
                honorGlobalPrivacyControl: true,
                consentUpdatedAt: 0,
                privacyPolicyVersion: PRIVACY_POLICY_VERSION,
            },
            accountSettings: {
                timezone: "Auto",
            },
            createdAt: FieldValue.serverTimestamp(),
        };

        if (parsedDob?.ok) newProfile.dateOfBirth = parsedDob.value;
        const normalizedUsername = await reserveRegistrationUsername({
            requestedUsername: resolvedUsername,
            userId: caller.uid,
            applyUserMutation: async (transaction, reservedUsername) => {
                transaction.set(userRef, {
                    ...newProfile,
                    username: reservedUsername,
                }, { merge: true });
            },
        });
        if (normalizedUsername instanceof NextResponse) {
            return finalize(normalizedUsername);
        }

        const creatorSignupMarker = isCreatorSignup
            ? buildCreatorSignupMarker({
                uid: caller.uid,
                email: caller.email,
                displayName: typeof displayName === "string" ? displayName : null,
                occurredAt: registrationTimestampMs,
            })
            : null;
        const creatorSubmission = isCreatorSignup
            ? await ensureCreatorOnboardingSubmission({
                userId: caller.uid,
                email: caller.email ?? null,
                displayName: typeof displayName === "string" && displayName.trim().length > 0
                    ? displayName.trim()
                    : normalizedUsername,
                username: normalizedUsername,
                photoURL: null,
                role: "user",
                createdAt: Date.now(),
                creatorDisplayName: typeof creatorDisplayName === "string" && creatorDisplayName.trim().length > 0
                    ? creatorDisplayName.trim()
                    : typeof displayName === "string" && displayName.trim().length > 0
                        ? displayName.trim()
                        : normalizedUsername,
                creatorMonetizationGoals: creatorIntakeFields?.creatorMonetizationGoals,
                creatorPrimaryPlatform: typeof creatorPrimaryPlatform === "string" ? creatorPrimaryPlatform : undefined,
                creatorFollowerRange: creatorIntakeFields?.creatorFollowerRange,
                creatorPostingFrequency: creatorIntakeFields?.creatorPostingFrequency,
                creatorContentFocus: typeof creatorContentFocus === "string" ? creatorContentFocus : undefined,
                fansAlreadyAskForAccess: creatorIntakeFields?.fansAlreadyAskForAccess,
                creatorRecommendedSetup: creatorIntakeFields?.creatorRecommendedSetup,
                intakeVersion: creatorIntakeFields?.intakeVersion,
                intakeSubmittedAt: registrationTimestampMs,
                intakeSource: creatorIntakeFields?.intakeSource,
                actor: creatorSignupMarker
                    ? {
                        id: creatorSignupMarker.actorUid ?? caller.uid,
                        role: "user",
                        label: creatorSignupMarker.actorEmail ?? caller.uid,
                        marker: creatorSignupMarker,
                    }
                    : undefined,
            })
            : null;

        if (creatorSubmission?.created) {
                await emitCreatorSubmissionSignals({
                    userId: caller.uid,
                    creatorDisplayName: creatorSubmission.creatorApplication.creatorDisplayName,
                    actorMarker: creatorSignupMarker!,
                    onboardingStatus: creatorSubmission.creatorApplication.submissionStatus,
                    legalStatus: creatorSubmission.creatorApplication.legalStatus,
                    creatorIntakeFields,
                });
            }

        // Handle referral logic
        if (!isCreatorSignup && referredBy && typeof referredBy === "string" && referredBy !== caller.uid) {
            try {
                const referrerRef = adminDb.collection("users").doc(referredBy);
                const referrerSnap = await referrerRef.get();
                if (referrerSnap.exists) {
                    await adminDb.runTransaction(async (transaction) => {
                        const latestReferrerSnap = await transaction.get(referrerRef);
                        if (!latestReferrerSnap.exists) {
                            return;
                        }

                        const sourceAwareBalance = readSourceAwareBalance(latestReferrerSnap.data() ?? {});
                        const currentBalance = normalizeGumdropBalance(sourceAwareBalance.total);
                        const nextBalance = creditSourceAwareGumdrops(sourceAwareBalance, REFERRAL_BONUS_GD, "reward");
                        const transactionRef = adminDb.collection("transactions").doc();

                        transaction.update(referrerRef, buildSourceAwareBalancePatch(nextBalance));
                        transaction.set(transactionRef, buildCompletedGumdropTransaction({
                            userId: referredBy,
                            type: "referral_bonus",
                            amount: REFERRAL_BONUS_GD,
                            description: `Referral bonus for inviting ${displayName || "a new user"}`,
                            balanceBefore: currentBalance,
                            balanceAfter: nextBalance.total,
                            extra: {
                                metadata: {
                                    referredUserId: caller.uid,
                                },
                            },
                        }));
                    });
                    await touchUserRuntime(referredBy, {
                        activity: true,
                        profile: true,
                    });
                }
            } catch (err) {
                recordRouteWarning("user/register", "Referral bonus processing failed", {
                    routeName: "user/register",
                    referredBy,
                    uid: caller.uid,
                    message: err instanceof Error ? err.message : String(err),
                });
                // Do not fail registration if referral processing fails
            }
        }

        await Promise.allSettled([
            trackServerEvent("user_registered", {
                registration_method: normalizedRegistrationMethod,
                signup_intent: normalizedSignupIntent,
                welcome_bonus_gumdrops: welcomeBonus,
                has_referral_code: !isCreatorSignup && typeof referredBy === "string" && referredBy.trim().length > 0,
                page_path: isCreatorSignup ? "/creators/waitlist" : "/dashboard",
                creator_application_submitted: isCreatorSignup,
                creator_recommended_setup: creatorIntakeFields?.creatorRecommendedSetup ?? "",
                selected_goals: creatorIntakeFields?.creatorMonetizationGoals?.join("|") ?? "",
                ...(creatorSignupMarker ? actorMarkerToTelemetryPayload(creatorSignupMarker) : {}),
            }, caller.uid),
        ]);

        return finalize(NextResponse.json({
            success: true,
            welcomeBonus,
            creatorApplication: creatorSubmission?.creatorApplication ?? null,
        }));
    } catch (error) {
        if (isBoundedJsonBodyError(error)) {
            return finalize(buildUserRegisterErrorResponse(
                error.status,
                error.code === "payload_too_large" ? "payload_too_large" : "invalid_request",
                error.message,
            ), error);
        }
        return finalize(handleApiError(error, "User.Register"), error);
    }
}
