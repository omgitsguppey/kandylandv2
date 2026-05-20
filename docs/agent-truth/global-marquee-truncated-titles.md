# Global Marquee Truncated Titles

Generated: 2026-05-20T06:28:39.231Z
Current code version: 6aa811dfed3d8aa10435fda3811790f04d13ba2a

## Summary

- Existing drop marquee reused: yes
- Shared marquee component ready: yes
- Reduced motion respected: yes
- Body text marquee avoided: yes
- Protected nav untouched: yes
- Protected chat untouched: yes
- Layout width expansion guarded: yes
- Blocking findings: P0=0, P1=0, P2=0

## Reused Components

- src/components/ui/TitleMarquee.tsx
- src/components/ui/MarqueeText.tsx
- src/app/globals.css title-marquee keyframes

## Rollout Surfaces

- src/components/Creators/CreatorProfileTimelineFeed.tsx
- src/components/Creators/CreatorDropManager.tsx
- src/components/Creators/FanPassSubscriberRow.tsx
- src/components/Admin/AdminAiDescriptionOperations.tsx
- src/components/Admin/TopDropsTable.tsx
- src/components/Dashboard/OwnedDropGalleryCard.tsx
- src/components/DropCardLayout.tsx

## Findings

- None.

## Fixes Applied

- Extracted drop title marquee measurement behavior into MarqueeText.
- Kept TitleMarquee as the drop-compatible wrapper over MarqueeText.
- Applied MarqueeText to selected creator title rows, Fan Pass fan labels, admin top-drop titles, and admin AI job/gallery titles.
- Kept body copy, descriptions, nav, bottom nav, and chat out of marquee rollout.

## Next Fix Order

1. Apply MarqueeText opportunistically to newly touched single-line title/name truncation surfaces.
2. Avoid marquee for descriptions, previews, secondary metadata, and body paragraphs.
3. Keep future title marquee changes inside MarqueeText/TitleMarquee and the existing title-marquee CSS.
