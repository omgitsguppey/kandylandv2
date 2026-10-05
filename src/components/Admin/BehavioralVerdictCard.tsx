"use client";

import { DisclosureSummary } from "@/components/ui/disclosure";
import { Disclosure } from "@/components/ui/disclosure";
import { Surface } from "@/components/ui/content-layout";


import type { ReactNode } from "react";

import { AdminReviewBadge } from "@/components/Admin/AdminReviewBadge";
import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import type { BehavioralVerdictExplanation } from "@/lib/behavioral/behavioral-explanation";
import type { AdminReviewBadgeDecision } from "@/lib/behavioral/review-badge-rules";

export function BehavioralVerdictCard({
  title,
  explanation,
  details,
  reviewDecision,
}: {
  title: string;
  explanation: BehavioralVerdictExplanation;
  details?: ReactNode;
  reviewDecision?: AdminReviewBadgeDecision | null;
}) {
  return (
    <Surface className="relative overflow-hidden rounded-[1.45rem] border border-primary/15 bg-card px-4 py-4 shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary/55">{title}</p>
          <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">{explanation.verdict}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminReviewBadge decision={reviewDecision ?? null} className="py-0.5" />
          <AdminTruthBadge
            state={explanation.truthState}
            className="py-0.5"
            hasUsableValue={explanation.verdict.trim().length > 0}
          />
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/[0.1] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
            {explanation.statusLabel}
          </span>
          <span className="inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground">
            {explanation.confidenceLabel} {explanation.confidenceScore}%
          </span>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-primary/76">{explanation.summary}</p>
      {explanation.reasons.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs leading-5 text-primary/70">
          {explanation.reasons.slice(0, 3).map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
        </div>
      ) : null}
      <Disclosure className="mt-3 rounded-[1.05rem] border border-border bg-background/20 p-3">
        <DisclosureSummary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Why this verdict?
        </DisclosureSummary>
        <div className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
          {explanation.debugFacts.map((fact) => (
            <p key={fact}>{fact}</p>
          ))}
          {details}
        </div>
      </Disclosure>
    </Surface>
  );
}
