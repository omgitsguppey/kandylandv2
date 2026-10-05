"use client";

import {
  ADMIN_SURFACE_STATE_DETAIL,
  formatAdminSurfaceStateLabel,
  type AdminSurfaceState,
} from "@/lib/admin-parity";
import { getAdminStatusBadgeLabel, getAdminStatusExplanation } from "@/lib/admin/copy/admin-truth-copy";
import { LAUNCH_BADGE_CONTAINMENT_CLASSNAME } from "@/lib/design-system";
import { cn } from "@/lib/utils";

const STATE_STYLES: Record<AdminSurfaceState, string> = {
  loading: "border-primary/30 bg-primary/10 text-primary",
  live: "border-success/30 bg-success/10 text-success",
  cached: "border-primary/30 bg-primary/10 text-primary",
  degraded: "border-warning/30 bg-warning/10 text-warning",
  fallback: "border-warning/30 bg-warning/10 text-warning",
  stale: "border-warning/30 bg-warning/10 text-warning",
  unavailable: "border-border bg-secondary text-muted-foreground",
  failed: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function AdminStatusBadge({
  state,
  className,
  title,
  label,
}: {
  state: AdminSurfaceState;
  className?: string;
  title?: string;
  label?: string;
}) {
  const fullLabel = formatAdminSurfaceStateLabel(state);
  const operatorLabel = label ?? getAdminStatusBadgeLabel(state);
  const accessibleLabel = `${fullLabel} ${getAdminStatusExplanation(state)} ${ADMIN_SURFACE_STATE_DETAIL[state]}`;

  return (
    <span
      title={title ?? `${getAdminStatusExplanation(state)} ${ADMIN_SURFACE_STATE_DETAIL[state]}`}
      aria-label={accessibleLabel}
      className={cn(
        "inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold normal-case tracking-normal",
        LAUNCH_BADGE_CONTAINMENT_CLASSNAME,
        STATE_STYLES[state],
        className,
      )}
    >
      {operatorLabel}
    </span>
  );
}
