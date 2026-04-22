import React from 'react';
import { SectionContainer, ValueInputRow, RowDivider } from './ProfilePrimitives';
import type { ProfileState } from '../profile-page-types';
import { TIMEZONE_OPTIONS, normalizeTimezone } from '../hooks/useProfileState';
import { Globe, Mail, CalendarDays } from "lucide-react";

export function ProfileAccountSection({ state }: { state: ProfileState }) {
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
        <SectionContainer title="Account">
                    <div className="flex w-full items-center justify-between gap-4 py-3.5 px-4">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="mt-0.5 shrink-0 text-gray-400"><Mail className="w-4 h-4" /></div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-300">Email Address</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400 truncate max-w-[150px] sm:max-w-none">{profileEmail}</p>
                    </div>
                    <RowDivider />
                    <ValueInputRow
                        label="Birthday"
                        value={formState.dateOfBirth}
                        onChange={(val) => updateForm("dateOfBirth", val)}
                        type="date"
                        icon={<CalendarDays className="w-4 h-4" />}
                    />
                    <RowDivider />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-4 bg-black/30">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="mt-0.5 shrink-0 text-gray-400"><Globe className="w-4 h-4" /></div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-300">Timezone</p>
                            </div>
                        </div>
                        <select
                            value={formState.timezone}
                            onChange={(e) => updateForm("timezone", normalizeTimezone(e.target.value))}
                            className="w-full sm:w-48 appearance-none rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white focus:outline-none"
                        >
                            {TIMEZONE_OPTIONS.map((tz: string) => (
                                <option key={tz} value={tz}>{tz}</option>
                            ))}
                        </select>
                    </div>
                    <RowDivider />
                    <div className="grid grid-cols-3 divide-x divide-white/5 py-3">
                        <div className="flex flex-col items-center justify-center text-center px-2">
                            <span className="text-lg font-bold text-white">{userProfile?.gumDropsBalance || 0}</span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-0.5">GumDrops</span>
                        </div>
                        <div className="flex flex-col items-center justify-center text-center px-2">
                            <span className="text-lg font-bold text-white">{userProfile?.unlockedContent?.length || 0}</span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-0.5">Unlocked</span>
                        </div>
                        <div className="flex flex-col items-center justify-center text-center px-2">
                            <span className="text-sm font-bold text-white pt-1">{userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString([], { month: 'short', year: 'numeric' }) : "Recently"}</span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1">Joined</span>
                        </div>
                    </div>
                </SectionContainer>
    );
}
