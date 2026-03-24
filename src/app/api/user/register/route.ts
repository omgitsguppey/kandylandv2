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
import { computeNextGumdropBalance, normalizeGumdropBalance } from "@/lib/gumdrop-ledger";
import { buildCompletedGumdropTransaction } from "@/lib/server/gumdrop-ledger";

function normalizeRegistrationMethod(value: unknown) {
    return value === "google" ? "google" : "email";
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

        const { username, dateOfBirth, displayName, referredBy, registrationMethod } = await request.json();
        const normalizedRegistrationMethod = normalizeRegistrationMethod(registrationMethod);
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

            return NextResponse.json({ success: true, existing: true });
        }

        const normalizedUsername = await generateUniqueUsernameSuggestion({
            preferredUsername: typeof username === "string" ? username : null,
            displayName: typeof displayName === "string" ? displayName : null,
            email: caller.email,
            uid: caller.uid,
        });

        const newProfile: Record<string, unknown> = {
            uid: caller.uid,
            email: caller.email,
            displayName: displayName || "User",
            username: normalizedUsername,
            onboardingCompleted: false,
            gumDropsBalance: 50,
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

        // Handle referral logic
        if (referredBy && typeof referredBy === "string" && referredBy !== caller.uid) {
            try {
                const referrerRef = adminDb.collection("users").doc(referredBy);
                const referrerSnap = await referrerRef.get();
                if (referrerSnap.exists) {
                    await adminDb.runTransaction(async (transaction) => {
                        const latestReferrerSnap = await transaction.get(referrerRef);
                        if (!latestReferrerSnap.exists) {
                            return;
                        }

                        const currentBalance = normalizeGumdropBalance(latestReferrerSnap.data()?.gumDropsBalance);
                        const nextBalance = computeNextGumdropBalance(currentBalance, 25);
                        const transactionRef = adminDb.collection("transactions").doc();

                        transaction.update(referrerRef, {
                            gumDropsBalance: FieldValue.increment(25),
                        });
                        transaction.set(transactionRef, buildCompletedGumdropTransaction({
                            userId: referredBy,
                            type: "referral_bonus",
                            amount: 25,
                            description: `Referral bonus for inviting ${displayName || "a new user"}`,
                            balanceBefore: currentBalance,
                            balanceAfter: nextBalance,
                            extra: {
                                metadata: {
                                    referredUserId: caller.uid,
                                },
                            },
                        }));
                    });
                }
            } catch (err) {
                console.error("Failed to process referral bonus:", err);
                // Do not fail registration if referral processing fails
            }
        }

        await Promise.allSettled([
            trackServerEvent("user_registered", {
                registration_method: normalizedRegistrationMethod,
                welcome_bonus_gumdrops: 50,
                has_referral_code: typeof referredBy === "string" && referredBy.trim().length > 0,
                page_path: "/dashboard",
            }, caller.uid),
        ]);

        return NextResponse.json({ success: true, welcomeBonus: 50 });
    } catch (error) {
        return handleApiError(error, "User.Register");
    }
}
