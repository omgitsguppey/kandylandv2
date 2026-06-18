# Admin Analytics Launch Final

Status: launch finalization doctrine  
Last updated: 2026-05-01

## Launch Rules

- Verified snapshot first: Admin Analytics modules render the latest verified snapshot or hot-cache payload before realtime, polling, or refresh upgrades.
- Realtime is an upgrade: listener failures annotate the module and Debug metadata; they do not blank snapshot-backed values.
- Refresh never clears current data: manual and background refresh keep the current verified snapshot visible until a verified replacement is written.
- No generic Waiting: Waiting is allowed only when no verified snapshot exists, and the copy must say why.
- No fake zeros: missing values stay unavailable/null until a source proves zero.
- Operator copy in Analytics: main UI uses short plain-English status lines and approved badges.
- Technical evidence in Debug: route names, collection names, formulas, parity deltas, raw event keys, source paths, and recovery detail belong in Admin Debug.
- Data Validation belongs in Debug: Analytics may show only compact Data Health summary or an Open in Debug action.

## Module Rules

- Admin Overview uses operator truth labels: Updated, Last verified data, Refreshing overview, Refresh due, and Collecting activity.
- Platform Pulse, Audience Snapshot, Commerce Snapshot, and Live Pulse must use snapshot values before realtime or refresh state.
- Live Pulse uses snapshot when realtime is missing and scopes graph gaps to the graph area.
- Guest estimates are labeled. Guest/auth/admin/creator/system lanes must remain separated in Debug.
- Authenticated-only data is not total audience. If only signed-in traffic exists, the UI must say signed-in or identified.
- Revenue means completed real-money purchases. Promo, bonus, and admin grants are excluded from revenue and exposed as separate GD/promo fields.
- Task pipeline uses lifecycle truth and parity. Assignment, start, completion, reminder, guide, and failure states must not be collapsed into one fake pass state.
- Event Mix is a ranked list. It must not become a giant chart, and raw event keys stay in Debug.
- Notification dedupe/read truth is required. Notification Funnel reports prompted, enabled, sent, opened, read, cleared, duplicates prevented, skips, and read persistence truth without fake zeros.

## Debug Contract

Admin Debug must expose:

- snapshot keys, source modes, truth states, generated and verified timestamps
- refresh status, duplicate refresh prevention, and refresh failure detail
- parity and legacy recovery metadata
- actor lane separation and admin exclusion proof
- commerce formulas and revenue exclusion rules
- task lifecycle source detail and parity deltas
- notification dedupe, queued-return-live, read, clear, and skip evidence
- Data Validation full list with PASS blocking reasons when data is missing

## Future-Agent Rule

Do not move technical evidence back into Analytics. Do not make stale data look live. Do not blank a verified snapshot because refresh or realtime is delayed. Do not add an Admin Analytics module without snapshot registry metadata, Debug evidence, operator copy, fake-zero protection, and a targeted validation guard.
