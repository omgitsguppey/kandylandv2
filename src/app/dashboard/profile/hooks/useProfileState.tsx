import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
import { useAuth, useUserProfile } from "@/context/AuthContext";
import { updateProfile } from "firebase/auth";
import { authFetch } from "@/lib/authFetch";
import { toast } from "sonner";
import { storage } from "@/lib/firebase-data";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { mutate } from "swr";
import { getBrowserNotificationState } from "@/lib/firebase-messaging";
import { enableBrowserNotifications } from "@/lib/browser-notification-enrollment";
import {
    getBrowserGlobalPrivacyControl,
    normalizePrivacySettingsSnapshot,
    persistPrivacySettingsSnapshot,
} from "@/lib/privacy-consent";
import { CONSENT_TRACKING_VERSION } from "@/lib/privacy/consent-tracking-contract";
import { reportClientIssue } from "@/lib/client-error-reporting";
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

export function getAccountDeletionFailureMessage(status?: number, serverMessage?: unknown, code?: unknown) {
    if (code === "account_deletion_retention_review_required") {
        return "Account deletion needs a retention review before required payment or security records can be removed. Contact support; your account remains active.";
    }
    if (code === "account_deletion_cleanup_pending" || code === "account_deletion_retention_reconciliation_pending") {
        return "Account login is disabled, but final cleanup is pending. Contact support for review.";
    }

    if (status === 401 || status === 403) {
        return "Account deletion could not start because your account session is missing. Sign in again and retry.";
    }

    const normalizedMessage = typeof serverMessage === "string" ? serverMessage.toLowerCase() : "";
    if (status === 503 && normalizedMessage.includes("pending")) {
        return "Your deletion started, but final cleanup needs support review. Contact support if you can still access the account.";
    }

    return "We could not submit the deletion request right now. Try again or contact support.";
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

type ProfilePrivacySettingsPayloadInput = Pick<
    ProfileSettingsFormState,
    | "anonymousAnalyticsEnabled"
    | "identifiedAnalyticsEnabled"
    | "allowRecommendations"
    | "showInAnonymousStats"
    | "honorGlobalPrivacyControl"
>;

export function buildAccountPrivacySettingsPayload(input: ProfilePrivacySettingsPayloadInput) {
    const snapshot = normalizePrivacySettingsSnapshot({
        ...input,
        consentDecision: "customize",
        consentSource: "account_settings",
        consentPolicyVersion: CONSENT_TRACKING_VERSION,
        consentUpdatedAt: 1,
    });

    return {
        consentMode: snapshot.consentMode,
        consentDecision: snapshot.consentDecision,
        consentSource: "account_settings" as const,
        consentPolicyVersion: snapshot.consentPolicyVersion,
        anonymousAnalyticsEnabled: snapshot.anonymousAnalyticsEnabled,
        identifiedAnalyticsEnabled: snapshot.identifiedAnalyticsEnabled,
        allowRecommendations: snapshot.allowRecommendations,
        showInAnonymousStats: snapshot.showInAnonymousStats,
        honorGlobalPrivacyControl: snapshot.honorGlobalPrivacyControl,
    };
}

export function useProfileState() {
    const { user, logout, loading } = useAuth();
    const { userProfile: observedUserProfile } = useUserProfile();
    const accountReady = !loading && Boolean(user && observedUserProfile?.uid === user.uid);
    const profileOwnerPending = loading || Boolean(user && observedUserProfile && observedUserProfile.uid !== user.uid);
    const userProfile = accountReady ? observedUserProfile : null;
    const accountOperationRef = useRef({ actorUid: null as string | null, ready: false, revision: 0, mounted: false });
    useLayoutEffect(() => {
        accountOperationRef.current = {
            actorUid: user?.uid ?? null,
            ready: accountReady,
            revision: accountOperationRef.current.revision + 1,
            mounted: true,
        };
        return () => {
            accountOperationRef.current.ready = false;
            accountOperationRef.current.mounted = false;
            accountOperationRef.current.revision += 1;
        };
    }, [accountReady, user?.uid]);
    const captureAccountOperation = useCallback(() => {
        if (!user || !accountReady || !accountOperationRef.current.mounted || !accountOperationRef.current.ready || accountOperationRef.current.actorUid !== user.uid) return null;
        return { actorUid: user.uid, revision: accountOperationRef.current.revision };
    }, [accountReady, user?.uid]);
    const isCurrentAccountOperation = useCallback((operation: { actorUid: string; revision: number }) => {
        const current = accountOperationRef.current;
        return current.mounted && current.ready && current.actorUid === operation.actorUid && current.revision === operation.revision;
    }, []);

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
        accountReady,
        user?.uid,
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
    const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
    const [deletionFeedback, setDeletionFeedback] = useState<string | null>(null);
    const [deletionFailureCode, setDeletionFailureCode] = useState<string | null>(null);
    const deletionRequiresSupportReview = deletionFailureCode === "account_deletion_retention_review_required"
        || deletionFailureCode === "account_deletion_cleanup_pending"
        || deletionFailureCode === "account_deletion_retention_reconciliation_pending";
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [notificationSetupLoading, setNotificationSetupLoading] = useState(false);
    const [notificationSupportMessage, setNotificationSupportMessage] = useState<string | null>(null);
    const autosaveTimeoutRef = useRef<number | null>(null);
    const autosaveFeedbackTimeoutRef = useRef<number | null>(null);
    const autosaveReadyRef = useRef(false);
    const lastSavedSignatureRef = useRef(JSON.stringify(normalizedInitialState));
    const browserGpcEnabled = useMemo(() => getBrowserGlobalPrivacyControl(), []);
    const isCreatorProjectionActive = false;
    useEffect(() => {
        setFormState(normalizedInitialState);
        lastSavedSignatureRef.current = JSON.stringify(normalizedInitialState);
        autosaveReadyRef.current = accountReady;
    }, [accountReady, normalizedInitialState, user?.uid]);

    useEffect(() => {
        setSaving(false);
        setSaveFeedback(null);
        setIsDownloading(false);
        setIsDeleting(false);
        setDeleteConfirmationOpen(false);
        setDeletionFeedback(null);
        setDeletionFailureCode(null);
        setIsUploadingAvatar(false);
        setNotificationSetupLoading(false);
        if (autosaveFeedbackTimeoutRef.current) window.clearTimeout(autosaveFeedbackTimeoutRef.current);
    }, [accountReady, user?.uid]);

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

    const profileName = formState.displayName || user?.displayName || "Collector";
    const profileEmail = user?.email || "Signed in";
    const profileUsername = formState.username ? `@${formState.username}` : null;
    const profileIdentityLabel = profileUsername || profileName;
    const profileIdentityDetail = profileUsername && profileName !== profileUsername ? profileName : profileEmail;
    const avatarFallback = profileName.charAt(0).toUpperCase() || "C";

    const updateForm = <K extends keyof ProfileSettingsFormState>(key: K, value: ProfileSettingsFormState[K]) => {
        if (!accountReady) return;
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
        privacySettings: buildAccountPrivacySettingsPayload(nextState),
    }), []);

    const savePrivacyPreferences = useCallback(async (nextPrivacyState: Pick<
        ProfileSettingsFormState,
        | "anonymousAnalyticsEnabled"
        | "identifiedAnalyticsEnabled"
        | "allowRecommendations"
        | "showInAnonymousStats"
        | "honorGlobalPrivacyControl"
    >, operation: { actorUid: string; revision: number }) => {
        if (!isCurrentAccountOperation(operation)) return false;
        if (isCreatorProjectionActive) {
            throw new Error("Creator dashboard is read-only in admin projection.");
        }

        const response = await authFetch("/api/user/profile", {
            method: "PUT",
            body: JSON.stringify({
                privacySettings: buildAccountPrivacySettingsPayload(nextPrivacyState),
            }),
        });

        const result = await response.json();
        if (!isCurrentAccountOperation(operation)) return false;
        if (!response.ok) {
            throw new Error(typeof result.error === "string" ? result.error : "Failed to save privacy settings.");
        }

        persistPrivacySettingsSnapshot({
            anonymousAnalyticsEnabled: nextPrivacyState.anonymousAnalyticsEnabled,
            identifiedAnalyticsEnabled: nextPrivacyState.identifiedAnalyticsEnabled,
            allowRecommendations: nextPrivacyState.allowRecommendations,
            showInAnonymousStats: nextPrivacyState.showInAnonymousStats,
            honorGlobalPrivacyControl: nextPrivacyState.honorGlobalPrivacyControl,
            consentDecision: "customize",
            consentSource: "account_settings",
            consentPolicyVersion: CONSENT_TRACKING_VERSION,
        });
        return true;
    }, [isCreatorProjectionActive, isCurrentAccountOperation]);

    const persistSettings = useCallback(async (nextState: ProfileSettingsFormState, operation: { actorUid: string; revision: number }) => {
        if (!user || user.uid !== operation.actorUid || !isCurrentAccountOperation(operation)) {
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
            if (!isCurrentAccountOperation(operation)) return false;

            const response = await authFetch("/api/user/profile", {
                method: "PUT",
                body: JSON.stringify(buildSettingsPayload(nextState)),
            });

            const result = await response.json();
            if (!isCurrentAccountOperation(operation)) return false;
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
            trackEvent("setting_save_succeeded", {
                setting_id: "account_profile_or_preferences",
                actor_role: userProfile?.role || "user",
                creator_id: userProfile?.uid || "",
                target_creator_id: userProfile?.uid || "",
                settings_surface: "account",
                section: "account_settings",
                source_component: "useProfileState",
                truth_state: "source_ready",
            });
            return true;
        } catch (error: unknown) {
            if (!isCurrentAccountOperation(operation)) return false;
            const message = error instanceof Error ? error.message : "Failed to update settings.";
            setSaveFeedback(message);
            toast.error(message);
            trackEvent("setting_save_failed", {
                setting_id: "account_profile_or_preferences",
                actor_role: userProfile?.role || "user",
                creator_id: userProfile?.uid || "",
                target_creator_id: userProfile?.uid || "",
                settings_surface: "account",
                section: "account_settings",
                source_component: "useProfileState",
                truth_state: "source_ready",
                failure_code: "profile_save_failed",
            });
            return false;
        } finally {
            if (isCurrentAccountOperation(operation)) setSaving(false);
        }
    }, [buildSettingsPayload, isCreatorProjectionActive, isCurrentAccountOperation, scheduleAutosaveFeedbackReset, user, userProfile?.role, userProfile?.uid]);

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
        const operation = captureAccountOperation();
        if (!operation || !userProfile) {
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
            if (!isCurrentAccountOperation(operation)) return;
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
            if (!isCurrentAccountOperation(operation)) return;
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
            if (isCurrentAccountOperation(operation)) setNotificationSetupLoading(false);
        }
    };

    const handleWithdrawOptionalTracking = useCallback(async () => {
        const operation = captureAccountOperation();
        if (!operation) return;
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
            const saved = await savePrivacyPreferences(nextState, operation);
            if (!saved || !isCurrentAccountOperation(operation)) return;
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
            trackEvent("setting_save_succeeded", {
                setting_id: "essential_only_mode",
                actor_role: userProfile?.role || "user",
                creator_id: userProfile?.uid || "",
                target_creator_id: userProfile?.uid || "",
                settings_surface: "privacy",
                section: "privacy_data",
                source_component: "useProfileState",
                truth_state: "source_ready",
            });
        } catch (error: unknown) {
            if (!isCurrentAccountOperation(operation)) return;
            const message = error instanceof Error ? error.message : "Failed to update privacy settings.";
            setSaveFeedback(message);
            toast.error(message);
            trackEvent("setting_save_failed", {
                setting_id: "essential_only_mode",
                actor_role: userProfile?.role || "user",
                creator_id: userProfile?.uid || "",
                target_creator_id: userProfile?.uid || "",
                settings_surface: "privacy",
                section: "privacy_data",
                source_component: "useProfileState",
                truth_state: "source_ready",
                failure_code: "privacy_save_failed",
            });
        } finally {
            if (isCurrentAccountOperation(operation)) setSaving(false);
        }
    }, [captureAccountOperation, formState, isCreatorProjectionActive, isCurrentAccountOperation, savePrivacyPreferences, scheduleAutosaveFeedbackReset, userProfile?.role, userProfile?.uid]);

    useEffect(() => {
        const operation = captureAccountOperation();
        if (!operation || !autosaveReadyRef.current) {
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
            void persistSettings(formState, operation);
        }, 650);

        return () => {
            if (autosaveTimeoutRef.current) {
                window.clearTimeout(autosaveTimeoutRef.current);
            }
        };
    }, [captureAccountOperation, formState, persistSettings]);

    const handleChangeAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const operation = captureAccountOperation();
        const file = e.target.files?.[0];
        if (!file || !user || !operation) return;

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
            if (!isCurrentAccountOperation(operation)) return;
            const downloadUrl = await getDownloadURL(storageRef);
            if (!isCurrentAccountOperation(operation)) return;

            const response = await authFetch("/api/user/profile", {
                method: "POST",
                body: JSON.stringify({ photoURL: downloadUrl }),
            });
            const result = await response.json().catch(() => ({}));
            if (!isCurrentAccountOperation(operation)) return;
            if (!response.ok) {
                throw new Error(typeof result?.error === "string" ? result.error : "Failed to sync avatar.");
            }

            await updateProfile(user, { photoURL: downloadUrl });
            if (!isCurrentAccountOperation(operation)) return;
            trackEvent("avatar_uploaded", { source: "profile_settings" });

            toast.success("Avatar updated successfully.");

            // Revalidate SWR caches globally instead of doing a hard reload
            mutate(() => true, undefined, { revalidate: true });
        } catch (error: unknown) {
            if (!isCurrentAccountOperation(operation)) return;
            const message = error instanceof Error ? error.message : "Failed to upload avatar.";
            toast.error(`Failed to upload avatar: ${message}`);
        } finally {
            if (isCurrentAccountOperation(operation)) setIsUploadingAvatar(false);
        }
    };

    const buildAccountDeleteTelemetryParams = useCallback((extra?: Record<string, unknown>) => ({
        section: "support_safety",
        source_component: "ProfileSupportSafetySection",
        route: "/dashboard/profile",
        deletion_mode: "immediate_server_delete",
        truth_state: "source_ready",
        ...extra,
    }), []);

    const handleRequestDeletion = useCallback(() => {
        if (!captureAccountOperation()) return;
        if (isCreatorProjectionActive) {
            toast.error("Creator dashboard is read-only in admin projection.");
            return;
        }

        trackEvent("account_delete_clicked", buildAccountDeleteTelemetryParams());
        setDeletionFeedback(null);
        setDeleteConfirmationOpen(true);
        setDeletionFailureCode(null);
        trackEvent("account_delete_confirm_opened", buildAccountDeleteTelemetryParams());
    }, [buildAccountDeleteTelemetryParams, captureAccountOperation, isCreatorProjectionActive]);

    const handleCancelAccountDeletion = useCallback(() => {
        setDeleteConfirmationOpen(false);
        setDeletionFeedback(null);
        setDeletionFailureCode(null);
        trackEvent("account_delete_cancelled", buildAccountDeleteTelemetryParams());
    }, [buildAccountDeleteTelemetryParams]);

    const handleConfirmAccountDeletion = useCallback(async () => {
        if (isDeleting || deletionRequiresSupportReview) return;
        if (isCreatorProjectionActive) {
            toast.error("Creator dashboard is read-only in admin projection.");
            return;
        }

        if (!user) {
            const message = getAccountDeletionFailureMessage(401);
            setDeletionFeedback(message);
            toast.error(message);
            trackEvent("account_delete_failed", buildAccountDeleteTelemetryParams({ failure_code: "missing_session" }));
            reportClientIssue({
                channel: "auth",
                severity: "warn",
                message: "Account deletion flow failed",
                humanMessage: message,
                error: new Error(message),
                detail: {
                    source: "profile_page",
                    action: "delete_account",
                    route: "/api/user/delete",
                    status: 401,
                    debugLane: "account_safety",
                    deletionMode: "immediate_server_delete",
                },
                fingerprint: "account-delete-flow-missing-session",
                consoleLabel: "[Profile] account deletion missing session",
            });
            return;
        }

        const operation = captureAccountOperation();
        if (!operation) return;
        trackEvent("account_delete_confirmed", buildAccountDeleteTelemetryParams());
        setIsDeleting(true);
        try {
            trackEvent("account_delete_request_submitted", buildAccountDeleteTelemetryParams());
            const response = await authFetch("/api/user/delete", { method: "DELETE" });
            const data = await response.json().catch(() => ({})) as { error?: string; message?: string; success?: boolean; code?: string; retryable?: boolean; accountActive?: boolean };
            if (!isCurrentAccountOperation(operation)) return;

            if (!response.ok || data.success !== true) {
                const message = getAccountDeletionFailureMessage(response.status, data.message || data.error, data.code);
                setDeletionFeedback(message);
                setDeletionFailureCode(data.code || `http_${response.status}`);
                trackEvent("account_delete_failed", buildAccountDeleteTelemetryParams({
                    failure_code: data.code || `http_${response.status}`,
                    status: response.status,
                }));
                reportClientIssue({
                    channel: "auth",
                    severity: "error",
                    message: "Account deletion flow failed",
                    humanMessage: message,
                    error: new Error(message),
                    detail: {
                        source: "profile_page",
                        action: "delete_account",
                        route: "/api/user/delete",
                        status: response.status,
                        debugLane: "account_safety",
                        deletionMode: "immediate_server_delete",
                    },
                    fingerprint: "account-delete-flow-route-failed",
                    consoleLabel: "[Profile] account deletion failed",
                });
                toast.error(message);
                return;
            }

            trackEvent("account_delete_completed", buildAccountDeleteTelemetryParams({
                request_outcome: "completed",
            }));
            toast.success("Account deleted. You have been signed out.");
            setDeleteConfirmationOpen(false);
            await logout();
            if (typeof window !== "undefined") {
                window.location.assign("/");
            }
        } catch (error: unknown) {
            if (!isCurrentAccountOperation(operation)) return;
            const message = getAccountDeletionFailureMessage();
            setDeletionFeedback(message);
            trackEvent("account_delete_failed", buildAccountDeleteTelemetryParams({ failure_code: "network_or_unknown" }));
            reportClientIssue({
                channel: "auth",
                severity: "error",
                message: "Account deletion flow failed",
                humanMessage: message,
                error,
                detail: {
                    source: "profile_page",
                    action: "delete_account",
                    route: "/api/user/delete",
                    debugLane: "account_safety",
                    deletionMode: "immediate_server_delete",
                },
                fingerprint: "account-delete-flow-network-failed",
                consoleLabel: "[Profile] account deletion failed",
            });
            toast.error(message);
        } finally {
            if (isCurrentAccountOperation(operation)) setIsDeleting(false);
        }
    }, [buildAccountDeleteTelemetryParams, captureAccountOperation, deletionRequiresSupportReview, isCreatorProjectionActive, isCurrentAccountOperation, isDeleting, logout, user]);

    const handleDownloadData = async () => {
        const operation = captureAccountOperation();
        if (!operation) return;
        setIsDownloading(true);
        try {
            trackEvent("data_export_requested", {
                setting_id: "download_my_data",
                actor_role: userProfile?.role || "user",
                creator_id: userProfile?.uid || "",
                target_creator_id: userProfile?.uid || "",
                settings_surface: "privacy",
                section: "privacy_data",
                source_component: "useProfileState",
                truth_state: "source_ready",
            });
            const response = await authFetch("/api/user/data", { method: "GET" });
            if (!isCurrentAccountOperation(operation)) return;

            if (!response.ok) {
                throw new Error("We could not prepare your data export right now. Try again or contact support.");
            }

            // Create a blob from the JSON response
            const blob = await response.blob();
            if (!isCurrentAccountOperation(operation)) return;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = `kandydrops_data_export_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success("Data export downloaded securely.");
            trackEvent("setting_save_succeeded", {
                setting_id: "download_my_data",
                actor_role: userProfile?.role || "user",
                creator_id: userProfile?.uid || "",
                target_creator_id: userProfile?.uid || "",
                settings_surface: "privacy",
                section: "privacy_data",
                source_component: "useProfileState",
                truth_state: "source_ready",
            });
        } catch (error: any) {
            if (!isCurrentAccountOperation(operation)) return;
            toast.error(error.message || "We could not prepare your data export right now. Try again or contact support.");
            trackEvent("setting_save_failed", {
                setting_id: "download_my_data",
                actor_role: userProfile?.role || "user",
                creator_id: userProfile?.uid || "",
                target_creator_id: userProfile?.uid || "",
                settings_surface: "privacy",
                section: "privacy_data",
                source_component: "useProfileState",
                truth_state: "source_ready",
                failure_code: "data_export_failed",
            });
        } finally {
            if (isCurrentAccountOperation(operation)) setIsDownloading(false);
        }
    };

    return {
        user, userProfile, logout, accountReady, profileOwnerPending,
        formState, updateForm, saving, saveFeedback,
        isDownloading, isDeleting, deleteConfirmationOpen, deletionFeedback, deletionRequiresSupportReview, isUploadingAvatar,
        notificationSetupLoading, notificationSupportMessage,
        browserGpcEnabled, isCreatorProjectionActive,
        profileName, profileEmail, profileUsername,
        profileIdentityLabel, profileIdentityDetail, avatarFallback,
        handleBrowserPushToggle, handleWithdrawOptionalTracking,
        handleDownloadData, handleRequestDeletion, handleCancelAccountDeletion, handleConfirmAccountDeletion,
        handleChangeAvatar,
    };
}
