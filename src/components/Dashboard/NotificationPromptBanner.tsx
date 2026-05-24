"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Smartphone, X } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { getBrowserNotificationState } from "@/lib/firebase-messaging";
import { enableBrowserNotifications } from "@/lib/browser-notification-enrollment";
import { trackEvent } from "@/lib/telemetry";
import { toast } from "sonner";
import { hashIdentifier } from "@/hooks/client-runtime";
import { reportClientIssue } from "@/lib/client-error-reporting";
import {
    NOTIFICATION_PROMPT_COOLDOWN_MS,
    NOTIFICATION_PROMPT_VIEW_DELAY_MS,
    classifyNotificationPermissionState,
    classifyNotificationPromptStatus,
    resolveNotificationPromptCooldown,
    shouldShowNotificationPrompt,
    type NotificationPermissionStateResult,
    type NotificationPromptCooldown,
    type NotificationPromptLifecycleEvent,
    type NotificationPromptStatus,
} from "@/lib/notifications/notification-permission-contract";
import { trackNotificationPromptLifecycleEvent } from "@/lib/notifications/notification-prompt-telemetry";

async function getDismissKey(uid: string) {
    const hashedId = await hashIdentifier(uid);
    return `kandydrops:notification-banner-dismissed:${hashedId}`;
}

function clearLegacyNotificationPromptDismissal(storageKey: string) {
    if (typeof window === "undefined") {
        return;
    }

    try {
        window.sessionStorage.removeItem(storageKey);
    } catch {
        // Ignore storage cleanup failures and continue with persistent dismissal.
    }
}

type StoredPromptCooldown = {
    dismissedAtMs?: number;
    snoozedUntilMs?: number;
    retryCount?: number;
};

function readStoredPromptCooldown(storageKey: string | null, nowMs: number): NotificationPromptCooldown {
    if (typeof window === "undefined" || !storageKey) {
        return resolveNotificationPromptCooldown({ nowMs });
    }

    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) {
            return resolveNotificationPromptCooldown({ nowMs });
        }
        if (raw === "1") {
            const migrated = {
                dismissedAtMs: nowMs,
                snoozedUntilMs: nowMs + NOTIFICATION_PROMPT_COOLDOWN_MS,
                retryCount: 1,
            };
            window.localStorage.setItem(storageKey, JSON.stringify(migrated));
            return resolveNotificationPromptCooldown({ nowMs, ...migrated });
        }
        const parsed = JSON.parse(raw) as StoredPromptCooldown;
        return resolveNotificationPromptCooldown({
            nowMs,
            dismissedAtMs: parsed.dismissedAtMs,
            snoozedUntilMs: parsed.snoozedUntilMs,
            retryCount: parsed.retryCount,
        });
    } catch {
        return resolveNotificationPromptCooldown({ nowMs });
    }
}

function writePromptCooldown(storageKey: string | null, cooldown: StoredPromptCooldown) {
    if (typeof window === "undefined" || !storageKey) {
        return;
    }

    try {
        window.localStorage.setItem(storageKey, JSON.stringify(cooldown));
    } catch {
        // Storage may be unavailable in private browsing. The prompt still remains user-initiated.
    }
}

export function NotificationPromptBanner() {
    const { user, userProfile } = useAuth();
    const [isVisible, setIsVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [needsStandaloneInstall, setNeedsStandaloneInstall] = useState(false);
    const [cooldown, setCooldown] = useState<NotificationPromptCooldown>(() => resolveNotificationPromptCooldown({ nowMs: Date.now() }));
    const lifecycleEventsTracked = useRef(new Set<string>());

    const hasNotificationsEnabled = useMemo(() => {
        if (!userProfile) {
            return false;
        }

        return userProfile.notificationSettings?.browserPushEnabled === true
            || (userProfile.fcmTokens?.length ?? 0) > 0;
    }, [userProfile]);

    const [dismissKey, setDismissKey] = useState<string | null>(null);
    const [isCheckingKey, setIsCheckingKey] = useState(true);

    useEffect(() => {
        if (!userProfile?.uid) {
            setDismissKey(null);
            setIsCheckingKey(false);
            return;
        }

        let cancelled = false;
        setIsCheckingKey(true);
        void getDismissKey(userProfile.uid)
            .then((key) => {
                if (!cancelled) {
                    setDismissKey(key);
                    setIsCheckingKey(false);
                }
            })
            .catch((err) => {
                console.warn("Failed to generate notification dismiss key:", err);
                if (!cancelled) {
                    setDismissKey(`kandydrops:notification-banner-fallback:${userProfile.uid}`);
                    setIsCheckingKey(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [userProfile?.uid]);

    useEffect(() => {
        if (typeof window === "undefined" || !dismissKey || isCheckingKey) {
            setDismissed(false);
            return;
        }

        clearLegacyNotificationPromptDismissal(dismissKey);
        const nextCooldown = readStoredPromptCooldown(dismissKey, Date.now());
        setCooldown(nextCooldown);
        setDismissed(nextCooldown.active);
    }, [dismissKey, isCheckingKey]);

    const trackLifecycle = (
        eventName: NotificationPromptLifecycleEvent,
        permission: NotificationPermissionStateResult,
        promptStatus: NotificationPromptStatus,
        extra?: {
            blockedReason?: string | null;
            failureReason?: string | null;
            messagingSupported?: boolean;
        },
    ) => {
        const route = typeof window === "undefined" ? "/dashboard" : window.location.pathname;
        trackNotificationPromptLifecycleEvent({
            eventName,
            permissionState: permission.permissionState,
            promptStatus,
            userScope: user ? "signed_in" : "guest",
            featureSource: "dashboard",
            sourceComponent: "NotificationPromptBanner",
            route,
            cooldownRemainingMs: cooldown.remainingMs,
            retryCount: cooldown.retryCount,
            blockedReason: extra?.blockedReason ?? permission.blockedReason,
            failureReason: extra?.failureReason ?? null,
            requiresPwaInstall: permission.needsStandaloneInstall,
            messagingSupported: extra?.messagingSupported ?? permission.messagingSupported,
        }, trackEvent);
    };

    const trackLifecycleOnce = (
        eventName: NotificationPromptLifecycleEvent,
        permission: NotificationPermissionStateResult,
        promptStatus: NotificationPromptStatus,
        keySuffix: string,
        extra?: Parameters<typeof trackLifecycle>[3],
    ) => {
        const key = `${eventName}:${permission.permissionState}:${promptStatus}:${keySuffix}`;
        if (lifecycleEventsTracked.current.has(key)) {
            return;
        }
        lifecycleEventsTracked.current.add(key);
        trackLifecycle(eventName, permission, promptStatus, extra);
    };

    useEffect(() => {
        if (!user || !userProfile || dismissed || hasNotificationsEnabled || isCheckingKey) {
            setIsVisible(false);
            return;
        }

        let cancelled = false;

        async function evaluateBanner() {
            const state = await getBrowserNotificationState();
            if (cancelled) {
                return;
            }

            setNeedsStandaloneInstall(state.needsStandaloneInstall);
            const permission = classifyNotificationPermissionState({
                browserCapable: state.browserCapable,
                messagingSupported: state.messagingSupported,
                needsStandaloneInstall: state.needsStandaloneInstall,
                permission: state.permission,
            });
            const nextCooldown = readStoredPromptCooldown(dismissKey, Date.now());
            setCooldown(nextCooldown);
            setDismissed(nextCooldown.active);
            const prompt = classifyNotificationPromptStatus({
                permission,
                hasNotificationsEnabled,
                cooldown: nextCooldown,
                userScope: "signed_in",
            });

            if (prompt.status === "snoozed") {
                trackLifecycleOnce("notification_prompt_snoozed", permission, "snoozed", String(nextCooldown.snoozedUntilMs ?? "unknown"));
                setIsVisible(false);
                return;
            }
            if (!shouldShowNotificationPrompt({
                permission,
                hasNotificationsEnabled,
                cooldown: nextCooldown,
                userScope: "signed_in",
            })) {
                if (prompt.status === "unavailable") {
                    trackLifecycleOnce("notification_prompt_blocked", permission, "unavailable", prompt.reason);
                }
                setIsVisible(false);
                return;
            }

            trackLifecycleOnce("notification_prompt_eligible", permission, "eligible", "dashboard");
            window.setTimeout(() => {
                if (!cancelled) {
                    setIsVisible(true);
                    trackLifecycleOnce("notification_prompt_viewed", permission, "shown", "dashboard");
                }
            }, NOTIFICATION_PROMPT_VIEW_DELAY_MS);
        }

        void evaluateBanner();

        return () => {
            cancelled = true;
        };
    }, [dismissKey, dismissed, hasNotificationsEnabled, isCheckingKey, user, userProfile]);

    const handleEnable = async () => {
        if (!user || !userProfile) {
            return;
        }

        if (needsStandaloneInstall) {
            toast.info("Add KandyDrops to your Home Screen, then open it from there to turn on browser notifications on iPhone.");
            const permission = classifyNotificationPermissionState({
                browserCapable: true,
                messagingSupported: false,
                needsStandaloneInstall: true,
                permission: "default",
            });
            trackLifecycle("notification_prompt_blocked", permission, "unavailable", {
                blockedReason: "standalone_required",
                messagingSupported: false,
            });
            trackEvent("notification_prompt_install_help_opened");
            return;
        }

        setLoading(true);
        const requestPermission = classifyNotificationPermissionState({
            browserCapable: typeof window !== "undefined" && "Notification" in window,
            messagingSupported: true,
            needsStandaloneInstall: false,
            permission: typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
        });
        trackLifecycle("notification_permission_requested", requestPermission, "shown");
        try {
            const result = await enableBrowserNotifications(userProfile);
            if (result.status === "not_granted") {
                toast.info("Browser notifications were not enabled.");
                trackLifecycle("notification_permission_denied", {
                    ...requestPermission,
                    permissionState: "denied",
                    canRequestPermission: false,
                    blockedReason: "denied",
                }, "denied", {
                    messagingSupported: false,
                });
                return;
            }
            if (result.status === "failed") {
                throw new Error(result.message);
            }

            setIsVisible(false);
            setDismissed(true);
            if (dismissKey) {
                writePromptCooldown(dismissKey, {
                    dismissedAtMs: Date.now(),
                    snoozedUntilMs: Date.now() + NOTIFICATION_PROMPT_COOLDOWN_MS,
                    retryCount: cooldown.retryCount + 1,
                });
            }
            trackLifecycle("notification_permission_granted", {
                ...requestPermission,
                permissionState: "granted",
                canRequestPermission: false,
                blockedReason: null,
                messagingSupported: result.messagingSupported,
            }, "accepted", {
                messagingSupported: result.messagingSupported,
            });
            toast.success("Browser notifications enabled.");
        } catch (error) {
            trackLifecycle("notification_permission_failed", requestPermission, "failed", {
                failureReason: "notification_permission_failed",
            });
            reportClientIssue({
                channel: "notifications",
                message: "Notification prompt enable failed",
                error,
                detail: {
                    component: "NotificationPromptBanner",
                    needsStandaloneInstall,
                },
                consoleLabel: "[NotificationPromptBanner] enable failed",
            });
            toast.error("We could not turn on notifications right now.");
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        setDismissed(true);
        if (typeof window !== "undefined" && dismissKey) {
            const nowMs = Date.now();
            const nextCooldown = {
                dismissedAtMs: nowMs,
                snoozedUntilMs: nowMs + NOTIFICATION_PROMPT_COOLDOWN_MS,
                retryCount: cooldown.retryCount + 1,
            };
            writePromptCooldown(dismissKey, nextCooldown);
            setCooldown(resolveNotificationPromptCooldown({ nowMs, ...nextCooldown }));
        }
        const permission = classifyNotificationPermissionState({
            browserCapable: typeof window !== "undefined" && "Notification" in window,
            messagingSupported: !needsStandaloneInstall,
            needsStandaloneInstall,
            permission: typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
        });
        trackLifecycle("notification_prompt_dismissed", permission, "dismissed");
        trackLifecycle("notification_prompt_snoozed", permission, "snoozed");
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className="px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4">
            <div className="mx-auto max-w-5xl overflow-hidden rounded-[1.45rem] border border-white/10 bg-[#17171c]/90 shadow-[0_16px_36px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                <div className="relative flex items-start px-3.5 py-3 sm:px-4 sm:py-3.5">
                    <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.9rem] border border-brand-purple/25 bg-brand-purple/12 text-brand-purple">
                                {needsStandaloneInstall ? <Smartphone className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0 pr-6">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
                                    Task Alerts
                                </p>
                                <p className="mt-1 text-sm font-semibold leading-5 text-white">
                                    Never miss a drop or experience!
                                </p>
                                <p className="mt-1 text-[12px] leading-5 text-gray-300">
                                    Drops disappear fast, turn on notifications to make sure you don&apos;t miss out!
                                </p>
                            </div>
                        </div>
                        <div className="mt-3">
                            <button
                                type="button"
                                onClick={() => void handleEnable()}
                                disabled={loading}
                                aria-busy={loading}
                                className="inline-flex min-h-8 items-center justify-center rounded-2xl bg-brand-purple px-4 py-2 text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                            >
                                {loading ? "Please wait" : "Turn on notifications"}
                            </button>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="absolute right-3 top-3 rounded-full border border-white/10 bg-white/5 p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                        aria-label="Dismiss notification prompt"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
