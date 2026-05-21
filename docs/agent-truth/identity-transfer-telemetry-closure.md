# Identity Transfer Telemetry Closure

Generated: 2026-05-21T15:07:49.325Z
Current head: f080e6eed6472953c5255371caca12eb2b884f1b

## Summary

- Identity states closed: true
- Identity link route present: true
- Deterministic link id shared: true
- Client submit idempotent: true
- Broad guest reads blocked: true
- Individual user session continuity: true
- Linked guest no double count: true
- Unknown legacy separated: true
- Creator/admin projection separated: true

## Identity States

- guest_only
- user_only
- guest_linked_to_user
- creator_user
- admin_projection
- unknown_legacy

## Transfer Findings

- link-first-idempotent-transfer [closed]: Auth transitions submit one bounded link association instead of scanning or rewriting guest history.
- shared-deterministic-link-id [closed]: Client and server use the same deterministic identity link id source.
- creator-admin-identity-separation [closed]: Creator and admin projection telemetry no longer collapses into normal user identity states.

## Continuity Findings

- individual-user-session-continuity [closed]: Signed-in user facts keep session continuity and only carry guest lineage when an anonymous/link id exists.
- linked-guest-no-double-count [closed]: Linked guest history can be attributed through lineage without becoming a second known-user count.
- unknown-legacy-not-clean-user [closed]: Incomplete old records stay unknown instead of being treated as clean known users.

## Fixes Applied

- Expanded analytics identity states for creator users and admin projections.
- Shared deterministic identity link id generation across client and server upsert paths.
- Added counting semantics that prevent linked guest lineage from becoming a second known user.
- Updated identified ingest identity classification to distinguish user-only session continuity from linked guest lineage.

## Next Fix Order

1. Use identity_lineage_indexes in admin user analytics consumers when a bounded linked-history view is needed.
2. Keep legacy unknown identity rows explicit until a source-backed migration plan exists.
3. Continue treating provider/warehouse exports as supporting evidence, not primary identity truth.

