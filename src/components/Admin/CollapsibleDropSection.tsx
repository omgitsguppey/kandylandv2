"use client";

import { DisclosureSummary } from "@/components/ui/disclosure";
import { Disclosure } from "@/components/ui/disclosure";


import type { PropsWithChildren, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function CollapsibleDropSection({
  title,
  status,
  defaultOpen = false,
  className,
  children,
}: PropsWithChildren<{ title: string; status?: ReactNode; defaultOpen?: boolean; className?: string }>) {
  return (
    <Disclosure open={defaultOpen} data-ai-module-collapsible="true" className={cn("rounded-xl border border-border bg-background/20", className)}>
      <DisclosureSummary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-semibold text-foreground">
        <span>{title}</span>
        {status || null}
      </DisclosureSummary>
      <div className="px-3 pb-3">{children}</div>
    </Disclosure>
  );
}
