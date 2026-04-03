import "server-only";
import { NextRequest, NextResponse } from "next/server";

import { shouldRequireAppCheck } from "@/lib/firebase-runtime";

import { adminAppCheck, adminAuth, adminDb } from "./firebase-admin";
import { RateLimitError, buildRateLimitResponse } from "./rate-limit";
import { inferDiagnosticChannel, recordRouteFailure } from "./route-diagnostics";

export interface AuthResult {
    uid: string;
    email: string | undefined;
    isAdmin?: boolean;
}

function sanitizeApiErrorLogValue(value: unknown) {
    return String(value ?? "")
        .replace(/[\r\n\t]+/g, " ")
        .replace(/[\u0000-\u001f\u007f]+/g, "")
        .trim()
        .slice(0, 500);
}

function buildApiErrorLogEntry(error: unknown, context: string, status: number) {
    return {
        level: "error",
        tag: "API_ERROR",
        context: sanitizeApiErrorLogValue(context) || "unknown",
        status,
        errorName: error instanceof Error ? error.name : "UnknownError",
        message: sanitizeApiErrorLogValue(error instanceof Error ? error.message : error) || "Unknown error",
    };
}

export async function verifyAppCheck(request: NextRequest, required = shouldRequireAppCheck()) {
    const appCheckToken = request.headers.get("X-Firebase-AppCheck")?.trim();

    if (!appCheckToken) {
        if (!required) {
            return null;
        }
        throw new AuthError("Missing App Check token", 401);
    }

    try {
        return await adminAppCheck.verifyToken(appCheckToken);
    } catch {
        if (!required) {
            return null;
        }
        throw new AuthError("Invalid App Check token", 401);
    }
}

/**
 * Verify the Firebase ID token from the Authorization header.
 * Returns the decoded user identity or throws an error.
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
    await verifyAppCheck(request);

    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length).trim()
        : "";

    if (!idToken) {
        throw new AuthError("Missing or invalid token", 401);
    }

    try {
        const decoded = await adminAuth.verifyIdToken(idToken, true);
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
    const diagnosticChannel = inferDiagnosticChannel(context);

    // Keep structured logs useful for observability without forwarding raw stacks or payloads.
    console.error(JSON.stringify(buildApiErrorLogEntry(error, context, status)));
    recordRouteFailure(context, error, {
        channel: diagnosticChannel,
        includePipelineHealth: diagnosticChannel === "analytics",
        detail: {
            status,
        },
    });

    const clientMessage = status >= 500
        ? "Internal server error"
        : (error instanceof Error ? error.message : "Request failed");

    return NextResponse.json(
        { error: clientMessage },
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
