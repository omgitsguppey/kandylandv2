"use client";

import { useEffect, useRef } from "react";

import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import { getCSTDayBoundaries, isSameCSTDay } from "@/lib/timezone";
import { onNotificationMessage, showBrowserNotification } from "@/lib/firebase-messaging";
import { trackEvent } from "@/lib/telemetry";

const ONE_HOUR_MS = 60 * 60 * 1000;
const REMINDER_TITLE = "You're almost out of time!";
const REMINDER_MESSAGE = "Finish your tasks so you don't lose your Kandy!";

export function NotificationRuntimeBridge() {
    const { user, userProfile } = useAuth();
    const reminderKeyRef = useRef<string | null>(null);
    const reminderSyncKeyRef = useRef<string | null>(null);

    useEffect(() => {
        if (!user || !userProfile || userProfile.notificationSettings?.browserPushEnabled !== true) {
            return;
        }

        onNotificationMessage((payload: any) => {
            const title = payload?.notification?.title;
            const body = payload?.notification?.body;
            if (!title || !body) {
                return;
            }

            void showBrowserNotification(title, body, payload?.data?.url || "/dashboard");
        });
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
        const syncReminder = async () => {
            if (reminderSyncKeyRef.current === reminderKey) {
                return;
            }

            reminderSyncKeyRef.current = reminderKey;
            await authFetch("/api/tasks/reminders/sync", { method: "POST" }).catch((error) => {
                console.error("Failed to sync task reminder", error);
            });
        };

        const triggerReminder = async () => {
            if (reminderKeyRef.current === reminderKey) {
                return;
            }

            reminderKeyRef.current = reminderKey;
            if (userProfile.notificationSettings?.browserPushEnabled === true) {
                await showBrowserNotification(REMINDER_TITLE, REMINDER_MESSAGE, "/experiences");
                trackEvent("daily_deadline_browser_notification_shown", {
                    unfinished_tasks: unfinishedTasks.length,
                    pending_checkin: pendingCheckIn,
                });
            }
            await syncReminder();
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
            return;
        }

        if (reminderAt <= nowMs) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            void triggerReminder();
        }, reminderAt - nowMs);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [
        user,
        userProfile,
        userProfile?.dailyTasksState?.lastDeadlineReminderAt,
        userProfile?.dailyTasksState?.nextRefreshMs,
        userProfile?.dailyTasksState?.tasks,
        userProfile?.lastCheckIn,
        userProfile?.notificationSettings?.browserPushEnabled,
    ]);

    return null;
}
