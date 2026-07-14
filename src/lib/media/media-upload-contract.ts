export const MEDIA_UPLOAD_CONTRACT_VERSION = "2026.05.media-upload-lifecycle.1";

export const MEDIA_UPLOAD_ORPHAN_AFTER_MS = 30 * 60 * 1000;

export const MEDIA_UPLOAD_LIFECYCLE_EVENTS = [
  "media_upload_prepare_started",
  "media_upload_prepare_completed",
  "media_upload_prepare_failed",
  "media_storage_upload_started",
  "media_storage_upload_completed",
  "media_storage_upload_failed",
  "media_upload_complete_started",
  "media_upload_complete_completed",
  "media_upload_complete_failed",
  "media_upload_cancelled",
  "media_upload_orphaned",
  "media_upload_recovered",
  "media_upload_blocked_size",
  "media_upload_blocked_type",
] as const;

export type MediaUploadLifecycleEventName = (typeof MEDIA_UPLOAD_LIFECYCLE_EVENTS)[number];
export type MediaUploadFeatureId = "support" | "creator_drop_manager" | "drops" | "viewer" | "analytics_telemetry";
export type MediaUploadSurface = "chat" | "creator_drop" | "drop_manager" | "viewer" | "admin_debug";
export type MediaUploadKind = "image" | "video" | "audio" | "document" | "unknown";
export type MediaUploadStatus =
  | "prepare_started"
  | "prepared"
  | "storage_started"
  | "storage_completed"
  | "complete_started"
  | "completed"
  | "failed"
  | "cancelled"
  | "orphaned"
  | "recovered"
  | "blocked";
export type MediaUploadPrivacyClass = "required_integrity" | "minimal_product" | "admin_debug";
export type MediaUploadAssetUrlPolicy =
  | "none"
  | "public_url_allowed"
  | "private_url_not_logged"
  | "signed_url_not_logged";

export interface MediaUploadLifecycleInput {
  eventName: MediaUploadLifecycleEventName;
  uploadId: string;
  correlationId?: string | null;
  ownerUserId?: string | null;
  featureId: MediaUploadFeatureId | string;
  surface: MediaUploadSurface | string;
  mediaKind: MediaUploadKind;
  mimeType: string;
  sizeBytes: number;
  maxBytes: number;
  storagePath?: string | null;
  storagePathFingerprint?: string | null;
  assetUrl?: string | null;
  assetUrlPolicy?: MediaUploadAssetUrlPolicy | null;
  status: MediaUploadStatus;
  failureReason?: string | null;
  durationMs?: number | null;
  retryCount?: number | null;
  privacyClass: MediaUploadPrivacyClass;
}

export interface MediaUploadLifecyclePayload {
  contractVersion: typeof MEDIA_UPLOAD_CONTRACT_VERSION;
  eventName: MediaUploadLifecycleEventName;
  uploadId: string;
  correlationId: string;
  ownerUserId: string | null;
  featureId: string;
  surface: string;
  mediaKind: MediaUploadKind;
  mimeType: string;
  sizeBytes: number;
  maxBytes: number;
  storagePathFingerprint: string | null;
  assetUrlPolicy: MediaUploadAssetUrlPolicy;
  status: MediaUploadStatus;
  failureReason: string | null;
  durationMs: number;
  retryCount: number;
  privacyClass: MediaUploadPrivacyClass;
}

export interface MediaUploadBlockClassification {
  blocked: boolean;
  eventName: "media_upload_blocked_size" | "media_upload_blocked_type" | null;
  failureReason: "size_exceeded" | "unsupported_type" | null;
}

export interface MediaUploadOrphanState {
  orphaned: boolean;
  eventName: "media_upload_orphaned" | null;
  ageMs: number;
  orphanAfterMs: number;
}

export interface MediaUploadDebugLane {
  label: "Media upload";
  status: "live" | "degraded";
  totalEvents: number;
  prepareFailures: number;
  storageUploadFailures: number;
  completionFailures: number;
  orphanRiskCount: number;
  sizeTypeBlockCount: number;
  averageUploadDurationMs: number;
  sourceTruth: "media_upload_lifecycle_contract";
  privacy: "storage_paths_fingerprinted";
}

export type StorageObjectVersion = {
  generation: string | number;
  metageneration: string | number;
};

function isStorageObjectVersionValue(value: unknown): value is string | number {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0;
  }
  return typeof value === "string" && /^[1-9]\d*$/u.test(value);
}

export function readStorageObjectVersion(metadata: {
  generation?: unknown;
  metageneration?: unknown;
}): StorageObjectVersion | null {
  if (
    !isStorageObjectVersionValue(metadata.generation)
    || !isStorageObjectVersionValue(metadata.metageneration)
  ) {
    return null;
  }
  return {
    generation: metadata.generation,
    metageneration: metadata.metageneration,
  };
}

export function isStoragePreconditionFailure(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const record = error as { code?: unknown; status?: unknown; statusCode?: unknown };
  return [record.code, record.status, record.statusCode].some((value) => Number(value) === 412);
}

export function isStorageNotFoundFailure(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const record = error as { code?: unknown; status?: unknown; statusCode?: unknown };
  return [record.code, record.status, record.statusCode].some((value) => Number(value) === 404);
}

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function cleanNonNegativeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
}

function normalizeFailureReason(value: unknown) {
  return cleanText(value).slice(0, 80) || null;
}

export function fingerprintStoragePath(storagePath: string | null | undefined) {
  const value = cleanText(storagePath);
  if (!value) return null;

  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `sp_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function resolveMediaUploadKind(mimeType: unknown): MediaUploadKind {
  const normalized = cleanText(mimeType).toLowerCase();
  if (normalized.startsWith("image/")) return "image";
  if (normalized.startsWith("video/")) return "video";
  if (normalized.startsWith("audio/")) return "audio";
  if (normalized.startsWith("application/") || normalized.startsWith("text/")) return "document";
  return "unknown";
}

export function classifyMediaUploadBlock(input: {
  mimeType: string;
  sizeBytes: number;
  maxBytes: number;
  allowedMimeTypes: readonly string[];
}): MediaUploadBlockClassification {
  const normalizedMimeType = cleanText(input.mimeType).toLowerCase();
  const allowed = input.allowedMimeTypes.some((allowedMimeType) =>
    normalizedMimeType.startsWith(allowedMimeType.toLowerCase()),
  );
  if (!allowed) {
    return {
      blocked: true,
      eventName: "media_upload_blocked_type",
      failureReason: "unsupported_type",
    };
  }
  if (cleanNonNegativeNumber(input.sizeBytes) > cleanNonNegativeNumber(input.maxBytes)) {
    return {
      blocked: true,
      eventName: "media_upload_blocked_size",
      failureReason: "size_exceeded",
    };
  }
  return {
    blocked: false,
    eventName: null,
    failureReason: null,
  };
}

export function detectMediaUploadOrphanState(input: {
  preparedAtMs: number;
  completedAtMs?: number | null;
  nowMs: number;
  orphanAfterMs?: number | null;
}): MediaUploadOrphanState {
  const preparedAtMs = cleanNonNegativeNumber(input.preparedAtMs);
  const nowMs = cleanNonNegativeNumber(input.nowMs);
  const orphanAfterMs = cleanNonNegativeNumber(input.orphanAfterMs ?? MEDIA_UPLOAD_ORPHAN_AFTER_MS) || MEDIA_UPLOAD_ORPHAN_AFTER_MS;
  const completed = typeof input.completedAtMs === "number" && Number.isFinite(input.completedAtMs) && input.completedAtMs > 0;
  const ageMs = Math.max(0, nowMs - preparedAtMs);
  const orphaned = !completed && ageMs >= orphanAfterMs;

  return {
    orphaned,
    eventName: orphaned ? "media_upload_orphaned" : null,
    ageMs,
    orphanAfterMs,
  };
}

export function buildMediaUploadLifecycleEvent(input: MediaUploadLifecycleInput): MediaUploadLifecyclePayload {
  const storagePathFingerprint = cleanText(input.storagePathFingerprint)
    || fingerprintStoragePath(input.storagePath);
  const hasAssetUrl = cleanText(input.assetUrl).length > 0;
  const assetUrlPolicy = input.assetUrlPolicy
    ?? (hasAssetUrl ? "private_url_not_logged" : "none");

  return {
    contractVersion: MEDIA_UPLOAD_CONTRACT_VERSION,
    eventName: input.eventName,
    uploadId: cleanText(input.uploadId, "unknown_upload").slice(0, 120),
    correlationId: cleanText(input.correlationId, input.uploadId).slice(0, 120),
    ownerUserId: cleanText(input.ownerUserId) || null,
    featureId: cleanText(input.featureId, "analytics_telemetry").slice(0, 80),
    surface: cleanText(input.surface, "unknown").slice(0, 80),
    mediaKind: input.mediaKind,
    mimeType: cleanText(input.mimeType, "application/octet-stream").slice(0, 160),
    sizeBytes: cleanNonNegativeNumber(input.sizeBytes),
    maxBytes: cleanNonNegativeNumber(input.maxBytes),
    storagePathFingerprint,
    assetUrlPolicy,
    status: input.status,
    failureReason: normalizeFailureReason(input.failureReason),
    durationMs: cleanNonNegativeNumber(input.durationMs),
    retryCount: cleanNonNegativeNumber(input.retryCount),
    privacyClass: input.privacyClass,
  };
}

export function validateMediaUploadLifecyclePayload(payload: MediaUploadLifecyclePayload): string[] {
  const failures: string[] = [];
  if (!MEDIA_UPLOAD_LIFECYCLE_EVENTS.includes(payload.eventName)) failures.push("unknown media upload lifecycle event.");
  if (!payload.uploadId) failures.push("media upload lifecycle payload lacks uploadId.");
  if (!payload.correlationId) failures.push("media upload lifecycle payload lacks correlationId.");
  if (!payload.featureId) failures.push("media upload lifecycle payload lacks featureId.");
  if (!payload.surface) failures.push("media upload lifecycle payload lacks surface.");
  if (payload.sizeBytes > payload.maxBytes && payload.eventName !== "media_upload_blocked_size") {
    failures.push("oversized media upload must use media_upload_blocked_size.");
  }
  const serialized = JSON.stringify(payload);
  if (/(?:firebasestorage\.googleapis\.com|storage\.googleapis\.com|token=|alt=media|creator\/messages\/|gs:\/\/|https?:\/\/)/iu.test(serialized)) {
    failures.push("media upload lifecycle payload leaks raw storage path or private URL.");
  }
  return failures;
}

export function buildMediaUploadDebugLane(events: readonly MediaUploadLifecyclePayload[]): MediaUploadDebugLane {
  const durations = events.map((event) => event.durationMs).filter((duration) => duration > 0);
  const averageUploadDurationMs = durations.length
    ? Math.round(durations.reduce((total, duration) => total + duration, 0) / durations.length)
    : 0;
  const prepareFailures = events.filter((event) => event.eventName === "media_upload_prepare_failed").length;
  const storageUploadFailures = events.filter((event) => event.eventName === "media_storage_upload_failed").length;
  const completionFailures = events.filter((event) => event.eventName === "media_upload_complete_failed").length;
  const orphanRiskCount = events.filter((event) => event.eventName === "media_upload_orphaned").length;
  const sizeTypeBlockCount = events.filter((event) =>
    event.eventName === "media_upload_blocked_size" || event.eventName === "media_upload_blocked_type",
  ).length;
  const degraded = prepareFailures + storageUploadFailures + completionFailures + orphanRiskCount + sizeTypeBlockCount > 0;

  return {
    label: "Media upload",
    status: degraded ? "degraded" : "live",
    totalEvents: events.length,
    prepareFailures,
    storageUploadFailures,
    completionFailures,
    orphanRiskCount,
    sizeTypeBlockCount,
    averageUploadDurationMs,
    sourceTruth: "media_upload_lifecycle_contract",
    privacy: "storage_paths_fingerprinted",
  };
}
