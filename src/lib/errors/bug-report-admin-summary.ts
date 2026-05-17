import { resolveHumanErrorFromCode } from "./resolve-human-error";
import type { ErrorSurface } from "./error-language";
import type { BugReportRecord, BugReportStatus } from "./bug-report-contract";

const SENSITIVE_ADMIN_KEY_PATTERN = /token|secret|password|authorization|cookie|paypal|capture|clientsecret|stack/i;
const MAX_ADMIN_CONTEXT_VALUE_LENGTH = 240;

export type BugReportAdminSummaryReport = {
  id: string;
  userId: string;
  errorKey: string;
  surface: ErrorSurface;
  route: string;
  previousRoute: string;
  status: BugReportStatus;
  rewardGd: number;
  userTitle: string;
  userMessage: string;
  operatorMessage: string;
  debugId: string | null;
  sanitizedContext: Record<string, string | number | boolean | null>;
  createdAtUtc: string;
};

export type BugReportAdminSummary = {
  generatedAtUtc: string;
  source: "bug_reports";
  readLimit: number;
  totalReports: number;
  rewardedCount: number;
  duplicateCount: number;
  capReachedCount: number;
  topErrorKeys: Array<{ key: string; count: number }>;
  topSurfaces: Array<{ key: string; count: number }>;
  latestReports: BugReportAdminSummaryReport[];
};

type PartialBugReportRecord = Partial<Omit<BugReportRecord, "serverCreatedAt">> & {
  id?: string;
  dedupeKey?: string;
  sanitizedContext?: Record<string, unknown>;
};

export function redactBugReportAdminValue(key: string, value: unknown) {
  if (SENSITIVE_ADMIN_KEY_PATTERN.test(key)) {
    return "[redacted]";
  }
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return value.replace(/[\u0000-\u001f\u007f]+/gu, " ").trim().slice(0, MAX_ADMIN_CONTEXT_VALUE_LENGTH);
  }
  return null;
}

export function redactBugReportAdminContext(context?: Record<string, unknown> | null) {
  if (!context || typeof context !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(context)
      .map(([key, value]) => [key, redactBugReportAdminValue(key, value)] as const)
      .filter(([, value]) => value !== "[redacted]" && value !== null),
  ) as Record<string, string | number | boolean | null>;
}

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function topCounts(map: Map<string, number>) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([key, count]) => ({ key, count }));
}

function readErrorSurface(value: unknown): ErrorSurface {
  return typeof value === "string" ? value as ErrorSurface : "unknown";
}

function readStatus(value: unknown): BugReportStatus {
  if (
    value === "received" ||
    value === "duplicate" ||
    value === "rewarded" ||
    value === "reward_cap_reached" ||
    value === "not_reward_eligible"
  ) {
    return value;
  }
  return "received";
}

function formatCreatedAt(createdAt: unknown) {
  const ms = typeof createdAt === "number" && Number.isFinite(createdAt) ? createdAt : 0;
  return ms > 0 ? new Date(ms).toISOString() : "";
}

export function summarizeBugReportsForAdmin(
  records: PartialBugReportRecord[],
  options: { readLimit?: number; generatedAtUtc?: string } = {},
): BugReportAdminSummary {
  const errorKeyCounts = new Map<string, number>();
  const surfaceCounts = new Map<string, number>();
  const readLimit = Math.min(Math.max(options.readLimit ?? 50, 1), 50);

  const latestReports = [...records]
    .sort((a, b) => (typeof b.createdAt === "number" ? b.createdAt : 0) - (typeof a.createdAt === "number" ? a.createdAt : 0))
    .slice(0, readLimit)
    .map((record, index): BugReportAdminSummaryReport => {
      const errorKey = typeof record.errorKey === "string" && record.errorKey ? record.errorKey : "unknown_error";
      const surface = readErrorSurface(record.surface);
      const descriptor = resolveHumanErrorFromCode(errorKey, surface);
      const status = readStatus(record.status);
      increment(errorKeyCounts, errorKey);
      increment(surfaceCounts, surface);

      return {
        id: typeof record.id === "string" && record.id ? record.id : `bug_report_${index}`,
        userId: typeof record.userId === "string" ? record.userId : "unknown_user",
        errorKey,
        surface,
        route: typeof record.route === "string" ? record.route : "/",
        previousRoute: typeof record.previousRoute === "string" ? record.previousRoute : "/",
        status,
        rewardGd: typeof record.rewardGd === "number" ? record.rewardGd : 0,
        userTitle: typeof record.userTitle === "string" && record.userTitle ? record.userTitle : descriptor.userTitle,
        userMessage: typeof record.userMessage === "string" && record.userMessage ? record.userMessage : descriptor.userMessage,
        operatorMessage: descriptor.operatorMessage,
        debugId: typeof record.debugId === "string" && record.debugId ? record.debugId : null,
        sanitizedContext: redactBugReportAdminContext(record.sanitizedContext),
        createdAtUtc: formatCreatedAt(record.createdAt),
      };
    });

  return {
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    source: "bug_reports",
    readLimit,
    totalReports: latestReports.length,
    rewardedCount: latestReports.filter((report) => report.status === "rewarded").length,
    duplicateCount: latestReports.filter((report) => report.status === "duplicate").length,
    capReachedCount: latestReports.filter((report) => report.status === "reward_cap_reached").length,
    topErrorKeys: topCounts(errorKeyCounts),
    topSurfaces: topCounts(surfaceCounts),
    latestReports,
  };
}
