import React from 'react';
import { SectionContainer, NavigationRow, RowDivider } from './ProfilePrimitives';
import type { ProfileState } from '../profile-page-types';
import { Loader2, LogOut, Trash2, FileText, CircleHelp, LifeBuoy } from "lucide-react";

export function ProfileSupportSafetySection({ state }: { state: ProfileState }) {
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
        <SectionContainer title="Support & Safety">
                    <NavigationRow label="FAQ" icon={<CircleHelp className="w-4 h-4" />} href="/faq" />
                    <RowDivider />
                    <NavigationRow label="Support" icon={<LifeBuoy className="w-4 h-4" />} href="/dashboard/support" />
                    <RowDivider />
                    <NavigationRow label="Policies" icon={<FileText className="w-4 h-4" />} href="/privacy" />
                    <RowDivider />
                    <NavigationRow label="Sign out" icon={<LogOut className="w-4 h-4" />} onClick={logout} />
                    <RowDivider />
                    <NavigationRow 
                        label="Delete Account" 
                        description="Permanently erase all your data."
                        icon={isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} 
                        onClick={handleRequestDeletion}
                        destructive 
                    />
                </SectionContainer>
    );
}
