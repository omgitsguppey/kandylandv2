import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAuth, handleApiError } from "@/lib/server/auth";
import { checkRateLimit, STRICT } from "@/lib/server/rate-limit";
import * as admin from "firebase-admin";

function buildTimeKeys(timestamp: number) {
    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hour = String(date.getUTCHours()).padStart(2, "0");
    const minute = String(date.getUTCMinutes()).padStart(2, "0");

    return {
        dayKey: `${year}-${month}-${day}`,
        hourKey: `${year}-${month}-${day}T${hour}`,
        minuteKey: `${year}-${month}-${day}T${hour}:${minute}`,
    };
}

export async function POST(req: NextRequest) {
    try {
        await checkRateLimit(req, "user/complete-onboarding", STRICT);
        const decodedToken = await verifyAuth(req);
        const { uid } = decodedToken;
        const body = await req.json().catch(() => ({}));
        const durationMs = typeof body?.durationMs === "number" && Number.isFinite(body.durationMs) && body.durationMs > 0
            ? Math.max(0, Math.round(body.durationMs))
            : 0;
        const durationSeconds = durationMs > 0 ? Math.round(durationMs / 1000) : 0;

        const userRef = adminDb.collection("users").doc(uid);
        const legacyProfileRef = userRef.collection("profile").doc("default");
        const balanceRef = adminDb.collection("users").doc(uid).collection("economy").doc("balance");
        const analyticsEventRef = adminDb.collection("analytics_event_facts").doc();
        const nowMs = Date.now();
        const timeKeys = buildTimeKeys(nowMs);

        return await adminDb.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }

            const userData = userDoc.data() || {};
            const legacyProfileDoc = await transaction.get(legacyProfileRef);
            const legacyProfileData = legacyProfileDoc.exists ? legacyProfileDoc.data() : null;

            // Check if already completed to prevent double-dipping the reward
            if (userData?.onboardingCompleted || legacyProfileData?.onboardingCompleted) {
                return NextResponse.json({ success: true, alreadyCompleted: true, message: "Onboarding already finished." });
            }

            // Award 50 Gumdrops
            const rewardAmount = 50;

            const balanceDoc = await transaction.get(balanceRef);
            const currentBalance = Number(userData?.gumDropsBalance)
                || (balanceDoc.exists ? Number(balanceDoc.data()?.gumDrops || 0) : 0);
            const newBalance = currentBalance + rewardAmount;

            transaction.set(userRef, {
                onboardingCompleted: true,
                gumDropsBalance: newBalance,
                updatedAt: Date.now(),
            }, { merge: true });

            // Keep legacy docs in sync for older clients/tools.
            transaction.set(legacyProfileRef, {
                onboardingCompleted: true,
            }, { merge: true });

            transaction.set(balanceRef, {
                gumDrops: newBalance,
                updatedAt: nowMs,
            }, { merge: true });

            const txRef = adminDb.collection("transactions").doc();
            transaction.set(txRef, {
                userId: uid,
                type: "onboarding_reward",
                status: "completed",
                amount: rewardAmount,
                currency: "USD",
                balanceAfter: newBalance,
                description: "Completed Guided Onboarding Flow",
                timestamp: nowMs,
            });

            const username = typeof userData?.username === "string" && userData.username.trim().length > 0
                ? userData.username.trim()
                : typeof userData?.displayName === "string" && userData.displayName.trim().length > 0
                    ? userData.displayName.trim()
                    : decodedToken.email || uid;

            transaction.set(analyticsEventRef, {
                source: "authenticated",
                consentMode: "identified",
                globalPrivacyControl: false,
                eventName: "guided_onboarding_completed",
                userId: uid,
                username,
                timestamp: nowMs,
                pagePath: "/dashboard",
                sessionId: "",
                dayKey: timeKeys.dayKey,
                hourKey: timeKeys.hourKey,
                minuteKey: timeKeys.minuteKey,
                dropId: "",
                dropTitle: "",
                dropCategory: "",
                watchSeconds: 0,
                durationMs,
                loadMs: 0,
                viewportWidth: typeof body?.viewportWidth === "number" && Number.isFinite(body.viewportWidth) ? body.viewportWidth : undefined,
                viewportHeight: typeof body?.viewportHeight === "number" && Number.isFinite(body.viewportHeight) ? body.viewportHeight : undefined,
                isMobileViewport: typeof body?.isMobileViewport === "boolean" ? body.isMobileViewport : undefined,
                authState: "authenticated",
                params: {
                    duration_ms: durationMs,
                    durationSeconds,
                    source: "complete_onboarding_route",
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return NextResponse.json({
                success: true,
                rewardAmount,
                newBalance,
            });
        });

    } catch (error) {
        return handleApiError(error, "User.CompleteOnboarding");
    }
}
