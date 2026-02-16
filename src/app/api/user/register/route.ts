import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAuth, AuthError, handleApiError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
    try {
        const caller = await verifyAuth(request);

        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const { username, dateOfBirth, displayName, welcomeBonus } = await request.json();

        // Check if profile already exists
        const userRef = adminDb.collection("users").doc(caller.uid);
        const existingSnap = await userRef.get();
        if (existingSnap.exists) {
            return NextResponse.json({ success: true, existing: true });
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
                return NextResponse.json({ error: "Username already taken" }, { status: 409 });
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

        const newProfile: Record<string, any> = {
            uid: caller.uid,
            email: caller.email,
            displayName: displayName || "User",
            gumDropsBalance: welcomeBonus ? 100 : 0,
            unlockedContent: [],
            createdAt: FieldValue.serverTimestamp(),
        };

        if (username) newProfile.username = username;
        if (dateOfBirth) newProfile.dob = dateOfBirth;

        await userRef.set(newProfile, { merge: true });

        return NextResponse.json({ success: true, welcomeBonus: welcomeBonus ? 100 : 0 });
    } catch (error) {
        return handleApiError(error, "User.Register");
    }
}
