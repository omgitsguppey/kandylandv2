# Admin Copy Style Guide

Admin copy has two audiences. Primary admin UI is for operators; Debug is for developers and evidence. Do not pipe backend, collection, route, lane, stack, or source jargon into primary cards.

## Allowed Main UI Terms

- Live
- Updated
- Refreshing
- Showing last verified data
- Delayed
- Estimated
- Partial
- Waiting for first snapshot
- Needs review
- Unavailable
- No sample
- Source mismatch
- Open in Debug
- Refresh

Short badges must use only: LIVE, UPDATED, REFRESHING, DELAYED, EST, PARTIAL, WAIT, REVIEW, ERROR, SNAP.

## Debug-Only Terms

These words can appear in Debug technical evidence only when paired with an operator summary:

- failed closed
- polled route snapshot
- realtime lane
- observer
- canonical rollup
- canonical authenticated events
- canonical event samples
- backend cache path
- collection names
- route names
- raw Firestore paths
- raw event keys as primary labels
- truth score
- pipeline health fail
- module coverage fail
- telemetry captured X events vs canonical rollups
- degraded as a standalone unexplained state
- fallback as an unexplained standalone state
- stale validated backend cache
- analytics_aggregate
- implementation-specific jargon

## Translation Examples

- "Realtime analytics observers failed closed" -> "Live updates are delayed."
- "Admin analytics is falling back to the polled route snapshot" -> "Showing last verified data."
- "Guest batch realtime lane fell back to polled data" -> "Guest activity is delayed."
- "Historical analytics serving stale validated cache" -> "Showing last verified historical data."
- "Purchase parity fail" -> "Purchase tracking needs review."
- "Unlock parity fail" -> "Unlock tracking needs review."
- "0 canonical event samples" -> "No sample is available for this range."
- "Module coverage fail" -> "Some analytics modules do not have verified data yet."

## Required Shape

Every admin status needs:

- Operator summary: one short sentence that says what the operator is seeing.
- Impact: why it matters in business or operational terms.
- Recommended action: a next step or "No action needed."
- Technical evidence: exact route, source, collection, formula, event key, timing, confidence, or parity detail.
- Debug path: where a developer can inspect the evidence.

Primary UI copy should be one to two short lines. Technical details belong in Debug details, titles, or `details` sections, not primary module copy.

## Launch Finalization Addendum

For Admin Overview, Admin Analytics, and Admin Debug launch work:

- Analytics primary copy must prefer "Showing last verified data", "Refreshing", "Live updates are delayed", "Estimated", "Partial", "Needs review", or "Waiting for first snapshot".
- Debug owns exact source names, route names, collection names, parity deltas, formulas, and recovery details.
- A verified snapshot means the main UI must not show generic Waiting.
- Event Mix visible copy says ranked event activity; raw event keys belong in Debug.
- Commerce copy must state that promo and bonus GD are excluded from revenue when revenue is shown.
- Admin Overview truth labels are Updated, Showing last verified data, Refreshing overview, Snapshot refresh delayed, and Waiting for first overview snapshot.

## User Problem-State Copy

Use the shared problem-state helper for visible user failures:

- Page errors: "Page could not load. Refresh the page or retry the last action."
- Payment verification: "Checkout could not be verified. Your wallet was not changed."
- Unlock failure: "Drop could not be unwrapped. Your GumDrops were not charged."
- Notification load failure: "Notifications are unavailable. Refresh this panel to check for new updates."

Do not show raw API messages, route names, environment variable names, exception text, or provider/debug strings as primary user copy. The raw reason belongs in diagnostics and telemetry.
