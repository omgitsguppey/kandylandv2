import React from 'react';
import { SectionContainer, NavigationRow, ToggleRow, ValueInputRow, RowDivider } from './ProfilePrimitives';
import type { ProfileState } from '../page';
import { CalendarClock, MessageSquare, Sparkles, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { CREATOR_SUBSCRIPTION_MIN_GD } from "@/lib/creator-experiences";

export function ProfileCreatorToolsSection({ state }: { state: ProfileState }) {
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
        <SectionContainer title="Creator Tools">
                        {creatorSettingsNotice && (
                            <div className="px-4 py-3 bg-amber-500/10 text-amber-200 text-xs border-b border-white/5">
                                {creatorSettingsNotice}
                            </div>
                        )}
                        <ToggleRow
                            label="Creator messaging"
                            checked={creatorSettingsState.messagingEnabled}
                            onChange={(value) => updateCreatorSettingsState("messagingEnabled", value)}
                            icon={<MessageSquare className="w-4 h-4" />}
                        />
                        <RowDivider />
                        <ToggleRow
                            label="Creator broadcasts"
                            checked={creatorSettingsState.broadcastsEnabled}
                            onChange={(value) => updateCreatorSettingsState("broadcastsEnabled", value)}
                            icon={<Sparkles className="w-4 h-4" />}
                        />
                        {creatorSettingsState.broadcastsEnabled && (
                            <div className="px-4 py-3 bg-black/40 border-y border-white/5 mx-4 my-2 rounded-xl">
                                <textarea
                                    value={creatorBroadcastMessage}
                                    onChange={(event) => setCreatorBroadcastMessage(event.target.value.slice(0, 280))}
                                    rows={2}
                                    placeholder="Tell followers what just dropped..."
                                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white resize-none outline-none focus:border-brand-purple/50"
                                />
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-[10px] text-gray-500">{creatorBroadcastMessage.length}/280</span>
                                    <button
                                        type="button"
                                        onClick={handleSendCreatorBroadcast}
                                        disabled={sendingCreatorBroadcast || creatorBroadcastMessage.trim().length < 4}
                                        className="rounded-md bg-brand-purple/20 text-brand-purple px-3 py-1 text-xs font-bold disabled:opacity-50 transition-colors"
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>
                        )}
                        <RowDivider />
                        <ToggleRow
                            label="Subscriptions"
                            checked={creatorSettingsState.subscriptionsEnabled}
                            onChange={(value) => updateCreatorSettingsState("subscriptionsEnabled", value)}
                            icon={<Wallet className="w-4 h-4" />}
                        />
                        {creatorSettingsState.subscriptionsEnabled && (
                            <>
                                <RowDivider />
                                <ValueInputRow
                                    label="Monthly price w/ fees"
                                    type="number"
                                    min={CREATOR_SUBSCRIPTION_MIN_GD}
                                    value={creatorSettingsState.subscriptionPriceGd}
                                    onChange={(val) => updateCreatorSettingsState("subscriptionPriceGd", Math.max(CREATOR_SUBSCRIPTION_MIN_GD, Number(val)))}
                                />
                            </>
                        )}
                        <RowDivider />
                        <ToggleRow
                            label="Calls + bookings"
                            checked={creatorSettingsState.bookingsEnabled}
                            onChange={(value) => updateCreatorSettingsState("bookingsEnabled", value)}
                            icon={<CalendarClock className="w-4 h-4" />}
                        />
                        {creatorSettingsState.bookingsEnabled && (
                            <>
                                <RowDivider />
                                <ValueInputRow
                                    label="Booking min minutes"
                                    type="number"
                                    min={5} step={5}
                                    value={creatorSettingsState.bookingMinimumMinutes}
                                    onChange={(val) => updateCreatorSettingsState("bookingMinimumMinutes", Math.max(5, Number(val)))}
                                />
                                <RowDivider />
                                <ValueInputRow
                                    label="Phone rate / min"
                                    type="number"
                                    value={creatorSettingsState.phoneRatePerMinuteGd}
                                    onChange={(val) => updateCreatorSettingsState("phoneRatePerMinuteGd", Math.max(0, Number(val)))}
                                />
                                <RowDivider />
                                <ValueInputRow
                                    label="Video rate / min"
                                    type="number"
                                    value={creatorSettingsState.videoRatePerMinuteGd}
                                    onChange={(val) => updateCreatorSettingsState("videoRatePerMinuteGd", Math.max(0, Number(val)))}
                                />
                            </>
                        )}
                        <RowDivider />
                        <ToggleRow
                            label="Custom requests"
                            checked={creatorSettingsState.customRequestsEnabled}
                            onChange={(value) => updateCreatorSettingsState("customRequestsEnabled", value)}
                            icon={<Sparkles className="w-4 h-4" />}
                        />
                        {creatorSettingsState.customRequestsEnabled && (
                            <div className="bg-black/30 border-y border-white/5 p-3 space-y-2 mx-4 my-2 rounded-xl">
                                {creatorSettingsState.requestCategories.map((category: any, index: number) => (
                                    <div key={category.id} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5">
                                        <div className="flex-1 min-w-0 pr-2">
                                            <p className="text-sm font-medium text-white truncate">{category.label}</p>
                                            <p className="text-[10px] text-gray-500 truncate">{category.description}</p>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <input
                                                type="number" min={0}
                                                value={category.priceGd}
                                                onChange={(e) => {
                                                    const nextPrice = Math.max(0, Number(e.target.value) || 0);
                                                    setCreatorSettingsState((cur: any) => ({
                                                        ...cur,
                                                        requestCategories: cur.requestCategories.map((entry: any, i: number) => i === index ? { ...entry, priceGd: nextPrice } : entry)
                                                    }));
                                                }}
                                                className="w-16 rounded text-center border border-white/10 bg-black/50 py-1 text-xs text-white outline-none focus:border-brand-purple/50"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCreatorSettingsState((cur: any) => ({
                                                        ...cur,
                                                        requestCategories: cur.requestCategories.map((entry: any, i: number) => i === index ? { ...entry, enabled: !entry.enabled } : entry)
                                                    }));
                                                }}
                                                className={cn("rounded px-2 text-[10px] font-bold uppercase tracking-wider transition-colors", category.enabled ? "bg-brand-purple/20 text-brand-purple" : "bg-white/5 text-gray-500")}
                                            >
                                                {category.enabled ? "Vis" : "Hid"}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <RowDivider />
                        <NavigationRow
                            label="Submit creator drop"
                            description="Upload new content to the platform"
                            icon={<Sparkles className="w-4 h-4" />}
                            onClick={() => setCreatorDropModalOpen(true)}
                        />
                        <RowDivider />
                        <button
                            type="button"
                            onClick={handleSaveCreatorSettings}
                            disabled={creatorSettingsLoading}
                            className="w-full py-4 text-center text-[13px] font-extrabold uppercase tracking-widest text-brand-purple hover:bg-white/5 transition-colors disabled:opacity-50"
                        >
                            {creatorSettingsLoading ? "Saving..." : "Save Creator Requirements"}
                        </button>
                    </SectionContainer>
    );
}
