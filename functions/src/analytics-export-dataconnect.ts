import {createHash} from "node:crypto"

import {getDataConnect} from "firebase-admin/data-connect"

import {adminApp, db} from "./firebase-admin.js"

export const ANALYTICS_EXPORT_VERSION = "2026-03-18"
const ANALYTICS_EXPORT_TIME_ZONE = "Etc/UTC"

const analyticsExportConnectorConfig = {
  connector: "analytics_export",
  serviceId: "kandydrops-by-ikandy-service",
  location: "us-central1",
} as const

function toUuid(bytes: Buffer) {
  const normalized = Buffer.from(bytes.subarray(0, 16))
  normalized[6] = (normalized[6] & 0x0f) | 0x50
  normalized[8] = (normalized[8] & 0x3f) | 0x80
  const hex = normalized.toString("hex")
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-")
}

export function buildStableAnalyticsExportId(sourceKey: string) {
  return toUuid(createHash("sha1").update(sourceKey).digest())
}

export function getAnalyticsExportDataConnect() {
  return getDataConnect(analyticsExportConnectorConfig, adminApp)
}

export function readTimestampMillis(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as {toMillis?: unknown}).toMillis === "function"
  ) {
    return (value as {toMillis: () => number}).toMillis()
  }

  if (
    value &&
    typeof value === "object" &&
    "_seconds" in value &&
    typeof (value as {_seconds?: unknown})._seconds === "number"
  ) {
    return Math.round((value as {_seconds: number})._seconds * 1000)
  }

  return 0
}

export function readInt(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0
}

export function readFloat(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

export function readStringValue(value: unknown) {
  return typeof value === "string" ? value : ""
}

export function readNullableInt(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null
}

export function readNullableStringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null
}

export async function recordAnalyticsExportFailure(input: {
  domain: string;
  sourceCollection: string;
  sourceKey: string;
  errorMessage: string;
}) {
  await db.collection("server_diagnostics").add({
    channel: "analytics_export",
    severity: "error",
    message: `Analytics export sync failed: ${input.domain}`,
    detail: {
      domain: input.domain,
      sourceCollection: input.sourceCollection,
      sourceKey: input.sourceKey,
      error: input.errorMessage,
    },
    createdAtMs: Date.now(),
    updatedAtMs: Date.now(),
  })
}

export async function upsertAnalyticsExportStatus(input: {
  domain: string;
  sourceCollection: string;
  sourceKey: string;
  lastSourceUpdatedAtMs?: number;
  status?: string;
  lastError?: string | null;
}) {
  const dataConnect = getAnalyticsExportDataConnect()
  await dataConnect.executeMutation("UpsertAnalyticsExportStatus", {
    id: buildStableAnalyticsExportId(`status:${input.domain}`),
    domain: input.domain,
    sourceCollection: input.sourceCollection,
    sourceKey: input.sourceKey,
    timeZone: ANALYTICS_EXPORT_TIME_ZONE,
    exportVersion: ANALYTICS_EXPORT_VERSION,
    status: input.status || "healthy",
    lastSourceUpdatedAtMs: input.lastSourceUpdatedAtMs || null,
    lastExportedAtMs: Date.now(),
    lastError: input.lastError || null,
  })
}

export async function markAnalyticsExportStatusError(input: {
  domain: string;
  sourceCollection: string;
  sourceKey: string;
  lastSourceUpdatedAtMs?: number;
  errorMessage: string;
}) {
  try {
    await upsertAnalyticsExportStatus({
      domain: input.domain,
      sourceCollection: input.sourceCollection,
      sourceKey: input.sourceKey,
      lastSourceUpdatedAtMs: input.lastSourceUpdatedAtMs,
      status: "error",
      lastError: input.errorMessage.slice(0, 500),
    })
  } catch {
    // Avoid masking the original export failure with a status write failure.
  }
}
