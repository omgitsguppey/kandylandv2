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
    <div className="relative overflow-hidden rounded-[1.45rem] border border-fuchsia-200/15 bg-[linear-gradient(145deg,rgba(59,21,84,0.7),rgba(12,8,24,0.92))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-100/55">{title}</p>
          <p className="mt-1 text-lg font-black tracking-tight text-white">{explanation.verdict}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminReviewBadge decision={reviewDecision ?? null} className="py-0.5" />
          <AdminTruthBadge
            state={explanation.truthState}
            className="py-0.5"
            hasUsableValue={explanation.verdict.trim().length > 0}
          />
          <span className="inline-flex items-center rounded-full border border-fuchsia-200/20 bg-fuchsia-200/[0.1] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-fuchsia-100">
            {explanation.statusLabel}
          </span>
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-200">
            {explanation.confidenceLabel} {explanation.confidenceScore}%
          </span>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-violet-100/76">{explanation.summary}</p>
      {explanation.reasons.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs leading-5 text-violet-100/70">
          {explanation.reasons.slice(0, 3).map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
        </div>
      ) : null}
      <details className="mt-3 rounded-[1.05rem] border border-white/10 bg-black/20 p-3">
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
