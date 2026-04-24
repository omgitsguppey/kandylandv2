## 2026-03-28 - Added proper ARIA states to core navigation components
**Learning:** Found several top-level navigation elements (like ProfileDropdown and MobileBottomBar) relying on implicit visual cues without proper `aria-label` or `aria-expanded` attributes. While testing accessibility, discovered that linking React state (like `isOpen`) directly to `aria-expanded` creates a significantly better experience for screen readers out of the box.
**Action:** Always map React boolean visibility states to `aria-expanded` on their corresponding toggle triggers to ensure state changes are announced properly.

## 2023-10-27 - Responsive Elements Need ARIA Labels When Text is Hidden
**Learning:** In the `AdminDropdown.tsx` component, a button contained both an icon and a text span. However, the text span was hidden on mobile devices (`hidden md:inline-block`), effectively turning it into an icon-only button on small screens without an accessible name. This is a common pattern in responsive design that breaks accessibility.
**Action:** Always provide an `aria-label` to interactive elements when their visible text is conditionally hidden via responsive CSS classes, ensuring they remain accessible across all screen sizes.

## 2024-03-31 - Added ARIA label to mobile profile avatar
**Learning:** Found a profile avatar `<button>` in the Navbar that was visually an icon-only button on mobile devices (`md:hidden`). It used an image or initial for sighted users but lacked an accessible name for screen readers.
**Action:** Always provide an `aria-label` to avatar or profile buttons when they function as icon-only interactive elements without visible text labels.

## 2023-11-20 - Adding ARIA states to icon-like numeric buttons
**Learning:** In `DailyTasksModule.tsx`, a feedback rating widget used numeric buttons (1, 2, 3, 4, 5) without extra context. A screen reader would just announce "1, button", "2, button", etc., making it unclear what the buttons did. Furthermore, the active state was indicated entirely by a CSS color change without `aria-pressed`. This pattern is an extremely common accessibility failure for interactive widgets.
**Action:** Always add an `aria-label` to icon-like or bare numeric buttons to provide full context (e.g., `aria-label="Rate 5 out of 5 stars"`), and explicitly add `aria-pressed` or `aria-selected` to elements that maintain a toggle or selection state.
