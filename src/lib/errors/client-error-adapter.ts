"use client";

import type { BugReportInput } from "./bug-report-contract";
import { isSafeInternalBugReportRoute, sanitizeBugReportContext } from "./bug-report-contract";
import type { HumanErrorKey } from "./error-dictionary";
import type { ErrorSurface, HumanErrorDescriptor } from "./error-language";
import { resolveHumanError } from "./resolve-human-error";

type ClientActionErrorOptions = {
  surface: ErrorSurface;
  route?: string;
  fallbackKey?: HumanErrorKey;
  status?: number | null;
  code?: unknown;
  context?: Record<string, unknown>;
};

export type ResolvedClientActionError = {
  descriptor: HumanErrorDescriptor;
  route: string;
  context: Record<string, string | number | boolean | null>;
};

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function readPayloadCode(error: unknown) {
  const record = readRecord(error);
  return record.errorKey ?? record.errorCode ?? record.code ?? record.error;
}

function readStatus(error: unknown) {
  const record = readRecord(error);
  const status = record.status ?? record.statusCode;
  return typeof status === "number" ? status : null;
}

export function getSafePreviousRoute() {
  if (typeof window === "undefined") {
    return undefined;
  }

  const route = `${window.location.pathname || "/"}${window.location.search || ""}`;
  return isSafeInternalBugReportRoute(route) ? route : undefined;
}

export function resolveClientActionError(
  error: unknown,
  options: ClientActionErrorOptions,
): ResolvedClientActionError {
  const descriptor = resolveHumanError({
    code: options.code ?? readPayloadCode(error),
    status: options.status ?? readStatus(error),
    surface: options.surface,
    fallback: options.fallbackKey ?? "unknown_error",
    error,
  });

  const route = isSafeInternalBugReportRoute(options.route) ? options.route : getSafePreviousRoute() ?? "/";
  return {
    descriptor,
    route,
    context: sanitizeBugReportContext({
      route,
      surface: options.surface,
      status: options.status ?? readStatus(error),
      code: typeof options.code === "string" ? options.code : undefined,
      errorKey: descriptor.errorKey,
      ...options.context,
    }),
  };
}

export function buildBugReportContext({
  descriptor,
  route,
  previousRoute,
  extra,
}: {
  descriptor: HumanErrorDescriptor;
  route?: string;
  previousRoute?: string;
  extra?: Record<string, unknown>;
}): Partial<BugReportInput> {
  return {
    errorKey: descriptor.errorKey,
    surface: descriptor.surface,
    route: isSafeInternalBugReportRoute(route) ? route : "/",
    previousRoute: isSafeInternalBugReportRoute(previousRoute) ? previousRoute : getSafePreviousRoute(),
    userTitle: descriptor.userTitle,
    userMessage: descriptor.userMessage,
    primaryAction: descriptor.primaryAction,
    context: sanitizeBugReportContext(extra),
  };
}
