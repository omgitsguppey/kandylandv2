import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { STANDARD } from "@/lib/server/rate-limit";
import { handleApiError } from "@/lib/server/auth";
import { ANALYTICS_CONSENT_COOKIE } from "@/lib/privacy-consent";
import { CONSENT_DECISION_VALUES, CONSENT_MODE_VALUES, CONSENT_TRACKING_VERSION } from "@/lib/privacy/consent-tracking-contract";
import { guardApiRequest } from "@/lib/server/request-guard";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";

const PRIVACY_CONSENT_BODY_LIMIT_BYTES = 16_384;

const ConsentSchema = z.object({
    anonymousAnalyticsEnabled: z.boolean(),
    consentMode: z.enum(CONSENT_MODE_VALUES).optional(),
    consentDecision: z.enum(CONSENT_DECISION_VALUES).optional(),
    consentSource: z.enum(["banner", "account_settings", "legacy_default", "unknown"]).optional(),
    consentPolicyVersion: z.literal(CONSENT_TRACKING_VERSION).optional(),
});

async function POST_handler(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "privacy/consent",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
        });

        const rawBody = await readBoundedJsonBody<unknown>(request, {
            maxBytes: PRIVACY_CONSENT_BODY_LIMIT_BYTES,
            routeName: "privacy/consent",
        });
        const payload = ConsentSchema.parse(rawBody);
        const response = NextResponse.json({ success: true });

        response.cookies.set({
            name: ANALYTICS_CONSENT_COOKIE,
            value: payload.consentMode ?? (payload.anonymousAnalyticsEnabled ? "full_behavioral" : "necessary_only"),
            httpOnly: false,
            sameSite: "lax",
            secure: request.nextUrl.protocol === "https:",
            path: "/",
            maxAge: 60 * 60 * 24 * 365,
        });

        return response;
    } catch (error) {
        if (isBoundedJsonBodyError(error)) {
            return NextResponse.json({
                error: error.message,
                errorCode: error.code,
                retryable: false,
            }, { status: error.status });
        }
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid consent payload" }, { status: 400 });
        }

        return handleApiError(error, "Privacy.Consent.POST");
    }
}

export let POST = withRouteRuntimeHealth("privacy/consent:POST", POST_handler);
