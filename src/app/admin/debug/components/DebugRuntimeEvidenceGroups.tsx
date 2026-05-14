"use client";

import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import type { AdminDebugRuntimeEvidenceGroup } from "@/lib/admin-debug-control-tower";
import { Pill, Section } from "./DebugPrimitives";

type AdminAnalyticsRecoveryEvidenceLane = {
  laneKey: string;
  title?: string;
  sourcePath?: string;
  firstSurfaceTarget?: string;
  sourceTruthLabel?: string;
  sourceConfidence?: string;
  confidenceLabel?: string;
  consentRequirement?: string;
  blockedBy?: string[];
  recommendedAction?: string;
  canSurfaceInAdminAnalytics?: boolean;
  canSurfaceInAdminDebug?: boolean;
  canBackfillLater?: boolean;
  productionAllowedNow?: boolean;
  adminAnalyticsPromotedNow?: boolean;
  adminAnalyticsPromotionState?: string;
  labels?: string[];
  mappingWarnings?: string[];
};

type AdminAnalyticsRecoveryEvidence = {
  evidenceState?: string;
  sourceReport?: {
    path?: string;
    generatedAtUtc?: string | null;
    currentHead?: string | null;
  };
  summary?: {
    laneCount?: number;
    requiredLanesMissing?: string[];
    debugFirstCount?: number;
    adminAnalyticsEligibleLaterCount?: number;
    adminAnalyticsPromotedNowCount?: number;
    productionAllowedNow?: boolean;
  };
  lanes?: AdminAnalyticsRecoveryEvidenceLane[];
  requiredLabels?: string[];
};

function formatRelative(value?: number | null) {
  if (!value) return "Not generated";
  const deltaMs = Math.max(0, Date.now() - value);
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function DebugRuntimeEvidenceGroups({
  groups,
  debugEvidenceSource,
}: {
  groups: AdminDebugRuntimeEvidenceGroup[];
  debugEvidenceSource: "firestore" | "generated" | "unavailable";
}) {
  const truthState = groups.some((group) => group.truthState === "failed") ? "failed" : "stale";

  return (
    <div
      className="rounded-[1.2rem] border border-white/10 bg-black/25 p-3"
      data-debug-report-source={debugEvidenceSource}
      data-debug-truth-state={truthState}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-white">Runtime Evidence Groups</h3>
          <p className="text-xs text-gray-400">
            Runtime evidence is grouped by fingerprint and source before it reaches the live issue list.
          </p>
        </div>
        <AdminTruthBadge state={truthState} />
      </div>
      <div className="mt-3 grid gap-2">
        {groups.slice(0, 6).map((group) => (
          <details
            key={group.id}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-gray-200"
            data-debug-truth-state={group.truthState}
          >
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">{group.fingerprint}</p>
                  <p className="text-xs text-gray-400">
                    {group.source} | {group.categories.join(", ")} | {group.occurrenceCount}x | {formatRelative(group.lastSeenAt)}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-gray-100">
                  {group.issueCount} records
                </span>
              </div>
            </summary>
            <div className="mt-2 space-y-2 border-t border-white/10 pt-2 text-xs text-gray-300">
              {group.routes.length > 0 ? <p>Routes: {group.routes.join(", ")}</p> : null}
              {group.components.length > 0 ? <p>Components: {group.components.join(", ")}</p> : null}
              {group.issues.slice(0, 3).map((issue) => (
                <div key={`${group.id}-${issue.id}`} className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2">
                  <p className="font-semibold text-white">{issue.humanMessage}</p>
                  <p className="mt-1">{issue.category} | {issue.route ?? issue.component ?? issue.source}</p>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

export function DebugRecoveryEvidenceSummary({
  recoveryEvidence,
}: {
  recoveryEvidence?: AdminAnalyticsRecoveryEvidence | null;
}) {
  const lanes = recoveryEvidence?.lanes ?? [];
  const summary = recoveryEvidence?.summary;
  const missingRequired = summary?.requiredLanesMissing ?? [];
  const productionAllowedNow = summary?.productionAllowedNow === true;
  const promotedNow = summary?.adminAnalyticsPromotedNowCount ?? 0;
  const truthState = recoveryEvidence?.evidenceState === "available" ? "stale" : "unavailable";
  const sourceReportPath = recoveryEvidence?.sourceReport?.path ?? "agent/state/lost-data-recovery-dry-run.generated.json";
  const sourceGeneratedAt = recoveryEvidence?.sourceReport?.generatedAtUtc ?? "unavailable";
  const detailRows = lanes.slice(0, 12);

  return (
    <div
      data-admin-debug-recovery-evidence="recovery_evidence_debug_first"
      data-admin-debug-recovery-production-allowed={String(productionAllowedNow)}
      data-admin-debug-recovery-promoted-now={promotedNow}
      data-admin-debug-recovery-summary-compact="true"
      data-admin-debug-recovery-details-default="collapsed"
    >
      <Section
        title="Analytics recovery evidence"
        subtitle="Compact Debug-first recovery status. Details stay collapsed until review is needed."
        defaultOpen={false}
        summary={(
          <>
            <Pill label="Lanes" value={summary?.laneCount ?? lanes.length} tone="neutral" truthState={truthState} badgeLabel={truthState === "stale" ? "DEBUG" : "UNAVAILABLE"} />
            <Pill label="Debug-first" value={summary?.debugFirstCount ?? 0} tone="warn" truthState="stale" badgeLabel="REVIEW" />
            <Pill label="Eligible later" value={summary?.adminAnalyticsEligibleLaterCount ?? 0} tone="neutral" truthState="stale" badgeLabel="LATER" />
            <Pill label="Promoted now" value={promotedNow} tone={promotedNow ? "bad" : "good"} truthState={promotedNow ? "failed" : "stale"} badgeLabel={promotedNow ? "BAD" : "NONE"} />
            <Pill label="Backfill" value="productionAllowedNow=false" tone={productionAllowedNow ? "bad" : "good"} truthState={productionAllowedNow ? "failed" : "stale"} badgeLabel={productionAllowedNow ? "BAD" : "OFF"} />
          </>
        )}
      >
        <div className="space-y-3 text-sm text-gray-300" data-admin-debug-recovery-no-scrollwrap="true">
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            Generated recovery evidence is a Debug snapshot, not live product truth. Keep recovered values review-only until a later promotion pass.
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs">
            <p className="font-semibold text-white">Source report</p>
            <p>{sourceReportPath}</p>
            <p>generatedAtUtc {sourceGeneratedAt}</p>
            {missingRequired.length > 0 ? <p className="mt-2 text-amber-100">Missing required lanes: {missingRequired.join(", ")}</p> : null}
          </div>

          <details
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
            data-admin-debug-recovery-details="collapsed_by_default"
          >
            <summary className="cursor-pointer text-sm font-semibold text-white">
              Recovery details ({detailRows.length} lanes)
            </summary>
            <div className="mt-3 divide-y divide-white/10 text-xs text-gray-300">
              {detailRows.map((lane) => {
                const blockerCount = lane.blockedBy?.length ?? 0;
                const promotionState = lane.adminAnalyticsPromotedNow
                  ? "promoted"
                  : lane.adminAnalyticsPromotionState ?? "not_promoted";

                return (
                  <div
                    key={lane.laneKey}
                    className="grid gap-2 py-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                    data-admin-debug-recovery-lane-key={lane.laneKey}
                    data-admin-debug-recovery-admin-analytics-promotion={lane.adminAnalyticsPromotedNow ? "promoted" : "not_promoted"}
                    data-admin-debug-recovery-lane-detail-default="collapsed"
                  >
                    <p className="font-semibold text-white">{lane.laneKey}</p>
                    <p>{lane.sourceTruthLabel ?? "debug_only"}</p>
                    <p>{lane.consentRequirement ?? "needs_review"}</p>
                    <p className="text-gray-400">{promotionState} | blockers {blockerCount}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Full labels, mapping warnings, recommended actions, and source metadata remain in the Admin Debug API payload.
            </p>
          </details>
        </div>
      </Section>
    </div>
  );
}
