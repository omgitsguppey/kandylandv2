"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import NextImage from "next/image";
import { X, Upload, Loader2, FileArchive, Video, Image as ImageIcon } from "lucide-react";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "@/lib/firebase-data";
import { cn } from "@/lib/utils";
import Cropper, { Area } from "react-easy-crop";
import { trackEvent } from "@/lib/telemetry";

export type UploadAspectRatio = "1:1" | "16:9" | "9:16";

type UploadKind = "image" | "video" | "file";

export interface UploadedAsset {
  id: string;
  url: string;
  type: string;
  size: number;
  fileName?: string;
}

interface AssetDraft {
  id: string;
  kind: UploadKind;
  file?: File;
  previewUrl?: string;
  uploadUrl?: string;
  uploadType: string;
  uploadSize: number;
  fileName?: string;
  uploading: boolean;
  cropPixels?: Area; // From react-easy-crop
}

interface AssetUploaderProps {
  label: string;
  helperText?: string;
  folder: string;
  multiple?: boolean;
  initialAssets?: UploadedAsset[];
  initialUrl?: string;
  initialType?: string;
  aspectRatio: UploadAspectRatio;
  onAspectRatioChange: (ratio: UploadAspectRatio) => void;
  onChange: (assets: UploadedAsset[]) => void;
  accept: string;
  disableCrop?: boolean;
}

const RATIO_OPTIONS: UploadAspectRatio[] = ["1:1", "16:9", "9:16"];

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

function createInitialAssets(initialAssets?: UploadedAsset[], initialUrl?: string, initialType?: string): AssetDraft[] {
  if (Array.isArray(initialAssets) && initialAssets.length > 0) {
    return initialAssets.map((asset, index) => ({
      id: asset.id || `initial-${index}-${asset.url}`,
      kind: asset.type?.startsWith("video/") ? "video" : asset.type?.startsWith("image/") ? "image" : "file",
      uploadUrl: asset.url,
      previewUrl: asset.url,
      uploadType: asset.type || "application/octet-stream",
      uploadSize: asset.size || 0,
      fileName: asset.fileName,
      uploading: false,
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
    uploading: false,
  }];
}

function buildCroppedBlobPixels(file: File, cropPixels: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = cropPixels.width;
      canvas.height = cropPixels.height;
      const context = canvas.getContext("2d");

      if (!context) {
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
        if (!blob) {
          reject(new Error("Failed to generate cropped asset"));
          return;
        }
        resolve(blob);
      }, "image/jpeg", 0.92);
    };

    image.onerror = () => reject(new Error("Failed to load image for crop"));
    image.src = URL.createObjectURL(file);
  });
}

export function AssetUploader({
  label,
  helperText,
  folder,
  multiple = false,
  initialAssets,
  initialUrl,
  initialType,
  aspectRatio,
  onAspectRatioChange,
  onChange,
  accept,
  disableCrop = false,
}: AssetUploaderProps) {
  const [assets, setAssets] = useState<AssetDraft[]>(() => createInitialAssets(initialAssets, initialUrl, initialType));
  const inputRef = useRef<HTMLInputElement>(null);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if ((!initialUrl || initialUrl.length === 0) && (!initialAssets || initialAssets.length === 0)) return;

    const syncInitialAsset = window.setTimeout(() => {
      setAssets((current) => current.length > 0 ? current : createInitialAssets(initialAssets, initialUrl, initialType));
    }, 0);

    return () => window.clearTimeout(syncInitialAsset);
  }, [initialAssets, initialType, initialUrl]);

  useEffect(() => {
    const normalized = assets
      .filter((asset) => typeof asset.uploadUrl === "string" && asset.uploadUrl.length > 0)
      .map((asset) => ({
        id: asset.id,
        url: asset.uploadUrl as string,
        type: asset.uploadType,
        size: asset.uploadSize,
        fileName: asset.fileName,
      }));

    onChange(normalized);
  }, [assets, onChange]);

  const primaryAsset = useMemo(() => assets[0] || null, [assets]);
  const showCropper = !disableCrop && primaryAsset?.kind === "image" && !primaryAsset.uploadUrl && primaryAsset.previewUrl;

  const handleUploadAsset = useCallback(async (target: AssetDraft, pixelsToCrop?: Area) => {
    if (!target?.file) return;

    setAssets((current) => current.map((item) => item.id === target.id ? { ...item, uploading: true } : item));

    try {
      trackEvent('asset_upload_started', { kind: target.kind });
    } catch (e) { }

    try {
      const originalFile = target.file;
      let uploadBlob: Blob = originalFile;
      let uploadExtension = originalFile.name.split(".").pop() || "bin";
      let uploadType = target.uploadType;

      if (!disableCrop && target.kind === "image" && isCanvasImageType(target.uploadType) && pixelsToCrop) {
        uploadBlob = await buildCroppedBlobPixels(originalFile, pixelsToCrop);
        uploadExtension = "jpg";
        uploadType = "image/jpeg";
      }

      const storageRef = ref(storage, `${folder}/${Date.now()}_${target.id}.${uploadExtension}`);
      const uploadTask = uploadBytesResumable(storageRef, uploadBlob, { contentType: uploadType });

      await new Promise<void>((resolve, reject) => {
        uploadTask.on("state_changed", undefined, reject, () => resolve());
      });

      const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
      try {
        trackEvent('asset_upload_success', { kind: target.kind, format: uploadExtension });
      } catch (e) { }

      setAssets((current) => current.map((item) => item.id === target.id
        ? {
          ...item,
          uploadUrl: downloadUrl,
          uploadType,
          uploadSize: uploadBlob.size,
          uploading: false,
        }
        : item));
    } catch (error) {
      console.error("Asset upload failed", error);
      try {
        trackEvent('asset_upload_failed', { kind: target.kind, error: error instanceof Error ? error.message : "unknown" });
      } catch (e) { }
      setAssets((current) => current.map((item) => item.id === target.id ? { ...item, uploading: false } : item));
    }
  }, [disableCrop, folder]);

  const handleSelectFiles = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const incoming = Array.from(selectedFiles).map((file) => {
      let token = "";
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        token = crypto.randomUUID().split("-")[0];
      } else if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
        const buffer = new Uint8Array(4);
        crypto.getRandomValues(buffer);
        token = Array.from(buffer).map((b) => b.toString(16).padStart(2, "0")).join("");
      } else {
        throw new Error("Secure random number generation is not supported in this environment.");
      }

      return {
      id: `${Date.now()}-${file.name}-${token}`,
      kind: classifyFile(file),
      file,
      previewUrl: file.type.startsWith("image/") || file.type.startsWith("video/") ? URL.createObjectURL(file) : undefined,
      uploadType: file.type || "application/octet-stream",
      uploadSize: file.size,
      fileName: file.name,
      uploading: false,
    } satisfies AssetDraft});

    const newSet = multiple ? [...assets, ...incoming].slice(0, 50) : incoming.slice(0, 1);
    setAssets(newSet);

    // If disableCrop is active, auto-upload immediately
    if (disableCrop) {
      incoming.forEach(asset => handleUploadAsset(asset));
    } else if (incoming[0]?.kind !== "image") {
      // Even if crop is enabled, non-images auto-upload
      handleUploadAsset(incoming[0]);
    }
  }, [assets, disableCrop, handleUploadAsset, multiple]);

  const removeAsset = (assetId: string) => {
    setAssets((current) => current.filter((item) => item.id !== assetId));
  };

  const persistCropAndUpload = () => {
    if (primaryAsset && primaryAsset.cropPixels) {
      handleUploadAsset(primaryAsset, primaryAsset.cropPixels);
    }
  };

  const renderThumbnail = (asset: AssetDraft) => {
    if (asset.kind === "image" && asset.previewUrl) {
      return <NextImage src={asset.previewUrl} alt="Asset preview" fill unoptimized sizes="160px" className="object-cover" />;
    }
    if (asset.kind === "video" && asset.previewUrl) {
      return <video src={asset.previewUrl} className="h-full w-full object-cover" muted playsInline />;
    }
    return (
      <div className="h-full w-full flex items-center justify-center bg-white/5 text-gray-300">
        <FileArchive className="w-5 h-5" />
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-semibold text-gray-200">{label}</label>
        <div className="flex items-center gap-2">
          {assets.length > 0 ? (
            <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              {assets.length} {assets.length === 1 ? "file" : "files"}
            </span>
          ) : null}
          {!disableCrop && (
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/40 p-1">
              {RATIO_OPTIONS.map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => onAspectRatioChange(ratio)}
                  className={cn(
                    "rounded-full px-2 py-1 text-[10px] font-semibold transition-colors",
                    aspectRatio === ratio ? "bg-brand-purple text-white" : "text-gray-400 hover:text-white"
                  )}
                >
                  {ratio}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-3 space-y-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full transition-colors rounded-xl border border-dashed border-white/15 hover:bg-white/5 active:bg-white/10 px-3 py-4 text-left text-sm text-gray-300"
        >
          <span className="inline-flex items-center gap-2"><Upload className="w-5 h-5" /> Select {multiple ? "up to 50 assets" : "an asset"}</span>
          {helperText ? <p className="text-xs text-gray-500 mt-1.5">{helperText}</p> : null}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(event) => handleSelectFiles(event.target.files)}
        />

        {showCropper && primaryAsset?.previewUrl && (
          <div className="space-y-3">
            <div className="relative w-full max-w-md mx-auto aspect-square bg-[#11131a] rounded-xl overflow-hidden border border-white/10">
              <Cropper
                image={primaryAsset.previewUrl}
                crop={crop}
                zoom={zoom}
                aspect={ratioToNumber(aspectRatio)}
                onCropChange={setCrop}
                onCropComplete={(_, croppedAreaPixels) => {
                  setAssets(curr => curr.map((item, i) => i === 0 ? { ...item, cropPixels: croppedAreaPixels } : item));
                }}
                onZoomChange={setZoom}
                objectFit="contain"
                showGrid={true}
              />
            </div>

            <button
              type="button"
              onClick={persistCropAndUpload}
              disabled={primaryAsset.uploading}
              className="w-full rounded-xl border border-brand-purple bg-brand-purple/20 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-purple/30"
            >
              {primaryAsset.uploading ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving Crop...</span> : "Apply Crop & Upload"}
            </button>
          </div>
        )}

        {assets.length > 0 ? (
          <div className={cn("gap-3 pt-2", multiple ? "grid grid-cols-3 sm:grid-cols-4" : "grid grid-cols-1 max-w-[200px]")}>
            {assets.map((asset) => (
              <div key={asset.id} className="space-y-1 relative group">
                <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40 aspect-square shadow-md">
                  {renderThumbnail(asset)}
                  <button
                    type="button"
                    className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={() => removeAsset(asset.id)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-gray-200 inline-flex items-center gap-1 shadow-sm">
                    {asset.kind === "image" ? <ImageIcon className="w-3 h-3" /> : asset.kind === "video" ? <Video className="w-3 h-3" /> : <FileArchive className="w-3 h-3" />}
                    {asset.kind}
                  </div>
                </div>

                {asset.uploading ? (
                  <p className="text-[10px] text-brand-purple flex items-center justify-center gap-1 pt-1 font-bold animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" /> Uploading
                  </p>
                ) : !asset.uploadUrl ? (
                  !showCropper && ( // Non-image or disableCrop should be uploading automatically. If stopped, show pending.
                    <p className="text-[10px] text-brand-purple font-bold text-center pt-1">Pending...</p>
                  )
                ) : (
                  <p className="text-[10px] text-brand-purple font-bold text-center pt-1">Success</p>
                )}
                {asset.fileName ? (
                  <p className="truncate text-center text-[10px] text-gray-500">{asset.fileName}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
