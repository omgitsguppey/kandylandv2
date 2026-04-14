"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Smartphone, X } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { getBrowserNotificationState } from "@/lib/firebase-messaging";
import { enableBrowserNotifications } from "@/lib/browser-notification-enrollment";
import { trackEvent } from "@/lib/telemetry";
import { toast } from "sonner";
import { hashIdentifier } from "@/hooks/client-runtime";
import { reportClientIssue } from "@/lib/client-error-reporting";

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

export function NotificationPromptBanner() {
    const { user, userProfile } = useAuth();
    const [isVisible, setIsVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [needsStandaloneInstall, setNeedsStandaloneInstall] = useState(false);

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
        setDismissed(window.localStorage.getItem(dismissKey) === "1");
    }, [dismissKey, isCheckingKey]);

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

            const shouldShow = state.permission === "default"
                || (state.needsStandaloneInstall && state.permission !== "granted")
                || (state.permission === "granted" && state.messagingSupported && !hasNotificationsEnabled);

            if (!shouldShow || state.permission === "denied") {
                setIsVisible(false);
                return;
            }

            window.setTimeout(() => {
                if (!cancelled) {
                    setIsVisible(true);
                    trackEvent("notification_prompt_banner_viewed", {
                        requires_pwa_install: state.needsStandaloneInstall,
                    });
                }
            }, 2500);
        }

        void evaluateBanner();

        return () => {
            cancelled = true;
        };
    }, [dismissed, hasNotificationsEnabled, isCheckingKey, user, userProfile]);

    const handleEnable = async () => {
        if (!user || !userProfile) {
            return;
        }

        if (needsStandaloneInstall) {
            toast.info("Add KandyDrops to your Home Screen, then open it from there to turn on browser notifications on iPhone.");
            trackEvent("notification_prompt_install_help_opened");
            return;
        }

        setLoading(true);
        try {
            const result = await enableBrowserNotifications(userProfile);
            if (result.status === "not_granted") {
                toast.info("Browser notifications were not enabled.");
                return;
            }
            if (result.status === "failed") {
                throw new Error(result.message);
            }

            setIsVisible(false);
            setDismissed(true);
            if (dismissKey) {
                window.localStorage.setItem(dismissKey, "1");
            }
            trackEvent("task_notifications_enabled", {
                source: "prompt_banner",
                messaging_supported: result.messagingSupported,
            });
            toast.success("Browser notifications enabled.");
        } catch (error) {
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
            window.localStorage.setItem(dismissKey, "1");
        }
        trackEvent("notification_prompt_banner_dismissed", {
            requires_pwa_install: needsStandaloneInstall,
        });
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
