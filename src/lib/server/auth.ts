import "server-only";
import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "./firebase-admin";

export interface AuthResult {
    uid: string;
    email: string | undefined;
}

/**
 * Verify the Firebase ID token from the Authorization header.
 * Returns the decoded user identity or throws an error.
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        throw new AuthError("Missing or invalid Authorization header", 401);
    }

    const idToken = authHeader.split("Bearer ")[1];
    if (!idToken) {
        throw new AuthError("Missing token", 401);
    }

    try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        return { uid: decoded.uid, email: decoded.email };
    } catch {
        throw new AuthError("Invalid or expired token", 401);
    }
}

/**
 * Verify the caller is an authenticated admin.
 * Checks the user's Firestore profile for role === 'admin'.
 */
export async function verifyAdmin(request: NextRequest): Promise<AuthResult> {
    const authResult = await verifyAuth(request);

    if (!adminDb) {
        throw new AuthError("Database not available", 500);
    }

    const userDoc = await adminDb.collection("users").doc(authResult.uid).get();
    if (!userDoc.exists) {
        throw new AuthError("User profile not found", 403);
    }

    const userData = userDoc.data();
    if (userData?.role !== "admin") {
        throw new AuthError("Admin access required", 403);
    }

    return authResult;
}

/**
 * Custom error class with HTTP status code.
 */
export class AuthError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.name = "AuthError";
        this.status = status;
    }
}
