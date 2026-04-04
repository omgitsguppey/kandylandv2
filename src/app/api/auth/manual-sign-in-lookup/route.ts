import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { looksLikeEmailAddress, normalizeEmailAddress } from "@/lib/auth-errors";
import { normalizeUsername } from "@/lib/user-utils";

const requestSchema = z.object({
    identifier: z.string().trim().min(1).max(160),
});

export async function POST(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "auth/manual-sign-in-lookup",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
        });

        if (!adminDb) {
            throw new AuthError("Database not available", 500);
        }

        const parsedBody = requestSchema.safeParse(await request.json());
        if (!parsedBody.success) {
            throw new AuthError("Invalid sign-in lookup request", 400);
        }

        const { identifier } = parsedBody.data;
        const normalizedIdentifier = identifier.trim();
        if (!normalizedIdentifier) {
            throw new AuthError("Missing identifier", 400);
        }

        if (looksLikeEmailAddress(normalizedIdentifier)) {
            return NextResponse.json({
                resolvedEmail: normalizeEmailAddress(normalizedIdentifier),
                identifierType: "email",
            });
        }

        const normalizedUsername = normalizeUsername(normalizedIdentifier);
        if (!normalizedUsername) {
            return NextResponse.json({
                resolvedEmail: null,
                identifierType: "unknown",
                authErrorCode: "auth/invalid-credential",
            });
        }

        const matchingUsers = await adminDb
            .collection("users")
            .where("username", "==", normalizedUsername)
            .limit(1)
            .get();

        if (matchingUsers.empty) {
            return NextResponse.json({
                resolvedEmail: null,
                identifierType: "username",
                authErrorCode: "auth/invalid-credential",
            });
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
            return NextResponse.json({
                resolvedEmail: null,
                identifierType: "username",
                authErrorCode: "auth/invalid-credential",
            });
        }

        return NextResponse.json({
            resolvedEmail,
            identifierType: "username",
        });
    } catch (error) {
        return handleApiError(error, "Auth.ManualSignInLookup");
    }
}
