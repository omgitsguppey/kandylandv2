# Drops Mobile Refinement Truth

Status: Active source-of-truth note for the mobile Drops page.
Last updated: 2026-05-01.

## Purpose

The Drops page is a repeat-use shopping and unwrapping surface. Mobile Safari and mobile Chrome must show more useful Drops content in the same viewport without losing accessibility, KandyDrops brand, or tracking truth.

This pass applies a KandyDrops-specific interpretation of the current official Apple Human Interface Guidelines:

- Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
- Layout: https://developer.apple.com/design/human-interface-guidelines/layout
- Accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility
- Materials: https://developer.apple.com/design/Human-Interface-Guidelines/materials
- Designing for iOS: https://developer.apple.com/design/human-interface-guidelines/designing-for-ios

Apple guidance is used here for hierarchy, safe areas, progressive disclosure, accessibility, consistency, materials, and ease of use. It does not replace KandyDrops product doctrine, candy-coded visual language, telemetry contracts, or commerce truth.

## Source Owners

- Page shell and hydration: `src/app/drops/DropsClient.tsx`
- Loading shell: `src/app/drops/loading.tsx`
- Filter/search controls: `src/components/StickyFilterBar.tsx`
- Featured Drops: `src/components/FeaturedCarousel.tsx`
- Grid density and empty state: `src/components/DropGrid.tsx`
- Drop card view: `src/components/DropCard.tsx`
- Drop card layout parts: `src/components/DropCardLayout.tsx`, `src/components/DropCardParts.tsx`, `src/components/DropCardCta.tsx`
- Impression tracking: `src/hooks/useDropCardImpression.ts`
- Drops data hydration: `src/hooks/useDrops.ts`

## 50 Mobile Improvement Areas

1. Reduce the duplicate top padding in the Drops client because the shared app shell already reserves top navigation space.
2. Reduce duplicate bottom padding in the Drops client and let the shared user shell own bottom-nav safe-area reservation.
3. Remove the `min-h-[500px]` live Drops body that created a dead zone on mobile.
4. Tighten the account overview margin so the first useful Drops content appears earlier.
5. Keep creator discovery compact before the featured module rather than creating another large hero gap.
6. Replace the oversized featured heading with a smaller, scannable section label.
7. Cap the featured carousel mobile ratio to a compact landscape ratio so 9:16 Drops do not consume most of the viewport.
8. Keep the original Drop aspect ratio on larger screens where vertical space is available.
9. Reduce featured carousel border radius from arbitrary huge values to the shared compact radius scale.
10. Reduce featured carousel shadow intensity so it separates content without becoming the page focal point.
11. Replace the featured timer's long text with compact labels like `2d left`, `3h 10m`, or `12m 4s`.
12. Remove pulse animation from urgent featured timers because frantic urgency conflicts with restrained motion.
13. Respect reduced motion before starting featured carousel autoplay.
14. Keep featured carousel autoplay as a progressive enhancement, not a required interaction.
15. Enrich `featured_drop_clicked` telemetry with rank, component source, and UI density.
16. Remove unused featured activity ticker logic.
17. Make search the first control in the filter bar so repeat users can jump directly to intent.
18. Keep the search input as `type="search"` with search keyboard hints.
19. Use a compact sticky filter bar with blur as control separation rather than a large panel.
20. Use a lucide grid icon instead of a manually drawn SVG for filter consistency.
21. Keep category chips tappable with a comfortable minimum touch height even while reducing visual scale.
22. Collapse secondary filters by default and expose them with a real disclosure button.
23. Remove filter animation dependencies and scroll listeners from the critical Drops controls.
24. Debounce and dedupe search telemetry so typing does not spam `drops_searched`.
25. Track search result counts with search telemetry.
26. Enrich category selection telemetry with source component, UI density, and visible count.
27. Use `useDeferredValue` for search filtering so typing remains responsive on slow phones.
28. Reduce grid gaps on mobile while preserving enough separation to scan cards.
29. Reduce grid skeleton card height to match the compact card density.
30. Reduce grid bottom padding because the shared shell already protects the bottom nav.
31. Replace the large empty state card with a compact truthful empty state.
32. Remove the local fake `Notify Me` affordance because it only set component state and did not persist a real notification preference.
33. Use a real route link to `/experiences` from the empty Drops state.
34. Replace the empty-state emoji asset with a text fallback that does not introduce outdated or inaccessible branding.
35. Split the oversized Drop card file into layout, CTA, timer/chip, and impression helper files.
36. Keep touched view files below the repo's 300-line view-file target.
37. Move card impression tracking into a dedicated hook.
38. Preserve the server impression POST while adding UI density and aspect-ratio telemetry.
39. Keep one shared timer store via `useNow` instead of per-card `setInterval` timers.
40. Use compact Drop card radii consistently across card, media frame, chips, timer, and CTA.
41. Keep card CTAs compact but still large enough to tap reliably.
42. Add direct-card insufficient-balance telemetry for `drop_unwrap_intent_blocked_by_funds`.
43. Add direct-card unlock attempt telemetry for `drop_unlock_attempted`.
44. Preserve successful unlock telemetry with source component and UI density.
45. Preserve detail open telemetry with card aspect ratio, tags, source component, and UI density.
46. Keep `DropPreviewModal` lazy-loaded so first paint is not blocked by modal code.
47. Keep `FeaturedCarousel` lazy-loaded with a compact skeleton so the page does not blank-load.
48. Delay the Firestore runtime subscription until idle after server-seeded/SWR Drops render.
49. Treat an empty server seed as needing client revalidation instead of pretending it is a useful loaded feed.
50. Keep the loading shell visually aligned with the final compact layout to avoid hydration jump.

## Telemetry Contract

Refined components must maintain or improve tracking. The active mobile Drops density label is `compact_mobile_apple_2026`.

## Drop Cover Visibility Doctrine

Drop cover blur is product-state driven, not loading-state driven. Guests may see protected/blurred covers. Authenticated users and admins see clear covers when they have enough total GumDrops for a normal drop. Authenticated users only see affordability blur when they need a refill for that specific drop. Featured carousel chips use adaptive glass styling and the timer pill does not include a progress bar.

Required event enrichments:

- `drops_page_viewed`: source component, UI density, initial drop count, initial visible count, creator rail count.
- `drops_category_selected`: source component, UI density, visible drop count.
- `drops_searched`: source component, UI density, result count, deduped query.
- `featured_drop_clicked`: featured rank, source component, UI density.
- `drop_card_impression`: card aspect ratio, UI density, server impression POST.
- `view_drop_details`: card aspect ratio, source component, UI density.
- `drop_unlock_attempted`: direct-card source component and UI density.
- `drop_unwrap_intent_blocked_by_funds`: direct-card source component and UI density.
- `unlock_drop_success`: direct-card source component and UI density.

Do not remove telemetry because a UI element is reduced. If an action remains possible, its telemetry must remain possible.

## Loading And Hydration

The first render path is server-seeded/SWR Drops data. The Firestore runtime listener is an upgrade lane and is deferred until idle to avoid competing with mobile page hydration. The page can refresh on focus, visibility, SWR interval, runtime changes, and expiration timers, but none of those should block useful initial content.

Fake loaded states are forbidden. If there are no Drops and the server seed is empty, the hook revalidates instead of treating the empty seed as proven final truth.

## Mobile Browser Rules

- Safari and Chrome mobile must not require guessed browser chrome heights.
- Sticky controls use safe-area-aware top offsets only where the shared shell does not already own spacing.
- The page must not use negative margins to fit more content.
- Carousels and grids must avoid giant vertical cards on first paint.
- Touch targets can be visually compact, but they must remain named, focusable, and comfortably tappable.

## Future-Agent Guardrails

Do not reintroduce:

- A full-height 9:16 featured hero on mobile.
- `min-h-[500px]` or similar dead-zone sizing on the Drops body.
- Per-card timer intervals.
- Fake local notification buttons.
- Large empty state cards that dominate mobile.
- Untracked reduced UI components.
- Unlock/detail CTAs without source-component telemetry.
- Random radii outside the compact Drops radius scale.
- Firestore runtime listeners as the first-render dependency for Drops.
