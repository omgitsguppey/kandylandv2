import { NextRequest, NextResponse } from "next/server";

import { syncUserTaskReminder } from "@/lib/server/daily-tasks";
import { handleApiError, verifyAuth } from "@/lib/server/auth";
import { STANDARD, checkRateLimit } from "@/lib/server/rate-limit";
import { hasTrustedSiteOrigin } from "@/lib/server/request-origin";

export async function POST(req: NextRequest) {
  try {
    if (!hasTrustedSiteOrigin(req)) {
      return NextResponse.json({ error: "Untrusted origin" }, { status: 403 });
    }
    const { uid } = await verifyAuth(req);
    await checkRateLimit(req, "tasks_reminder_sync", STANDARD, { scopeId: uid });
    const result = await syncUserTaskReminder(uid);

    return NextResponse.json({
      success: true,
      sent: result.sent,
      nextRefreshMs: result.nextRefreshMs,
    });
  } catch (error) {
    return handleApiError(error, "tasks/reminders/sync");
  }
}
