import React from 'react';
import { SectionContainer, ToggleRow, StaticRow, RowDivider } from './ProfilePrimitives';
import type { ProfileState } from '../profile-page-types';
import { ShieldAlert } from "lucide-react";
import { trackEvent } from "@/lib/telemetry";

export function ProfileNotificationsSection({ state }: { state: ProfileState }) {
    const {
        user, userProfile, logout,
        formState, updateForm, saving, saveFeedback,
        isDownloading, isDeleting, isUploadingAvatar,
        notificationSetupLoading, notificationSupportMessage,
        runtimeOrigin, creatorSettingsState, creatorSettingsLoading,
        creatorStats, creatorBroadcasts, creatorBroadcastMessage,
        setCreatorBroadcastMessage, sendingCreatorBroadcast,
        creatorDropModalOpen, setCreatorDropModalOpen,
        creatorPayoutAmount, setCreatorPayoutAmount,
        browserGpcEnabled, isCreatorAccount,
        profileName, profileEmail, profileUsername,
        profileIdentityLabel, profileIdentityDetail,
        avatarFallback, referralLink, creatorSettingsNotice,
        handleBrowserPushToggle, handleWithdrawOptionalTracking,
        handleDownloadData, handleRequestDeletion,
        handleChangeAvatar, handleSaveCreatorSettings,
        handleSendCreatorBroadcast, handleRequestCreatorPayout,
        updateCreatorSettingsState, setCreatorSettingsState
    } = state;
    const isReadOnlyProjection = state.isCreatorProjectionActive;
    const trackNotificationToggle = (settingId: string, value: boolean) => {
        trackEvent("setting_toggle_changed", {
            setting_id: settingId,
            actor_role: userProfile?.role || "user",
            creator_id: userProfile?.uid || "",
            target_creator_id: userProfile?.uid || "",
            settings_surface: "account",
            section: "notifications",
            source_component: "ProfileNotificationsSection",
            truth_state: "source_ready",
            value: String(value),
        });
    };

    return (
        <SectionContainer title="Notifications">
                    {isReadOnlyProjection && (
                        <div className="border-b border-white/5 bg-brand-purple/10 px-4 py-2 text-xs font-medium text-white/80">
                            Read-only admin projection. Notification changes are disabled.
                        </div>
                    )}
                    <StaticRow
                        label="Service & Purchase Notices"
                        description="Required for security and payments."
                        icon={<ShieldAlert className="w-4 h-4" />}
                        badge="Required"
                    />
                    <RowDivider />
                    <ToggleRow
                        label="Browser push alerts"
                        description={notificationSupportMessage || "Reminders for tasks and drops."}
                        checked={formState.browserPushEnabled}
                        onChange={(value) => {
                            trackNotificationToggle("notification_preferences", value);
                            void handleBrowserPushToggle(value);
                        }}
                        disabled={notificationSetupLoading || isReadOnlyProjection}
                        badge={notificationSetupLoading ? "Wait" : undefined}
                    />
                    <RowDivider />
                    <ToggleRow
                        label="In-app alerts"
                        description="Show task and drop alerts inside the app."
                        checked={formState.inAppEnabled}
                        onChange={(value) => {
                            trackNotificationToggle("notification_preferences", value);
                            updateForm("inAppEnabled", value);
                        }}
                        disabled={isReadOnlyProjection}
                    />
                    <RowDivider />
                    <ToggleRow
                        label="New releases"
                        description="Alert me when new drops go live."
                        checked={formState.newDropAlerts}
                        onChange={(value) => {
                            trackNotificationToggle("notification_preferences", value);
                            updateForm("newDropAlerts", value);
                        }}
                        disabled={isReadOnlyProjection}
                    />
                    <RowDivider />
                    <StaticRow
                        label="Ending soon"
                        description="Drop expiration reminders are not available yet."
                        badge="Unavailable"
                    />
                </SectionContainer>
    );
}
