# Drops Mobile Refinement Truth

Status: Active routing and arrangement contract for the public Drops body.
Last updated: 2026-10-03.

## Authority and purpose

The current User UI and Shared Brand Primitives doctrines own the selected whole-site direction. The Drops body applies their Apple-informed content hierarchy: one page heading, scoped search, a distinct Featured collection, readable image captions and ordinary content surfaces. Opaque content and shared control styles come from the existing runtime owners; this note does not define another palette, material, device rule or commerce policy.

Primary design references:

- [Apple Materials](https://developer.apple.com/design/human-interface-guidelines/materials): reserve the navigation material for navigation and temporary controls; keep content readable.
- [Apple Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields): place scoped search beside the collection it filters.
- [Apple Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility): preserve names, focus, readable text and usable targets.
- [Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/): the web composition follows hierarchy guidance; it does not import or claim native SwiftUI Liquid Glass behavior.

The supplied Penpot archive is a reference input. Executable UI sources are the existing licensed local Card, Badge, Input and Button owners. No unverified archive code/assets or Apple fonts/sample assets are imported.

Locked preview routing, safe metadata, urgency, success handoff and server unlock authority are maintained in [Drop Preview Page Truth](drop-preview-page.md). This discovery note delegates those preview rules to that owner.

## Source owners

- `src/app/drops/page.tsx` and `src/lib/server/public-discovery-preview.ts`: server discovery seed and guarded preview fixture.
- `src/app/drops/DropsClient.tsx`: public feed, matching authenticated-profile projection, deferred search, filtering, callbacks, pagination and page/search telemetry.
- `src/components/creative-tim/kandydrops/drops/DropsDiscoveryExperience.tsx`: the actual primary page body, public scope marker, page heading and named collection regions.
- `src/components/StickyFilterBar.tsx`: sourced search Input, labeled categories and disclosure. Selected secondary categories stay available after automatic collapse.
- `src/components/FeaturedCarousel.tsx`: Featured selection, metadata projections, view/click telemetry, reduced motion and shared-store countdown.
- `src/components/DropGrid.tsx`: public lifecycle filtering, source notices, shared loading/collection composition and actual DropCard callbacks.
- `src/components/creative-tim/kandydrops/drops/KandyEditorialReleaseCollection.tsx`: intrinsic collection geometry, route/embedded skeleton and promotion boundary.
- `src/components/DropCard.tsx`: canonical funds/access projection, safe cover, attempt/settlement/actor handling and actual returned Card.
- `src/components/creative-tim/kandydrops/drops/KandyEditorialReleaseCard.tsx`: public caption, passive metadata, view count, CTA slot and error presentation.
- `src/components/DropCardCta.tsx` and `src/components/DropCardParts.tsx`: existing action and timer projections.
- `src/components/Landing/PublicDropShelf.tsx` and `src/components/creative-tim/kandydrops/drops/KandyEditorialHomeShelf.tsx`: Home consumers of the same collection. Discovery/Home/Creator consumers retain their original routes, ordering and callbacks.
- `src/app/drops/loading.tsx`: the route loading composition uses the same shared skeleton.
- `src/hooks/useDrops.ts`: the existing SWR/feed lifecycle and deferred Firestore runtime owner.
- `src/hooks/useDropsSearchTelemetry.ts` and `src/hooks/useDropCardImpression.ts`: existing sanitized search and impression owners.
- `src/lib/image-loading-policy.ts`: native image loading and responsive size declarations. Card/Featured opt into intrinsic lazy sizing; eager Featured keeps an explicit conservative size.

`DropCardLayout.tsx` is an unused legacy presentation owner with surviving audit/scoring readers. It is not the active Card body and cannot establish the active visual or view-count contract. Physical retirement requires transferring those remaining controls first; this slice does not delete it.

## Source and access truth

- Public feed data, loading and failure come from the same imported `useDrops` call and reach the returned collection. Missing/failed data is not a proved product-empty state.
- A failure with retained records leaves those records browsable and explains the refresh failure. A failure without records offers existing navigation and a human recovery message.
- “No loaded releases” describes the displayed source boundary. “No loaded Drops match these filters” describes a filtered result. A hidden Featured collection does not establish that the product has no releases.
- Source errors do not infer a network/connection cause from a generic failure value.
- Account, owned-content filtering and affordability use only a profile whose UID agrees with resolved authentication. Missing or stale profiles stay unavailable; a known numeric zero remains zero.
- Pending affordability is not a confirmed refill requirement. Featured shows “Check access” while pending and retains safe preview navigation; known zero can show “Refill to unwrap”.
- Cover protection, unlocks, entitlement, paid/reward funds and settlement remain defined by their server and canonical access owners. This body never reads protected internal thumbnails to improve a public preview.

## Featured source projections

`resolveFeaturedCoverAccent` retains deterministic metadata classification and the existing telemetry field. Shared Button styling owns its visual action treatment; metadata does not create local gradients, sampled colors or a second palette.

`getFeaturedSocialProof` shows unwraps only when the canonical normalized unwrap count exceeds 10; otherwise it reads `getDropViewCount(drop)`. The rendered type/label and telemetry keep that same projection. Grid view counts still come from `getDropViewCount` through DropCard into the rendered editorial Card.

Featured and editorial Card titles are fully rendered and wrap. Existing truncated title consumers still use `TitleMarquee` over the sole `MarqueeText` measurement owner and the shared reduced-motion CSS. Descriptions and body copy do not become marquee text.

Video counts retain a recognizable camera indicator and textual count. Featured and the existing compatibility count retain 🎥; the active editorial Card uses the already sourced Lucide video-camera icon and “video/videos” count.

Featured public cover frames use the existing shared skeleton’s 4:3 presentation ratio. Source format and safe image fields remain unchanged. Natural Card/caption sizing keeps each action adjacent to its content; hidden portrait slides cannot stretch the visible frame.

Countdowns use `useNow` and `formatDropCountdown`. Numeric clocks stay readable as a whole run; full accessible labels and urgency text remain available. There is no progress bar or per-card interval.

## Telemetry and hydration

The existing telemetry density classification remains `compact_mobile_apple_2026`; it is event compatibility, not proof of a device or visual result.

Keep the canonical page view, selected category, sanitized submitted/results/focus/result-click, Featured view/click, card impression, preview, attempt, blocked-funds and server settlement flows. Do not copy their schemas into this routing note. Existing search/telemetry catalogs and unlock-watch parity contracts own event spelling, payload and attribution.

The existing hook delays the Firestore runtime subscription until idle. Server-seeded/SWR data remains the first content path; an empty seed revalidates. Fake loaded states are forbidden. Existing focus/visibility/runtime/expiration recovery remains in the hook, with no new timer, polling loop, collector, cache or subscription introduced by presentation.

## Responsive and verification boundaries

Use the existing device-layout/mobile-shell contracts. Intrinsic collection columns respond to the actual available container, including a narrow body in a wide window. Route and embedded skeletons use the same collection owner. Keep shell reservations, ordinary text size, 44px targets, keyboard actions, disclosure state and reduced motion; do not shrink fonts/targets to make a narrow fixture pass.

The existing checks remain `check:drops-mobile-refinement` and `check:featured-carousel-polish`; their returned-source checks follow actual imported consumers. Current component tests own feed failure/retained-data/recovery, actor/access/settlement behavior, category persistence and native image attributes. Readable controls, text ranges, source states and actual activation require bounded rendered proof when geometry changes.

Source/component and controlled Chrome/WebKit proof are separate from default repository gates, deployment, production/provider outage, physical Safari/iPhone and human whole-body acceptance. Native resource selection observations do not prove optimal width, loading speed or cost savings.

## Future-agent guardrails

Do not reintroduce duplicate shell spacing, viewport-only grid assumptions, decorative nested content framing, source failure hidden as empty, fake notification controls, local funds math, untracked actions, per-card countdown intervals, pixel-sampled accents, disconnected search callbacks or Firestore readiness as a first-content prerequisite.

File length and a numbered improvement count are not readiness criteria. A component import, comment, unused callback or legacy layout marker does not prove the actual returned control.
