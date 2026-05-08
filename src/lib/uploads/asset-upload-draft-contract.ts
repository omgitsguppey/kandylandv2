import type { UploadKind, UploadStatus } from "@/lib/uploads/asset-upload-queue";

export type UploadDraftSnapshot = {
  draftId: string;
  assets: Array<{
    id: string;
    kind: UploadKind;
    fileName?: string;
    uploadStatus: UploadStatus;
    uploadProgress: number;
    uploadUrl?: string;
    previewUrl?: string;
    uploadType: string;
    uploadSize: number;
    uploadErrorCode?: string;
    uploadError?: string;
    uploadPath: "server" | "firebase_storage";
    queueQueuedAt?: number;
    eligibleToStartAt?: number;
    uploadStartedAt?: number;
    uploadCompletedAt?: number;
  }>;
  summary: {
    total: number;
    queued: number;
    uploading: number;
    processing: number;
    success: number;
    failed: number;
    blocked: number;
    canceled: number;
    allComplete: boolean;
  };
};

type DraftAssetLike = UploadDraftSnapshot["assets"][number];

export function buildUploadDraftSnapshot(
  draftId: string,
  assets: DraftAssetLike[],
): UploadDraftSnapshot {
  const summary = assets.reduce<UploadDraftSnapshot["summary"]>(
    (accumulator, asset) => {
      accumulator.total += 1;
      if (asset.uploadStatus === "queued") accumulator.queued += 1;
      if (asset.uploadStatus === "uploading") accumulator.uploading += 1;
      if (asset.uploadStatus === "processing") accumulator.processing += 1;
      if (asset.uploadStatus === "success") accumulator.success += 1;
      if (asset.uploadStatus === "failed") accumulator.failed += 1;
      if (asset.uploadStatus === "blocked") accumulator.blocked += 1;
      if (asset.uploadStatus === "canceled") accumulator.canceled += 1;
      return accumulator;
    },
    {
      total: 0,
      queued: 0,
      uploading: 0,
      processing: 0,
      success: 0,
      failed: 0,
      blocked: 0,
      canceled: 0,
      allComplete: assets.length === 0,
    },
  );

  summary.allComplete = summary.total > 0
    && summary.queued === 0
    && summary.uploading === 0
    && summary.processing === 0
    && summary.failed === 0
    && summary.blocked === 0
    && summary.canceled === 0;

  return {
    draftId,
    assets: assets.map((asset) => ({ ...asset })),
    summary,
  };
}
