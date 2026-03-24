import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/auth";
import { ADMIN } from "@/lib/server/rate-limit";
import { getResolvedQueueConfig, setDropQueueMembership } from "@/lib/server/drop-queue";
import { guardApiRequest } from "@/lib/server/request-guard";

export async function POST(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/queue/toggle",
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
        });

        const { dropId } = await request.json();

        if (!dropId) {
            return NextResponse.json({ error: "Missing dropId" }, { status: 400 });
        }

        const queueConfig = await getResolvedQueueConfig();
        const isQueued = queueConfig.queue.includes(dropId);
        await setDropQueueMembership(dropId, !isQueued);
        return NextResponse.json({ success: true, added: !isQueued });
    } catch (error) {
        return handleApiError(error, "Admin.Queue.Toggle");
    }
}
