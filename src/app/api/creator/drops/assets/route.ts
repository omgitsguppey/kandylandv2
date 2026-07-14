import { NextRequest, NextResponse } from "next/server";

import { isCreatorRole } from "@/lib/creator-experiences";
import { buildMediaAccessTelemetry, resolveMediaAccess } from "@/lib/media/media-access-resolver";
import { fingerprintStoragePath } from "@/lib/media/media-upload-contract";
import { handleApiError } from "@/lib/server/auth";
import {
  isBoundedJsonBodyError,
  isRequestBodyTooLargeError,
  readBoundedFormDataBody,
} from "@/lib/server/bounded-json-body";
import { adminDb, adminStorage } from "@/lib/server/firebase-admin";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import {
  ensureFirebaseDownloadUrl,
  sanitizeStorageFileName,
  serializeStorageFile,
} from "@/lib/server/storage-assets";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

const CREATOR_DROP_ASSET_PREFIX = "drops/creator-submissions";
const MAX_CREATOR_DROP_ASSET_BYTES = 250 * 1024 * 1024;
const CREATOR_DROP_ASSET_BODY_LIMIT_BYTES = MAX_CREATOR_DROP_ASSET_BYTES + (64 * 1024);
const ALLOWED_CREATOR_DROP_ASSET_TYPES = new Set([
  "application/zip",
  "application/x-zip-compressed",
]);

function isAllowedCreatorDropAssetType(type: string) {
  return type.startsWith("image/")
    || type.startsWith("video/")
    || ALLOWED_CREATOR_DROP_ASSET_TYPES.has(type);
}

function buildUploadErrorResponse(status: 400 | 413, errorCode: string, error: string) {
  return NextResponse.json({
    success: false,
    error,
    errorCode,
    code: status === 413 ? "payload_too_large" : "invalid_creator_request",
    retryable: false,
  }, { status });
}

async function requireCreator(uid: string) {
  if (!adminDb) {
    throw new Error("Database not available");
  }

  const userSnap = await adminDb.collection("users").doc(uid).get();
  if (!userSnap.exists) {
    return false;
  }

  const userData = userSnap.data() as Record<string, unknown>;
  const creatorRestrictions = userData.creatorRestrictions && typeof userData.creatorRestrictions === "object"
    ? userData.creatorRestrictions as Record<string, unknown>
    : {};

  return isCreatorRole(userData.role) && creatorRestrictions.dropSubmissionsRestricted !== true;
}

async function POST_handler(request: NextRequest) {
  try {
    const caller = await guardApiRequest(request, {
      routeName: "creator/drops/assets",
      rateLimit: STANDARD,
      requireTrustedOrigin: true,
      auth: "user",
      scopeToCaller: true,
      maxBodyBytes: CREATOR_DROP_ASSET_BODY_LIMIT_BYTES,
    });
    if (!caller || !adminStorage) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const creatorAllowed = await requireCreator(caller.uid);
    if (!creatorAllowed) {
      return NextResponse.json({ error: "Creator access required" }, { status: 403 });
    }

    const formData = await readBoundedFormDataBody(request, {
      maxBytes: CREATOR_DROP_ASSET_BODY_LIMIT_BYTES,
      routeName: "creator/drops/assets",
    });
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return buildUploadErrorResponse(400, "missing_upload_file", "Missing upload file");
    }
    if (file.size > MAX_CREATOR_DROP_ASSET_BYTES) {
      return buildUploadErrorResponse(413, "payload_too_large", "File exceeds upload limit");
    }
    if (!isAllowedCreatorDropAssetType(file.type || "application/octet-stream")) {
      return buildUploadErrorResponse(400, "unsupported_asset_type", "Unsupported drop asset type");
    }

    const fullPath = `${CREATOR_DROP_ASSET_PREFIX}/${caller.uid}/${Date.now()}_${sanitizeStorageFileName(file.name)}`;
    const storageFile = adminStorage.bucket().file(fullPath);
    await storageFile.save(Buffer.from(await file.arrayBuffer()), {
      resumable: false,
      contentType: file.type || "application/octet-stream",
    });

    const [metadata] = await storageFile.getMetadata();
    const url = await ensureFirebaseDownloadUrl(adminStorage.bucket(), storageFile, metadata);
    const mediaAccessDecision = resolveMediaAccess({
      surface: "creator_upload",
      mediaId: fullPath.split("/").pop() ?? "creator_drop_asset",
      assetId: sanitizeStorageFileName(file.name),
      viewerUserId: caller.uid,
      ownerUserId: caller.uid,
      creatorId: caller.uid,
      exists: true,
      storagePath: fullPath,
      assetUrl: url,
      route: "/api/creator/drops/assets",
      sourceTruth: "creator_ownership",
    });
    const mediaAccess = buildMediaAccessTelemetry(mediaAccessDecision);

    return NextResponse.json({
      success: true,
      file: {
        ...serializeStorageFile(fullPath, metadata, url),
        storagePathFingerprint: fingerprintStoragePath(fullPath),
        assetUrlPolicy: "private_url_not_logged",
        mediaAccess,
      },
    }, { status: 201 });
  } catch (error) {
    if (isRequestBodyTooLargeError(error)) {
      return buildUploadErrorResponse(413, "payload_too_large", "File exceeds upload limit");
    }
    if (isBoundedJsonBodyError(error)) {
      return buildUploadErrorResponse(400, "invalid_multipart_body", "Invalid upload request");
    }
    return handleApiError(error, "Creator.Drops.Assets.POST");
  }
}

export let POST = withRouteRuntimeHealth("creator/drops/assets:POST", POST_handler);
