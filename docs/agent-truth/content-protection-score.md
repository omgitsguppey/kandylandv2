# Content Protection Score

Status: deterministic locked-content audit guard  
Report artifact: `agent/state/content-protection-score.generated.json`  
Scorer: `npm run score:content-protection`  
Validator: `npm run check:content-protection`

## Doctrine

KandyDrops locked content protection scoring is deterministic. Locked preview and guest/user surfaces may show cover art, safe metadata, file counts, and public social proof, but must never render internal content URLs, internal thumbnails, blurred internal previews, or raw storage URLs before entitlement. Viewer and content APIs must prove entitlement before fetching or streaming content. Content-protection findings are not auto-fixed by default because content exposure decisions require security review.

Admin moderation consumes content-protection findings as evidence, not as fake screenshot proof. KandyDrops moderation must never pretend browser/PWA screenshot detection is confirmed. Screenshot-like events are weak heuristic context unless confirmed by a real platform/server source. Moderation decisions are based on evidence-weighted scrape-risk scoring: entitlement failures, abnormal asset requests, viewer velocity, watch-time mismatch, repeated behavior, and server-backed content-protection events. Weak visibility/blur events alone do not justify action.

## Protected Surfaces

- Full-page locked Drop preview: `src/app/drops/[id]/preview/page.tsx`, `src/components/Drops/LockedDropPreviewClient.tsx`, and `src/components/Drops/LockedDropPreviewView.tsx`
- Safe preview view model: `src/lib/locked-drop-preview-truth.ts`
- Legacy fallback: `src/components/DropPreviewModal.tsx`
- Public Drop feed sanitization: `src/lib/server/drops.ts` and `src/app/api/drops/route.ts`
- Authenticated content proxy: `src/app/api/drops/content/route.ts`
- Dashboard viewer route and loader: `src/app/dashboard/viewer/page.tsx`, `src/app/dashboard/viewer/ViewerClient.tsx`, `src/app/dashboard/viewer/hooks/useViewerState.ts`, and `src/app/dashboard/viewer/ViewerHelpers.ts`

## Rules

- Public Drop payloads must use `sanitizeDropForClient` so `contentUrl` is blank and `contentUrls` contains only empty placeholders.
- Locked preview payloads use `toLockedDropPreviewSafeDrop`, which is limited to cover art, title, description, creator, public engagement, media counts, file metadata counts, price, and timer fields.
- The preview page must expose `data-safe-preview-fields-only="true"` so deterministic audits can verify the route without browser automation.
- `DropPreviewModal` is legacy fallback only and must not read `drop.contentUrl` or `drop.contentUrls`; file count must come from presentation metadata such as `getDropMediaSummary`.
- `/api/drops/content` may touch raw content URLs only after authenticated, trusted-origin, caller-scoped entitlement checks prove creator ownership or server-written unlock entitlement.
- The dashboard viewer can read raw Drop server-side only long enough to pass `sanitizeDropForClient` into the client. The client fetches protected bytes only through `/api/drops/content` after `isAuthorized`.
- Raw Firebase/Storage URLs must not appear in preview, guest, public feed, or viewer shell source.

## Autofix

No autofix is enabled by default. Content exposure, preview payload, viewer entitlement, and protected media proxy changes require human review. The scorer may suggest exact fixes, but `canAutofix` stays false for findings in this domain.

## Verification

Allowed targeted commands:

- `npm run score:content-protection`
- `npm run check:content-protection`
- `npx vitest run --config vitest.contracts.config.ts tests/unit/content-protection-truth.spec.ts tests/unit/drops-content-route.spec.ts tests/unit/dashboard-viewer-page.spec.tsx`

Forbidden by default:

- Playwright
- Cypress
- Lighthouse
- full `npm run check`
- broad UI audits
- broad integration tests
