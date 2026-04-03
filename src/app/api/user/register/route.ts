import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";
import { generateUniqueUsernameSuggestion } from "@/lib/server/username-suggestions";
import { STRICT } from "@/lib/server/rate-limit";
import { PRIVACY_POLICY_VERSION } from "@/lib/privacy-policy";
import { trackServerEvent } from "@/lib/server/analytics";
import { guardApiRequest } from "@/lib/server/request-guard";
import { parseAdultDateOfBirth } from "@/lib/user-profile-validation";
import { buildSourceAwareBalancePatch, creditSourceAwareGumdrops, normalizeGumdropBalance, readSourceAwareBalance } from "@/lib/gumdrop-ledger";
import { buildCompletedGumdropTransaction } from "@/lib/server/gumdrop-ledger";
import { touchUserRuntime } from "@/lib/server/user-runtime";
import { ensureCreatorOnboardingSubmission } from "@/lib/server/creator-onboarding";
import { sendCreatorOnboardingAdminNotification } from "@/lib/server/creator-onboarding-alerts";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";

function normalizeRegistrationMethod(value: unknown) {
    return value === "google" ? "google" : "email";
}

function normalizeSignupIntent(value: unknown) {
    return value === "creator" ? "creator" : "fan";
}

async function emitCreatorSubmissionSignals(input: {
    userId: string;
    creatorDisplayName: string;
    queuePosition?: number;
}) {
    await Promise.allSettled([
        trackServerEvent("creator_onboarding_submitted", {
            page_path: "/api/user/register",
            creator_display_name: input.creatorDisplayName,
            queue_position: input.queuePosition ?? 0,
        }, input.userId),
        trackServerEvent("creator_admin_queue_materialized", {
            page_path: "/admin/roster",
            creator_display_name: input.creatorDisplayName,
            queue_position: input.queuePosition ?? 0,
        }, input.userId),
        sendCreatorOnboardingAdminNotification({
            eventKey: `creator_onboarding_submitted:${input.userId}`,
            title: "New creator onboarding submission",
            message: `${input.creatorDisplayName} is waiting for creator review.`,
            link: `/admin/user/${input.userId}`,
        }),
    ]);
}

export async function POST(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "user/register",
            rateLimit: STRICT,
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

        const {
            username,
            dateOfBirth,
            displayName,
            referredBy,
            registrationMethod,
            signupIntent,
            creatorDisplayName,
            creatorPrimaryPlatform,
            creatorContentFocus,
        } = await request.json();
        const normalizedRegistrationMethod = normalizeRegistrationMethod(registrationMethod);
        const normalizedSignupIntent = normalizeSignupIntent(signupIntent);
        const isCreatorSignup = normalizedSignupIntent === "creator";
        const parsedDob = dateOfBirth ? parseAdultDateOfBirth(dateOfBirth) : null;
        if (parsedDob && !parsedDob.ok) {
            return NextResponse.json(
                { error: parsedDob.error },
                { status: parsedDob.status ?? 400 },
            );
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
                const requestedUsername = username.trim();
                const existingUsername = typeof existingData.username === "string" ? existingData.username.trim() : "";
                const existingDisplayName = typeof existingData.displayName === "string" ? existingData.displayName.trim() : "";
                const existingDateOfBirth = typeof existingData.dateOfBirth === "string" ? existingData.dateOfBirth.trim() : "";
                if (!existingUsername || existingUsername === "user" || existingUsername === caller.uid || existingDisplayName === "User" || existingDateOfBirth === "") {
                    profilePatch.username = await generateUniqueUsernameSuggestion({
                        preferredUsername: requestedUsername,
                        displayName: typeof displayName === "string" ? displayName : null,
                        email: caller.email,
                        uid: caller.uid,
                    });
                }
            }

            if (Object.keys(profilePatch).length > 0) {
                await userRef.set(profilePatch, { merge: true });
            }

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
                    creatorPrimaryPlatform: typeof creatorPrimaryPlatform === "string" ? creatorPrimaryPlatform : undefined,
                    creatorContentFocus: typeof creatorContentFocus === "string" ? creatorContentFocus : undefined,
                })
                : null;

            if (creatorSubmission?.created) {
                await emitCreatorSubmissionSignals({
                    userId: caller.uid,
                    creatorDisplayName: creatorSubmission.creatorApplication.creatorDisplayName,
                    queuePosition: creatorSubmission.creatorApplication.queuePosition,
                });
            }

            return NextResponse.json({
                success: true,
                existing: true,
                welcomeBonus: 0,
                creatorApplication: creatorSubmission?.creatorApplication ?? existingData.creatorApplication ?? null,
            });
        }

        const normalizedUsername = await generateUniqueUsernameSuggestion({
            preferredUsername: typeof username === "string" ? username : null,
            displayName: typeof displayName === "string" ? displayName : null,
            email: caller.email,
            uid: caller.uid,
        });

        const welcomeBonus = isCreatorSignup ? 0 : 50;
        const newProfile: Record<string, unknown> = {
            uid: caller.uid,
            email: caller.email,
            displayName: (isCreatorSignup ? creatorDisplayName : displayName) || displayName || "User",
            username: normalizedUsername,
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
        await userRef.set(newProfile, { merge: true });

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
                creatorPrimaryPlatform: typeof creatorPrimaryPlatform === "string" ? creatorPrimaryPlatform : undefined,
                creatorContentFocus: typeof creatorContentFocus === "string" ? creatorContentFocus : undefined,
            })
            : null;

        if (creatorSubmission?.created) {
            await emitCreatorSubmissionSignals({
                userId: caller.uid,
                creatorDisplayName: creatorSubmission.creatorApplication.creatorDisplayName,
                queuePosition: creatorSubmission.creatorApplication.queuePosition,
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
                        const nextBalance = creditSourceAwareGumdrops(sourceAwareBalance, 25, "reward");
                        const transactionRef = adminDb.collection("transactions").doc();

                        transaction.update(referrerRef, buildSourceAwareBalancePatch(nextBalance));
                        transaction.set(transactionRef, buildCompletedGumdropTransaction({
                            userId: referredBy,
                            type: "referral_bonus",
                            amount: 25,
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
                creator_queue_position: creatorSubmission?.creatorApplication.queuePosition,
            }, caller.uid),
        ]);

        return NextResponse.json({
            success: true,
            welcomeBonus,
            creatorApplication: creatorSubmission?.creatorApplication ?? null,
        });
    } catch (error) {
        return handleApiError(error, "User.Register");
    }
}
