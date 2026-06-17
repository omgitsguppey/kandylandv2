"use client";

import {
  getAdminReviewBadgeClasses,
  getAdminReviewLabel,
  type AdminReviewBadgeDecision,
} from "@/lib/behavioral/review-badge-rules";
import { cn } from "@/lib/utils";

export function AdminReviewBadge({
  decision,
  className,
}: {
  decision: AdminReviewBadgeDecision | null;
  className?: string;
}) {
  if (!decision) {
    return null;
  }

  return (
    <span
      title={decision.summary}
      aria-label={`${decision.label}. ${decision.reasonCode}. ${decision.summary}`}
      data-admin-review-severity={decision.severity}
      data-admin-review-reason={decision.reasonCode}
      className={cn(
        "inline-flex rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
        getAdminReviewBadgeClasses(decision.severity),
        className,
      )}
    >
      {getAdminReviewLabel(decision.severity)} · {decision.label}
    </span>
  );
}
