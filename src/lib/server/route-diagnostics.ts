import "server-only";

import { recordAnalyticsPipelineFailure } from "./analytics-pipeline-health";
import {
  recordServerDiagnostic,
  type ServerDiagnosticChannel,
  type ServerDiagnosticSeverity,
} from "./server-diagnostics";

function sanitizeDetail(detail: Record<string, unknown> | undefined) {
  if (!detail) {
    return {};
  }

  const entries = Object.entries(detail).slice(0, 20).map(([key, value]) => {
    if (typeof value === "string") {
      return [key, value.slice(0, 500)] as const;
    }

    if (typeof value === "number" || typeof value === "boolean" || value === null) {
      return [key, value] as const;
    }

    if (typeof value === "function") {
      return [key, "[Function]"];
    }

    return [key, value === undefined ? "undefined" : JSON.stringify(value)?.slice(0, 500)] as const;
  });

  return Object.fromEntries(entries);
}

export function getErrorMessage(error: unknown, fallback = "Unexpected error") {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return fallback;
}

export function inferDiagnosticChannel(context: string): ServerDiagnosticChannel {
  const normalizedContext = context.toLowerCase();

  if (normalizedContext.includes("vertex") || normalizedContext.includes("imagen") || normalizedContext.includes("/ai") || normalizedContext.includes("ai/")) {
    return "ai";
  }

  if (normalizedContext.includes("analytics") || normalizedContext.includes("telemetry") || normalizedContext.includes("watch")) {
    return "analytics";
  }

  if (normalizedContext.includes("paypal") || normalizedContext.includes("commerce") || normalizedContext.includes("purchase")) {
    return "commerce";
  }

  if (normalizedContext.includes("notification")) {
    return "notifications";
  }

  if (normalizedContext.includes("cron")) {
    return "cron";
  }

  if (normalizedContext.includes("auth")) {
    return "auth";
  }

  if (normalizedContext.includes("creator")) {
    return "creator_onboarding";
  }

  if (normalizedContext.includes("firebase")) {
    return "firebase";
  }

  if (normalizedContext.includes("admin")) {
    return "admin";
  }

  return "runtime";
}

function buildDiagnosticDetail(
  error: unknown,
  context: string,
  detail?: Record<string, unknown>,
  structuredContext?: {
    actorRole?: string;
    traceId?: string;
    moduleKey?: string;
  }
) {
  return sanitizeDetail({
    routeContext: context,
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorMessage: getErrorMessage(error),
    actorRole: structuredContext?.actorRole,
    traceId: structuredContext?.traceId,
    moduleKey: structuredContext?.moduleKey,
    ...detail,
  });
}

interface RouteDiagnosticInput {
  channel?: ServerDiagnosticChannel;
  context: string;
  message: string;
  error?: unknown;
  detail?: Record<string, unknown>;
  severity?: ServerDiagnosticSeverity;
  includePipelineHealth?: boolean;
  actorRole?: string;
  traceId?: string;
  moduleKey?: string;
}

export function recordRouteDiagnostic(input: RouteDiagnosticInput) {
  const channel = input.channel ?? inferDiagnosticChannel(input.context);
  const severity = input.severity ?? "warn";
  const errorMessage = getErrorMessage(input.error, input.message);

  void recordServerDiagnostic({
    channel,
    severity,
    message: input.message,
    detail: buildDiagnosticDetail(input.error, input.context, input.detail, {
      actorRole: input.actorRole,
      traceId: input.traceId,
      moduleKey: input.moduleKey,
    }),
  });

  if (input.includePipelineHealth === true) {
    void recordAnalyticsPipelineFailure({
      routeName: input.context,
      errorMessage,
    });
  }
}

export function recordRouteFailure(
  context: string,
  error: unknown,
  options?: {
    channel?: ServerDiagnosticChannel;
    detail?: Record<string, unknown>;
    includePipelineHealth?: boolean;
    message?: string;
    actorRole?: string;
    traceId?: string;
    moduleKey?: string;
  },
) {
  recordRouteDiagnostic({
    channel: options?.channel,
    context,
    error,
    detail: options?.detail,
    includePipelineHealth: options?.includePipelineHealth,
    message: options?.message ?? `${context} failed`,
    severity: "error",
    actorRole: options?.actorRole,
    traceId: options?.traceId,
    moduleKey: options?.moduleKey,
  });
}

export function recordRouteWarning(
  context: string,
  message: string,
  error?: unknown,
  options?: {
    channel?: ServerDiagnosticChannel;
    detail?: Record<string, unknown>;
    actorRole?: string;
    traceId?: string;
    moduleKey?: string;
  },
) {
  recordRouteDiagnostic({
    channel: options?.channel,
    context,
    error,
    detail: options?.detail,
    message,
    severity: "warn",
    actorRole: options?.actorRole,
    traceId: options?.traceId,
    moduleKey: options?.moduleKey,
  });
}
