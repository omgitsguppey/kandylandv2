import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "./firebase-admin";

export type ServerDiagnosticChannel =
  | "ai"
  | "analytics"
  | "admin"
  | "auth"
  | "commerce"
  | "cron"
  | "creator_onboarding"
  | "firebase"
  | "middleware"
  | "notifications"
  | "runtime";

export type ServerDiagnosticSeverity = "info" | "warn" | "error";

interface ServerDiagnosticInput {
  channel: ServerDiagnosticChannel;
  severity?: ServerDiagnosticSeverity;
  message: string;
  detail?: Record<string, unknown>;
}

function sanitizeDetail(detail: Record<string, unknown> | undefined) {
  if (!detail) {
    return {};
  }

  const entries: Array<[string, string | number | boolean | null]> = [];
  Object.entries(detail)
    .slice(0, 20)
    .forEach(([key, value]) => {
      const normalizedKey = key.trim().slice(0, 80);
      if (!normalizedKey) {
        return;
      }

      if (typeof value === "string") {
        entries.push([normalizedKey, value.slice(0, 500)]);
        return;
      }

      if (typeof value === "number" || typeof value === "boolean" || value === null) {
        entries.push([normalizedKey, value]);
        return;
      }

      entries.push([normalizedKey, JSON.stringify(value).slice(0, 500)]);
    });

  return Object.fromEntries(entries);
}

export async function recordServerDiagnostic(input: ServerDiagnosticInput) {
  if (!adminDb) {
    return;
  }

  try {
    await adminDb.collection("server_diagnostics").add({
      channel: input.channel,
      severity: input.severity || "warn",
      message: input.message.slice(0, 240),
      detail: sanitizeDetail(input.detail),
      createdAt: FieldValue.serverTimestamp(),
      createdAtMs: Date.now(),
    });
  } catch (error) {
    console.warn("Server diagnostic write failed:", error);
  }
}
