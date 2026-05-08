import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAuth, useUserProfile } from "@/context/AuthContext";
import { updateProfile } from "firebase/auth";
import { authFetch } from "@/lib/authFetch";
import { toast } from "sonner";
import { storage } from "@/lib/firebase-data";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { SITE_ORIGIN } from "@/lib/site-origin";
import { mutate } from "swr";
import { getBrowserNotificationState } from "@/lib/firebase-messaging";
import { enableBrowserNotifications } from "@/lib/browser-notification-enrollment";
import { DEFAULT_CREATOR_SETTINGS, type CreatorSettings } from "@/lib/creator-experiences";
import { getBrowserGlobalPrivacyControl, persistPrivacySettingsSnapshot } from "@/lib/privacy-consent";
import { getClientErrorMessage, reportClientIssue } from "@/lib/client-error-reporting";
import { trackEvent } from "@/lib/telemetry";

export const TIMEZONE_OPTIONS = [
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

export type TimezoneOption = (typeof TIMEZONE_OPTIONS)[number];

export interface ProfileSettingsFormState {
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

export type CreatorLoadTarget = "settings" | "broadcasts";

export function getCreatorLoadFailureMessage(target: CreatorLoadTarget, status?: number) {
    if (target === "settings") {
        if (status === 403) {
            return "You don't have creator privileges yet.";
        }
        return "Failed to load creator defaults. Contact support.";
    }
    // broadcasts
    if (status === 403) {
        return "Not authorized to read broadcasts.";
    }
    return "Failed to refresh fan broadcasts.";
}

export async function readJsonSafely<T>(response: Response): Promise<T | null> {
    try {
        return await response.json() as T;
    } catch (err) {
        return null;
    }
}

export function normalizeTimezone(value: unknown): TimezoneOption {
    if (typeof value !== "string") {
        return "Auto";
    }

    const normalized = value.trim() as TimezoneOption;
    return TIMEZONE_OPTIONS.includes(normalized) ? normalized : "Auto";
}

export function sanitizeUsername(value: string): string {
    return value.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9_]/g, "");
}

export function buildFormState(params: any): ProfileSettingsFormState {
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
        honorGlobalPrivacyControl: params.honorGlobalPrivacyControl === true,
    };
}

export function useProfileState() {
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
    const [creatorSettingsNotice, setCreatorSettingsNotice] = useState<string | null>(null);
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
    const lastCreatorNoticeRef = useRef<string | null>(null);
    const browserGpcEnabled = useMemo(() => getBrowserGlobalPrivacyControl(), []);
    const isCreatorProjectionActive = false;
    const projectionCreatorId = "";
    const projectionCreatorName = "";
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
            setCreatorSettingsNotice(null);
            setCreatorStats(null);
            setCreatorBroadcasts([]);
            lastCreatorNoticeRef.current = null;
            return;
        }

        let cancelled = false;
        const creatorQuery = projectionCreatorId ? `?creatorId=${encodeURIComponent(projectionCreatorId)}` : "";

        async function loadCreatorSettings() {
            try {
                setCreatorSettingsLoading(true);
                const [settingsResult, broadcastsResult] = await Promise.allSettled([
                    authFetch(`/api/creator/settings${creatorQuery}`),
                    authFetch(`/api/creator/broadcasts${creatorQuery}`),
                ]);
                const notices: string[] = [];

                if (settingsResult.status === "fulfilled") {
                    const response = settingsResult.value;
                    const result = await readJsonSafely<{
                        creatorSettings?: CreatorSettings | null;
                        stats?: {
                            earningsGd: number;
                            pendingCashoutGd: number;
                            activeSubscribers: number;
                            openRequests: number;
                            bookedCalls: number;
                        };
                        error?: string;
                    }>(response);

                    if (response.ok) {
                        if (!cancelled) {
                            setCreatorSettingsState(result?.creatorSettings || userProfile?.creatorSettings || DEFAULT_CREATOR_SETTINGS);
                            setCreatorStats(result?.stats || null);
                        }
                    } else {
                        const message = typeof result?.error === "string"
                            ? result.error
                            : getCreatorLoadFailureMessage("settings", response.status);
                        notices.push(message);
                        reportClientIssue({
                            channel: "network",
                            severity: "warn",
                            message: "Profile creator settings load failed",
                            error: new Error(message),
                            detail: {
                                source: "profile_page",
                                action: "load_creator_settings",
                                route: "/api/creator/settings",
                                status: response.status,
                            },
                            consoleLabel: "[Profile] creator settings load failed",
                        });
                        if (!cancelled) {
                            setCreatorSettingsState(userProfile?.creatorSettings || DEFAULT_CREATOR_SETTINGS);
                            setCreatorStats(null);
                        }
                    }
                } else {
                    const message = getCreatorLoadFailureMessage("settings");
                    notices.push(message);
                    reportClientIssue({
                        channel: "network",
                        severity: "warn",
                        message: "Profile creator settings load failed",
                        error: settingsResult.reason,
                        detail: {
                            source: "profile_page",
                            action: "load_creator_settings",
                            route: "/api/creator/settings",
                            userMessage: message,
                        },
                        consoleLabel: "[Profile] creator settings load failed",
                    });
                    if (!cancelled) {
                        setCreatorSettingsState(userProfile?.creatorSettings || DEFAULT_CREATOR_SETTINGS);
                        setCreatorStats(null);
                    }
                }

                if (broadcastsResult.status === "fulfilled") {
                    const response = broadcastsResult.value;
                    const result = await readJsonSafely<{
                        broadcasts?: Array<Record<string, unknown>>;
                        error?: string;
                    }>(response);

                    if (response.ok) {
                        if (!cancelled) {
                            setCreatorBroadcasts(Array.isArray(result?.broadcasts) ? result.broadcasts : []);
                        }
                    } else {
                        const message = typeof result?.error === "string"
                            ? result.error
                            : getCreatorLoadFailureMessage("broadcasts", response.status);
                        notices.push(message);
                        reportClientIssue({
                            channel: "network",
                            severity: "warn",
                            message: "Profile creator broadcasts load failed",
                            error: new Error(message),
                            detail: {
                                source: "profile_page",
                                action: "load_creator_broadcasts",
                                route: "/api/creator/broadcasts",
                                status: response.status,
                            },
                            consoleLabel: "[Profile] creator broadcasts load failed",
                        });
                    }
                } else {
                    const message = getCreatorLoadFailureMessage("broadcasts");
                    notices.push(message);
                    reportClientIssue({
                        channel: "network",
                        severity: "warn",
                        message: "Profile creator broadcasts load failed",
                        error: broadcastsResult.reason,
                        detail: {
                            source: "profile_page",
                            action: "load_creator_broadcasts",
                            route: "/api/creator/broadcasts",
                            userMessage: message,
                        },
                        consoleLabel: "[Profile] creator broadcasts load failed",
                    });
                }

                const nextNotice = notices[0] ?? null;
                if (!cancelled) {
                    setCreatorSettingsNotice(nextNotice);
                }
                if (nextNotice && lastCreatorNoticeRef.current !== nextNotice) {
                    toast.error(nextNotice);
                    lastCreatorNoticeRef.current = nextNotice;
                }
                if (!nextNotice) {
                    lastCreatorNoticeRef.current = null;
                }
            } catch (error) {
                const message = getClientErrorMessage(error, "We could not load your creator tools right now.");
                reportClientIssue({
                    channel: "network",
                    severity: "warn",
                    message: "Profile creator settings load failed",
                    error,
                    detail: {
                        source: "profile_page",
                        action: "load_creator_settings",
                        userMessage: message,
                    },
                    consoleLabel: "[Profile] creator settings load failed",
                });
                if (!cancelled) {
                    setCreatorSettingsState(userProfile?.creatorSettings || DEFAULT_CREATOR_SETTINGS);
                    setCreatorStats(null);
                    setCreatorSettingsNotice(message);
                }
                if (lastCreatorNoticeRef.current !== message) {
                    toast.error(message);
                    lastCreatorNoticeRef.current = message;
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
    }, [isCreatorAccount, projectionCreatorId, userProfile?.creatorSettings]);

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
        if (isCreatorProjectionActive) {
            throw new Error("Creator dashboard is read-only in admin projection.");
        }

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
    }, [isCreatorProjectionActive]);

    const persistSettings = useCallback(async (nextState: ProfileSettingsFormState) => {
        if (!user) {
            return false;
        }

        if (isCreatorProjectionActive) {
            toast.error("Creator dashboard is read-only in admin projection.");
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
    }, [buildSettingsPayload, isCreatorProjectionActive, scheduleAutosaveFeedbackReset, user]);

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

        if (isCreatorProjectionActive) {
            toast.error("Creator dashboard is read-only in admin projection.");
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
        if (isCreatorProjectionActive) {
            toast.error("Creator dashboard is read-only in admin projection.");
            return;
        }

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
    }, [formState, isCreatorProjectionActive, savePrivacyPreferences, scheduleAutosaveFeedbackReset]);

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

        if (isCreatorProjectionActive) {
            toast.error("Creator dashboard is read-only in admin projection.");
            return;
        }

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
        if (isCreatorProjectionActive) {
            toast.error("Creator dashboard is read-only in admin projection.");
            return;
        }

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

        if (isCreatorProjectionActive) {
            toast.error("Creator dashboard is read-only in admin projection.");
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

        if (isCreatorProjectionActive) {
            toast.error("Creator dashboard is read-only in admin projection.");
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

        if (isCreatorProjectionActive) {
            toast.error("Creator dashboard is read-only in admin projection.");
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

    return {
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
    isCreatorProjectionActive, projectionCreatorName,
    profileName, profileEmail, profileUsername,
    profileIdentityLabel, profileIdentityDetail,
    avatarFallback, referralLink,
    handleBrowserPushToggle, handleWithdrawOptionalTracking,
    handleDownloadData, handleRequestDeletion, creatorSettingsNotice,
    handleChangeAvatar, handleSaveCreatorSettings,
    handleSendCreatorBroadcast, handleRequestCreatorPayout,
    updateCreatorSettingsState, setCreatorSettingsState
  };
}
