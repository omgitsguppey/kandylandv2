"use client";

import { Button } from "@/components/ui/Button";


import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export function CompactAiActionButton(props: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  const { className, children, ...rest } = props;
  return (
    <Button variant="ghost"
      {...rest}
      className={cn("inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border bg-background/35 px-3 text-xs font-semibold text-foreground disabled:opacity-50", className)}
    >
      {children}
    </Button>
  );
}
