import { NextRequest, NextResponse } from "next/server";
import { guardApiRequest } from "@/lib/server/request-guard";
import { STANDARD } from "@/lib/server/rate-limit";
import { FIXED_GUMDROP_PACKAGES } from "@/lib/gumdrops-packages";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { buildHumanApiErrorResponse } from "@/lib/errors/api-error-response";
import { resolveHumanErrorFromCode } from "@/lib/errors/resolve-human-error";

export const dynamic = "force-dynamic";
const WALLET_PACKAGES_CACHE_CONTROL = "public, max-age=300, s-maxage=900, stale-while-revalidate=3600";

async function GET_handler(request: NextRequest) {
    try {
        const check = await guardApiRequest(request, {
            routeName: "wallet/packages",
            rateLimit: STANDARD,
            rateLimitStorage: "local",
            auth: "none",
        });

        if (!check) {
            return NextResponse.json({
                success: false,
                errorCode: "rate_limited",
                routeStatus: "expected_typed_client_error",
                retryable: false,
            }, { status: 429 });
        }

        // Return the available package pricing configurations
        // This is a future-proofing stub to allow database-backed sales, promotions, and tailored pricing.
        return NextResponse.json({
            success: true,
            packages: FIXED_GUMDROP_PACKAGES,
            basePackageId: "default",
            timestamp: Date.now(),
            routeStatus: "active_supported_route",
            failureClass: "expected_public_wallet_catalog",
            retryable: false,
            packageSource: "fixed_gumdrop_packages",
            expectedClientErrors: [
                "rate_limited",
                "invalid_wallet_package_request",
                "wallet_packages_unavailable",
            ],
        }, {
            headers: {
                "Cache-Control": WALLET_PACKAGES_CACHE_CONTROL,
            },
        });
    } catch (error) {
        recordRouteWarning("wallet/packages", "Error fetching packages", error);
        return buildHumanApiErrorResponse(resolveHumanErrorFromCode("wallet_packages_unavailable", "wallet"), { status: 500 });
    }
}

export let GET = withRouteRuntimeHealth("wallet/packages:GET", GET_handler);
