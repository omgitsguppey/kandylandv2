import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { adminStorage } from "@/lib/server/firebase-admin";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";

const DROPS_CONTENT_PREFIX = "drops/";

type StorageObjectMetadata = {
    contentType?: string;
    size?: string | number;
    timeCreated?: string;
    metadata?: Record<string, string | number | boolean | null> | undefined;
};

function sanitizeUploadFileName(fileName: string) {
    const normalizedName = fileName.split(/[/\\]/).pop() ?? "upload";
    return normalizedName.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120) || "upload";
}

function isSafeDropsContentPath(fullPath: string) {
    return fullPath.startsWith(DROPS_CONTENT_PREFIX)
        && fullPath.length > DROPS_CONTENT_PREFIX.length
        && !fullPath.includes("..")
        && !fullPath.endsWith("/");
}

function getExistingDownloadToken(metadata: StorageObjectMetadata) {
    const rawTokens = metadata.metadata?.firebaseStorageDownloadTokens;
    return typeof rawTokens === "string" ? rawTokens.split(",")[0]?.trim() || null : null;
}

function buildFirebaseDownloadUrl(storagePath: string, downloadToken: string) {
    const bucketName = adminStorage.bucket().name;
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;
}

async function ensureFirebaseDownloadUrl(file: { name: string; setMetadata: (metadata: StorageObjectMetadata) => Promise<unknown> }, metadata: StorageObjectMetadata) {
    const existingToken = getExistingDownloadToken(metadata);
    if (existingToken) {
        return buildFirebaseDownloadUrl(file.name, existingToken);
    }

    const nextToken = randomUUID();
    await file.setMetadata({
        metadata: {
            ...metadata.metadata,
            firebaseStorageDownloadTokens: nextToken,
        },
    });
    return buildFirebaseDownloadUrl(file.name, nextToken);
}

function serializeStorageFile(fullPath: string, metadata: StorageObjectMetadata, url: string) {
    return {
        name: fullPath.split("/").pop() ?? fullPath,
        fullPath,
        url,
        size: typeof metadata.size === "number"
            ? metadata.size
            : typeof metadata.size === "string"
                ? Number(metadata.size) || undefined
                : undefined,
        contentType: metadata.contentType,
        timeCreated: metadata.timeCreated,
    };
}

export async function GET(request: NextRequest) {
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
                const url = await ensureFirebaseDownloadUrl(file, metadata);
                return serializeStorageFile(file.name, metadata, url);
            }));

        contentFiles.sort((left, right) => (right.timeCreated || "").localeCompare(left.timeCreated || ""));

        return NextResponse.json({ files: contentFiles }, {
            headers: {
                "Cache-Control": "private, no-store",
            },
        });
    } catch (error) {
        return handleApiError(error, "Admin.Content.GET");
    }
}

export async function POST(request: NextRequest) {
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

        const fullPath = `${DROPS_CONTENT_PREFIX}${Date.now()}_${sanitizeUploadFileName(file.name)}`;
        const storageFile = adminStorage.bucket().file(fullPath);
        await storageFile.save(Buffer.from(await file.arrayBuffer()), {
            resumable: false,
            contentType: file.type || "application/octet-stream",
        });

        const [metadata] = await storageFile.getMetadata();
        const url = await ensureFirebaseDownloadUrl(storageFile, metadata);

        return NextResponse.json({
            success: true,
            file: serializeStorageFile(fullPath, metadata, url),
        }, { status: 201 });
    } catch (error) {
        return handleApiError(error, "Admin.Content.POST");
    }
}

export async function DELETE(request: NextRequest) {
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
