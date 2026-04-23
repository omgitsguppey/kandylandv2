"use client";

import type { AdminSurfaceState } from "@/lib/admin-parity";
import { cn } from "@/lib/utils";

const STATE_STYLES: Record<AdminSurfaceState, string> = {
  live: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  degraded: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  fallback: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  stale: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  unavailable: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  failed: "border-red-500/30 bg-red-500/10 text-red-300",
};

export function AdminStatusBadge({
  state,
  className,
}: {
  state: AdminSurfaceState;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
        STATE_STYLES[state],
        className,
      )}
    >
      [{state}]
    </span>
  );
}
