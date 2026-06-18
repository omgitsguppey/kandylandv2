# Admin Moderation Real Risk

Status: deterministic moderation/security workspace doctrine  
Primary UI: `src/components/Admin/AdminModerationConsole.tsx`  
Risk engine: `src/lib/moderation/scrape-risk-score.ts`  
Evidence model: `src/lib/moderation/moderation-evidence.ts`  
Validator: `npm run check:admin-moderation-real-risk`

## Doctrine

KandyDrops moderation must never pretend browser/PWA screenshot detection is confirmed. Screenshot-like events are weak heuristic context unless confirmed by a real platform/server source. Moderation decisions are based on evidence-weighted scrape-risk scoring: entitlement failures, abnormal asset requests, viewer velocity, watch-time mismatch, repeated behavior, and server-backed content-protection events. Weak visibility/blur events alone do not justify action.

## Risk Scoring

Every security alert should expose:

- risk score from 0 to 100
- tier: `low`, `watch`, `review`, `high`, or `critical`
- confidence: `unknown`, `heuristic`, `strong`, or `confirmed`
- reason codes
- evidence count
- false-positive risk
- recommended action
- whether auto restriction is even allowed

Auto restriction is allowed only when score is at least 80 and confidence is confirmed or strong. The UI still requires a real backend action and human decision; missing actions must render as `not_configured`.

## Screenshot-Like Truth

Browser visibility, blur, toolbar, or route-leave events are not confirmed screenshots. A single “left while content was visible” or visibility-hidden event scores low, has high false-positive risk, and recommends monitoring only.

## Admin Workspace

The moderation console is a mobile-first workspace:

- top Moderation Control Tower summary
- risk-first filter chips
- compact thread queue
- risk alert cards
- evidence workspace with what was actually observed
- linked transcript when present
- safe evidence media metadata, not raw asset URLs
- real actions only, with missing backend routes shown as compact `not_configured` notes instead of disabled controls

Raw asset URLs must not be rendered through default `<img>`, `<video>`, or open-file anchors. Use `AdminEvidenceMediaPreview` metadata cards unless a safe admin-authenticated preview route exists.

## Validation

Run:

```bash
npm run check:admin-moderation-real-risk
```

Targeted tests:

```bash
npx vitest run tests/unit/moderation-scrape-risk-score.spec.ts tests/unit/admin-moderation-security-alerts.spec.ts
```

Do not run Playwright, Lighthouse, Cypress, full `npm run check`, or broad UI audits for this lane.
