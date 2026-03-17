import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { RELAXED } from "@/lib/server/rate-limit";
import { handleApiError } from "@/lib/server/auth";
import { checkUsernameAvailability, generateUniqueUsernameSuggestion } from "@/lib/server/username-suggestions";
import { guardApiRequest } from "@/lib/server/request-guard";

export async function GET(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "user/check-username",
            rateLimit: RELAXED,
        });
        const username = request.nextUrl.searchParams.get("username");
        const displayName = request.nextUrl.searchParams.get("displayName");
        const email = request.nextUrl.searchParams.get("email");
        const uid = request.nextUrl.searchParams.get("uid") || "guest";
        const mode = request.nextUrl.searchParams.get("mode");

        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        if (mode === "suggest") {
            const suggestedUsername = await generateUniqueUsernameSuggestion({
                displayName,
                email,
                uid,
            });
            return NextResponse.json({ suggestedUsername });
        }

        if (!username) {
            return NextResponse.json({ error: "Missing username" }, { status: 400 });
        }

        const result = await checkUsernameAvailability(username);
        return NextResponse.json(result);
    } catch (error: unknown) {
        return handleApiError(error, "User.CheckUsername");
    }
}
