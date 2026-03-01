import { Drop } from "@/types/db";
import { SupportedAspectRatio, getSupportedDropAspectRatio } from "@/lib/drop-presentation";

export function getGalleryAspectRatio(drop: Drop): SupportedAspectRatio {
  return getSupportedDropAspectRatio(drop);
}

export function getGallerySpanClass(aspectRatio: SupportedAspectRatio): string {
  if (aspectRatio === "16:9") return "col-span-4";
  if (aspectRatio === "9:16") return "col-span-2";
  return "col-span-3";
}
