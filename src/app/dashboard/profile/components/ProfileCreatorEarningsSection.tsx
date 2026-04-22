import React from 'react';
import { SectionContainer, RowDivider } from './ProfilePrimitives';
import type { ProfileState } from '../profile-page-types';

export function ProfileCreatorEarningsSection({ state }: { state: ProfileState }) {
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
        <SectionContainer title="Creator Earnings">
                        <div className="flex items-center justify-between px-4 py-4">
                            <div>
                                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">Earnings</p>
                                <p className="text-2xl font-black text-brand-purple mt-1">{creatorStats?.earningsGd || 0} GD</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">Subscribers</p>
                                <p className="text-xl font-bold text-white mt-1">{creatorStats?.activeSubscribers || 0}</p>
                            </div>
                        </div>
                        <RowDivider />
                        <div className="p-4 bg-black/20">
                            <p className="text-sm font-medium text-gray-200 mb-2">Request Payout <span className="text-gray-500 text-xs ml-1">(100 GD = $1)</span></p>
                            <div className="flex gap-3">
                                <input
                                    type="number"
                                    min={100}
                                    step={100}
                                    value={creatorPayoutAmount}
                                    onChange={(event) => setCreatorPayoutAmount(Math.max(100, Number(event.target.value) || 100))}
                                    className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-purple/50"
                                />
                                <button
                                    type="button"
                                    onClick={handleRequestCreatorPayout}
                                    className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15 transition-colors"
                                >
                                    Request
                                </button>
                            </div>
                        </div>
                    </SectionContainer>
    );
}
