# Image Loading Doctrine

Authority level: 4

Owner: image loading/content safety

## Must

- Treat image loading as surface-based policy.
- Use eager/preload sparingly for above-fold LCP images.
- Lazy load grids, rails, libraries, and below-fold media.
- Give fill images accurate sizes.
- Keep locked preview content thumbnails hidden before entitlement truth.

## Must Not

- Use internal thumbnails as pre-unlock previews.
- Omit `sizes` from fill images.
- Preload repeated card/grid images.

## Source Truth

- Image loading policy, content protection contracts, Drop preview state.

## Validators

- `check:sitewide-image-optimization`
- `check:content-protection`
