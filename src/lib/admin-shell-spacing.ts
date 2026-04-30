export const ADMIN_SHELL_ROUTE_CLASS = "admin-shell-route";
export const ADMIN_SHELL_GAP_TOKEN = "--admin-shell-gap";
export const ADMIN_SHELL_GAP_MD_TOKEN = "--admin-shell-gap-md";
export const ADMIN_TOP_TO_CONSOLE_GAP_CLASS = "mt-[var(--admin-shell-gap)] md:mt-[var(--admin-shell-gap-md)]";
export const ADMIN_CONSOLE_TO_CONTENT_GAP_CLASS = "mt-[var(--admin-shell-gap)] md:mt-[var(--admin-shell-gap-md)]";
export const ADMIN_CONSOLE_FLOW_CLASS = "relative z-10";

export function buildAdminShellLayoutDebugMetadata(pageId: string, bypassReason?: string) {
  const usesSharedAdminShellSpacing = !bypassReason;

  return {
    globalNavPresent: true,
    adminConsoleNavPresent: usesSharedAdminShellSpacing,
    adminConsoleInNormalFlow: usesSharedAdminShellSpacing,
    adminConsoleReservedHeight: "natural document flow",
    pageContentStartsAfterConsole: usesSharedAdminShellSpacing ? true : "unknown",
    usesSharedAdminShellSpacing,
    adminTopToConsoleGap: {
      token: ADMIN_SHELL_GAP_TOKEN,
      desktopToken: ADMIN_SHELL_GAP_MD_TOKEN,
      className: ADMIN_TOP_TO_CONSOLE_GAP_CLASS,
      value: "1rem mobile, 1.25rem tablet/desktop",
    },
    adminConsoleToContentGap: {
      token: ADMIN_SHELL_GAP_TOKEN,
      desktopToken: ADMIN_SHELL_GAP_MD_TOKEN,
      className: ADMIN_CONSOLE_TO_CONTENT_GAP_CLASS,
      value: "1rem mobile, 1.25rem tablet/desktop",
    },
    pageId,
    bypassReason: bypassReason ?? null,
    pageBypassesSharedAdminShell: Boolean(bypassReason),
    mobileSafeAreaApplied: {
      source: "global-navbar-padding",
      className: "Navbar inline paddingTop calc(0.75rem + env(safe-area-inset-top))",
    },
    duplicateSafeAreaPaddingDetected: false,
  };
}
