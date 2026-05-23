import React from 'react';
import { SectionContainer, NavigationRow, RowDivider } from './ProfilePrimitives';
import type { ProfileState } from '../profile-page-types';
import { Loader2, LogOut, Trash2, FileText, CircleHelp, LifeBuoy, X } from "lucide-react";

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
        handleDownloadData, handleRequestDeletion, handleCancelAccountDeletion, handleConfirmAccountDeletion,
        deleteConfirmationOpen, deletionFeedback,
        handleChangeAvatar, handleSaveCreatorSettings,
        handleSendCreatorBroadcast, handleRequestCreatorPayout,
        updateCreatorSettingsState, setCreatorSettingsState
    } = state;

    return (
        <>
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
            {deleteConfirmationOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-8 backdrop-blur-md sm:items-center"
                    data-account-delete-confirmation-modal="true"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="account-delete-title"
                >
                    <div className="w-full max-w-md rounded-3xl border border-red-400/20 bg-black/90 p-4 text-white shadow-[0_28px_80px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p id="account-delete-title" className="text-lg font-extrabold tracking-tight text-white">
                                    Delete account?
                                </p>
                                <p className="mt-1 text-sm leading-relaxed text-white/65">
                                    This permanently deletes your account, KandyDrops collection, and account data after this confirmation. This cannot be undone.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleCancelAccountDeletion}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10"
                                aria-label="Cancel account deletion"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {deletionFeedback ? (
                            <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm leading-relaxed text-red-100">
                                {deletionFeedback}
                            </div>
                        ) : null}

                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={handleCancelAccountDeletion}
                                className="min-h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white transition hover:bg-white/10"
                                disabled={isDeleting}
                            >
                                Keep account
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmAccountDeletion}
                                className="min-h-11 rounded-2xl bg-red-500 px-4 text-sm font-extrabold text-white shadow-lg shadow-red-950/30 transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-70"
                                disabled={isDeleting}
                            >
                                {isDeleting ? "Deleting..." : "Delete account"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
