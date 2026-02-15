import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";

// PUT — Update display name (from ProfilePage)
export async function PUT(request: NextRequest) {
    try {
        const { userId, displayName } = await request.json();

        if (!userId || !displayName) {
            return NextResponse.json({ error: "Missing userId or displayName" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const userRef = adminDb.collection("users").doc(userId);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        await userRef.update({ displayName });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Profile update error:", error);
        return NextResponse.json({ error: error.message || "Update failed" }, { status: 500 });
    }
}

// POST — Onboarding submit (username, DOB, bio, avatar URL)
export async function POST(request: NextRequest) {
    try {
        const { userId, username, dateOfBirth, bio, photoURL } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        // Validate username uniqueness if provided
        if (username) {
            if (username.length < 3 || !/^[a-z0-9_]+$/.test(username)) {
                return NextResponse.json({ error: "Invalid username format" }, { status: 400 });
            }
            const existing = await adminDb
                .collection("users")
                .where("username", "==", username)
                .limit(1)
                .get();
            if (!existing.empty) {
                const existingId = existing.docs[0].id;
                if (existingId !== userId) {
                    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
                }
            }
        }

        // Validate age if DOB provided
        if (dateOfBirth) {
            const dob = new Date(dateOfBirth);
            const ageDiff = Date.now() - dob.getTime();
            const ageDate = new Date(ageDiff);
            const age = Math.abs(ageDate.getUTCFullYear() - 1970);
            if (age < 18) {
                return NextResponse.json({ error: "Must be 18+ to join" }, { status: 403 });
            }
        }

        // Build update object
        const updates: Record<string, any> = {};
        if (username) updates.username = username;
        if (dateOfBirth) updates.dateOfBirth = dateOfBirth;
        if (bio !== undefined) updates.bio = bio;
        if (photoURL) updates.photoURL = photoURL;

        const userRef = adminDb.collection("users").doc(userId);
        await userRef.update(updates);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Onboarding error:", error);
        return NextResponse.json({ error: error.message || "Onboarding failed" }, { status: 500 });
    }
}
