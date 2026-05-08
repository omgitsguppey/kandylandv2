import React from 'react';
import { SectionContainer, NavigationRow, ToggleRow, StaticRow, RowDivider } from './ProfilePrimitives';
import type { ProfileState } from '../profile-page-types';
import { Loader2, ShieldAlert, Download, Lock, FileText } from "lucide-react";
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
    const isReadOnlyProjection = state.isCreatorProjectionActive;

    return (
        <SectionContainer title="Privacy & Data">
                    {isReadOnlyProjection && (
                        <div className="border-b border-white/5 bg-brand-purple/10 px-4 py-2 text-xs font-medium text-white/80">
                            Read-only admin projection. Privacy toggles are disabled.
                        </div>
                    )}
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
                            if (isReadOnlyProjection) {
                                return;
                            }
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
                            if (isReadOnlyProjection) {
                                return;
                            }
                            updateForm("identifiedAnalyticsEnabled", value);
                            if (value) updateForm("anonymousAnalyticsEnabled", true);
                            else updateForm("allowRecommendations", false);
                        }}
                        disabled={isReadOnlyProjection}
                    />
                    <RowDivider />
                    <ToggleRow
                        label="Activity recommendations"
                        checked={formState.allowRecommendations}
                        onChange={(value) => {
                            if (isReadOnlyProjection) {
                                return;
                            }
                            updateForm("allowRecommendations", value);
                            if (value) {
                                updateForm("anonymousAnalyticsEnabled", true);
                                updateForm("identifiedAnalyticsEnabled", true);
                            }
                        }}
                        disabled={isReadOnlyProjection}
                    />
                    <RowDivider />
                    <ToggleRow
                        label="Honor Global Privacy Control"
                        checked={formState.honorGlobalPrivacyControl}
                        onChange={(value) => {
                            if (isReadOnlyProjection) {
                                return;
                            }
                            updateForm("honorGlobalPrivacyControl", value);
                        }}
                        badge={browserGpcEnabled ? "Detected" : undefined}
                        disabled={isReadOnlyProjection}
                    />
                    <RowDivider />
                    <NavigationRow
                        label="Essential Only Mode"
                        description="Turn off all optional tracking immediately."
                        icon={<ShieldAlert className="w-4 h-4" />}
                        onClick={() => {
                            if (isReadOnlyProjection) {
                                return;
                            }
                            void handleWithdrawOptionalTracking();
                        }}
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
