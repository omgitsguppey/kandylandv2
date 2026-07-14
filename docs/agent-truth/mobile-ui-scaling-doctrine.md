# Mobile UI Scaling Doctrine

Generated: pending validator refresh

## Authority

This doctrine translates current mobile interaction guidance from Apple Human Interface Guidelines into KandyDrops-specific rules. It is a foundation layer for Admin, User, Creator, Public, and System surfaces. It does not replace surface doctrine, server truth, device layout contracts, or shared brand primitives.

Reference inputs:

- Apple Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
- Apple Layout: https://developer.apple.com/design/human-interface-guidelines/layout
- Apple Typography: https://developer.apple.com/design/human-interface-guidelines/typography
- Apple Buttons: https://developer.apple.com/design/human-interface-guidelines/buttons
- Apple Progress Indicators: https://developer.apple.com/design/human-interface-guidelines/progress-indicators
- Apple Loading: https://developer.apple.com/design/human-interface-guidelines/loading
- Apple Accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility

## Doctrine

- Mobile is the primary UX priority. Tablet and desktop can expand density, but mobile must not inherit desktop sprawl.
- Content comes first and controls come second. Primary actions stay obvious, while secondary controls move into rows, segmented controls, drawers, sheets, or disclosure groups.
- Desktop workflows must collapse into mobile modules, sheets, compact rows, and lists. Do not shrink unchanged desktop tables/cards into mobile.
- Admin, creator, user, public, and system surfaces can share density tokens, but they must not share business logic or shove admin tables into user-facing cards.
- Tap targets must remain usable. Compact mobile density reduces decorative padding, display-scale type, and giant card height without shrinking hit regions below the shared minimum.
- Skeletons must reserve roughly final layout size. Loading state should not jump when real content arrives.
- Hydration should not cause layout jumps, duplicate fetches, or visible state races. Duplicate loading states count as UX bugs.
- Hardcoded class soup such as oversized mobile headers, `p-8`, raw `h-screen`, and unapproved nested scroll containers should be replaced with shared density helpers where practical.
- Top nav, bottom nav, and chat are protected from this workflow. They may be read to understand safe-area constraints, but broad cleanup passes must not edit them.
- Safe areas are consumed through existing shell contracts such as `src/lib/device-layout-contract.ts` and `src/lib/user-mobile-shell.ts`.

## Surface Translation

- Admin UI may use compact density and tables when they improve triage, but raw details stay behind drilldowns and missing state remains explicit.
- Creator UI uses compact operational modules, clear status, and one primary action per mobile surface.
- User UI uses compact density only when it improves clarity and scanning. It must not expose raw admin truth machinery.
- Public UI can use more spacious hierarchy for conversion moments, but mobile sections below the first viewport must avoid giant stacked cards.
- System/debug surfaces must keep source-state labels explicit and collapse high-cost details by default.

## Token Layer

The shared source is `src/lib/ui/mobile-scale-contract.ts`.

Required helpers:

- `getMobileDensityForSurface(surface, moduleType)`
- `getMobileModuleClassNames(surface, moduleType)`
- `getSkeletonClassForModule(moduleType)`
- `assertNoDesktopStuffing(surfaceConfig)`

## Next Fix Order

1. Route new mobile modules through `src/lib/ui/mobile-scale-contract.ts` before adding local density classes.
2. Replace repeated `p-8`, display-scale mobile headings, and raw mobile viewport math in touched files only.
3. Keep top nav, bottom nav, and chat changes in their existing dedicated shell validators.

## Validator Report

Generated: 2026-07-14T16:10:32.922Z
Current code version: dc4dad82c4ee6f08f8570c9efb2b9ba61fafafaa

- Doctrine created: yes
- Shared mobile scale contract: yes
- Density helpers: yes
- Skeleton policy: yes
- Hydration policy: yes
- Protected nav/chat untouched: no
- Hardcoded scan examples: 80

## Hardcoded Scan Examples

- src/app/(legal)/privacy/page.tsx:47:              <h1 className="mt-2 text-3xl font-black text-white md:text-4xl">How KandyDrops handles your data</h1>
- src/app/(legal)/terms/page.tsx:25:                <h1 className="text-4xl font-bold text-white mb-8">Terms of Service</h1>
- src/app/admin/ai/page.tsx:52:        <div className="min-h-screen overflow-x-clip bg-black px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8" data-ai-dashboard-density="compact-v2">
- src/app/admin/analytics/page.tsx:618:          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-red-500/10 text-red-400">
- src/app/admin/debug/components/DebugTabInfrastructure.tsx:245:                    <div className="py-8 text-center text-sm italic text-white/40">
- src/app/admin/layout.tsx:60:      <div className="min-h-screen flex items-center justify-center">
- src/app/admin/roster/page.tsx:1070:        <main className="min-h-screen bg-black px-4 pb-24 pt-24 text-white sm:px-6" data-roster-mode="decision_queue" data-admin-debug-metadata={JSON.stringify(rosterDebugMetadata)}>
- src/app/admin/user/[userId]/page.tsx:765:        return <div className="p-8 text-center text-red-500">Access Restricted</div>;
- src/app/admin/user/[userId]/page.tsx:770:            <div className="p-8 text-center text-gray-300">
- src/app/admin/user/[userId]/page.tsx:860:                <div className="glass-panel rounded-3xl border border-white/5 p-4 md:p-5">
- src/app/admin/user/[userId]/page.tsx:934:                <div className="glass-panel rounded-3xl border border-white/5 p-4 md:p-5">
- src/app/admin/user/[userId]/page.tsx:941:                            <p className="py-8 text-center text-sm text-gray-500">
- src/app/admin/user/[userId]/page.tsx:995:            <div className="glass-panel rounded-3xl border border-white/5 p-4 md:p-5">
- src/app/admin/user/[userId]/page.tsx:1196:            <details className="glass-panel rounded-3xl border border-white/5 p-4 md:p-5">
- src/app/admin/user/[userId]/page.tsx:1307:                <div className="glass-panel rounded-3xl border border-white/5 p-4 md:p-5">
- src/app/admin/user/[userId]/page.tsx:1342:            <details className="glass-panel rounded-3xl border border-white/5 p-6">
- src/app/admin/user/[userId]/page.tsx:1451:                <div className="glass-panel rounded-3xl border border-white/5 p-6">
- src/app/admin/user/[userId]/page.tsx:1484:                <details className="glass-panel rounded-3xl border border-white/5 p-6">
- src/app/admin/users/page.tsx:1172:                                            <td colSpan={8} className="p-8 text-center">
- src/app/admin/users/page.tsx:1178:                                            <td colSpan={8} className="p-8 text-center text-gray-500">
- src/app/admin/users/page.tsx:1360:                            <div className="p-8 text-center glass-panel rounded-2xl"><Loader2 className="w-6 h-6 text-brand-purple animate-spin mx-auto" /></div>
- src/app/admin/users/page.tsx:1362:                            <div className="p-8 text-center text-gray-500 glass-panel rounded-2xl">No users found.</div>
- src/app/admin/users/page.tsx:1569:                        <div className="rounded-[1.75rem] border border-white/5 bg-black/20 p-8 text-center sm:p-12">
- src/app/admin/users/page.tsx:1574:                        <div className="glass-panel rounded-[1.75rem] border border-white/5 p-8 text-center sm:rounded-3xl sm:p-12">
- src/app/admin/users/page.tsx:1581:                                <div key={item.id} className="glass-panel space-y-4 overflow-hidden rounded-[1.75rem] border border-white/5 p-4 transition-colors hover:border-white/10 sm:rounded-3xl sm:p-6">
