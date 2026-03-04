import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "./firebase-admin";
import { RateLimitError, buildRateLimitResponse } from "./rate-limit";

export interface AuthResult {
    uid: string;
    email: string | undefined;
    isAdmin?: boolean;
}

/**
 * Verify the Firebase ID token from the Authorization header.
 * Returns the decoded user identity or throws an error.
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
    const authHeader = request.headers.get("Authorization");
    let idToken = "";

    if (authHeader?.startsWith("Bearer ")) {
        idToken = authHeader.split("Bearer ")[1];
    } else {
        const { searchParams } = new URL(request.url);
        idToken = searchParams.get("token") || "";
    }

    if (!idToken) {
        throw new AuthError("Missing or invalid token", 401);
    }

    try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        return {
            uid: decoded.uid,
            email: decoded.email,
            isAdmin: decoded.admin === true
        };
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
    const userData = userDoc.data();

    if (!userDoc.exists || userData?.role !== "admin") {
        throw new AuthError("Admin access required", 403);
    }

    // Set isAdmin on the returned object so callers know it passed the DB check
    return { ...authResult, isAdmin: true };
}

/**
 * Standard API error handler for route handlers.
 */
export function handleApiError(error: any, context: string) {
    if (error instanceof RateLimitError) {
        return buildRateLimitResponse(error);
    }
    if (error instanceof AuthError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const status = error instanceof AuthError ? error.status : 500;

    // Structured JSON logging for telemetry/LogRocket/Sentry interception
    console.error(JSON.stringify({
        level: "error",
        tag: "API_ERROR",
        context,
        status,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        raw: String(error)
    }));

    return NextResponse.json(
        { error: error instanceof Error ? error.message : "Internal server error" },
        { status }
    );
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
