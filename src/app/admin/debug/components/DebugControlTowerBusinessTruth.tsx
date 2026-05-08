"use client";

import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import type { AdminTruthState } from "@/lib/admin-truth-state";
import type { AdminUserTruthSnapshot } from "@/lib/admin-user-truth-contract";

function SummaryMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
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

export function DebugControlTowerBusinessTruth({
  businessSnapshot,
  truthState,
}: {
  businessSnapshot: AdminUserTruthSnapshot;
  truthState: AdminTruthState;
}) {
  return (
    <div
      className="rounded-[1.2rem] border border-white/10 bg-black/25 p-3"
      data-debug-report-source="canonical-business-truth"
      data-debug-truth-state={truthState}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-white">Canonical Business Truth</h3>
          <p className="text-xs text-gray-400">
            User, purchase, revenue, unwrap, and watch metrics come from the admin-user truth snapshot and do not inherit ops-health status.
          </p>
        </div>
        <AdminTruthBadge state={truthState} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <SummaryMetric label="Users" value={businessSnapshot.totalUsers} />
        <SummaryMetric label="Purchases" value={businessSnapshot.verifiedPurchases} />
        <SummaryMetric label="Revenue" value={formatCompactCurrency(businessSnapshot.totalRevenueUsd)} />
        <SummaryMetric label="Unwraps" value={businessSnapshot.trackedUnwraps} />
        <SummaryMetric label="Watch" value={formatCompactWatchTime(businessSnapshot.validWatchTimeMs)} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-300">
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
          freshness {businessSnapshot.sourceFreshness}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
          truth {businessSnapshot.sourceTruth}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
          confidence {businessSnapshot.confidenceScore}%
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
          generated {formatRelative(businessSnapshot.generatedAt)}
        </span>
      </div>
      {businessSnapshot.issues.length > 0 ? (
        <div className="mt-3 space-y-2">
          {businessSnapshot.issues.slice(0, 4).map((issue) => (
            <div key={issue.code} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-300">
              <p className="font-semibold text-white">{issue.severity}</p>
              <p className="mt-1">{issue.message}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
