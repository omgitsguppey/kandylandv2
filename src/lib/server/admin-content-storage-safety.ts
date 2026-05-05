import "server-only";

import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { sanitizeStorageFileName, type StorageObjectMetadata } from "@/lib/server/storage-assets";

const DROPS_CONTENT_PREFIX = "drops/";
const ADMIN_CONTENT_SIGNED_URL_TTL_MS = 5 * 60 * 1000;
export const ADMIN_CONTENT_MEDIA_POLICY = "MEDIA_PROXY";
export const ADMIN_CONTENT_ROUTE_EVIDENCE = {
    adminContentRoute: true,
    storageAccessGuarded: true,
    adminOnly: true,
    entitlementGuarded: true,
    entitlementGuardType: "admin_content_review",
    unlockedContentRoute: false,
    ownershipEntitlementRequiredForUserRoutes: true,
    mediaProxyGuarded: true,
    mediaProxyPolicy: ADMIN_CONTENT_MEDIA_POLICY,
    storageEgressGuarded: true,
    safeUrlHandling: true,
    rawStorageUrlExposed: false,
    rawLockedMediaExposed: false,
    maxPreviewTtlSeconds: ADMIN_CONTENT_SIGNED_URL_TTL_MS / 1000,
    defaultMediaResponse: "short_lived_admin_preview",
} as const;

const UNSAFE_MEDIA_METADATA_PATTERNS = [
    /url/i,
    /token/i,
    /^path$/i,
    /fullpath/i,
    /bucket/i,
    /contenturl/i,
] as const;
const REDIRECT_QUERY_PARAMS = new Set([
    "continue",
    "next",
    "redirect",
    "redirect_uri",
    "return",
    "return_to",
    "url",
]);

type AdminStorageMetadata = StorageObjectMetadata & {
    updated?: string;
};

export type AdminStorageFile = {
    name: string;
    getSignedUrl?: (options: {
        action: "read";
        expires: number;
        version: "v4";
    }) => Promise<[string]>;
};

export type UnsafeMediaFieldReport = {
    strippedFieldNames: Set<string>;
    strippedCount: number;
};

export function createUnsafeAdminContentMediaFieldReport(): UnsafeMediaFieldReport {
    return {
        strippedFieldNames: new Set<string>(),
        strippedCount: 0,
    };
}

function markUnsafeMediaField(report: UnsafeMediaFieldReport, fieldName: string) {
    report.strippedFieldNames.add(fieldName);
    report.strippedCount += 1;
}

function collectUnsafeMediaMetadataFields(metadata: AdminStorageMetadata, report: UnsafeMediaFieldReport) {
    const customMetadata = metadata.metadata ?? {};
    for (const fieldName of Object.keys(customMetadata)) {
        if (UNSAFE_MEDIA_METADATA_PATTERNS.some((pattern) => pattern.test(fieldName))) {
            markUnsafeMediaField(report, fieldName);
        }
    }
}

export function recordUnsafeAdminContentMediaFieldsIfNeeded(
    report: UnsafeMediaFieldReport,
    operation: "list" | "upload",
) {
    if (report.strippedCount === 0) {
        return;
    }

    recordRouteWarning("admin/content", "Unsafe admin content media fields stripped", undefined, {
        channel: "admin",
        actorRole: "admin",
        moduleKey: "admin_content_manager",
        detail: {
            operation,
            strippedCount: report.strippedCount,
            strippedFieldNames: Array.from(report.strippedFieldNames).sort(),
            rawUrlValuesLogged: false,
            safeUrlHandling: true,
            rawStorageUrlExposed: false,
        },
    });
}

function encodeStorageObjectId(fullPath: string) {
    return Buffer.from(fullPath, "utf8").toString("base64url");
}

export function decodeAdminContentFileId(fileId: string, isSafePath: (fullPath: string) => boolean) {
    try {
        const fullPath = Buffer.from(fileId, "base64url").toString("utf8");
        return isSafePath(fullPath) ? fullPath : null;
    } catch {
        return null;
    }
}

function getAllowedAdminStorageHosts(bucketName: string) {
    const hosts = new Set([
        "firebasestorage.googleapis.com",
        "storage.googleapis.com",
    ]);
    const normalizedBucketName = bucketName
        .replace(/^gs:\/\//iu, "")
        .trim()
        .toLowerCase();
    if (normalizedBucketName) {
        hosts.add(`${normalizedBucketName}.storage.googleapis.com`);
    }
    return hosts;
}

function isSafeAdminStorageUrl(value: string, bucketName: string) {
    try {
        if (value.trim() !== value) {
            return false;
        }
        const url = new URL(value);
        if (url.protocol !== "https:" || url.username || url.password) {
            return false;
        }
        if (!getAllowedAdminStorageHosts(bucketName).has(url.hostname.toLowerCase())) {
            return false;
        }
        if (url.hostname.toLowerCase() === "firebasestorage.googleapis.com" && url.searchParams.has("token")) {
            return false;
        }
        for (const queryKey of url.searchParams.keys()) {
            if (REDIRECT_QUERY_PARAMS.has(queryKey.toLowerCase())) {
                return false;
            }
        }
        return true;
    } catch {
        return false;
    }
}

async function buildShortLivedAdminPreviewUrl(
    file: AdminStorageFile,
    bucketName: string,
    report: UnsafeMediaFieldReport,
) {
    if (typeof file.getSignedUrl !== "function") {
        return null;
    }

    const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + ADMIN_CONTENT_SIGNED_URL_TTL_MS,
        version: "v4",
    });

    if (!isSafeAdminStorageUrl(signedUrl, bucketName)) {
        markUnsafeMediaField(report, "signedUrl");
        return null;
    }

    return signedUrl;
}

export async function serializeAdminContentFile(
    file: AdminStorageFile,
    metadata: AdminStorageMetadata,
    bucketName: string,
    report: UnsafeMediaFieldReport,
) {
    collectUnsafeMediaMetadataFields(metadata, report);
    const name = sanitizeStorageFileName(file.name.split("/").pop() ?? file.name);
    const safePreviewUrl = await buildShortLivedAdminPreviewUrl(file, bucketName, report);
    const size = typeof metadata.size === "number"
        ? metadata.size
        : typeof metadata.size === "string"
            ? Number(metadata.size) || undefined
            : undefined;

    return {
        id: encodeStorageObjectId(file.name),
        name,
        displayPath: `${DROPS_CONTENT_PREFIX}[asset]/${name}`,
        url: safePreviewUrl,
        safePreview: {
            available: Boolean(safePreviewUrl),
            url: safePreviewUrl,
            expiresInMs: safePreviewUrl ? ADMIN_CONTENT_SIGNED_URL_TTL_MS : 0,
        },
        type: metadata.contentType?.split("/")[0] || "unknown",
        status: "admin_scoped",
        contentType: metadata.contentType,
        size,
        timeCreated: metadata.timeCreated,
        updated: metadata.updated,
        ...ADMIN_CONTENT_ROUTE_EVIDENCE,
    };
}
