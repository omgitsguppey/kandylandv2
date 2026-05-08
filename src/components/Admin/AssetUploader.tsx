"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NextImage from "next/image";
import {
  AlertCircle,
  CheckCircle2,
  FileArchive,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Square,
  Upload,
  Video,
  X,
} from "lucide-react";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import type { UploadTask } from "firebase/storage";
import Cropper, { Area } from "react-easy-crop";

import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { generateSecureClientId } from "@/lib/client-random";
import { storage } from "@/lib/firebase-data";
import { trackEvent } from "@/lib/telemetry";
import {
  ACTIVE_UPLOAD_STALL_MS,
  buildUploadQueueStateSummary,
  DEFAULT_UPLOAD_CONCURRENCY,
  DEFAULT_VIDEO_UPLOAD_CONCURRENCY,
  detectStalledUploads,
  isUploadedAssetSuccess,
  MOBILE_UPLOAD_PREVIEW_LIMIT,
  QUEUED_UPLOAD_STALL_MS,
  selectQueuedAssetIdsToStart,
  type UploadKind,
  type UploadProgressMode,
  type UploadStatus,
} from "@/lib/uploads/asset-upload-queue";
import { buildUploadDraftSnapshot, type UploadDraftSnapshot } from "@/lib/uploads/asset-upload-draft-contract";
import { classifyUploadErrorCode, getUploadErrorCopy } from "@/lib/uploads/upload-error-copy";
import { cn } from "@/lib/utils";

export type UploadAspectRatio = "1:1" | "16:9" | "9:16";

export interface UploadedAsset {
  id: string;
  url: string;
  type: string;
  size: number;
  fileName?: string;
}

type UploadPath = "firebase_storage" | "server";

interface AssetDraft {
  id: string;
  kind: UploadKind;
  file?: File;
  previewUrl?: string;
  uploadUrl?: string;
  uploadType: string;
  uploadSize: number;
  fileName?: string;
  uploadStatus: UploadStatus;
  uploadProgress: number;
  uploadError?: string;
  uploadErrorCode?: string;
  uploadStartedAt?: number;
  uploadCompletedAt?: number;
  uploadPath: UploadPath;
  cropPixels?: Area;
  uploadProgressMode: UploadProgressMode;
  queueQueuedAt?: number;
  eligibleToStartAt?: number;
  lastProgressAt?: number;
}

interface AssetUploaderProps {
  label: string;
  helperText?: string;
  folder: string;
  multiple?: boolean;
  initialAssets?: UploadedAsset[];
  initialUrl?: string;
  initialType?: string;
  resetKey?: string;
  aspectRatio: UploadAspectRatio;
  onAspectRatioChange: (ratio: UploadAspectRatio) => void;
  onChange: (assets: UploadedAsset[]) => void;
  onUploadStateChange?: (state: {
    total: number;
    queued: number;
    uploading: number;
    success: number;
    failed: number;
    allComplete: boolean;
  }) => void;
  onDraftStateChange?: (snapshot: UploadDraftSnapshot) => void;
  accept: string;
  disableCrop?: boolean;
  serverUploadEndpoint?: string;
}

const RATIO_OPTIONS: UploadAspectRatio[] = ["1:1", "16:9", "9:16"];
const DEFAULT_CROP = { x: 0, y: 0 };
const DEFAULT_ZOOM = 1;
const DIRECT_STORAGE_BLOCKED_PREFIXES = ["drops/"];

function ratioToNumber(ratio: UploadAspectRatio): number {
  if (ratio === "16:9") return 16 / 9;
  if (ratio === "9:16") return 9 / 16;
  return 1;
}

function classifyFile(file: File): UploadKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

function isCanvasImageType(type: string): boolean {
  return /image\/(jpeg|jpg|png|webp|gif)/i.test(type);
}

function resolveUploadPath(folder: string, serverUploadEndpoint?: string): UploadPath {
  if (serverUploadEndpoint) {
    return "server";
  }
  return "firebase_storage";
}

function isDirectFirebaseUploadBlocked(folder: string, uploadPath: UploadPath) {
  if (uploadPath !== "firebase_storage") {
    return false;
  }

  return DIRECT_STORAGE_BLOCKED_PREFIXES.some((prefix) => folder.startsWith(prefix));
}

function createInitialAssets(
  folder: string,
  serverUploadEndpoint: string | undefined,
  initialAssets?: UploadedAsset[],
  initialUrl?: string,
  initialType?: string,
): AssetDraft[] {
  const uploadPath = resolveUploadPath(folder, serverUploadEndpoint);
  const now = Date.now();

  if (Array.isArray(initialAssets) && initialAssets.length > 0) {
    return initialAssets.map((asset, index) => ({
      id: asset.id || `initial-${index}-${asset.url}`,
      kind: asset.type?.startsWith("video/") ? "video" : asset.type?.startsWith("image/") ? "image" : "file",
      uploadUrl: asset.url,
      previewUrl: asset.url,
      uploadType: asset.type || "application/octet-stream",
      uploadSize: asset.size || 0,
      fileName: asset.fileName,
      uploadStatus: "success",
      uploadProgress: 100,
      uploadCompletedAt: now,
      uploadPath,
      uploadProgressMode: "measured",
    }));
  }

  if (!initialUrl) {
    return [];
  }

  return [{
    id: `initial-${initialUrl}`,
    kind: initialType?.startsWith("video/") ? "video" : initialType?.startsWith("image/") ? "image" : "file",
    uploadUrl: initialUrl,
    previewUrl: initialUrl,
    uploadType: initialType || "application/octet-stream",
    uploadSize: 0,
    fileName: undefined,
    uploadStatus: "success",
    uploadProgress: 100,
    uploadCompletedAt: now,
    uploadPath,
    uploadProgressMode: "measured",
  }];
}

function buildCroppedBlobPixels(file: File, cropPixels: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = cropPixels.width;
      canvas.height = cropPixels.height;
      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Canvas context unavailable"));
        return;
      }

      context.drawImage(
        image,
        cropPixels.x,
        cropPixels.y,
        cropPixels.width,
        cropPixels.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(objectUrl);
        if (!blob) {
          reject(new Error("Failed to generate cropped asset"));
          return;
        }
        resolve(blob);
      }, "image/jpeg", 0.92);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for crop"));
    };
    image.src = objectUrl;
  });
}

function getStatusLabel(asset: AssetDraft) {
  if (asset.uploadStatus === "queued") return "Queued";
  if (asset.uploadStatus === "uploading") {
    return asset.uploadProgressMode === "measured" ? `Uploading ${asset.uploadProgress}%` : "Uploading";
  }
  if (asset.uploadStatus === "processing") return "Processing";
  if (asset.uploadStatus === "success") return "Uploaded";
  if (asset.uploadStatus === "failed") return "Failed";
  if (asset.uploadStatus === "canceled") return "Canceled";
  if (asset.uploadStatus === "blocked") return "Blocked";
  return "Ready";
}

function getStatusTone(asset: AssetDraft) {
  if (asset.uploadStatus === "success") return "text-emerald-200 bg-emerald-500/70";
  if (asset.uploadStatus === "failed" || asset.uploadStatus === "blocked") return "text-red-100 bg-red-500/75";
  if (asset.uploadStatus === "canceled") return "text-amber-100 bg-amber-500/75";
  if (asset.uploadStatus === "processing") return "text-sky-100 bg-sky-500/75";
  if (asset.uploadStatus === "uploading") return "text-white bg-brand-purple/80";
  if (asset.uploadStatus === "queued") return "text-white bg-black/70";
  return "text-gray-100 bg-black/65";
}

function revokePreviewUrl(previewUrl?: string) {
  if (previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(previewUrl);
  }
}

export function AssetUploader({
  label,
  helperText,
  folder,
  multiple = false,
  initialAssets,
  initialUrl,
  initialType,
  resetKey,
  aspectRatio,
  onAspectRatioChange,
  onChange,
  onUploadStateChange,
  onDraftStateChange,
  accept,
  disableCrop = false,
  serverUploadEndpoint,
}: AssetUploaderProps) {
  const [assets, setAssets] = useState<AssetDraft[]>(() =>
    createInitialAssets(folder, serverUploadEndpoint, initialAssets, initialUrl, initialType),
  );
  const [crop, setCrop] = useState(DEFAULT_CROP);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialSignatureRef = useRef("");
  const resetKeyRef = useRef<string | undefined>(undefined);
  const uploadSessionIdRef = useRef(generateSecureClientId());
  const assetsRef = useRef<AssetDraft[]>(assets);
  const inFlightStartsRef = useRef(new Set<string>());
  const cancelHandlesRef = useRef(new Map<string, { cancel: () => void }>());
  const progressCheckpointsRef = useRef(new Map<string, Set<number>>());
  const previousAssetsRef = useRef<AssetDraft[]>(assets);

  assetsRef.current = assets;

  useEffect(() => {
    return () => {
      previousAssetsRef.current.forEach((asset) => revokePreviewUrl(asset.previewUrl));
    };
  }, []);

  useEffect(() => {
    const previousAssetMap = new Map(previousAssetsRef.current.map((asset) => [asset.id, asset]));
    const nextAssetIds = new Set(assets.map((asset) => asset.id));

    previousAssetsRef.current.forEach((previousAsset) => {
      if (!nextAssetIds.has(previousAsset.id)) {
        revokePreviewUrl(previousAsset.previewUrl);
      }
    });

    previousAssetMap.forEach((previousAsset, assetId) => {
      const nextAsset = assets.find((asset) => asset.id === assetId);
      if (nextAsset && previousAsset.previewUrl !== nextAsset.previewUrl) {
        revokePreviewUrl(previousAsset.previewUrl);
      }
    });

    previousAssetsRef.current = assets;
  }, [assets]);

  useEffect(() => {
    const signature = JSON.stringify({
      assets: (initialAssets || []).map((asset) => ({ id: asset.id, url: asset.url, type: asset.type, fileName: asset.fileName })),
      url: initialUrl || "",
      type: initialType || "",
      folder,
      serverUploadEndpoint: serverUploadEndpoint || "",
    });
    const nextResetKey = resetKey ?? undefined;
    const resetChanged = resetKeyRef.current !== nextResetKey;
    const hasActiveDraftAssets = assetsRef.current.some((asset) => asset.uploadStatus !== "success");

    if (resetChanged) {
      resetKeyRef.current = nextResetKey;
      uploadSessionIdRef.current = generateSecureClientId();
      initialSignatureRef.current = "";
      cancelHandlesRef.current.forEach(({ cancel }) => cancel());
      cancelHandlesRef.current.clear();
      inFlightStartsRef.current.clear();
      progressCheckpointsRef.current.clear();
      setAssets(createInitialAssets(folder, serverUploadEndpoint, initialAssets, initialUrl, initialType));
      return;
    }

    if (hasActiveDraftAssets) {
      return;
    }
    if (initialSignatureRef.current === signature) return;

    initialSignatureRef.current = signature;
    uploadSessionIdRef.current = generateSecureClientId();
    setAssets(createInitialAssets(folder, serverUploadEndpoint, initialAssets, initialUrl, initialType));
  }, [assetsRef, folder, initialAssets, initialType, initialUrl, resetKey, serverUploadEndpoint]);

  useEffect(() => {
    const uploaded = assets
      .filter(isUploadedAssetSuccess)
      .map((asset) => ({
        id: asset.id,
        url: asset.uploadUrl as string,
        type: asset.uploadType,
        size: asset.uploadSize,
        fileName: asset.fileName,
      }));

    onChange(uploaded);
  }, [assets, onChange]);

  useEffect(() => {
    if (!onUploadStateChange) {
      return;
    }

    const summary = buildUploadQueueStateSummary(assets);
    onUploadStateChange({
      total: summary.total,
      queued: summary.queued,
      uploading: summary.uploading + summary.processing,
      success: summary.success,
      failed: summary.failed + summary.blocked + summary.canceled,
      allComplete: summary.allComplete,
    });
  }, [assets, onUploadStateChange]);

  useEffect(() => {
    if (!onDraftStateChange) {
      return;
    }

    onDraftStateChange(buildUploadDraftSnapshot(uploadSessionIdRef.current, assets));
  }, [assets, onDraftStateChange]);

  const updateAsset = useCallback((assetId: string, updater: (asset: AssetDraft) => AssetDraft) => {
    setAssets((current) => current.map((asset) => asset.id === assetId ? updater(asset) : asset));
  }, []);

  const markAssetEligibleToStart = useCallback((assetId: string) => {
    updateAsset(assetId, (current) => current.eligibleToStartAt ? current : {
      ...current,
      eligibleToStartAt: Date.now(),
    });
  }, [updateAsset]);

  const reportUploadFailure = useCallback((asset: AssetDraft, errorCode: string, uploadPath: UploadPath) => {
    const severity = errorCode === "upload_permission_denied" || errorCode === "server_unauthorized" || errorCode === "storage/unauthorized"
      ? "error"
      : "warn";

    reportClientIssue({
      channel: "media_uploads",
      message: "Admin asset upload failed",
      severity,
      detail: {
        component: "AssetUploader",
        folder,
        label,
        kind: asset.kind,
        fileName: asset.fileName,
        fileKind: asset.kind,
        uploadPath,
        uploadStatus: asset.uploadStatus,
        uploadProgress: asset.uploadProgress,
        errorCode,
        serverUploadEndpoint: serverUploadEndpoint || "",
      },
      consoleLabel: "[AssetUploader] upload failed",
    });
  }, [folder, label, serverUploadEndpoint]);

  const markAssetFailed = useCallback((assetId: string, rawError: unknown, explicitCode?: string) => {
    const asset = assetsRef.current.find((item) => item.id === assetId);
    if (!asset) {
      return;
    }

    const errorCode = explicitCode || classifyUploadErrorCode(rawError, asset.uploadPath);
    const uploadError = getUploadErrorCopy(errorCode);
    const isCanceled = errorCode === "storage/canceled";
    const completedAt = Date.now();

    updateAsset(assetId, (current) => ({
      ...current,
      uploadStatus: isCanceled ? "canceled" : "failed",
      uploadError,
      uploadErrorCode: errorCode,
      uploadCompletedAt: completedAt,
      uploadProgress: isCanceled ? current.uploadProgress : 0,
    }));

    if (isCanceled) {
      trackEvent("asset_upload_canceled", {
        kind: asset.kind,
        upload_path: asset.uploadPath,
        folder,
        source_component: "asset_uploader",
      });
      return;
    }

    if (
      errorCode === "upload_permission_denied"
      || errorCode === "server_unauthorized"
      || errorCode === "storage/unauthorized"
    ) {
      reportUploadFailure(asset, errorCode, asset.uploadPath);
    }

    trackEvent("asset_upload_failed", {
      kind: asset.kind,
      upload_path: asset.uploadPath,
      error_code: errorCode,
      folder,
      source_component: "asset_uploader",
    });
  }, [folder, reportUploadFailure, updateAsset]);

  const emitProgressCheckpoint = useCallback((asset: AssetDraft, progress: number) => {
    const checkpoints = progressCheckpointsRef.current.get(asset.id) || new Set<number>();
    progressCheckpointsRef.current.set(asset.id, checkpoints);

    for (const checkpoint of [25, 50, 75, 100]) {
        if (progress >= checkpoint && !checkpoints.has(checkpoint)) {
          checkpoints.add(checkpoint);
          trackEvent("asset_batch_progress_updated", {
            batch_checkpoint: checkpoint,
            kind: asset.kind,
            upload_path: asset.uploadPath,
            folder,
            source_component: "asset_uploader",
          });
          trackEvent("asset_upload_progress_checkpoint", {
            kind: asset.kind,
            upload_path: asset.uploadPath,
          progress_checkpoint: checkpoint,
          folder,
          source_component: "asset_uploader",
        });
      }
    }
  }, [folder]);

  const buildUploadPayload = useCallback(async (asset: AssetDraft) => {
    if (!asset.file) {
      throw new Error("Missing upload file.");
    }

    const originalFile = asset.file;
    let uploadBlob: Blob = originalFile;
    let uploadExtension = originalFile.name.split(".").pop() || "bin";
    let uploadType = asset.uploadType;

    if (!disableCrop && asset.kind === "image" && isCanvasImageType(asset.uploadType) && asset.cropPixels) {
      uploadBlob = await buildCroppedBlobPixels(originalFile, asset.cropPixels);
      uploadExtension = "jpg";
      uploadType = "image/jpeg";
    }

    return { uploadBlob, uploadExtension, uploadType, originalFile };
  }, [disableCrop]);

  const uploadViaServer = useCallback(async (asset: AssetDraft) => {
    const { uploadBlob, uploadExtension, uploadType, originalFile } = await buildUploadPayload(asset);
    const controller = new AbortController();
    cancelHandlesRef.current.set(asset.id, { cancel: () => controller.abort() });

    const formData = new FormData();
    const baseUploadName = asset.fileName || originalFile.name || `${asset.id}.${uploadExtension}`;
    const uploadName = !disableCrop && asset.kind === "image" && asset.cropPixels
      ? `${baseUploadName.replace(/\.[A-Za-z0-9]+$/u, "")}.${uploadExtension}`
      : baseUploadName;
    formData.append("file", uploadBlob, uploadName);

    const response = await authFetch(serverUploadEndpoint as string, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    const result = await response.json().catch(() => ({})) as {
      error?: string;
      errorCode?: string;
      file?: {
        url?: string;
        persistedUrl?: string;
        safePreview?: {
          url?: string | null;
        };
        contentType?: string;
        size?: number;
        name?: string;
      };
    };

    const persistedUrl = result.file?.persistedUrl || result.file?.url;
    const previewUrl = result.file?.safePreview?.url || result.file?.url || persistedUrl;

    if (!response.ok || !persistedUrl) {
      const error = new Error(result.error || "Asset upload failed");
      Object.assign(error, {
        status: response.status,
        code: response.status === 401 || response.status === 403
          ? "server_unauthorized"
          : (result.errorCode || "unknown"),
      });
      throw error;
    }

    updateAsset(asset.id, (current) => ({
      ...current,
      uploadStatus: "processing",
      uploadProgress: 100,
      uploadError: undefined,
      uploadErrorCode: undefined,
      lastProgressAt: Date.now(),
    }));
    emitProgressCheckpoint(asset, 100);

    updateAsset(asset.id, (current) => ({
      ...current,
      uploadUrl: persistedUrl,
      previewUrl: previewUrl || current.previewUrl,
      uploadType: result.file?.contentType || uploadType,
      uploadSize: result.file?.size || uploadBlob.size,
      fileName: result.file?.name || current.fileName,
      uploadStatus: "success",
      uploadProgress: 100,
      uploadCompletedAt: Date.now(),
      uploadError: undefined,
      uploadErrorCode: undefined,
    }));

    trackEvent("asset_upload_success", {
      kind: asset.kind,
      upload_path: "server",
      folder,
      source_component: "asset_uploader",
    });
  }, [buildUploadPayload, disableCrop, emitProgressCheckpoint, folder, serverUploadEndpoint, updateAsset]);

  const uploadViaFirebase = useCallback(async (asset: AssetDraft) => {
    const { uploadBlob, uploadExtension, uploadType } = await buildUploadPayload(asset);
    const storageRef = ref(storage, `${folder}/${Date.now()}_${asset.id}.${uploadExtension}`);
    const uploadTask = uploadBytesResumable(storageRef, uploadBlob, { contentType: uploadType });
    cancelHandlesRef.current.set(asset.id, { cancel: () => uploadTask.cancel() });

    await new Promise<void>((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = snapshot.totalBytes > 0
            ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            : 0;
          updateAsset(asset.id, (current) => ({
            ...current,
            uploadStatus: "uploading",
            uploadProgress: progress,
            uploadError: undefined,
            uploadErrorCode: undefined,
            lastProgressAt: Date.now(),
          }));
          emitProgressCheckpoint(asset, progress);
        },
        (error) => reject(error),
        () => {
          updateAsset(asset.id, (current) => ({
            ...current,
            uploadStatus: "processing",
            uploadProgress: 100,
            uploadError: undefined,
            uploadErrorCode: undefined,
            lastProgressAt: Date.now(),
          }));
          emitProgressCheckpoint(asset, 100);
          resolve();
        },
      );
    });

    const downloadUrl = await getDownloadURL((uploadTask as UploadTask).snapshot.ref);

    updateAsset(asset.id, (current) => ({
      ...current,
      uploadUrl: downloadUrl,
      uploadType,
      uploadSize: uploadBlob.size,
      uploadStatus: "success",
      uploadProgress: 100,
      uploadCompletedAt: Date.now(),
      uploadError: undefined,
      uploadErrorCode: undefined,
    }));

    trackEvent("asset_upload_success", {
      kind: asset.kind,
      upload_path: "firebase_storage",
      folder,
      source_component: "asset_uploader",
    });
  }, [buildUploadPayload, emitProgressCheckpoint, folder, updateAsset]);

  const startUpload = useCallback(async (assetId: string) => {
    if (inFlightStartsRef.current.has(assetId)) {
      return;
    }

    const asset = assetsRef.current.find((item) => item.id === assetId);
    if (!asset || asset.uploadStatus !== "queued" || !asset.file) {
      return;
    }

    markAssetEligibleToStart(assetId);
    inFlightStartsRef.current.add(assetId);
    progressCheckpointsRef.current.delete(assetId);

    updateAsset(assetId, (current) => ({
      ...current,
      uploadStatus: "uploading",
      uploadProgress: 0,
      uploadStartedAt: Date.now(),
      lastProgressAt: Date.now(),
      uploadError: undefined,
      uploadErrorCode: undefined,
      uploadProgressMode: current.uploadPath === "server" ? "indeterminate" : "measured",
    }));

    trackEvent("asset_upload_started", {
      kind: asset.kind,
      upload_path: asset.uploadPath,
      folder,
      source_component: "asset_uploader",
    });

    try {
      if (asset.uploadPath === "server") {
        await uploadViaServer(asset);
      } else {
        await uploadViaFirebase(asset);
      }
    } catch (error) {
      markAssetFailed(assetId, error);
    } finally {
      cancelHandlesRef.current.delete(assetId);
      inFlightStartsRef.current.delete(assetId);
    }
  }, [folder, markAssetFailed, updateAsset, uploadViaFirebase, uploadViaServer]);

  useEffect(() => {
    const nextIds = selectQueuedAssetIdsToStart(assets, {
      maxConcurrent: DEFAULT_UPLOAD_CONCURRENCY,
      maxVideoConcurrent: DEFAULT_VIDEO_UPLOAD_CONCURRENCY,
    });

    nextIds.forEach((assetId) => {
      markAssetEligibleToStart(assetId);
    });

    nextIds.forEach((assetId) => {
      void startUpload(assetId);
    });
  }, [assets, markAssetEligibleToStart, startUpload]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const stalled = detectStalledUploads(assetsRef.current, Date.now(), {
        queuedStallMs: QUEUED_UPLOAD_STALL_MS,
        activeStallMs: ACTIVE_UPLOAD_STALL_MS,
        maxConcurrent: DEFAULT_UPLOAD_CONCURRENCY,
        maxVideoConcurrent: DEFAULT_VIDEO_UPLOAD_CONCURRENCY,
      });

      stalled.forEach((entry) => {
        if (cancelHandlesRef.current.has(entry.id)) {
          cancelHandlesRef.current.get(entry.id)?.cancel();
        }
        markAssetFailed(entry.id, new Error(entry.errorCode), entry.errorCode);
      });
    }, 5_000);

    return () => window.clearInterval(timer);
  }, [markAssetFailed]);

  useEffect(() => {
    const summary = buildUploadQueueStateSummary(assets);
    if (summary.allComplete && summary.success > 0 && summary.failed === 0 && summary.blocked === 0) {
      trackEvent("asset_batch_completed", {
        batch_size: summary.total,
        folder,
        source_component: "asset_uploader",
      });
    }
    if (summary.failed > 0 || summary.blocked > 0) {
      trackEvent("asset_batch_failed", {
        batch_size: summary.failed + summary.blocked,
        folder,
        source_component: "asset_uploader",
      });
    }
  }, [assets, folder]);

  const primaryAsset = useMemo(() => assets[0] || null, [assets]);
  const showCropper = !disableCrop
    && primaryAsset?.kind === "image"
    && primaryAsset.uploadStatus === "local"
    && !primaryAsset.uploadUrl
    && Boolean(primaryAsset.previewUrl);
  const hasOriginalSelection = useMemo(
    () => Boolean((initialAssets && initialAssets.length > 0) || initialUrl),
    [initialAssets, initialUrl],
  );

  const queueAssets = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) {
      return;
    }

    const appendToCurrentQueue = multiple;
    if (!appendToCurrentQueue) {
      uploadSessionIdRef.current = generateSecureClientId();
      cancelHandlesRef.current.forEach(({ cancel }) => cancel());
      cancelHandlesRef.current.clear();
      inFlightStartsRef.current.clear();
      progressCheckpointsRef.current.clear();
    }

    const uploadPath = resolveUploadPath(folder, serverUploadEndpoint);
    const now = Date.now();
    const incoming = Array.from(selectedFiles).map((file, index) => {
      const kind = classifyFile(file);
      const blocked = isDirectFirebaseUploadBlocked(folder, uploadPath);
      const shouldAwaitCrop = !disableCrop && kind === "image" && index === 0 && !multiple;
      const uploadStatus: UploadStatus = blocked
        ? "blocked"
        : shouldAwaitCrop
          ? "local"
          : "queued";
      const uploadErrorCode = blocked ? "upload_permission_denied" : undefined;

      return {
        id: `${Date.now()}-${file.name}-${generateSecureClientId()}`,
        kind,
        file,
        previewUrl: file.type.startsWith("image/") || file.type.startsWith("video/") ? URL.createObjectURL(file) : undefined,
        uploadType: file.type || "application/octet-stream",
        uploadSize: file.size,
        fileName: file.name,
        uploadStatus,
        uploadProgress: 0,
        uploadError: uploadErrorCode ? getUploadErrorCopy(uploadErrorCode) : undefined,
        uploadErrorCode,
        uploadPath,
        uploadProgressMode: uploadPath === "server" ? "indeterminate" : "measured",
        queueQueuedAt: uploadStatus === "queued" ? now + index : undefined,
        eligibleToStartAt: undefined,
      } satisfies AssetDraft;
    });

    trackEvent("asset_batch_selected", {
      batch_size: incoming.length,
      folder,
      source_component: "asset_uploader",
    });

    incoming.forEach((asset) => {
      if (asset.uploadStatus === "queued") {
        trackEvent("asset_upload_queued", {
          kind: asset.kind,
          upload_path: asset.uploadPath,
          folder,
          source_component: "asset_uploader",
        });
      }

      if (asset.uploadStatus === "blocked") {
        reportUploadFailure(asset, asset.uploadErrorCode || "upload_permission_denied", asset.uploadPath);
        trackEvent("asset_upload_failed", {
          kind: asset.kind,
          upload_path: asset.uploadPath,
          error_code: asset.uploadErrorCode || "upload_permission_denied",
          folder,
          source_component: "asset_uploader",
        });
      }
    });

    setAssets((current) => {
      const next = appendToCurrentQueue ? [...current, ...incoming].slice(0, 50) : incoming.slice(0, 1);
      return next;
    });
    setCrop(DEFAULT_CROP);
    setZoom(DEFAULT_ZOOM);
    trackEvent("asset_batch_queue_started", {
      batch_size: incoming.length,
      folder,
      source_component: "asset_uploader",
    });
  }, [disableCrop, folder, multiple, reportUploadFailure, serverUploadEndpoint]);

  const removeAsset = useCallback((assetId: string) => {
    cancelHandlesRef.current.get(assetId)?.cancel();
    cancelHandlesRef.current.delete(assetId);
    inFlightStartsRef.current.delete(assetId);
    progressCheckpointsRef.current.delete(assetId);
    setAssets((current) => current.filter((asset) => asset.id !== assetId));
  }, []);

  const resetCropState = useCallback(() => {
    setCrop(DEFAULT_CROP);
    setZoom(DEFAULT_ZOOM);
    setAssets((current) => current.map((item, index) => index === 0 ? { ...item, cropPixels: undefined } : item));
  }, []);

  const restoreOriginalSelection = useCallback(() => {
    setAssets(createInitialAssets(folder, serverUploadEndpoint, initialAssets, initialUrl, initialType));
    setCrop(DEFAULT_CROP);
    setZoom(DEFAULT_ZOOM);
  }, [folder, initialAssets, initialType, initialUrl, serverUploadEndpoint]);

  const confirmCrop = useCallback(() => {
    if (!primaryAsset) {
      return;
    }

    updateAsset(primaryAsset.id, (current) => ({
      ...current,
      uploadStatus: "queued",
      queueQueuedAt: Date.now(),
      uploadError: undefined,
      uploadErrorCode: undefined,
    }));

    trackEvent("asset_upload_queued", {
      kind: primaryAsset.kind,
      upload_path: primaryAsset.uploadPath,
      folder,
      source_component: "asset_uploader",
    });
  }, [folder, primaryAsset, updateAsset]);

  const retryAsset = useCallback((assetId: string) => {
    const asset = assetsRef.current.find((item) => item.id === assetId);
    if (!asset) {
      return;
    }

    const hasFile = Boolean(asset.file);
    const nextStatus: UploadStatus = hasFile && !disableCrop && asset.kind === "image" && !asset.cropPixels
      ? "local"
      : hasFile
        ? "queued"
        : "failed";
    const nextError = hasFile ? undefined : "Re-select file to retry.";

    progressCheckpointsRef.current.delete(assetId);
    updateAsset(assetId, (current) => ({
      ...current,
      uploadStatus: nextStatus,
      uploadProgress: 0,
      uploadError: nextError,
      uploadErrorCode: undefined,
      uploadStartedAt: undefined,
      uploadCompletedAt: undefined,
      queueQueuedAt: nextStatus === "queued" ? Date.now() : current.queueQueuedAt,
      eligibleToStartAt: nextStatus === "queued" ? Date.now() : current.eligibleToStartAt,
      lastProgressAt: undefined,
    }));

    trackEvent("asset_upload_retry_clicked", {
      kind: asset.kind,
      upload_path: asset.uploadPath,
      folder,
      source_component: "asset_uploader",
    });

    if (nextStatus === "queued") {
      trackEvent("asset_upload_queued", {
        kind: asset.kind,
        upload_path: asset.uploadPath,
        folder,
        source_component: "asset_uploader",
      });
    }
    trackEvent("asset_batch_retry_failed_clicked", {
      kind: asset.kind,
      upload_path: asset.uploadPath,
      folder,
      source_component: "asset_uploader",
    });
  }, [disableCrop, folder, updateAsset]);

  const cancelAsset = useCallback((assetId: string) => {
    cancelHandlesRef.current.get(assetId)?.cancel();
  }, []);

  const clearFailedAssets = useCallback(() => {
    setAssets((current) => current.filter((asset) => asset.uploadStatus !== "failed" && asset.uploadStatus !== "blocked"));
  }, []);

  const cancelQueuedAndUploadingAssets = useCallback(() => {
    setAssets((current) => current.map((asset) => {
      if (asset.uploadStatus === "queued" || asset.uploadStatus === "uploading" || asset.uploadStatus === "processing" || asset.uploadStatus === "local") {
        cancelHandlesRef.current.get(asset.id)?.cancel();
        return {
          ...asset,
          uploadStatus: "canceled",
          uploadError: "Upload canceled.",
          uploadErrorCode: "storage/canceled",
          uploadCompletedAt: Date.now(),
        };
      }
      return asset;
    }));
  }, []);

  const renderThumbnail = (asset: AssetDraft) => {
    if (asset.kind === "image" && asset.previewUrl) {
      return <NextImage src={asset.previewUrl} alt="Asset preview" fill unoptimized sizes="72px" className="object-cover" />;
    }
    if (asset.kind === "video" && asset.previewUrl) {
      return <video src={asset.previewUrl} className="h-full w-full object-cover" muted playsInline />;
    }
    return (
      <div className="flex h-full w-full items-center justify-center bg-white/5 text-gray-300">
        <FileArchive className="h-5 w-5" />
      </div>
    );
  };

  const queueSummary = buildUploadQueueStateSummary(assets);
  const visibleAssets = assets.slice(0, MOBILE_UPLOAD_PREVIEW_LIMIT);
  const hiddenAssetCount = Math.max(0, assets.length - visibleAssets.length);
  const batchSummaryLabel = [
    `${queueSummary.uploading + queueSummary.processing} uploading`,
    `${queueSummary.queued} queued`,
    `${queueSummary.success} uploaded`,
  ].filter((part) => !part.startsWith("0 ")).join(" • ");
  const hasFailedAssets = queueSummary.failed > 0 || queueSummary.blocked > 0;
  const hasRetryableFailedAssets = assets.some((asset) =>
    asset.uploadStatus === "failed" || asset.uploadStatus === "blocked" || asset.uploadStatus === "canceled",
  );
  const hasCancelableAssets = assets.some((asset) =>
    asset.uploadStatus === "queued"
    || asset.uploadStatus === "uploading"
    || asset.uploadStatus === "processing"
    || asset.uploadStatus === "local",
  );

  return (
    <div
      className="space-y-1.5"
      data-upload-mobile-density="compact-v2"
      data-upload-sprawl-reduction="target-50"
      data-upload-queue-state={queueSummary.allComplete ? "idle" : "active"}
    >
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-semibold text-gray-200">{label}</label>
        {assets.length > 0 ? (
          <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-gray-400">
            {assets.length > 1 && batchSummaryLabel ? batchSummaryLabel : `${assets.length} ${assets.length === 1 ? "file" : "files"}`}
          </span>
        ) : null}
      </div>

      <div className="space-y-2 rounded-2xl border border-white/10 bg-black/30 p-2.5 sm:p-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-xl border border-dashed border-white/15 px-3 py-2.5 text-left text-sm text-gray-300 transition-colors hover:bg-white/5 active:bg-white/10"
        >
          <span className="inline-flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Select {multiple ? "up to 50 assets" : "an asset"}
          </span>
          {helperText ? (
            <p className="mt-1 line-clamp-1 text-[11px] text-gray-500 sm:line-clamp-none">{helperText}</p>
          ) : null}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(event) => {
            queueAssets(event.target.files);
            event.currentTarget.value = "";
          }}
        />

        {assets.length > 1 ? (
          <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-gray-200">
                {batchSummaryLabel || "Batch active"}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearFailedAssets();
                  }}
                  className="rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-white/8"
                  disabled={!hasFailedAssets}
                >
                  Clear failed
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const retryable = assetsRef.current.filter((asset) => asset.uploadStatus === "failed" || asset.uploadStatus === "canceled" || asset.uploadStatus === "blocked");
                    retryable.forEach((asset) => retryAsset(asset.id));
                  }}
                  className="rounded-full border border-brand-purple/30 bg-brand-purple/15 px-2.5 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-brand-purple/25"
                  disabled={!hasRetryableFailedAssets}
                >
                  Retry failed
                </button>
                <button
                  type="button"
                  onClick={cancelQueuedAndUploadingAssets}
                  className="rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[10px] font-semibold text-gray-200 transition-colors hover:bg-white/8"
                  disabled={!hasCancelableAssets}
                >
                  Cancel all
                </button>
              </div>
            </div>
            <p className="mt-1 text-[10px] text-gray-500">
              Queued files stay visible until they upload, fail, or are removed.
            </p>
          </div>
        ) : null}

        {showCropper && primaryAsset?.previewUrl ? (
          <div className="space-y-2 rounded-[1.2rem] border border-white/10 bg-white/[0.02] p-2.5">
            <div
              className="relative mx-auto w-full max-w-sm overflow-hidden rounded-[1.2rem] border border-white/10 bg-[#11131a]"
              style={{ aspectRatio: String(ratioToNumber(aspectRatio)) }}
            >
              <Cropper
                image={primaryAsset.previewUrl}
                crop={crop}
                zoom={zoom}
                aspect={ratioToNumber(aspectRatio)}
                onCropChange={setCrop}
                onCropComplete={(_, croppedAreaPixels) => {
                  setAssets((current) => current.map((item, index) => index === 0 ? { ...item, cropPixels: croppedAreaPixels } : item));
                }}
                onZoomChange={setZoom}
                objectFit="contain"
                showGrid={true}
                restrictPosition={true}
              />
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-2 top-2 rounded-full border border-white/10 bg-black/70 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/85">
                  Safe Zone
                </div>
                <div className="absolute inset-[10%] rounded-[1rem] border border-dashed border-white/25 shadow-[0_0_0_999px_rgba(0,0,0,0.14)]" />
              </div>
            </div>

            <div className="space-y-2 rounded-[1rem] border border-white/8 bg-black/25 p-2.5">
              <div className="flex flex-wrap items-center gap-1">
                {RATIO_OPTIONS.map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => onAspectRatioChange(ratio)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors",
                      aspectRatio === ratio
                        ? "border-brand-purple bg-brand-purple text-white"
                        : "border-white/10 bg-black/35 text-gray-400 hover:bg-white/8 hover:text-white",
                    )}
                  >
                    {ratio}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                  <span>Zoom</span>
                  <span>{zoom.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="h-2 w-full cursor-pointer accent-brand-purple"
                  aria-label="Adjust cover zoom"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={resetCropState}
                  className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/8"
                >
                  Reset
                </button>
                {hasOriginalSelection ? (
                  <button
                    type="button"
                    onClick={restoreOriginalSelection}
                    className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/8"
                  >
                    Restore
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={confirmCrop}
                  className="ml-auto rounded-full border border-brand-purple bg-brand-purple/20 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-brand-purple/30"
                >
                  Use Cover
                </button>
              </div>

              <p className="text-[10px] text-gray-500">
                Crop the primary cover, then queue it. Upload progress appears in the thumbnail immediately.
              </p>
            </div>
          </div>
        ) : null}

        {assets.length > 0 ? (
          <div className={cn("grid gap-2 pt-1", multiple ? "grid-cols-4 sm:grid-cols-5" : "grid-cols-1 max-w-[180px]")}>
            {visibleAssets.map((asset) => {
              const queuedPosition = asset.uploadStatus === "queued"
                ? assets.filter((candidate) => candidate.uploadStatus === "queued").findIndex((candidate) => candidate.id === asset.id) + 1
                : null;

              return (
              <div
                key={asset.id}
                className="space-y-1"
                data-upload-status={asset.uploadStatus}
                data-upload-error-code={asset.uploadErrorCode || ""}
                data-upload-progress-mode={asset.uploadProgressMode}
              >
                <div className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-md">
                  {renderThumbnail(asset)}

                  <div className="absolute left-1.5 top-1.5 flex items-center gap-1">
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]", getStatusTone(asset))}>
                      {asset.uploadStatus === "queued" && queuedPosition ? `Queued #${queuedPosition}` : asset.uploadStatus === "uploading" && asset.uploadProgressMode === "measured" ? `${asset.uploadProgress}%` : getStatusLabel(asset)}
                    </span>
                  </div>

                  <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
                    {asset.uploadStatus === "uploading" || asset.uploadStatus === "processing" ? (
                      <button
                        type="button"
                        onClick={() => cancelAsset(asset.id)}
                        className="rounded-full bg-black/70 p-1 text-white"
                        aria-label="Cancel upload"
                        title="Cancel upload"
                      >
                        <Square className="h-3 w-3 fill-current" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="rounded-full bg-black/70 p-1 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                      onClick={() => removeAsset(asset.id)}
                      aria-label="Remove asset"
                      title="Remove asset"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] text-gray-200 shadow-sm">
                    <span className="inline-flex items-center gap-1">
                      {asset.kind === "image" ? <ImageIcon className="h-3 w-3" /> : asset.kind === "video" ? <Video className="h-3 w-3" /> : <FileArchive className="h-3 w-3" />}
                      {asset.kind}
                    </span>
                  </div>

                  {asset.uploadStatus === "uploading" || asset.uploadStatus === "processing" ? (
                    <div className="absolute inset-x-0 bottom-0">
                      <div className="h-1.5 bg-black/50">
                        {asset.uploadProgressMode === "measured" ? (
                          <div
                            className="h-full bg-brand-purple transition-[width] duration-200"
                            style={{ width: `${Math.max(4, asset.uploadProgress)}%` }}
                          />
                        ) : (
                          <div className="h-full w-1/2 animate-pulse bg-brand-purple" />
                        )}
                      </div>
                      <div className="flex items-center justify-between bg-black/70 px-1.5 py-1 text-[9px] text-white">
                        <span className="inline-flex items-center gap-1">
                          {asset.uploadStatus === "processing" || asset.uploadStatus === "uploading" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                          {asset.uploadStatus === "processing"
                            ? "Processing"
                            : asset.uploadProgressMode === "measured"
                              ? `Uploading ${asset.uploadProgress}%`
                              : "Uploading"}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>

                {asset.fileName ? (
                  <p className="hidden truncate text-[10px] text-gray-500 sm:block" title={asset.fileName}>
                    {asset.fileName}
                  </p>
                ) : null}

                {asset.uploadStatus === "failed" || asset.uploadStatus === "blocked" || asset.uploadStatus === "canceled" ? (
                  <div className="space-y-1">
                    <p className="line-clamp-2 text-[10px] text-red-300">
                      {asset.uploadError || "Upload failed. Retry or report this."}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => retryAsset(asset.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/35 px-2 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-white/8"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Retry
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAsset(asset.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/35 px-2 py-1 text-[10px] font-semibold text-gray-300 transition-colors hover:bg-white/8"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              );
            })}

            {hiddenAssetCount > 0 ? (
              <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                +{hiddenAssetCount} more
              </div>
            ) : null}
          </div>
        ) : null}

        {assets.some((asset) => asset.uploadStatus === "blocked") ? (
          <div className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Direct upload is blocked for this folder. Use the guarded admin or creator upload route instead of Firebase client writes.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
