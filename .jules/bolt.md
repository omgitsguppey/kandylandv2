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
**Action:** Implement a small, simple LRU-style cache or a plain Map inside `drop-presentation.ts` so `getSupportedDropAspectRatio` and `getDropMediaSummary` do not redundantly process identical strings or objects. Alternatively, we can memoize the results of `getSupportedDropAspectRatio` by the `drop.fileMetadata?.dimensions` string, and `getDropMediaSummary` by `drop.id`.

## 2026-04-01 - Optimize loop processing and object cloning in Dashboard CollectionList
**Learning:** High performance impact observed when large datasets are mapped multiple times (e.g. `map` -> `filter` -> `filter`) in hot-path React `useMemo` blocks. Specifically, `applyDropStatus` cloning objects inside `map` before a subsequent `filter` abandons them creates a significant garbage collection load.
**Action:** Use a single-pass `for...of` loop to iterate elements, defer object cloning until an element is validated to match criteria, and combine multiple aggregations inside the same iteration pass.
## 2024-05-15 - React Component Re-render Arrays
**Learning:** React elements like Recharts receive deeply nested object data via `data` props. Using inline `.filter().map()` chains generates a brand new array reference on every single component render, causing Recharts to dump its cache and recalculate sizes/positions on every parent ping.
**Action:** Always wrap data-processing pipelines inside a `useMemo` hook so that derived array structures maintain stable object references across standard component refreshes.
