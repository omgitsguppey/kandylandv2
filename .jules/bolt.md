## 2024-05-15 - Array Chunking Performance Optimization
**Learning:** Avoid `Array.prototype.slice` loops to create chunks manually when processing Firestore references. Firestore admin `adminDb.getAll` accepts array spreads which can quickly hit the maximum arguments limit (often 100-250) leading to performance and memory scaling issues if large queue arrays are iterated via custom chunking functions like `chunkArray`. Iteration over the mapped elements sequentially allows handling fewer elements per Promise block.
**Action:** When handling arrays of strings that map to Firestore document references, use mapped iterations inside `Promise.all` instead of spreading arbitrarily chunked arrays over a `for...of` loop, or let Firestore's bulk processing methods take the array natively. In `process-queue`, mapping configurations to promises or directly resolving queue references inside a batch is safer.

## 2024-05-15 - Avoid manual `for...of` sequentially fetching arrays
**Learning:** A sequential `for...of` with `await` inside the loop causes operations to block sequentially, which severely degrades performance especially during array mapping when each loop hits the database (like fetching user snapshots). In `src/app/api/cron/process-queue/route.ts`, the array chunking approach with a `for...of` containing `await adminDb.getAll(...refsChunk)` pauses execution for each chunk.
**Action:** Utilize `Promise.all` with `.map()` over chunks to allow concurrent fetching of Firestore documents in read-heavy tasks.

## 2026-03-24 - Identifying Frontend Performance Bottlenecks
**Learning:** React component memoization with `useMemo` is used heavily in lists like `DropGrid.tsx` and `DashboardClient.tsx`, and `DropCard.tsx`. However, the calculation of `aspectRatio` is repeated across components, and computing metrics inside render functions (e.g. `getDropMediaSummary` inside `DropCard.tsx` and `OwnedDropGalleryCard.tsx`) could be optimized if it is frequently called.
**Action:** Investigate the frontend performance bottlenecks, especially in lists rendering Drop cards, to find opportunities to reduce redundant calculations.

## 2026-03-24 - Drop Metadata Cache Opportunities
**Learning:** Functions like `getDropMediaSummary` and `getSupportedDropAspectRatio` heavily use Regex or array iterations on the same strings and fallback logic (like parsing dimensions with `match(/^(\d+)\s*[xX:]\s*(\d+)$/)` and classifying URL types). These are repeatedly evaluated inside React component `useMemo` hooks, meaning the work scales linearly with Drop component counts on every initial render or data refresh. We can memoize or cache these results at the module level.
**Action:** Implement a small, simple LRU-style cache or a plain Map inside `drop-presentation.ts` so `getSupportedDropAspectRatio` and `getDropMediaSummary` do not redundantly process identical strings or objects. Alternatively, we can memoize the results of `getSupportedDropAspectRatio` by the `drop.fileMetadata?.dimensions` string, and `getDropMediaSummary` by a deterministic cache property.

## 2026-04-01 - Optimize loop processing and object cloning in Dashboard CollectionList
**Learning:** High performance impact observed when large datasets are mapped multiple times (e.g. `map` -> `filter` -> `filter`) in hot-path React `useMemo` blocks. Specifically, `applyDropStatus` cloning objects inside `map` before a subsequent `filter` abandons them creates a significant garbage collection load.
**Action:** Use a single-pass `for...of` loop to iterate elements, defer object cloning until an element is validated to match criteria, and combine multiple aggregations inside the same iteration pass.

## 2026-04-02 - Array/String Allocations in Cache Keys
**Learning:** Creating cache keys using dynamic string concatenations of arrays (e.g., `drop.contentUrls?.join(",")`) defeats the purpose of caching by unconditionally allocating memory and adding garbage collection pressure on every call. This causes a net performance regression in hot paths compared to simple, non-allocating property checks.
**Action:** Use lightweight, non-allocating cache keys. For entities where we know references do not mutate deeply without a new top-level reference (like `drop`), we can use the entity's ID or `WeakMap` on the entity itself to cache derived data, avoiding costly key generation strings entirely.

## 2024-05-18 - Nested array filters in admin dashboard loops
**Learning:** Found multiple instances where an array was `.filter()`ed inside iterating functions or map closures (e.g. `allTaskDefinitions.filter(definition => buildTelemetryEventMetadata(definition.eventName).canonicalEventName === eventName)` inside telemetry iterations in `admin/debug/route.ts`). This is an O(N^2) operation that degrades performance linearly as logs or catalogs grow.
**Action:** When searching elements by a specific property inside iterative loops, pre-compute a `Map` that groups the elements by that property first, turning nested `O(N)` scans into `O(1)` Map lookups.

## 2026-05-18 - Nested array filters in UI list state calculation
**Learning:** Found instances where arrays were repeatedly evaluated via nested `.filter()` calls inside a map/reduce structure inside a React `useMemo` block (e.g. `REVIEW_TABS.reduce(...)` applying `.filter()` for every tab). This causes an O(N*M) scaling issue and excessive garbage collection when calculating simple tallies or grouping list items.
**Action:** When tracking multiple states or counting items grouped by an attribute, replace chained `.filter()` or `.reduce()` combinations with a single-pass `for...of` loop that increments tallies or groups elements simultaneously. This reduces complexity to O(N) and prevents intermediate array allocations.
