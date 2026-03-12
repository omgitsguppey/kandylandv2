import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, handleApiError } from "@/lib/server/auth";
import { checkRateLimit, ADMIN } from "@/lib/server/rate-limit";
import { getResolvedQueueConfig, setDropQueueMembership } from "@/lib/server/drop-queue";

export async function POST(request: NextRequest) {
    try {
        checkRateLimit(request, "admin/queue/toggle", ADMIN);
        await verifyAdmin(request);

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
