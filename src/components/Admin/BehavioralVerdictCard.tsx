"use client";

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
    <div className="rounded-[1.25rem] border border-white/10 bg-black/25 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">{title}</p>
          <p className="mt-1 text-sm font-black text-white">{explanation.verdict}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminReviewBadge decision={reviewDecision ?? null} className="py-0.5" />
          <AdminTruthBadge
            state={explanation.truthState}
            className="py-0.5"
            hasUsableValue={explanation.verdict.trim().length > 0}
          />
          <span className="inline-flex items-center rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-purple">
            {explanation.statusLabel}
          </span>
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-200">
            {explanation.confidenceLabel} {explanation.confidenceScore}%
          </span>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-gray-300">{explanation.summary}</p>
      {explanation.reasons.length > 0 ? (
        <div className="mt-3 space-y-1 text-xs leading-5 text-gray-400">
          {explanation.reasons.slice(0, 3).map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
        </div>
      ) : null}
      <details className="mt-3 rounded-[1rem] border border-white/10 bg-black/20 p-3">
        <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-300">
          Why this verdict?
        </summary>
        <div className="mt-3 space-y-2 text-xs leading-5 text-gray-400">
          {explanation.debugFacts.map((fact) => (
            <p key={fact}>{fact}</p>
          ))}
          {details}
        </div>
      </details>
    </div>
  );
}
