"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BellRing, Clock3 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { CLIENT_RUNTIME_EVENTS, dispatchClientRuntimeEvent } from "@/hooks/client-runtime";
import { authFetch } from "@/lib/authFetch";
import { reportRealtimeIssue } from "@/lib/client-error-reporting";
import { getCSTDayBoundaries, isSameCSTDay } from "@/lib/timezone";
import { onNotificationMessage, showBrowserNotification } from "@/lib/firebase-messaging";
import { trackEvent } from "@/lib/telemetry";

const ONE_HOUR_MS = 60 * 60 * 1000;
const REMINDER_TITLE = "You're almost out of time!";
const REMINDER_MESSAGE = "Finish your tasks so you don't lose your Kandy!";
const TASK_REMINDER_TOAST_PREFIX = "kandydrops-task-reminder:";

function buildReminderSummary(unfinishedTasks: number, pendingCheckIn: boolean) {
    if (pendingCheckIn && unfinishedTasks > 0) {
        return {
            title: "1 hour left to finish today",
            message: `${unfinishedTasks} ${unfinishedTasks === 1 ? "task is" : "tasks are"} still open and your daily check-in reward also expires soon.`,
            destination: "/experiences#daily-tasks",
            ctaLabel: "Open tasks",
        };
    }

    if (pendingCheckIn) {
        return {
            title: "Your daily reward expires soon",
            message: "Check in now so you keep today's reward before the clock resets.",
            destination: "/experiences#daily-reward",
            ctaLabel: "Open rewards",
        };
    }

    return {
        title: "Daily tasks are about to expire",
        message: `${unfinishedTasks} ${unfinishedTasks === 1 ? "task still needs" : "tasks still need"} attention before rewards reset.`,
        destination: "/experiences#daily-tasks",
        ctaLabel: "Open tasks",
    };
}

export function NotificationRuntimeBridge() {
    const router = useRouter();
    const { user, userProfile } = useAuth();
    const reminderKeyRef = useRef<string | null>(null);
    const reminderSyncKeyRef = useRef<string | null>(null);
    const reminderToastKeyRef = useRef<string | null>(null);

    useEffect(() => {
        if (!user || !userProfile || userProfile.notificationSettings?.browserPushEnabled !== true) {
            return;
        }

        const unsubscribe = onNotificationMessage((payload: any) => {
            const title = payload?.notification?.title;
            const body = payload?.notification?.body;
            if (!title || !body) {
                return;
            }

            dispatchClientRuntimeEvent(CLIENT_RUNTIME_EVENTS.notificationsSync);
            void showBrowserNotification(title, body, payload?.data?.url || "/dashboard");
        });

        return () => {
            unsubscribe();
        };
    }, [user, userProfile, userProfile?.notificationSettings?.browserPushEnabled]);

    useEffect(() => {
        if (!user || !userProfile) {
            return;
        }

        const tasks = userProfile.dailyTasksState?.tasks ?? [];
        const unfinishedTasks = tasks.filter((task) => !task.claimed);
        const pendingCheckIn = !isSameCSTDay(Number(userProfile.lastCheckIn ?? 0), Date.now());
        const nextRefreshMs = userProfile.dailyTasksState?.nextRefreshMs || getCSTDayBoundaries(Date.now()).endOfDay;
        const alreadySentToday = isSameCSTDay(
            Number(userProfile.dailyTasksState?.lastDeadlineReminderAt ?? 0),
            Date.now(),
        );
        const notificationsEnabled = userProfile.notificationSettings?.inAppEnabled !== false
            || userProfile.notificationSettings?.browserPushEnabled === true;

        if ((!pendingCheckIn && unfinishedTasks.length === 0) || !notificationsEnabled) {
            return;
        }

        const reminderKey = `${getCSTDayBoundaries(nextRefreshMs - 1).startOfDay}:${user.uid}`;
        const showInAppReminder = () => {
            if (userProfile.notificationSettings?.inAppEnabled === false) {
                return;
            }

            const summary = buildReminderSummary(unfinishedTasks.length, pendingCheckIn);
            const toastId = `${TASK_REMINDER_TOAST_PREFIX}${reminderKey}`;
            if (reminderToastKeyRef.current === toastId) {
                return;
            }

            reminderToastKeyRef.current = toastId;
            trackEvent("daily_deadline_in_app_reminder_shown", {
                unfinished_tasks: unfinishedTasks.length,
                pending_checkin: pendingCheckIn,
            });

            toast.custom((activeToastId) => (
                <div className="pointer-events-auto w-[min(28rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.65rem] border border-white/10 bg-[#17171c]/96 p-3.5 text-white shadow-[0_22px_54px_rgba(0,0,0,0.36)] backdrop-blur-xl">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] border border-amber-300/20 bg-amber-400/12 text-amber-200">
                            {pendingCheckIn ? <BellRing className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
                                Task Reminder
                            </p>
                            <h3 className="mt-1 text-sm font-bold leading-5 text-white">{summary.title}</h3>
                            <p className="mt-1 text-[12px] leading-5 text-gray-300">
                                {summary.message}
                            </p>
                        </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                        <button
                            type="button"
                            className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/15 bg-white px-3.5 py-2 text-xs font-bold text-black transition-opacity hover:opacity-90"
                            onClick={() => {
                                trackEvent("daily_deadline_in_app_reminder_opened", {
                                    unfinished_tasks: unfinishedTasks.length,
                                    pending_checkin: pendingCheckIn,
                                });
                                toast.dismiss(activeToastId);
                                router.push(summary.destination);
                            }}
                        >
                            {summary.ctaLabel}
                            <ArrowUpRight className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            className="inline-flex min-h-9 items-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
                            onClick={() => {
                                trackEvent("daily_deadline_in_app_reminder_dismissed", {
                                    unfinished_tasks: unfinishedTasks.length,
                                    pending_checkin: pendingCheckIn,
                                });
                                toast.dismiss(activeToastId);
                            }}
                        >
                            Later
                        </button>
                    </div>
                </div>
            ), {
                id: toastId,
                duration: 12000,
            });
        };

        const syncReminder = async () => {
            if (reminderSyncKeyRef.current === reminderKey) {
                return false;
            }

            reminderSyncKeyRef.current = reminderKey;
            return authFetch("/api/tasks/reminders/sync", { method: "POST" })
                .then(async (response) => {
                    if (!response.ok) {
                        throw new Error("Reminder sync failed");
                    }

                    const payload = await response.json().catch(() => ({}));
                    return payload?.sent === true;
                })
                .catch((error) => {
                    reminderSyncKeyRef.current = null;
                    reportRealtimeIssue("task reminder sync", error, {
                        userId: user.uid,
                        reminderKey,
                    });
                    return false;
                });
        };

        const triggerReminder = async () => {
            if (reminderKeyRef.current === reminderKey) {
                return;
            }

            const sent = await syncReminder();
            if (!sent) {
                return;
            }

            reminderKeyRef.current = reminderKey;
            dispatchClientRuntimeEvent(CLIENT_RUNTIME_EVENTS.notificationsSync);
            showInAppReminder();
            if (userProfile.notificationSettings?.browserPushEnabled === true) {
                await showBrowserNotification(REMINDER_TITLE, REMINDER_MESSAGE, "/experiences");
                trackEvent("daily_deadline_browser_notification_shown", {
                    unfinished_tasks: unfinishedTasks.length,
                    pending_checkin: pendingCheckIn,
                });
            }
        };

        if (alreadySentToday) {
            reminderKeyRef.current = reminderKey;
            reminderSyncKeyRef.current = reminderKey;
            return;
        }

        const nowMs = Date.now();
        const reminderAt = nextRefreshMs - ONE_HOUR_MS;
        if (nowMs >= reminderAt && nowMs < nextRefreshMs) {
            void triggerReminder();
        }

        const syncIfVisible = () => {
            if (document.visibilityState === "visible") {
                void triggerReminder();
            }
        };

        window.addEventListener("focus", syncIfVisible);
        document.addEventListener("visibilitychange", syncIfVisible);

        const intervalId = window.setInterval(() => {
            void triggerReminder();
        }, 60_000);

        if (reminderAt <= nowMs) {
            return () => {
                window.clearInterval(intervalId);
                window.removeEventListener("focus", syncIfVisible);
                document.removeEventListener("visibilitychange", syncIfVisible);
            };
        }

        const timeoutId = window.setTimeout(() => {
            void triggerReminder();
        }, reminderAt - nowMs);

        return () => {
            window.clearTimeout(timeoutId);
            window.clearInterval(intervalId);
            window.removeEventListener("focus", syncIfVisible);
            document.removeEventListener("visibilitychange", syncIfVisible);
        };
    }, [
        router,
        user,
        userProfile,
        userProfile?.dailyTasksState?.lastDeadlineReminderAt,
        userProfile?.dailyTasksState?.nextRefreshMs,
        userProfile?.dailyTasksState?.tasks,
        userProfile?.lastCheckIn,
        userProfile?.notificationSettings?.inAppEnabled,
        userProfile?.notificationSettings?.browserPushEnabled,
    ]);

    return null;
}
