import type { AdminTruthState } from "@/lib/admin-truth-state";
import { resolveAdminTruthState } from "@/lib/admin-truth-state";
import type { AdminUserTruthSnapshot } from "@/lib/admin-user-truth-contract";
import type { DebugEvidenceAuditSummary } from "@/lib/debug-evidence-contract";

const CONTROL_TOWER_BUSINESS_CONFIDENCE_THRESHOLD = 80;

export type AdminDebugRuntimeEvidenceGroup = {
  id: string;
  fingerprint: string;
  source: DebugEvidenceAuditSummary["source"];
  severity: DebugEvidenceAuditSummary["severity"];
  truthState: AdminTruthState;
  occurrenceCount: number;
  issueCount: number;
  lastSeenAt: number;
  categories: string[];
  routes: string[];
  components: string[];
  issues: DebugEvidenceAuditSummary[];
};

function hasUsableBusinessSnapshot(snapshot?: AdminUserTruthSnapshot | null) {
  return Boolean(
    snapshot
      && Number.isFinite(snapshot.totalUsers)
      && Number.isFinite(snapshot.verifiedPurchases)
      && Number.isFinite(snapshot.totalRevenueUsd)
      && Number.isFinite(snapshot.trackedUnwraps)
      && Number.isFinite(snapshot.validWatchTimeMs),
  );
}

export function resolveControlTowerBusinessTruthState(snapshot?: AdminUserTruthSnapshot | null): AdminTruthState {
  const hasUsableValue = hasUsableBusinessSnapshot(snapshot);
  const hasWarnIssue = Boolean(snapshot?.issues.some((issue) => issue.severity === "warn"));
  const hasFailIssue = Boolean(snapshot?.issues.some((issue) => issue.severity === "fail"));

  return resolveAdminTruthState({
    hasUsableValue,
    sourceConfigured: Boolean(snapshot),
    transportState: snapshot?.sourceFreshness ?? "unavailable",
    valueState: snapshot?.sourceTruth === "legacy_fallback" ? "legacy_fallback" : snapshot?.sourceFreshness ?? "unavailable",
    sourceIssue: hasWarnIssue || hasFailIssue,
    reviewRequired: hasWarnIssue,
    confidence: snapshot?.confidenceScore ?? null,
    confidenceThreshold: CONTROL_TOWER_BUSINESS_CONFIDENCE_THRESHOLD,
  });
}

function severityRank(severity: DebugEvidenceAuditSummary["severity"]) {
  if (severity === "critical") return 4;
  if (severity === "error") return 3;
  if (severity === "warn") return 2;
  return 1;
}

function dedupeText(items: Array<string | undefined>) {
  return [...new Set(items.filter((item): item is string => Boolean(item && item.trim().length > 0)))];
}

function issueTruthState(issue: DebugEvidenceAuditSummary): AdminTruthState {
  if (issue.severity === "critical") return "failed";
  if (issue.severity === "error") return "degraded";
  if (issue.severity === "warn") return "stale";
  return "live";
}

export function groupRuntimeEvidenceByFingerprintAndSource(
  issues: DebugEvidenceAuditSummary[],
): AdminDebugRuntimeEvidenceGroup[] {
  const grouped = new Map<string, DebugEvidenceAuditSummary[]>();

  for (const issue of issues) {
    const key = `${issue.source}:${issue.fingerprint}`;
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(issue);
    } else {
      grouped.set(key, [issue]);
    }
  }

  return [...grouped.entries()]
    .map(([key, bucket]) => {
      const sortedBucket = [...bucket].sort((left, right) => {
        const severityDelta = severityRank(right.severity) - severityRank(left.severity);
        if (severityDelta !== 0) return severityDelta;
        if (right.occurrenceCount !== left.occurrenceCount) return right.occurrenceCount - left.occurrenceCount;
        return right.lastSeenAt - left.lastSeenAt;
      });
      const lead = sortedBucket[0];

      return {
        id: key,
        fingerprint: lead.fingerprint,
        source: lead.source,
        severity: lead.severity,
        truthState: issueTruthState(lead),
        occurrenceCount: sortedBucket.reduce((total, issue) => total + issue.occurrenceCount, 0),
        issueCount: sortedBucket.length,
        lastSeenAt: Math.max(...sortedBucket.map((issue) => issue.lastSeenAt)),
        categories: dedupeText(sortedBucket.map((issue) => issue.category)),
        routes: dedupeText(sortedBucket.map((issue) => issue.route)),
        components: dedupeText(sortedBucket.map((issue) => issue.component)),
        issues: sortedBucket,
      };
    })
    .sort((left, right) => {
      const severityDelta = severityRank(right.severity) - severityRank(left.severity);
      if (severityDelta !== 0) return severityDelta;
      if (right.occurrenceCount !== left.occurrenceCount) return right.occurrenceCount - left.occurrenceCount;
      return right.lastSeenAt - left.lastSeenAt;
    });
}
