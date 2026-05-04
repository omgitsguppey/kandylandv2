# Sitewide Image Optimization

Status: Public beta image loading doctrine and validation lane
Last updated: 2026-05-04

## Doctrine

KandyDrops image loading is surface-based. Above-fold LCP images are eager/preloaded sparingly. Grids, rails, libraries, and below-fold images are lazy. All fill images require accurate sizes. Locked previews never render internal content thumbnails before unlock. Image loading blur and product-state blur are separate truths.

## Canonical Helper

`src/lib/image-loading-policy.ts` owns the static image policy contract for these surfaces:

- `home_hero`
- `home_creator_rail`
- `home_drop_ticker`
- `home_active_drops`
- `drops_grid`
- `featured_carousel`
- `drop_preview`
- `creator_profile_header`
- `creator_updates`
- `my_kandydrops_library`
- `dashboard_collection`
- `viewer_content`

The helper returns `loading`, `preload`, `fetchPriority`, `sizes`, optional `quality`, LCP truth, and debug attributes. Components should use the helper instead of inventing per-card loading behavior.

## Loading Rules

Drop grid, promo cards, creator rails, home rails, dashboard carousels, and library cards are lazy by default. They must not use `preload`, deprecated Next Image `priority`, or high fetch priority.

The full-page locked preview cover is the preview-route LCP candidate and may use eager loading, preload, and high fetch priority. The legacy preview modal is interaction-opened and must not preload as a route LCP candidate.

The viewer may prioritize only the first visible media item. Additional thumbnails, retention cards, and noninitial media stay lazy or low priority.

Featured carousel loading is index-aware. The first slide can be eager/high when it is the above-fold candidate, but repeated slides must not preload or all become high priority.

## Content Protection

Locked preview surfaces may use public cover art and safe metadata only. They must not render `contentUrls`, `contentUrl`, raw storage URLs, internal file thumbnails, or blurred internal thumbnails before unlock. Product cover blur remains driven by explicit card visibility state and must not be conflated with image loading blur.

## Validation

Use `npm run check:sitewide-image-optimization` and the targeted `tests/unit/image-loading-policy.spec.ts` unit test before broad audits. This lane is source-only and unit-test based; it must not require Playwright, Lighthouse, Cypress, image pixel sampling, runtime measurement loops, or broad UI audits.
