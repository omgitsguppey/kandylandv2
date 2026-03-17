"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth, useUserProfile } from "@/context/AuthContext";
import { updateProfile } from "firebase/auth";
import { Button } from "@/components/ui/Button";
import { Loader2, Save, User, AtSign, Bell, Globe, ShieldAlert, Mail, Camera, LogOut, Download, Trash2, Lock, FileText } from "lucide-react";

import { authFetch } from "@/lib/authFetch";
import { toast } from "sonner";
import Image from "next/image";
import { storage } from "@/lib/firebase-data";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { SITE_ORIGIN } from "@/lib/site-origin";
import { mutate } from "swr";
import { getBrowserNotificationState } from "@/lib/firebase-messaging";
import { enableBrowserNotifications } from "@/lib/browser-notification-enrollment";
import { getBrowserGlobalPrivacyControl, persistPrivacySettingsSnapshot } from "@/lib/privacy-consent";
import { PRIVACY_POLICY_LAST_UPDATED } from "@/lib/privacy-policy";

const TIMEZONE_OPTIONS = [
    "Auto",
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Berlin",
    "Asia/Tokyo",
] as const;

type TimezoneOption = (typeof TIMEZONE_OPTIONS)[number];

interface ProfileSettingsFormState {
    displayName: string;
    username: string;
    timezone: TimezoneOption;
    inAppEnabled: boolean;
    browserPushEnabled: boolean;
    newDropAlerts: boolean;
    expiringSoonAlerts: boolean;
    anonymousAnalyticsEnabled: boolean;
    identifiedAnalyticsEnabled: boolean;
    allowRecommendations: boolean;
    showInAnonymousStats: boolean;
    honorGlobalPrivacyControl: boolean;
}

function normalizeTimezone(value: unknown): TimezoneOption {
    if (typeof value !== "string") {
        return "Auto";
    }

    const normalized = value.trim() as TimezoneOption;
    return TIMEZONE_OPTIONS.includes(normalized) ? normalized : "Auto";
}

function sanitizeUsername(value: string): string {
    return value.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9_]/g, "");
}

function buildFormState(params: {
    displayName: string | null;
    username: string | null;
    timezone: unknown;
    inAppEnabled: unknown;
    browserPushEnabled: unknown;
    newDropAlerts: unknown;
    expiringSoonAlerts: unknown;
    anonymousAnalyticsEnabled: unknown;
    identifiedAnalyticsEnabled: unknown;
    allowRecommendations: unknown;
    showInAnonymousStats: unknown;
    honorGlobalPrivacyControl: unknown;
}): ProfileSettingsFormState {
    return {
        displayName: (params.displayName ?? "").trim(),
        username: sanitizeUsername((params.username ?? "").trim()),
        timezone: normalizeTimezone(params.timezone),
        inAppEnabled: params.inAppEnabled !== false,
        browserPushEnabled: params.browserPushEnabled === true,
        newDropAlerts: params.newDropAlerts !== false,
        expiringSoonAlerts: params.expiringSoonAlerts !== false,
        anonymousAnalyticsEnabled: params.anonymousAnalyticsEnabled === true,
        identifiedAnalyticsEnabled: params.identifiedAnalyticsEnabled === true,
        allowRecommendations: params.allowRecommendations === true,
        showInAnonymousStats: params.showInAnonymousStats === true,
        honorGlobalPrivacyControl: params.honorGlobalPrivacyControl !== false,
    };
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="glass-panel rounded-2xl border border-white/10 p-4 md:p-5 space-y-4">
            <h2 className="text-base md:text-lg font-bold text-white">{title}</h2>
            {children}
        </section>
    );
}

function ToggleRow({
    label,
    description,
    checked,
    onChange,
    icon,
    disabled = false,
    badge,
}: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    icon?: React.ReactNode;
    disabled?: boolean;
    badge?: string;
}) {
    return (
        <div className={`flex items-start justify-between gap-4 rounded-[1.15rem] border px-4 py-3 transition-colors ${disabled ? "border-white/5 bg-black/20 opacity-75" : "border-white/10 bg-black/30"}`}>
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="flex items-center gap-2 text-sm font-medium text-gray-100">{icon}{label}</p>
                    {badge ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                            {badge}
                        </span>
                    ) : null}
                </div>
                {description ? <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p> : null}
            </div>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                disabled={disabled}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-brand-purple" : "bg-white/20"} ${disabled ? "cursor-not-allowed" : ""}`}
                aria-label={`${label} toggle`}
                aria-pressed={checked}
            >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? "left-[1.35rem]" : "left-0.5"}`} />
            </button>
        </div>
    );
}

function StaticSettingRow({
    label,
    description,
    icon,
    badge,
}: {
    label: string;
    description: string;
    icon?: React.ReactNode;
    badge?: string;
}) {
    return (
        <div className="flex items-start justify-between gap-4 rounded-[1.15rem] border border-white/10 bg-black/30 px-4 py-3">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="flex items-center gap-2 text-sm font-medium text-gray-100">{icon}{label}</p>
                    {badge ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                            {badge}
                        </span>
                    ) : null}
                </div>
                <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const { user, logout } = useAuth();
    const { userProfile } = useUserProfile();

    const normalizedInitialState = useMemo(() => buildFormState({
        displayName: userProfile?.displayName ?? user?.displayName ?? null,
        username: userProfile?.username ?? null,
        timezone: userProfile?.accountSettings?.timezone,
        inAppEnabled: userProfile?.notificationSettings?.inAppEnabled,
        browserPushEnabled: userProfile?.notificationSettings?.browserPushEnabled,
        newDropAlerts: userProfile?.notificationSettings?.newDropAlerts,
        expiringSoonAlerts: userProfile?.notificationSettings?.expiringSoonAlerts,
        anonymousAnalyticsEnabled: userProfile?.privacySettings?.anonymousAnalyticsEnabled,
        identifiedAnalyticsEnabled: userProfile?.privacySettings?.identifiedAnalyticsEnabled,
        allowRecommendations: userProfile?.privacySettings?.allowRecommendations,
        showInAnonymousStats: userProfile?.privacySettings?.showInAnonymousStats,
        honorGlobalPrivacyControl: userProfile?.privacySettings?.honorGlobalPrivacyControl,
    }), [
        user?.displayName,
        userProfile?.displayName,
        userProfile?.username,
        userProfile?.accountSettings?.timezone,
        userProfile?.notificationSettings?.inAppEnabled,
        userProfile?.notificationSettings?.browserPushEnabled,
        userProfile?.notificationSettings?.newDropAlerts,
        userProfile?.notificationSettings?.expiringSoonAlerts,
        userProfile?.privacySettings?.anonymousAnalyticsEnabled,
        userProfile?.privacySettings?.identifiedAnalyticsEnabled,
        userProfile?.privacySettings?.allowRecommendations,
        userProfile?.privacySettings?.showInAnonymousStats,
        userProfile?.privacySettings?.honorGlobalPrivacyControl,
    ]);

    const [formState, setFormState] = useState<ProfileSettingsFormState>(normalizedInitialState);
    const [saving, setSaving] = useState(false);
    const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [notificationSetupLoading, setNotificationSetupLoading] = useState(false);
    const [notificationSupportMessage, setNotificationSupportMessage] = useState<string | null>(null);
    const [runtimeOrigin, setRuntimeOrigin] = useState(SITE_ORIGIN);
    const browserGpcEnabled = useMemo(() => getBrowserGlobalPrivacyControl(), []);

    useEffect(() => {
        setFormState(normalizedInitialState);
    }, [normalizedInitialState]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setRuntimeOrigin(window.location.origin);
        }
    }, []);

    const profileName = formState.displayName || user?.displayName || "Collector";
    const profileEmail = user?.email || "Signed in";
    const avatarFallback = profileName.charAt(0).toUpperCase() || "C";
    const referralLink = `${runtimeOrigin}?ref=${user?.uid || ""}`;

    const updateForm = <K extends keyof ProfileSettingsFormState>(key: K, value: ProfileSettingsFormState[K]) => {
        setSaveFeedback(null);
        setFormState((previous) => ({ ...previous, [key]: value }));
    };

    const savePrivacyPreferences = async (nextPrivacyState: Pick<
        ProfileSettingsFormState,
        | "anonymousAnalyticsEnabled"
        | "identifiedAnalyticsEnabled"
        | "allowRecommendations"
        | "showInAnonymousStats"
        | "honorGlobalPrivacyControl"
    >) => {
        const response = await authFetch("/api/user/profile", {
            method: "PUT",
            body: JSON.stringify({
                privacySettings: {
                    anonymousAnalyticsEnabled: nextPrivacyState.anonymousAnalyticsEnabled,
                    identifiedAnalyticsEnabled: nextPrivacyState.identifiedAnalyticsEnabled,
                    allowRecommendations: nextPrivacyState.allowRecommendations,
                    showInAnonymousStats: nextPrivacyState.showInAnonymousStats,
                    honorGlobalPrivacyControl: nextPrivacyState.honorGlobalPrivacyControl,
                },
            }),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(typeof result.error === "string" ? result.error : "Failed to save privacy settings.");
        }

        persistPrivacySettingsSnapshot({
            anonymousAnalyticsEnabled: nextPrivacyState.anonymousAnalyticsEnabled,
            identifiedAnalyticsEnabled: nextPrivacyState.identifiedAnalyticsEnabled,
            allowRecommendations: nextPrivacyState.allowRecommendations,
            showInAnonymousStats: nextPrivacyState.showInAnonymousStats,
            honorGlobalPrivacyControl: nextPrivacyState.honorGlobalPrivacyControl,
        });
    };

    useEffect(() => {
        let cancelled = false;

        async function loadNotificationSupport() {
            const state = await getBrowserNotificationState();
            if (cancelled) {
                return;
            }

            if (state.needsStandaloneInstall) {
                setNotificationSupportMessage("Add KandyDrops to your Home Screen first to use browser notifications on iPhone.");
                return;
            }

            if (!state.browserCapable) {
                setNotificationSupportMessage("Browser notifications are not supported on this device.");
                return;
            }

            if (state.permission === "denied") {
                setNotificationSupportMessage("Notifications are blocked in your browser settings.");
                return;
            }

            setNotificationSupportMessage(state.messagingSupported
                ? "Daily deadline reminders work in the browser and in installed PWA mode."
                : "Browser reminders are on, but push delivery is limited in this browser.");
        }

        void loadNotificationSupport();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleBrowserPushToggle = async (nextValue: boolean) => {
        if (!user || !userProfile) {
            return;
        }

        if (!nextValue) {
            updateForm("browserPushEnabled", false);
            toast.info("Browser notifications will stay off until you turn them back on.");
            return;
        }

        setNotificationSetupLoading(true);
        try {
            const result = await enableBrowserNotifications(userProfile);
            if (result.status !== "enabled") {
                if (result.status === "not_granted" && result.needsStandaloneInstall) {
                    toast.info("Add KandyDrops to your Home Screen, then reopen it there to enable notifications on iPhone.");
                } else {
                    toast.info(result.status === "failed" ? result.message : "Browser notifications were not enabled.");
                }
                updateForm("browserPushEnabled", false);
                return;
            }

            updateForm("browserPushEnabled", true);
            setNotificationSupportMessage(result.messagingSupported
                ? "Daily deadline reminders work in the browser and in installed PWA mode."
                : "Browser reminders are on, but push delivery is limited in this browser.");
            toast.success("Browser notifications enabled.");
        } catch (error) {
            console.error("Failed to enable browser notifications", error);
            toast.error("We could not enable browser notifications right now.");
        } finally {
            setNotificationSetupLoading(false);
        }
    };

    const handleWithdrawOptionalTracking = async () => {
        const nextState = {
            anonymousAnalyticsEnabled: false,
            identifiedAnalyticsEnabled: false,
            allowRecommendations: false,
            showInAnonymousStats: false,
            honorGlobalPrivacyControl: formState.honorGlobalPrivacyControl,
        };

        setSaving(true);
        setSaveFeedback(null);

        try {
            await savePrivacyPreferences(nextState);
            setFormState((previous) => ({
                ...previous,
                ...nextState,
            }));
            setSaveFeedback("Optional tracking disabled");
            toast.success("Optional tracking disabled.");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to update privacy settings.";
            setSaveFeedback(message);
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!user) {
            toast.error("You must be signed in to save settings.");
            return;
        }

        setSaving(true);
        setSaveFeedback(null);

        try {
            const trimmedDisplayName = formState.displayName.trim();
            if (trimmedDisplayName.length > 0) {
                await updateProfile(user, { displayName: trimmedDisplayName });
            }

            const response = await authFetch("/api/user/profile", {
                method: "PUT",
                body: JSON.stringify({
                    displayName: trimmedDisplayName,
                    username: sanitizeUsername(formState.username),
                    accountSettings: {
                        timezone: formState.timezone,
                    },
                    notificationSettings: {
                        inAppEnabled: formState.inAppEnabled,
                        browserPushEnabled: formState.browserPushEnabled,
                        newDropAlerts: formState.newDropAlerts,
                        expiringSoonAlerts: formState.expiringSoonAlerts,
                    },
                    privacySettings: {
                        anonymousAnalyticsEnabled: formState.anonymousAnalyticsEnabled,
                        identifiedAnalyticsEnabled: formState.identifiedAnalyticsEnabled,
                        allowRecommendations: formState.allowRecommendations,
                        showInAnonymousStats: formState.showInAnonymousStats,
                        honorGlobalPrivacyControl: formState.honorGlobalPrivacyControl,
                    },
                }),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(typeof result.error === "string" ? result.error : "Failed to save settings.");
            }

            persistPrivacySettingsSnapshot({
                anonymousAnalyticsEnabled: formState.anonymousAnalyticsEnabled,
                identifiedAnalyticsEnabled: formState.identifiedAnalyticsEnabled,
                allowRecommendations: formState.allowRecommendations,
                showInAnonymousStats: formState.showInAnonymousStats,
                honorGlobalPrivacyControl: formState.honorGlobalPrivacyControl,
            });
            setSaveFeedback("Changes saved");
            toast.success("Settings updated successfully.");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to update settings.";
            setSaveFeedback(message);
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const handleChangeAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be less than 5MB");
            return;
        }

        setIsUploadingAvatar(true);
        try {
            const ext = file.name.split('.').pop() || 'jpg';
            const storageRef = ref(storage, `avatars/${user.uid}.${ext}`);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);

            const response = await authFetch("/api/user/profile", {
                method: "POST",
                body: JSON.stringify({ photoURL: downloadUrl }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(typeof result?.error === "string" ? result.error : "Failed to sync avatar.");
            }

            await updateProfile(user, { photoURL: downloadUrl });

            toast.success("Avatar updated successfully.");

            // Revalidate SWR caches globally instead of doing a hard reload
            mutate(() => true, undefined, { revalidate: true });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to upload avatar.";
            toast.error(`Failed to upload avatar: ${message}`);
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const handleSignOutAllSessions = async () => {
        try {
            const response = await authFetch("/api/user/revoke-sessions", { method: "POST" });
            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(typeof result?.error === "string" ? result.error : "Failed to sign out all sessions");
            }

            toast.success("Signed out on all devices.");
            await logout();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to sign out all sessions";
            toast.error(message);
        }
    };

    const handleRequestDeletion = async () => {
        const confirmed = window.confirm("Are you incredibly sure? This will permanently delete your account, your KandyDrops collection, and your entire data profile. This cannot be undone.");
        if (!confirmed) {
            return;
        }

        setIsDeleting(true);
        try {
            const response = await authFetch("/api/user/delete", { method: "DELETE" });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to delete account");
            }

            toast.success("Account permanently deleted.");
            await logout(); // Kick them out immediately
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDownloadData = async () => {
        setIsDownloading(true);
        try {
            const response = await authFetch("/api/user/data", { method: "GET" });

            if (!response.ok) {
                throw new Error("Failed to generate data export");
            }

            // Create a blob from the JSON response
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = `kandydrops_data_export_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success("Data export downloaded securely.");
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="w-full px-4 max-w-2xl mx-auto">
            <header className="mb-5">
                <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-purple to-brand-purple">Profile Settings</h1>
                <p className="text-gray-400 text-sm mt-1">Manage account identity, notifications, privacy, and security.</p>
            </header>

            <form onSubmit={handleSave} className="space-y-4">
                <SectionCard title="Profile">
                    <div className="flex items-center gap-4">
                        <div className="group relative h-20 w-20 rounded-full overflow-hidden border border-white/10 bg-black/40 shrink-0 cursor-pointer">
                            <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={handleChangeAvatar}
                                disabled={isUploadingAvatar}
                            />
                            {isUploadingAvatar ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity z-0">
                                    <Camera className="w-6 h-6 text-white" />
                                </div>
                            )}
                            {user?.photoURL ? (
                                <Image src={user.photoURL} alt="Avatar" fill sizes="80px" className="object-cover" />
                            ) : (
                                <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">{avatarFallback}</span>
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-lg font-bold text-white truncate">{profileName}</p>
                            <p className="text-sm text-gray-400 truncate">{profileEmail}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-1.5">Display Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    id="displayName"
                                    value={formState.displayName}
                                    onChange={(event) => updateForm("displayName", event.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-white text-sm"
                                    placeholder="Enter your name"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1.5">Username</label>
                            <div className="relative">
                                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    id="username"
                                    value={formState.username}
                                    onChange={(event) => updateForm("username", sanitizeUsername(event.target.value))}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-white text-sm"
                                    placeholder="your_handle"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1.5">Used for creator URLs and account identification.</p>
                        </div>
                    </div>
                </SectionCard>

                <SectionCard title="Account & Identity">
                    <div className="rounded-xl border border-white/5 bg-black/25 px-3 py-2.5">
                        <p className="text-xs text-gray-500 mb-1">Email address (managed by Google)</p>
                        <p className="text-sm text-gray-200 flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /> {profileEmail}</p>
                    </div>

                    <div>
                        <label htmlFor="timezone" className="block text-sm font-medium text-gray-300 mb-1.5">Region / Timezone</label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <select
                                id="timezone"
                                value={formState.timezone}
                                onChange={(event) => updateForm("timezone", normalizeTimezone(event.target.value))}
                                className="w-full appearance-none rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm text-white"
                            >
                                {TIMEZONE_OPTIONS.map((timezone) => (
                                    <option key={timezone} value={timezone}>
                                        {timezone}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </SectionCard>

                <SectionCard title="Notifications">
                    <ToggleRow
                        label="Browser notifications"
                        description={notificationSupportMessage || "Use browser reminders for daily tasks, check-ins, and live drop alerts."}
                        checked={formState.browserPushEnabled}
                        onChange={(value) => void handleBrowserPushToggle(value)}
                        icon={<Bell className="h-4 w-4 text-brand-purple" />}
                        disabled={notificationSetupLoading}
                        badge={notificationSetupLoading ? "Setting up" : "Browser"}
                    />
                    <ToggleRow
                        label="In-app notifications"
                        description="Shows task, drop, and account activity alerts inside KandyDrops."
                        checked={formState.inAppEnabled}
                        onChange={(value) => updateForm("inAppEnabled", value)}
                        icon={<Bell className="h-4 w-4 text-brand-purple" />}
                    />
                    <ToggleRow
                        label="New drop alerts"
                        description="Alerts you when new drops or creator releases become available."
                        checked={formState.newDropAlerts}
                        onChange={(value) => updateForm("newDropAlerts", value)}
                        icon={<Bell className="h-4 w-4 text-brand-purple" />}
                    />
                    <ToggleRow
                        label="Expiring soon alerts"
                        description="Warns you before limited-time drops or tasks expire."
                        checked={formState.expiringSoonAlerts}
                        onChange={(value) => updateForm("expiringSoonAlerts", value)}
                        icon={<Bell className="h-4 w-4 text-brand-purple" />}
                    />
                </SectionCard>

                <SectionCard title="Privacy, Tracking & Rights">
                    <StaticSettingRow
                        label="Strictly necessary storage"
                        description="Always on for sign-in, security, payment confirmation, and core product functionality. This storage is required to run the site safely."
                        icon={<Lock className="h-4 w-4 text-brand-purple" />}
                        badge="Always on"
                    />
                    <ToggleRow
                        label="Anonymous product analytics"
                        description="Lets KandyDrops measure page views, clicks, and drop interest without tying the data to your account."
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
                    <ToggleRow
                        label="Account-linked analytics"
                        description="Lets KandyDrops connect your activity to your account for viewer stats, purchase funnels, and user-level insights."
                        checked={formState.identifiedAnalyticsEnabled}
                        onChange={(value) => {
                            updateForm("identifiedAnalyticsEnabled", value);
                            if (value) {
                                updateForm("anonymousAnalyticsEnabled", true);
                            } else {
                                updateForm("allowRecommendations", false);
                            }
                        }}
                    />
                    <ToggleRow
                        label="Allow activity-based recommendations"
                        description="Uses your KandyDrops activity to improve content suggestions."
                        checked={formState.allowRecommendations}
                        onChange={(value) => {
                            updateForm("allowRecommendations", value);
                            if (value) {
                                updateForm("anonymousAnalyticsEnabled", true);
                                updateForm("identifiedAnalyticsEnabled", true);
                            }
                        }}
                    />
                    <ToggleRow
                        label="Include me in aggregated trend reports"
                        description="Lets your activity contribute to anonymous creator and drop trend reporting."
                        checked={formState.showInAnonymousStats}
                        onChange={(value) => {
                            updateForm("showInAnonymousStats", value);
                            if (value) {
                                updateForm("anonymousAnalyticsEnabled", true);
                            }
                        }}
                    />
                    <ToggleRow
                        label="Honor Global Privacy Control"
                        description="If your browser sends a Global Privacy Control signal, KandyDrops will turn off optional analytics automatically."
                        checked={formState.honorGlobalPrivacyControl}
                        onChange={(value) => updateForm("honorGlobalPrivacyControl", value)}
                        badge={browserGpcEnabled ? "Detected" : undefined}
                    />
                    {browserGpcEnabled ? (
                        <p className="rounded-xl border border-white/5 bg-black/25 px-3 py-2 text-xs leading-5 text-gray-400">
                            Your browser is sending a Global Privacy Control signal right now. Optional analytics stay off unless you disable the setting above.
                        </p>
                    ) : null}
                    <div className="rounded-[1.15rem] border border-white/10 bg-black/30 px-4 py-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <p className="flex items-center gap-2 text-sm font-medium text-gray-100">
                                    <FileText className="h-4 w-4 text-brand-purple" />
                                    Your privacy controls
                                </p>
                                <p className="mt-1 text-xs leading-5 text-gray-500">
                                    Optional analytics stay off until you turn them on. You can withdraw consent here at any time, download your data below, or read the full privacy policy before deciding.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="glass"
                                    onClick={() => void handleWithdrawOptionalTracking()}
                                    disabled={saving}
                                    className="justify-center border-white/20 hover:bg-white/10"
                                >
                                    Essential only
                                </Button>
                                <Link
                                    href="/privacy"
                                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                                >
                                    Privacy policy
                                </Link>
                            </div>
                        </div>
                        <p className="mt-3 text-[11px] leading-5 text-gray-500">
                            Last privacy notice update: {PRIVACY_POLICY_LAST_UPDATED}. Data export is in Data &amp; Security below, and account deletion stays in the Danger Zone.
                        </p>
                    </div>
                </SectionCard>

                <SectionCard title="Refer a Friend">
                    <div className="rounded-xl border border-brand-purple/20 bg-brand-purple/5 p-4 flex flex-col gap-3">
                        <p className="text-sm text-gray-300">Invite your friends! You both get <strong className="text-brand-purple">25 Gum Drops</strong> when they sign up.</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                readOnly
                                value={referralLink}
                                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText(referralLink);
                                    toast.success("Referral link copied!");
                                }}
                                className="px-4 py-2 bg-white text-black font-bold rounded-xl active:scale-95 transition-transform text-sm whitespace-nowrap"
                            >
                                Copy Link
                            </button>
                        </div>
                    </div>
                </SectionCard>

                <SectionCard title="Account Stats">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-white/5 bg-black/25 p-4 flex flex-col justify-center items-center text-center">
                            <span className="text-2xl font-black text-white">{userProfile?.gumDropsBalance || 0}</span>
                            <span className="text-xs text-gray-400 font-medium mt-1">Gum Drops Held</span>
                        </div>
                        <div className="rounded-xl border border-white/5 bg-black/25 p-4 flex flex-col justify-center items-center text-center">
                            <span className="text-2xl font-black text-white">{userProfile?.unlockedContent?.length || 0}</span>
                            <span className="text-xs text-gray-400 font-medium mt-1">Drops Unlocked</span>
                        </div>
                        <div className="col-span-2 rounded-xl border border-white/5 bg-black/25 p-4 flex flex-col justify-center items-center text-center">
                            <span className="text-lg font-bold text-white">
                                {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' }) : "Recently"}
                            </span>
                            <span className="text-xs text-gray-400 font-medium mt-1">Member Since</span>
                        </div>
                    </div>
                </SectionCard>

                <SectionCard title="Data & Security">
                    <div className="flex flex-col gap-3">
                        <Button type="button" variant="glass" onClick={handleDownloadData} disabled={isDownloading} className="justify-center border-white/20 hover:bg-white/10">
                            {isDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                            Download My Data
                        </Button>
                        <Button type="button" variant="glass" onClick={logout} className="justify-center border-white/20 hover:bg-white/10">
                            <LogOut className="w-4 h-4 mr-2 text-gray-400" /> Sign out
                        </Button>
                    </div>
                </SectionCard>

                <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 md:p-5 space-y-4">
                    <h2 className="text-base md:text-lg font-bold text-red-500 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5" /> Danger Zone
                    </h2>
                    <p className="text-sm text-red-400/80 mb-4">Are you incredibly sure? This will permanently delete your account, your KandyDrops collection, and your entire data profile. This cannot be undone.</p>
                    <Button type="button" variant="glass" onClick={handleRequestDeletion} disabled={isDeleting} className="w-full text-red-500 justify-center border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50 transition-colors">
                        {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                        Delete Account
                    </Button>
                </section>

                <div className="sticky bottom-[calc(68px+env(safe-area-inset-bottom))] z-10 pt-1">
                    <div className="rounded-2xl border border-white/10 bg-black/70 backdrop-blur-md p-3">
                        <Button type="submit" variant="brand" disabled={saving} className="w-full font-bold tracking-wide">
                            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
                        </Button>
                        {saveFeedback ? (
                            <p className={`mt-2 text-xs ${saveFeedback === "Changes saved" ? "text-brand-purple" : "text-red-400"}`}>
                                {saveFeedback}
                            </p>
                        ) : null}
                    </div>
                </div>
            </form>
        </div>
    );
}
