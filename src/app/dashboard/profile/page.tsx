"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useAuth, useUserProfile } from "@/context/AuthContext";
import { updateProfile } from "firebase/auth";
import { Button } from "@/components/ui/Button";
import { Loader2, User, AtSign, Bell, Globe, ShieldAlert, Mail, Camera, LogOut, Download, Trash2, Lock, FileText, CalendarClock, MessageSquare, Sparkles, Wallet, CircleHelp, LifeBuoy, CalendarDays } from "lucide-react";

import { authFetch } from "@/lib/authFetch";
import { toast } from "sonner";
import Image from "next/image";
import { storage } from "@/lib/firebase-data";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { SITE_ORIGIN } from "@/lib/site-origin";
import { mutate } from "swr";
import { getBrowserNotificationState } from "@/lib/firebase-messaging";
import { enableBrowserNotifications } from "@/lib/browser-notification-enrollment";
import { CREATOR_BOOKING_RATES, CREATOR_SUBSCRIPTION_MIN_GD, DEFAULT_CREATOR_SETTINGS, type CreatorRequestCategoryConfig, type CreatorSettings } from "@/lib/creator-experiences";
import { getBrowserGlobalPrivacyControl, persistPrivacySettingsSnapshot } from "@/lib/privacy-consent";
import { PRIVACY_POLICY_LAST_UPDATED , REFERRAL_BONUS_GD } from "@/lib/platform-config";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { trackEvent } from "@/lib/telemetry";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { CreateDropModal } from "@/components/Admin/CreateDropModal";

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
    dateOfBirth: string;
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
    dateOfBirth: string | null;
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
        dateOfBirth: typeof params.dateOfBirth === "string" ? params.dateOfBirth : "",
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

function SectionCard({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
    return (
        <section id={id} className="glass-panel rounded-2xl border border-white/10 p-4 md:p-5 space-y-4">
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
        <div className={`flex items-start justify-between gap-4 rounded-[1.15rem] border px-4 py-2.5 transition-colors ${disabled ? "border-white/5 bg-black/20 opacity-75" : "border-white/10 bg-black/30"}`}>
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="flex items-center gap-2 text-sm font-medium text-gray-100">{icon}{label}</p>
                    {badge ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                            {badge}
                        </span>
                    ) : null}
                </div>
                {description ? <p className="mt-1 text-xs leading-[1.35rem] text-gray-500">{description}</p> : null}
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
        <div className="flex items-start justify-between gap-4 rounded-[1.15rem] border border-white/10 bg-black/30 px-4 py-2.5">
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
        dateOfBirth: typeof userProfile?.dateOfBirth === "string" ? userProfile.dateOfBirth : null,
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
        userProfile?.dateOfBirth,
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
    const autosaveTimeoutRef = useRef<number | null>(null);
    const autosaveFeedbackTimeoutRef = useRef<number | null>(null);
    const autosaveReadyRef = useRef(false);
    const lastSavedSignatureRef = useRef(JSON.stringify(normalizedInitialState));
    const [runtimeOrigin, setRuntimeOrigin] = useState(SITE_ORIGIN);
    const [creatorSettingsState, setCreatorSettingsState] = useState<CreatorSettings>(DEFAULT_CREATOR_SETTINGS);
    const [creatorSettingsLoading, setCreatorSettingsLoading] = useState(false);
    const [creatorStats, setCreatorStats] = useState<{
        earningsGd: number;
        pendingCashoutGd: number;
        activeSubscribers: number;
        openRequests: number;
        bookedCalls: number;
    } | null>(null);
    const [creatorBroadcasts, setCreatorBroadcasts] = useState<Array<Record<string, unknown>>>([]);
    const [creatorBroadcastMessage, setCreatorBroadcastMessage] = useState("");
    const [sendingCreatorBroadcast, setSendingCreatorBroadcast] = useState(false);
    const [creatorDropModalOpen, setCreatorDropModalOpen] = useState(false);
    const [creatorPayoutAmount, setCreatorPayoutAmount] = useState(100);
    const browserGpcEnabled = useMemo(() => getBrowserGlobalPrivacyControl(), []);
    const isCreatorAccount = userProfile?.role === "creator" || userProfile?.role === "admin";
    useEffect(() => {
        setFormState(normalizedInitialState);
        lastSavedSignatureRef.current = JSON.stringify(normalizedInitialState);
        autosaveReadyRef.current = true;
    }, [normalizedInitialState]);

    useEffect(() => {
        return () => {
            if (autosaveTimeoutRef.current) {
                window.clearTimeout(autosaveTimeoutRef.current);
            }
            if (autosaveFeedbackTimeoutRef.current) {
                window.clearTimeout(autosaveFeedbackTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!isCreatorAccount) {
            return;
        }

        let cancelled = false;

        async function loadCreatorSettings() {
            try {
                setCreatorSettingsLoading(true);
                const [response, broadcastsResponse] = await Promise.all([
                    authFetch("/api/creator/settings"),
                    authFetch("/api/creator/broadcasts"),
                ]);
                const result = await response.json() as {
                    creatorSettings?: CreatorSettings | null;
                    stats?: {
                        earningsGd: number;
                        pendingCashoutGd: number;
                        activeSubscribers: number;
                        openRequests: number;
                        bookedCalls: number;
                    };
                };
                const broadcastsResult = await broadcastsResponse.json().catch(() => ({})) as {
                    broadcasts?: Array<Record<string, unknown>>;
                };
                if (!response.ok) {
                    throw new Error("Failed to load creator settings");
                }

                if (!cancelled) {
                    setCreatorSettingsState(result.creatorSettings || userProfile?.creatorSettings || DEFAULT_CREATOR_SETTINGS);
                    setCreatorStats(result.stats || null);
                    setCreatorBroadcasts(Array.isArray(broadcastsResult.broadcasts) ? broadcastsResult.broadcasts : []);
                }
            } catch (error) {
                reportClientIssue({
                    channel: "network",
                    severity: "warn",
                    message: "Profile creator settings load failed",
                    error,
                    detail: {
                        source: "profile_page",
                        action: "load_creator_settings",
                    },
                    consoleLabel: "[Profile] creator settings load failed",
                });
                if (!cancelled) {
                    setCreatorSettingsState(userProfile?.creatorSettings || DEFAULT_CREATOR_SETTINGS);
                }
            } finally {
                if (!cancelled) {
                    setCreatorSettingsLoading(false);
                }
            }
        }

        void loadCreatorSettings();
        return () => {
            cancelled = true;
        };
    }, [isCreatorAccount, userProfile?.creatorSettings]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setRuntimeOrigin(window.location.origin);
        }
    }, []);

    const profileName = formState.displayName || user?.displayName || "Collector";
    const profileEmail = user?.email || "Signed in";
    const profileUsername = formState.username ? `@${formState.username}` : null;
    const profileIdentityLabel = profileUsername || profileName;
    const profileIdentityDetail = profileUsername && profileName !== profileUsername ? profileName : profileEmail;
    const avatarFallback = profileName.charAt(0).toUpperCase() || "C";
    const referralLink = `${runtimeOrigin}?ref=${user?.uid || ""}`;

    const updateForm = <K extends keyof ProfileSettingsFormState>(key: K, value: ProfileSettingsFormState[K]) => {
        setSaveFeedback(null);
        setFormState((previous) => ({ ...previous, [key]: value }));
    };

    const scheduleAutosaveFeedbackReset = useCallback(() => {
        if (autosaveFeedbackTimeoutRef.current) {
            window.clearTimeout(autosaveFeedbackTimeoutRef.current);
        }

        autosaveFeedbackTimeoutRef.current = window.setTimeout(() => {
            setSaveFeedback(null);
        }, 2400);
    }, []);

    const buildSettingsPayload = useCallback((nextState: ProfileSettingsFormState) => ({
        displayName: nextState.displayName.trim(),
        username: sanitizeUsername(nextState.username),
        dateOfBirth: nextState.dateOfBirth || null,
        accountSettings: {
            timezone: nextState.timezone,
        },
        notificationSettings: {
            inAppEnabled: nextState.inAppEnabled,
            browserPushEnabled: nextState.browserPushEnabled,
            newDropAlerts: nextState.newDropAlerts,
            expiringSoonAlerts: nextState.expiringSoonAlerts,
        },
        privacySettings: {
            anonymousAnalyticsEnabled: nextState.anonymousAnalyticsEnabled,
            identifiedAnalyticsEnabled: nextState.identifiedAnalyticsEnabled,
            allowRecommendations: nextState.allowRecommendations,
            showInAnonymousStats: nextState.showInAnonymousStats,
            honorGlobalPrivacyControl: nextState.honorGlobalPrivacyControl,
        },
    }), []);

    const savePrivacyPreferences = useCallback(async (nextPrivacyState: Pick<
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
    }, []);

    const persistSettings = useCallback(async (nextState: ProfileSettingsFormState) => {
        if (!user) {
            return false;
        }

        const nextSignature = JSON.stringify(nextState);
        if (nextSignature === lastSavedSignatureRef.current) {
            return true;
        }

        setSaving(true);
        setSaveFeedback("Saving...");

        try {
            const trimmedDisplayName = nextState.displayName.trim();
            if (trimmedDisplayName.length > 0 && trimmedDisplayName !== user.displayName) {
                await updateProfile(user, { displayName: trimmedDisplayName });
            }

            const response = await authFetch("/api/user/profile", {
                method: "PUT",
                body: JSON.stringify(buildSettingsPayload(nextState)),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(typeof result.error === "string" ? result.error : "Failed to save settings.");
            }

            persistPrivacySettingsSnapshot({
                anonymousAnalyticsEnabled: nextState.anonymousAnalyticsEnabled,
                identifiedAnalyticsEnabled: nextState.identifiedAnalyticsEnabled,
                allowRecommendations: nextState.allowRecommendations,
                showInAnonymousStats: nextState.showInAnonymousStats,
                honorGlobalPrivacyControl: nextState.honorGlobalPrivacyControl,
            });
            lastSavedSignatureRef.current = nextSignature;
            setSaveFeedback("Saved");
            scheduleAutosaveFeedbackReset();
            return true;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to update settings.";
            setSaveFeedback(message);
            toast.error(message);
            return false;
        } finally {
            setSaving(false);
        }
    }, [buildSettingsPayload, scheduleAutosaveFeedbackReset, user]);

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
            reportClientIssue({
                channel: "notifications",
                message: "Profile browser notification enable failed",
                error,
                detail: {
                    source: "profile_page",
                    action: "enable_browser_notifications",
                },
                consoleLabel: "[Profile] browser notification enable failed",
            });
            toast.error("We could not enable browser notifications right now.");
        } finally {
            setNotificationSetupLoading(false);
        }
    };

    const handleWithdrawOptionalTracking = useCallback(async () => {
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
            const nextFormState = {
                ...formState,
                ...nextState,
            };
            setFormState((previous) => ({
                ...previous,
                ...nextState,
            }));
            lastSavedSignatureRef.current = JSON.stringify(nextFormState);
            setSaveFeedback("Essential-only mode saved");
            scheduleAutosaveFeedbackReset();
            toast.success("Optional tracking disabled.");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to update privacy settings.";
            setSaveFeedback(message);
            toast.error(message);
        } finally {
            setSaving(false);
        }
    }, [formState, savePrivacyPreferences, scheduleAutosaveFeedbackReset]);

    useEffect(() => {
        if (!user || !autosaveReadyRef.current) {
            return;
        }

        const nextSignature = JSON.stringify(formState);
        if (nextSignature === lastSavedSignatureRef.current) {
            return;
        }

        if (autosaveTimeoutRef.current) {
            window.clearTimeout(autosaveTimeoutRef.current);
        }

        autosaveTimeoutRef.current = window.setTimeout(() => {
            void persistSettings(formState);
        }, 650);

        return () => {
            if (autosaveTimeoutRef.current) {
                window.clearTimeout(autosaveTimeoutRef.current);
            }
        };
    }, [formState, persistSettings, user]);

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
            trackEvent("avatar_uploaded", { source: "profile_settings" });

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

    const updateCreatorSettingsState = <K extends keyof CreatorSettings>(key: K, value: CreatorSettings[K]) => {
        setCreatorSettingsState((current: CreatorSettings) => ({
            ...current,
            [key]: value,
        }));
    };

    const handleSaveCreatorSettings = async () => {
        if (!isCreatorAccount) {
            return;
        }

        setCreatorSettingsLoading(true);
        try {
            const response = await authFetch("/api/creator/settings", {
                method: "PUT",
                body: JSON.stringify({
                    creatorSettings: creatorSettingsState,
                }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(typeof result?.error === "string" ? result.error : "Failed to save creator settings.");
            }
            toast.success("Creator controls updated.");
        } catch (error: any) {
            toast.error(error.message || "Failed to save creator settings.");
        } finally {
            setCreatorSettingsLoading(false);
        }
    };

    const handleRequestCreatorPayout = async () => {
        if (!isCreatorAccount) {
            return;
        }

        try {
            const response = await authFetch("/api/creator/payouts", {
                method: "POST",
                body: JSON.stringify({
                    requestedGd: creatorPayoutAmount,
                }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(typeof result?.error === "string" ? result.error : "Failed to request payout.");
            }
            toast.success("Payout request submitted. Manual review should take 5–7 business days.");
        } catch (error: any) {
            toast.error(error.message || "Failed to request payout.");
        }
    };

    const handleSendCreatorBroadcast = async () => {
        if (!isCreatorAccount || creatorBroadcastMessage.trim().length < 4) {
            return;
        }

        setSendingCreatorBroadcast(true);
        try {
            const response = await authFetch("/api/creator/broadcasts", {
                method: "POST",
                body: JSON.stringify({
                    message: creatorBroadcastMessage.trim(),
                }),
            });
            const result = await response.json().catch(() => ({})) as {
                broadcast?: Record<string, unknown>;
                error?: string;
            };
            if (!response.ok) {
                throw new Error(typeof result.error === "string" ? result.error : "Failed to send broadcast.");
            }

            setCreatorBroadcastMessage("");
            if (result.broadcast) {
                setCreatorBroadcasts((current) => [result.broadcast as Record<string, unknown>, ...current].slice(0, 6));
            }
            toast.success("Broadcast sent to followers.");
        } catch (error: any) {
            toast.error(error.message || "Failed to send broadcast.");
        } finally {
            setSendingCreatorBroadcast(false);
        }
    };

    return (
        <div className="w-full px-4 max-w-2xl mx-auto">
            <PageViewEvent eventName="profile_settings_viewed" />
            <header className="mb-5 flex items-start justify-between gap-3">
                <h1 className="bg-gradient-to-r from-brand-purple to-brand-purple bg-clip-text text-2xl font-bold text-transparent md:text-3xl">Profile Settings</h1>
                <div className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${saving ? "border-brand-purple/25 bg-brand-purple/10 text-white" : saveFeedback && saveFeedback !== "Saved" ? "border-red-500/25 bg-red-500/10 text-red-200" : "border-white/10 bg-white/5 text-gray-300"}`}>
                    {saving ? "Saving" : saveFeedback ?? "Autosave on"}
                </div>
            </header>

            <form onSubmit={(event) => event.preventDefault()} className="space-y-4">
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
                            <p className="text-lg font-bold text-white truncate">{profileIdentityLabel}</p>
                            <p className="text-sm text-gray-400 truncate">{profileIdentityDetail}</p>
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
                        <p className="text-xs text-gray-500 mb-1">Email address</p>
                        <p className="text-sm text-gray-200 flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /> {profileEmail}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-300 mb-1.5">Birthday</label>
                            <div className="relative">
                                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                <input
                                    type="date"
                                    id="dateOfBirth"
                                    value={formState.dateOfBirth}
                                    onChange={(event) => updateForm("dateOfBirth", event.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="timezone" className="block text-sm font-medium text-gray-300 mb-1.5">Timezone</label>
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
                    </div>
                </SectionCard>

                {isCreatorAccount ? (
                    <SectionCard title="Kreator Experiences" id="creator-tools">
                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-[1.15rem] border border-white/10 bg-black/30 px-4 py-3">
                                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Creator earnings</p>
                                <p className="mt-2 text-2xl font-black text-brand-purple">{creatorStats?.earningsGd || 0} GD</p>
                                <p className="mt-1 text-xs text-gray-500">Across messaging, subscriptions, requests, and bookings.</p>
                            </div>
                            <div className="rounded-[1.15rem] border border-white/10 bg-black/30 px-4 py-3">
                                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Subscribers</p>
                                <p className="mt-2 text-2xl font-black text-white">{creatorStats?.activeSubscribers || 0}</p>
                                <p className="mt-1 text-xs text-gray-500">Active monthly members.</p>
                            </div>
                        </div>

                        <ToggleRow
                            label="Creator messaging"
                            description="Turn paid creator chat on or off."
                            icon={<MessageSquare className="h-4 w-4 text-brand-purple" />}
                            checked={creatorSettingsState.messagingEnabled}
                            onChange={(value) => updateCreatorSettingsState("messagingEnabled", value)}
                        />
                        <ToggleRow
                            label="Creator broadcasts"
                            description="Send broadcast posts to followers."
                            icon={<Sparkles className="h-4 w-4 text-brand-purple" />}
                            checked={creatorSettingsState.broadcastsEnabled}
                            onChange={(value) => updateCreatorSettingsState("broadcastsEnabled", value)}
                        />
                        <ToggleRow
                            label="Subscriptions"
                            description="Let users subscribe monthly."
                            icon={<Wallet className="h-4 w-4 text-brand-purple" />}
                            checked={creatorSettingsState.subscriptionsEnabled}
                            onChange={(value) => updateCreatorSettingsState("subscriptionsEnabled", value)}
                        />
                        <ToggleRow
                            label="Calls + bookings"
                            description="Allow phone and video experiences."
                            icon={<CalendarClock className="h-4 w-4 text-brand-purple" />}
                            checked={creatorSettingsState.bookingsEnabled}
                            onChange={(value) => updateCreatorSettingsState("bookingsEnabled", value)}
                        />
                        <ToggleRow
                            label="Custom requests"
                            description="Show paid request categories on your creator page."
                            icon={<Sparkles className="h-4 w-4 text-brand-purple" />}
                            checked={creatorSettingsState.customRequestsEnabled}
                            onChange={(value) => updateCreatorSettingsState("customRequestsEnabled", value)}
                        />

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-300">Monthly subscription price</label>
                                <input
                                    type="number"
                                    min={CREATOR_SUBSCRIPTION_MIN_GD}
                                    value={creatorSettingsState.subscriptionPriceGd}
                                    onChange={(event) => updateCreatorSettingsState("subscriptionPriceGd", Math.max(CREATOR_SUBSCRIPTION_MIN_GD, Number(event.target.value) || CREATOR_SUBSCRIPTION_MIN_GD))}
                                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-300">Booking minimum minutes</label>
                                <input
                                    type="number"
                                    min={5}
                                    step={5}
                                    value={creatorSettingsState.bookingMinimumMinutes}
                                    onChange={(event) => updateCreatorSettingsState("bookingMinimumMinutes", Math.max(5, Number(event.target.value) || 5))}
                                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-300">Phone rate per minute</label>
                                <input
                                    type="number"
                                    min={CREATOR_BOOKING_RATES.phone}
                                    value={creatorSettingsState.phoneRatePerMinuteGd}
                                    onChange={(event) => updateCreatorSettingsState("phoneRatePerMinuteGd", Math.max(CREATOR_BOOKING_RATES.phone, Number(event.target.value) || CREATOR_BOOKING_RATES.phone))}
                                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-300">Video rate per minute</label>
                                <input
                                    type="number"
                                    min={CREATOR_BOOKING_RATES.video}
                                    value={creatorSettingsState.videoRatePerMinuteGd}
                                    onChange={(event) => updateCreatorSettingsState("videoRatePerMinuteGd", Math.max(CREATOR_BOOKING_RATES.video, Number(event.target.value) || CREATOR_BOOKING_RATES.video))}
                                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
                                />
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            {creatorSettingsState.requestCategories.map((category: CreatorRequestCategoryConfig, index: number) => (
                                <div key={category.id} className="rounded-[1.15rem] border border-white/10 bg-black/25 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-white">{category.label}</p>
                                            <p className="mt-1 text-xs text-gray-500">{category.description}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCreatorSettingsState((current: CreatorSettings) => ({
                                                    ...current,
                                                    requestCategories: current.requestCategories.map((entry: CreatorRequestCategoryConfig, entryIndex: number) => (
                                                        entryIndex === index
                                                            ? { ...entry, enabled: !entry.enabled }
                                                            : entry
                                                    )),
                                                }));
                                            }}
                                            className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${category.enabled ? "bg-brand-purple/15 text-white" : "bg-white/5 text-gray-400"}`}
                                        >
                                            {category.enabled ? "Visible" : "Hidden"}
                                        </button>
                                    </div>
                                    <input
                                        type="number"
                                        min={0}
                                        value={category.priceGd}
                                        onChange={(event) => {
                                            const nextPrice = Math.max(0, Number(event.target.value) || 0);
                                            setCreatorSettingsState((current: CreatorSettings) => ({
                                                ...current,
                                                requestCategories: current.requestCategories.map((entry: CreatorRequestCategoryConfig, entryIndex: number) => (
                                                    entryIndex === index
                                                        ? { ...entry, priceGd: nextPrice }
                                                        : entry
                                                )),
                                            }));
                                        }}
                                        className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={() => setCreatorDropModalOpen(true)}
                                className="rounded-xl border border-brand-purple/20 bg-brand-purple/10 px-4 py-3 text-sm font-bold text-white"
                            >
                                Submit creator drop
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveCreatorSettings}
                                disabled={creatorSettingsLoading}
                                className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white"
                            >
                                {creatorSettingsLoading ? "Saving creator controls..." : "Save creator controls"}
                            </button>
                        </div>

                        <div className="rounded-[1.15rem] border border-white/10 bg-black/25 p-4 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-white">Creator broadcast</p>
                                    <p className="mt-1 text-xs leading-5 text-gray-500">Send short updates to followers with creator alerts enabled.</p>
                                </div>
                                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                                    Followers
                                </span>
                            </div>
                            <textarea
                                value={creatorBroadcastMessage}
                                onChange={(event) => setCreatorBroadcastMessage(event.target.value.slice(0, 280))}
                                rows={3}
                                placeholder="Tell followers what just dropped or what is coming next."
                                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
                            />
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-[11px] text-gray-500">{creatorBroadcastMessage.length}/280</p>
                                <button
                                    type="button"
                                    onClick={handleSendCreatorBroadcast}
                                    disabled={sendingCreatorBroadcast || creatorBroadcastMessage.trim().length < 4}
                                    className="rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                                >
                                    {sendingCreatorBroadcast ? "Sending..." : "Send broadcast"}
                                </button>
                            </div>
                            {creatorBroadcasts.length > 0 ? (
                                <div className="space-y-2">
                                    {creatorBroadcasts.slice(0, 3).map((broadcast) => (
                                        <div key={String(broadcast.id)} className="rounded-xl border border-white/10 bg-black/35 px-3 py-3">
                                            <p className="text-sm font-semibold text-white">
                                                {typeof broadcast.title === "string" && broadcast.title.trim().length > 0 ? broadcast.title : "Creator update"}
                                            </p>
                                            <p className="mt-1 text-xs leading-5 text-gray-400">
                                                {typeof broadcast.message === "string" ? broadcast.message : ""}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>

                        <div className="rounded-[1.15rem] border border-white/10 bg-black/25 p-4">
                            <p className="text-sm font-semibold text-white">Request payout</p>
                            <p className="mt-1 text-xs leading-5 text-gray-500">Manual payout review takes 5–7 business days. 100 GD = $1.</p>
                            <div className="mt-3 flex gap-3">
                                <input
                                    type="number"
                                    min={100}
                                    step={100}
                                    value={creatorPayoutAmount}
                                    onChange={(event) => setCreatorPayoutAmount(Math.max(100, Number(event.target.value) || 100))}
                                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
                                />
                                <button
                                    type="button"
                                    onClick={handleRequestCreatorPayout}
                                    className="rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white"
                                >
                                    Request
                                </button>
                            </div>
                        </div>
                    </SectionCard>
                ) : null}

                <SectionCard title="Notifications">
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Required service and account notices</p>
                        <StaticSettingRow
                            label="Account and purchase notices"
                            description="Required for security, payments, and account recovery."
                            icon={<Bell className="h-4 w-4 text-brand-purple" />}
                            badge="Always on"
                        />
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Optional product alerts</p>
                        <ToggleRow
                            label="Browser push alerts"
                            description={notificationSupportMessage || "Use browser reminders for tasks, check-ins, and drop alerts."}
                            checked={formState.browserPushEnabled}
                            onChange={(value) => void handleBrowserPushToggle(value)}
                            icon={<Bell className="h-4 w-4 text-brand-purple" />}
                            disabled={notificationSetupLoading}
                            badge={notificationSetupLoading ? "Setting up" : "Browser"}
                        />
                        <ToggleRow
                            label="In-app activity alerts"
                            description="Show account, task, and drop alerts inside KandyDrops."
                            checked={formState.inAppEnabled}
                            onChange={(value) => updateForm("inAppEnabled", value)}
                            icon={<Bell className="h-4 w-4 text-brand-purple" />}
                        />
                        <ToggleRow
                            label="New drop releases"
                            description="Alert me when new drops or creator releases go live."
                            checked={formState.newDropAlerts}
                            onChange={(value) => updateForm("newDropAlerts", value)}
                            icon={<Bell className="h-4 w-4 text-brand-purple" />}
                        />
                        <ToggleRow
                            label="Ending soon reminders"
                            description="Warn me before drops or tasks expire."
                            checked={formState.expiringSoonAlerts}
                            onChange={(value) => updateForm("expiringSoonAlerts", value)}
                            icon={<Bell className="h-4 w-4 text-brand-purple" />}
                        />
                    </div>
                </SectionCard>

                <SectionCard title="Privacy, Tracking & Rights">
                    <StaticSettingRow
                        label="Strictly necessary storage"
                        description="Required for sign-in, security, payments, and core site functionality."
                        icon={<Lock className="h-4 w-4 text-brand-purple" />}
                        badge="Always on"
                    />
                    <ToggleRow
                        label="Anonymous product analytics"
                        description="Measure product usage without tying it to your account."
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
                        description="Link activity to your account for funnels and user-level insights."
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
                        description="Use your activity to improve recommendations."
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
                        description="Include your activity in anonymous trend reporting."
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
                        description="Turn off optional analytics when your browser sends Global Privacy Control."
                        checked={formState.honorGlobalPrivacyControl}
                        onChange={(value) => updateForm("honorGlobalPrivacyControl", value)}
                        badge={browserGpcEnabled ? "Detected" : undefined}
                    />
                    {browserGpcEnabled ? (
                        <p className="rounded-xl border border-white/5 bg-black/25 px-3 py-2 text-xs leading-5 text-gray-400">
                            Your browser is sending Global Privacy Control right now, so optional analytics stay off unless you override it.
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
                                    Optional analytics stay off until you enable them, and you can withdraw consent here anytime.
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
                                    className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                                >
                                    Privacy policy
                                </Link>
                            </div>
                        </div>
                        <p className="mt-3 text-[11px] leading-5 text-gray-500">
                            Last privacy notice update: {PRIVACY_POLICY_LAST_UPDATED}.
                        </p>
                    </div>
                </SectionCard>

                <SectionCard title="Refer a Friend">
                    <div className="rounded-xl border border-brand-purple/20 bg-brand-purple/5 p-4 flex flex-col gap-3">
                        <p className="text-sm text-gray-300">Get <strong className="text-brand-purple">{REFERRAL_BONUS_GD} GumDrops</strong> when a friend signs up with your link.</p>
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
                    <div className="rounded-[1.15rem] border border-white/10 bg-black/30 px-4 py-3">
                        <p className="text-sm font-medium text-gray-100">Support & policies</p>
                        <p className="mt-1 text-xs leading-5 text-gray-500">Open help, support, and policies from this account page.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Link
                                href="/faq"
                                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                            >
                                <CircleHelp className="mr-2 h-4 w-4 text-brand-purple" />
                                FAQ
                            </Link>
                            <Link
                                href="/dashboard/support"
                                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                            >
                                <LifeBuoy className="mr-2 h-4 w-4 text-brand-purple" />
                                Support
                            </Link>
                            <Link
                                href="/privacy"
                                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                            >
                                <FileText className="mr-2 h-4 w-4 text-brand-purple" />
                                Policies
                            </Link>
                        </div>
                    </div>
                </SectionCard>

                <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 md:p-5 space-y-4">
                    <h2 className="text-base md:text-lg font-bold text-red-500 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5" /> Danger Zone
                    </h2>
                    <p className="text-sm text-red-400/80 mb-4">Deleting your account permanently removes your profile, collection, and data.</p>
                    <Button type="button" variant="glass" onClick={handleRequestDeletion} disabled={isDeleting} className="w-full text-red-500 justify-center border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50 transition-colors">
                        {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                        Delete Account
                    </Button>
                </section>
            </form>
            {isCreatorAccount ? (
                <CreateDropModal
                    isOpen={creatorDropModalOpen}
                    onClose={() => setCreatorDropModalOpen(false)}
                    onSuccess={() => {
                        setCreatorDropModalOpen(false);
                        toast.success("Creator drop submitted for admin review.");
                    }}
                    mode="creator"
                    creatorIdOverride={user?.uid || null}
                />
            ) : null}
        </div>
    );
}
