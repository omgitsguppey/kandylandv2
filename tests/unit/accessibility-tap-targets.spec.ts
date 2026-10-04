import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
    return readFileSync(join(root, relativePath), "utf8");
}

function expectSharedButtonTouchSizes(source: string) {
    // Transfer the existing 44px baseline to each consumed shared size, allowing larger valid targets.
    const sizes = source.match(/size:\s*\{([\s\S]*?)\n\s*\}/u)?.[1] ?? "";
    for (const size of ["default", "sm", "icon"] as const) {
        const declaration = sizes.match(new RegExp("\\b" + size + ":\\s*\"([^\"]+)\""))?.[1];
        expect(declaration, "Missing shared Button size: " + size).toBeDefined();
        const minHeight = Number(declaration?.match(/(?:^|\s)min-h-(\d+)(?=\s|$)/u)?.[1]);
        expect(minHeight, "Shared Button " + size + " target must retain the 44px baseline").toBeGreaterThanOrEqual(11);
        if (size === "icon") {
            const minWidth = Number(declaration?.match(/(?:^|\s)min-w-(\d+)(?=\s|$)/u)?.[1]);
            expect(minWidth, "Shared icon Button target must retain the 44px baseline").toBeGreaterThanOrEqual(11);
        }
    }
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
    "src/components/Drops/LockedDropPreviewView.tsx",
    "src/components/Feedback/ReportBugButton.tsx",
    "src/components/Settings/UserSettingsPage.tsx",
    "src/components/Support/SupportInbox.tsx",
    "src/components/ui/UiContinuityNotice.tsx",
] as const;

describe("accessibility tap target launch contracts", () => {
    it("mobile bottom navigation exposes current page state and labelled wallet action", () => {
        const source = read("src/components/Navigation/MobileBottomBar.tsx");
        const dock = read("src/components/creative-tim/kandydrops/navigation/KandyNavigationPrimitives.tsx");
        const button = read("src/components/ui/Button.tsx");

        expect(source).toContain("from \"@/components/creative-tim/kandydrops/navigation/KandyNavigationPrimitives\"");
        expect(source).toContain("<KandyMobileNavigationDock");
        expect(source).toContain("aria-current={isActive ? \"page\" : undefined}");
        expect(source).toContain("aria-label=\"Open wallet\"");
        expect(source).toContain("type=\"button\"");
        expect(source).toContain("openPurchaseModal();");
        expect(source).toContain("buttonVariants({ variant: \"ghost\", size: \"sm\" })");
        expect(dock).toContain("aria-label=\"Mobile navigation\"");
        expect(dock).toContain("{children}");
        expect(button).toContain("<button");
        expectSharedButtonTouchSizes(button);
    });

    it("wallet modal exposes dialog semantics and the shared focus owner", () => {
        const purchase = read("src/components/PurchaseModal.tsx");
        const frame = read("src/components/creative-tim/kandydrops/wallet/KandyWalletModalFrame.tsx");
        const picker = read("src/components/creative-tim/kandydrops/wallet/KandyWalletPackagePicker.tsx");
        const dialog = read("src/components/creative-tim/ui/dialog.tsx");
        expect(purchase).toContain("<KandyWalletModalFrame");
        expect(purchase).toContain("onRequestClose={closeModal}");
        expect(purchase).toContain("busy={processing}");
        expect(frame).toContain("<DialogContent");
        expect(frame).toContain('aria-modal="true"');
        expect(frame).toContain('aria-labelledby="purchase-wallet-title"');
        expect(frame).toContain('<DialogTitle id="purchase-wallet-title"');
        expect(frame).toContain("onOpenAutoFocus");
        expect(frame).toContain("onCloseAutoFocus");
        expect(frame).toContain("returnFocusRef.current.focus()");
        expect(frame).toContain("onEscapeKeyDown");
        expect(frame).toContain("onPointerDownOutside");
        expect(dialog).toContain('from "@radix-ui/react-dialog"');
        expect(picker).toContain("aria-pressed={selected}");
        expect(picker).toContain('from "@/components/ui/Button"');
        expect(picker).not.toContain('role="button"');
        expect(purchase).toContain("selected={isBundleSelected}");
        expect(purchase).toContain("<HumanErrorNotice");
        expect(purchase).not.toContain("querySelectorAll<HTMLElement>");
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

        expect(source).toContain("aria-label={`Show asset ${index + 1} of ${assetCount}`}");
        expect(source).toContain("const isActive = activeIndex === index");
        expect(source).toContain("aria-current={isActive ? \"true\" : undefined}");
        expect(source).toContain("onClick={() => setActiveIndex(index)}");
        expect(source).toContain("aria-label=\"Scroll thumbnails left\"");
        expect(source).toContain("aria-label=\"Scroll thumbnails right\"");
    });

    it("chat composer keeps every platform branch at accessible target sizes", () => {
        const controller = read("src/components/Chat/ChatExperience.tsx");
        const picker = read("src/components/creative-tim/kandydrops/chat/ChatNewMessageModal.tsx");

        expect(controller).toContain("from \"@/components/creative-tim/kandydrops/chat/ChatNewMessageModal\"");
        expect(controller).toContain("<ChatNewMessageModal");
        expect(controller).toContain("open={composePickerOpen}");
        expect(controller).toContain("onClose={() => setComposePickerOpen(false)}");
        expect(controller).toContain("onSelectCreator={openThreadComposer}");
        expect(picker).toContain("if (!open)");
        expect(picker).toContain("onClick={onClose}");
        expect(picker).toContain("aria-label=\"Close new message picker\"");
        expect(picker).toContain("onClick={() => onSelectCreator(creator.uid)}");
        expect(picker).toContain("flex min-h-11 w-full items-center");
        const source = controller + "\n" + picker;
        expect(source).toContain("max-h-[18px] overflow-hidden truncate");
        expect(source).toContain("flex min-h-12 max-h-12 min-w-0 items-center gap-2");
        expect(source).toContain("inline-flex h-11 w-11 items-center justify-center");
        expect(source).toContain('aria-label="Back to chat list"');
        expect(source).toContain('aria-label="Remove attachment"');
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
        const menu = read("src/components/creative-tim/kandydrops/navigation/KandyProfileMenuSurface.tsx");
        const button = read("src/components/ui/Button.tsx");
        const humanError = read("src/components/errors/HumanErrorNotice.tsx");

        expect(profile).toContain("from \"@/components/creative-tim/kandydrops/navigation/KandyProfileMenuSurface\"");
        expect(profile).toContain("<KandyProfileMenuSurface");
        expect(profile).toContain("triggerRef={triggerRef}");
        expect(profile).toContain("menuRef={menuRef}");
        expect(profile).toContain("navigationSections={navigationSections}");
        expect(profile).toContain("onMenuKeyDown={handleMenuNavigation}");
        expect(profile).toContain("onNavigate={handleNavigation}");
        expect(profile).toContain("handleMenuNavigation");
        expect(profile).toContain("\"ArrowDown\", \"ArrowUp\", \"Home\", \"End\"");
        expect(profile).toContain("event.key !== \"Escape\"");
        expect(profile).toContain("triggerRef.current?.focus()");
        expect(profile).toContain("label: \"Your Kandy\"");
        expect(profile).toContain("label: \"Creator space\"");
        expect(profile).toContain("label: \"Account care\"");
        expect(menu).toContain("from \"@/components/ui/Button\"");
        expect(menu).toContain("ref={triggerRef}");
        expect(menu).toContain("ref={menuRef}");
        expect(menu).toContain("onKeyDown={onMenuKeyDown}");
        expect(menu).toContain("aria-expanded={isOpen}");
        expect(menu).toContain("aria-haspopup=\"menu\"");
        expect(menu).toContain("role=\"menu\"");
        expect(menu).toContain("role=\"menuitem\"");
        expect(menu).toContain("aria-label={section.label}");
        expect(menu).toContain("onClick={() => onNavigate(item.href)}");
        expect(menu).toContain("buttonVariants({ variant: \"ghost\"");
        expect(button).toContain("<button");
        expectSharedButtonTouchSizes(button);
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
        const analytics = read("src/app/admin/analytics/page.tsx");
        const debug = read("src/app/admin/debug/page.tsx");
        const canvas = read("src/components/creative-tim/kandydrops/admin-debug/AdminDebugControlCanvas.tsx");
        const select = read("src/components/creative-tim/ui/native-select.tsx");
        const dropdown = read("src/components/Navigation/AdminDropdown.tsx");
        const menu = read("src/components/creative-tim/kandydrops/navigation/KandyAdminMenuSurface.tsx");
        const filter = read("src/components/StickyFilterBar.tsx");

        expect(analytics).toContain("from \"@/components/creative-tim/ui/native-select\"");
        expect(analytics).toContain("Evidence lens");
        expect(analytics).toContain("value={activeTab}");
        expect(analytics).toContain("onChange={(event) => setActiveTab(event.target.value as typeof activeTab)}");
        expect(analytics).toContain("{TAB_OPTIONS.map((tab) => <NativeSelectOption key={tab.id} value={tab.id}>{tab.label}</NativeSelectOption>)}");
        expect(analytics).not.toContain("mobileViewMode");
        for (const [path, value, setter] of [
            ["src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx", "livePulseViewMode", "setLivePulseViewMode"],
            ["src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx", "deviceMixViewMode", "setDeviceMixViewMode"],
            ["src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx", "packagePerformanceViewMode", "setPackagePerformanceViewMode"],
        ]) {
            const pane = read(path);
            expect(pane).toMatch(new RegExp("<AnalyticsViewModeToggle\\s[\\s\\S]*?value=\\{" + value + "\\}[\\s\\S]*?onChange=\\{" + setter + "\\}", "u"));
            expect(pane).toContain("data-admin-analytics-mobile-view-mode={" + value + "}");
        }
        expect(debug).toContain("from \"@/components/creative-tim/kandydrops/admin-debug/AdminDebugControlCanvas\"");
        expect(debug).toContain("<AdminDebugControlCanvas");
        expect(debug).toContain("tabs={DEBUG_TABS}");
        expect(debug).toContain("activeTab={activeTab}");
        expect(debug).toContain("onTabChange={(tabId) => handleActiveTabChange(tabId as DebugTabId)}");
        expect(debug).toContain("setActiveTab(nextTab)");
        expect(debug).toContain("persistDebugPreferences({ activeTab: nextTab })");
        expect(canvas).toContain("from \"@/components/creative-tim/ui/native-select\"");
        expect(canvas).toContain("<NativeSelect");
        expect(canvas).toContain("value={activeTab}");
        expect(canvas).toContain("onChange={(event) => onTabChange(event.target.value)}");
        expect(canvas).toContain("aria-label=\"Debug workstream\"");
        expect(canvas).toContain("<NativeSelectOption key={tab.id} value={tab.id}>{tab.label}</NativeSelectOption>");
        expect(select).toContain("<select");
        expect(select).toContain("{...props}");
        expect(select).toContain("<option");
        expect(select).toContain("h-11 w-full");
        expect(dropdown).toContain("from \"@/components/creative-tim/kandydrops/navigation/KandyAdminMenuSurface\"");
        expect(dropdown).toContain("<KandyAdminMenuSurface");
        expect(dropdown).toContain("pathname={pathname}");
        expect(dropdown).toContain("navigationItems={navItems}");
        expect(menu).toContain("const isActive = isActiveRoute(item.href, pathname)");
        expect(menu).toContain("aria-current={isActive ? \"page\" : undefined}");
        expect(menu).toContain("href={item.href}");
        expect(filter).toContain("aria-expanded={isExpanded}");
        expect(filter).toContain("aria-pressed={isSelected}");
    });

    it("admin analytics compact view mode buttons keep accessible names", () => {
        const source = read("src/components/Admin/Analytics/AdminAnalyticsPrimitives.tsx");

        expect(source).toContain("aria-label=\"Analytics view mode\"");
        expect(source).toContain("aria-label={option.label}");
        expect(source).toContain("aria-pressed={active}");
        expect(source).toContain("const showRightSlot = Boolean(rightSlot) && (!collapsible || expanded)");
        expect(source).toMatch(/<details\s[^>]*>[\s\S]*?<summary\s[^>]*aria-label=\{"About " \+ label\}/u);
        expect(source).toContain("{dictionaryTooltip}</p>");
        expect(source).not.toContain("bottom-full left-1/2");
    });

    it("admin drop action buttons keep accessible names when compact text is hidden", () => {
        const source = read("src/components/Admin/AdminDropsAtGlancePanel.tsx");
        const detail = read("src/app/admin/drops/page.tsx");

        expect(source).toContain("href={`/admin/drops?dropId=${encodeURIComponent(row.drop.id)}`}");
        expect(source).toContain("aria-label={`Open ${row.drop.title}`}");
        expect(source).toContain("const isBusy = queueingDropId === row.drop.id");
        expect(source).toContain("aria-label={row.isQueued ? \"Unqueue drop\" : \"Queue drop\"}");
        expect(source).toContain("onClick={() => void handleQueueToggle(row.drop.id)}");
        expect(source).toContain("disabled={isBusy}");
        expect(source).toContain("aria-busy={isBusy}");
        expect(source).toContain("aria-hidden=\"true\"");
        expect(detail).toContain("params.get(\"dropId\")");
        expect(detail).toContain("setExpandedDropId(targetDropId)");
        expect(detail).toContain("onEdit={(dropId) => {");
        expect(detail).toContain("setEditingDropId(dropId)");
        expect(detail).toContain("<CreateDropModal");
        expect(detail).toContain("dropId={editingDropId}");
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

        expect(createDrop).toContain("aria-expanded={open}");
        expect(createDrop).toContain("aria-expanded={uploadsOpen}");
        expect(settingsHub.match(/aria-busy=\{savingSection ===/gu)).toHaveLength(5);
        expect(settingsHub.match(/disabled=\{isReadOnlyProjection \|\| savingSection !== null\}/gu)).toHaveLength(5);
        expect(read("src/components/Creators/CreatorExperiencesPanel.tsx")).toContain("flex h-11 w-11 items-center justify-center");
        const notificationBell = read("src/components/Navigation/NotificationBell.tsx");
        const button = read("src/components/ui/Button.tsx");
        expect(notificationBell).toContain('from "@/components/ui/Button"');
        expect(notificationBell).toContain("<DialogTrigger asChild>");
        expect(notificationBell).toContain('<Button variant="ghost" size="icon"');
        expect(notificationBell).toContain('aria-label="Notifications"');
        expect(notificationBell).toContain("aria-expanded={isOpen}");
        expect(notificationBell).toContain('aria-label={isRead ? "Already read" : "Mark as read"}');
        expect(notificationBell).toContain("void handleMarkAsRead();");
        expect(notificationBell).toContain("disabled={isPending || isRead}");
        expect(notificationBell).toContain('aria-label="Open details"');
        expect(notificationBell).toContain("void openNotification();");
        expect(notificationBell).toContain("disabled={isPending}");
        expect(notificationBell).toContain("aria-expanded={isExpanded}");
        expect(notificationBell).toContain("onClick={handleToggleExpanded}");
        expect(notificationBell).toContain('aria-label="Clear all notifications"');
        expect(notificationBell).toContain("void handleMarkAllAsRead();");
        expect(notificationBell).toContain("disabled={isClearingAll}");
        expect(notificationBell).toContain("onClick={() => dispatchClientRuntimeEvent(CLIENT_RUNTIME_EVENTS.notificationsSync, true)}");
        expect(button).toContain("<button");
        expectSharedButtonTouchSizes(button);
        expect(notificationBell).not.toMatch(/className="inline-flex (?:h-6|h-8|min-h-7|min-h-8) items-center/gu);
        expect(read("src/components/Admin/AdminDashboardModule.tsx")).toContain("inline-flex h-11 w-11 items-center justify-center");
        const activityController = read("src/components/Dashboard/RecentActivityFeed.tsx");
        const activityPresentation = read("src/components/creative-tim/kandydrops/activity/KandyRecentActivityExperience.tsx");
        expect(activityController).toContain('from "@/components/creative-tim/kandydrops/activity/KandyRecentActivityExperience"');
        expect(activityController).toContain("<KandyRecentActivityExperience");
        expect(activityController).toContain("expanded={expanded}");
        expect(activityController).toContain("onToggleExpanded={handleToggleExpanded}");
        expect(activityController).toContain("onNextPage={() => {");
        expect(activityController).toContain("onPreviousPage={() => {");
        expect(activityPresentation).toContain("onClick={onToggleExpanded}");
        expect(activityPresentation).toContain("aria-expanded={expanded}");
        expect(activityPresentation).toContain("onClick={onPreviousPage}");
        expect(activityPresentation).toContain("disabled={currentPage === 1}");
        expect(activityPresentation).toContain("onClick={onNextPage}");
        expect(activityPresentation).toContain("disabled={currentPage >= totalPages}");
        expect(activityPresentation).toContain('from "@/components/ui/Button"');
        for (const handler of ["onToggleExpanded", "onPreviousPage", "onNextPage"] as const) {
            expect(activityPresentation).toContain('<Button variant="ghost" size="sm" onClick={' + handler + "}");
        }
        expectSharedButtonTouchSizes(button);
        const stickyFilterBar = read("src/components/StickyFilterBar.tsx");
        expect(stickyFilterBar).toContain('from "@/components/creative-tim/ui/input"');
        expect(stickyFilterBar).toContain('<Input type="search"');
        const filterInput = read("src/components/creative-tim/ui/input.tsx");
        expect(filterInput).toContain("min-h-11 w-full min-w-0");
        expect(stickyFilterBar).toContain('from "@/components/ui/Button"');
        expect(stickyFilterBar).toContain('size="sm"');
        expectSharedButtonTouchSizes(button);
        expect(stickyFilterBar).toContain("onSelectCategory(category);");
        expect(stickyFilterBar).toContain("aria-pressed={isSelected}");
        expect(stickyFilterBar).toContain("aria-expanded={isExpanded}");
        const dailyTasks = read("src/components/Dashboard/DailyTasksModule.tsx");
        const taskPresentation = read("src/components/creative-tim/kandydrops/daily-tasks/DailyTasksJourney.tsx");
        expect(dailyTasks).toContain('from "@/components/creative-tim/kandydrops/daily-tasks/DailyTasksJourney"');
        expect(dailyTasks).toContain("<DailyTasksJourney");
        expect(dailyTasks).toContain("onToggleTask={toggleTaskExpanded}");
        expect(dailyTasks).toContain("void handleTaskAction(task);");
        expect(dailyTasks).toContain("onReloadTasks={() => window.location.reload()}");
        expect(taskPresentation).toContain("onClick={() => onToggleTask(task)}");
        expect(taskPresentation).toContain("aria-expanded={expanded}");
        expect(taskPresentation).toContain("onClick={() => onTaskAction(task)}");
        expect(taskPresentation).toContain("disabled={isBusy}");
        expect(taskPresentation).toContain("inline-flex min-h-11 w-full items-center justify-center");
        expect(taskPresentation).toContain("onClick={onReloadTasks}");
        expect(taskPresentation).toContain("mt-4 min-h-11");
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
