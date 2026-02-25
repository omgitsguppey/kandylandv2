import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "./firebase-admin";

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
    if (!authHeader?.startsWith("Bearer ")) {
        throw new AuthError("Missing or invalid Authorization header", 401);
    }

    const idToken = authHeader.split("Bearer ")[1];
    if (!idToken) {
        throw new AuthError("Missing token", 401);
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

    if (!authResult.isAdmin) {
        throw new AuthError("Admin access required", 403);
    }

    return authResult;
}

/**
 * Standard API error handler for route handlers.
 */
export function handleApiError(error: any, context: string) {
    if (error instanceof AuthError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(`[API ERROR] ${context}:`, error);
    return NextResponse.json(
        { error: error instanceof Error ? error.message : "Internal server error" },
        { status: 500 }
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
