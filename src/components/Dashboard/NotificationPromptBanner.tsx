"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Smartphone, X } from "lucide-react";
import { arrayUnion, doc, updateDoc } from "firebase/firestore";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase-data";
import { getBrowserNotificationState, requestBrowserNotificationAccess } from "@/lib/firebase-messaging";
import { trackEvent } from "@/lib/telemetry";
import { toast } from "sonner";

const DISMISS_KEY = "kandydrops:notification-banner-dismissed";

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

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    }, []);

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
                || (state.needsStandaloneInstall && state.permission !== "granted");

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
            const result = await requestBrowserNotificationAccess();
            if (!result.granted) {
                toast.info("Browser notifications were not enabled.");
                return;
            }

            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                notificationSettings: {
                    inAppEnabled: userProfile.notificationSettings?.inAppEnabled !== false,
                    browserPushEnabled: true,
                    newDropAlerts: userProfile.notificationSettings?.newDropAlerts !== false,
                    expiringSoonAlerts: userProfile.notificationSettings?.expiringSoonAlerts !== false,
                },
                ...(result.token ? { fcmTokens: arrayUnion(result.token) } : {}),
            });

            setIsVisible(false);
            setDismissed(true);
            window.localStorage.setItem(DISMISS_KEY, "1");
            trackEvent("task_notifications_enabled", {
                source: "prompt_banner",
                messaging_supported: result.state.messagingSupported,
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
        if (typeof window !== "undefined") {
            window.localStorage.setItem(DISMISS_KEY, "1");
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
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-brand-purple/25 bg-brand-purple/15 text-brand-purple">
                        {needsStandaloneInstall ? <Smartphone className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">
                            {needsStandaloneInstall ? "Turn on notifications from your Home Screen" : "Stay on top of live KandyDrops"}
                        </p>
                        <p className="text-xs leading-5 text-gray-400">
                            {needsStandaloneInstall
                                ? "Add KandyDrops to your Home Screen first, then enable browser alerts so you never miss a live unwrap window."
                                : "Enable browser alerts for daily deadlines, live drops, and expiring KandyDrops."}
                        </p>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={() => void handleEnable()}
                        disabled={loading}
                        className="rounded-full border border-brand-purple bg-brand-purple px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                        {loading ? "Please wait" : needsStandaloneInstall ? "How to enable" : "Enable"}
                    </button>
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                        aria-label="Dismiss notification prompt"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
