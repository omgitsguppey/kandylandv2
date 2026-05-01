# Human-Readable Admin Truth

The codebase must have eyes. Admin UI copy is for operators, not developers. Debug copy is for evidence.

## Doctrine

Primary admin surfaces must explain what changed, whether the data is usable, and what to do next. They must not expose backend source names, route names, collection names, raw event keys, lane names, stack language, or unexplained "degraded" and "fallback" labels.

Debug must keep the exact technical evidence. Do not hide real failures. Do not make bad states sound good. Do not remove formulas, source paths, collection names, timing, confidence, or parity deltas from Debug.

## Required Status Fields

Every admin status needs:

- Operator summary
- Impact
- Recommended action or "No action needed"
- Technical evidence
- Source details
- Debug location

Use `src/lib/admin-copy/admin-truth-copy.ts` and `src/lib/admin-copy/admin-copy-registry.ts` for new status copy. Do not hand-roll copy in feature files unless the shared helper does not cover the state; add the state to the registry first.

## Main UI Rules

Allowed main UI language includes Live, Updated, Refreshing, Showing last verified data, Delayed, Estimated, Partial, Waiting for first snapshot, Needs review, Unavailable, No sample, Source mismatch, Open in Debug, and Refresh.

Badges must stay short: LIVE, UPDATED, REFRESHING, DELAYED, EST, PARTIAL, WAIT, REVIEW, ERROR, SNAP.

Waiting is allowed only when no verified snapshot exists. Showing last verified data is the correct copy when a verified snapshot is available but live updates, refresh, or source parity is delayed.

## Debug-Only Language

The following terms are banned from primary admin UI and may appear only in Debug technical evidence with an operator summary:

- failed closed
- polled route snapshot
- realtime lane
- canonical rollup
- canonical authenticated events
- canonical event samples
- analytics_aggregate
- raw Firestore paths
- route paths
- truth score
- pipeline health fail
- module coverage fail
- stale validated backend cache

## Before And After

- Before: "Realtime analytics observers failed closed."
  After: "Live updates are delayed. Showing last verified data."

- Before: "Guest batch realtime lane fell back to polled data."
  After: "Guest traffic is estimated for this range."

- Before: "Purchase parity fail."
  After: "Purchase tracking needs review."

- Before: "0 canonical event samples."
  After: "No sample is available for this range."

## Agent Rule

Future agents must not pipe raw backend diagnostics into primary admin UI. Put exact source detail in Debug, and pair it with What this means, Why it matters, What to check next, Technical evidence, and Source details.

## Launch Finalization Addendum

Admin Analytics is the operator view. Admin Debug is the evidence view.

- Snapshot-backed Analytics values stay visible through refresh, realtime delay, and source caveats.
- Waiting is visible only before the first verified snapshot.
- The main UI may say "Live updates are delayed. Showing last verified data." or "Realtime delayed. Showing last verified snapshot." but must not expose listener, route, collection, lane, or rollup jargon.
- Debug must keep the exact technical evidence for refresh, parity, legacy recovery, commerce formulas, task lifecycle, notification dedupe/read state, and actor lane separation.
