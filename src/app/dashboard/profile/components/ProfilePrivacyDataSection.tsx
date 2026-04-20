import React from 'react';
import { SectionContainer, NavigationRow, ToggleRow, StaticRow, ValueInputRow, RowDivider } from './ProfilePrimitives';
import type { ProfileState } from '../page';
import { Loader2, User, AtSign, Bell, Globe, ShieldAlert, Mail, Camera, LogOut, Download, Trash2, Lock, FileText, CalendarClock, MessageSquare, Sparkles, Wallet, CircleHelp, LifeBuoy, CalendarDays } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { PRIVACY_POLICY_LAST_UPDATED } from "@/lib/platform-config";

export function ProfilePrivacyDataSection({ state }: { state: ProfileState }) {
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
        <SectionContainer title="Privacy & Data">
                    <StaticRow
                        label="Strictly necessary storage"
                        description="Required for sign-in and core operations."
                        icon={<Lock className="w-4 h-4" />}
                        badge="Required"
                    />
                    <RowDivider />
                    <ToggleRow
                        label="Anonymous analytics"
                        description="Measure usage without tying it to your account."
                        checked={formState.anonymousAnalyticsEnabled}
                        onChange={(value) => {
                            updateForm("anonymousAnalyticsEnabled", value);
                            if (!value) {
                                updateForm("identifiedAnalyticsEnabled", false);
                                updateForm("allowRecommendations", false);
                                updateForm("showInAnonymousStats", false);
                            }
                        }}
                    />
                    <RowDivider />
                    <ToggleRow
                        label="Account-linked analytics"
                        checked={formState.identifiedAnalyticsEnabled}
                        onChange={(value) => {
                            updateForm("identifiedAnalyticsEnabled", value);
                            if (value) updateForm("anonymousAnalyticsEnabled", true);
                            else updateForm("allowRecommendations", false);
                        }}
                    />
                    <RowDivider />
                    <ToggleRow
                        label="Activity recommendations"
                        checked={formState.allowRecommendations}
                        onChange={(value) => {
                            updateForm("allowRecommendations", value);
                            if (value) {
                                updateForm("anonymousAnalyticsEnabled", true);
                                updateForm("identifiedAnalyticsEnabled", true);
                            }
                        }}
                    />
                    <RowDivider />
                    <ToggleRow
                        label="Honor Global Privacy Control"
                        checked={formState.honorGlobalPrivacyControl}
                        onChange={(value) => updateForm("honorGlobalPrivacyControl", value)}
                        badge={browserGpcEnabled ? "Detected" : undefined}
                    />
                    <RowDivider />
                    <NavigationRow
                        label="Essential Only Mode"
                        description="Turn off all optional tracking immediately."
                        icon={<ShieldAlert className="w-4 h-4" />}
                        onClick={() => void handleWithdrawOptionalTracking()}
                    />
                    <RowDivider />
                    <NavigationRow
                        label="Download My Data"
                        description="Export your account data securely as JSON."
                        icon={isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        onClick={handleDownloadData}
                    />
                    <RowDivider />
                    <NavigationRow
                        label="Privacy Policy"
                        description={`Last updated: ${PRIVACY_POLICY_LAST_UPDATED}`}
                        icon={<FileText className="w-4 h-4" />}
                        href="/privacy"
                    />
                </SectionContainer>
    );
}
