import { NextRequest, NextResponse } from "next/server";

import { syncUserTaskReminder } from "@/lib/server/daily-tasks";
import { handleApiError, verifyAuth } from "@/lib/server/auth";
import { RELAXED, checkRateLimit } from "@/lib/server/rate-limit";

export async function POST(req: NextRequest) {
  try {
    checkRateLimit(req, "tasks_reminder_sync", RELAXED);
    const { uid } = await verifyAuth(req);
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
