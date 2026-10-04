import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readSourceAst, sourceRenderNodes, someSourceNode, hasJsxAttribute } from "./validate-behavioral-truth-source";
import ts from "typescript";

const root = process.cwd();
const failures: string[] = [];

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function readAggregate(...relativePaths: string[]) {
  return relativePaths.map((relativePath) => readRequired(relativePath)).join("\n");
}

function parseJson(relativePath: string) {
  const source = readRequired(relativePath);
  try {
    return JSON.parse(source) as Record<string, unknown>;
  } catch (error) {
    failures.push(`${relativePath} must be valid JSON: ${(error as Error).message}`);
    return {};
  }
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

function requireAbsent(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) {
    failures.push(`${label} must not include "${forbidden}".`);
  }
}

function requireArray(value: unknown, label: string, minLength = 1) {
  if (!Array.isArray(value)) {
    failures.push(`${label} must be an array.`);
    return [] as unknown[];
  }
  if (value.length < minLength) {
    failures.push(`${label} must include at least ${minLength} item(s).`);
  }
  return value;
}

function requireSurface(surfaces: unknown[], surfaceKey: string) {
  const found = surfaces.some((surface) => (
    surface
    && typeof surface === "object"
    && (surface as Record<string, unknown>).surfaceKey === surfaceKey
  ));
  if (!found) {
    failures.push(`audit.surfaces must include ${surfaceKey}.`);
  }
}

const audit = parseJson("agent/state/accessibility-tap-target-audit.generated.json");
const surfaces = requireArray(audit.surfaces, "audit.surfaces", 14);
const docs = readRequired("docs/agent-truth/accessibility-tap-targets.md");
const packageJson = readRequired("package.json");
const mobileBottomBar = readAggregate(
  "src/components/Navigation/MobileBottomBar.tsx",
  "src/components/creative-tim/kandydrops/navigation/KandyNavigationPrimitives.tsx",
);
const navbar = readRequired("src/components/Navbar.tsx");
const adminDropdown = readAggregate(
  "src/components/Navigation/AdminDropdown.tsx",
  "src/components/creative-tim/kandydrops/navigation/KandyAdminMenuSurface.tsx",
);
const profileDropdown = readAggregate(
  "src/components/Navigation/ProfileDropdown.tsx",
  "src/components/creative-tim/kandydrops/navigation/KandyProfileMenuSurface.tsx",
);
const notificationBell = readRequired("src/components/Navigation/NotificationBell.tsx");
const stickyFilterBar = readRequired("src/components/StickyFilterBar.tsx");
const dropCardParts = readRequired("src/components/DropCardParts.tsx");
const dropCardLayout = readRequired("src/components/DropCardLayout.tsx");
const lockedPreviewView = readRequired("src/components/Drops/LockedDropPreviewView.tsx");
const purchaseModal = readAggregate(
  "src/components/PurchaseModal.tsx",
  "src/components/creative-tim/kandydrops/wallet/KandyWalletModalFrame.tsx",
  "src/components/creative-tim/kandydrops/wallet/KandyWalletPackagePicker.tsx",
);
const humanErrorNotice = readRequired("src/components/errors/HumanErrorNotice.tsx");
const thumbnailsSlider = readRequired("src/app/dashboard/viewer/components/ThumbnailsSlider.tsx");
const chatExperience = readAggregate(
  "src/components/Chat/ChatExperience.tsx",
  "src/components/creative-tim/kandydrops/chat/ChatNewMessageModal.tsx",
);
const adminAnalytics = readAggregate(
  "src/app/admin/analytics/page.tsx",
  "src/components/Admin/Analytics/AdminAnalyticsPrimitives.tsx",
);
const adminDebug = readAggregate(
  "src/app/admin/debug/page.tsx",
  "src/components/creative-tim/kandydrops/admin-debug/AdminDebugControlCanvas.tsx",
);
const adminDashboardModule = readRequired("src/components/Admin/AdminDashboardModule.tsx");
const notFoundSurface = readRequired("src/components/ui/NotFoundSurface.tsx");
const testFile = readRequired("tests/unit/accessibility-tap-targets.spec.ts");
const auditLedger = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const repoLedger = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");

const mobileController = readRequired("src/components/Navigation/MobileBottomBar.tsx");
requireIncludes(mobileController, "from \"@/components/creative-tim/kandydrops/navigation/KandyNavigationPrimitives\"", "src/components/Navigation/MobileBottomBar.tsx active control binding");
requireIncludes(mobileController, "<KandyMobileNavigationDock", "src/components/Navigation/MobileBottomBar.tsx active control binding");
requireIncludes(mobileController, "openPurchaseModal();", "src/components/Navigation/MobileBottomBar.tsx active control binding");
const profileController = readRequired("src/components/Navigation/ProfileDropdown.tsx");
requireIncludes(profileController, "from \"@/components/creative-tim/kandydrops/navigation/KandyProfileMenuSurface\"", "src/components/Navigation/ProfileDropdown.tsx active control binding");
requireIncludes(profileController, "<KandyProfileMenuSurface", "src/components/Navigation/ProfileDropdown.tsx active control binding");
requireIncludes(profileController, "triggerRef={triggerRef}", "src/components/Navigation/ProfileDropdown.tsx active control binding");
requireIncludes(profileController, "menuRef={menuRef}", "src/components/Navigation/ProfileDropdown.tsx active control binding");
requireIncludes(profileController, "onMenuKeyDown={handleMenuNavigation}", "src/components/Navigation/ProfileDropdown.tsx active control binding");
requireIncludes(profileController, "onNavigate={handleNavigation}", "src/components/Navigation/ProfileDropdown.tsx active control binding");
requireIncludes(profileController, "navigationSections={navigationSections}", "src/components/Navigation/ProfileDropdown.tsx active control binding");
const chatController = readRequired("src/components/Chat/ChatExperience.tsx");
requireIncludes(chatController, "from \"@/components/creative-tim/kandydrops/chat/ChatNewMessageModal\"", "src/components/Chat/ChatExperience.tsx active control binding");
requireIncludes(chatController, "<ChatNewMessageModal", "src/components/Chat/ChatExperience.tsx active control binding");
requireIncludes(chatController, "open={composePickerOpen}", "src/components/Chat/ChatExperience.tsx active control binding");
requireIncludes(chatController, "onClose={() => setComposePickerOpen(false)}", "src/components/Chat/ChatExperience.tsx active control binding");
requireIncludes(chatController, "onSelectCreator={openThreadComposer}", "src/components/Chat/ChatExperience.tsx active control binding");
const adminController = readRequired("src/components/Navigation/AdminDropdown.tsx");
requireIncludes(adminController, "from \"@/components/creative-tim/kandydrops/navigation/KandyAdminMenuSurface\"", "src/components/Navigation/AdminDropdown.tsx active control binding");
requireIncludes(adminController, "<KandyAdminMenuSurface", "src/components/Navigation/AdminDropdown.tsx active control binding");
requireIncludes(adminController, "pathname={pathname}", "src/components/Navigation/AdminDropdown.tsx active control binding");
requireIncludes(adminController, "navigationItems={navItems}", "src/components/Navigation/AdminDropdown.tsx active control binding");
const analyticsController = readRequired("src/app/admin/analytics/page.tsx");
requireIncludes(analyticsController, "from \"@/components/creative-tim/ui/native-select\"", "src/app/admin/analytics/page.tsx active control binding");
requireIncludes(analyticsController, "Evidence lens", "src/app/admin/analytics/page.tsx active control binding");
requireIncludes(analyticsController, "value={activeTab}", "src/app/admin/analytics/page.tsx active control binding");
requireIncludes(analyticsController, "onChange={(event) => setActiveTab(event.target.value as typeof activeTab)}", "src/app/admin/analytics/page.tsx active control binding");
requireIncludes(analyticsController, "{TAB_OPTIONS.map((tab) => <NativeSelectOption key={tab.id} value={tab.id}>{tab.label}</NativeSelectOption>)}", "src/app/admin/analytics/page.tsx active control binding");
if (analyticsController.includes("mobileViewMode")) failures.push("Admin Analytics must not restore detached page-level view state.");
// Trace the local view state into the control and consumer actually returned by the pane.
// Orphan helpers/comments and an unused imported control cannot satisfy this obligation.
function hasBoundAnalyticsPaneViewControl(path: string, source: string, value: string, setter: string) {
  const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let controlName: string | undefined;
  for (const node of tree.statements) {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)
      || node.moduleSpecifier.text !== "@/components/Admin/Analytics/AdminAnalyticsPrimitives"
      || !node.importClause?.namedBindings || !ts.isNamedImports(node.importClause.namedBindings)) continue;
    controlName = node.importClause.namedBindings.elements.find(item => (item.propertyName ?? item.name).text === "AnalyticsViewModeToggle")?.name.text;
  }
  const component = tree.statements.find(node => ts.isFunctionDeclaration(node)
    && node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)
    && node.name?.text === path.split("/").at(-1)?.replace(".tsx", ""));
  if (!controlName || !component || !ts.isFunctionDeclaration(component) || !component.body) return false;
  const returns: ts.Expression[] = [];
  const findReturns = (node: ts.Node) => {
    if (node !== component && ts.isFunctionLike(node)) return;
    if (ts.isReturnStatement(node) && node.expression) returns.push(node.expression);
    ts.forEachChild(node, findReturns);
  };
  findReturns(component);
  let controlBound = false, consumerBound = false;
  const inspect = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const expression = (name: string) => {
        const prop = node.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText(tree) === name);
        return prop && ts.isJsxAttribute(prop) && prop.initializer && ts.isJsxExpression(prop.initializer) ? prop.initializer.expression?.getText(tree) : undefined;
      };
      if (node.tagName.getText(tree) === controlName && expression("value") === value && expression("onChange") === setter) controlBound = true;
      if (expression("data-admin-analytics-mobile-view-mode") === value) consumerBound = true;
    }
    ts.forEachChild(node, inspect);
  };
  returns.forEach(inspect);
  return controlBound && consumerBound;
}
for (const [path, value, setter] of [
  ["src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx", "livePulseViewMode", "setLivePulseViewMode"],
  ["src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx", "deviceMixViewMode", "setDeviceMixViewMode"],
  ["src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx", "packagePerformanceViewMode", "setPackagePerformanceViewMode"],
]) {
  if (!hasBoundAnalyticsPaneViewControl(path, readRequired(path), value, setter)) failures.push(path + " must retain its actual returned local view control and selected consumer.");
}
const debugController = readRequired("src/app/admin/debug/page.tsx");
requireIncludes(debugController, "from \"@/components/creative-tim/kandydrops/admin-debug/AdminDebugControlCanvas\"", "src/app/admin/debug/page.tsx active control binding");
requireIncludes(debugController, "<AdminDebugControlCanvas", "src/app/admin/debug/page.tsx active control binding");
requireIncludes(debugController, "tabs={DEBUG_TABS}", "src/app/admin/debug/page.tsx active control binding");
requireIncludes(debugController, "activeTab={activeTab}", "src/app/admin/debug/page.tsx active control binding");
requireIncludes(debugController, "onTabChange={(tabId) => handleActiveTabChange(tabId as DebugTabId)}", "src/app/admin/debug/page.tsx active control binding");
requireIncludes(debugController, "setActiveTab(nextTab)", "src/app/admin/debug/page.tsx active control binding");
requireIncludes(debugController, "persistDebugPreferences({ activeTab: nextTab })", "src/app/admin/debug/page.tsx active control binding");
const debugCanvas = readRequired("src/components/creative-tim/kandydrops/admin-debug/AdminDebugControlCanvas.tsx");
requireIncludes(debugCanvas, "from \"@/components/creative-tim/ui/native-select\"", "src/components/creative-tim/kandydrops/admin-debug/AdminDebugControlCanvas.tsx active control binding");
requireIncludes(debugCanvas, "<NativeSelect", "src/components/creative-tim/kandydrops/admin-debug/AdminDebugControlCanvas.tsx active control binding");
requireIncludes(debugCanvas, "value={activeTab}", "src/components/creative-tim/kandydrops/admin-debug/AdminDebugControlCanvas.tsx active control binding");
requireIncludes(debugCanvas, "onChange={(event) => onTabChange(event.target.value)}", "src/components/creative-tim/kandydrops/admin-debug/AdminDebugControlCanvas.tsx active control binding");
requireIncludes(debugCanvas, "aria-label=\"Debug workstream\"", "src/components/creative-tim/kandydrops/admin-debug/AdminDebugControlCanvas.tsx active control binding");
requireIncludes(debugCanvas, "<NativeSelectOption key={tab.id} value={tab.id}>{tab.label}</NativeSelectOption>", "src/components/creative-tim/kandydrops/admin-debug/AdminDebugControlCanvas.tsx active control binding");
const nativeSelect = readRequired("src/components/creative-tim/ui/native-select.tsx");
requireIncludes(nativeSelect, "<select", "src/components/creative-tim/ui/native-select.tsx active control binding");
requireIncludes(nativeSelect, "{...props}", "src/components/creative-tim/ui/native-select.tsx active control binding");
requireIncludes(nativeSelect, "<option", "src/components/creative-tim/ui/native-select.tsx active control binding");
requireIncludes(nativeSelect, "h-11 w-full", "src/components/creative-tim/ui/native-select.tsx active control binding");

for (const surfaceKey of [
  "top-nav",
  "bottom-nav",
  "drops-page",
  "drop-card-countdown",
  "wallet-purchase-modal",
  "unlock-modal",
  "viewer",
  "chat-messages",
  "notifications",
  "auth-onboarding",
  "creator-profile",
  "admin-overview",
  "admin-analytics",
  "admin-debug",
  "not-found",
  "shared-modals-drawers-tabs-filters-icon-buttons",
]) {
  requireSurface(surfaces, surfaceKey);
}

for (const expected of [
  "native `button` or `a`",
  "Icon-only controls need an accessible name",
  "aria-current=\"page\"",
  "aria-pressed",
  "aria-expanded",
  "Countdown timers",
  "44 CSS pixels",
  "Run `npm run check:accessibility-tap-targets`",
]) {
  requireIncludes(docs, expected, "Accessibility tap-target doctrine");
}

requireIncludes(packageJson, "check:accessibility-tap-targets", "package.json");
requireIncludes(packageJson, "scripts/agent/validate-accessibility-tap-targets.ts", "package.json");

for (const expected of [
  "aria-label=\"Mobile navigation\"",
  "aria-current={isActive ? \"page\" : undefined}",
  "aria-label=\"Open wallet\"",
  "USER_MOBILE_BOTTOM_NAV_HEIGHT",
]) {
  requireIncludes(mobileBottomBar, expected, "Mobile bottom bar accessibility contract");
}

requireIncludes(navbar, "aria-label=\"KandyDrops home\"", "Navbar home link");
requireIncludes(navbar, "aria-label=\"Buy Gum Drops\"", "Navbar wallet action");
requireIncludes(navbar, "aria-label=\"Open profile menu\"", "Navbar profile action");

for (const expected of [
  "usePathname",
  "aria-expanded={isOpen}",
  "aria-haspopup=\"menu\"",
  "aria-current={isActive ? \"page\" : undefined}",
  "aria-label=\"Open admin workspace\"",
  "aria-label=\"Admin workspace menu\"",
]) {
  requireIncludes(adminDropdown, expected, "Admin dropdown accessibility contract");
}

for (const expected of [
  "aria-expanded={isOpen}",
  "aria-haspopup=\"menu\"",
  "aria-label=\"Open account settings\"",
]) {
  requireIncludes(profileDropdown, expected, "Profile dropdown accessibility contract");
}

for (const expected of [
  "aria-expanded={isOpen}",
  "aria-label=\"Notifications\"",
  "aria-expanded={isExpanded}",
  "aria-label=\"Clear all notifications\"",
]) {
  requireIncludes(notificationBell, expected, "Notification dropdown accessibility contract");
}

for (const expected of [
  "aria-pressed={isSelected}",
  "aria-expanded={isExpanded}",
  "aria-label={isExpanded ? \"Collapse Drop filters\" : \"Show all Drop filters\"}",
]) {
  requireIncludes(stickyFilterBar, expected, "Sticky filter accessibility contract");
}

for (const expected of [
  "aria-label={fullLabel}",
  "title={fullLabel}",
  "aria-live=\"off\"",
]) {
  requireIncludes(dropCardParts, expected, "Drop countdown accessibility contract");
}

requireIncludes(dropCardLayout, "aria-label={`Preview ${drop.title}`}", "Drop card preview button");

const lockedPreviewSource = readSourceAst("src/components/Drops/LockedDropPreviewView.tsx");
const lockedPreviewRender = sourceRenderNodes(lockedPreviewSource, "LockedDropPreviewView");
for (const handler of ["onShare", "onCtaClick", "onOpenLibrary", "onKeepUnwrapping"]) {
  if (!hasJsxAttribute(lockedPreviewRender, "onClick", handler)) failures.push("Full-page preview rendered action must retain its actual callback: " + handler + ".");
}
function hasPreviewActionLabel(handler: string, label: string) {
  return someSourceNode(lockedPreviewRender, (node) => ts.isJsxElement(node)
    && hasJsxAttribute([node.openingElement], "onClick", handler)
    && node.children.some((child) => {
      if (ts.isJsxText(child)) return child.getText().trim().replace(/\s+/g, " ") === label;
      if (!ts.isJsxExpression(child) || !child.expression) return false;
      const expression = child.expression;
      if (ts.isStringLiteral(expression)) return expression.text === label;
      // Follow only the scalar helper consumed as this action's visible child.
      // Unused helpers, event callbacks and unreachable returns cannot supply its name.
      if (!ts.isCallExpression(expression) || !ts.isIdentifier(expression.expression)) return false;
      return someSourceNode(sourceRenderNodes(lockedPreviewSource, expression.expression.text),
        (returned) => ts.isStringLiteral(returned) && returned.text === label);
    }));
}
for (const [handler, label] of [["onCtaClick", "Create account to unwrap"], ["onCtaClick", "Refill to unwrap"], ["onOpenLibrary", "Open in My KandyDrops"], ["onKeepUnwrapping", "Keep Unwrapping"]]) {
  if (!hasPreviewActionLabel(handler, label)) failures.push("Full-page preview rendered action must retain its accessible label: " + label + ".");
}
if (!hasJsxAttribute(lockedPreviewRender, "aria-label", "fullLabel") && !hasJsxAttribute(lockedPreviewRender, "aria-label", "timerFullLabel")) {
  failures.push("Full-page preview rendered timer must expose its complete accessible label.");
}
if (hasJsxAttribute(lockedPreviewRender, "aria-live", "polite") || hasJsxAttribute(lockedPreviewRender, "aria-live", "assertive")) {
  failures.push("Full-page preview timer must not announce every tick.");
}

for (const expected of [
  "role=\"dialog\"",
  "aria-modal=\"true\"",
  "aria-labelledby=\"purchase-wallet-title\"",
  "<DialogContent",
  "onOpenAutoFocus",
  "onCloseAutoFocus",
  "returnFocusRef.current.focus()",
  "onEscapeKeyDown",
  "onPointerDownOutside",
  "busy={processing}",
  "disabled={processing}",
  "aria-pressed={selected}",
  "selected={isSelected}",
  "selected={isBundleSelected}",
  "<HumanErrorNotice",
]) {
  requireIncludes(purchaseModal, expected, "Purchase modal accessibility contract");
}
requireIncludes(humanErrorNotice, "role=\"alert\"", "Shared human error accessibility contract");
requireIncludes(humanErrorNotice, "min-h-11", "Shared human error action touch targets");

for (const expected of [
  "aria-label={`Show asset ${index + 1} of ${assetCount}`}",
  "const isActive = activeIndex === index",
  "aria-current={isActive ? \"true\" : undefined}",
  "aria-label=\"Scroll thumbnails left\"",
  "aria-label=\"Scroll thumbnails right\"",
]) {
  requireIncludes(thumbnailsSlider, expected, "Viewer thumbnail accessibility contract");
}

for (const expected of [
  "aria-label=\"Add attachment\"",
  "aria-expanded={attachmentMenuOpen}",
  "role=\"menu\"",
  "role=\"menuitem\"",
  "aria-label=\"Send message\"",
  "aria-label=\"Close new message picker\"",
]) {
  requireIncludes(chatExperience, expected, "Chat controls accessibility contract");
}

requireIncludes(adminAnalytics, "aria-pressed={active}", "Admin Analytics chart/table view-mode controls");
requireIncludes(adminDebug, "aria-label=\"Debug workstream\"", "Admin Debug native workstream selector");
requireIncludes(adminDashboardModule, "aria-expanded={resolvedOpen}", "Admin module expanders");
requireIncludes(notFoundSurface, "Return to App", "404 return link");

for (const [file, source] of [
  ["src/components/Navigation/MobileBottomBar.tsx", mobileBottomBar],
  ["src/components/Navigation/NotificationBell.tsx", notificationBell],
  ["src/components/DropCardLayout.tsx", dropCardLayout],
  ["src/components/Drops/LockedDropPreviewView.tsx", lockedPreviewView],
  ["src/components/PurchaseModal.tsx", purchaseModal],
  ["src/app/dashboard/viewer/components/ThumbnailsSlider.tsx", thumbnailsSlider],
] as const) {
  requireAbsent(source, "<div onClick", `${file} clickable non-button guard`);
  requireAbsent(source, "<span onClick", `${file} clickable non-button guard`);
}

for (const expected of [
  "mobile bottom navigation exposes current page state",
  "wallet modal exposes dialog semantics and the shared focus owner",
  "drop card preview and countdown controls expose accessible names",
  "viewer thumbnail controls expose labels and current state",
]) {
  requireIncludes(testFile, expected, "Accessibility tap-target tests");
}

for (const expected of [
  "Accessibility Tap Target Launch Audit",
  "accessibility-tap-target-audit.generated.json",
]) {
  requireIncludes(auditLedger, expected, "FULL_SCALE_CODEBASE_AUDIT.md");
}

requireIncludes(repoLedger, "Accessibility and tap-target", "REPO_MEMORY_LEDGER.md");
requireIncludes(checklist, "Accessibility Tap Target Launch Audit Coverage", "EVERY_FILE_FUNCTION_CHECKLIST.md");

if (failures.length > 0) {
  console.error("Accessibility tap-target validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Accessibility tap-target validation passed.");
