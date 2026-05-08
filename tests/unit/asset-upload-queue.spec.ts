import { describe, expect, it } from "vitest";

import {
  buildUploadQueueStateSummary,
  detectStalledUploads,
  selectQueuedAssetIdsToStart,
  type UploadQueueAssetLike,
} from "@/lib/uploads/asset-upload-queue";

describe("asset-upload-queue helpers", () => {
  it("starts up to two uploads while limiting concurrent videos to one", () => {
    const assets: UploadQueueAssetLike[] = [
      { id: "queued-image", kind: "image", uploadStatus: "queued", uploadProgress: 0, queueQueuedAt: 100 },
      { id: "queued-video", kind: "video", uploadStatus: "queued", uploadProgress: 0, queueQueuedAt: 101 },
      { id: "queued-video-2", kind: "video", uploadStatus: "queued", uploadProgress: 0, queueQueuedAt: 102 },
    ];

    expect(selectQueuedAssetIdsToStart(assets)).toEqual(["queued-image", "queued-video"]);
  });

  it("marks stalled queued and active uploads with typed error codes", () => {
    const assets: UploadQueueAssetLike[] = [
      { id: "queued-image", kind: "image", uploadStatus: "queued", uploadProgress: 0, queueQueuedAt: 1 },
      { id: "uploading-video", kind: "video", uploadStatus: "uploading", uploadProgress: 45, uploadStartedAt: 1, lastProgressAt: 1 },
    ];

    expect(detectStalledUploads(assets, 60_001, {
      queuedStallMs: 30_000,
      activeStallMs: 60_000,
    })).toEqual([
      { id: "uploading-video", errorCode: "upload_stalled" },
    ]);
  });

  it("does not stall queued assets that are still waiting behind active uploads", () => {
    const assets: UploadQueueAssetLike[] = [
      { id: "uploading-image", kind: "image", uploadStatus: "uploading", uploadProgress: 40, uploadStartedAt: 1, lastProgressAt: 1 },
      { id: "queued-image", kind: "image", uploadStatus: "queued", uploadProgress: 0, queueQueuedAt: 1 },
    ];

    expect(detectStalledUploads(assets, 60_001, {
      queuedStallMs: 30_000,
      activeStallMs: 60_000,
      maxConcurrent: 2,
    })).toEqual([
      { id: "uploading-image", errorCode: "upload_stalled" },
    ]);
  });

  it("does not stall queued assets until they are eligible to start", () => {
    const assets: UploadQueueAssetLike[] = [
      { id: "uploading-image-a", kind: "image", uploadStatus: "uploading", uploadProgress: 40, uploadStartedAt: 1, lastProgressAt: 1 },
      { id: "uploading-image-b", kind: "image", uploadStatus: "uploading", uploadProgress: 60, uploadStartedAt: 1, lastProgressAt: 1 },
      { id: "queued-image", kind: "image", uploadStatus: "queued", uploadProgress: 0, queueQueuedAt: 1 },
    ];

    expect(detectStalledUploads(assets, 45_000, {
      queuedStallMs: 30_000,
      activeStallMs: 60_000,
      maxConcurrent: 2,
    })).toEqual([]);
  });

  it("only marks queued uploads stalled after they become eligible to start", () => {
    const assets: UploadQueueAssetLike[] = [
      { id: "uploading-image", kind: "image", uploadStatus: "uploading", uploadProgress: 40, uploadStartedAt: 1, lastProgressAt: 1 },
      { id: "queued-image", kind: "image", uploadStatus: "queued", uploadProgress: 0, queueQueuedAt: 1, eligibleToStartAt: 1 },
    ];

    expect(detectStalledUploads(assets, 40_001, {
      queuedStallMs: 30_000,
      activeStallMs: 60_000,
      maxConcurrent: 2,
    })).toEqual([
      { id: "queued-image", errorCode: "upload_queue_stalled" },
    ]);
  });

  it("reports queue completion only for uploaded-success assets", () => {
    const summary = buildUploadQueueStateSummary([
      { id: "success", kind: "image", uploadStatus: "success", uploadProgress: 100, uploadUrl: "https://cdn.example/success.jpg" },
      { id: "failed", kind: "file", uploadStatus: "failed", uploadProgress: 0 },
      { id: "canceled", kind: "video", uploadStatus: "canceled", uploadProgress: 0 },
    ]);

    expect(summary).toMatchObject({
      total: 3,
      success: 1,
      failed: 1,
      canceled: 1,
      allComplete: true,
    });
  });
});
