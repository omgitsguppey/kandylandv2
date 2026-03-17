import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAuth, handleApiError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";
import { generateUniqueUsernameSuggestion } from "@/lib/server/username-suggestions";
import { checkRateLimit, STRICT } from "@/lib/server/rate-limit";
import { PRIVACY_POLICY_VERSION } from "@/lib/privacy-policy";
import { trackServerEvent } from "@/lib/server/analytics";

function normalizeRegistrationMethod(value: unknown) {
    return value === "google" ? "google" : "email";
}

export async function POST(request: NextRequest) {
    try {
        await checkRateLimit(request, "user/register", STRICT);
        const caller = await verifyAuth(request);

        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const { username, dateOfBirth, displayName, referredBy, registrationMethod } = await request.json();
        const normalizedRegistrationMethod = normalizeRegistrationMethod(registrationMethod);

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

            if (typeof dateOfBirth === "string" && dateOfBirth.trim().length > 0 && typeof existingData.dateOfBirth !== "string") {
                profilePatch.dateOfBirth = dateOfBirth;
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

        if (dateOfBirth) {
            const dob = new Date(dateOfBirth);
            const ageDiff = Date.now() - dob.getTime();
            const ageDate = new Date(ageDiff);
            const age = Math.abs(ageDate.getUTCFullYear() - 1970);
            if (age < 18) {
                return NextResponse.json({ error: "Must be 18+ to join" }, { status: 403 });
            }
        }

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

        if (dateOfBirth) newProfile.dateOfBirth = dateOfBirth;

        await userRef.set(newProfile, { merge: true });

        // Handle referral logic
        if (referredBy && typeof referredBy === "string" && referredBy !== caller.uid) {
            try {
                const referrerRef = adminDb.collection("users").doc(referredBy);
                const referrerSnap = await referrerRef.get();
                if (referrerSnap.exists) {
                    // Update referrer balance
                    await referrerRef.update({
                        gumDropsBalance: FieldValue.increment(25)
                    });

                    // Create transaction record for referrer
                    const transactionRef = adminDb.collection("transactions").doc();
                    await transactionRef.set({
                        userId: referredBy,
                        type: "referral_bonus",
                        amount: 25,
                        timestamp: Date.now(),
                        description: `Referral bonus for inviting ${displayName || "a new user"}`,
                        metadata: {
                            referredUserId: caller.uid
                        }
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
            trackServerEvent("guided_onboarding_started", {
                source: "auto_after_signup",
                registration_method: normalizedRegistrationMethod,
                page_path: "/dashboard",
                onboarding_entry: "post_registration",
            }, caller.uid),
        ]);

        return NextResponse.json({ success: true, welcomeBonus: 50 });
    } catch (error) {
        return handleApiError(error, "User.Register");
    }
}
