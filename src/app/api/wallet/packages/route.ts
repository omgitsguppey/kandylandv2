import { NextRequest, NextResponse } from "next/server";
import { guardApiRequest } from "@/lib/server/request-guard";
import { STANDARD } from "@/lib/server/rate-limit";
import { FIXED_GUMDROP_PACKAGES } from "@/lib/gumdrops-packages";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

export const dynamic = "force-dynamic";

async function GET_handler(request: NextRequest) {
    try {
        const check = await guardApiRequest(request, {
            routeName: "wallet/packages",
            rateLimit: STANDARD,
            auth: "none",
        });

        if (!check) {
            return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
        }

        // Return the available package pricing configurations
        // This is a future-proofing stub to allow database-backed sales, promotions, and tailored pricing.
        return NextResponse.json({
            packages: FIXED_GUMDROP_PACKAGES,
            basePackageId: "default",
            timestamp: Date.now()
        });
    } catch (error) {
        console.error("Error fetching packages:", error);
        return NextResponse.json({ error: "Failed to fetch packages" }, { status: 500 });
    }
}

export let GET = withRouteRuntimeHealth("wallet/packages:GET", GET_handler);
