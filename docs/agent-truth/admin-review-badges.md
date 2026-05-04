# Admin Review Badges

KandyDrops admin review badges must explain why a surface needs attention.

Rules:

- Every review badge carries a concrete `reason code`.
- No naked `ERROR` badge.
- No naked `REVIEW` badge.
- `DELAYED` only means expected settlement or materialization delay.
- Hidden cards may still emit review badges inside diagnostics.
- Stale, missing, disagreed, or broken sources must explain what is wrong.

Canonical review triggers:

- missing required data for a visible metric
- score below threshold
- source disagreement
- stale critical source
- user-facing tracking bug
- views exist but watch time is missing
- onboarded user missing auth stats
- revenue exists but purchase count is missing
- unlocks exist but entitlement records are missing
- personalized output is shown while behavioral confidence is below 30

Severity meanings:

- `info`: explain only
- `wait`: source refreshing
- `review`: human should inspect
- `error`: source failed and no valid fallback exists
- `critical`: product, security, or accounting truth conflict
