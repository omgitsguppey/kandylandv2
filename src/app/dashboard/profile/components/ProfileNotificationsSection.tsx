import React from 'react';
import { SectionContainer, ToggleRow, StaticRow, RowDivider } from './ProfilePrimitives';
import type { ProfileState } from '../profile-page-types';
import { ShieldAlert } from "lucide-react";

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

    return (
        <SectionContainer title="Notifications">
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
                        onChange={(value) => void handleBrowserPushToggle(value)}
                        disabled={notificationSetupLoading}
                        badge={notificationSetupLoading ? "Wait" : undefined}
                    />
                    <RowDivider />
                    <ToggleRow
                        label="In-app alerts"
                        description="Show task and drop alerts inside the app."
                        checked={formState.inAppEnabled}
                        onChange={(value) => updateForm("inAppEnabled", value)}
                    />
                    <RowDivider />
                    <ToggleRow
                        label="New releases"
                        description="Alert me when new drops go live."
                        checked={formState.newDropAlerts}
                        onChange={(value) => updateForm("newDropAlerts", value)}
                    />
                    <RowDivider />
                    <ToggleRow
                        label="Ending soon"
                        description="Warn me before drops expire."
                        checked={formState.expiringSoonAlerts}
                        onChange={(value) => updateForm("expiringSoonAlerts", value)}
                    />
                </SectionContainer>
    );
}
