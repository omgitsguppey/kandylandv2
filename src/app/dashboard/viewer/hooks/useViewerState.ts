import { useState, useRef, useEffect, useMemo } from "react";
import { Drop } from "@/types/db";
import { 
    ResolvedContent, 
    ThumbnailItem, 
    CachedAssetRecord, 
    getThumbnailFallback, 
    buildThumbnailItemsWithUpdate, 
    fetchAssetRecord, 
    buildThumbnailFromRecord, 
    revokeObjectUrl, 
    buildThumbnailFetchOrder, 
    clearCachedAssets 
} from "../ViewerHelpers";
import { getDropAssetCount } from "@/lib/drop-presentation";
import { useNetworkConditions } from "@/hooks/useNetworkConditions";
import { getViewerAssetPrefetchConcurrency, runConcurrentViewerPrefetch } from "@/lib/viewer-asset-prefetch";

interface UseViewerStateProps {
    drop: Drop | null;
    isAuthorized: boolean;
    trackContentLoaded: (loadMs: number, fromCache: boolean, contentKind: any) => void;
}

export function useViewerState({ drop, isAuthorized, trackContentLoaded }: UseViewerStateProps) {
    const { isConstrained, isVerySlow } = useNetworkConditions();

    const [activeIndex, setActiveIndex] = useState(0);
    const [contentBlobUrl, setContentBlobUrl] = useState<string | null>(null);
    const [resolvedContent, setResolvedContent] = useState<ResolvedContent>({ kind: "unknown", mimeType: "" });
    const [contentLoading, setContentLoading] = useState(false);
    const [thumbnailItems, setThumbnailItems] = useState<ThumbnailItem[]>([]);

    const assetCount = useMemo(() => drop ? getDropAssetCount(drop) : 0, [drop]);
    const previousDropIdRef = useRef<string | null>(null);
    const contentObjectUrlRef = useRef<string | null>(null);
    const assetCacheRef = useRef<Map<number, CachedAssetRecord>>(new Map());
    const thumbnailCacheRef = useRef<Map<number, ThumbnailItem>>(new Map());

    // Switch Drop Handling
    useEffect(() => {
        const nextDropId = drop?.id ?? null;
        if (previousDropIdRef.current === nextDropId) return;

        clearCachedAssets(assetCacheRef.current);
        thumbnailCacheRef.current.clear();
        previousDropIdRef.current = nextDropId;
        contentObjectUrlRef.current = null;
        setContentBlobUrl(null);
        setResolvedContent({ kind: "unknown", mimeType: "" });
        setThumbnailItems([]);
        setActiveIndex(0);
    }, [drop?.id]);

    useEffect(() => {
        if (assetCount === 0) setActiveIndex(0);
        else setActiveIndex((prev) => Math.min(prev, assetCount - 1));
    }, [assetCount]);

    useEffect(() => {
        const assetCache = assetCacheRef.current;
        const thumbnailCache = thumbnailCacheRef.current;
        return () => {
            clearCachedAssets(assetCache);
            contentObjectUrlRef.current = null;
            thumbnailCache.clear();
        };
    }, []);

    // Main Content Fetch
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
            trackContentLoaded(1, true, cachedRecord.resolvedContent.kind);

            if (!thumbnailCacheRef.current.has(activeIndex)) {
                void buildThumbnailFromRecord(cachedRecord, currentDrop.imageUrl).then((item) => {
                    thumbnailCacheRef.current.set(activeIndex, item);
                    setThumbnailItems((prev) => buildThumbnailItemsWithUpdate(prev, assetCount, fallbackThumbnail, activeIndex, item));
                });
            }
            return;
        }

        const controller = new AbortController();
        let cancelled = false;
        const startedAt = performance.now();

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
                trackContentLoaded(performance.now() - startedAt, false, assetRecord.resolvedContent.kind);

                void buildThumbnailFromRecord(assetRecord, currentDrop.imageUrl).then((item) => {
                    if (cancelled) return;
                    thumbnailCacheRef.current.set(activeIndex, item);
                    setThumbnailItems((prev) => buildThumbnailItemsWithUpdate(prev, assetCount, fallbackThumbnail, activeIndex, item));
                });
            } catch (err) {
                if (!cancelled) {
                    contentObjectUrlRef.current = null;
                    setContentBlobUrl(null);
                    setResolvedContent({ kind: "unknown", mimeType: "" });
                }
            } finally {
                if (!cancelled) setContentLoading(false);
            }
        }

        void fetchContent();
        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [activeIndex, assetCount, isAuthorized, drop, trackContentLoaded]);

    // Thumbnail Background Fetcher
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

        setThumbnailItems(Array.from({ length: assetCount }, (_, i) => thumbnailCacheRef.current.get(i) ?? fallbackThumbnail));
        if (contentLoading) return () => { cancelled = true; };

        async function buildThumbnails() {
            const maxBackgroundFetches = isVerySlow ? 1 : isConstrained ? 2 : Math.max(0, assetCount - 1);
            const fetchOrder = buildThumbnailFetchOrder(assetCount, activeIndex)
                .filter((index) => index !== activeIndex)
                .slice(0, maxBackgroundFetches);
            const prefetchConcurrency = Math.min(fetchOrder.length, getViewerAssetPrefetchConcurrency(isConstrained, isVerySlow));

            await runConcurrentViewerPrefetch(fetchOrder, prefetchConcurrency, async (index) => {
                if (cancelled || thumbnailCacheRef.current.has(index)) return;

                let assetRecord = assetCacheRef.current.get(index) ?? null;
                if (!assetRecord) {
                    const controller = new AbortController();
                    controllers.push(controller);
                    try {
                        assetRecord = await fetchAssetRecord(currentDrop, index, controller.signal);
                    } catch (err) {
                        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
                        thumbnailCacheRef.current.set(index, fallbackThumbnail);
                        setThumbnailItems((prev) => buildThumbnailItemsWithUpdate(prev, assetCount, fallbackThumbnail, index, fallbackThumbnail));
                        return;
                    }
                    if (cancelled) { revokeObjectUrl(assetRecord.objectUrl); return; }
                    assetCacheRef.current.set(index, assetRecord);
                }

                const item = await buildThumbnailFromRecord(assetRecord, currentDrop.imageUrl);
                if (cancelled) return;

                thumbnailCacheRef.current.set(index, item);
                setThumbnailItems((prev) => buildThumbnailItemsWithUpdate(prev, assetCount, fallbackThumbnail, index, item));
            });
        }

        const timerId = window.setTimeout(() => void buildThumbnails(), isVerySlow ? 1000 : isConstrained ? 500 : 120);
        return () => {
            cancelled = true;
            window.clearTimeout(timerId);
            controllers.forEach((c) => c.abort());
        };
    }, [activeIndex, assetCount, contentLoading, drop, isAuthorized, isConstrained, isVerySlow]);

    return {
        activeIndex,
        setActiveIndex,
        assetCount,
        contentBlobUrl,
        resolvedContent,
        contentLoading,
        thumbnailItems,
    };
}
