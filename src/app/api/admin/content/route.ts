import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { buildServerAdminModuleVerification } from "@/lib/server/admin-source-verification";
import { adminStorage } from "@/lib/server/firebase-admin";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import {
    ensureFirebaseDownloadUrl,
    sanitizeStorageFileName,
    serializeStorageFile,
} from "@/lib/server/storage-assets";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

const DROPS_CONTENT_PREFIX = "drops/";

function isSafeDropsContentPath(fullPath: string) {
    return fullPath.startsWith(DROPS_CONTENT_PREFIX)
        && fullPath.length > DROPS_CONTENT_PREFIX.length
        && !fullPath.includes("..")
        && !fullPath.endsWith("/");
}

async function GET_handler(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/content",
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
        });

        const [files] = await adminStorage.bucket().getFiles({ prefix: DROPS_CONTENT_PREFIX });
        const contentFiles = await Promise.all(files
            .filter((file) => isSafeDropsContentPath(file.name))
            .map(async (file) => {
                const [metadata] = await file.getMetadata();
                const url = await ensureFirebaseDownloadUrl(adminStorage.bucket(), file, metadata);
                return serializeStorageFile(file.name, metadata, url);
            }));

        contentFiles.sort((left, right) => (right.timeCreated || "").localeCompare(left.timeCreated || ""));

        return NextResponse.json({
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
        await guardApiRequest(request, {
            routeName: "admin/content",
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
        });

        const formData = await request.formData();
        const file = formData.get("file");
        if (!(file instanceof File)) {
            return NextResponse.json({ error: "Missing upload file" }, { status: 400 });
        }

        const fullPath = `${DROPS_CONTENT_PREFIX}${Date.now()}_${sanitizeStorageFileName(file.name)}`;
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
        return handleApiError(error, "Admin.Content.POST");
    }
}

async function DELETE_handler(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/content",
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
        });

        const { fullPath } = await request.json() as { fullPath?: string };
        if (typeof fullPath !== "string" || !isSafeDropsContentPath(fullPath)) {
            return NextResponse.json({ error: "Invalid storage path" }, { status: 400 });
        }

        const storageFile = adminStorage.bucket().file(fullPath);
        const [exists] = await storageFile.exists();
        if (!exists) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        await storageFile.delete();
        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "Admin.Content.DELETE");
    }
}

export let GET = withRouteRuntimeHealth("admin/content:GET", GET_handler);
export let POST = withRouteRuntimeHealth("admin/content:POST", POST_handler);
export let DELETE = withRouteRuntimeHealth("admin/content:DELETE", DELETE_handler);
