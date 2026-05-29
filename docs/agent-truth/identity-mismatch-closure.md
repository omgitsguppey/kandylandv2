# Identity Mismatch Closure

- Status: classified
- Current head: 3962eae483605a9a0b4dffd9957dd361881eda91
- Guest-to-user handoff: continuity_preserved_duplicate_suppressed
- Individual metric hydration: classified
- Global vs user mismatches surfaced: 3
- Identity 4xx classes covered: 14
- Live evidence: verified

This document closes and classifies the 3 expected global-only mismatches and the remaining `identity_link_missing` gap surfaced during the in-flight identity analytics pass.

## Identified Mismatches

### 1. visits
- **Mismatch ID**: `mismatch_visits_global_only`
- **Metric affected**: `visits`
- **Global source exists**: yes
- **User source exists**: no
- **Link source exists**: no
- **Reason**: `expected_no_user_mapping`
- **Action**: `classified_non_blocking`
- **Score impact**: 0
- **Panel impact**: visits panel displays collecting/bridge_missing instead of fake zero when user identity is missing.
- **Explanation**: Guest activity without guestId (due to cookie blocks, bots, or initialization latency) naturally has global page views but no user-scoped identity link.
- **Next action**: Keep global activity separate from user-level tracking proof.

### 2. active_days
- **Mismatch ID**: `mismatch_active_days_global_only`
- **Metric affected**: `active_days`
- **Global source exists**: yes
- **User source exists**: no
- **Link source exists**: no
- **Reason**: `expected_no_user_mapping`
- **Action**: `classified_non_blocking`
- **Score impact**: 0
- **Panel impact**: active days panel displays collecting/bridge_missing instead of fake zero when user identity is missing.
- **Explanation**: Guest activity without guestId naturally has global page views but no user-scoped identity link.
- **Next action**: Keep global activity separate from user-level tracking proof.

### 3. page_views
- **Mismatch ID**: `mismatch_page_views_global_only`
- **Metric affected**: `page_views`
- **Global source exists**: yes
- **User source exists**: no
- **Link source exists**: no
- **Reason**: `expected_no_user_mapping`
- **Action**: `classified_non_blocking`
- **Score impact**: 0
- **Panel impact**: page views panel displays collecting/bridge_missing instead of fake zero when user identity is missing.
- **Explanation**: Guest activity without guestId naturally has global page views but no user-scoped identity link.
- **Next action**: Keep global activity separate from user-level tracking proof.

## Remaining Gaps

### identity_link_missing
- **Gap ID**: `identity_link_missing`
- **Source**: `client_session_without_guest_id`
- **Explanation**: Client-side page views without an initialized guest ID or blocked by local cookie/privacy consent block user-level link mapping.
- **Next Action**: Preserve journey continuity at the first identified auth/link transition without speculative guest ID backfilling.
