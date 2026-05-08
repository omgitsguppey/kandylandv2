"use client";

import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export function CompactAiActionButton(props: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  const { className, children, ...rest } = props;
  return (
    <button
      {...rest}
      className={cn("inline-flex h-9 items-center justify-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 text-xs font-semibold text-white disabled:opacity-50", className)}
    >
      {children}
    </button>
  );
}
