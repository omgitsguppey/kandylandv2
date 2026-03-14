"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowDownLeft, ArrowUpRight, CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { useAuth } from "@/context/AuthContext";
import { trackEvent } from "@/lib/telemetry";
import type { Transaction } from "@/types/db";
import { authFetch } from "@/lib/authFetch";

interface TaskEventRecord {
    id: string;
    type: "assigned" | "started" | "completed" | "failed" | "reminder_sent";
    title: string;
    reward: number;
    progress: number;
    maxProgress: number;
    timestamp: number;
}

type ActivityItem =
    | {
        id: string;
        timestamp: number;
        kind: "transaction";
        transaction: Transaction;
      }
    | {
        id: string;
        timestamp: number;
        kind: "task";
        taskEvent: TaskEventRecord;
      };

function renderTransactionLabel(transaction: Transaction) {
    switch (transaction.type) {
        case "unlock_content":
            return transaction.description || "Unwrapped KandyDrop";
        case "purchase_currency":
            return transaction.description || "Gum Drops added";
        case "admin_adjustment":
            return transaction.description || "Balance updated";
        case "daily_reward":
            return transaction.description || "Daily reward collected";
        default:
            return transaction.description || "Recent activity";
    }
}

function renderTaskEventLabel(taskEvent: TaskEventRecord) {
    if (taskEvent.type === "completed") {
        return `Task complete: ${taskEvent.title}`;
    }

    if (taskEvent.type === "failed") {
        return `Task reset: ${taskEvent.title}`;
    }

    return taskEvent.title;
}

export function RecentActivityFeed() {
    const { user } = useAuth();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            return;
        }

        const userId = user.uid;
        trackEvent("recent_activity_viewed");
        let mounted = true;

        async function fetchRecentActivity() {
            try {
                const response = await authFetch("/api/user/activity");
                const result = await response.json() as {
                    success?: boolean;
                    transactions?: Transaction[];
                    taskEvents?: TaskEventRecord[];
                };

                if (!response.ok || !result.success) {
                    throw new Error("Failed to load recent activity");
                }

                if (!mounted) {
                    return;
                }

                const nextActivities: ActivityItem[] = [];

                (result.transactions || []).forEach((transaction) => {
                    const timestamp = typeof transaction.timestamp === "number"
                        ? transaction.timestamp
                        : Date.now();
                    nextActivities.push({
                        id: transaction.id,
                        timestamp,
                        kind: "transaction",
                        transaction,
                    });
                });

                (result.taskEvents || []).forEach((taskEvent) => {
                    if (taskEvent.type !== "completed" && taskEvent.type !== "failed") {
                        return;
                    }

                    nextActivities.push({
                        id: taskEvent.id,
                        timestamp: taskEvent.timestamp,
                        kind: "task",
                        taskEvent,
                    });
                });

                nextActivities.sort((left, right) => right.timestamp - left.timestamp);
                setActivities(nextActivities.slice(0, 8));
            } catch (error) {
                console.error("Failed to fetch recent activity", error);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        void fetchRecentActivity();

        return () => {
            mounted = false;
        };
    }, [user]);

    if (!user) {
        return null;
    }

    return (
        <div className="glass-panel mt-6 rounded-3xl p-6 lg:mt-8">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                <Activity className="h-5 w-5 text-brand-purple" /> Recent Activity
            </h3>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-purple/50" />
                </div>
            ) : activities.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-500">
                    Your recent unwraps, Gum Drop changes, and task results will appear here.
                </div>
            ) : (
                <div className="space-y-3">
                    {activities.map((item) => {
                        if (item.kind === "transaction") {
                            const isPositive = ["purchase_currency", "daily_reward", "admin_adjustment"].includes(item.transaction.type);
                            return (
                                <div key={item.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-purple/20 text-brand-purple">
                                            {isPositive ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <p className="line-clamp-1 text-sm font-bold text-white">
                                                {renderTransactionLabel(item.transaction)}
                                            </p>
                                            <p className="text-[10px] text-gray-400">
                                                {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={isPositive ? "text-sm font-bold text-brand-purple" : "text-sm font-bold text-white"}>
                                        {isPositive ? "+" : "-"}{item.transaction.amount} GD
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={item.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-3">
                                <div className="flex items-center gap-3">
                                    <div className={item.taskEvent.type === "completed"
                                        ? "flex h-10 w-10 items-center justify-center rounded-xl bg-brand-purple/20 text-brand-purple"
                                        : "flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-gray-300"}>
                                        {item.taskEvent.type === "completed"
                                            ? <CheckCircle2 className="h-5 w-5" />
                                            : <TriangleAlert className="h-5 w-5" />}
                                    </div>
                                    <div>
                                        <p className="line-clamp-1 text-sm font-bold text-white">
                                            {renderTaskEventLabel(item.taskEvent)}
                                        </p>
                                        <p className="text-[10px] text-gray-400">
                                            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                                <div className={item.taskEvent.type === "completed" ? "text-sm font-bold text-brand-purple" : "text-sm font-bold text-gray-400"}>
                                    {item.taskEvent.type === "completed" ? `+${item.taskEvent.reward} GD` : `${item.taskEvent.progress}/${item.taskEvent.maxProgress}`}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
