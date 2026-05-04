"use client";

import {
  recordClientDiagnostic,
  type ClientDiagnosticChannel,
  type ClientDiagnosticSeverity,
} from "@/lib/client-diagnostics";
import { getAnonymousVisitorId, getClientSessionId } from "@/lib/client-session";
import { analyzeFirestoreClientIssue, buildFirestoreClientIssueDetail } from "@/lib/firestore-client-errors";
export { buildFirestoreClientIssueDetail };

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

function mapClientChannelToEvidenceCategory(channel: ClientDiagnosticChannel) {
  switch (channel) {
    case "ui":
      return "layout";
    case "firebase":
    case "realtime":
      return "firestore_rules";
    case "payments":
      return "wallet";
    case "telemetry":
      return "telemetry";
    case "auth":
      return "auth";
    case "network":
      return "network";
    case "runtime":
    case "error":
      return "runtime";
    case "notifications":
      return "network";
    default:
      return "runtime";
  }
}

function queueDebugEvidenceWrite(input: {
  channel: ClientDiagnosticChannel;
  message: string;
  severity: ClientDiagnosticSeverity;
  detail: Record<string, unknown>;
}) {
  if (typeof window === "undefined") {
    return;
  }

  const payload = {
    source: input.channel === "telemetry" ? "telemetry" : "client",
    severity: input.severity === "error" ? "error" : input.severity,
    category: mapClientChannelToEvidenceCategory(input.channel),
    route: window.location.pathname,
    component: typeof input.detail.component === "string" ? input.detail.component : undefined,
    sessionId: getClientSessionId(),
    anonymousVisitorId: getAnonymousVisitorId("unknown"),
    message: input.message,
    humanMessage: input.message,
    technicalDetail: input.detail,
  };

  const send = () => {
    fetch("/api/debug/evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(send, { timeout: 2_000 });
    return;
  }

  window.setTimeout(send, 0);
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
  queueDebugEvidenceWrite({
    channel: input.channel,
    message: input.message,
    severity,
    detail: normalizedDetail,
  });
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
  const firestoreIssue = analyzeFirestoreClientIssue(error);
  reportClientIssue({
    channel: firestoreIssue ? "firebase" : "realtime",
    severity: firestoreIssue?.kind === "internal_assertion" ? "error" : "warn",
    message: firestoreIssue?.kind === "internal_assertion"
      ? `${scope} realtime listener entered an invalid Firestore client state`
      : `${scope} realtime issue`,
    error,
    detail: buildFirestoreClientIssueDetail(error, detail),
    consoleLabel: `[Realtime] ${scope}`,
  });
}
