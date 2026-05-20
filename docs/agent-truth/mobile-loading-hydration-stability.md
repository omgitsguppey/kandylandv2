# Mobile Loading Hydration Stability

Generated: 2026-05-20T00:11:45.028Z
Current code version: 4939d419aa499e09113c1c16fa15d3156acd7b9e

## Rules

- Skeletons match final component size.
- Mobile skeletons are compact.
- Avoid full-screen loaders after the initial shell.
- Avoid duplicate fetches on mount.
- Use AbortController or stale-request guards where repeated async loads can race.
- Use module-level loading states unless a route truly cannot render.
- No raw loading debug copy in normal UI.
- Missing or unavailable state must stay compact and must not create layout shift.

## Summary

- Doctrine present: yes
- Mobile scale contract present: yes
- Loading contract present: yes
- Protected nav/chat untouched: yes
- Compact skeletons present: yes
- Stale request protection applied: yes
- Promise.all hydration avoided: yes
- Full-page loaders avoided: yes

## Fixes Applied

- fixed: Unit tests cover stale request suppression.
- fixed: Mobile loading hydration stability doctrine exists.

## Race Protection Findings

- fixed: src/components/Creators/CreatorDropManager.tsx async loader should guard stale request results before setState.
- fixed: src/components/Creators/CreatorDashboardSettingsHub.tsx async loader should guard stale request results before setState.
- fixed: src/app/admin/queue/page.tsx async loader should guard stale request results before setState.

## Next Fix Order

1. Apply loading-state-contract helpers to additional high-risk admin and creator modules as those surfaces are touched.
2. Keep route-level loading placeholders compact and close to the final module dimensions.
3. Escalate runtime screenshot verification only when source validators identify a mobile layout risk that cannot be proven from code.
