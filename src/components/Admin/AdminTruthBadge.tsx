"use client";

import { LAUNCH_BADGE_CONTAINMENT_CLASSNAME } from "@/lib/design-system";
import {
  getAdminTruthStateBadgeLabel,
  getAdminTruthStateClasses,
  getAdminTruthStateDescription,
  type AdminTruthState,
} from "@/lib/admin-truth-state";
import { cn } from "@/lib/utils";

export function AdminTruthBadge({
  state,
  className,
  title,
  label,
  pendingInitialLoad,
  hasUsableValue,
}: {
  state: AdminTruthState;
  className?: string;
  title?: string;
  label?: string;
  pendingInitialLoad?: boolean;
  hasUsableValue?: boolean;
}) {
  const badgeLabel = label ?? getAdminTruthStateBadgeLabel(state, { pendingInitialLoad, hasUsableValue });
  const description = getAdminTruthStateDescription(state);

  return (
    <span
      title={title ?? description}
      aria-label={`${badgeLabel}. ${description}`}
      data-admin-truth-state={state}
      data-admin-truth-has-usable-value={hasUsableValue ? "true" : "false"}
      data-admin-truth-pending-initial-load={pendingInitialLoad ? "true" : "false"}
      className={cn(
        "inline-flex rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
        LAUNCH_BADGE_CONTAINMENT_CLASSNAME,
        getAdminTruthStateClasses(state),
        className,
      )}
    >
      {badgeLabel}
    </span>
  );
}
