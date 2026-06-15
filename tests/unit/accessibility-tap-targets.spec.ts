import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
    return readFileSync(join(root, relativePath), "utf8");
}

const loaderSpinnerFiles = [
    "src/components/Admin/AdminAiDescriptionOperations.tsx",
    "src/components/Admin/AdminDropsAtGlancePanel.tsx",
    "src/components/Admin/AdminModerationSecurityAlerts.tsx",
    "src/components/Admin/AdminSupportQueue.tsx",
    "src/components/Admin/AdminTasksManager.tsx",
    "src/components/Admin/AiDropCoverGeneratorPanel.tsx",
    "src/components/Admin/AiDropDescriptionGeneratorPanel.tsx",
    "src/components/Admin/AssetUploader.tsx",
    "src/components/Admin/BalanceAdjustmentModal.tsx",
    "src/components/Admin/CreateDropModal.tsx",
    "src/components/Admin/TransactionHistoryModal.tsx",
    "src/components/Auth/AuthModal.tsx",
    "src/components/Auth/GuestComponentBlur.tsx",
    "src/components/CreatorDiscoveryRail.tsx",
    "src/components/Creators/CreatorBookingsManager.tsx",
    "src/components/Creators/CreatorBroadcastManager.tsx",
    "src/components/Creators/CreatorFanPassManager.tsx",
    "src/components/Creators/CreatorRequestsManager.tsx",
    "src/components/Dashboard/DailyCheckIn.tsx",
    "src/components/Dashboard/DailyTasksModule.tsx",
    "src/components/Dashboard/RecentActivityFeed.tsx",
    "src/components/DropCardCta.tsx",
    "src/components/DropPreviewModal.tsx",
    "src/components/Drops/LockedDropPreviewView.tsx",
    "src/components/Feedback/ReportBugButton.tsx",
    "src/components/Settings/UserSettingsPage.tsx",
    "src/components/Support/SupportInbox.tsx",
    "src/components/ui/UiContinuityNotice.tsx",
] as const;

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
        expect(source).toContain("aria-pressed={selected}");
        expect(source).toContain("selected={isBundleSelected}");
        expect(source).toContain("<HumanErrorNotice");
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

    it("admin analytics compact view mode buttons keep accessible names", () => {
        const source = read("src/components/Admin/Analytics/AdminAnalyticsPrimitives.tsx");

        expect(source).toContain("aria-label=\"Analytics view mode\"");
        expect(source).toContain("aria-label={option.label}");
        expect(source).toContain("aria-pressed={active}");
        expect(source).toContain("hidden sm:inline");
    });

    it("admin drop action buttons keep accessible names when compact text is hidden", () => {
        const source = read("src/components/Admin/AdminDropsAtGlancePanel.tsx");

        expect(source).toContain("aria-label=\"Edit drop\"");
        expect(source).toContain("aria-label={row.isQueued ? \"Unqueue drop\" : \"Queue drop\"}");
        expect(source).toContain("aria-busy={queueingDropId === row.drop.id}");
        expect(source).toContain("aria-hidden=\"true\"");
    });

    it("creator broadcast disclosure chevrons are decorative", () => {
        const source = read("src/components/Creators/CreatorBroadcastManager.tsx");

        expect(source).toContain("aria-expanded={expanded}");
        expect(source).toContain("<ChevronUp className=\"h-4 w-4 shrink-0 text-gray-400\" aria-hidden=\"true\" />");
        expect(source).toContain("<ChevronDown className=\"h-4 w-4 shrink-0 text-gray-400\" aria-hidden=\"true\" />");
    });

    it("loading spinners are hidden from assistive technology when visible text owns status", () => {
        const missing = loaderSpinnerFiles.flatMap((file) => {
            const source = read(file);
            return source
                .split(/\r?\n/u)
                .map((line, index) => ({ file, line: index + 1, text: line.trim() }))
                .filter((entry) =>
                    entry.text.includes("<Loader2")
                    && entry.text.includes("animate-spin")
                    && !entry.text.includes("aria-hidden=\"true\""),
                );
        });

        expect(missing).toEqual([]);
    });
});
