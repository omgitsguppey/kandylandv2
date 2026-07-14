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
    "src/components/Admin/BalanceAdjustmentPanel.tsx",
    "src/components/Admin/CreateDropModal.tsx",
    "src/components/Admin/TransactionHistoryPanel.tsx",
    "src/components/Auth/AuthModal.tsx",
    "src/components/Auth/GuestComponentBlur.tsx",
    "src/components/CreatorDiscoveryRail.tsx",
    "src/components/Creators/CreatorBookingsManager.tsx",
    "src/components/Creators/CreatorBroadcastManager.tsx",
    "src/components/Creators/CreatorDashboardSettingsHub.tsx",
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
        expect(source).toContain("col-span-3 grid min-h-11 w-full cursor-pointer");
        expect(source).not.toContain("role=\"button\"");
        expect(source).toContain("flex h-11 w-11 flex-col");
        expect(source).toContain("flex h-11 w-11 items-center");
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

    it("chat composer keeps every platform branch at accessible target sizes", () => {
        const source = read("src/components/Chat/ChatExperience.tsx");

        expect(source).toContain("max-h-[18px] overflow-hidden truncate");
        expect(source).toContain("flex min-h-12 max-h-12 min-w-0 items-center gap-2");
        expect(source).toContain("inline-flex h-11 w-11 items-center justify-center");
        expect(source).toContain('aria-label="Back to chat list"');
        expect(source).toContain('aria-label="Remove attachment"');
        expect(source).toContain('aria-label="Close new message picker"');
        expect(source.match(/inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg/gu)?.length).toBeGreaterThanOrEqual(3);
        expect(source.match(/inline-flex h-11 w-11(?: shrink-0)? items-center justify-center/gu)?.length).toBeGreaterThanOrEqual(4);
        expect(source).toContain("inline-flex h-12 w-12 shrink-0 self-center items-center justify-center");
        expect(source).not.toContain("inline-flex h-9 w-9 items-center justify-center");
        expect(source).not.toContain("inline-flex h-8 w-8 shrink-0 items-center justify-center");
        expect(source).not.toContain('isIosPwaChatShell ? "h-9 max-h-9"');
        expect(source).not.toContain('? "inline-flex h-8 w-8 items-center justify-center');
        expect(source).not.toContain('? "inline-flex h-9 w-9 shrink-0 self-center');
    });

    it("profile and shared error actions keep 44px targets", () => {
        const profile = read("src/components/Navigation/ProfileDropdown.tsx");
        const humanError = read("src/components/errors/HumanErrorNotice.tsx");

        expect(profile).toContain("inline-flex h-11 w-11 shrink-0 items-center justify-center");
        expect(profile).toContain("flex min-h-11 items-center gap-3");
        expect(profile).toContain("flex min-h-11 w-full items-center");
        expect(profile).toContain('aria-label="Profile navigation"');
        expect(profile).toContain('aria-label="Help and policies"');
        expect(profile).toContain('role="menu"');
        expect(profile).toContain('role="menuitem"');
        expect(profile).toContain("handleMenuNavigation");
        expect(profile).toContain('"ArrowDown", "ArrowUp", "Home", "End"');
        expect(profile).toContain('event.key !== "Escape"');
        expect(profile).toContain("triggerRef.current?.focus()");
        expect(humanError).toContain("min-h-11 rounded-full");
        expect(humanError).not.toContain("min-h-10 rounded-full");
    });

    it("keeps every privacy choice at the shared touch-target baseline", () => {
        const cookieBanner = read("src/components/CookieBanner.tsx");

        expect(cookieBanner).toContain("Manage settings");
        expect(cookieBanner).toContain("Decline optional");
        expect(cookieBanner).toContain("Minimal analytics");
        expect(cookieBanner).toContain("Accept all");
        expect(cookieBanner).not.toContain("min-h-10 flex-1");
        expect(cookieBanner.match(/min-h-11/g)?.length).toBeGreaterThanOrEqual(7);
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
        expect(source).toContain("hidden md:inline");
        expect(source).toContain("const showRightSlot = Boolean(rightSlot) && (!collapsible || expanded)");
        expect(source).toContain("aria-label={dictionaryTooltip}");
        expect(source).toContain("bottom-full left-1/2");
        expect(source).toContain("hidden w-48 -translate-x-1/2");
        expect(source).toContain("sm:block");
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

    it("disclosure and directional controls own state while decorative chevrons stay hidden", () => {
        const createDrop = read("src/components/Admin/CreateDropModal.tsx");
        const settingsHub = read("src/components/Creators/CreatorDashboardSettingsHub.tsx");
        const combinedDecorativeSources = [
            "src/components/Admin/AdminDashboardModule.tsx",
            "src/components/Creators/CreatorAgreementFullText.tsx",
            "src/components/Creators/CreatorExperiencesPanel.tsx",
            "src/components/Dashboard/DailyTasksModule.tsx",
            "src/components/Dashboard/RecentActivityFeed.tsx",
            "src/components/Navigation/NotificationBell.tsx",
            "src/components/StickyFilterBar.tsx",
        ].map(read).join("\n");

        expect(createDrop).toContain("aria-expanded={open}");
        expect(createDrop).toContain("aria-expanded={uploadsOpen}");
        expect(settingsHub.match(/aria-busy=\{savingSection ===/gu)).toHaveLength(5);
        expect(settingsHub.match(/disabled=\{isReadOnlyProjection \|\| savingSection !== null\}/gu)).toHaveLength(5);
        expect(combinedDecorativeSources.match(/aria-hidden="true"/gu)?.length).toBeGreaterThanOrEqual(15);
        expect(read("src/components/Creators/CreatorExperiencesPanel.tsx")).toContain("flex h-11 w-11 items-center justify-center");
        const notificationBell = read("src/components/Navigation/NotificationBell.tsx");
        expect(notificationBell.match(/inline-flex min-h-11 items-center/gu)?.length).toBeGreaterThanOrEqual(5);
        expect(notificationBell).toContain("relative flex h-11 w-11 items-center justify-center");
        expect(notificationBell).not.toMatch(/className="inline-flex (?:h-6|h-8|min-h-7|min-h-8) items-center/gu);
        expect(read("src/components/Admin/AdminDashboardModule.tsx")).toContain("inline-flex h-11 w-11 items-center justify-center");
        expect(read("src/components/Dashboard/RecentActivityFeed.tsx").match(/inline-flex min-h-11 items-center gap-2/gu)).toHaveLength(3);
        const stickyFilterBar = read("src/components/StickyFilterBar.tsx");
        expect(stickyFilterBar).toContain("h-11 w-full rounded-[1rem]");
        expect(stickyFilterBar).toContain("inline-flex h-11 shrink-0 items-center");
        expect(stickyFilterBar).toContain("inline-flex h-11 w-11 shrink-0 items-center justify-center");
        const dailyTasks = read("src/components/Dashboard/DailyTasksModule.tsx");
        expect(dailyTasks).toContain("inline-flex min-h-11 items-center gap-2 rounded-full");
        expect(dailyTasks).toContain("className=\"mt-4 min-h-11 rounded-full");
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
