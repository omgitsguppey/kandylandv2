import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAuth, handleApiError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";
import { normalizeUsername } from "@/lib/user-utils";
import { checkRateLimit, STRICT } from "@/lib/server/rate-limit";

function buildFallbackUsername(uid: string): string {
    return `user_${uid.slice(0, 8).toLowerCase()}`;
}

export async function POST(request: NextRequest) {
    try {
        await checkRateLimit(request, "user/register", STRICT);
        const caller = await verifyAuth(request);

        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const { username, dateOfBirth, displayName, referredBy } = await request.json();

        const userRef = adminDb.collection("users").doc(caller.uid);
        const existingSnap = await userRef.get();
        if (existingSnap.exists) {
            return NextResponse.json({ success: true, existing: true });
        }

        let normalizedUsername = normalizeUsername(username);
        if (!normalizedUsername) {
            normalizedUsername = buildFallbackUsername(caller.uid);
        }

        const existing = await adminDb.collection("users").where("username", "==", normalizedUsername).limit(1).get();
        if (!existing.empty) {
            normalizedUsername = `${normalizedUsername}_${caller.uid.slice(0, 4).toLowerCase()}`;
        }

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
                allowRecommendations: true,
                showInAnonymousStats: true,
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

        return NextResponse.json({ success: true, welcomeBonus: 50 });
    } catch (error) {
        return handleApiError(error, "User.Register");
    }
}
