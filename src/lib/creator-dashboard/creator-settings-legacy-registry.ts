export type CreatorSettingsLegacyStatus = "migrated" | "blocked" | "deprecated" | "adapter";

export type CreatorSettingsLegacyRecord = {
  id: string;
  label: string;
  location: string;
  status: CreatorSettingsLegacyStatus;
  migrationNote: string;
};

export const CREATOR_SETTINGS_LEGACY_REGISTRY: CreatorSettingsLegacyRecord[] = [
  {
    id: "global_user_settings_creator_broadcasts",
    label: "Creator broadcasts in user settings",
    location: "src/app/dashboard/profile/page.tsx",
    status: "blocked",
    migrationNote: "Creator broadcasts now live in the Creator Dashboard broadcast manager.",
  },
  {
    id: "global_user_settings_creator_monetization",
    label: "Creator monetization tools in user settings",
    location: "src/app/dashboard/profile/components/ProfileCreatorToolsSection.tsx",
    status: "blocked",
    migrationNote: "Monetization tools moved into the Creator Dashboard settings hub.",
  },
  {
    id: "global_user_settings_creator_earnings",
    label: "Creator earnings in user settings",
    location: "src/app/dashboard/profile/components/ProfileCreatorEarningsSection.tsx",
    status: "blocked",
    migrationNote: "Earnings and payout status belong in the Creator Dashboard.",
  },
  {
    id: "simulated_creator_broadcast_history",
    label: "Simulated creator broadcast history",
    location: "src/components/Creators/CreatorUpdatesFeed.tsx",
    status: "deprecated",
    migrationNote: "Broadcast history must read from the real broadcast collection only.",
  },
];
