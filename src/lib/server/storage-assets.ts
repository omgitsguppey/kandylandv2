import "server-only";

import { randomUUID } from "node:crypto";

export type StorageObjectMetadata = {
    contentType?: string;
    size?: string | number;
    timeCreated?: string;
    metadata?: Record<string, string | number | boolean | null> | undefined;
};

export function sanitizeStorageFileName(fileName: string) {
    const normalizedName = fileName.split(/[/\\]/).pop() ?? "upload";
    return normalizedName.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120) || "upload";
}

function getExistingDownloadToken(metadata: StorageObjectMetadata) {
    const rawTokens = metadata.metadata?.firebaseStorageDownloadTokens;
    return typeof rawTokens === "string" ? rawTokens.split(",")[0]?.trim() || null : null;
}

export function buildFirebaseDownloadUrl(bucketName: string, storagePath: string, downloadToken: string) {
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;
}

export async function ensureFirebaseDownloadUrl(
    bucket: { name: string },
    file: {
        name: string;
        setMetadata: (metadata: StorageObjectMetadata) => Promise<unknown>;
    },
    metadata: StorageObjectMetadata,
) {
    const existingToken = getExistingDownloadToken(metadata);
    if (existingToken) {
        return buildFirebaseDownloadUrl(bucket.name, file.name, existingToken);
    }

    const nextToken = randomUUID();
    await file.setMetadata({
        metadata: {
            ...metadata.metadata,
            firebaseStorageDownloadTokens: nextToken,
        },
    });
    return buildFirebaseDownloadUrl(bucket.name, file.name, nextToken);
}

export function serializeStorageFile(fullPath: string, metadata: StorageObjectMetadata, url: string) {
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
