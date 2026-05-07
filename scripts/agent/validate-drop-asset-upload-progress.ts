import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

function requireAbsent(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) {
    failures.push(`${label} must not include "${forbidden}".`);
  }
}

const assetUploader = readRequired("src/components/Admin/AssetUploader.tsx");
const createDropModal = readRequired("src/components/Admin/CreateDropModal.tsx");
const storageRules = readRequired("storage.rules");
const telemetryCatalog = readRequired("src/lib/telemetry-catalog.ts");
const queueHelper = readRequired("src/lib/uploads/asset-upload-queue.ts");
const errorCopy = readRequired("src/lib/uploads/upload-error-copy.ts");
const packageJson = readRequired("package.json");

requireIncludes(packageJson, "\"check:drop-asset-upload-progress\"", "package.json");

requireIncludes(assetUploader, "uploadStatus: UploadStatus", "AssetUploader");
requireIncludes(assetUploader, "uploadProgress: number", "AssetUploader");
requireIncludes(assetUploader, "uploadErrorCode?: string", "AssetUploader");
requireIncludes(assetUploader, "data-upload-mobile-density=\"compact-v2\"", "AssetUploader");
requireIncludes(assetUploader, "data-upload-sprawl-reduction=\"target-50\"", "AssetUploader");
requireIncludes(assetUploader, "data-upload-status={asset.uploadStatus}", "AssetUploader");
requireIncludes(assetUploader, "data-upload-progress-mode={asset.uploadProgressMode}", "AssetUploader");
requireIncludes(assetUploader, "data-upload-error-code={asset.uploadErrorCode || \"\"}", "AssetUploader");
requireIncludes(assetUploader, "snapshot.bytesTransferred", "AssetUploader");
requireIncludes(assetUploader, "state_changed", "AssetUploader");
requireIncludes(assetUploader, "Uploading ${asset.uploadProgress}%", "AssetUploader");
requireIncludes(assetUploader, "trackEvent(\"asset_upload_progress_checkpoint\"", "AssetUploader");
requireIncludes(assetUploader, "filter(isUploadedAssetSuccess)", "AssetUploader");
requireIncludes(assetUploader, "Retry", "AssetUploader");
requireIncludes(assetUploader, "isDirectFirebaseUploadBlocked", "AssetUploader");
requireAbsent(assetUploader, "uploading: boolean", "AssetUploader");
requireAbsent(assetUploader, "Pending...", "AssetUploader");

requireIncludes(createDropModal, "onUploadStateChange={onCoverUploadStateChange}", "CreateDropModal");
requireIncludes(createDropModal, "onUploadStateChange={onContentUploadStateChange}", "CreateDropModal");
requireIncludes(createDropModal, "serverUploadEndpoint={mode === \"creator\" ? \"/api/creator/drops/assets\" : \"/api/admin/content\"}", "CreateDropModal");

requireIncludes(storageRules, "match /drops/{allPaths=**}", "storage.rules");
requireIncludes(storageRules, "allow write: if false", "storage.rules");
requireAbsent(storageRules, "allow write: if isSignedIn()", "storage.rules");

requireIncludes(queueHelper, "UPLOAD_PROGRESS_CHECKPOINTS = [25, 50, 75, 100]", "asset-upload-queue helper");
requireIncludes(queueHelper, "DEFAULT_UPLOAD_CONCURRENCY = 2", "asset-upload-queue helper");
requireIncludes(queueHelper, "DEFAULT_VIDEO_UPLOAD_CONCURRENCY = 1", "asset-upload-queue helper");
requireIncludes(queueHelper, "upload_queue_stalled", "asset-upload-queue helper");
requireIncludes(queueHelper, "upload_stalled", "asset-upload-queue helper");

requireIncludes(errorCopy, "upload_permission_denied", "upload-error-copy");
requireIncludes(errorCopy, "server_unauthorized", "upload-error-copy");
requireIncludes(errorCopy, "Upload stalled. Check connection and retry.", "upload-error-copy");

requireIncludes(telemetryCatalog, "asset_upload_queued", "telemetry catalog");
requireIncludes(telemetryCatalog, "asset_upload_progress_checkpoint", "telemetry catalog");
requireIncludes(telemetryCatalog, "asset_upload_retry_clicked", "telemetry catalog");
requireIncludes(telemetryCatalog, "asset_upload_canceled", "telemetry catalog");

if (failures.length > 0) {
  console.error("Drop asset upload progress validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Drop asset upload progress validation passed.");
