"use client";

import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import type { AdminTruthState } from "@/lib/admin-truth-state";
import { cn } from "@/lib/utils";

type AdminMetricTone = "neutral" | "good" | "warn" | "bad";

function getToneClasses(tone: AdminMetricTone) {
  if (tone === "good") return "border border-success/20";
  if (tone === "warn") return "border border-warning/20";
  if (tone === "bad") return "border border-destructive/20";
  return "";
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
    <Card
      className={cn("min-w-0 gap-0 p-3 shadow-none", getToneClasses(tone), className)}
      data-admin-metric-card-state={truthState}
      data-admin-metric-card-has-value={hasUsableValue ? "true" : "false"}
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-muted-foreground">
          {icon}
          <span className="min-w-0 break-words">{label}</span>
        </p>
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1 *:min-w-0 *:max-w-full *:whitespace-normal *:break-words">
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
      <div className={cn("mt-2 break-words text-2xl font-semibold tabular-nums text-card-foreground", valueClassName)}>{value}</div>
      {meta ? <div className="mt-1 break-words text-sm text-muted-foreground">{meta}</div> : null}
    </Card>
  );
}
