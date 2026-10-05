"use client";

import { DisclosureSummary } from "@/components/ui/disclosure";
import { Disclosure } from "@/components/ui/disclosure";


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
    <Disclosure
      open={defaultOpen}
      data-ai-module-collapsible="true"
      className={cn("rounded-xl border border-border bg-background/25", className)}
    >
      <DisclosureSummary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-semibold text-foreground">
        <span>{title}</span>
        {statusChip || null}
      </DisclosureSummary>
      <div className="px-3 pb-3">{children}</div>
    </Disclosure>
  );
}
