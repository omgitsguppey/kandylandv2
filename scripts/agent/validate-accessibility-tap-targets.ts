import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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
const mobileBottomBar = readRequired("src/components/Navigation/MobileBottomBar.tsx");
const navbar = readRequired("src/components/Navbar.tsx");
const adminDropdown = readRequired("src/components/Navigation/AdminDropdown.tsx");
const profileDropdown = readRequired("src/components/Navigation/ProfileDropdown.tsx");
const notificationBell = readRequired("src/components/Navigation/NotificationBell.tsx");
const stickyFilterBar = readRequired("src/components/StickyFilterBar.tsx");
const dropCardParts = readRequired("src/components/DropCardParts.tsx");
const dropCardLayout = readRequired("src/components/DropCardLayout.tsx");
const dropPreviewModal = readRequired("src/components/DropPreviewModal.tsx");
const purchaseModal = readRequired("src/components/PurchaseModal.tsx");
const humanErrorNotice = readRequired("src/components/errors/HumanErrorNotice.tsx");
const thumbnailsSlider = readRequired("src/app/dashboard/viewer/components/ThumbnailsSlider.tsx");
const chatExperience = readRequired("src/components/Chat/ChatExperience.tsx");
const adminAnalytics = readRequired("src/app/admin/analytics/page.tsx");
const adminDebug = readRequired("src/app/admin/debug/page.tsx");
const adminDashboardModule = readRequired("src/components/Admin/AdminDashboardModule.tsx");
const notFoundSurface = readRequired("src/components/ui/NotFoundSurface.tsx");
const testFile = readRequired("tests/unit/accessibility-tap-targets.spec.ts");
const auditLedger = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const repoLedger = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");

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
  "aria-label=\"Admin navigation\"",
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

for (const expected of [
  "Dialog.Content",
  "aria-label=\"Share\"",
  "aria-label=\"Close\"",
  "aria-label=\"Create a profile to unlock this Drop\"",
  "aria-live=\"off\"",
  "aria-pressed={confirming}",
]) {
  requireIncludes(dropPreviewModal, expected, "Drop preview modal accessibility contract");
}

for (const expected of [
  "role=\"dialog\"",
  "aria-modal=\"true\"",
  "aria-labelledby=\"purchase-wallet-title\"",
  "closeButtonRef.current?.focus()",
  "event.key === \"Escape\"",
  "event.key !== \"Tab\"",
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
  "aria-label={`Show asset ${idx + 1} of ${assetCount}`}",
  "aria-current={activeIndex === idx ? \"true\" : undefined}",
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

requireIncludes(adminAnalytics, "aria-pressed={active}", "Admin Analytics tab controls");
requireIncludes(adminDebug, "aria-pressed={active}", "Admin Debug tab controls");
requireIncludes(adminDashboardModule, "aria-expanded={resolvedOpen}", "Admin module expanders");
requireIncludes(notFoundSurface, "Return to App", "404 return link");

for (const [file, source] of [
  ["src/components/Navigation/MobileBottomBar.tsx", mobileBottomBar],
  ["src/components/Navigation/NotificationBell.tsx", notificationBell],
  ["src/components/DropCardLayout.tsx", dropCardLayout],
  ["src/components/DropPreviewModal.tsx", dropPreviewModal],
  ["src/components/PurchaseModal.tsx", purchaseModal],
  ["src/app/dashboard/viewer/components/ThumbnailsSlider.tsx", thumbnailsSlider],
] as const) {
  requireAbsent(source, "<div onClick", `${file} clickable non-button guard`);
  requireAbsent(source, "<span onClick", `${file} clickable non-button guard`);
}

for (const expected of [
  "mobile bottom navigation exposes current page state",
  "wallet modal exposes dialog semantics and focus behavior",
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
