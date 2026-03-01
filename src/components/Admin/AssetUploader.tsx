"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Upload, Loader2, FileArchive, Video, Image as ImageIcon } from "lucide-react";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "@/lib/firebase-data";
import { cn } from "@/lib/utils";

export type UploadAspectRatio = "1:1" | "16:9" | "9:16";

type UploadKind = "image" | "video" | "file";

interface UploadedAsset {
  id: string;
  url: string;
  type: string;
  size: number;
}

interface AssetDraft {
  id: string;
  kind: UploadKind;
  file?: File;
  previewUrl?: string;
  uploadUrl?: string;
  uploadType: string;
  uploadSize: number;
  panX: number;
  panY: number;
  uploading: boolean;
}

interface AssetUploaderProps {
  label: string;
  helperText?: string;
  folder: string;
  multiple?: boolean;
  initialUrl?: string;
  initialType?: string;
  aspectRatio: UploadAspectRatio;
  onAspectRatioChange: (ratio: UploadAspectRatio) => void;
  onChange: (assets: UploadedAsset[]) => void;
  accept: string;
}

const RATIO_OPTIONS: UploadAspectRatio[] = ["1:1", "16:9", "9:16"];

function ratioToNumber(ratio: UploadAspectRatio): number {
  if (ratio === "16:9") return 16 / 9;
  if (ratio === "9:16") return 9 / 16;
  return 1;
}

function classifyFile(file: File): UploadKind {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  return "file";
}

function isCanvasImageType(type: string): boolean {
  return /image\/(jpeg|jpg|png|webp|gif)/i.test(type);
}

function buildCroppedBlob(file: File, ratio: UploadAspectRatio, panX: number, panY: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      const imageRatio = image.naturalWidth / image.naturalHeight;
      const targetRatio = ratioToNumber(ratio);

      let cropWidth = image.naturalWidth;
      let cropHeight = image.naturalHeight;

      if (imageRatio > targetRatio) {
        cropWidth = image.naturalHeight * targetRatio;
      } else {
        cropHeight = image.naturalWidth / targetRatio;
      }

      const offsetXRange = image.naturalWidth - cropWidth;
      const offsetYRange = image.naturalHeight - cropHeight;

      const normalizedPanX = Math.max(-1, Math.min(1, panX / 100));
      const normalizedPanY = Math.max(-1, Math.min(1, panY / 100));

      const sourceX = offsetXRange > 0 ? (offsetXRange / 2) * (normalizedPanX + 1) : 0;
      const sourceY = offsetYRange > 0 ? (offsetYRange / 2) * (normalizedPanY + 1) : 0;

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(cropWidth));
      canvas.height = Math.max(1, Math.floor(cropHeight));
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Canvas context unavailable"));
        return;
      }

      context.drawImage(
        image,
        sourceX,
        sourceY,
        cropWidth,
        cropHeight,
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
  initialUrl,
  initialType,
  aspectRatio,
  onAspectRatioChange,
  onChange,
  accept,
}: AssetUploaderProps) {
  const [assets, setAssets] = useState<AssetDraft[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!initialUrl) {
      return;
    }

    setAssets((current) => {
      if (current.length > 0) {
        return current;
      }

      return [{
        id: `initial-${initialUrl}`,
        kind: initialType?.startsWith("video/") ? "video" : initialType?.startsWith("image/") ? "image" : "file",
        uploadUrl: initialUrl,
        previewUrl: initialUrl,
        uploadType: initialType || "application/octet-stream",
        uploadSize: 0,
        panX: 0,
        panY: 0,
        uploading: false,
      }];
    });
  }, [initialType, initialUrl]);

  useEffect(() => {
    const normalized = assets
      .filter((asset) => typeof asset.uploadUrl === "string" && asset.uploadUrl.length > 0)
      .map((asset) => ({
        id: asset.id,
        url: asset.uploadUrl as string,
        type: asset.uploadType,
        size: asset.uploadSize,
      }));

    onChange(normalized);
  }, [assets, onChange]);

  const primaryAsset = useMemo(() => assets[0] || null, [assets]);

  const handleSelectFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles) {
      return;
    }

    const incoming = Array.from(selectedFiles).map((file) => ({
      id: `${Date.now()}-${file.name}-${Math.random().toString(16).slice(2)}`,
      kind: classifyFile(file),
      file,
      previewUrl: file.type.startsWith("image/") || file.type.startsWith("video/") ? URL.createObjectURL(file) : undefined,
      uploadType: file.type || "application/octet-stream",
      uploadSize: file.size,
      panX: 0,
      panY: 0,
      uploading: false,
    } satisfies AssetDraft));

    setAssets((current) => (multiple ? [...current, ...incoming] : incoming.slice(0, 1)));
  };

  const handleUploadAsset = async (assetId: string) => {
    const target = assets.find((item) => item.id === assetId);
    if (!target?.file) {
      return;
    }

    setAssets((current) => current.map((item) => item.id === assetId ? { ...item, uploading: true } : item));

    try {
      const originalFile = target.file;
      let uploadBlob: Blob = originalFile;
      let uploadExtension = originalFile.name.split(".").pop() || "bin";
      let uploadType = target.uploadType;

      if (target.kind === "image" && isCanvasImageType(target.uploadType)) {
        uploadBlob = await buildCroppedBlob(originalFile, aspectRatio, target.panX, target.panY);
        uploadExtension = "jpg";
        uploadType = "image/jpeg";
      }

      const storageRef = ref(storage, `${folder}/${Date.now()}_${target.id}.${uploadExtension}`);
      const uploadTask = uploadBytesResumable(storageRef, uploadBlob, { contentType: uploadType });

      await new Promise<void>((resolve, reject) => {
        uploadTask.on("state_changed", undefined, reject, () => resolve());
      });

      const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
      setAssets((current) => current.map((item) => item.id === assetId
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
      setAssets((current) => current.map((item) => item.id === assetId ? { ...item, uploading: false } : item));
      alert("Asset upload failed. Please try again.");
    }
  };

  const removeAsset = (assetId: string) => {
    setAssets((current) => current.filter((item) => item.id !== assetId));
  };

  const renderThumbnail = (asset: AssetDraft) => {
    if (asset.kind === "image" && asset.previewUrl) {
      return <img src={asset.previewUrl} alt="Asset preview" className="h-full w-full object-cover" />;
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
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/40 p-1">
          {RATIO_OPTIONS.map((ratio) => (
            <button
              key={ratio}
              type="button"
              onClick={() => onAspectRatioChange(ratio)}
              className={cn(
                "rounded-full px-2 py-1 text-[10px] font-semibold",
                aspectRatio === ratio ? "bg-brand-pink text-white" : "text-gray-400"
              )}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-3 space-y-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-xl border border-dashed border-white/15 px-3 py-3 text-left text-sm text-gray-300"
        >
          <span className="inline-flex items-center gap-2"><Upload className="w-4 h-4" /> Upload {multiple ? "assets" : "asset"}</span>
          {helperText ? <p className="text-xs text-gray-500 mt-1">{helperText}</p> : null}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(event) => handleSelectFiles(event.target.files)}
        />

        {primaryAsset && primaryAsset.kind === "image" && (
          <div className="space-y-2">
            <div className="mx-auto w-full max-w-sm rounded-xl border border-white/10 bg-[#11131a] p-1" style={{ aspectRatio: aspectRatio.replace(":", " / ") }}>
              <div className="relative h-full w-full overflow-hidden rounded-lg">
                {primaryAsset.previewUrl ? (
                  <img
                    src={primaryAsset.previewUrl}
                    alt="Primary preview"
                    className="h-full w-full object-cover"
                    style={{ transform: `translate(${primaryAsset.panX}%, ${primaryAsset.panY}%) scale(1.1)` }}
                  />
                ) : null}
                <div className="pointer-events-none absolute inset-0 border border-dashed border-white/40" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-gray-500">Horizontal</label>
              <input
                type="range"
                min={-100}
                max={100}
                value={primaryAsset.panX}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setAssets((current) => current.map((item, index) => index === 0 ? { ...item, panX: next } : item));
                }}
              />
              <label className="text-[11px] text-gray-500">Vertical</label>
              <input
                type="range"
                min={-100}
                max={100}
                value={primaryAsset.panY}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setAssets((current) => current.map((item, index) => index === 0 ? { ...item, panY: next } : item));
                }}
              />
            </div>
          </div>
        )}

        {assets.length > 0 ? (
          <div className={cn("gap-2", multiple ? "grid grid-cols-3" : "grid grid-cols-1") }>
            {assets.map((asset) => (
              <div key={asset.id} className="space-y-1">
                <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black/40 aspect-square">
                  {renderThumbnail(asset)}
                  <button
                    type="button"
                    className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white"
                    onClick={() => removeAsset(asset.id)}
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-gray-200 inline-flex items-center gap-1">
                    {asset.kind === "image" ? <ImageIcon className="w-3 h-3" /> : asset.kind === "video" ? <Video className="w-3 h-3" /> : <FileArchive className="w-3 h-3" />}
                    {asset.kind}
                  </div>
                </div>
                {!asset.uploadUrl ? (
                  <button
                    type="button"
                    onClick={() => handleUploadAsset(asset.id)}
                    className="w-full rounded-md border border-white/15 bg-white/5 py-1 text-[11px] text-gray-200"
                    disabled={asset.uploading}
                  >
                    {asset.uploading ? <span className="inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Uploading</span> : "Upload"}
                  </button>
                ) : (
                  <p className="text-[10px] text-green-400">Uploaded</p>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
