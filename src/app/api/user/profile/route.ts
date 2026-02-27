import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAuth, handleApiError } from "@/lib/server/auth";

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

function normalizeNotificationSettings(value: unknown): { inAppEnabled: boolean; browserPushEnabled: boolean } | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const source = value as { inAppEnabled?: unknown; browserPushEnabled?: unknown };

    return {
        inAppEnabled: source.inAppEnabled !== false,
        browserPushEnabled: source.browserPushEnabled === true,
    };
}

export async function PUT(request: NextRequest) {
    try {
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

        if (payload.notificationSettings !== undefined) {
            const normalizedNotificationSettings = normalizeNotificationSettings(payload.notificationSettings);
            if (!normalizedNotificationSettings) {
                return NextResponse.json({ error: "Invalid notification settings" }, { status: 400 });
            }
            updates.notificationSettings = normalizedNotificationSettings;
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
        }

        const userRef = adminDb.collection("users").doc(caller.uid);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        await userRef.update(updates);

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "Profile.PUT");
    }
}

export async function POST(request: NextRequest) {
    try {
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

        if (dateOfBirth) {
            const dob = new Date(dateOfBirth);
            const ageDiff = Date.now() - dob.getTime();
            const ageDate = new Date(ageDiff);
            const age = Math.abs(ageDate.getUTCFullYear() - 1970);
            if (age < 18) {
                return NextResponse.json({ error: "Must be 18+ to join" }, { status: 403 });
            }
        }

        const updates: Record<string, unknown> = {};
        if (username) updates.username = normalizeUsername(username);
        if (dateOfBirth) updates.dateOfBirth = dateOfBirth;
        if (bio !== undefined) updates.bio = bio;
        if (photoURL) updates.photoURL = photoURL;

        const userRef = adminDb.collection("users").doc(userId);
        await userRef.update(updates);

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "Profile.POST");
    }
}
