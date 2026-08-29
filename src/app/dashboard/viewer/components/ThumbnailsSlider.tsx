import { useEffect } from "react";
import NextImage from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Images, Video } from "lucide-react";

import { getImageLoadingPolicy, getImagePolicyDataAttributes } from "@/lib/image-loading-policy";
import { cn } from "@/lib/utils";

import type { ThumbnailItem } from "../ViewerHelpers";

interface ThumbnailsSliderProps {
  assetCount: number;
  activeIndex: number;
  thumbnailItems: ThumbnailItem[];
  setActiveIndex: (index: number) => void;
}

export function ThumbnailsSlider({ assetCount, activeIndex, thumbnailItems, setActiveIndex }: ThumbnailsSliderProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ dragFree: true, containScroll: "trimSnaps" });
  const thumbnailImagePolicy = getImageLoadingPolicy("viewer_content", { mediaIndex: 1 });

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.scrollTo(activeIndex);
  }, [emblaApi, activeIndex]);

  if (assetCount <= 1) return null;

  return (
    <div className="group relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3">
          {Array.from({ length: assetCount }).map((_, index) => {
            const thumbnail = thumbnailItems[index];
            const isVideo = thumbnail?.kind === "video";
            const isImage = thumbnail?.kind === "image";
            const isActive = activeIndex === index;

            return (
              <button
                key={`thumb-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show asset ${index + 1} of ${assetCount}`}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border transition sm:h-20 sm:w-20",
                  isActive
                    ? "border-brand-purple ring-2 ring-brand-purple/30 shadow-lg shadow-brand-purple/25"
                    : "border-white/10 opacity-60 hover:border-white/30 hover:opacity-100",
                )}
              >
                {thumbnail?.src ? (
                  <NextImage
                    src={thumbnail.src}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    unoptimized
                    loading="lazy"
                    preload={false}
                    fetchPriority="low"
                    sizes="80px"
                    className="pointer-events-none object-cover bg-slate-900"
                    draggable={false}
                    {...getImagePolicyDataAttributes(thumbnailImagePolicy)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-400">
                    {isVideo ? <Video className="h-5 w-5" /> : isImage ? <Images className="h-5 w-5" /> : <Images className="h-5 w-5" />}
                  </div>
                )}
                <span className="absolute left-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-lg bg-black/60 px-1 text-xs font-semibold text-white backdrop-blur-md">
                  {isVideo ? <Video className="h-3 w-3" aria-label="Video" /> : index + 1}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-y-0 -left-2 -right-2 flex items-center justify-between opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <button
          type="button"
          onClick={() => emblaApi?.scrollPrev()}
          disabled={activeIndex === 0}
          aria-label="Scroll thumbnails left"
          className="pointer-events-auto inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-white/15 bg-black/70 text-white shadow-xl backdrop-blur-md transition hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => emblaApi?.scrollNext()}
          disabled={activeIndex === assetCount - 1}
          aria-label="Scroll thumbnails right"
          className="pointer-events-auto inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-white/15 bg-black/70 text-white shadow-xl backdrop-blur-md transition hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-3 text-center text-sm text-slate-400">Viewing {activeIndex + 1} of {assetCount}</p>
    </div>
  );
}
