"use client";


import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { KandyRecentActivityExperience } from "@/components/creative-tim/kandydrops/activity/KandyRecentActivityExperience";

import { useAuth } from "@/context/AuthContext";
import { reportClientIssue, buildFirestoreClientIssueDetail } from "@/lib/client-error-reporting";
import { createAutoHealingObserver } from "@/lib/self-healing";
import { trackEvent } from "@/lib/telemetry";
import type { Transaction } from "@/types/db";
import { authFetch } from "@/lib/authFetch";
import { ACTIVITY_SYNC_EVENT } from "@/lib/activity-sync";
import { USER_RUNTIME_COLLECTION } from "@/lib/platform-config";

export interface TaskEventRecord {
    id: string;
    type: "assigned" | "started" | "completed" | "failed" | "reminder_sent";
    title: string;
    reward: number;
    progress: number;
    maxProgress: number;
    timestamp: number;
}

export type ActivityItem =
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
function getActivitySearchText(activity: ActivityItem) {
    return [
        activity.label,
        activity.kind === "transaction"
            ? activity.transaction.description
            : activity.taskEvent.title,
    ].join(" ").toLowerCase();
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
        <KandyRecentActivityExperience
            expanded={expanded}
            onToggleExpanded={handleToggleExpanded}
            loadingSummary={loadingSummary}
            hasRecordedActivity={Boolean(summaryActivity || historyActivities.length)}
            summaryActivity={summaryActivity}
            activities={paginatedActivities}
            currentPage={currentPage}
            historyError={historyError}
            loadingHistory={loadingHistory && !historyActivities.length}
            searchValue={searchValue}
            totalPages={totalPages}
            onSearchChange={(value) => {
                if (value.trim()) {
                    trackEvent("recent_activity_searched", { query_length: value.length });
                }
                setSearchValue(value);
            }}
            onNextPage={() => {
                trackEvent("recent_activity_page_changed", { direction: "next" });
                setCurrentPage((page) => Math.min(totalPages, page + 1));
            }}
            onPreviousPage={() => {
                trackEvent("recent_activity_page_changed", { direction: "previous" });
                setCurrentPage((page) => Math.max(1, page - 1));
            }}
            onUnwrapNow={() => handleNavigate("/drops", "recent_activity_empty")}
            onOpenExperiences={() => handleNavigate("/experiences", "recent_activity_empty")}
        />
    );
}