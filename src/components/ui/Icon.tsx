import NextImage from "next/image";

import { cn } from "@/lib/utils";

type CandyIconProps = {
  className?: string;
};

export function CandyIcon({ className }: CandyIconProps) {
  return (
    <NextImage
      src="/candy-3d-glass.png"
      alt="Candy"
      width={96}
      height={96}
      className={cn("object-contain", className)}
      priority
    />
  );
}
