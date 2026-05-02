import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
    return readFileSync(join(root, relativePath), "utf8");
}

describe("accessibility tap target launch contracts", () => {
    it("mobile bottom navigation exposes current page state and labelled wallet action", () => {
        const source = read("src/components/Navigation/MobileBottomBar.tsx");

        expect(source).toContain("aria-label=\"Mobile navigation\"");
        expect(source).toContain("aria-current={isActive ? \"page\" : undefined}");
        expect(source).toContain("aria-label=\"Open wallet\"");
        expect(source).toContain("type=\"button\"");
    });

    it("wallet modal exposes dialog semantics and focus behavior", () => {
        const source = read("src/components/PurchaseModal.tsx");

        expect(source).toContain("role=\"dialog\"");
        expect(source).toContain("aria-modal=\"true\"");
        expect(source).toContain("aria-labelledby=\"purchase-wallet-title\"");
        expect(source).toContain("closeButtonRef.current?.focus()");
        expect(source).toContain("event.key === \"Escape\"");
        expect(source).toContain("event.key !== \"Tab\"");
        expect(source).toContain("aria-pressed={isSelected}");
        expect(source).toContain("aria-pressed={isBundleSelected}");
        expect(source).toContain("role=\"alert\"");
    });

    it("drop card preview and countdown controls expose accessible names without live timer spam", () => {
        const layout = read("src/components/DropCardLayout.tsx");
        const parts = read("src/components/DropCardParts.tsx");

        expect(layout).toContain("aria-label={`Preview ${drop.title}`}");
        expect(parts).toContain("aria-label={fullLabel}");
        expect(parts).toContain("title={fullLabel}");
        expect(parts).toContain("aria-live=\"off\"");
    });

    it("viewer thumbnail controls expose labels and current state", () => {
        const source = read("src/app/dashboard/viewer/components/ThumbnailsSlider.tsx");

        expect(source).toContain("aria-label={`Show asset ${idx + 1} of ${assetCount}`}");
        expect(source).toContain("aria-current={activeIndex === idx ? \"true\" : undefined}");
        expect(source).toContain("aria-label=\"Scroll thumbnails left\"");
        expect(source).toContain("aria-label=\"Scroll thumbnails right\"");
    });

    it("admin tabs, dropdowns, and filters expose state attributes", () => {
        expect(read("src/app/admin/analytics/page.tsx")).toContain("aria-pressed={active}");
        expect(read("src/app/admin/debug/page.tsx")).toContain("aria-pressed={active}");
        expect(read("src/components/Navigation/AdminDropdown.tsx")).toContain("aria-current={isActive ? \"page\" : undefined}");
        expect(read("src/components/StickyFilterBar.tsx")).toContain("aria-expanded={isExpanded}");
        expect(read("src/components/StickyFilterBar.tsx")).toContain("aria-pressed={isSelected}");
    });
});
