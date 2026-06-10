import "server-only";
import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "./firebase-admin";
import { buildNotFoundResponse, type ApiNotFoundResource } from "./not-found";
import { RateLimitError, buildRateLimitResponse } from "./rate-limit";
import { inferDiagnosticChannel, recordRouteFailure } from "./route-diagnostics";
import { recordDebugEvidence } from "./debug-evidence-store";
import { buildHumanApiErrorResponse } from "@/lib/errors/api-error-response";
import { resolveHumanErrorFromCode } from "@/lib/errors/resolve-human-error";
import type { HumanErrorKey } from "@/lib/errors/error-dictionary";

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

function readErrorLogMessage(error: unknown) {
    if (error instanceof Error) {
        const candidate = Reflect.get(error, "message");
        return typeof candidate === "string" ? candidate : "";
    }
    return error;
}

function buildApiErrorLogEntry(error: unknown, context: string, status: number) {
    return {
        level: "error",
        tag: "API_ERROR",
        context: sanitizeApiErrorLogValue(context) || "unknown",
        status,
        errorName: error instanceof Error ? error.name : "UnknownError",
        message: sanitizeApiErrorLogValue(readErrorLogMessage(error)) || "unmapped_error",
    };
}

type AuthDiagnosticClass =
    | "missing_token"
    | "expired_session"
    | "malformed_token"
    | "missing_user"
    | "permission_denied"
    | "provider_config_failure"
    | "validation_failed";

type AuthErrorOptions = {
    errorKey?: HumanErrorKey;
    diagnosticClass?: AuthDiagnosticClass;
};

function readProviderErrorCode(error: unknown) {
    if (!error || typeof error !== "object") {
        return "";
    }
    const candidate = Reflect.get(error, "code");
    return typeof candidate === "string" ? candidate.toLowerCase() : "";
}

function classifyVerifyIdTokenFailure(error: unknown): Pick<AuthErrorOptions, "errorKey" | "diagnosticClass"> {
    const code = readProviderErrorCode(error);
    if (code.includes("expired")) {
        return { errorKey: "session_expired", diagnosticClass: "expired_session" };
    }
    if (code.includes("invalid") || code.includes("malformed") || code.includes("argument")) {
        return { errorKey: "unauthorized", diagnosticClass: "malformed_token" };
    }
    return { errorKey: "provider_unavailable", diagnosticClass: "provider_config_failure" };
}

function buildSafeNotFoundMessage(resource: ApiNotFoundResource) {
    const label = resource.replace(/_/gu, " ");
    return `${label.charAt(0).toUpperCase()}${label.slice(1)} not found`;
}

function resolveAuthErrorKeyFromStatus(status: number): HumanErrorKey {
    if (status === 400) return "validation_failed";
    if (status === 401) return "unauthorized";
    if (status === 403) return "forbidden";
    if (status === 404) return "route_not_connected";
    if (status === 503) return "service_unavailable";
    if (status >= 500) return "internal_server_error";
    return "unknown_error";
}

function resolveAuthDiagnosticClassFromStatus(status: number): AuthDiagnosticClass {
    if (status === 400) return "validation_failed";
    if (status === 401) return "malformed_token";
    if (status === 403) return "permission_denied";
    return "provider_config_failure";
}

/**
 * Verify the Firebase ID token from the Authorization header.
 * Returns the decoded user identity or throws an error.
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length).trim()
        : "";

    if (!idToken) {
        throw new AuthError("Missing or invalid token", 401, undefined, {
            errorKey: "auth_required",
            diagnosticClass: "missing_token",
        });
    }

    try {
        const decoded = await adminAuth.verifyIdToken(idToken, true);
        return {
            uid: decoded.uid,
            email: decoded.email,
            isAdmin: decoded.admin === true
        };
    } catch (error) {
        throw new AuthError("Invalid or expired token", 401, undefined, classifyVerifyIdTokenFailure(error));
    }
}

/**
 * Verify the caller is an authenticated admin.
 * Checks the user's Firestore profile for role === 'admin'.
 */
export async function verifyAdmin(request: NextRequest): Promise<AuthResult> {
    const authResult = await verifyAuth(request);

    if (!adminDb) {
        throw new AuthError("Database not available", 500, undefined, {
            errorKey: "service_unavailable",
            diagnosticClass: "provider_config_failure",
        });
    }

    const userDoc = await adminDb.collection("users").doc(authResult.uid).get();
    const userData = userDoc.data();

    if (!userDoc.exists) {
        throw new AuthError("Admin access required", 403, "user", {
            errorKey: "forbidden",
            diagnosticClass: "missing_user",
        });
    }

    if (userData?.role !== "admin") {
        throw new AuthError("Admin access required", 403, undefined, {
            errorKey: "forbidden",
            diagnosticClass: "permission_denied",
        });
    }

    // Set isAdmin on the returned object so callers know it passed the DB check
    return { ...authResult, isAdmin: true };
}

/**
 * Standard API error handler for route handlers.
 */
export function handleApiError(error: unknown, context: string) {
    if (error instanceof RateLimitError) {
        return buildRateLimitResponse(error);
    }
    if (error instanceof AuthError) {
        const normalizedContext = context.toLowerCase();
        void recordDebugEvidence({
            source: normalizedContext.includes("admin") ? "admin" : "route",
            severity: error.status >= 500 ? "error" : "warn",
            category: normalizedContext.includes("support")
                ? "support"
                : error.status === 401 || error.status === 403
                    ? "permissions"
                    : "api_route",
            route: context,
            message: `${context} returned ${error.status}`,
            humanMessage: normalizedContext.includes("support") && error.status === 403
                ? "Support message detail route returned forbidden."
                : `${context} returned ${error.status}.`,
            technicalDetail: {
                status: error.status,
                errorName: error.name,
                errorKey: error.errorKey,
                diagnosticClass: error.diagnosticClass,
                resource: error.resource ?? null,
            },
        });
        if (error.status === 404) {
            const resource = error.resource ?? "resource";
            return buildNotFoundResponse(resource, buildSafeNotFoundMessage(resource));
        }
        return buildHumanApiErrorResponse(resolveHumanErrorFromCode(error.errorKey, "auth", resolveAuthErrorKeyFromStatus(error.status)), {
            status: error.status,
            includeOperatorMessage: normalizedContext.includes("admin") || normalizedContext.includes("debug"),
        });
    }
    const diagnosticChannel = inferDiagnosticChannel(context);

    // Keep structured logs useful for observability without forwarding raw stacks or payloads.
    console.error(JSON.stringify(buildApiErrorLogEntry(error, context, 500)));
    recordRouteFailure(context, error, {
        channel: diagnosticChannel,
        includePipelineHealth: diagnosticChannel === "analytics",
        detail: {
            status: 500,
        },
    });

    return buildHumanApiErrorResponse(resolveHumanErrorFromCode("internal_server_error", "runtime"), { status: 500 });
}

/**
 * Custom error class with HTTP status code.
 */
export class AuthError extends Error {
    status: number;
    resource?: ApiNotFoundResource;
    errorKey: HumanErrorKey;
    diagnosticClass: AuthDiagnosticClass;
    constructor(message: string, status: number, resource?: ApiNotFoundResource, options: AuthErrorOptions = {}) {
        super(message);
        this.name = "AuthError";
        this.status = status;
        this.resource = resource;
        this.errorKey = options.errorKey ?? resolveAuthErrorKeyFromStatus(status);
        this.diagnosticClass = options.diagnosticClass ?? resolveAuthDiagnosticClassFromStatus(status);
    }
}
