import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import {
    isBoundedJsonBodyError,
    isRequestBodyTooLargeError,
    readBoundedFormDataBody,
} from "@/lib/server/bounded-json-body";
import { ADMIN_STORAGE_UPLOAD } from "@/lib/server/rate-limit";
import { isAllowedLandingAssetKey } from "@/lib/landing-assets";
import { resolveFirebaseStorageMediaLocation } from "@/lib/media-hosts";
import { guardApiRequest } from "@/lib/server/request-guard";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";

const MAX_LANDING_ASSET_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_LANDING_MULTIPART_OVERHEAD_BYTES = 64 * 1024;
const MAX_LANDING_UPLOAD_BODY_BYTES = MAX_LANDING_ASSET_UPLOAD_BYTES + MAX_LANDING_MULTIPART_OVERHEAD_BYTES;
const LANDING_ASSET_STORAGE_PREFIX = "landing/assets/";

function buildLandingUploadTooLargeResponse() {
    return NextResponse.json({
        error: "File exceeds 10MB limit.",
        errorCode: "payload_too_large",
        retryable: false,
    }, { status: 413 });
}

function buildLandingUploadInvalidMultipartResponse(error = "Invalid upload request.") {
    return NextResponse.json({
        error,
        errorCode: "invalid_multipart_body",
        retryable: false,
    }, { status: 400 });
}

function isImageFormat(mimeType: string) {
    return ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mimeType);
}

function resolveOwnedLandingAssetPath(downloadUrl: string, bucketName: string, landingAssetKey: string) {
    const location = resolveFirebaseStorageMediaLocation(downloadUrl);
    const expectedObjectPathPrefix = `${LANDING_ASSET_STORAGE_PREFIX}${landingAssetKey}_`;
    if (
        location?.bucket !== bucketName
        || !location.objectPath.startsWith(expectedObjectPathPrefix)
        || location.objectPath.length <= expectedObjectPathPrefix.length
        || location.objectPath.slice(expectedObjectPathPrefix.length).includes("/")
    ) {
        return null;
    }

    return location.objectPath;
}

async function POST_handler(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "settings/landing/upload",
            rateLimit: ADMIN_STORAGE_UPLOAD,
            requireTrustedOrigin: true,
            auth: "admin",
            maxBodyBytes: MAX_LANDING_UPLOAD_BODY_BYTES,
            requiredContentTypePrefix: "multipart/form-data",
        });

        const formData = await readBoundedFormDataBody(request, {
            maxBytes: MAX_LANDING_UPLOAD_BODY_BYTES,
            routeName: "settings/landing/upload",
        });
        const file = formData.get("file") as File | null;
        const key = formData.get("key") as string | null;

        if (!file || !key) {
            return NextResponse.json({ error: "Missing required fields (file, key)" }, { status: 400 });
        }
        if (!isAllowedLandingAssetKey(key)) {
            return NextResponse.json({ error: "Invalid landing asset key." }, { status: 400 });
        }

        if (!isImageFormat(file.type)) {
            return NextResponse.json({ error: "Invalid file type. Only images (JPG, PNG, GIF, WebP) are allowed." }, { status: 400 });
        }
        if (!adminDb || !adminStorage) {
            return NextResponse.json({ error: "Database or storage not available" }, { status: 500 });
        }

        if (file.size > MAX_LANDING_ASSET_UPLOAD_BYTES) {
            return buildLandingUploadTooLargeResponse();
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const extension = file.type.split('/')[1] || 'jpg';
        const fileName = `landing/assets/${key}_${crypto.randomUUID()}.${extension}`;

        const bucket = adminStorage.bucket();
        const fileRef = bucket.file(fileName);
        const landingSettingsRef = adminDb.collection("settings").doc("landing");

        // Firebase Client SDK automatically mints download tokens, but the Admin SDK does not.
        // We must manually generate a token to make the file publicly readable via the standard URL format.
        const downloadToken = crypto.randomUUID();

        await fileRef.save(buffer, {
            metadata: {
                contentType: file.type,
                cacheControl: 'public, max-age=31536000',
                metadata: {
                    firebaseStorageDownloadTokens: downloadToken
                }
            }
        });

        // Use the standard Firebase Storage public URL format with the minted token
        const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media&token=${downloadToken}`;

        let previousUrl: unknown = null;
        try {
            await adminDb.runTransaction(async (transaction) => {
                const landingSettingsDoc = await transaction.get(landingSettingsRef);
                previousUrl = landingSettingsDoc.exists ? landingSettingsDoc.get(key) : null;
                transaction.set(landingSettingsRef, {
                    [key]: downloadURL,
                }, { merge: true });
            });
        } catch (error) {
            let committedUrl: unknown;
            try {
                const committedDoc = await landingSettingsRef.get();
                committedUrl = committedDoc.exists ? committedDoc.get(key) : null;
            } catch (verificationError) {
                recordRouteWarning("settings/landing/upload", "Could not verify failed landing asset commit before cleanup", verificationError);
                committedUrl = downloadURL;
            }
            if (committedUrl !== downloadURL) {
                await fileRef.delete({ ignoreNotFound: true }).catch((deleteError) => {
                    recordRouteWarning("settings/landing/upload", "Failed to clean up newly uploaded landing asset", deleteError);
                });
            }
            throw error;
        }

        const previousObjectPath = typeof previousUrl === "string"
            ? resolveOwnedLandingAssetPath(previousUrl, bucket.name, key)
            : null;
        if (previousObjectPath && previousObjectPath !== fileName) {
            await bucket.file(previousObjectPath).delete({ ignoreNotFound: true }).catch((error) => {
                recordRouteWarning("settings/landing/upload", "Failed to remove replaced landing asset", error);
            });
        }

        return NextResponse.json({ success: true, url: downloadURL });
    } catch (error: unknown) {
        if (isRequestBodyTooLargeError(error)) {
            return buildLandingUploadTooLargeResponse();
        }
        if (isBoundedJsonBodyError(error)) {
            return buildLandingUploadInvalidMultipartResponse(error.message);
        }
        return handleApiError(error, "Settings.Landing.Upload");
    }
}

export let POST = withRouteRuntimeHealth("settings/landing/upload:POST", POST_handler);
