"use client";

import type { PropsWithChildren, ReactNode } from "react";
import { cn } from "@/lib/utils";

type CompactAiModuleCardProps = PropsWithChildren<{
  title: string;
  statusChip?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}>;

export function CompactAiModuleCard({ title, statusChip, defaultOpen = false, className, children }: CompactAiModuleCardProps) {
  return (
    <details
      open={defaultOpen}
      data-ai-module-collapsible="true"
      className={cn("rounded-xl border border-white/10 bg-black/25", className)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-semibold text-white">
        <span>{title}</span>
        {statusChip || null}
      </summary>
      <div className="px-3 pb-3">{children}</div>
    </details>
  );
}
