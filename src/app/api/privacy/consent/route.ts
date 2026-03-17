import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, STANDARD, RateLimitError, buildRateLimitResponse } from "@/lib/server/rate-limit";
import { hasTrustedSiteOrigin } from "@/lib/server/request-origin";
import { handleApiError } from "@/lib/server/auth";
import { ANALYTICS_CONSENT_COOKIE } from "@/lib/privacy-consent";

const ConsentSchema = z.object({
    anonymousAnalyticsEnabled: z.boolean(),
});

export async function POST(request: NextRequest) {
    try {
        await checkRateLimit(request, "privacy/consent", STANDARD);

        if (!hasTrustedSiteOrigin(request)) {
            return NextResponse.json({ error: "Untrusted origin" }, { status: 403 });
        }

        const payload = ConsentSchema.parse(await request.json());
        const response = NextResponse.json({ success: true });

        response.cookies.set({
            name: ANALYTICS_CONSENT_COOKIE,
            value: payload.anonymousAnalyticsEnabled ? "granted" : "denied",
            httpOnly: false,
            sameSite: "lax",
            secure: request.nextUrl.protocol === "https:",
            path: "/",
            maxAge: 60 * 60 * 24 * 365,
        });

        return response;
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid consent payload" }, { status: 400 });
        }
        if (error instanceof RateLimitError) {
            return buildRateLimitResponse(error);
        }

        return handleApiError(error, "Privacy.Consent.POST");
    }
}
