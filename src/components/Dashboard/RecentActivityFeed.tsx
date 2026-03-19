"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Activity,
    ArrowDownLeft,
    ArrowUpRight,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Loader2,
    Search,
    TriangleAlert,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { useAuth } from "@/context/AuthContext";
import { ReportBugButton } from "@/components/Feedback/ReportBugButton";
import { recordClientDiagnostic } from "@/lib/client-diagnostics";
import { trackEvent } from "@/lib/telemetry";
import type { Transaction } from "@/types/db";
import { authFetch } from "@/lib/authFetch";
import { ACTIVITY_SYNC_EVENT } from "@/lib/activity-sync";
import { USER_RUNTIME_COLLECTION } from "@/lib/user-runtime";

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
        label: string;
        transaction: Transaction;
      }
    | {
        id: string;
        timestamp: number;
        kind: "task";
        label: string;
        taskEvent: TaskEventRecord;
      };

const ITEMS_PER_PAGE = 5;

function renderTransactionLabel(transaction: Transaction) {
    switch (transaction.type) {
        case "unlock_content":
            return transaction.description || "Unwrapped KandyDrop";
        case "purchase_currency":
            return transaction.description || "Gum Drops added";
        case "admin_adjustment":
            return transaction.description || "Balance updated";
        case "daily_reward":
            if (transaction.rewardSource === "check_in") {
                return transaction.description || "Daily check-in reward collected";
            }
            if (transaction.rewardSource === "task") {
                return transaction.description || "Daily task reward collected";
            }
            return transaction.description || "Daily reward collected";
        case "referral_bonus":
            return transaction.description || "Referral bonus earned";
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
    const router = useRouter();
    const [expanded, setExpanded] = useState(false);
    const [summaryActivity, setSummaryActivity] = useState<ActivityItem | null>(null);
    const [historyActivities, setHistoryActivities] = useState<ActivityItem[]>([]);
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const summaryEtagRef = useRef<string | null>(null);
    const historyEtagRef = useRef<string | null>(null);
    const summaryInFlightRef = useRef(false);
    const historyInFlightRef = useRef(false);

    useEffect(() => {
        if (!user) {
            setSummaryActivity(null);
            setHistoryActivities([]);
            setLoadingSummary(false);
            setLoadingHistory(false);
            setHistoryLoaded(false);
            return;
        }

        setLoadingSummary(true);
        trackEvent("recent_activity_viewed");
        let mounted = true;
        let unsubscribeUserRuntime: (() => void) | undefined;
        let sawUserRuntimeSnapshot = false;

        async function fetchActivity(view: "summary" | "history") {
            const inFlightRef = view === "summary" ? summaryInFlightRef : historyInFlightRef;
            const etagRef = view === "summary" ? summaryEtagRef : historyEtagRef;

            if (inFlightRef.current) {
                return;
            }

            inFlightRef.current = true;
            try {
                const headers = new Headers();
                if (etagRef.current) {
                    headers.set("If-None-Match", etagRef.current);
                }

                const response = await authFetch(`/api/user/activity?view=${view}`, { headers });
                if (response.status === 304) {
                    if (view === "history" && mounted) {
                        setHistoryLoaded(true);
                    }
                    return;
                }

                const result = await response.json() as {
                    success?: boolean;
                    activities?: ActivityItem[];
                };

                if (!response.ok || !result.success) {
                    throw new Error("Failed to load recent activity");
                }

                if (!mounted) {
                    return;
                }

                etagRef.current = response.headers.get("etag");
                const nextActivities = result.activities || [];

                if (view === "summary") {
                    setSummaryActivity(nextActivities[0] ?? null);
                    return;
                }

                setHistoryActivities(nextActivities);
                setHistoryLoaded(true);
            } catch (error) {
                console.error("Failed to fetch recent activity", error);
                recordClientDiagnostic("cache", "Recent activity refresh failed", {
                    userId: user?.uid ?? "",
                    view,
                    message: error instanceof Error ? error.message : String(error),
                });
            } finally {
                inFlightRef.current = false;
                if (!mounted) {
                    return;
                }

                if (view === "summary") {
                    setLoadingSummary(false);
                } else {
                    setLoadingHistory(false);
                }
            }
        }

        const subscribeToUserRuntime = async () => {
            try {
                const [{ doc, onSnapshot }, { db }] = await Promise.all([
                    import("firebase/firestore"),
                    import("@/lib/firebase-data"),
                ]);

                if (!mounted) {
                    return;
                }

                unsubscribeUserRuntime = onSnapshot(
                    doc(db, USER_RUNTIME_COLLECTION, user.uid),
                    (snapshot) => {
                        if (!sawUserRuntimeSnapshot) {
                            sawUserRuntimeSnapshot = true;
                            return;
                        }

                        const data = snapshot.data() as { activityVersion?: number; tasksVersion?: number } | undefined;
                        if (typeof data?.activityVersion === "number" || typeof data?.tasksVersion === "number") {
                            void fetchActivity("summary");
                            if (expanded || historyLoaded) {
                                void fetchActivity("history");
                            }
                        }
                    },
                    (error) => {
                        recordClientDiagnostic("realtime", "Recent activity runtime subscription failed", {
                            userId: user.uid,
                            message: error.message,
                        });
                    },
                );
            } catch (error) {
                recordClientDiagnostic("firebase", "Recent activity runtime setup failed", {
                    userId: user.uid,
                    message: error instanceof Error ? error.message : String(error),
                });
            }
        };

        const refreshRecentActivity = () => {
            void fetchActivity("summary");
            if (expanded || historyLoaded) {
                void fetchActivity("history");
            }
        };
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                refreshRecentActivity();
            }
        };

        void fetchActivity("summary");
        void subscribeToUserRuntime();
        const intervalId = window.setInterval(() => {
            if (document.visibilityState === "visible") {
                refreshRecentActivity();
            }
        }, 90_000);
        window.addEventListener("focus", refreshRecentActivity);
        window.addEventListener(ACTIVITY_SYNC_EVENT, refreshRecentActivity);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            mounted = false;
            window.clearInterval(intervalId);
            window.removeEventListener("focus", refreshRecentActivity);
            window.removeEventListener(ACTIVITY_SYNC_EVENT, refreshRecentActivity);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            if (unsubscribeUserRuntime) {
                unsubscribeUserRuntime();
            }
        };
    }, [expanded, historyLoaded, user]);

    useEffect(() => {
        if (!expanded || !user || historyLoaded || loadingHistory) {
            return;
        }

        setLoadingHistory(true);
        void (async () => {
            try {
                const headers = new Headers();
                if (historyEtagRef.current) {
                    headers.set("If-None-Match", historyEtagRef.current);
                }

                const response = await authFetch("/api/user/activity?view=history", { headers });
                if (response.status === 304) {
                    setHistoryLoaded(true);
                    return;
                }

                const result = await response.json() as {
                    success?: boolean;
                    activities?: ActivityItem[];
                };

                if (!response.ok || !result.success) {
                    throw new Error("Failed to load full activity history");
                }

                historyEtagRef.current = response.headers.get("etag");
                setHistoryActivities(result.activities || []);
                setHistoryLoaded(true);
            } catch (error) {
                console.error("Failed to load full activity history", error);
                recordClientDiagnostic("cache", "Recent activity history refresh failed", {
                    userId: user.uid,
                    message: error instanceof Error ? error.message : String(error),
                });
            } finally {
                setLoadingHistory(false);
            }
        })();
    }, [expanded, historyLoaded, loadingHistory, user]);

    useEffect(() => {
        if (!expanded) {
            setSearchValue("");
            setCurrentPage(1);
        }
    }, [expanded]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchValue]);

    const filteredHistory = useMemo(() => {
        const normalizedQuery = searchValue.trim().toLowerCase();
        if (!normalizedQuery) {
            return historyActivities;
        }

        return historyActivities.filter((activity) => {
            const searchableText = [
                activity.label,
                activity.kind === "transaction"
                    ? activity.transaction.description
                    : activity.taskEvent.title,
            ].join(" ").toLowerCase();

            return searchableText.includes(normalizedQuery);
        });
    }, [historyActivities, searchValue]);

    const totalPages = Math.max(1, Math.ceil(filteredHistory.length / ITEMS_PER_PAGE));

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const paginatedActivities = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredHistory.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [currentPage, filteredHistory]);

    function renderActivityItem(item: ActivityItem) {
        if (item.kind === "transaction") {
            const isPositive = ["purchase_currency", "daily_reward", "admin_adjustment", "referral_bonus"].includes(item.transaction.type);
            return (
                <div key={item.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-purple/20 text-brand-purple">
                            {isPositive ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0">
                            <p className="line-clamp-1 text-sm font-bold text-white">
                                {item.label || renderTransactionLabel(item.transaction)}
                            </p>
                            <p className="text-[10px] text-gray-400">
                                {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                            </p>
                        </div>
                    </div>
                    <div className={isPositive ? "shrink-0 text-sm font-bold text-brand-purple" : "shrink-0 text-sm font-bold text-white"}>
                        {isPositive ? "+" : "-"}{item.transaction.amount} GD
                    </div>
                </div>
            );
        }

        return (
            <div key={item.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div className={item.taskEvent.type === "completed"
                        ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-purple/20 text-brand-purple"
                        : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-gray-300"}>
                        {item.taskEvent.type === "completed"
                            ? <CheckCircle2 className="h-5 w-5" />
                            : <TriangleAlert className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-bold text-white">
                            {item.label || renderTaskEventLabel(item.taskEvent)}
                        </p>
                        <p className="text-[10px] text-gray-400">
                            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                        </p>
                    </div>
                </div>
                <div className={item.taskEvent.type === "completed" ? "shrink-0 text-sm font-bold text-brand-purple" : "shrink-0 text-sm font-bold text-gray-400"}>
                    {item.taskEvent.type === "completed" ? `+${item.taskEvent.reward} GD` : `${item.taskEvent.progress}/${item.taskEvent.maxProgress}`}
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="glass-panel mt-6 rounded-3xl p-6 lg:mt-8">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                        <Activity className="h-5 w-5 text-brand-purple" /> Recent Activity
                    </h3>
                    <p className="mt-1 text-xs text-gray-400">
                        {expanded ? "Search and browse your full activity without leaving the dashboard." : "Latest update from your account."}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        const nextExpanded = !expanded;
                        setExpanded(nextExpanded);
                        trackEvent("recent_activity_viewed", {
                            mode: nextExpanded ? "expanded" : "collapsed",
                        });
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
                    aria-expanded={expanded}
                    aria-label={expanded ? "Collapse recent activity" : "Expand recent activity"}
                >
                    {expanded ? "Collapse" : "View all"}
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
            </div>

            {loadingSummary ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-purple/50" />
                </div>
            ) : !summaryActivity && !historyActivities.length ? (
                <div className="py-6 text-center">
                    <p className="text-sm text-gray-500">
                        Your recent unwraps, Gum Drop changes, and task results will appear here.
                    </p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => {
                                trackEvent("navigation_click", {
                                    destination: "/drops",
                                    source: "recent_activity_empty",
                                });
                                router.push("/drops");
                            }}
                            className="rounded-2xl border border-brand-purple bg-brand-purple px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                        >
                            Unwrap now
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                trackEvent("navigation_click", {
                                    destination: "/experiences",
                                    source: "recent_activity_empty",
                                });
                                router.push("/experiences");
                            }}
                            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
                        >
                            Open Experiences
                        </button>
                    </div>
                    <div className="mt-4 flex justify-center">
                        <ReportBugButton context="recent-activity-empty" />
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {expanded ? (
                        <>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="search"
                                    value={searchValue}
                                    onChange={(event) => setSearchValue(event.target.value)}
                                    placeholder="Search activity"
                                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-brand-purple/60"
                                />
                            </div>

                            <div className="flex items-center justify-between gap-3 px-1 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-500">
                                <span>{filteredHistory.length} result{filteredHistory.length === 1 ? "" : "s"}</span>
                                <span>5 per page</span>
                            </div>

                            {loadingHistory && !historyLoaded ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-brand-purple/50" />
                                </div>
                            ) : paginatedActivities.length === 0 ? (
                                <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-8 text-center text-sm text-gray-400">
                                    {searchValue.trim()
                                        ? "No activity matches your search yet."
                                        : "No activity has been recorded yet."}
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-3">
                                        {paginatedActivities.map(renderActivityItem)}
                                    </div>

                                    <div className="flex items-center justify-between gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                            disabled={currentPage === 1}
                                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                            Previous
                                        </button>
                                        <span className="text-xs font-medium text-gray-400">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                                            disabled={currentPage >= totalPages}
                                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </>
                    ) : summaryActivity ? (
                        <>
                            <div className="rounded-2xl border border-brand-purple/20 bg-gradient-to-r from-brand-purple/10 to-white/5 p-3">
                                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-purple/80">
                                    Latest event
                                </p>
                                {renderActivityItem(summaryActivity)}
                            </div>
                        </>
                    ) : null}
                </div>
            )}
        </div>
    );
}
