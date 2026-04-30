# Admin Analytics Commerce Snapshot

Commerce Snapshot answers four operator questions: how much real money came in, how many purchases completed, how much GD was spent, and whether the checkout funnel needs attention.

## Revenue Truth

Revenue means completed real-money currency purchases only. Promo value, bonus GD, admin grants, refunds represented as grants, and unpaid checkout starts must never be counted as revenue.

The canonical UI source is the backend historical analytics response built from completed internal purchase records. PayPal captures are represented through those completed internal records for this surface. GA4 commerce data can support drift investigation, but it is not the primary revenue source.

## Commerce Terms

Adjusted profit is completed purchase gross revenue minus payment fees and package-rate promo or bonus value. Its formula must stay available in Admin Debug.

Promo value is not revenue. Bonus GD is not paid GD. GD spent comes from internal unlock or commerce ledger activity and must not imply that every GD was purchased.

Checkout starts are intent telemetry. Purchase completions are completed purchase records. These are separate numbers.

Checkout conversion is `purchaseCompletions / checkoutStarts`. If checkout starts are zero or unavailable, show unavailable rather than dividing by zero.

Yield / 100 GD is `revenue / (deliveredGumDrops / 100)`. If delivered GD or revenue is unavailable, show waiting or unavailable rather than fake zero.

## Source States

Commerce metrics must label stale, cached, fallback, waiting, and failed states. If a last validated backend snapshot is shown, keep it visible and label it briefly. Detailed source reasons belong in Admin Debug.

Fake zeros are forbidden. Zero is allowed only when the source is present and confirms zero.

## Google And Firebase Basis

GA4 BigQuery daily tables, `events_YYYYMMDD`, are the stable completed-day export. Intraday tables, `events_intraday_YYYYMMDD`, are current-day best-effort and can be incomplete, so they must not override canonical payment truth.

Firestore listeners can emit cache data before server data. If cache/server transitions affect commerce truth, listeners must use snapshot metadata such as `fromCache` with metadata changes enabled.

App Hosting runtime config and secrets should be validated through `apphosting.yaml` and Secret Manager availability when PayPal or analytics environment values affect reporting.

Official references:
- [GA4 BigQuery Export](https://support.google.com/analytics/answer/9358801)
- [GA4 BigQuery Export schema](https://support.google.com/analytics/answer/7029846)
- [Firestore offline metadata](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [Firestore realtime listeners](https://firebase.google.com/docs/firestore/query-data/listen)
- [Firebase App Hosting configuration](https://firebase.google.com/docs/app-hosting/configure)

## UI Rule

Commerce Snapshot should be a compact actionable panel, not giant card sprawl. Mobile should use dense metric tiles and a short insight row. Visible copy should be plain English, for example: "Showing validated commerce data for the selected range." or "Commerce refresh is delayed. Showing last validated snapshot."

Do not show raw backend lane jargon such as "polled route snapshot", "failed closed", "realtime lane", or "backend refresh runs" in the visible Commerce Snapshot.

Status badges must stay inside metric containers. Visible labels should be short: LIVE, STALE, CACHE, EST, WAIT, ERROR. Full status detail belongs in title, aria, or Admin Debug.

## Phase 5 Snapshot Migration

Commerce Snapshot reads the Admin Analytics snapshot registry first and keeps the latest verified snapshot visible while refresh runs. Revenue, purchases, checkout starts, GD spent, adjusted profit, and yield must expose formulas and source breakdown in Admin Debug. Promo, bonus, and admin grants must not be counted as revenue unless a verified commerce source explicitly classifies them that way.

Future agents must not reintroduce giant card sprawl, vague degraded copy, fake zeros, or revenue numbers that include promo/admin/bonus value.
