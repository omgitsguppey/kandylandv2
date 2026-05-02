import { NextRequest, NextResponse } from "next/server";

import { isCreatorRole } from "@/lib/creator-experiences";
import { handleApiError } from "@/lib/server/auth";
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
const ALLOWED_CREATOR_DROP_ASSET_TYPES = new Set([
  "application/zip",
  "application/x-zip-compressed",
]);

function isAllowedCreatorDropAssetType(type: string) {
  return type.startsWith("image/")
    || type.startsWith("video/")
    || ALLOWED_CREATOR_DROP_ASSET_TYPES.has(type);
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
    });
    if (!caller || !adminStorage) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const creatorAllowed = await requireCreator(caller.uid);
    if (!creatorAllowed) {
      return NextResponse.json({ error: "Creator access required" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing upload file" }, { status: 400 });
    }
    if (file.size > MAX_CREATOR_DROP_ASSET_BYTES) {
      return NextResponse.json({ error: "File exceeds upload limit" }, { status: 400 });
    }
    if (!isAllowedCreatorDropAssetType(file.type || "application/octet-stream")) {
      return NextResponse.json({ error: "Unsupported drop asset type" }, { status: 400 });
    }

    const fullPath = `${CREATOR_DROP_ASSET_PREFIX}/${caller.uid}/${Date.now()}_${sanitizeStorageFileName(file.name)}`;
    const storageFile = adminStorage.bucket().file(fullPath);
    await storageFile.save(Buffer.from(await file.arrayBuffer()), {
      resumable: false,
      contentType: file.type || "application/octet-stream",
    });

    const [metadata] = await storageFile.getMetadata();
    const url = await ensureFirebaseDownloadUrl(adminStorage.bucket(), storageFile, metadata);

    return NextResponse.json({
      success: true,
      file: serializeStorageFile(fullPath, metadata, url),
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "Creator.Drops.Assets.POST");
  }
}

export let POST = withRouteRuntimeHealth("creator/drops/assets:POST", POST_handler);
