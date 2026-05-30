## 2026-03-28 - Added proper ARIA states to core navigation components
**Learning:** Found several top-level navigation elements (like ProfileDropdown and MobileBottomBar) relying on implicit visual cues without proper `aria-label` or `aria-expanded` attributes. While testing accessibility, discovered that linking React state (like `isOpen`) directly to `aria-expanded` creates a significantly better experience for screen readers out of the box.
**Action:** Always map React boolean visibility states to `aria-expanded` on their corresponding toggle triggers to ensure state changes are announced properly.

## 2023-10-27 - Responsive Elements Need ARIA Labels When Text is Hidden
**Learning:** In the `AdminDropdown.tsx` component, a button contained both an icon and a text span. However, the text span was hidden on mobile devices (`hidden md:inline-block`), effectively turning it into an icon-only button on small screens without an accessible name. This is a common pattern in responsive design that breaks accessibility.
**Action:** Always provide an `aria-label` to interactive elements when their visible text is conditionally hidden via responsive CSS classes, ensuring they remain accessible across all screen sizes.

## 2024-03-31 - Added ARIA label to mobile profile avatar
**Learning:** Found a profile avatar `<button>` in the Navbar that was visually an icon-only button on mobile devices (`md:hidden`). It used an image or initial for sighted users but lacked an accessible name for screen readers.
**Action:** Always provide an `aria-label` to avatar or profile buttons when they function as icon-only interactive elements without visible text labels.
## 2024-05-09 - Added aria-busy to Button component
**Learning:** The core Button component visually indicated loading states with a spinner, but did not properly announce this asynchronous loading state to screen readers.
**Action:** Always apply the `aria-busy={isLoading}` attribute to interactive elements like buttons when they enter a loading state to ensure screen readers are informed of the asynchronous process.
## 2026-05-30 - Added proper ARIA labels to buttons with responsive hidden text\n**Learning:** Found that buttons in data grids (like the Admin Drops list) sometimes use `hidden md:inline` to hide text labels on mobile devices to save space. While visually acceptable, this causes the button to become an inaccessible icon-only button for screen reader users on small viewports because there is no accessible name. \n**Action:** Always add a static `aria-label` to interactive elements when their descriptive text is conditionally hidden via responsive CSS classes.
