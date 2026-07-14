import {logger} from "firebase-functions"
import {onSchedule} from "firebase-functions/v2/scheduler"

import {REGION} from "./firebase-runtime.js"
import {
  hasExactKeys,
  isCanonicalCode,
  isNonNegativeInteger,
  isPlainRecord,
  parseScheduledAllowedHosts,
  postScheduledJson,
} from "./scheduled-http-client.js"
class ScheduledJobError extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = "ScheduledJobError"
  }
}

type ScheduledJobContext = {signal: AbortSignal}
type UserIndexMaterializerDispatchMode = "off" | "shadow" | "active"

type UserIndexReceipt = {
  windowId: string
  mode: "shadow" | "active"
  sourceFingerprint: string
  materializerVersion: string
  startedAtMs: number
  completedAtMs: number
  requestsClaimed: number
  requestsCompleted: number
  requestsFailed: number
  leaseLostCount: number
  factsRead: number
  factsPublished: number
  exclusions: Record<string, number>
  truncatedSubjectCount: number
  runtimeCapReached: boolean
  clean: boolean
  expiresAtMs: number
}

type UserIndexMaterializerResponse = {
  success: true
  idempotencyKey: "user_index_materializer_request_id_and_lease"
  result: {
    status: "off" | "no_work" | "completed" | "completed_with_issues"
    mode: "off" | "shadow" | "active"
    issueCodes: string[]
    receipt: UserIndexReceipt | null
  }
}

const USER_INDEX_MAX_REQUESTS = 5
const USER_INDEX_MAX_FACTS_PER_REQUEST = 200
const USER_INDEX_MATERIALIZER_VERSION = "2026.07.user-index-materializer.v3"
const USER_INDEX_WINDOW_RETENTION_MS = 90 * 24 * 60 * 60 * 1000
const USER_INDEX_MATERIALIZER_PATH = "/api/internal/analytics/materialize-user-index"
const USER_INDEX_SCHEDULE = "every 5 minutes"
const USER_INDEX_TIMEOUT_SECONDS = 300

const USER_INDEX_RECEIPT_KEYS = [
  "windowId", "mode", "sourceFingerprint", "materializerVersion", "startedAtMs", "completedAtMs",
  "requestsClaimed", "requestsCompleted", "requestsFailed", "leaseLostCount", "factsRead", "factsPublished",
  "exclusions", "truncatedSubjectCount", "runtimeCapReached", "clean",
  "expiresAtMs",
] as const
const USER_INDEX_EXCLUSION_KEYS = [
  "exactReplayExcludedCount", "linkedCopyExcludedCount", "identityConflictExcludedCount",
  "lineageBlockedCount", "adminExcludedCount", "systemExcludedCount",
] as const
const USER_INDEX_ISSUE_CODES = new Set([
  "materializer_off", "materializer_request_failed", "materializer_lease_lost", "runtime_cap_reached",
  "materializer_subject_truncated",
])

function parseUserIndexReceipt(value: unknown): UserIndexReceipt | null {
  if (value === null) return null
  if (!hasExactKeys(value, USER_INDEX_RECEIPT_KEYS)) return null
  if (
    typeof value.windowId !== "string" || !value.windowId.startsWith("user_index_window_")
    || (value.mode !== "shadow" && value.mode !== "active")
    || typeof value.sourceFingerprint !== "string" || value.sourceFingerprint.trim().length === 0 || value.sourceFingerprint.length > 256
    || value.materializerVersion !== USER_INDEX_MATERIALIZER_VERSION
    || !isNonNegativeInteger(value.startedAtMs)
    || !isNonNegativeInteger(value.completedAtMs)
    || value.completedAtMs < value.startedAtMs
    || !isNonNegativeInteger(value.expiresAtMs)
    || value.expiresAtMs !== value.completedAtMs + USER_INDEX_WINDOW_RETENTION_MS
    || !isNonNegativeInteger(value.requestsClaimed, USER_INDEX_MAX_REQUESTS)
    || value.requestsClaimed === 0
    || !isNonNegativeInteger(value.requestsCompleted, value.requestsClaimed)
    || !isNonNegativeInteger(value.requestsFailed, value.requestsClaimed)
    || !isNonNegativeInteger(value.leaseLostCount, value.requestsClaimed)
    || value.requestsCompleted + value.requestsFailed + value.leaseLostCount !== value.requestsClaimed
    || !isNonNegativeInteger(value.factsRead, value.requestsClaimed * USER_INDEX_MAX_FACTS_PER_REQUEST)
    || !isNonNegativeInteger(value.factsPublished, value.factsRead)
    || !hasExactKeys(value.exclusions, USER_INDEX_EXCLUSION_KEYS)
    || !Object.values(value.exclusions).every((count) => isNonNegativeInteger(count))
    || !isNonNegativeInteger(value.truncatedSubjectCount, value.requestsClaimed)
    || typeof value.runtimeCapReached !== "boolean"
    || typeof value.clean !== "boolean"
  ) return null
  const derivedClean = value.requestsCompleted === value.requestsClaimed
    && value.requestsFailed === 0
    && value.leaseLostCount === 0
    && value.truncatedSubjectCount === 0
    && value.runtimeCapReached === false
  if (value.clean !== derivedClean) return null
  return value as UserIndexReceipt
}

function parseUserIndexMaterializerResponse(value: unknown): UserIndexMaterializerResponse {
  if (
    !hasExactKeys(value, ["success", "idempotencyKey", "result"])
    || value.success !== true
    || value.idempotencyKey !== "user_index_materializer_request_id_and_lease"
    || !hasExactKeys(value.result, ["status", "mode", "receipt", "issueCodes"])
    || !Array.isArray(value.result.issueCodes)
    || !value.result.issueCodes.every((code) => isCanonicalCode(code) && USER_INDEX_ISSUE_CODES.has(code))
    || new Set(value.result.issueCodes).size !== value.result.issueCodes.length
  ) throw new ScheduledJobError("user_index_materializer_receipt_invalid")

  const {status, mode, issueCodes} = value.result
  const receipt = parseUserIndexReceipt(value.result.receipt)
  if (status === "off") {
    if (mode !== "off" || value.result.receipt !== null || issueCodes.length !== 1 || issueCodes[0] !== "materializer_off") {
      throw new ScheduledJobError("user_index_materializer_receipt_invalid")
    }
  } else if (status === "no_work") {
    if ((mode !== "shadow" && mode !== "active") || value.result.receipt !== null || issueCodes.length !== 0) {
      throw new ScheduledJobError("user_index_materializer_receipt_invalid")
    }
  } else if (status === "completed" || status === "completed_with_issues") {
    if (!receipt || receipt.mode !== mode || (status === "completed") !== receipt.clean) {
      throw new ScheduledJobError("user_index_materializer_receipt_invalid")
    }
    const expectedIssues = [
      receipt.requestsFailed > 0 ? "materializer_request_failed" : "",
      receipt.leaseLostCount > 0 ? "materializer_lease_lost" : "",
      receipt.runtimeCapReached ? "runtime_cap_reached" : "",
      receipt.truncatedSubjectCount > 0 ? "materializer_subject_truncated" : "",
    ].filter(Boolean)
    if (issueCodes.length !== expectedIssues.length || issueCodes.some((code, index) => code !== expectedIssues[index])) {
      throw new ScheduledJobError("user_index_materializer_receipt_invalid")
    }
  } else {
    throw new ScheduledJobError("user_index_materializer_receipt_invalid")
  }
  if (!isPlainRecord(value.result)) throw new ScheduledJobError("user_index_materializer_receipt_invalid")
  return value as UserIndexMaterializerResponse
}

export function resolveUserIndexMaterializerDispatchMode(value: string | undefined): UserIndexMaterializerDispatchMode {
  const normalized = value?.trim()
  return normalized === "shadow" || normalized === "active" ? normalized : "off"
}

export async function runUserIndexMaterializerSchedule(
  context: ScheduledJobContext,
  expectedMode = resolveUserIndexMaterializerDispatchMode(process.env.USER_INDEX_MATERIALIZER_MODE),
) {
  if (expectedMode === "off") throw new ScheduledJobError("user_index_materializer_dispatch_off")
  const allowedHosts = parseScheduledAllowedHosts(
    process.env.USER_INDEX_MATERIALIZER_ALLOWED_HOSTS?.trim() ?? "",
  )
  const payload = await postScheduledJson<unknown>({
    endpoint: process.env.USER_INDEX_MATERIALIZER_ENDPOINT?.trim() ?? "",
    token: process.env.CRON_SECRET?.trim() ?? "",
    allowedHosts,
    expectedPath: USER_INDEX_MATERIALIZER_PATH,
    signal: context.signal,
    timeoutMs: 60_000,
    body: {source: "user_index_materializer"},
  })
  const response = parseUserIndexMaterializerResponse(payload)
  if (response.result.status === "off" || response.result.mode !== expectedMode) {
    throw new ScheduledJobError("user_index_materializer_mode_mismatch")
  }

  const receipt = response.result.receipt
  const warnings = Array.from(new Set([
    ...response.result.issueCodes,
    ...(receipt?.runtimeCapReached ? ["user_index_materializer_budget_deferred"] : []),
  ].filter(Boolean))).slice(0, 20)
  logger.info("user index materializer completed", {
    mode: response.result.mode,
    status: response.result.status,
    requestsClaimed: receipt?.requestsClaimed ?? 0,
    requestsCompleted: receipt?.requestsCompleted ?? 0,
    requestsFailed: receipt?.requestsFailed ?? 0,
    factsPublished: receipt?.factsPublished ?? 0,
  })
  return {
    itemsScanned: receipt?.factsRead ?? receipt?.requestsClaimed ?? 0,
    itemsChanged: receipt?.factsPublished ?? receipt?.requestsCompleted ?? 0,
    warnings,
  }
}

export async function handleUserIndexMaterializerSchedule() {
  const dispatchMode = resolveUserIndexMaterializerDispatchMode(process.env.USER_INDEX_MATERIALIZER_MODE)
  if (dispatchMode === "off") {
    logger.info("user index materializer skipped; USER_INDEX_MATERIALIZER_MODE=off")
    return
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 240_000)
  try {
    await runUserIndexMaterializerSchedule({signal: controller.signal}, dispatchMode)
  } finally {
    clearTimeout(timeout)
  }
}

export const materializeUserTrackingIndexes = onSchedule({
  schedule: USER_INDEX_SCHEDULE,
  region: REGION,
  timeoutSeconds: USER_INDEX_TIMEOUT_SECONDS,
  maxInstances: 1,
  retryCount: 0,
  secrets: ["CRON_SECRET"],
}, handleUserIndexMaterializerSchedule)
