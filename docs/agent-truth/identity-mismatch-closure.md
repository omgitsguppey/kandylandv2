# Identity Mismatch Closure

- Status: classified
- Current head: 74c04caadffa3080b2f979f7649026b17aafdbdf
- Guest-to-user handoff: continuity_preserved_duplicate_suppressed
- Individual metric hydration: classified
- Global vs user mismatches surfaced: 3
- Active global vs user mismatches: 0
- Classified non-blocking mismatches: 3
- Expected no-user-mapping events: 3
- Missing identity links (requiring action): 1
- Unsafe unknown mismatches (active bugs): 0
- Identity 4xx classes covered: 14
- Live evidence: verified

This document closes and classifies the 3 expected global-only mismatches and the remaining `identity_link_missing` gap surfaced during the in-flight identity analytics pass. These classified, expected mismatches do not represent active bugs and have 0 score drag.

## Identified Mismatches

| Mismatch ID | Event / Metric | Reason | Action | Active Bug | Score Drag | User Visible Impact | Next Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `mismatch_visits_global_only` | `visits` (eventName: `semantic_page_viewed`) | `expected_no_user_mapping` | `classified_non_blocking` | false | false | visits panel displays collecting/bridge_missing instead of fake zero | do not synthesize identity; wait for real activity |
| `mismatch_active_days_global_only` | `active_days` (eventName: `semantic_page_viewed`) | `expected_no_user_mapping` | `classified_non_blocking` | false | false | active days panel displays collecting/bridge_missing instead of fake zero | do not synthesize identity; wait for real activity |
| `mismatch_page_views_global_only` | `page_views` (eventName: `semantic_page_viewed`) | `expected_no_user_mapping` | `classified_non_blocking` | false | false | page views panel displays collecting/bridge_missing instead of fake zero | do not synthesize identity; wait for real activity |

### Detailed Explanations

1. **Visits**
   - **Explanation**: Guest activity without guestId (due to cookie blocks, bots, or initialization latency) naturally has global page views but no user-scoped identity link.

2. **Active Days**
   - **Explanation**: Guest activity without guestId naturally has global page views but no user-scoped identity link.

3. **Page Views**
   - **Explanation**: Guest activity without guestId naturally has global page views but no user-scoped identity link.

## Remaining Gaps

### identity_link_missing
- **Gap ID**: `identity_link_missing`
- **Source**: `client_session_without_guest_id`
- **Explanation**: Client-side page views without an initialized guest ID or blocked by local cookie/privacy consent block user-level link mapping.
- **Next Action**: Preserve journey continuity at the first identified auth/link transition without speculative guest ID backfilling.
