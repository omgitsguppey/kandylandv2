"use client";

import type { ReactNode } from "react";

import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import type { AdminTruthState } from "@/lib/admin-truth-state";
import { cn } from "@/lib/utils";

type AdminMetricTone = "neutral" | "good" | "warn" | "bad";

function getToneClasses(tone: AdminMetricTone) {
  if (tone === "good") return "border-emerald-400/20 bg-emerald-500/10";
  if (tone === "warn") return "border-amber-400/20 bg-amber-500/10";
  if (tone === "bad") return "border-red-400/20 bg-red-500/10";
  return "border-white/10 bg-white/[0.04]";
}

export function AdminMetricCard({
  label,
  value,
  meta,
  truthState,
  hasUsableValue,
  pendingInitialLoad,
  tone = "neutral",
  className,
  valueClassName,
  badgeClassName,
  showTruthBadge = true,
  auxiliaryBadges,
  icon,
}: {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  truthState: AdminTruthState;
  hasUsableValue: boolean;
  pendingInitialLoad?: boolean;
  tone?: AdminMetricTone;
  className?: string;
  valueClassName?: string;
  badgeClassName?: string;
  showTruthBadge?: boolean;
  auxiliaryBadges?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div
      className={cn("min-w-0 overflow-hidden rounded-[1.1rem] border p-3", getToneClasses(tone), className)}
      data-admin-metric-card-state={truthState}
      data-admin-metric-card-has-value={hasUsableValue ? "true" : "false"}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-gray-400">
          {icon}
          <span className="truncate">{label}</span>
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {auxiliaryBadges}
          {showTruthBadge ? (
            <AdminTruthBadge
              state={truthState}
              className={cn("py-0.5", badgeClassName)}
              pendingInitialLoad={pendingInitialLoad}
              hasUsableValue={hasUsableValue}
            />
          ) : null}
        </div>
      </div>
      <div className={cn("mt-1.5 break-words text-xl font-black text-white md:text-2xl", valueClassName)}>{value}</div>
      {meta ? <div className="mt-1 break-words text-xs text-gray-400">{meta}</div> : null}
    </div>
  );
}
