import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];
const warnings: string[] = [];

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
const uploadQueue = readRequired("src/lib/uploads/asset-upload-queue.ts");
const draftContract = readRequired("src/lib/uploads/asset-upload-draft-contract.ts");
const uploadErrorCopy = readRequired("src/lib/uploads/upload-error-copy.ts");
const telemetryCatalog = readRequired("src/lib/telemetry-catalog.ts");
const storageRules = readRequired("storage.rules");
const contentMediaDoc = readRequired("docs/agent-truth/content-media-pipeline.md");
const cmsWorkflowDoc = readRequired("docs/agent-truth/admin-cms-drop-workflow.md");
const packageJson = readRequired("package.json");

requireIncludes(packageJson, "\"check:batch-upload-stability\"", "package.json");

requireIncludes(draftContract, "type UploadDraftSnapshot", "upload draft contract");
requireIncludes(draftContract, "eligibleToStartAt?: number", "upload draft contract");
requireIncludes(draftContract, "summary:", "upload draft contract");

requireIncludes(assetUploader, "onDraftStateChange?: (snapshot: UploadDraftSnapshot) => void", "AssetUploader");
requireIncludes(assetUploader, "onDraftStateChange(buildUploadDraftSnapshot(uploadSessionIdRef.current, assets))", "AssetUploader");
requireIncludes(assetUploader, "resetKey?: string", "AssetUploader");
requireIncludes(assetUploader, "uploadSessionIdRef", "AssetUploader");
requireIncludes(assetUploader, "eligibleToStartAt?: number", "AssetUploader");
requireIncludes(assetUploader, "markAssetEligibleToStart", "AssetUploader");
requireIncludes(assetUploader, "Queued #", "AssetUploader");
requireIncludes(assetUploader, "batchSummaryLabel", "AssetUploader");
requireIncludes(assetUploader, "Clear failed", "AssetUploader");
requireIncludes(assetUploader, "Retry failed", "AssetUploader");
requireIncludes(assetUploader, "Cancel all", "AssetUploader");
requireIncludes(assetUploader, "asset_batch_selected", "AssetUploader");
requireIncludes(assetUploader, "asset_batch_queue_started", "AssetUploader");
requireIncludes(assetUploader, "asset_batch_progress_updated", "AssetUploader");
requireIncludes(assetUploader, "asset_batch_completed", "AssetUploader");
requireIncludes(assetUploader, "asset_batch_failed", "AssetUploader");
requireIncludes(assetUploader, "asset_batch_retry_failed_clicked", "AssetUploader");
requireAbsent(assetUploader, "Pending...", "AssetUploader");
requireAbsent(assetUploader, "Pending", "AssetUploader");

requireIncludes(createDropModal, "onDraftStateChange={onCoverDraftStateChange}", "CreateDropModal");
requireIncludes(createDropModal, "onDraftStateChange={onContentDraftStateChange}", "CreateDropModal");
requireIncludes(createDropModal, "resetKey={draftSessionId || dropId || undefined}", "CreateDropModal");
requireIncludes(createDropModal, "Uploads are still finishing. Wait for all files to upload before saving this drop.", "CreateDropModal");
requireIncludes(createDropModal, "asset_batch_submit_blocked_uploads_in_progress", "CreateDropModal");
requireIncludes(createDropModal, "disabled={isSubmitting || fetching || uploadsBusy}", "CreateDropModal");

requireIncludes(uploadQueue, "eligibleToStartAt?: number", "asset-upload-queue");
requireIncludes(uploadQueue, "selectQueuedAssetIdsToStart", "asset-upload-queue");
requireIncludes(uploadQueue, "detectStalledUploads", "asset-upload-queue");
requireIncludes(uploadQueue, "queuedCandidates.has(asset.id)", "asset-upload-queue");
requireIncludes(uploadQueue, "eligibleAt > 0 && nowMs - eligibleAt >= queuedStallMs", "asset-upload-queue");
requireAbsent(uploadQueue, "queueQueuedAt >= queuedStallMs", "asset-upload-queue");

requireIncludes(uploadErrorCopy, "Upload permission failed. Refresh your admin session and retry.", "upload-error-copy");

requireIncludes(telemetryCatalog, "asset_batch_selected", "telemetry catalog");
requireIncludes(telemetryCatalog, "asset_batch_queue_started", "telemetry catalog");
requireIncludes(telemetryCatalog, "asset_batch_progress_updated", "telemetry catalog");
requireIncludes(telemetryCatalog, "asset_batch_completed", "telemetry catalog");
requireIncludes(telemetryCatalog, "asset_batch_failed", "telemetry catalog");
requireIncludes(telemetryCatalog, "asset_batch_retry_failed_clicked", "telemetry catalog");
requireIncludes(telemetryCatalog, "asset_batch_submit_blocked_uploads_in_progress", "telemetry catalog");

requireIncludes(storageRules, "allow write: if false", "storage.rules");
requireAbsent(storageRules, "allow write: if isSignedIn()", "storage.rules");
requireAbsent(storageRules, "allow write: if true", "storage.rules");

requireIncludes(contentMediaDoc, "durable draft queue state", "content media doctrine");
requireIncludes(contentMediaDoc, "Queued files waiting behind concurrency are not stalled.", "content media doctrine");
requireIncludes(contentMediaDoc, "`Pending` is not a valid terminal state", "content media doctrine");

requireIncludes(cmsWorkflowDoc, "durable draft queue state", "admin CMS workflow doctrine");
requireIncludes(cmsWorkflowDoc, "Drop save/publish must stay blocked while uploads are still active.", "admin CMS workflow doctrine");

if (warnings.length > 0) {
  console.warn("Batch upload stability validation warnings:");
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

if (failures.length > 0) {
  console.error("Batch upload stability validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Batch upload stability validation passed.");
