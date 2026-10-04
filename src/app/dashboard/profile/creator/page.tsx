import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { CreatorSettingsMigrationPanel } from "@/components/creative-tim/kandydrops/account/CreatorSettingsMigrationPanel";
import { CREATOR_SETTINGS_ROUTE } from "@/lib/creator-profile-routing";

export default function LegacyCreatorSettingsPage() {
  return (
    <>
      <PageViewEvent
        eventName="creator_settings_migrated_redirect_viewed"
        eventParams={{
          actor_role: "creator",
          creator_id: "",
          target_creator_id: "",
          section: "migration_notice",
          source_component: "LegacyCreatorSettingsPage",
          truth_state: "migrated",
        }}
      />
      <CreatorSettingsMigrationPanel href={CREATOR_SETTINGS_ROUTE} />
    </>
  );
}
