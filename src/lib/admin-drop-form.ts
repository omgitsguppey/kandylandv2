import * as z from "zod";

import { normalizeDropRecord } from "@/lib/drop-normalizers";
import { resolveDropStatusFromTiming } from "@/lib/drop-status";
import { fromCSTInput, getDefaultCSTDates, toCSTString } from "@/lib/timezone";

const ADMIN_DROP_URL_BASE = "https://kandydrops.invalid";
const ALLOWED_ADMIN_DROP_PROTOCOLS = new Set(["http:", "https:"]);

export interface DropFormAsset {
    id: string;
    url: string;
    type: string;
    size: number;
    fileName?: string;
}

function inferAssetTypeFromUrl(url: string, fallbackType?: string): string {
    const normalizedFallback = fallbackType?.toLowerCase() || "application/octet-stream";

    try {
        const pathname = new URL(url).pathname.toLowerCase();
        if (pathname.match(/\.(mp4|m4v|mov|webm|ogg|ogv)$/)) return "video/mp4";
        if (pathname.match(/\.(jpg|jpeg)$/)) return "image/jpeg";
        if (pathname.match(/\.(png)$/)) return "image/png";
        if (pathname.match(/\.(gif)$/)) return "image/gif";
        if (pathname.match(/\.(webp)$/)) return "image/webp";
    } catch {
        const lowerUrl = url.split("?")[0].toLowerCase();
        if (lowerUrl.match(/\.(mp4|m4v|mov|webm|ogg|ogv)$/)) return "video/mp4";
        if (lowerUrl.match(/\.(jpg|jpeg)$/)) return "image/jpeg";
        if (lowerUrl.match(/\.(png)$/)) return "image/png";
        if (lowerUrl.match(/\.(gif)$/)) return "image/gif";
        if (lowerUrl.match(/\.(webp)$/)) return "image/webp";
    }

    return normalizedFallback;
}

function normalizeActionUrl(url: string | undefined): string | undefined {
    const trimmedUrl = url?.trim();
    if (!trimmedUrl) return undefined;

    const normalizedSchemeCheck = trimmedUrl.replace(/[\u0000-\u001F\u007F\s]+/g, "");
    if (/^(javascript|data|vbscript):/i.test(normalizedSchemeCheck)) {
        return undefined;
    }
    if (normalizedSchemeCheck.startsWith("//") || normalizedSchemeCheck.startsWith("\\")) {
        return undefined;
    }

    try {
        const parsed = new URL(trimmedUrl, ADMIN_DROP_URL_BASE);
        if (!ALLOWED_ADMIN_DROP_PROTOCOLS.has(parsed.protocol)) {
            return undefined;
        }

        if (parsed.origin === ADMIN_DROP_URL_BASE) {
            if (parsed.pathname.startsWith("//") || parsed.pathname.startsWith("/\\") || parsed.pathname.startsWith("\\") || trimmedUrl.startsWith("\\")) {
                return undefined;
            }
            return `${parsed.pathname}${parsed.search}${parsed.hash}`;
        }
        return parsed.toString();
    } catch {
        return undefined;
    }
}

export function isValidAdminDropActionUrl(url: string | undefined): boolean {
    if (!url?.trim()) {
        return false;
    }

    return Boolean(normalizeActionUrl(url));
}

export const dropFormSchema = z.object({
    creatorId: z.string().optional(),
    title: z.string().min(3, "Title is too short"),
    description: z.string().min(10, "Description is too short"),
    imageUrl: z.string().url("Cover image is required"),
    contentUrl: z.string().url().optional().or(z.literal("")),
    contentUrls: z.array(z.string().url()).default([]),
    unlockCost: z.coerce.number().min(0, "Cost cannot be negative"),
    validFrom: z.string(),
    validUntil: z.string().optional().or(z.literal("")),
    autoQueueOnExpire: z.boolean().optional().default(false),
    type: z.enum(["content", "promo", "external"]),
    tags: z.array(z.string()).optional(),
    ctaText: z.string().optional(),
    actionUrl: z.string().optional(),
    accentColor: z.string().optional(),
    fileMetadata: z.object({
        size: z.number(),
        type: z.string(),
        dimensions: z.string().optional(),
    }).nullable().optional(),
    coverFileName: z.string().optional(),
    contentFileNames: z.array(z.string()).optional(),
    requiresActiveSubscription: z.boolean().optional().default(false),
}).superRefine((data, ctx) => {
    if (data.type === "content") {
        if (!Array.isArray(data.contentUrls) || data.contentUrls.length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["contentUrls"],
                message: "At least one content file is required",
            });
        }
        return;
    }

    if (!data.actionUrl?.trim()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["actionUrl"],
            message: "A destination URL or app path is required",
        });
        return;
    }

    if (!isValidAdminDropActionUrl(data.actionUrl)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["actionUrl"],
            message: "Use a relative path or an http/https URL",
        });
    }
});

export type DropFormData = z.infer<typeof dropFormSchema>;

export function createDefaultDropFormValues(creatorIdOverride?: string | null): DropFormData {
    return {
        creatorId: creatorIdOverride || "",
        title: "",
        description: "",
        imageUrl: "",
        contentUrl: "",
        contentUrls: [],
        unlockCost: 100,
        type: "content",
        autoQueueOnExpire: false,
        tags: [],
        accentColor: "#ec4899",
        ctaText: "",
        actionUrl: "",
        fileMetadata: null,
        coverFileName: "",
        contentFileNames: [],
        requiresActiveSubscription: false,
        ...getDefaultCSTDates(),
    };
}

export function buildDropFormValuesFromDrop(
    raw: unknown,
    dropId: string,
    options?: {
        creatorIdOverride?: string | null;
        duplicate?: boolean;
    },
) {
    const duplicate = options?.duplicate === true;
    const drop = normalizeDropRecord(raw, dropId);
    const defaults = createDefaultDropFormValues(options?.creatorIdOverride);
    const existingContentUrls = Array.isArray(drop.contentUrls) && drop.contentUrls.length > 0
        ? drop.contentUrls
        : (drop.contentUrl ? [drop.contentUrl] : []);

    return {
        values: {
            ...defaults,
            creatorId: typeof drop.creatorId === "string" ? drop.creatorId : (options?.creatorIdOverride || ""),
            title: duplicate ? `${drop.title} (Copy)` : drop.title,
            description: drop.description,
            imageUrl: drop.imageUrl,
            contentUrl: existingContentUrls[0] || "",
            contentUrls: existingContentUrls,
            unlockCost: drop.unlockCost,
            validFrom: duplicate ? defaults.validFrom : toCSTString(drop.validFrom),
            validUntil: duplicate ? defaults.validUntil : (typeof drop.validUntil === "number" ? toCSTString(drop.validUntil) : ""),
            autoQueueOnExpire: drop.autoQueueOnExpire === true,
            type: drop.type || "content",
            tags: drop.tags || [],
            ctaText: drop.ctaText || "",
            actionUrl: drop.actionUrl || "",
            accentColor: drop.accentColor || defaults.accentColor,
            fileMetadata: drop.fileMetadata || null,
            coverFileName: typeof drop.coverFileName === "string" ? drop.coverFileName : "",
            contentFileNames: Array.isArray(drop.contentFileNames) ? drop.contentFileNames : [],
            requiresActiveSubscription: drop.requiresActiveSubscription === true,
        } satisfies DropFormData,
        contentAssets: existingContentUrls.map((url, index) => ({
            id: `existing-${index}-${url}`,
            url,
            type: inferAssetTypeFromUrl(url, drop.fileMetadata?.type),
            size: index === 0 ? drop.fileMetadata?.size || 0 : 0,
            fileName: Array.isArray(drop.contentFileNames) ? drop.contentFileNames[index] : undefined,
        })) satisfies DropFormAsset[],
    };
}

type BuildDropRequestPayloadOptions = {
    mode?: "admin" | "creator";
    creatorIdOverride?: string | null;
    isEditMode?: boolean;
    now?: number;
};

export function buildDropRequestPayload(
    data: DropFormData,
    options?: BuildDropRequestPayloadOptions,
) {
    const isEditMode = options?.isEditMode === true;
    const validFrom = fromCSTInput(data.validFrom);
    const validUntil = data.validUntil ? fromCSTInput(data.validUntil) : null;
    const now = options?.now ?? Date.now();
    const status = resolveDropStatusFromTiming({ validFrom, validUntil }, now);
    const normalizedContentUrls = Array.from(new Set((data.contentUrls || []).filter((url) => typeof url === "string" && url.length > 0)));
    const trimmedCreatorId = (options?.mode === "creator"
        ? (options?.creatorIdOverride || data.creatorId)
        : data.creatorId
    )?.trim() || "";
    const trimmedCtaText = data.ctaText?.trim() || "";
    const trimmedActionUrl = data.actionUrl?.trim() || "";
    const trimmedAccentColor = data.accentColor?.trim() || "";

    const dropData: Record<string, unknown> = {
        title: data.title.trim(),
        description: data.description.trim(),
        imageUrl: data.imageUrl,
        contentUrl: normalizedContentUrls[0] || "",
        contentUrls: normalizedContentUrls,
        unlockCost: data.unlockCost,
        validFrom,
        autoQueueOnExpire: data.autoQueueOnExpire === true,
        status,
        type: data.type,
        tags: data.tags || [],
        coverFileName: data.coverFileName || "",
        contentFileNames: data.contentFileNames || [],
        requiresActiveSubscription: data.requiresActiveSubscription === true,
    };

    if (trimmedCreatorId) {
        dropData.creatorId = trimmedCreatorId;
    } else if (isEditMode) {
        dropData.creatorId = null;
    }

    if (validUntil !== null) {
        dropData.validUntil = validUntil;
    } else if (isEditMode) {
        dropData.validUntil = null;
    }

    if (data.fileMetadata) {
        dropData.fileMetadata = data.fileMetadata;
    } else if (isEditMode) {
        dropData.fileMetadata = null;
    }

    if (data.type === "content") {
        if (isEditMode) {
            dropData.ctaText = null;
            dropData.actionUrl = null;
            dropData.accentColor = null;
        }
    } else {
        if (trimmedCtaText) {
            dropData.ctaText = trimmedCtaText;
        } else if (isEditMode) {
            dropData.ctaText = null;
        }

        if (trimmedActionUrl) {
            dropData.actionUrl = trimmedActionUrl;
        } else if (isEditMode) {
            dropData.actionUrl = null;
        }

        if (trimmedAccentColor) {
            dropData.accentColor = trimmedAccentColor;
        } else if (isEditMode) {
            dropData.accentColor = null;
        }
    }

    return {
        dropData,
        validFrom,
        validUntil,
        status,
    };
}
