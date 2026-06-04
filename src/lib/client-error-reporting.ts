"use client";

import {
  classifyBrowserSecurityBoundaryError,
  recordClientDiagnostic,
  shouldRecordClientDiagnosticFingerprint,
  type ClientDiagnosticChannel,
  type ClientDiagnosticSeverity,
} from "@/lib/client-diagnostics";
import { getAnonymousVisitorId, getClientSessionId } from "@/lib/client-session";
import type { DebugEvidenceCategory } from "@/lib/debug-evidence-contract";
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

function mapClientChannelToEvidenceCategory(
  channel: ClientDiagnosticChannel,
  detail?: Record<string, unknown>,
) {
  if (detail?.category === "browser_security_boundary" || detail?.browserSecurityBlocked === true) {
    return "browser_security_boundary";
  }

  switch (channel) {
    case "ui":
      return "layout";
    case "firebase":
    case "realtime":
      return "firestore_rules";
    case "payments":
      return "wallet";
    case "media_uploads":
      return "drops";
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

function buildClientIssueFingerprint(input: {
  channel: ClientDiagnosticChannel;
  message: string;
  category?: DebugEvidenceCategory;
  detail: Record<string, unknown>;
}) {
  const route = typeof window !== "undefined" ? window.location.pathname : "unknown_route";
  const listener = typeof input.detail.listener === "string" ? input.detail.listener : "";
  const component = typeof input.detail.component === "string" ? input.detail.component : "";
  const errorName = typeof input.detail.errorName === "string" ? input.detail.errorName : "";
  const errorMessage = typeof input.detail.errorMessage === "string" ? input.detail.errorMessage : "";
  const source = listener || component || route;
  return [
    input.channel,
    input.category ?? mapClientChannelToEvidenceCategory(input.channel, input.detail),
    source,
    input.message,
    errorName,
    errorMessage,
  ].join("::").slice(0, 320);
}

function queueDebugEvidenceWrite(input: {
  channel: ClientDiagnosticChannel;
  message: string;
  humanMessage?: string;
  severity: ClientDiagnosticSeverity;
  category?: DebugEvidenceCategory;
  detail: Record<string, unknown>;
  fingerprint?: string;
}) {
  if (typeof window === "undefined") {
    return;
  }

  const payload = {
    source: input.channel === "telemetry" ? "telemetry" : "client",
    severity: input.severity === "error" ? "error" : input.severity,
    category: input.category ?? mapClientChannelToEvidenceCategory(input.channel, input.detail),
    route: window.location.pathname,
    component: typeof input.detail.component === "string" ? input.detail.component : undefined,
    sessionId: getClientSessionId(),
    anonymousVisitorId: getAnonymousVisitorId("unknown"),
    message: input.message,
    humanMessage: input.humanMessage ?? input.message,
    technicalDetail: input.detail,
    fingerprint: input.fingerprint,
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

  if (typeof window.setTimeout === "function") {
    window.setTimeout(send, 0);
    return;
  }

  send();
}

export function reportClientIssue(input: {
  channel: ClientDiagnosticChannel;
  message: string;
  error?: unknown;
  detail?: Record<string, unknown>;
  severity?: ClientDiagnosticSeverity;
  consoleLabel?: string;
  humanMessage?: string;
  evidenceCategory?: DebugEvidenceCategory;
  fingerprint?: string;
}) {
  let severity = input.severity ?? "error";
  let message = input.message;
  let humanMessage = input.humanMessage ?? input.message;
  let evidenceCategory = input.evidenceCategory;
  let fingerprint = input.fingerprint;
  let normalizedDetail: Record<string, unknown> & { errorName: string; errorMessage: string } = buildDetail(input.error, input.detail);
  const browserSecurityBoundary = classifyBrowserSecurityBoundaryError({
    error: input.error,
    message: input.message,
    detail: normalizedDetail,
    route: typeof window !== "undefined" ? window.location.pathname : input.detail?.route as string | undefined,
  });

  if (browserSecurityBoundary) {
    severity = browserSecurityBoundary.severity;
    message = browserSecurityBoundary.humanMessage;
    humanMessage = browserSecurityBoundary.humanMessage;
    evidenceCategory = "browser_security_boundary";
    fingerprint = browserSecurityBoundary.fingerprint;
    normalizedDetail = browserSecurityBoundary.detail as typeof normalizedDetail;
  }

  const diagnosticFingerprint = fingerprint ?? buildClientIssueFingerprint({
    channel: input.channel,
    message,
    category: evidenceCategory,
    detail: normalizedDetail,
  });
  if (diagnosticFingerprint && !shouldRecordClientDiagnosticFingerprint(diagnosticFingerprint)) {
    return;
  }

  if (severity === "warn") {
    console.warn(input.consoleLabel ?? input.message, input.error ?? normalizedDetail);
  } else {
    console.error(input.consoleLabel ?? input.message, input.error ?? normalizedDetail);
  }

  recordClientDiagnostic(input.channel, message, normalizedDetail, severity);
  queueDebugEvidenceWrite({
    channel: input.channel,
    message,
    humanMessage,
    severity,
    category: evidenceCategory,
    detail: normalizedDetail,
    fingerprint: diagnosticFingerprint,
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
