export type SettingsSurface = "user_settings" | "creator_dashboard_settings" | "admin_settings";

export type SettingsLegacyStatus = "canonical" | "migrated" | "deprecated" | "blocked";

export type SettingsRole = "guest" | "user" | "creator" | "admin";

export type SettingsToolContract = {
  id: string;
  label: string;
  surfaceOwner: SettingsSurface;
  allowedRoles: SettingsRole[];
  sourceTruth: "server_truth" | "user_profile" | "creator_settings" | "creator_broadcasts";
  route: string;
  readEndpoint: string;
  writeEndpoint: string;
  simulativeAllowed: false;
  legacyStatus: SettingsLegacyStatus;
  requiredTelemetryEvents: string[];
};

export const USER_SETTINGS_SURFACE_TOOLS: SettingsToolContract[] = [
  {
    id: "account_profile",
    label: "Account basics",
    surfaceOwner: "user_settings",
    allowedRoles: ["user", "creator", "admin"],
    sourceTruth: "user_profile",
    route: "/settings",
    readEndpoint: "/api/user/profile",
    writeEndpoint: "/api/user/profile",
    simulativeAllowed: false,
    legacyStatus: "canonical",
    requiredTelemetryEvents: ["user_settings_viewed"],
  },
  {
    id: "privacy_preferences",
    label: "Privacy",
    surfaceOwner: "user_settings",
    allowedRoles: ["user", "creator", "admin"],
    sourceTruth: "user_profile",
    route: "/settings",
    readEndpoint: "/api/user/profile",
    writeEndpoint: "/api/user/profile",
    simulativeAllowed: false,
    legacyStatus: "canonical",
    requiredTelemetryEvents: ["user_settings_viewed"],
  },
  {
    id: "notification_preferences",
    label: "Notifications",
    surfaceOwner: "user_settings",
    allowedRoles: ["user", "creator", "admin"],
    sourceTruth: "server_truth",
    route: "/settings",
    readEndpoint: "/api/notifications",
    writeEndpoint: "/api/notifications",
    simulativeAllowed: false,
    legacyStatus: "canonical",
    requiredTelemetryEvents: ["user_settings_viewed"],
  },
  {
    id: "app_preferences",
    label: "App preferences",
    surfaceOwner: "user_settings",
    allowedRoles: ["user", "creator", "admin"],
    sourceTruth: "user_profile",
    route: "/settings",
    readEndpoint: "/api/user/profile",
    writeEndpoint: "/api/user/profile",
    simulativeAllowed: false,
    legacyStatus: "canonical",
    requiredTelemetryEvents: ["user_settings_viewed"],
  },
  {
    id: "support_legal",
    label: "Support & legal",
    surfaceOwner: "user_settings",
    allowedRoles: ["guest", "user", "creator", "admin"],
    sourceTruth: "server_truth",
    route: "/settings",
    readEndpoint: "/api/support/threads",
    writeEndpoint: "/api/support/threads",
    simulativeAllowed: false,
    legacyStatus: "canonical",
    requiredTelemetryEvents: ["user_settings_viewed"],
  },
];
