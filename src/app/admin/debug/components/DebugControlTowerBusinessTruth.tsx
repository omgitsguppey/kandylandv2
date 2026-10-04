"use client";

import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import { ADMIN_NO_SOURCE_LABEL, resolveAdminInputTruthState, type AdminTruthState } from "@/lib/admin-truth-state";
import { AdminMetricCard } from "@/components/Admin/AdminMetricCard";
import type { AdminUserTruthSnapshot } from "@/lib/admin-user-truth-contract";
import {
  classifyCanonicalBusinessTruthStatus,
  type CanonicalBusinessTruthStatus,
} from "@/lib/debug/canonical-business-truth-status";
import { formatRelative } from "./DebugTime";

function SummaryMetric({ label, value, truthState }: { label: string; value: string | number; truthState: AdminTruthState }) {
  const resolvedTruth = resolveAdminInputTruthState({ truthState, value });
  return (
    <AdminMetricCard label={label} value={resolvedTruth.hasUsableValue ? value : ADMIN_NO_SOURCE_LABEL}
      truthState={resolvedTruth.truthState} hasUsableValue={resolvedTruth.hasUsableValue} showTruthBadge={false} />
    );
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactWatchTime(valueMs: number) {
  const totalMinutes = Math.round(valueMs / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function statusToTruthState(status: CanonicalBusinessTruthStatus, fallback: AdminTruthState): AdminTruthState {
  if (status === "healthy_current") return "live";
  if (status === "low_confidence_review" || status === "formal_admin_sample_required") return "review";
  if (status === "source_ready_stale_snapshot" || status === "stale_artifact_refresh_required") return "stale";
  if (status === "source_missing_actionable") return "unavailable";
  return fallback;
}

function labelSourceClass(value: string) {
  return value.replace(/_/gu, " ");
}

export function DebugControlTowerBusinessTruth({
  businessSnapshot,
  truthState,
}: {
  businessSnapshot: AdminUserTruthSnapshot;
  truthState: AdminTruthState;
}) {
  const statusDecision = classifyCanonicalBusinessTruthStatus({
    generatedAt: businessSnapshot.generatedAt,
    sourceFreshness: businessSnapshot.sourceFreshness,
    sourceTruth: businessSnapshot.sourceTruth,
    confidenceScore: businessSnapshot.confidenceScore,
    issues: businessSnapshot.issues,
    totalUsers: businessSnapshot.totalUsers,
    verifiedPurchases: businessSnapshot.verifiedPurchases,
    totalRevenueUsd: businessSnapshot.totalRevenueUsd,
    trackedUnwraps: businessSnapshot.trackedUnwraps,
    validWatchTimeMs: businessSnapshot.validWatchTimeMs,
    formalAdminSampleStatus: businessSnapshot.issues.some((issue) => /formal|sample/iu.test(issue.message))
      ? "missing_formal_artifact"
      : null,
    watchTimeSource: businessSnapshot.sourceTruthBreakdown.watchTime === "legacy_fallback"
      ? "legacy_page_duration"
      : businessSnapshot.validWatchTimeMs > 0
        ? "valid_watch_time"
        : "unavailable",
  });
  const badgeState = statusToTruthState(statusDecision.status, truthState);

  return (
    <div
      className="min-w-0 space-y-4 border-t border-border py-4"
      data-debug-report-source="canonical-business-truth"
      data-debug-truth-state={badgeState}
      data-business-truth-status={statusDecision.status}
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">Canonical Business Truth</h3>
          <p className="text-xs text-muted-foreground">
            User, purchase, revenue, unwrap, and watch metrics come from the admin-user truth snapshot and do not inherit ops-health status.
          </p>
        </div>
        <AdminTruthBadge state={badgeState} />
      </div>
      <div className="mt-3 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3">
        <SummaryMetric truthState={badgeState} label="Users" value={businessSnapshot.totalUsers} />
        <SummaryMetric truthState={badgeState} label="Purchases" value={businessSnapshot.verifiedPurchases} />
        <SummaryMetric truthState={badgeState} label="Revenue" value={formatCompactCurrency(businessSnapshot.totalRevenueUsd)} />
        <SummaryMetric truthState={badgeState} label="Unwraps" value={businessSnapshot.trackedUnwraps} />
        <SummaryMetric truthState={badgeState} label="Watch" value={formatCompactWatchTime(businessSnapshot.validWatchTimeMs)} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
        <span className="text-sm">
          freshness {businessSnapshot.sourceFreshness}
        </span>
        <span className="text-sm">
          truth {businessSnapshot.sourceTruth}
        </span>
        <span className="text-sm">
          confidence {businessSnapshot.confidenceScore}%
        </span>
        <span className="text-sm">
          generated {formatRelative(businessSnapshot.generatedAt)}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
        <span className="text-sm text-warning">
          {statusDecision.freshnessExplanation}
        </span>
        {statusDecision.confidenceReviewRequired ? (
          <span className="text-sm text-warning">
            Confidence {businessSnapshot.confidenceScore}%: review required
          </span>
        ) : null}
        <span className="text-sm">
          Revenue source: {labelSourceClass(statusDecision.revenueSourceClass)}
        </span>
        <span className="text-sm">
          Watch source: {labelSourceClass(statusDecision.watchSourceClass)}
        </span>
      </div>
      {businessSnapshot.issues.length > 0 ? (
        <div className="mt-3 space-y-2">
          {businessSnapshot.issues.slice(0, 4).map((issue) => (
            <div key={issue.code} className="min-w-0 space-y-1 border-b border-border py-3 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">{issue.severity}</p>
              <p className="mt-1">{issue.message}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
