"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { X, Images, Video, Clock } from "lucide-react";
import { Drop } from "@/types/db";
import { getDropMediaSummary } from "@/lib/drop-presentation";
import { formatDistanceToNow } from "date-fns";

interface DropPreviewModalProps {
  drop: Drop | null;
  onClose: () => void;
}

const MAX_FOMO_COUNT = 17088;

function getTimerLabel(validFrom: number, validUntil?: number): string {
  const now = Date.now();
  if (now < validFrom) {
    return `Starts in ${formatDistanceToNow(validFrom)}`;
  }

  if (!validUntil) {
    return "Always available";
  }

  if (now >= validUntil) {
    return "Expired";
  }

  return `${formatDistanceToNow(validUntil)} left`;
}

export function DropPreviewModal({ drop, onClose }: DropPreviewModalProps) {
  const [fomoCount, setFomoCount] = useState(0);

  const mediaSummary = useMemo(() => (drop ? getDropMediaSummary(drop) : { imageCount: 0, videoCount: 0 }), [drop]);
  const timerLabel = useMemo(() => (drop ? getTimerLabel(drop.validFrom, drop.validUntil) : ""), [drop]);

  useEffect(() => {
    if (!drop) {
      return;
    }

    const baseCount = Math.min(MAX_FOMO_COUNT, Math.max(0, drop.totalUnlocks || 0));
    setFomoCount(baseCount);

    const interval = window.setInterval(() => {
      setFomoCount((current) => {
        if (current >= MAX_FOMO_COUNT) {
          return MAX_FOMO_COUNT;
        }

        const step = Math.floor(Math.random() * 11) + 1;
        return Math.min(MAX_FOMO_COUNT, current + step);
      });
    }, 900);

    return () => window.clearInterval(interval);
  }, [drop]);

  if (!drop) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-md p-4 md:p-8 flex items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-3xl glass-panel rounded-3xl overflow-hidden border border-white/10" onClick={(event) => event.stopPropagation()}>
        <div className="relative w-full h-[260px] md:h-[380px] bg-black">
          <Image src={drop.imageUrl} alt={drop.title} fill sizes="(max-width: 768px) 100vw, 900px" className="object-contain" />
          <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 md:p-7 space-y-5">
          <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm font-semibold">
            <span className="px-3 py-1 rounded-full bg-brand-purple/15 border border-brand-purple/30 text-brand-purple flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> {timerLabel}
            </span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-200 flex items-center gap-1.5">
              <Images className="w-3.5 h-3.5" /> {mediaSummary.imageCount} images
            </span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-200 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5" /> {mediaSummary.videoCount} videos
            </span>
          </div>

          <div>
            <h3 className="text-2xl font-bold text-white mb-2">{drop.title}</h3>
            <p className="text-gray-400">{drop.description}</p>
          </div>

          <p className="text-lg md:text-xl font-semibold text-[#b28cff]">
            {fomoCount.toLocaleString()} people have unwrapped before you!
          </p>
        </div>
      </div>
    </div>
  );
}
