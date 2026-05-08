"use client";

import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import type { AdminDebugRuntimeEvidenceGroup } from "@/lib/admin-debug-control-tower";

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
