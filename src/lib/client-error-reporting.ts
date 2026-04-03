"use client";

import {
  recordClientDiagnostic,
  type ClientDiagnosticChannel,
  type ClientDiagnosticSeverity,
} from "@/lib/client-diagnostics";

export function getClientErrorMessage(error: unknown, fallback = "Unexpected client error") {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return fallback;
}

function buildDetail(
  error: unknown,
  detail?: Record<string, unknown>,
) {
  return {
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorMessage: getClientErrorMessage(error),
    ...detail,
  };
}

export function reportClientIssue(input: {
  channel: ClientDiagnosticChannel;
  message: string;
  error?: unknown;
  detail?: Record<string, unknown>;
  severity?: ClientDiagnosticSeverity;
  consoleLabel?: string;
}) {
  const severity = input.severity ?? "error";
  const normalizedDetail = buildDetail(input.error, input.detail);

  if (severity === "warn") {
    console.warn(input.consoleLabel ?? input.message, input.error ?? normalizedDetail);
  } else {
    console.error(input.consoleLabel ?? input.message, input.error ?? normalizedDetail);
  }

  recordClientDiagnostic(input.channel, input.message, normalizedDetail, severity);
}

export function reportStorageIssue(
  scope: string,
  error?: unknown,
  detail?: Record<string, unknown>,
) {
  reportClientIssue({
    channel: "storage",
    severity: "warn",
    message: `${scope} storage issue`,
    error,
    detail,
    consoleLabel: `[Storage] ${scope}`,
  });
}

export function reportRealtimeIssue(
  scope: string,
  error?: unknown,
  detail?: Record<string, unknown>,
) {
  reportClientIssue({
    channel: "realtime",
    severity: "warn",
    message: `${scope} realtime issue`,
    error,
    detail,
    consoleLabel: `[Realtime] ${scope}`,
  });
}
