import NextImage from "next/image";

import { getImageLoadingPolicy, getImagePolicyDataAttributes } from "@/lib/image-loading-policy";
import { cn } from "@/lib/utils";

type CandyIconProps = {
  className?: string;
};

export function CandyIcon({ className }: CandyIconProps) {
  const imagePolicy = getImageLoadingPolicy("home_hero", { isLcpCandidate: true });

  return (
    <NextImage
      src="/candy-3d-glass.png"
      alt="Candy"
      width={96}
      height={96}
      loading={imagePolicy.loading}
      preload={imagePolicy.preload}
      fetchPriority={imagePolicy.fetchPriority}
      sizes="96px"
      className={cn("object-contain", className)}
      {...getImagePolicyDataAttributes(imagePolicy)}
    />
  );
}
