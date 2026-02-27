import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAuth, handleApiError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";

function normalizeUsername(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const normalized = value.trim().toLowerCase();
    if (normalized.length < 3 || !/^[a-z0-9_]+$/.test(normalized)) {
        return null;
    }

    return normalized;
}

function buildFallbackUsername(uid: string): string {
    return `user_${uid.slice(0, 8).toLowerCase()}`;
}

export async function POST(request: NextRequest) {
    try {
        const caller = await verifyAuth(request);

        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const { username, dateOfBirth, displayName, welcomeBonus } = await request.json();

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
            gumDropsBalance: welcomeBonus ? 100 : 0,
            unlockedContent: [],
            unlockedContentTimestamps: {},
            notificationSettings: {
                inAppEnabled: true,
                browserPushEnabled: false,
            },
            createdAt: FieldValue.serverTimestamp(),
        };

        if (dateOfBirth) newProfile.dateOfBirth = dateOfBirth;

        await userRef.set(newProfile, { merge: true });

        return NextResponse.json({ success: true, welcomeBonus: welcomeBonus ? 100 : 0 });
    } catch (error) {
        return handleApiError(error, "User.Register");
    }
}
