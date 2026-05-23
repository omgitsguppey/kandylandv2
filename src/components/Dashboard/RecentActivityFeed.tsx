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
import { reportClientIssue, buildFirestoreClientIssueDetail } from "@/lib/client-error-reporting";
import { createAutoHealingObserver } from "@/lib/self-healing";
import { trackEvent } from "@/lib/telemetry";
import type { Transaction } from "@/types/db";
import { authFetch } from "@/lib/authFetch";
import { ACTIVITY_SYNC_EVENT } from "@/lib/activity-sync";
import { USER_RUNTIME_COLLECTION } from "@/lib/platform-config";
import { getTransactionDisplayLabel } from "@/lib/transaction-normalizers";

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

type ActivityView = "summary" | "history";
type AuthenticatedUser = ReturnType<typeof useAuth>["user"];

interface RecentActivityResponse {
    success?: boolean;
    activities?: ActivityItem[];
}

interface RecentActivityFetchResult {
    activities: ActivityItem[];
    etag: string | null;
    notModified: boolean;
}

interface RecentActivityState {
    currentPage: number;
    historyActivities: ActivityItem[];
    loadingHistory: boolean;
    loadingSummary: boolean;
    paginatedActivities: ActivityItem[];
    searchValue: string;
    setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
    setSearchValue: React.Dispatch<React.SetStateAction<string>>;
    summaryActivity: ActivityItem | null;
    totalPages: number;
}

const ITEMS_PER_PAGE = 5;
const POSITIVE_TRANSACTION_TYPES = new Set<Transaction["type"]>([
    "purchase_currency",
    "daily_reward",
    "admin_adjustment",
    "referral_bonus",
    "onboarding_reward",
]);

function renderTransactionLabel(transaction: Transaction) {
    return getTransactionDisplayLabel(transaction);
}

function renderTaskEventLabel(taskEvent: TaskEventRecord) {
    if (taskEvent.type === "assigned") {
        return `Task ready: ${taskEvent.title}`;
    }

    if (taskEvent.type === "started") {
        return `Task in progress: ${taskEvent.title}`;
    }

    if (taskEvent.type === "completed") {
        return `Task complete: ${taskEvent.title}`;
    }

    if (taskEvent.type === "failed") {
        return `Task reset: ${taskEvent.title}`;
    }

    return `Task reminder: ${taskEvent.title}`;
}

function getActivitySearchText(activity: ActivityItem) {
    return [
        activity.label,
        activity.kind === "transaction"
            ? activity.transaction.description
            : activity.taskEvent.title,
    ].join(" ").toLowerCase();
}

function getActivityRelativeTime(timestamp: number) {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}

async function fetchRecentActivity(view: ActivityView, etag: string | null) {
    const headers = new Headers();
    if (etag) {
        headers.set("If-None-Match", etag);
    }

    const response = await authFetch(`/api/user/activity?view=${view}`, { headers });
    if (response.status === 304) {
        return {
            activities: [],
            etag,
            notModified: true,
        } satisfies RecentActivityFetchResult;
    }

    const result = await response.json() as RecentActivityResponse;
    if (!response.ok || !result.success) {
        throw new Error(`Failed to load ${view === "summary" ? "recent activity" : "full activity history"}`);
    }

    return {
        activities: result.activities || [],
        etag: response.headers.get("etag"),
        notModified: false,
    } satisfies RecentActivityFetchResult;
}

function reportRecentActivityFailure(
    category: "cache" | "firebase" | "realtime",
    message: string,
    userId: string,
    error: unknown,
    extra: Record<string, string> = {},
) {
    reportClientIssue({
        channel: category,
        message,
        error,
        detail: {
            userId,
            ...extra,
        },
    });
}

function ActivityFeedItem({ item }: { item: ActivityItem }) {
    if (item.kind === "transaction") {
        const isPositive = POSITIVE_TRANSACTION_TYPES.has(item.transaction.type);

        return (
            <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-purple/20 text-brand-purple">
                        {isPositive ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-bold text-white">
                            {item.label || renderTransactionLabel(item.transaction)}
                        </p>
                        <p className="text-[10px] text-gray-400">
                            {getActivityRelativeTime(item.timestamp)}
                        </p>
                    </div>
                </div>
                <div className={isPositive ? "shrink-0 text-sm font-bold text-brand-purple" : "shrink-0 text-sm font-bold text-white"}>
                    {isPositive ? "+" : "-"}{item.transaction.amount} GD
                </div>
            </div>
        );
    }

    const completed = item.taskEvent.type === "completed";
    const failed = item.taskEvent.type === "failed";
    const neutral = !completed && !failed;
    const statusLabel = item.taskEvent.type === "assigned"
        ? "Ready"
        : item.taskEvent.type === "started"
            ? `${item.taskEvent.progress}/${item.taskEvent.maxProgress || 1}`
            : item.taskEvent.type === "reminder_sent"
                ? "Reminder"
                : failed
                    ? "Reset"
                    : `+${item.taskEvent.reward} GD`;

    return (
        <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-3">
            <div className="flex min-w-0 items-center gap-3">
                <div className={completed
                    ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-purple/20 text-brand-purple"
                    : neutral
                        ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-gray-200"
                        : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-gray-300"}>
                    {completed
                        ? <CheckCircle2 className="h-5 w-5" />
                        : neutral
                            ? <Activity className="h-5 w-5" />
                            : <TriangleAlert className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-bold text-white">
                        {item.label || renderTaskEventLabel(item.taskEvent)}
                    </p>
                    <p className="text-[10px] text-gray-400">
                        {getActivityRelativeTime(item.timestamp)}
                    </p>
                </div>
            </div>
            <div className={completed
                ? "shrink-0 text-sm font-bold text-brand-purple"
                : neutral
                    ? "shrink-0 text-xs font-bold uppercase tracking-[0.14em] text-gray-300"
                    : "shrink-0 text-xs font-bold uppercase tracking-[0.14em] text-gray-400"}>
                {statusLabel}
            </div>
        </div>
    );
}

interface EmptyStateProps {
    onOpenExperiences: () => void;
    onUnwrapNow: () => void;
}

function RecentActivityEmptyState({ onOpenExperiences, onUnwrapNow }: EmptyStateProps) {
    return (
        <div className="py-6 text-center">
            <p className="text-sm text-gray-500">
                Your recent unlocks, Gum Drop changes, and task history will appear here.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                    type="button"
                    onClick={onUnwrapNow}
                    className="rounded-2xl border border-brand-purple bg-brand-purple px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                >
                    Unwrap now
                </button>
                <button
                    type="button"
                    onClick={onOpenExperiences}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
                >
                    Open Experiences
                </button>
            </div>
            <div className="mt-4 flex justify-center">
                <ReportBugButton context="recent-activity-empty" />
            </div>
        </div>
    );
}

function RecentActivitySummary({ item }: { item: ActivityItem }) {
    return (
        <div className="rounded-2xl border border-brand-purple/20 bg-gradient-to-r from-brand-purple/10 to-white/5 p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-purple/80">
                Latest event
            </p>
            <ActivityFeedItem item={item} />
        </div>
    );
}

interface ExpandedActivityViewProps {
    activities: ActivityItem[];
    currentPage: number;
    historyError: boolean;
    loadingHistory: boolean;
    onNextPage: () => void;
    onPreviousPage: () => void;
    onSearchChange: (value: string) => void;
    searchValue: string;
    totalPages: number;
}

function ExpandedActivityView({
    activities,
    currentPage,
    historyError,
    loadingHistory,
    onNextPage,
    onPreviousPage,
    onSearchChange,
    searchValue,
    totalPages,
}: ExpandedActivityViewProps) {
    return (
        <>
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                    type="search"
                    value={searchValue}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder="Search activity"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-brand-purple/60"
                />
            </div>

            <div className="flex items-center justify-between gap-3 px-1 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-500">
                <span>{activities.length} result{activities.length === 1 ? "" : "s"}</span>
                <span>5 per page</span>
            </div>

            {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-purple/50" />
                </div>
            ) : historyError && activities.length === 0 ? (
                <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-8 text-center text-sm text-gray-400">
                    <TriangleAlert className="mx-auto mb-2 h-6 w-6 opacity-60" />
                    We couldn&apos;t load your full history right now.
                </div>
            ) : activities.length === 0 ? (
                <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-8 text-center text-sm text-gray-400">
                    {searchValue.trim()
                        ? "No activity matches your search yet."
                        : "No activity has been recorded yet."}
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        {activities.map((activity) => (
                            <ActivityFeedItem key={activity.id} item={activity} />
                        ))}
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onPreviousPage}
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
                            onClick={onNextPage}
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
    );
}

function useRecentActivityState(user: AuthenticatedUser, userId: string | null, expanded: boolean): RecentActivityState & { historyError: boolean } {
    const [summaryActivity, setSummaryActivity] = useState<ActivityItem | null>(null);
    const [historyActivities, setHistoryActivities] = useState<ActivityItem[]>([]);
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const [historyError, setHistoryError] = useState(false);
    const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
    const [searchValue, setSearchValue] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const summaryEtagRef = useRef<string | null>(null);
    const historyEtagRef = useRef<string | null>(null);
    const summaryInFlightRef = useRef(false);
    const historyInFlightRef = useRef(false);
    const trackedSummaryViewRef = useRef<string | null>(null);
    const expandedRef = useRef(expanded);
    expandedRef.current = expanded;
    const historyLoadedRef = useRef(historyLoaded);
    historyLoadedRef.current = historyLoaded;

    useEffect(() => {
        if (!userId) {
            trackedSummaryViewRef.current = null;
            return;
        }

        if (trackedSummaryViewRef.current === userId) {
            return;
        }

        trackedSummaryViewRef.current = userId;
        trackEvent("recent_activity_viewed", {
            mode: "summary",
        });
    }, [userId]);

    useEffect(() => {
        summaryEtagRef.current = null;
        historyEtagRef.current = null;
        summaryInFlightRef.current = false;
        historyInFlightRef.current = false;
        setSummaryActivity(null);
        setHistoryActivities([]);
        setHistoryLoaded(false);
        setLoadedForUserId(null);

        if (!user || !userId) {
            setLoadingSummary(false);
            setLoadingHistory(false);
            return;
        }

        const currentUserId = userId;
        setLoadingSummary(true);
        let cancelled = false;
        let unsubscribeUserRuntime: (() => void) | undefined;
        let sawUserRuntimeSnapshot = false;

        async function refreshActivity(view: ActivityView) {
            const inFlightRef = view === "summary" ? summaryInFlightRef : historyInFlightRef;
            const etagRef = view === "summary" ? summaryEtagRef : historyEtagRef;

            if (inFlightRef.current) {
                return;
            }

            inFlightRef.current = true;
            try {
                const result = await fetchRecentActivity(view, etagRef.current);
                if (cancelled) {
                    return;
                }

                if (result.notModified) {
                    setLoadedForUserId(currentUserId);
                    if (view === "history") {
                        setHistoryLoaded(true);
                    }
                    return;
                }

                etagRef.current = result.etag;
                if (view === "summary") {
                    setSummaryActivity(result.activities[0] ?? null);
                    setLoadedForUserId(currentUserId);
                    return;
                }

                setHistoryActivities(result.activities);
                setHistoryLoaded(true);
                setLoadedForUserId(currentUserId);
            } catch (error) {
                reportRecentActivityFailure("cache", "Recent activity refresh failed", currentUserId, error, {
                    view,
                });
            } finally {
                inFlightRef.current = false;
                if (cancelled) {
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

                if (cancelled) {
                    return;
                }

                const observerControl = createAutoHealingObserver(() => {
                    return onSnapshot(
                        doc(db, USER_RUNTIME_COLLECTION, user.uid),
                        (snapshot: import("firebase/firestore").DocumentSnapshot) => {
                            if (cancelled) return;
                            if (!sawUserRuntimeSnapshot) {
                                sawUserRuntimeSnapshot = true;
                                return;
                            }

                            const data = snapshot.data() as { activityVersion?: number; tasksVersion?: number } | undefined;
                            if (typeof data?.activityVersion === "number" || typeof data?.tasksVersion === "number") {
                                void refreshActivity("summary");
                                if (expandedRef.current || historyLoadedRef.current) {
                                    void refreshActivity("history");
                                }
                            }
                        },
                        (error: unknown) => {
                            if (cancelled) return;
                            observerControl.triggerReconnect(error);
                        },
                    );
                }, (error: unknown) => {
                    if (cancelled) return;
                    reportRecentActivityFailure(
                        "realtime",
                        "Recent activity runtime subscription failed",
                        currentUserId,
                        error,
                        buildFirestoreClientIssueDetail(error, {
                            path: `${USER_RUNTIME_COLLECTION}/${currentUserId}`
                        }) as Record<string, string>
                    );
                });

                unsubscribeUserRuntime = () => observerControl.cleanup();
            } catch (error) {
                reportRecentActivityFailure(
                    "firebase",
                    "Recent activity runtime setup failed",
                    currentUserId,
                    error,
                );
            }
        };

        const refreshRecentActivity = () => {
            void refreshActivity("summary");
            if (expandedRef.current || historyLoadedRef.current) {
                void refreshActivity("history");
            }
        };
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                refreshRecentActivity();
            }
        };

        void refreshActivity("summary");
        void subscribeToUserRuntime();
        window.addEventListener("focus", refreshRecentActivity);
        window.addEventListener(ACTIVITY_SYNC_EVENT, refreshRecentActivity);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            cancelled = true;
            window.removeEventListener("focus", refreshRecentActivity);
            window.removeEventListener(ACTIVITY_SYNC_EVENT, refreshRecentActivity);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            unsubscribeUserRuntime?.();
        };
    }, [user, userId]);

    useEffect(() => {
        if (!expanded || !user || !userId || historyLoaded) {
            return;
        }

        if (historyInFlightRef.current) {
            return;
        }

        let cancelled = false;
        setLoadingHistory(true);
        setHistoryError(false);
        historyInFlightRef.current = true;

        void (async () => {
            try {
                const result = await fetchRecentActivity("history", historyEtagRef.current);
                if (cancelled) {
                    return;
                }

                if (result.notModified) {
                    setHistoryLoaded(true);
                    return;
                }

                historyEtagRef.current = result.etag;
                setHistoryActivities(result.activities);
                setHistoryLoaded(true);
                setLoadedForUserId(userId);
            } catch (error) {
                reportRecentActivityFailure("cache", "Recent activity history refresh failed", userId, error);
                setHistoryError(true);
            } finally {
                historyInFlightRef.current = false;
                if (!cancelled) {
                    setLoadingHistory(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [expanded, historyLoaded, user, userId]);

    useEffect(() => {
        if (!expanded) {
            setSearchValue("");
            setCurrentPage(1);
        }
    }, [expanded]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchValue]);

        const scopedHistoryActivities = useMemo(
        () => (loadedForUserId === userId ? (historyActivities.length ? historyActivities : summaryActivity ? [summaryActivity] : []) : []),
        [historyActivities, loadedForUserId, userId, summaryActivity],
    );
    const summary = useMemo(
        () => (loadedForUserId === userId ? summaryActivity : null),
        [loadedForUserId, summaryActivity, userId],
    );

    const filteredHistory = useMemo(() => {
        const normalizedQuery = searchValue.trim().toLowerCase();
        if (!normalizedQuery) {
            return scopedHistoryActivities;
        }

        return scopedHistoryActivities.filter((activity) => getActivitySearchText(activity).includes(normalizedQuery));
    }, [scopedHistoryActivities, searchValue]);

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

    return {
        currentPage,
        historyActivities: scopedHistoryActivities,
        historyError,
        loadingHistory,
        loadingSummary,
        paginatedActivities,
        searchValue,
        setCurrentPage,
        setSearchValue,
        summaryActivity: summary,
        totalPages,
    };
}

export function RecentActivityFeed() {
    const { user } = useAuth();
    const userId = user?.uid ?? null;
    const router = useRouter();
    const [expanded, setExpanded] = useState(false);
    const {
        currentPage,
        historyActivities,
        historyError,
        loadingHistory,
        loadingSummary,
        paginatedActivities,
        searchValue,
        setCurrentPage,
        setSearchValue,
        summaryActivity,
        totalPages,
    } = useRecentActivityState(user, userId, expanded);

    if (!user || !userId) {
        return null;
    }

    const handleToggleExpanded = () => {
        const nextExpanded = !expanded;
        setExpanded(nextExpanded);
        trackEvent("recent_activity_toggled", {
            mode: nextExpanded ? "expanded" : "collapsed",
        });
    };

    const handleNavigate = (destination: "/drops" | "/experiences", source: "recent_activity_empty") => {
        trackEvent("navigation_click", {
            destination,
            source,
        });
        router.push(destination);
    };

    return (
        <div className="glass-panel mt-4 rounded-[1.35rem] p-3.5 sm:p-5 lg:mt-8" data-mobile-residual-cleanup="score-impact">
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
                    onClick={handleToggleExpanded}
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
                <RecentActivityEmptyState
                    onUnwrapNow={() => handleNavigate("/drops", "recent_activity_empty")}
                    onOpenExperiences={() => handleNavigate("/experiences", "recent_activity_empty")}
                />
            ) : (
                <div className="space-y-3">
                    {expanded ? (
                        <ExpandedActivityView
                            activities={paginatedActivities}
                            currentPage={currentPage}
                            historyError={historyError}
                            loadingHistory={loadingHistory && !historyActivities.length}
                            onNextPage={() => {
                                trackEvent("recent_activity_page_changed", { direction: "next" });
                                setCurrentPage((page) => Math.min(totalPages, page + 1));
                            }}
                            onPreviousPage={() => {
                                trackEvent("recent_activity_page_changed", { direction: "previous" });
                                setCurrentPage((page) => Math.max(1, page - 1));
                            }}
                            onSearchChange={(value) => {
                                if (value.trim()) {
                                    trackEvent("recent_activity_searched", { query_length: value.length });
                                }
                                setSearchValue(value);
                            }}
                            searchValue={searchValue}
                            totalPages={totalPages}
                        />
                    ) : summaryActivity ? (
                        <RecentActivitySummary item={summaryActivity} />
                    ) : null}
                </div>
            )}
        </div>
    );
}
