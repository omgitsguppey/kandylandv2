"use client";

import { cn } from "@/lib/utils";

export function CompactAiStatusChip({ label, tone = "neutral" }: { label: string; tone?: "good" | "warn" | "neutral" }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        tone === "good" ? "border-success/25 bg-success/10 text-success" : tone === "warn" ? "border-warning/25 bg-warning/10 text-warning" : "border-border bg-secondary text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}
