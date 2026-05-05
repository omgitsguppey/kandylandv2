import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { buildServerAdminModuleVerification } from "@/lib/server/admin-source-verification";
import {
    ADMIN_CONTENT_ROUTE_EVIDENCE,
    createUnsafeAdminContentMediaFieldReport,
    decodeAdminContentFileId,
    recordUnsafeAdminContentMediaFieldsIfNeeded,
    serializeAdminContentFile,
} from "@/lib/server/admin-content-storage-safety";
import { adminStorage } from "@/lib/server/firebase-admin";
import { MEDIA_PROXY } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
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

function isSafeDropsContentPath(fullPath: string) {
    return fullPath.startsWith(DROPS_CONTENT_PREFIX)
        && fullPath.length > DROPS_CONTENT_PREFIX.length
        && !fullPath.includes("..")
        && !fullPath.endsWith("/");
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
        await guardApiRequest(request, {
            routeName: "admin/content",
            rateLimit: MEDIA_PROXY,
            requireTrustedOrigin: true,
            auth: "admin",
        });

        const formData = await request.formData();
        const file = formData.get("file");
        if (!(file instanceof File)) {
            return NextResponse.json({ error: "Missing upload file" }, { status: 400 });
        }
        if (file.size > MAX_ADMIN_DROP_ASSET_BYTES) {
            return NextResponse.json({ error: "File exceeds upload limit" }, { status: 400 });
        }
        const contentType = file.type || "application/octet-stream";
        if (
            !contentType.startsWith("image/")
            && !contentType.startsWith("video/")
            && !contentType.startsWith("audio/")
            && !ALLOWED_ADMIN_DROP_ASSET_TYPES.has(contentType)
        ) {
            return NextResponse.json({ error: "Unsupported drop asset type" }, { status: 400 });
        }

        const fullPath = `${DROPS_CONTENT_PREFIX}${Date.now()}_${sanitizeStorageFileName(file.name)}`;
        if (!isSafeDropsContentPath(fullPath)) {
            return NextResponse.json({
                ...ADMIN_CONTENT_ROUTE_EVIDENCE,
                error: "Invalid storage reference",
                errorCode: "invalid_storage_reference",
            }, { status: 400 });
        }

        const storageFile = adminStorage.bucket().file(fullPath);
        await storageFile.save(Buffer.from(await file.arrayBuffer()), {
            resumable: false,
            contentType,
        });

        const [metadata] = await storageFile.getMetadata();
        const unsafeMediaFieldReport = createUnsafeAdminContentMediaFieldReport();
        const safeFile = await serializeAdminContentFile(
            storageFile,
            metadata,
            adminStorage.bucket().name,
            unsafeMediaFieldReport,
        );
        recordUnsafeAdminContentMediaFieldsIfNeeded(unsafeMediaFieldReport, "upload");

        return NextResponse.json({
            ...ADMIN_CONTENT_ROUTE_EVIDENCE,
            success: true,
            file: safeFile,
        }, { status: 201 });
    } catch (error) {
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
