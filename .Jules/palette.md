## 2026-03-28 - Added proper ARIA states to core navigation components
**Learning:** Found several top-level navigation elements (like ProfileDropdown and MobileBottomBar) relying on implicit visual cues without proper `aria-label` or `aria-expanded` attributes. While testing accessibility, discovered that linking React state (like `isOpen`) directly to `aria-expanded` creates a significantly better experience for screen readers out of the box.
**Action:** Always map React boolean visibility states to `aria-expanded` on their corresponding toggle triggers to ensure state changes are announced properly.

## 2023-10-27 - Responsive Elements Need ARIA Labels When Text is Hidden
**Learning:** In the `AdminDropdown.tsx` component, a button contained both an icon and a text span. However, the text span was hidden on mobile devices (`hidden md:inline-block`), effectively turning it into an icon-only button on small screens without an accessible name. This is a common pattern in responsive design that breaks accessibility.
**Action:** Always provide an `aria-label` to interactive elements when their visible text is conditionally hidden via responsive CSS classes, ensuring they remain accessible across all screen sizes.

## 2024-03-31 - Added ARIA label to mobile profile avatar
**Learning:** Found a profile avatar `<button>` in the Navbar that was visually an icon-only button on mobile devices (`md:hidden`). It used an image or initial for sighted users but lacked an accessible name for screen readers.
**Action:** Always provide an `aria-label` to avatar or profile buttons when they function as icon-only interactive elements without visible text labels.

## 2024-04-03 - HTML title attributes alone are insufficient for accessibility
**Learning:** Found several icon-only action buttons in the admin dashboard (e.g. `Edit2`, `Ban`, `Lock` icons) that relied solely on the HTML `title` attribute for tooltip generation. While `title` provides a visual tooltip on mouse hover, it is often not reliably announced by all screen readers and provides no keyboard support for sighted users unable to use a mouse.
**Action:** When using icon-only buttons, always explicitly provide an `aria-label` attribute alongside `title`. `title` is for sighted users needing a tooltip, `aria-label` guarantees an accessible name for assistive tech.