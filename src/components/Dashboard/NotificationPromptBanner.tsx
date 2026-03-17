"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Smartphone, X } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { getBrowserNotificationState } from "@/lib/firebase-messaging";
import { enableBrowserNotifications } from "@/lib/browser-notification-enrollment";
import { trackEvent } from "@/lib/telemetry";
import { toast } from "sonner";

function getDismissKey(uid: string) {
    return `kandydrops:notification-banner-dismissed:${uid}`;
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

    const dismissKey = userProfile?.uid ? getDismissKey(userProfile.uid) : null;

    useEffect(() => {
        if (typeof window === "undefined" || !dismissKey) {
            setDismissed(false);
            return;
        }

        setDismissed(window.localStorage.getItem(dismissKey) === "1");
    }, [dismissKey]);

    useEffect(() => {
        if (!user || !userProfile || dismissed || hasNotificationsEnabled) {
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
    }, [dismissed, hasNotificationsEnabled, user, userProfile]);

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
            console.error("Failed to enable browser notifications", error);
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
        <div className="sticky top-0 z-40 border-b border-white/10 bg-black/85 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-brand-purple/25 bg-brand-purple/15 text-brand-purple">
                            {needsStandaloneInstall ? <Smartphone className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                        </div>
                        <p className="min-w-0 pt-0.5 text-sm font-semibold leading-6 text-white">
                            Enable notifications so you never miss a drop!
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                        aria-label="Dismiss notification prompt"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex">
                    <button
                        type="button"
                        onClick={() => void handleEnable()}
                        disabled={loading}
                        className="w-full rounded-2xl border border-brand-purple bg-brand-purple px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
                    >
                        {loading ? "Please wait" : needsStandaloneInstall ? "How to enable" : "Enable notifications"}
                    </button>
                </div>
            </div>
        </div>
    );
}
