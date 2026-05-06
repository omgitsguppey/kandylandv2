import { NextRequest, NextResponse } from "next/server";

import { AuthError, handleApiError } from "@/lib/server/auth";
import { buildServerAdminModuleVerification } from "@/lib/server/admin-source-verification";
import {
    ADMIN_CONTENT_ROUTE_EVIDENCE,
    createUnsafeAdminContentMediaFieldReport,
    decodeAdminContentFileId,
    recordUnsafeAdminContentMediaFieldsIfNeeded,
    serializeAdminContentFile,
} from "@/lib/server/admin-content-storage-safety";
import { adminStorage } from "@/lib/server/firebase-admin";
import { ADMIN_STORAGE_UPLOAD, MEDIA_PROXY } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { sanitizeStorageFileName } from "@/lib/server/storage-assets";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { buildNotFoundBody } from "@/lib/server/not-found";

const DROPS_CONTENT_PREFIX = "drops/";
const MAX_ADMIN_CONTENT_LIST_FILES = 100;
const MAX_ADMIN_DROP_ASSET_BYTES = 250 * 1024 * 1024;
const ALLOWED_ADMIN_DROP_ASSET_TYPES = new Set([
    "application/pdf",
    "application/zip",
    "application/x-zip-compressed",
]);
const ADMIN_CONTENT_UPLOAD_SOURCE_SURFACE = "admin_storage_content_manager";

type AdminContentUploadErrorCode =
    | "unauthorized"
    | "forbidden"
    | "invalid_file"
    | "file_too_large"
    | "invalid_content_type"
    | "invalid_storage_path"
    | "storage_bucket_unavailable"
    | "upload_failed";

function isSafeDropsContentPath(fullPath: string) {
    return fullPath.startsWith(DROPS_CONTENT_PREFIX)
        && fullPath.length > DROPS_CONTENT_PREFIX.length
        && !fullPath.includes("..")
        && !fullPath.endsWith("/");
}

function buildAdminContentUploadErrorResponse(
    status: number,
    errorCode: AdminContentUploadErrorCode,
    error: string,
) {
    return NextResponse.json({
        ...ADMIN_CONTENT_ROUTE_EVIDENCE,
        error,
        errorCode,
        uploadGuarded: true,
        sourceSurface: ADMIN_CONTENT_UPLOAD_SOURCE_SURFACE,
    }, { status });
}

function hasUnsafeUploadFileName(fileName: string) {
    const normalized = fileName.trim();
    return normalized.length === 0
        || normalized.includes("..")
        || normalized.includes("\0")
        || normalized.includes("://")
        || /^[A-Za-z]+:/u.test(normalized)
        || normalized.startsWith("/")
        || normalized.startsWith("\\");
}

function getAdminStorageBucket() {
    try {
        const bucket = adminStorage?.bucket();
        if (!bucket?.name || !bucket.name.trim()) {
            return null;
        }
        return bucket;
    } catch {
        return null;
    }
}

function normalizeUploadFailureMessage(error: unknown) {
    const rawMessage = error instanceof Error ? error.message : String(error ?? "");
    const normalizedMessage = rawMessage.trim().toLowerCase();
    if (
        normalizedMessage.includes("bucket")
        || normalizedMessage.includes("signblob")
        || normalizedMessage.includes("signing")
        || normalizedMessage.includes("credential")
        || normalizedMessage.includes("default credentials")
        || normalizedMessage.includes("could not load the default credentials")
    ) {
        return "Storage bucket unavailable";
    }
    return "Upload failed";
}

async function GET_handler(request: NextRequest) {
    try {
        // admin-content-guard: admin-only route; storage/media access requires admin auth.
        // media-proxy-guard: admin content storage access is rate-limited and safe-url filtered.
        // safe-url-guard: raw locked storage URLs are not exposed by default.
        // google-cost-guard: admin content storage access is protected by MEDIA_PROXY or equivalent byte/rate policy.
        // storage-egress-guard: route does not expose unbounded raw media bytes.
        // media-byte-guard: default response returns safe metadata or short-lived admin-scoped preview only.
        // entitlement-guard: admin content route uses admin authorization as entitlement proof for review/inventory access.
        // locked-content-guard: default response does not expose locked media bytes or raw content URLs.
        // ownership-entitlement-scope: user media access remains ownership/unlocked-content gated outside this admin route.
        await guardApiRequest(request, {
            routeName: "admin/content",
            rateLimit: MEDIA_PROXY,
            requireTrustedOrigin: true,
            auth: "admin",
        });

        const bucket = adminStorage.bucket();
        const unsafeMediaFieldReport = createUnsafeAdminContentMediaFieldReport();
        const [files] = await bucket.getFiles({
            prefix: DROPS_CONTENT_PREFIX,
            maxResults: MAX_ADMIN_CONTENT_LIST_FILES,
        });
        const contentFiles = await Promise.all(files
            .filter((file) => isSafeDropsContentPath(file.name))
            .map(async (file) => {
                const [metadata] = await file.getMetadata();
                return serializeAdminContentFile(file, metadata, bucket.name, unsafeMediaFieldReport);
            }));
        recordUnsafeAdminContentMediaFieldsIfNeeded(unsafeMediaFieldReport, "list");

        contentFiles.sort((left, right) => (right.timeCreated || "").localeCompare(left.timeCreated || ""));

        return NextResponse.json({
            ...ADMIN_CONTENT_ROUTE_EVIDENCE,
            files: contentFiles,
            verification: buildServerAdminModuleVerification({
                module: "admin_content_manager",
                canonicalSource: "firebase_storage:drops/",
                fallbackSource: null,
                freshnessTimestamp: contentFiles.reduce((latest, file) => {
                    const createdAt = typeof file.timeCreated === "string" ? Date.parse(file.timeCreated) : 0;
                    return Math.max(latest, Number.isFinite(createdAt) ? createdAt : 0);
                }, 0) || Date.now(),
                countComposition: {
                    fileCount: contentFiles.length,
                },
            }),
        }, {
            headers: {
                "Cache-Control": "private, no-store",
            },
        });
    } catch (error) {
        return handleApiError(error, "Admin.Content.GET");
    }
}

async function POST_handler(request: NextRequest) {
    try {
        // admin-content-guard: admin-only route; storage/media access requires admin auth.
        // media-proxy-guard: admin content storage access is rate-limited and safe-url filtered.
        // safe-url-guard: raw locked storage URLs are not exposed by default.
        // google-cost-guard: admin content storage access is protected by MEDIA_PROXY or equivalent byte/rate policy.
        // storage-egress-guard: route does not expose unbounded raw media bytes.
        // media-byte-guard: default response returns safe metadata or short-lived admin-scoped preview only.
        // entitlement-guard: admin content route uses admin authorization as entitlement proof for review/inventory access.
        // locked-content-guard: default response does not expose locked media bytes or raw content URLs.
        // ownership-entitlement-scope: user media access remains ownership/unlocked-content gated outside this admin route.
        const caller = await guardApiRequest(request, {
            routeName: "admin/content/upload",
            rateLimit: ADMIN_STORAGE_UPLOAD,
            requireTrustedOrigin: true,
            auth: "admin",
        });

        const formData = await request.formData();
        const file = formData.get("file");
        if (!(file instanceof File)) {
            return buildAdminContentUploadErrorResponse(400, "invalid_file", "Missing upload file");
        }
        if (file.size > MAX_ADMIN_DROP_ASSET_BYTES) {
            return buildAdminContentUploadErrorResponse(400, "file_too_large", "File exceeds upload limit");
        }
        const contentType = file.type || "application/octet-stream";
        if (
            !contentType.startsWith("image/")
            && !contentType.startsWith("video/")
            && !contentType.startsWith("audio/")
            && !ALLOWED_ADMIN_DROP_ASSET_TYPES.has(contentType)
        ) {
            return buildAdminContentUploadErrorResponse(400, "invalid_content_type", "Unsupported drop asset type");
        }
        if (hasUnsafeUploadFileName(file.name)) {
            return buildAdminContentUploadErrorResponse(400, "invalid_storage_path", "Invalid storage reference");
        }

        const fullPath = `${DROPS_CONTENT_PREFIX}${Date.now()}_${sanitizeStorageFileName(file.name)}`;
        if (!isSafeDropsContentPath(fullPath)) {
            return buildAdminContentUploadErrorResponse(400, "invalid_storage_path", "Invalid storage reference");
        }

        const bucket = getAdminStorageBucket();
        if (!bucket) {
            return buildAdminContentUploadErrorResponse(503, "storage_bucket_unavailable", "Storage bucket unavailable");
        }

        const storageFile = bucket.file(fullPath);
        const createdAtUtc = new Date().toISOString();
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        try {
            await storageFile.save(fileBuffer, {
                resumable: false,
                contentType,
            });
            if (typeof storageFile.setMetadata === "function") {
                await storageFile.setMetadata({
                    contentType,
                    metadata: {
                        uploadedByUid: caller?.uid ?? "admin",
                        originalFilename: sanitizeStorageFileName(file.name),
                        createdAtUtc,
                        sourceSurface: ADMIN_CONTENT_UPLOAD_SOURCE_SURFACE,
                    },
                });
            }
        } catch (error) {
            const message = normalizeUploadFailureMessage(error);
            const code = message === "Storage bucket unavailable" ? "storage_bucket_unavailable" : "upload_failed";
            return buildAdminContentUploadErrorResponse(
                code === "storage_bucket_unavailable" ? 503 : 500,
                code,
                message,
            );
        }

        let safeFile;
        try {
            const [metadata] = await storageFile.getMetadata();
            const unsafeMediaFieldReport = createUnsafeAdminContentMediaFieldReport();
            safeFile = await serializeAdminContentFile(
                storageFile,
                metadata,
                bucket.name,
                unsafeMediaFieldReport,
            );
            recordUnsafeAdminContentMediaFieldsIfNeeded(unsafeMediaFieldReport, "upload");
        } catch (error) {
            const message = normalizeUploadFailureMessage(error);
            const code = message === "Storage bucket unavailable" ? "storage_bucket_unavailable" : "upload_failed";
            return buildAdminContentUploadErrorResponse(
                code === "storage_bucket_unavailable" ? 503 : 500,
                code,
                message,
            );
        }

        return NextResponse.json({
            ...ADMIN_CONTENT_ROUTE_EVIDENCE,
            success: true,
            uploadGuarded: true,
            sourceSurface: ADMIN_CONTENT_UPLOAD_SOURCE_SURFACE,
            file: safeFile,
        }, { status: 201 });
    } catch (error) {
        if (error instanceof AuthError) {
            if (error.status === 401) {
                return buildAdminContentUploadErrorResponse(401, "unauthorized", "Unauthorized");
            }
            if (error.status === 403) {
                return buildAdminContentUploadErrorResponse(403, "forbidden", "Admin access required");
            }
        }
        if (error instanceof Error && /Failed to parse body as FormData/i.test(error.message)) {
            return buildAdminContentUploadErrorResponse(400, "invalid_file", "Invalid upload payload");
        }
        recordRouteWarning("admin/content", "Admin content upload failed", error, {
            channel: "admin",
            actorRole: "admin",
            moduleKey: "admin_content_manager",
            detail: {
                sourceSurface: ADMIN_CONTENT_UPLOAD_SOURCE_SURFACE,
                uploadGuarded: true,
            },
        });
        return handleApiError(error, "Admin.Content.POST");
    }
}

async function DELETE_handler(request: NextRequest) {
    try {
        // admin-content-guard: admin-only route; storage/media access requires admin auth.
        // media-proxy-guard: admin content storage access is rate-limited and safe-url filtered.
        // safe-url-guard: raw locked storage URLs are not exposed by default.
        // google-cost-guard: admin content storage access is protected by MEDIA_PROXY or equivalent byte/rate policy.
        // storage-egress-guard: route does not expose unbounded raw media bytes.
        // media-byte-guard: default response returns safe metadata or short-lived admin-scoped preview only.
        // entitlement-guard: admin content route uses admin authorization as entitlement proof for review/inventory access.
        // locked-content-guard: default response does not expose locked media bytes or raw content URLs.
        // ownership-entitlement-scope: user media access remains ownership/unlocked-content gated outside this admin route.
        await guardApiRequest(request, {
            routeName: "admin/content",
            rateLimit: MEDIA_PROXY,
            requireTrustedOrigin: true,
            auth: "admin",
        });

        const { fileId, fullPath } = await request.json() as { fileId?: string; fullPath?: string };
        const decodedPath = typeof fileId === "string" ? decodeAdminContentFileId(fileId, isSafeDropsContentPath) : null;
        const targetPath = decodedPath ?? fullPath;
        if (typeof targetPath !== "string" || !isSafeDropsContentPath(targetPath)) {
            return NextResponse.json({
                ...ADMIN_CONTENT_ROUTE_EVIDENCE,
                error: "Invalid storage reference",
                errorCode: "invalid_storage_reference",
            }, { status: 400 });
        }

        const storageFile = adminStorage.bucket().file(targetPath);
        const [exists] = await storageFile.exists();
        if (!exists) {
            return NextResponse.json({
                ...ADMIN_CONTENT_ROUTE_EVIDENCE,
                ...buildNotFoundBody("file", "File not found", "file_not_found"),
            }, { status: 404 });
        }

        await storageFile.delete();
        return NextResponse.json({
            ...ADMIN_CONTENT_ROUTE_EVIDENCE,
            success: true,
        });
    } catch (error) {
        return handleApiError(error, "Admin.Content.DELETE");
    }
}

export let GET = withRouteRuntimeHealth("admin/content:GET", GET_handler);
export let POST = withRouteRuntimeHealth("admin/content:POST", POST_handler);
export let DELETE = withRouteRuntimeHealth("admin/content:DELETE", DELETE_handler);
