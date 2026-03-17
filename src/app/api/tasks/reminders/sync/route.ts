import { NextRequest, NextResponse } from "next/server";

import { syncUserTaskReminder } from "@/lib/server/daily-tasks";
import { handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";

export async function POST(req: NextRequest) {
  try {
    const caller = await guardApiRequest(req, {
      routeName: "tasks_reminder_sync",
      rateLimit: STANDARD,
      requireTrustedOrigin: true,
      auth: "user",
      scopeToCaller: true,
    });
    const uid = caller?.uid ?? "";
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
