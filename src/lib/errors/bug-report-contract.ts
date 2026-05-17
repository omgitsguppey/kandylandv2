import type { FieldValue } from "firebase-admin/firestore";

import type { ErrorSurface, HumanErrorAction } from "./error-language";

export const BUG_REPORT_REWARD_GD = 10;
export const BUG_REPORT_DAILY_REWARD_CAP = 3;
export const BUG_REPORT_DUPLICATE_WINDOW_MS = 6 * 60 * 60 * 1000;
export const BUG_REPORT_COLLECTION = "bug_reports";
export const BUG_REPORT_REWARD_SOURCE = "bug_report_reward";

const MAX_CONTEXT_KEYS = 20;
const MAX_CONTEXT_VALUE_LENGTH = 240;
const SENSITIVE_CONTEXT_KEY_PATTERN = /token|secret|password|authorization|cookie|paypal|capture|clientsecret|stack/i;

export type BugReportSurface = ErrorSurface;

export type BugReportStatus =
  | "received"
  | "duplicate"
  | "rewarded"
  | "reward_cap_reached"
  | "not_reward_eligible";

export type BugReportInput = {
  errorKey: string;
  surface: ErrorSurface;
  route?: string;
  previousRoute?: string;
  userMessage?: string;
  userTitle?: string;
  primaryAction?: HumanErrorAction;
  debugId?: string;
  context?: Record<string, string | number | boolean | null>;
};

export type BugReportRecord = {
  id: string;
  userId: string;
  errorKey: string;
  surface: ErrorSurface;
  route: string;
  previousRoute: string;
  userTitle: string;
  userMessage: string;
  debugId: string | null;
  sanitizedContext: Record<string, string | number | boolean | null>;
  rewardEligible: boolean;
  rewardGd: number;
  status: BugReportStatus;
  createdAt: number;
  serverCreatedAt: FieldValue;
  sourceTruth: "human_error_bug_report";
};

export function sanitizeBugReportContext(
  context?: Record<string, unknown> | null,
): Record<string, string | number | boolean | null> {
  if (!context || typeof context !== "object") {
    return {};
  }

  const sanitized: Record<string, string | number | boolean | null> = {};
  for (const [rawKey, rawValue] of Object.entries(context).slice(0, MAX_CONTEXT_KEYS)) {
    const key = rawKey.trim();
    if (!key || SENSITIVE_CONTEXT_KEY_PATTERN.test(key)) {
      continue;
    }

    if (rawValue === null || typeof rawValue === "boolean" || typeof rawValue === "number") {
      sanitized[key] = rawValue;
      continue;
    }

    if (typeof rawValue === "string") {
      sanitized[key] = rawValue.replace(/[\u0000-\u001f\u007f]+/gu, " ").trim().slice(0, MAX_CONTEXT_VALUE_LENGTH);
    }
  }

  return sanitized;
}

export function isSafeInternalBugReportRoute(route?: string | null): route is string {
  if (typeof route !== "string") {
    return false;
  }

  const trimmed = route.trim();
  return trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("\\");
}

export function resolveBugReportRedirect(previousRoute?: string | null, route?: string | null) {
  if (isSafeInternalBugReportRoute(previousRoute)) {
    return previousRoute.trim();
  }

  if (isSafeInternalBugReportRoute(route)) {
    return route.trim();
  }

  return "/";
}

export function normalizeBugReportRoute(route?: string | null) {
  return isSafeInternalBugReportRoute(route) ? route.trim().slice(0, 240) : "/";
}

export function getBugReportDayStartMs(nowMs = Date.now()) {
  const date = new Date(nowMs);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}
