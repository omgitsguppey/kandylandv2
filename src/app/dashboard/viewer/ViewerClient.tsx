"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Lock, ShieldCheck, Loader2, ShoppingBag, Download, Video, Images, Eye } from "lucide-react";

import { toast } from "sonner";
import { Drop } from "@/types/db";
import NextImage from "next/image";
import { authFetch } from "@/lib/authFetch";
import { cn } from "@/lib/utils";
import { sendGAEvent } from "@next/third-parties/google";
import { getSimulatedUnwrapsToday } from "@/lib/unwrap-simulator";
import { getDropAssetCount } from "@/lib/drop-presentation";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import useEmblaCarousel from "embla-carousel-react";
import { trackEvent } from "@/lib/telemetry";



interface ViewerClientProps {
    drop: Drop | null;
    allDrops?: Drop[];
}

type ContentKind = "video" | "audio" | "image" | "pdf" | "unknown";

interface ResolvedContent {
    kind: ContentKind;
    mimeType: string;
}

interface ThumbnailItem {
    src: string | null;
    kind: ContentKind;
}

interface CachedAssetRecord {
    objectUrl: string;
    resolvedContent: ResolvedContent;
}

const MIME_TYPE_WITHOUT_PARAMETERS = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/;
const GENERIC_BINARY_MIME_TYPES = new Set([
    "application/octet-stream",
    "binary/octet-stream",
    "application/x-download",
    "application/force-download",
]);

function normalizeMimeType(input: string | undefined): string {
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

function resolveContentKind(mimeType: string): ContentKind {
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType === "application/pdf") return "pdf";
    return "unknown";
}

function resolveContent(blobType: string, metadataType?: string): ResolvedContent {
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

function createVideoThumbnail(videoUrl: string): Promise<string | null> {
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

function revokeObjectUrl(url: string | null | undefined) {
    if (url?.startsWith("blob:")) {
        URL.revokeObjectURL(url);
    }
}

async function fetchSecureContent(dropId: string, index: number, signal?: AbortSignal): Promise<Response> {
    return authFetch(`/api/drops/content?id=${encodeURIComponent(dropId)}&index=${index}`, {
        cache: "no-store",
        signal,
    });
}

async function fetchAssetRecord(drop: Drop, index: number, signal?: AbortSignal): Promise<CachedAssetRecord> {
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

function clearCachedAssets(cache: Map<number, CachedAssetRecord>) {
    cache.forEach((record) => revokeObjectUrl(record.objectUrl));
    cache.clear();
}

function getThumbnailFallback(drop: Drop): ThumbnailItem {
    const fallbackResolved = resolveContent(drop.fileMetadata?.type || "", drop.fileMetadata?.type);

    return {
        src: drop.imageUrl,
        kind: fallbackResolved.kind === "unknown" ? "image" : fallbackResolved.kind,
    };
}

function buildThumbnailItemsWithUpdate(
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

function buildThumbnailFetchOrder(assetCount: number, activeIndex: number): number[] {
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

async function buildThumbnailFromRecord(record: CachedAssetRecord, fallbackSrc: string): Promise<ThumbnailItem> {
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

function formatUnwrappedLabel(unwrappedAt: number | null): string {
    if (!Number.isFinite(unwrappedAt) || !unwrappedAt) {
        return "Unwrapped";
    }

    return `Unwrapped ${new Date(unwrappedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    })}`;
}

function sanitizeDropTags(tags: unknown): Array<"Sweet" | "Spicy" | "RAW"> {
    if (!Array.isArray(tags)) {
        return [];
    }

    return tags.filter(
        (tag): tag is "Sweet" | "Spicy" | "RAW" => tag === "Sweet" || tag === "Spicy" || tag === "RAW"
    );
}

export function ViewerClient({ drop, allDrops }: ViewerClientProps) {
    const { user, userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [contentBlobUrl, setContentBlobUrl] = useState<string | null>(null);
    const [resolvedContent, setResolvedContent] = useState<ResolvedContent>({ kind: "unknown", mimeType: "" });
    const [contentLoading, setContentLoading] = useState(false);
    const [thumbnailItems, setThumbnailItems] = useState<ThumbnailItem[]>([]);
    const contentObjectUrlRef = useRef<string | null>(null);
    const assetCacheRef = useRef<Map<number, CachedAssetRecord>>(new Map());
    const thumbnailCacheRef = useRef<Map<number, ThumbnailItem>>(new Map());
    const previousDropIdRef = useRef<string | null>(null);
    const hasTrackedViewerOpenRef = useRef<string | null>(null);
    const lastTrackedAssetRef = useRef<string | null>(null);
    const consumedAssetKeysRef = useRef<Set<string>>(new Set());
    const watchCheckpointKeysRef = useRef<Set<string>>(new Set());

    const [isSecurityTriggered, setIsSecurityTriggered] = useState(false);

    const videoFallbackTypes = ["video/mp4", "video/webm", "video/ogg"];
    const audioFallbackTypes = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/webm"];
    const unlockedDropIds = useMemo(() => (
        Array.isArray(userProfile?.unlockedContent) ? userProfile.unlockedContent : []
    ), [userProfile?.unlockedContent]);

    const unwrappedAt = useMemo(() => {
        if (!drop || !userProfile?.unlockedContentTimestamps) {
            return null;
        }

        const raw = userProfile.unlockedContentTimestamps[drop.id];
        if (!Number.isFinite(raw)) {
            return null;
        }

        return Math.floor(raw);
    }, [drop, userProfile?.unlockedContentTimestamps]);

    const previewTags = useMemo(() => sanitizeDropTags(drop?.tags), [drop?.tags]);

    const [simulativeUnwraps, setSimulativeUnwraps] = useState(0);

    useEffect(() => {
        if (drop) {
            setSimulativeUnwraps(getSimulatedUnwrapsToday(drop.id));
        }
    }, [drop]);

    const [activeIndex, setActiveIndex] = useState(0);
    const [emblaRef, emblaApi] = useEmblaCarousel({ dragFree: true, containScroll: "trimSnaps" });

    useEffect(() => {
        const assetCache = assetCacheRef.current;
        const thumbnailCache = thumbnailCacheRef.current;

        return () => {
            clearCachedAssets(assetCache);
            contentObjectUrlRef.current = null;
            thumbnailCache.clear();
        };
    }, []);

    useEffect(() => {
        if (!emblaApi) return;
        emblaApi.scrollTo(activeIndex);
    }, [emblaApi, activeIndex]);

    const assetCount = useMemo(() => {
        return drop ? getDropAssetCount(drop) : 0;
    }, [drop]);

    useEffect(() => {
        if (!drop || !isAuthorized) {
            hasTrackedViewerOpenRef.current = null;
            return;
        }

        if (hasTrackedViewerOpenRef.current === drop.id) {
            return;
        }

        hasTrackedViewerOpenRef.current = drop.id;
        trackEvent("viewer_opened", {
            drop_id: drop.id,
            drop_category: drop.type,
            content_count: assetCount,
        });
    }, [assetCount, drop, isAuthorized]);

    useEffect(() => {
        setActiveIndex(0);
    }, [drop?.id]);

    useEffect(() => {
        if (assetCount === 0) {
            setActiveIndex(0);
            return;
        }

        setActiveIndex((previous) => Math.min(previous, assetCount - 1));
    }, [assetCount]);

    useEffect(() => {
        if (!drop || !isAuthorized || assetCount <= 1) {
            lastTrackedAssetRef.current = null;
            return;
        }

        const assetKey = `${drop.id}:${activeIndex}`;
        if (lastTrackedAssetRef.current === assetKey) {
            return;
        }

        if (lastTrackedAssetRef.current !== null) {
            trackEvent("viewer_asset_changed", {
                drop_id: drop.id,
                asset_index: activeIndex + 1,
                asset_total: assetCount,
                asset_key: `${drop.id}:${activeIndex}`,
            });
        }

        lastTrackedAssetRef.current = assetKey;
    }, [activeIndex, assetCount, drop, isAuthorized]);

    const trackAssetConsumed = useCallback((watchSeconds: number) => {
        if (!drop) {
            return;
        }

        const assetKey = `${drop.id}:${activeIndex}`;
        if (consumedAssetKeysRef.current.has(assetKey)) {
            return;
        }

        consumedAssetKeysRef.current.add(assetKey);
        trackEvent("viewer_asset_consumed", {
            drop_id: drop.id,
            asset_index: activeIndex + 1,
            asset_key: assetKey,
            watch_seconds: watchSeconds,
            content_kind: resolvedContent.kind,
        });
    }, [activeIndex, drop, resolvedContent.kind]);

    const trackWatchCheckpoint = useCallback((watchSeconds: number) => {
        if (!drop) {
            return;
        }

        const assetKey = `${drop.id}:${activeIndex}`;
        const checkpointKey = `${assetKey}:${watchSeconds}`;
        if (watchCheckpointKeysRef.current.has(checkpointKey)) {
            return;
        }

        watchCheckpointKeysRef.current.add(checkpointKey);
        trackEvent("viewer_watch_checkpoint", {
            drop_id: drop.id,
            asset_index: activeIndex + 1,
            asset_key: assetKey,
            watch_seconds: watchSeconds,
            content_kind: resolvedContent.kind,
        });
    }, [activeIndex, drop, resolvedContent.kind]);

    useEffect(() => {
        if (!drop || !isAuthorized || contentLoading || !contentBlobUrl) {
            return;
        }

        if (resolvedContent.kind === "video" || resolvedContent.kind === "audio") {
            return;
        }

        const timerId = window.setTimeout(() => {
            trackAssetConsumed(6);
        }, 6000);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [contentBlobUrl, contentLoading, drop, isAuthorized, resolvedContent.kind, trackAssetConsumed]);

    const handleMediaTimeUpdate = useCallback((currentTime: number) => {
        if (!Number.isFinite(currentTime) || currentTime <= 0) {
            return;
        }

        if (currentTime >= 15) {
            trackAssetConsumed(15);
            trackWatchCheckpoint(15);
        }

        if (currentTime >= 45) {
            trackWatchCheckpoint(45);
        }

        if (currentTime >= 90) {
            trackWatchCheckpoint(90);
        }
    }, [trackAssetConsumed, trackWatchCheckpoint]);

    // Redirect if not logged in (once auth is ready)
    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/");
        }
    }, [authLoading, user, router]);

    // Check authorization
    useEffect(() => {
        if (drop && unlockedDropIds.includes(drop.id)) {
            setIsAuthorized(true);
        } else {
            setIsAuthorized(false);
        }
    }, [drop, unlockedDropIds]);

    useEffect(() => {
        const nextDropId = drop?.id ?? null;
        const dropChanged = previousDropIdRef.current !== nextDropId;

        if (!dropChanged && isAuthorized) {
            return;
        }

        clearCachedAssets(assetCacheRef.current);
        thumbnailCacheRef.current.clear();
        previousDropIdRef.current = nextDropId;
        contentObjectUrlRef.current = null;
        setContentBlobUrl(null);
        setResolvedContent({ kind: "unknown", mimeType: "" });
        setThumbnailItems([]);
    }, [drop?.id, isAuthorized]);

    // Security Hooks for Anti-Ripping
    useEffect(() => {
        if (!isAuthorized || !drop) return;

        const logViolation = async (reason: string) => {
            setIsSecurityTriggered(true);
            try {
                // Fire and forget telemetry
                authFetch("/api/security/log-attempt", {
                    method: "POST",
                    body: JSON.stringify({ dropId: drop.id, reason }),
                }).catch(console.error);
            } catch (err) { }

            // Auto unblur after 5 seconds to reduce annoyance for false positives
            setTimeout(() => {
                setIsSecurityTriggered(false);
            }, 5000);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            // macOS: Cmd+Shift+3/4/5
            const isMacScreenshot = e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5');
            // Windows: Win+Shift+S
            const isWinScreenshot = e.metaKey && e.shiftKey && e.key.toLowerCase() === 's';
            // Global: PrintScreen
            const isPrintScreen = e.key === 'PrintScreen' || e.code === 'PrintScreen';

            if (isMacScreenshot || isWinScreenshot || isPrintScreen) {
                logViolation("screenshot_hotkey");
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                logViolation("window_blur");
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [isAuthorized, drop]);

    // Fetch the active asset with Authorization headers and render it via an object URL.
    useEffect(() => {
        if (!isAuthorized || !drop) return;

        const currentDrop = drop;
        const fallbackThumbnail = getThumbnailFallback(currentDrop);
        const cachedRecord = assetCacheRef.current.get(activeIndex);

        if (activeIndex >= assetCount) {
            contentObjectUrlRef.current = null;
            setContentBlobUrl(null);
            setResolvedContent({ kind: "unknown", mimeType: "" });
            setContentLoading(false);
            return;
        }

        if (cachedRecord) {
            contentObjectUrlRef.current = cachedRecord.objectUrl;
            setContentBlobUrl(cachedRecord.objectUrl);
            setResolvedContent(cachedRecord.resolvedContent);
            setContentLoading(false);

            if (!thumbnailCacheRef.current.has(activeIndex)) {
                void buildThumbnailFromRecord(cachedRecord, currentDrop.imageUrl).then((thumbnailItem) => {
                    thumbnailCacheRef.current.set(activeIndex, thumbnailItem);
                    setThumbnailItems((previous) =>
                        buildThumbnailItemsWithUpdate(previous, assetCount, fallbackThumbnail, activeIndex, thumbnailItem)
                    );
                });
            }

            return;
        }

        const controller = new AbortController();
        let cancelled = false;

        async function fetchContent() {
            setContentLoading(true);
            try {
                const assetRecord = await fetchAssetRecord(currentDrop, activeIndex, controller.signal);

                if (cancelled) {
                    revokeObjectUrl(assetRecord.objectUrl);
                    return;
                }

                assetCacheRef.current.set(activeIndex, assetRecord);
                contentObjectUrlRef.current = assetRecord.objectUrl;
                setContentBlobUrl(assetRecord.objectUrl);
                setResolvedContent(assetRecord.resolvedContent);

                void buildThumbnailFromRecord(assetRecord, currentDrop.imageUrl).then((thumbnailItem) => {
                    if (cancelled) {
                        return;
                    }

                    thumbnailCacheRef.current.set(activeIndex, thumbnailItem);
                    setThumbnailItems((previous) =>
                        buildThumbnailItemsWithUpdate(previous, assetCount, fallbackThumbnail, activeIndex, thumbnailItem)
                    );
                });
            } catch (err) {
                if (!cancelled) {
                    contentObjectUrlRef.current = null;
                    setContentBlobUrl(null);
                    setResolvedContent({ kind: "unknown", mimeType: "" });

                    if (!(err instanceof DOMException && err.name === "AbortError")) {
                        toast.error("Failed to load content securely");
                    }
                }
            } finally {
                if (!cancelled) {
                    setContentLoading(false);
                }
            }
        }

        void fetchContent();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [activeIndex, assetCount, isAuthorized, drop]);

    useEffect(() => {
        if (!isAuthorized || !drop || assetCount === 0) {
            thumbnailCacheRef.current.clear();
            setThumbnailItems([]);
            return;
        }

        const currentDrop = drop;
        const fallbackThumbnail = getThumbnailFallback(currentDrop);
        let cancelled = false;
        const controllers: AbortController[] = [];

        setThumbnailItems(
            Array.from({ length: assetCount }, (_, index) => thumbnailCacheRef.current.get(index) ?? fallbackThumbnail)
        );

        if (contentLoading) {
            return () => {
                cancelled = true;
            };
        }

        async function buildThumbnails() {
            const fetchOrder = buildThumbnailFetchOrder(assetCount, activeIndex).filter((index) => index !== activeIndex);

            for (const index of fetchOrder) {
                if (cancelled) {
                    return;
                }

                if (thumbnailCacheRef.current.has(index)) {
                    continue;
                }

                let assetRecord = assetCacheRef.current.get(index) ?? null;

                if (!assetRecord) {
                    const controller = new AbortController();
                    controllers.push(controller);

                    try {
                        assetRecord = await fetchAssetRecord(currentDrop, index, controller.signal);
                    } catch (err) {
                        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) {
                            return;
                        }

                        thumbnailCacheRef.current.set(index, fallbackThumbnail);
                        setThumbnailItems((previous) =>
                            buildThumbnailItemsWithUpdate(previous, assetCount, fallbackThumbnail, index, fallbackThumbnail)
                        );
                        continue;
                    }

                    if (cancelled) {
                        revokeObjectUrl(assetRecord.objectUrl);
                        return;
                    }

                    assetCacheRef.current.set(index, assetRecord);
                }

                const thumbnailItem = await buildThumbnailFromRecord(assetRecord, currentDrop.imageUrl);
                if (cancelled) {
                    return;
                }

                thumbnailCacheRef.current.set(index, thumbnailItem);
                setThumbnailItems((previous) =>
                    buildThumbnailItemsWithUpdate(previous, assetCount, fallbackThumbnail, index, thumbnailItem)
                );
            }
        }

        void buildThumbnails();

        return () => {
            cancelled = true;
            controllers.forEach((controller) => controller.abort());
        };
    }, [activeIndex, assetCount, contentLoading, drop, isAuthorized]);


    // Prevent right-click on media
    const preventContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
    };

    // Skeleton for AUTH loading only
    if (authLoading) {
        return (
            <SkeletonTheme baseColor="#1a1a1a" highlightColor="#2a2a2a">
                <div className="max-w-4xl mx-auto pt-20">
                    <div className="flex justify-between mb-6">
                        <Skeleton width={100} height={16} />
                        <Skeleton width={128} height={24} borderRadius={9999} />
                    </div>
                    <div className="mb-8">
                        <Skeleton height={400} borderRadius={24} />
                    </div>
                    <Skeleton height={32} width="50%" className="mb-4" />
                    <Skeleton count={2} height={16} className="mb-2" />
                </div>
            </SkeletonTheme>
        );
    }

    if (!user) return null; // Redirecting

    if (!drop) {
        return (
            <div className="text-center py-20 pt-32">
                <h2 className="text-xl font-bold text-white mb-2">Drop Not Found</h2>
                <Link href="/dashboard/library" className="text-brand-purple">Back to Library</Link>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 pt-20">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                    <Lock className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
                <p className="text-gray-400 mb-8 max-w-md">
                    You do not own this drop. Please purchase it from the marketplace to unlock this content.
                </p>
                <Link
                    href="/"
                    className="px-6 py-3 rounded-full bg-white text-black font-bold transition-colors"
                >
                    Go to Marketplace
                </Link>
            </div>
        );
    }

    // Calculate retention drops
    const retentionDrops = (allDrops || [])
        .filter((d) => unlockedDropIds.includes(d.id) && d.id !== drop.id)
        .slice(0, 4);

    const hasThumbnailRail = assetCount > 1;
    const viewerStageHeight = hasThumbnailRail
        ? "clamp(20rem, calc(100dvh - 14rem - env(safe-area-inset-top) - env(safe-area-inset-bottom)), 44rem)"
        : "clamp(20rem, calc(100dvh - 13rem - env(safe-area-inset-top) - env(safe-area-inset-bottom)), 44rem)";

    return (
        <div className="w-full bg-black">
            {/* 1. Full-Width Media Viewer (Immersive) */}
            <section
                className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pb-2 md:px-6"
                style={{ height: viewerStageHeight }}
            >
                {/* Media Container */}
                <div
                    className={cn(
                        "relative min-h-0 flex-1 rounded-2xl border border-white/10 bg-zinc-900 overflow-hidden transition-all duration-300 select-none"
                    )}
                    onContextMenu={preventContextMenu}
                    style={{ WebkitUserSelect: "none", userSelect: "none", WebkitUserDrag: "none" } as any}
                >
                    {/* Back Button Overlay */}
                    <div className="absolute top-4 left-4 z-20">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-md text-white/80 transition-all border border-white/10 text-sm font-medium"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="hidden md:inline">Library</span>
                        </Link>
                    </div>

                    {/* Security Warning Overlay */}
                    {isSecurityTriggered && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/40 backdrop-blur-sm">
                            <div className="bg-zinc-900/90 px-6 py-5 rounded-3xl flex flex-col items-center gap-3 border border-white/10 shadow-xl">
                                <ShieldCheck className="w-10 h-10 text-brand-purple animate-pulse" />
                                <div className="text-center">
                                    <p className="text-white font-bold text-lg mb-0.5">Content Protected</p>
                                    <p className="text-xs text-gray-400 font-medium">Capture or recording detected.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={cn("flex h-full w-full items-center justify-center transition-all duration-500", isSecurityTriggered ? "blur-xl opacity-50" : "")}>
                        {contentLoading ? (
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-10 h-10 text-brand-purple animate-spin" />
                                <p className="text-sm text-gray-400">Loading content...</p>
                            </div>
                        ) : contentBlobUrl ? (
                            (() => {
                                if (resolvedContent.kind === "video") {
                                    return (
                                        <video
                                            key={`viewer-video-${contentBlobUrl}`}
                                            controls
                                            controlsList="nodownload noplaybackrate"
                                            disablePictureInPicture
                                            className="h-full w-full object-contain bg-black"
                                            poster={drop.imageUrl}
                                            autoPlay
                                            playsInline
                                            preload="auto"
                                            onContextMenu={preventContextMenu}
                                            draggable={false}
                                            onPlay={() => {
                                                sendGAEvent("event", "video_played", {
                                                    content_id: drop.id,
                                                    video_title: drop.title
                                                });
                                            }}
                                            onTimeUpdate={(event) => {
                                                handleMediaTimeUpdate(event.currentTarget.currentTime);
                                            }}
                                        >
                                            <source src={contentBlobUrl} type={resolvedContent.mimeType} />
                                            {videoFallbackTypes.filter((type) => type !== resolvedContent.mimeType).map((type) => (
                                                <source key={type} src={contentBlobUrl} type={type} />
                                            ))}
                                        </video>
                                    );
                                } else if (resolvedContent.kind === "audio") {
                                    return (
                                        <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-gray-900 to-black px-6 py-8">
                                            <NextImage
                                                src={drop.imageUrl}
                                                alt="Album Art"
                                                fill
                                                className="object-cover opacity-30 blur-3xl"
                                            />
                                            <div className="relative z-10 mb-6 h-36 w-36 overflow-hidden rounded-2xl border border-white/10 shadow-2xl sm:h-44 sm:w-44 md:h-56 md:w-56">
                                                <NextImage src={drop.imageUrl} alt="Art" fill priority className="object-cover" />
                                            </div>
                                            <audio
                                                key={`viewer-audio-${contentBlobUrl}`}
                                                controls
                                                controlsList="nodownload"
                                                className="relative z-10 w-full max-w-md"
                                                onContextMenu={preventContextMenu}
                                                onTimeUpdate={(event) => {
                                                    handleMediaTimeUpdate(event.currentTarget.currentTime);
                                                }}
                                            >
                                                <source src={contentBlobUrl} type={resolvedContent.mimeType} />
                                                {audioFallbackTypes.filter((type) => type !== resolvedContent.mimeType).map((type) => (
                                                    <source key={type} src={contentBlobUrl} type={type} />
                                                ))}
                                            </audio>
                                        </div>
                                    );
                                } else if (resolvedContent.kind === "image") {
                                    return (
                                        <div className="relative h-full w-full bg-black">
                                            <NextImage
                                                key={`viewer-image-${contentBlobUrl}`}
                                                src={contentBlobUrl}
                                                alt="Content"
                                                fill
                                                unoptimized
                                                sizes="100vw"
                                                className="object-contain"
                                                draggable={false}
                                                onContextMenu={preventContextMenu}
                                            />
                                        </div>
                                    );
                                } else if (resolvedContent.kind === "pdf") {
                                    return (
                                        <div className="h-full w-full overflow-hidden rounded-md bg-white">
                                            <object
                                                key={`viewer-pdf-${contentBlobUrl}`}
                                                data={contentBlobUrl}
                                                type="application/pdf"
                                                className="w-full h-full"
                                            >
                                                <p className="p-4 text-black text-center">
                                                    Your browser doesn&apos;t support built-in PDF viewing.
                                                </p>
                                            </object>
                                        </div>
                                    );
                                } else {
                                    return (
                                        <div className="flex h-full w-full items-center justify-center text-center p-10">
                                            <div>
                                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <ShieldCheck className="w-10 h-10 text-gray-400" />
                                                </div>
                                                <p className="text-gray-400">File Preview Not Available</p>
                                            </div>
                                        </div>
                                    );
                                }
                            })()
                        ) : (
                            <div className="text-gray-500">Content Unavailable</div>
                        )}
                    </div>
                </div>

                {/* 1.5 Multi-File Thumbnail Slider */}
                {hasThumbnailRail ? (
                    <div className="shrink-0">
                        <div className="overflow-hidden px-2 pt-1" ref={emblaRef}>
                            <div className="flex gap-4 pb-2">
                                {Array.from({ length: assetCount }).map((_, idx) => {
                                    const thumbnail = thumbnailItems[idx];
                                    const isVideo = thumbnail?.kind === "video";
                                    const isImage = thumbnail?.kind === "image";

                                    return (
                                        <button
                                            key={`thumb-${idx}`}
                                            type="button"
                                            onClick={() => setActiveIndex(idx)}
                                            className={cn(
                                                "relative flex-[0_0_auto] w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-2 transition-all transform",
                                                activeIndex === idx
                                                    ? "border-brand-purple scale-105 shadow-[0_0_15px_rgba(178,140,255,0.4)] z-10"
                                                    : "border-white/10 opacity-50 hover:opacity-100 hover:border-white/30"
                                            )}
                                        >
                                            <div className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 z-30">
                                                {isVideo ? <Video className="w-3 h-3 text-white" /> : <Images className="w-3 h-3 text-white" />}
                                            </div>
                                            <div className="absolute inset-x-0 bottom-0 top-auto bg-gradient-to-t from-black via-black/50 to-transparent flex items-end justify-center pb-0.5 text-[9px] font-bold text-white/50 z-20 pointer-events-none h-6">
                                                {idx + 1}
                                            </div>
                                            {thumbnail?.src ? (
                                                <NextImage
                                                    src={thumbnail.src}
                                                    alt={`Thumbnail ${idx + 1}`}
                                                    fill
                                                    unoptimized
                                                    sizes="80px"
                                                    className="object-cover opacity-80 pointer-events-none bg-zinc-900"
                                                    draggable={false}
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-white/60">
                                                    {isVideo ? <Video className="w-4 h-4" /> : isImage ? <Images className="w-4 h-4" /> : <Images className="w-4 h-4" />}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <p className="text-center text-xs text-gray-500">
                            {activeIndex + 1} of {assetCount} files
                        </p>
                    </div>
                ) : null}
            </section>

            {/* 2. Content Info & Engagement */}
            <div className="max-w-4xl mx-auto px-4 mt-6 md:mt-8">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">

                    {/* Title & Metadata */}
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-gray-400 mb-2">
                            <span className="px-2 py-0.5 rounded bg-white/10 border border-white/5 text-brand-purple font-mono uppercase tracking-wider">
                                #{drop.id.slice(0, 4)}
                            </span>
                            {previewTags.map((tag) => (
                                <span
                                    key={tag}
                                    className={cn(
                                        "px-2 py-0.5 rounded border text-[11px] font-semibold uppercase tracking-wide",
                                        tag === "Sweet" && "bg-brand-purple/20 text-brand-purple border-brand-purple/30",
                                        tag === "Spicy" && "bg-white/10 text-white border-white/20",
                                        tag === "RAW" && "bg-zinc-800/80 text-white border-white/20"
                                    )}
                                >
                                    {tag}
                                </span>
                            ))}
                            <span className="opacity-50">•</span>
                            <span>{formatUnwrappedLabel(unwrappedAt)}</span>
                            <span className="opacity-50">•</span>
                            <div className="flex items-center gap-1.5 text-white/80 font-medium bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                                <Eye className="w-3.5 h-3.5 text-brand-purple" />
                                <span>{simulativeUnwraps} unwrapped today</span>
                            </div>
                        </div>
                        <h1 className="text-2xl md:text-4xl font-bold text-white mb-3 leading-tight">
                            {drop.title}
                        </h1>
                        <div className="prose prose-invert prose-purple max-w-2xl">
                            <p className="text-gray-400 leading-relaxed text-sm md:text-base">
                                {drop.description}
                            </p>
                        </div>
                    </div>

                    {/* 3. Navigation */}
                    <div className="flex flex-col gap-3 w-full md:w-auto min-w-[200px]">
                        {user.uid === drop.creatorId && contentBlobUrl && (
                            <a
                                href={contentBlobUrl}
                                download={drop.title}
                                onClick={() => {
                                    trackEvent("viewer_source_downloaded", {
                                        drop_id: drop.id,
                                        drop_category: drop.type,
                                    });
                                }}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-sm mt-1 hover:bg-white/10"
                            >
                                <Download className="w-4 h-4" />
                                <span>Download Source</span>
                            </a>
                        )}
                        <Link
                            href="/drops"
                            className="w-full px-4 py-3 rounded-xl bg-white text-black font-black text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)] mt-1"
                        >
                            <ShoppingBag className="w-4 h-4" />
                            <span>Browse More Drops</span>
                        </Link>
                    </div>
                </div>

                {/* 5. Retention: More Like This */}
                {retentionDrops.length > 0 && (
                    <div className="mt-12 md:mt-20 border-t border-white/5 pt-8">
                        <h3 className="text-lg font-bold text-white mb-6">More from your collection</h3>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {retentionDrops.map((retentionDrop) => (
                                <Link
                                    key={retentionDrop.id}
                                    href={`/dashboard/viewer?id=${retentionDrop.id}`}
                                    className="group block"
                                >
                                    <div className="aspect-square bg-zinc-900 rounded-xl border border-white/5 overflow-hidden relative mb-2">
                                        {retentionDrop.imageUrl ? (
                                            <NextImage
                                                src={retentionDrop.imageUrl}
                                                alt={retentionDrop.title}
                                                fill
                                                className="object-contain bg-black group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-3xl">🍬</div>
                                        )}
                                    </div>
                                    <p className="text-sm font-bold text-white line-clamp-1 group-hover:text-brand-purple transition-colors">{retentionDrop.title}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
