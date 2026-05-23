export type SettingsRouteKind =
  | "account_settings"
  | "creator_settings"
  | "user_profile"
  | "creator_dashboard"
  | "creator_drop_manager"
  | "public_creator_profile";

export type SettingsRouteStatus = "canonical" | "redirect_alias" | "migration_notice";

export type SettingsRouteEntry = {
  routeKind: SettingsRouteKind;
  canonicalRoute: string;
  label: string;
  status: SettingsRouteStatus;
  aliases: string[];
  owner: "account" | "creator" | "public_creator";
  notes: string;
};

export const SETTINGS_CANONICAL_ROUTE_TABLE = {
  accountSettingsRoute: "/settings",
  creatorSettingsRoute: "/dashboard/creator/settings",
  userProfileRoute: "/settings",
  creatorDashboardRoute: "/dashboard/creator",
  creatorDropManagerRoute: "/dashboard/creator/drops",
  publicCreatorProfileRoutePattern: "/creators/[username]",
  accountSettingsAliases: ["/dashboard/settings", "/dashboard/profile", "/profile/settings", "/account"],
  creatorDashboardAliases: ["/creator", "/creators/dashboard"],
  creatorSettingsMigrationRoutes: ["/dashboard/profile/creator"],
} as const;

export const SETTINGS_ROUTE_ENTRIES: readonly SettingsRouteEntry[] = [
  {
    routeKind: "account_settings",
    canonicalRoute: SETTINGS_CANONICAL_ROUTE_TABLE.accountSettingsRoute,
    label: "Account Settings",
    status: "canonical",
    aliases: [...SETTINGS_CANONICAL_ROUTE_TABLE.accountSettingsAliases],
    owner: "account",
    notes: "Owns account, privacy, notification, support, data export, sign out, and delete account surfaces.",
  },
  {
    routeKind: "creator_settings",
    canonicalRoute: SETTINGS_CANONICAL_ROUTE_TABLE.creatorSettingsRoute,
    label: "Creator Settings",
    status: "canonical",
    aliases: [...SETTINGS_CANONICAL_ROUTE_TABLE.creatorSettingsMigrationRoutes],
    owner: "creator",
    notes: "Owns creator workspace, profile, monetization, Fan Pass, broadcasts, requests, bookings, pricing, and timeline controls.",
  },
  {
    routeKind: "user_profile",
    canonicalRoute: SETTINGS_CANONICAL_ROUTE_TABLE.userProfileRoute,
    label: "Account Settings",
    status: "redirect_alias",
    aliases: ["/dashboard/profile"],
    owner: "account",
    notes: "The old profile settings route redirects to Account Settings; profile basics remain a section inside Account Settings.",
  },
  {
    routeKind: "creator_dashboard",
    canonicalRoute: SETTINGS_CANONICAL_ROUTE_TABLE.creatorDashboardRoute,
    label: "Creator Dashboard",
    status: "canonical",
    aliases: [...SETTINGS_CANONICAL_ROUTE_TABLE.creatorDashboardAliases],
    owner: "creator",
    notes: "Creator operations landing route, not an Account Settings or Creator Settings alias.",
  },
  {
    routeKind: "creator_drop_manager",
    canonicalRoute: SETTINGS_CANONICAL_ROUTE_TABLE.creatorDropManagerRoute,
    label: "Creator Drop Manager",
    status: "canonical",
    aliases: [],
    owner: "creator",
    notes: "Creator Drop submission and management handoff route.",
  },
  {
    routeKind: "public_creator_profile",
    canonicalRoute: SETTINGS_CANONICAL_ROUTE_TABLE.publicCreatorProfileRoutePattern,
    label: "Public Creator Profile",
    status: "canonical",
    aliases: [],
    owner: "public_creator",
    notes: "Fan-facing creator profile route built from public creator username.",
  },
] as const;

export function getSettingsRouteEntry(routeKind: SettingsRouteKind) {
  return SETTINGS_ROUTE_ENTRIES.find((entry) => entry.routeKind === routeKind) ?? null;
}
