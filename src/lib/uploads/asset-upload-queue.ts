export type UploadKind = "image" | "video" | "file";

export type UploadStatus =
  | "local"
  | "queued"
  | "uploading"
  | "processing"
  | "success"
  | "failed"
  | "canceled"
  | "blocked";

export type UploadProgressMode = "measured" | "indeterminate";

export type UploadQueueAssetLike = {
  id: string;
  kind: UploadKind;
  uploadStatus: UploadStatus;
  uploadProgress: number;
  uploadUrl?: string;
  queueQueuedAt?: number;
  uploadStartedAt?: number;
  lastProgressAt?: number;
};

export type UploadQueueStateSummary = {
  total: number;
  local: number;
  queued: number;
  uploading: number;
  processing: number;
  success: number;
  failed: number;
  canceled: number;
  blocked: number;
  allComplete: boolean;
};

export const DEFAULT_UPLOAD_CONCURRENCY = 2;
export const DEFAULT_VIDEO_UPLOAD_CONCURRENCY = 1;
export const QUEUED_UPLOAD_STALL_MS = 30_000;
export const ACTIVE_UPLOAD_STALL_MS = 60_000;
export const MOBILE_UPLOAD_PREVIEW_LIMIT = 8;
export const UPLOAD_PROGRESS_CHECKPOINTS = [25, 50, 75, 100] as const;

export function hasActiveUploadStatus(status: UploadStatus) {
  return status === "uploading" || status === "processing";
}

export function isTerminalUploadStatus(status: UploadStatus) {
  return status === "success" || status === "failed" || status === "canceled" || status === "blocked";
}

export function buildUploadQueueStateSummary(
  assets: UploadQueueAssetLike[],
): UploadQueueStateSummary {
  const summary: UploadQueueStateSummary = {
    total: assets.length,
    local: 0,
    queued: 0,
    uploading: 0,
    processing: 0,
    success: 0,
    failed: 0,
    canceled: 0,
    blocked: 0,
    allComplete: assets.length === 0,
  };

  assets.forEach((asset) => {
    if (asset.uploadStatus === "local") summary.local += 1;
    if (asset.uploadStatus === "queued") summary.queued += 1;
    if (asset.uploadStatus === "uploading") summary.uploading += 1;
    if (asset.uploadStatus === "processing") summary.processing += 1;
    if (asset.uploadStatus === "success") summary.success += 1;
    if (asset.uploadStatus === "failed") summary.failed += 1;
    if (asset.uploadStatus === "canceled") summary.canceled += 1;
    if (asset.uploadStatus === "blocked") summary.blocked += 1;
  });

  summary.allComplete = summary.total > 0
    && summary.queued === 0
    && summary.uploading === 0
    && summary.processing === 0
    && summary.local === 0;

  return summary;
}

export function selectQueuedAssetIdsToStart(
  assets: UploadQueueAssetLike[],
  options?: {
    maxConcurrent?: number;
    maxVideoConcurrent?: number;
  },
) {
  const maxConcurrent = options?.maxConcurrent ?? DEFAULT_UPLOAD_CONCURRENCY;
  const maxVideoConcurrent = options?.maxVideoConcurrent ?? DEFAULT_VIDEO_UPLOAD_CONCURRENCY;
  const activeUploads = assets.filter((asset) => hasActiveUploadStatus(asset.uploadStatus));
  let activeCount = activeUploads.length;
  let activeVideoCount = activeUploads.filter((asset) => asset.kind === "video").length;
  const next: string[] = [];

  for (const asset of assets) {
    if (asset.uploadStatus !== "queued") {
      continue;
    }
    if (activeCount >= maxConcurrent) {
      break;
    }
    if (asset.kind === "video" && activeVideoCount >= maxVideoConcurrent) {
      continue;
    }

    next.push(asset.id);
    activeCount += 1;
    if (asset.kind === "video") {
      activeVideoCount += 1;
    }
  }

  return next;
}

export function detectStalledUploads(
  assets: UploadQueueAssetLike[],
  nowMs: number,
  options?: {
    queuedStallMs?: number;
    activeStallMs?: number;
    maxConcurrent?: number;
    maxVideoConcurrent?: number;
  },
) {
  const queuedStallMs = options?.queuedStallMs ?? QUEUED_UPLOAD_STALL_MS;
  const activeStallMs = options?.activeStallMs ?? ACTIVE_UPLOAD_STALL_MS;
  const stalled: Array<{ id: string; errorCode: "upload_stalled" | "upload_queue_stalled" }> = [];
  const queuedCandidates = new Set(selectQueuedAssetIdsToStart(assets, options));

  assets.forEach((asset) => {
    if (asset.uploadStatus === "uploading") {
      const lastProgressAt = asset.lastProgressAt ?? asset.uploadStartedAt ?? 0;
      if (lastProgressAt > 0 && nowMs - lastProgressAt >= activeStallMs) {
        stalled.push({ id: asset.id, errorCode: "upload_stalled" });
      }
      return;
    }

    if (asset.uploadStatus === "queued" && queuedCandidates.has(asset.id)) {
      const queuedAt = asset.queueQueuedAt ?? 0;
      if (queuedAt > 0 && nowMs - queuedAt >= queuedStallMs) {
        stalled.push({ id: asset.id, errorCode: "upload_queue_stalled" });
      }
    }
  });

  return stalled;
}

export function isUploadedAssetSuccess(asset: UploadQueueAssetLike) {
  return asset.uploadStatus === "success" && typeof asset.uploadUrl === "string" && asset.uploadUrl.length > 0;
}
