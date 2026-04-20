import React from 'react';
import { SectionContainer, NavigationRow, ToggleRow, StaticRow, ValueInputRow, RowDivider } from './ProfilePrimitives';
import type { ProfileState } from '../page';
import { Loader2, User, AtSign, Bell, Globe, ShieldAlert, Mail, Camera, LogOut, Download, Trash2, Lock, FileText, CalendarClock, MessageSquare, Sparkles, Wallet, CircleHelp, LifeBuoy, CalendarDays } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { sanitizeUsername } from "../hooks/useProfileState";

export function ProfileProfileSection({ state }: { state: ProfileState }) {
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
        <SectionContainer title="Profile">
                    <div className="flex items-center gap-4 p-4">
                        <div className="group relative h-16 w-16 rounded-full overflow-hidden border border-white/10 bg-black/40 shrink-0 cursor-pointer">
                            <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={handleChangeAvatar}
                                disabled={isUploadingAvatar}
                            />
                            {isUploadingAvatar ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity z-0">
                                    <Camera className="w-5 h-5 text-white" />
                                </div>
                            )}
                            {user?.photoURL ? (
                                // @ts-ignore
                                <Image src={user.photoURL} alt="Avatar" fill sizes="64px" className="object-cover" />
                            ) : (
                                <span className="flex h-full w-full items-center justify-center text-xl font-bold text-white">{avatarFallback}</span>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-lg font-bold text-white truncate">{profileIdentityLabel}</p>
                            <p className="text-sm text-gray-400 truncate">{profileIdentityDetail}</p>
                        </div>
                    </div>
                    <RowDivider />
                    <ValueInputRow
                        label="Display Name"
                        value={formState.displayName}
                        onChange={(val) => updateForm("displayName", val)}
                        placeholder="Enter your name"
                        icon={<User className="w-4 h-4" />}
                    />
                    <RowDivider />
                    <ValueInputRow
                        label="Username"
                        description="Used for short URLs and identification"
                        value={formState.username}
                        onChange={(val) => updateForm("username", sanitizeUsername(val))}
                        placeholder="your_handle"
                        icon={<AtSign className="w-4 h-4" />}
                    />
                </SectionContainer>
    );
}
