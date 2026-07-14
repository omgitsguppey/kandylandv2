# Guest-to-User Identity Transfer

Generated: 2026-07-14T07:11:53.852Z
Current head: dc4dad82c4ee6f08f8570c9efb2b9ba61fafafaa
Current head source: git
Git status: available
Tooling degraded: false

## Summary

- Link helper created: true
- Identity link route created: true
- Auth transition hook created: true
- Event contract identity state: true
- Idempotent client submission: true
- Route requires auth: true
- Historical guest events duplicated: false
- Cloud SQL status: cloud_sql_not_detected_in_transfer_runtime
- Gemini/Cloud Assist status: gemini_cloud_assist_not_involved

## Identity Semantics

- guest_only: Anonymous visitor/session activity remains guest-lane product truth.
- user_only: Authenticated activity without guest lineage remains direct user activity.
- guest_linked_to_user: Authenticated activity can carry preserved anonymous/session lineage through an identity link.
- unknown_legacy: Legacy or incomplete rows stay explicitly unknown until source evidence classifies them.

## Transfer Findings

- link-first-transfer [p2, implemented]: Store only identity association records; do not rewrite guest events as user events.
- auth-transition-client-submit [p2, implemented]: Submit one non-blocking identity link after login, signup, or session restore.
- event-fact-identity-state [p2, implemented]: Preserve guest lineage on authenticated facts with identityState and identityLinkId fields.

## Cost and 4xx

- cloud-run-bounded-link-write (cloud_run, bounded): Identity transfer writes the association and never scans historical guest batches during login.
- cloud-sql-not-runtime-transfer (cloud_sql, cloud_sql_not_detected_in_transfer_runtime): Keep Cloud SQL out of analytics identity transfer unless a future explicit runtime promotion exists.
- gemini-cloud-assist-not-involved (gemini_cloud_assist, gemini_cloud_assist_not_involved): Do not add model calls to identity transfer.
- expected-auth-4xx (route_4xx, expected_product_4xx): Auth-missing and invalid payload failures are typed and non-retried.

## Next Fix Order

1. Run source-level checks against the new identity link route and event contract.
2. Use linked identity lineage in future admin/user analytics consumers without rewriting guest rows.
3. Keep provider/warehouse evidence separated from product identity truth.

