import { CREATOR_DASHBOARD_SETTINGS_TOOLS } from "@/lib/creator-dashboard/creator-settings-contract";
import { USER_SETTINGS_SURFACE_TOOLS } from "@/lib/settings/user-settings-contract";

export const SETTINGS_SURFACE_POLICY = {
  user_settings: USER_SETTINGS_SURFACE_TOOLS,
  creator_dashboard_settings: CREATOR_DASHBOARD_SETTINGS_TOOLS,
  admin_settings: [],
} as const;

export function getSettingsToolsForSurface(surface: keyof typeof SETTINGS_SURFACE_POLICY) {
  return SETTINGS_SURFACE_POLICY[surface];
}

export function isSimulativeSettingsToolAllowed() {
  return false;
}
