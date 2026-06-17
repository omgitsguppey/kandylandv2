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
  loading: "border-brand-purple/30 bg-brand-purple/10 text-[#e4d4ff]",
  live: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  cached: "border-brand-purple/30 bg-brand-purple/10 text-[#e4d4ff]",
  degraded: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  fallback: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  stale: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  unavailable: "border-gray-500/30 bg-gray-500/10 text-gray-300",
  failed: "border-red-500/30 bg-red-500/10 text-red-300",
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
      title={title ?? `${getAdminStatusExplanation(state)} Debug: ${ADMIN_SURFACE_STATE_DETAIL[state]}`}
      aria-label={accessibleLabel}
      className={cn(
        "inline-flex rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
        LAUNCH_BADGE_CONTAINMENT_CLASSNAME,
        STATE_STYLES[state],
        className,
      )}
    >
      {operatorLabel}
    </span>
  );
}
