"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth, useUserProfile } from "@/context/AuthContext";
import { updateProfile } from "firebase/auth";
import { Button } from "@/components/ui/Button";
import { Loader2, Save, User, AtSign, Bell, Globe, ShieldAlert, Mail, Camera, LogOut } from "lucide-react";

import { authFetch } from "@/lib/authFetch";
import { toast } from "sonner";
import Image from "next/image";

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
    allowRecommendations: boolean;
    showInAnonymousStats: boolean;
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
    allowRecommendations: unknown;
    showInAnonymousStats: unknown;
}): ProfileSettingsFormState {
    return {
        displayName: (params.displayName ?? "").trim(),
        username: sanitizeUsername((params.username ?? "").trim()),
        timezone: normalizeTimezone(params.timezone),
        inAppEnabled: params.inAppEnabled !== false,
        browserPushEnabled: params.browserPushEnabled === true,
        newDropAlerts: params.newDropAlerts !== false,
        expiringSoonAlerts: params.expiringSoonAlerts !== false,
        allowRecommendations: params.allowRecommendations !== false,
        showInAnonymousStats: params.showInAnonymousStats !== false,
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
}: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    icon?: React.ReactNode;
}) {
    return (
        <label className="flex items-start justify-between gap-4 rounded-xl border border-white/5 bg-black/25 px-3 py-2.5">
            <div className="min-w-0">
                <p className="text-sm text-gray-100 flex items-center gap-2">{icon}{label}</p>
                {description ? <p className="text-xs text-gray-500 mt-1">{description}</p> : null}
            </div>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-brand-pink" : "bg-white/20"}`}
                aria-label={`${label} toggle`}
                aria-pressed={checked}
            >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? "left-[1.35rem]" : "left-0.5"}`} />
            </button>
        </label>
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
        allowRecommendations: userProfile?.privacySettings?.allowRecommendations,
        showInAnonymousStats: userProfile?.privacySettings?.showInAnonymousStats,
    }), [
        user?.displayName,
        userProfile?.displayName,
        userProfile?.username,
        userProfile?.accountSettings?.timezone,
        userProfile?.notificationSettings?.inAppEnabled,
        userProfile?.notificationSettings?.browserPushEnabled,
        userProfile?.notificationSettings?.newDropAlerts,
        userProfile?.notificationSettings?.expiringSoonAlerts,
        userProfile?.privacySettings?.allowRecommendations,
        userProfile?.privacySettings?.showInAnonymousStats,
    ]);

    const [formState, setFormState] = useState<ProfileSettingsFormState>(normalizedInitialState);
    const [saving, setSaving] = useState(false);
    const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

    useEffect(() => {
        setFormState(normalizedInitialState);
    }, [normalizedInitialState]);

    const profileName = formState.displayName || user?.displayName || "Collector";
    const profileEmail = user?.email || "Signed in";
    const avatarFallback = profileName.charAt(0).toUpperCase() || "C";

    const updateForm = <K extends keyof ProfileSettingsFormState>(key: K, value: ProfileSettingsFormState[K]) => {
        setSaveFeedback(null);
        setFormState((previous) => ({ ...previous, [key]: value }));
    };

    const requestBrowserNotifications = async () => {
        if (!("Notification" in window)) {
            toast.error("Browser notifications are not supported on this device.");
            return;
        }

        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            updateForm("browserPushEnabled", true);
            toast.success("Browser notifications enabled.");
        } else {
            updateForm("browserPushEnabled", false);
            toast.info("Browser notifications were not enabled.");
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
                        allowRecommendations: formState.allowRecommendations,
                        showInAnonymousStats: formState.showInAnonymousStats,
                    },
                }),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(typeof result.error === "string" ? result.error : "Failed to save settings.");
            }

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

    const handleChangeAvatar = () => {
        toast.info("Avatar upload is coming soon.");
    };

    const handleSignOutAllSessions = async () => {
        // TODO: Add server-side token revocation for multi-session logout.
        await logout();
    };

    const handleRequestDeletion = () => {
        const confirmed = window.confirm("Are you sure you want to request account deletion? This cannot be undone without support.");
        if (!confirmed) {
            return;
        }

        toast.info("Account deletion request flow will be available soon. Please contact support for now.");
    };

    return (
        <div className="max-w-2xl mx-auto px-1 pb-32 md:pb-20">
            <header className="mb-5">
                <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-pink to-brand-cyan">Profile Settings</h1>
                <p className="text-gray-400 text-sm mt-1">Manage account identity, notifications, privacy, and security.</p>
            </header>

            <form onSubmit={handleSave} className="space-y-4">
                <SectionCard title="Profile">
                    <div className="flex items-center gap-4">
                        <div className="relative h-20 w-20 rounded-full overflow-hidden border border-white/10 bg-black/40 shrink-0">
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
                        label="In-app notifications"
                        checked={formState.inAppEnabled}
                        onChange={(value) => updateForm("inAppEnabled", value)}
                        icon={<Bell className="h-4 w-4 text-brand-purple" />}
                    />
                    <ToggleRow
                        label="New drop alerts"
                        checked={formState.newDropAlerts}
                        onChange={(value) => updateForm("newDropAlerts", value)}
                        icon={<Bell className="h-4 w-4 text-brand-purple" />}
                    />
                    <ToggleRow
                        label="Expiring soon alerts"
                        checked={formState.expiringSoonAlerts}
                        onChange={(value) => updateForm("expiringSoonAlerts", value)}
                        icon={<Bell className="h-4 w-4 text-brand-purple" />}
                    />
                </SectionCard>

                <SectionCard title="Privacy & Tracking">
                    <ToggleRow
                        label="Allow activity-based recommendations"
                        checked={formState.allowRecommendations}
                        onChange={(value) => updateForm("allowRecommendations", value)}
                    />
                    <ToggleRow
                        label="Show my activity in anonymous stats"
                        checked={formState.showInAnonymousStats}
                        onChange={(value) => updateForm("showInAnonymousStats", value)}
                    />
                </SectionCard>

                <SectionCard title="Security">
                    <div className="flex flex-col gap-2">
                        <Button type="button" variant="glass" onClick={logout} className="justify-center">
                            <LogOut className="w-4 h-4 mr-2" /> Sign out
                        </Button>
                    </div>
                </SectionCard>

                <div className="sticky bottom-[calc(68px+env(safe-area-inset-bottom))] z-10 pt-1">
                    <div className="rounded-2xl border border-white/10 bg-black/70 backdrop-blur-md p-3">
                        <Button type="submit" variant="brand" disabled={saving} className="w-full font-bold tracking-wide">
                            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
                        </Button>
                        {saveFeedback ? (
                            <p className={`mt-2 text-xs ${saveFeedback === "Changes saved" ? "text-green-400" : "text-red-400"}`}>
                                {saveFeedback}
                            </p>
                        ) : null}
                    </div>
                </div>
            </form>
        </div>
    );
}
