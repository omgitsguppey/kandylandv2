import NextImage from "next/image";
import { ChevronLeft, ChevronRight, Video, Images } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThumbnailItem } from "../ViewerHelpers";
import useEmblaCarousel from "embla-carousel-react";
import { useEffect } from "react";

interface ThumbnailsSliderProps {
    assetCount: number;
    activeIndex: number;
    thumbnailItems: ThumbnailItem[];
    setActiveIndex: (index: number) => void;
}

export function ThumbnailsSlider({ assetCount, activeIndex, thumbnailItems, setActiveIndex }: ThumbnailsSliderProps) {
    const [emblaRef, emblaApi] = useEmblaCarousel({ dragFree: true, containScroll: "trimSnaps" });

    useEffect(() => {
        if (!emblaApi) return;
        emblaApi.scrollTo(activeIndex);
    }, [emblaApi, activeIndex]);

    if (assetCount <= 1) return null;

    return (
        <div className="shrink-0 group relative">
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
                                aria-label={`Show asset ${idx + 1} of ${assetCount}`}
                                aria-current={activeIndex === idx ? "true" : undefined}
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
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-1 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button
                    type="button"
                    onClick={() => emblaApi?.scrollPrev()}
                    disabled={activeIndex === 0}
                    aria-label="Scroll thumbnails left"
                    className="w-8 h-8 flex items-center justify-center bg-black/60 backdrop-blur-md rounded-full border border-white/20 text-white shadow-xl pointer-events-auto disabled:opacity-30 transition-all hover:scale-110 active:scale-95"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={() => emblaApi?.scrollNext()}
                    disabled={activeIndex === assetCount - 1}
                    aria-label="Scroll thumbnails right"
                    className="w-8 h-8 flex items-center justify-center bg-black/60 backdrop-blur-md rounded-full border border-white/20 text-white shadow-xl pointer-events-auto disabled:opacity-30 transition-all hover:scale-110 active:scale-95"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
            <div className="flex items-center justify-center gap-1 mt-1 text-gray-500">
                <span className="text-[10px] uppercase font-bold tracking-widest">{activeIndex + 1} of {assetCount}</span>
            </div>
        </div>
    );
}
