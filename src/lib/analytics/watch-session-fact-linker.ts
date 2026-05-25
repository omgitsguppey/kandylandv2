export interface WatchSessionFactLinkInput {
  watchSessionIds: string[];
  sessionFactWatchSessionIds: string[];
  replayRecoveredSessionIds: string[];
  duplicateWatchSessionIds: string[];
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function classifyWatchSessionFactLinks(input: WatchSessionFactLinkInput) {
  const watchSessionIds = unique(input.watchSessionIds);
  const linkedIds = new Set(unique(input.sessionFactWatchSessionIds));
  const missingLinkedSessionIds = watchSessionIds.filter((id) => !linkedIds.has(id));
  const duplicateWatchSessionIds = unique(input.duplicateWatchSessionIds);
  const replayRecoveredSessionIds = unique(input.replayRecoveredSessionIds);
  const state = duplicateWatchSessionIds.length > 0
    ? "fail" as const
    : missingLinkedSessionIds.length > 0
      ? "review" as const
      : "pass" as const;

  return {
    state,
    watchSessionCount: watchSessionIds.length,
    linkedSessionFactCount: linkedIds.size,
    missingLinkedSessionIds,
    duplicateWatchSessionIds,
    replayRecoveredSessionIds,
    missingLinkReason: missingLinkedSessionIds.length > 0 ? "watch_session_fact_link_missing" as const : "none" as const,
    exactCapturePromotedFromReplay: false,
    nextAction: duplicateWatchSessionIds.length > 0
      ? "Repair watch session dedupe before using session fact linkage."
      : missingLinkedSessionIds.length > 0
        ? "Link session facts back to watchSessionId or viewerSessionId; keep replay-recovered sessions labeled."
        : "No action required.",
  };
}
