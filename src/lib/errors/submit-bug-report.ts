import { authFetch } from "@/lib/authFetch";

import type { BugReportInput, BugReportStatus } from "./bug-report-contract";
import { resolveHumanErrorFromStatus, sanitizeErrorForUser } from "./resolve-human-error";

export type SubmitBugReportResult = {
  success: boolean;
  bugReportId?: string;
  status?: BugReportStatus;
  rewardGranted?: boolean;
  rewardGd?: number;
  redirectTo?: string;
  userTitle?: string;
  userMessage?: string;
  error?: string;
};

export async function submitBugReport(input: BugReportInput): Promise<SubmitBugReportResult> {
  try {
    const response = await authFetch("/api/bug-reports", {
      method: "POST",
      body: JSON.stringify(input),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const descriptor = resolveHumanErrorFromStatus(response.status, input.surface, "internal_server_error");
      return {
        success: false,
        userTitle: typeof payload.userTitle === "string" ? payload.userTitle : descriptor.userTitle,
        userMessage: typeof payload.userMessage === "string" ? payload.userMessage : descriptor.userMessage,
        error: typeof payload.userMessage === "string" ? payload.userMessage : descriptor.userMessage,
      };
    }

    return {
      success: payload.success === true,
      bugReportId: typeof payload.bugReportId === "string" ? payload.bugReportId : undefined,
      status: payload.status,
      rewardGranted: payload.rewardGranted === true,
      rewardGd: typeof payload.rewardGd === "number" ? payload.rewardGd : undefined,
      redirectTo: typeof payload.redirectTo === "string" ? payload.redirectTo : undefined,
      userTitle: typeof payload.userTitle === "string" ? payload.userTitle : undefined,
      userMessage: typeof payload.userMessage === "string" ? payload.userMessage : undefined,
    };
  } catch (error) {
    const descriptor = sanitizeErrorForUser(error, input.surface, "internal_server_error");
    return {
      success: false,
      userTitle: descriptor.userTitle,
      userMessage: descriptor.userMessage,
      error: descriptor.userMessage,
    };
  }
}
