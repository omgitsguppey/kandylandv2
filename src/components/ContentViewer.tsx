"use client";

import { TouchEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type ViewerMediaType = "image" | "video";

export interface ViewerMediaItem {
    id: string;
    url: string;
    type: ViewerMediaType;
    alt: string;
    posterUrl?: string;
}

interface ContentViewerProps {
    items: ViewerMediaItem[];
    initialIndex?: number;
    isOpen: boolean;
    onClose: () => void;
}

function normalizeViewerItems(items: ViewerMediaItem[]): ViewerMediaItem[] {
    return items.filter((item) =>
        typeof item.id === "string"
        && item.id.trim().length > 0
        && typeof item.url === "string"
        && item.url.trim().length > 0
        && (item.type === "image" || item.type === "video")
    );
}

export function ContentViewer({ items, initialIndex = 0, isOpen, onClose }: ContentViewerProps) {
    const [index, setIndex] = useState(initialIndex);
    const touchStartX = useRef<number | null>(null);

    const safeItems = useMemo(() => normalizeViewerItems(items), [items]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }
        setIndex(Math.max(0, Math.min(initialIndex, safeItems.length - 1)));
    }, [initialIndex, isOpen, safeItems.length]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
            document.querySelectorAll("video[data-viewer-video='true']").forEach((element) => {
                if (element instanceof HTMLVideoElement) {
                    element.pause();
                    element.currentTime = 0;
                }
            });
        };
    }, [isOpen]);

    const itemCount = safeItems.length;
    const activeItem = useMemo(() => safeItems[index] ?? null, [safeItems, index]);

    if (!isOpen || !activeItem || itemCount === 0) {
        return null;
    }

    const canNavigate = itemCount > 1;
    const goPrev = () => setIndex((prev) => (prev - 1 + itemCount) % itemCount);
    const goNext = () => setIndex((prev) => (prev + 1) % itemCount);

    const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
        touchStartX.current = event.changedTouches[0]?.clientX ?? null;
    };

    const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
        if (!canNavigate || touchStartX.current === null) {
            return;
        }

        const endX = event.changedTouches[0]?.clientX;
        if (typeof endX !== "number") {
            touchStartX.current = null;
            return;
        }

        const delta = endX - touchStartX.current;
        touchStartX.current = null;

        if (Math.abs(delta) < 50) {
            return;
        }

        if (delta > 0) {
            goPrev();
        } else {
            goNext();
        }
    };

    const modal = (
        <div className="fixed inset-0 z-[130]" role="dialog" aria-modal="true">
            <button
                type="button"
                onClick={onClose}
                aria-label="Close content viewer"
                className="absolute inset-0 bg-black/75 backdrop-blur-md"
            />

            <div className="relative z-10 flex h-full w-full items-center justify-center px-3 py-12 md:px-6" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                <div className="relative w-full max-w-5xl rounded-3xl border border-white/15 bg-gradient-to-b from-[#161824] to-[#0f111a] shadow-[0_25px_80px_rgba(0,0,0,0.6)] p-3 md:p-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute -top-3 -right-3 h-10 w-10 rounded-full border border-white/20 bg-black/70 text-white flex items-center justify-center z-20"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {canNavigate ? (
                        <button
                            type="button"
                            onClick={goPrev}
                            className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full border border-white/20 bg-black/60 text-white flex items-center justify-center z-20"
                            aria-label="Previous item"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    ) : null}

                    <div className="w-full max-h-[68vh] min-h-[260px] rounded-2xl border border-white/10 bg-black overflow-hidden flex items-center justify-center">
                        {activeItem.type === "video" ? (
                            <video
                                data-viewer-video="true"
                                src={activeItem.url}
                                poster={activeItem.posterUrl}
                                controls
                                playsInline
                                preload="metadata"
                                className="max-h-[68vh] h-full w-full object-contain bg-black"
                            />
                        ) : (
                            <img
                                src={activeItem.url}
                                alt={activeItem.alt}
                                className="max-h-[68vh] h-full w-full object-contain bg-black"
                            />
                        )}
                    </div>

                    {canNavigate ? (
                        <button
                            type="button"
                            onClick={goNext}
                            className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full border border-white/20 bg-black/60 text-white flex items-center justify-center z-20"
                            aria-label="Next item"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
}
