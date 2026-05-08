"use client";

import { cn } from "@/lib/utils";

export function CompactAiStatusChip({ label, tone = "neutral" }: { label: string; tone?: "good" | "warn" | "neutral" }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
        tone === "good" ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100" : tone === "warn" ? "border-amber-400/25 bg-amber-500/10 text-amber-100" : "border-white/10 bg-white/5 text-gray-300",
      )}
    >
      {label}
    </span>
  );
}
