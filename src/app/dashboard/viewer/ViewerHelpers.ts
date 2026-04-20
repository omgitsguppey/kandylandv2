import { Drop } from "@/types/db";
import { authFetch } from "@/lib/authFetch";

export type ContentKind = "video" | "audio" | "image" | "pdf" | "unknown";

export interface ResolvedContent {
    kind: ContentKind;
    mimeType: string;
}

export interface ThumbnailItem {
    src: string | null;
    kind: ContentKind;
}

export interface CachedAssetRecord {
    objectUrl: string;
    resolvedContent: ResolvedContent;
}

export const MIME_TYPE_WITHOUT_PARAMETERS = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/;
export const GENERIC_BINARY_MIME_TYPES = new Set([
    "application/octet-stream",
    "binary/octet-stream",
    "application/x-download",
    "application/force-download",
]);

export function normalizeMimeType(input: string | undefined): string {
    if (!input) return "";

    const value = input.trim().toLowerCase();
    if (!value) return "";

    const [typeWithoutParameters] = value.split(";");
    const normalized = typeWithoutParameters.trim();

    if (!MIME_TYPE_WITHOUT_PARAMETERS.test(normalized)) {
        return "";
    }

    return normalized;
}

export function resolveContentKind(mimeType: string): ContentKind {
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType === "application/pdf") return "pdf";
    return "unknown";
}

export function isMediaContent(kind: ContentKind) {
    return kind === "video" || kind === "audio";
}

export function resolveContent(blobType: string, metadataType?: string): ResolvedContent {
    const normalizedBlobType = normalizeMimeType(blobType);
    const normalizedMetadataType = normalizeMimeType(metadataType);

    const blobKind = resolveContentKind(normalizedBlobType);
    const metadataKind = resolveContentKind(normalizedMetadataType);

    const blobTypeIsSpecific = normalizedBlobType !== "" && !GENERIC_BINARY_MIME_TYPES.has(normalizedBlobType);

    // Blob MIME comes from the fetched payload and should be the primary source when specific.
    if (blobTypeIsSpecific && blobKind !== "unknown") {
        return {
            kind: blobKind,
            mimeType: normalizedBlobType,
        };
    }

    // Storage providers sometimes respond with generic binary MIME values.
    // In that case we intentionally fall back to trusted metadata collected at upload time.
    if (metadataKind !== "unknown") {
        return {
            kind: metadataKind,
            mimeType: normalizedMetadataType,
        };
    }

    if (blobTypeIsSpecific) {
        return {
            kind: blobKind,
            mimeType: normalizedBlobType,
        };
    }

    return {
        kind: "unknown",
        mimeType: "",
    };
}

export function createVideoThumbnail(videoUrl: string): Promise<string | null> {
    return new Promise((resolve) => {
        const video = document.createElement("video");
        let settled = false;

        const finish = (value: string | null) => {
            if (settled) {
                return;
            }

            settled = true;
            window.clearTimeout(timeoutId);
            video.pause();
            video.removeAttribute("src");
            video.load();
            resolve(value);
        };

        const drawFrame = () => {
            if (!video.videoWidth || !video.videoHeight) {
                finish(null);
                return;
            }

            const canvas = document.createElement("canvas");
            const maxEdge = 320;

            if (video.videoWidth >= video.videoHeight) {
                canvas.width = maxEdge;
                canvas.height = Math.max(1, Math.round(maxEdge * (video.videoHeight / video.videoWidth)));
            } else {
                canvas.height = maxEdge;
                canvas.width = Math.max(1, Math.round(maxEdge * (video.videoWidth / video.videoHeight)));
            }

            const context = canvas.getContext("2d");
            if (!context) {
                finish(null);
                return;
            }

            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            finish(canvas.toDataURL("image/jpeg", 0.82));
        };

        const timeoutId = window.setTimeout(() => finish(null), 12000);

        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = "anonymous";
        video.addEventListener("error", () => finish(null), { once: true });
        video.addEventListener("seeked", drawFrame, { once: true });
        video.addEventListener("loadeddata", () => {
            const targetTime = Number.isFinite(video.duration) && video.duration > 0.1 ? 0.1 : 0;

            if (targetTime <= 0) {
                drawFrame();
                return;
            }

            try {
                video.currentTime = targetTime;
            } catch {
                drawFrame();
            }
        }, { once: true });

        video.src = videoUrl;
        video.load();
    });
}

export function revokeObjectUrl(url: string | null | undefined) {
    if (url?.startsWith("blob:")) {
        URL.revokeObjectURL(url);
    }
}

export async function fetchSecureContent(dropId: string, index: number, signal?: AbortSignal): Promise<Response> {
    return authFetch(`/api/drops/content?id=${encodeURIComponent(dropId)}&index=${index}`, {
        cache: "no-store",
        signal,
    });
}

export async function fetchAssetRecord(drop: Drop, index: number, signal?: AbortSignal): Promise<CachedAssetRecord> {
    const response = await fetchSecureContent(drop.id, index, signal);
    if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(typeof result?.error === "string" ? result.error : "Failed to load content securely");
    }

    const blob = await response.blob();
    let guessedMimeType = normalizeMimeType(response.headers.get("content-type") || blob.type);

    if (!guessedMimeType) {
        guessedMimeType = drop.fileMetadata?.type || "";
    }

    if (!guessedMimeType) {
        guessedMimeType = "video/mp4";
    }

    return {
        objectUrl: URL.createObjectURL(blob),
        resolvedContent: resolveContent(guessedMimeType, drop.fileMetadata?.type),
    };
}

export function clearCachedAssets(cache: Map<number, CachedAssetRecord>) {
    cache.forEach((record) => revokeObjectUrl(record.objectUrl));
    cache.clear();
}

export function getThumbnailFallback(drop: Drop): ThumbnailItem {
    const fallbackResolved = resolveContent(drop.fileMetadata?.type || "", drop.fileMetadata?.type);

    return {
        src: drop.imageUrl,
        kind: fallbackResolved.kind === "unknown" ? "image" : fallbackResolved.kind,
    };
}

export function buildThumbnailItemsWithUpdate(
    previous: ThumbnailItem[],
    assetCount: number,
    fallbackItem: ThumbnailItem,
    index: number,
    nextItem: ThumbnailItem
): ThumbnailItem[] {
    const nextItems = Array.from({ length: assetCount }, (_, itemIndex) => previous[itemIndex] ?? fallbackItem);
    nextItems[index] = nextItem;
    return nextItems;
}

export function buildThumbnailFetchOrder(assetCount: number, activeIndex: number): number[] {
    const order: number[] = [];

    if (assetCount <= 0) {
        return order;
    }

    order.push(activeIndex);

    for (let offset = 1; order.length < assetCount; offset += 1) {
        const nextIndex = activeIndex + offset;
        const previousIndex = activeIndex - offset;

        if (nextIndex < assetCount) {
            order.push(nextIndex);
        }

        if (previousIndex >= 0) {
            order.push(previousIndex);
        }
    }

    return order;
}

export function sumNumbers(values: Iterable<number>): number {
    let total = 0;

    if (Array.isArray(values)) {
        for (let i = 0, len = values.length; i < len; i++) {
            total += values[i];
        }
    } else {
        for (const value of values) {
            total += value;
        }
    }

    return total;
}

export function roundSeconds(value: number) {
    if (!Number.isFinite(value) || value <= 0) {
        return 0;
    }

    return Number(value.toFixed(2));
}

export const WATCH_CHECKPOINT_SECONDS = [15, 45, 90, 180, 300] as const;

export function buildWatchTelemetryMetrics(watchSeconds: number, assetDurationSeconds?: number): Record<string, number> {
    const normalizedWatchSeconds = Math.max(1, Math.round(watchSeconds));
    if (!Number.isFinite(assetDurationSeconds) || !assetDurationSeconds || assetDurationSeconds <= 0) {
        return {
            watch_seconds: normalizedWatchSeconds,
        };
    }

    const normalizedDurationSeconds = Math.max(1, Math.round(assetDurationSeconds));
    const completionRatio = Math.min(1, normalizedWatchSeconds / normalizedDurationSeconds);
    return {
        watch_seconds: normalizedWatchSeconds,
        asset_duration_seconds: normalizedDurationSeconds,
        watch_completion_ratio: Number(completionRatio.toFixed(3)),
        watch_completion_percent: Math.min(100, Math.round(completionRatio * 100)),
    };
}

export async function buildThumbnailFromRecord(record: CachedAssetRecord, fallbackSrc: string): Promise<ThumbnailItem> {
    if (record.resolvedContent.kind === "image") {
        return { src: record.objectUrl, kind: record.resolvedContent.kind };
    }

    if (record.resolvedContent.kind === "video") {
        return {
            src: await createVideoThumbnail(record.objectUrl),
            kind: record.resolvedContent.kind,
        };
    }

    return { src: fallbackSrc, kind: record.resolvedContent.kind };
}

export function formatUnwrappedLabel(unwrappedAt: number | null): string {
    if (!Number.isFinite(unwrappedAt) || !unwrappedAt) {
        return "Unwrapped";
    }

    return `Unwrapped ${new Date(unwrappedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    })}`;
}

export function sanitizeDropTags(tags: unknown): Array<"Sweet" | "Spicy" | "RAW"> {
    if (!Array.isArray(tags)) {
        return [];
    }

    return tags.filter(
        (tag): tag is "Sweet" | "Spicy" | "RAW" => tag === "Sweet" || tag === "Spicy" || tag === "RAW"
    );
}

export function isEditableTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}
