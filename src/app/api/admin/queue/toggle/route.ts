import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/auth";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import { ADMIN } from "@/lib/server/rate-limit";
import { getResolvedQueueConfig, setDropQueueMembership } from "@/lib/server/drop-queue";
import { guardApiRequest } from "@/lib/server/request-guard";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

const ADMIN_QUEUE_TOGGLE_BODY_LIMIT_BYTES = 64_000;

async function POST_handler(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/queue/toggle",
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
        });

        const { dropId } = await readBoundedJsonBody<{ dropId?: string }>(request, {
            maxBytes: ADMIN_QUEUE_TOGGLE_BODY_LIMIT_BYTES,
            routeName: "admin/queue/toggle",
            allowEmpty: false,
        });

        if (!dropId) {
            return NextResponse.json({ error: "Missing dropId" }, { status: 400 });
        }

        const queueConfig = await getResolvedQueueConfig();
        const isQueued = queueConfig.queue.includes(dropId);
        await setDropQueueMembership(dropId, !isQueued);
        return NextResponse.json({ success: true, added: !isQueued });
    } catch (error) {
        if (isBoundedJsonBodyError(error)) {
            return NextResponse.json({
                success: false,
                code: error.code,
                error: error.message,
                retryable: false,
            }, { status: error.status });
        }
        return handleApiError(error, "Admin.Queue.Toggle");
    }
}

export let POST = withRouteRuntimeHealth("admin/queue/toggle:POST", POST_handler);
