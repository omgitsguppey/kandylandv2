export const ADMIN_SHELL_ROUTE_CLASS = "admin-shell-route";
export const ADMIN_SHELL_GAP_TOKEN = "--admin-shell-gap";
export const ADMIN_SHELL_GAP_MD_TOKEN = "--admin-shell-gap-md";
export const ADMIN_TOP_TO_CONSOLE_GAP_CLASS = ADMIN_SHELL_ROUTE_CLASS;
export const ADMIN_CONSOLE_TO_CONTENT_GAP_CLASS = "mb-[var(--admin-shell-gap)] md:mb-[var(--admin-shell-gap-md)]";
export const ADMIN_CONSOLE_STICKY_TOP_CLASS = "top-[calc(4rem+env(safe-area-inset-top))] md:top-[4.75rem]";

export function buildAdminShellLayoutDebugMetadata(pageId: string, bypassReason?: string) {
  const usesSharedAdminShellSpacing = !bypassReason;

  return {
    globalNavPresent: true,
    adminConsoleNavPresent: usesSharedAdminShellSpacing,
    usesSharedAdminShellSpacing,
    adminTopToConsoleGap: {
      token: ADMIN_SHELL_GAP_TOKEN,
      desktopToken: ADMIN_SHELL_GAP_MD_TOKEN,
      className: ADMIN_TOP_TO_CONSOLE_GAP_CLASS,
      value: "1rem mobile, 1.25rem tablet/desktop after the global nav height",
    },
    adminConsoleToContentGap: {
      token: ADMIN_SHELL_GAP_TOKEN,
      desktopToken: ADMIN_SHELL_GAP_MD_TOKEN,
      className: ADMIN_CONSOLE_TO_CONTENT_GAP_CLASS,
      value: "1rem mobile, 1.25rem tablet/desktop",
    },
    pageId,
    bypassReason: bypassReason ?? null,
    mobileSafeAreaApplied: {
      source: "global-navbar-padding",
      className: "Navbar inline paddingTop calc(0.75rem + env(safe-area-inset-top))",
    },
    duplicateSafeAreaPaddingDetected: false,
  };
}
