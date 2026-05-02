"use client";

import { useMemo, useState } from "react";

import {
  formatCreatorOnboardingHistoryEventSummary,
  type CreatorOnboardingHistoryEntry,
} from "@/lib/creator-onboarding";

type CreatorAuditTrailPanelProps = {
  history: CreatorOnboardingHistoryEntry[];
  onEventExpanded?: (entry: CreatorOnboardingHistoryEntry) => void;
};

function formatTimestamp(value: number | undefined) {
  if (!value || !Number.isFinite(value)) {
    return "Not recorded";
  }

  return new Date(value).toLocaleString();
}

function buildTechnicalMetadata(entry: CreatorOnboardingHistoryEntry) {
  return {
    eventType: entry.eventType,
    actorId: entry.actorId,
    actorRole: entry.actorRole,
    actorLabel: entry.actorLabel,
    targetUserId: entry.targetUserId,
    targetCreatorId: entry.targetCreatorId,
    agreementVersion: entry.agreementVersion,
    agreementHash: entry.agreementHash,
    ip: entry.ip,
    userAgent: entry.userAgent,
    actorMarker: entry.actorMarker,
    metadata: entry.metadata,
  };
}

export function CreatorAuditTrailPanel({
  history,
  onEventExpanded,
}: CreatorAuditTrailPanelProps) {
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [expandedEventKeys, setExpandedEventKeys] = useState<Set<string>>(() => new Set());
  const visibleHistory = useMemo(
    () => (showFullHistory ? history : history.slice(0, 3)),
    [history, showFullHistory],
  );

  return (
    <div className="mt-4 space-y-4" data-audit-trail-default-count="3">
      <p className="text-sm leading-6 text-zinc-400">
        Every intake, agreement, ID, approval, and owner action is recorded here.
      </p>

      {history.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-500">
          No audit trail entries are available for this creator yet.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleHistory.map((entry) => (
            <article
              key={`${entry.eventType}-${entry.timestamp}-${entry.actorId}`}
              className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {formatCreatorOnboardingHistoryEventSummary(entry)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatTimestamp(entry.timestamp)} by {entry.actorLabel}
                  </p>
                </div>
                {entry.agreementVersion ? (
                  <p className="text-xs font-semibold text-zinc-400">
                    Agreement {entry.agreementVersion}
                  </p>
                ) : null}
              </div>
              {entry.detail ? (
                <p className="mt-2 text-xs leading-6 text-zinc-400">{entry.detail}</p>
              ) : null}
              <details
                className="mt-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2"
                onToggle={(event) => {
                  const eventKey = `${entry.eventType}-${entry.timestamp}-${entry.actorId}`;
                  if (event.currentTarget.open) {
                    setExpandedEventKeys((current) => {
                      const next = new Set(current);
                      next.add(eventKey);
                      return next;
                    });
                    onEventExpanded?.(entry);
                  }
                }}
              >
                <summary className="cursor-pointer list-none text-xs font-semibold text-zinc-300">
                  Details
                </summary>
                {expandedEventKeys.has(`${entry.eventType}-${entry.timestamp}-${entry.actorId}`) ? (
                  <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap text-[11px] leading-5 text-zinc-400">
                    {JSON.stringify(buildTechnicalMetadata(entry), null, 2)}
                  </pre>
                ) : null}
              </details>
            </article>
          ))}
        </div>
      )}

      {history.length > 3 ? (
        <button
          type="button"
          onClick={() => setShowFullHistory((current) => !current)}
          className="rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm font-semibold text-white"
        >
          {showFullHistory ? "Show latest 3" : "View full history"}
        </button>
      ) : null}
    </div>
  );
}
