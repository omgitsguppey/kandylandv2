"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type ViewerMediaType = "image" | "video";

export interface ViewerMediaItem {
    id: string;
    url: string;
    type: ViewerMediaType;
    alt: string;
}

interface ContentViewerProps {
    items: ViewerMediaItem[];
    initialIndex?: number;
    isOpen: boolean;
    onClose: () => void;
}

export function ContentViewer({ items, initialIndex = 0, isOpen, onClose }: ContentViewerProps) {
    const [index, setIndex] = useState(initialIndex);

    useEffect(() => {
        if (!isOpen) {
            return;
        }
        setIndex(Math.max(0, Math.min(initialIndex, items.length - 1)));
    }, [initialIndex, isOpen, items.length]);

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

    const itemCount = items.length;
    const activeItem = useMemo(() => items[index] ?? null, [items, index]);

    if (!isOpen || !activeItem || itemCount === 0) {
        return null;
    }

    const canNavigate = itemCount > 1;
    const goPrev = () => setIndex((prev) => (prev - 1 + itemCount) % itemCount);
    const goNext = () => setIndex((prev) => (prev + 1) % itemCount);

    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const handleTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX === null || !canNavigate) return;
        const diff = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) goNext();
            else goPrev();
        }
        setTouchStartX(null);
    };

    const modal = (
        <div
            className="fixed inset-0 z-[130]"
            role="dialog"
            aria-modal="true"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <button
                type="button"
                onClick={onClose}
                aria-label="Close content viewer"
                className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />

            <div className="relative z-10 flex h-full w-full items-center justify-center px-4 py-16">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 h-10 w-10 rounded-full border border-white/20 bg-black/60 text-white flex items-center justify-center"
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </button>

                {canNavigate ? (
                    <button
                        type="button"
                        onClick={goPrev}
                        className="absolute left-3 md:left-6 h-10 w-10 rounded-full border border-white/20 bg-black/60 text-white flex items-center justify-center"
                        aria-label="Previous item"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                ) : null}

                <div className="w-full max-w-5xl h-full max-h-[78vh] rounded-2xl border border-white/10 bg-black overflow-hidden flex items-center justify-center">
                    {activeItem.type === "video" ? (
                        <video
                            data-viewer-video="true"
                            src={activeItem.url}
                            controls
                            playsInline
                            controlsList="nodownload noplaybackrate"
                            disablePictureInPicture
                            onContextMenu={(e) => e.preventDefault()}
                            className="h-full w-full object-contain bg-black"
                        />
                    ) : (
                        <img
                            src={activeItem.url}
                            alt={activeItem.alt}
                            className="h-full w-full object-contain bg-black"
                            draggable={false}
                            onContextMenu={(e) => e.preventDefault()}
                        />
                    )}
                </div>

                {canNavigate ? (
                    <button
                        type="button"
                        onClick={goNext}
                        className="absolute right-3 md:right-6 h-10 w-10 rounded-full border border-white/20 bg-black/60 text-white flex items-center justify-center"
                        aria-label="Next item"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                ) : null}
            </div>
        </div>
    );

    return createPortal(modal, document.body);
}
