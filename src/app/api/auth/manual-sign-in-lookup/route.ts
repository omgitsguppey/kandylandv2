import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, handleApiError } from "@/lib/server/auth";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import { adminAuth, adminDb } from "@/lib/server/firebase-admin";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage, recordRouteWarning } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";
import { looksLikeEmailAddress, normalizeEmailAddress } from "@/lib/auth-errors";
import { normalizeUsername } from "@/lib/user-utils";

const MANUAL_SIGN_IN_LOOKUP_BODY_LIMIT_BYTES = 32_768;

const requestSchema = z.object({
    identifier: z.string().trim().min(1).max(160),
});

type ManualSignInLookupResult = {
    resolvedEmail: string | null;
    identifierType: "email" | "username" | "unknown";
    authErrorCode?: string;
};

function buildInvalidCredentialResult(identifierType: ManualSignInLookupResult["identifierType"]): ManualSignInLookupResult {
    return {
        resolvedEmail: null,
        identifierType,
        authErrorCode: "auth/invalid-credential",
    };
}

async function resolveManualAuthLookupForEmail(
    resolvedEmail: string,
    identifierType: "email" | "username",
): Promise<ManualSignInLookupResult> {
    if (!adminAuth) {
        return {
            resolvedEmail,
            identifierType,
        };
    }

    try {
        const authUser = await adminAuth.getUserByEmail(resolvedEmail);
        const providerIds = new Set(
            authUser.providerData
                .map((provider) => provider.providerId)
                .filter((providerId): providerId is string => typeof providerId === "string" && providerId.length > 0),
        );
        const hasGoogleProvider = providerIds.has("google.com");
        const hasPasswordProvider = providerIds.has("password");

        if (hasGoogleProvider && !hasPasswordProvider) {
            return {
                resolvedEmail: null,
                identifierType,
                authErrorCode: "auth/use-google-sign-in",
            };
        }
    } catch (error) {
        const authError = error as { code?: string; message?: string };
        if (authError?.code !== "auth/user-not-found") {
            recordRouteWarning(
                "auth/manual-sign-in-lookup",
                "Provider lookup failed during manual sign-in resolution",
                undefined,
                {
                    channel: "auth",
                    detail: {
                        identifierType,
                        resolvedEmail,
                        code: authError?.code || null,
                        message: authError?.message || null,
                    },
                },
            );
        }
    }

    return {
        resolvedEmail,
        identifierType,
    };
}

export async function POST(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "auth/manual-sign-in-lookup:POST",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        await guardApiRequest(request, {
            routeName: "auth/manual-sign-in-lookup",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
        });

        if (!adminDb) {
            throw new AuthError("Database not available", 500);
        }

        const body = await readBoundedJsonBody<unknown>(request, {
            maxBytes: MANUAL_SIGN_IN_LOOKUP_BODY_LIMIT_BYTES,
            routeName: "auth/manual-sign-in-lookup",
            allowEmpty: false,
        });
        const parsedBody = requestSchema.safeParse(body);
        if (!parsedBody.success) {
            throw new AuthError("Invalid sign-in lookup request", 400);
        }

        const { identifier } = parsedBody.data;
        const normalizedIdentifier = identifier.trim();
        if (!normalizedIdentifier) {
            throw new AuthError("Missing identifier", 400);
        }

        if (looksLikeEmailAddress(normalizedIdentifier)) {
            return finalize(NextResponse.json(
                await resolveManualAuthLookupForEmail(normalizeEmailAddress(normalizedIdentifier), "email"),
            ));
        }

        const normalizedUsername = normalizeUsername(normalizedIdentifier);
        if (!normalizedUsername) {
            return finalize(NextResponse.json(buildInvalidCredentialResult("unknown")));
        }

        const matchingUsers = await adminDb
            .collection("users")
            .where("username", "==", normalizedUsername)
            .limit(1)
            .get();

        if (matchingUsers.empty) {
            return finalize(NextResponse.json(buildInvalidCredentialResult("username")));
        }

        const matchedUser = matchingUsers.docs[0];
        const matchedUserData = matchedUser.data() as { email?: unknown };
        const resolvedEmail = normalizeEmailAddress(typeof matchedUserData.email === "string" ? matchedUserData.email : "");
        if (!looksLikeEmailAddress(resolvedEmail)) {
            recordRouteWarning("auth/manual-sign-in-lookup", "Username sign-in lookup resolved a profile without a valid email", undefined, {
                channel: "auth",
                detail: {
                    uid: matchedUser.id,
                    username: normalizedUsername,
                },
            });
            return finalize(NextResponse.json(buildInvalidCredentialResult("username")));
        }

        return finalize(NextResponse.json(await resolveManualAuthLookupForEmail(resolvedEmail, "username")));
    } catch (error) {
        if (isBoundedJsonBodyError(error)) {
            return finalize(NextResponse.json({
                success: false,
                code: error.code,
                error: error.message,
                retryable: false,
            }, { status: error.status }), error);
        }
        return finalize(handleApiError(error, "Auth.ManualSignInLookup"), error);
    }
}
