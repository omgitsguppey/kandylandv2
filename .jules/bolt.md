## 2024-05-15 - Array.prototype.find in .map() and .reduce() causes O(N^2) complexity in Node.js endpoints

**Learning:** When generating large administrative snapshots or iterating over extensive task inventories (like in `src/app/api/admin/debug/route.ts`), relying on `Array.prototype.find()` inside `.map()` or `.reduce()` calls degrades performance drastically. This is a common performance anti-pattern in Node.js backend endpoints handling analytics or admin data. It leads to CPU blocking and increased memory allocation per iteration.
**Action:** Always precompute a `Map<string, Type>` or a lookup object before entering loops that search an array repeatedly. Use `!map.has(key)` to maintain the priority of the first matched element (simulating `.find()` behavior exactly).
