1. **Optimize `buildCreatorSettingsCompletion` and remove `.filter().map()` chain**
   - The React component `CreatorDashboardSettingsHub.tsx` frequently calls `.filter((item) => settingsCompletion.missingSetupItems.includes(item.id)).map((item) => item.label)` inside render loops.
   - We will replace `missingSetupItems: items.filter((item) => !item.complete).map((item) => item.id)` in `src/lib/creator-settings/creator-settings-contract.ts` with a direct loop to avoid `.filter().map()` allocations.
   - We will update `src/components/Creators/CreatorDashboardSettingsHub.tsx` to just map from the incomplete items directly instead of searching via `includes`.
2. **Optimize Map/Filter Operations in `admin/debug/route.ts`**
   - We saw several N^2 mapping/filtering operations in `admin/debug/route.ts` that have performance journal notes about turning O(N^2) array filter searches into Map lookups. Wait, we already checked that one (`taskDefinitionsByCanonicalEvent`), and it exists. Let's see what else `admin/debug/route.ts` has. Oh, `grep ".filter(" src/app/api/admin/debug/route.ts | grep ".map("` showed:
   - `const dropIds = Array.from(new Set(parsedOutcomes.map((entry) => entry.dropId).filter(Boolean)));`
   - Wait, `map().filter()` is O(N). It's not nested. The journal specifically said "Use a single-pass `for...of` loop to iterate elements, defer object cloning until an element is validated to match criteria, and combine multiple aggregations inside the same iteration pass."
