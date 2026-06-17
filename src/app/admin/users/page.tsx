"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { UserProfile } from "@/types/db";
import { Loader2, Search, Shield, Ban, CheckCircle, AlertTriangle, Edit2, Lock, Plus, ScrollText, MessageSquare, DollarSign, TrendingUp, Users, Clock3, Activity, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { BalanceAdjustmentModal } from "@/components/Admin/BalanceAdjustmentModal";
import { TransactionHistoryModal } from "@/components/Admin/TransactionHistoryModal";
import { authFetch } from "@/lib/authFetch";
import { isAdminUiTestSessionUser } from "@/lib/admin/admin-ui-test-session";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { AdminReviewBadge } from "@/components/Admin/AdminReviewBadge";
import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { AdminTasksManager } from "@/components/Admin/AdminTasksManager";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { sanitizeErrorForUser } from "@/lib/errors/resolve-human-error";
import { trackEvent } from "@/lib/telemetry";
import {
    buildEngagementBehavioralExplanation,
    buildValueBehavioralExplanation,
} from "@/lib/behavioral/behavioral-explanation";
import {
    buildAdminReviewBadge,
    buildBehaviorRollupReviewBadge,
} from "@/lib/behavioral/review-badge-rules";
import type { AdminSurfaceState } from "@/lib/admin-parity";
import {
    hasUsableAdminTruthValue,
    resolveAdminTruthState,
    type AdminTruthState,
} from "@/lib/admin-truth-state";
import { describeSecurityEvent } from "@/lib/security-events";
import { toast } from "sonner";
import { useAdminUsersRealtime } from "@/hooks/useAdminUsersRealtime";
import { buildAdminUsersPageData } from "@/lib/server/admin-page-data-loader";
import { buildUserManagementSummary } from "@/lib/admin/user-management-contract";
import type { 
    AdminBehaviorLeaderboardFilter,
    AdminBehaviorLeaderboardPanel,
    AdminUsersKpiCard,
    UserAnalytics, 
    UsersSummary, 
    DropReference, 
    AdminUsersResponse 
} from "@/types/admin-analytics";

type AdminFeedbackItem = {
    id: string;
    userId: string;
    email: string | null;
    summary: string | null;
    message: string;
    rating: number | null;
    category: string | null;
    contextId: string | null;
    issueType: string | null;
    severity: string | null;
    currentPath: string | null;
    componentName: string | null;
    diagnosticsCount: number;
    breadcrumbsCount: number;
    rolloutCount: number;
    status: string | null;
    timestamp: number;
};

type AdminUsersLaneResponse = Partial<AdminUsersResponse> & {
    success: boolean;
    loadingLane?: "summary" | "list" | "selectedUser" | "behavioralDetail";
};

function getAdminUsersSafeErrorMessage(error: unknown, fallback: string) {
    const safeError = sanitizeErrorForUser(error, "admin_truth", "admin_truth_unavailable");
    return safeError.errorKey === "unknown_error" ? fallback : safeError.operatorMessage;
}

export default function UserManagementPage() {
    const { user } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [userAnalytics, setUserAnalytics] = useState<Record<string, UserAnalytics>>({});
    const [dropReferences, setDropReferences] = useState<Record<string, DropReference>>({});
    const [summary, setSummary] = useState<UsersSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [behaviorLeaderboard, setBehaviorLeaderboard] = useState<AdminBehaviorLeaderboardPanel | null>(null);
    const [behaviorLeaderboardLoading, setBehaviorLeaderboardLoading] = useState(true);
    const [behaviorLeaderboardPage, setBehaviorLeaderboardPage] = useState(1);
    const [behaviorLeaderboardFilter, setBehaviorLeaderboardFilter] = useState<AdminBehaviorLeaderboardFilter>("all");
    const [selectedUserDetailLoading, setSelectedUserDetailLoading] = useState<string | null>(null);
    const [snapshotRefreshState, setSnapshotRefreshState] = useState<AdminSurfaceState>("loading");
    const [searchQuery, setSearchQuery] = useState("");
    const [actionUser, setActionUser] = useState<UserProfile | null>(null);
    const [actionType, setActionType] = useState<'suspend' | 'ban' | 'activate' | null>(null);
    const [reason, setReason] = useState("");
    const [processing, setProcessing] = useState(false);

    const [viewMode, setViewMode] = useState<'users' | 'feedback' | 'tasks'>('users');
    const [feedback, setFeedback] = useState<AdminFeedbackItem[]>([]);
    const [loadingFeedback, setLoadingFeedback] = useState(false);

    const [securityDetailsUser, setSecurityDetailsUser] = useState<UserProfile | null>(null);

    // Username Editing State
    const [editUsernameUser, setEditUsernameUser] = useState<UserProfile | null>(null);
    const [editUsernameInput, setEditUsernameInput] = useState("");

    // Balance Editing State
    const [editBalanceUser, setEditBalanceUser] = useState<UserProfile | null>(null);
    const [historyUser, setHistoryUser] = useState<UserProfile | null>(null);
    const [contentUser, setContentUser] = useState<UserProfile | null>(null);
    const [contentActionProcessing, setContentActionProcessing] = useState(false);
    const [contentInput, setContentInput] = useState("");

    const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastUsableSummaryRef = useRef(false);
    const lastUsableUsersRef = useRef(false);
    const lastUsableBehaviorLeaderboardRef = useRef(false);
    const isLocalAdminUiTestSession = isAdminUiTestSessionUser(user);

    const mergeUserDetail = useCallback((result: AdminUsersLaneResponse) => {
        const detailUser = result.users?.[0];
        if (detailUser) {
            setUsers((current) => current.map((user) => (user.uid === detailUser.uid ? { ...user, ...detailUser } : user)));
        }
        if (result.analyticsByUser) {
            setUserAnalytics((current) => ({ ...current, ...result.analyticsByUser }));
        }
        if (result.dropReferences) {
            setDropReferences((current) => ({ ...current, ...result.dropReferences }));
        }
    }, []);

    const fetchUserDetail = useCallback(async (user: UserProfile, options: { openContent?: boolean } = {}) => {
        if (isLocalAdminUiTestSession) {
            toast.info("User detail requires a real admin session. Local UI review is source_missing.");
            if (options.openContent) {
                setContentUser(user);
            }
            return;
        }
        setSelectedUserDetailLoading(user.uid);
        try {
            const response = await authFetch(`/api/admin/users?mode=detail&userId=${encodeURIComponent(user.uid)}`);
            const result = await response.json() as AdminUsersLaneResponse;
            if (!response.ok || !result.success) {
                throw new Error(result.error || "Failed to load user detail");
            }

            mergeUserDetail(result);
            const detailUser = result.users?.[0] ? { ...user, ...result.users[0] } : user;
            trackEvent("admin_user_detail_viewed", {
                source_component: "admin_user_management",
                route: "/admin/users",
                admin_actor_uid: "self",
                target_user_id: detailUser.uid,
                entity_type: "admin",
                entity_id: detailUser.uid,
            });
            if (options.openContent) {
                setContentUser(detailUser);
            }
        } catch (error) {
            reportClientIssue({
                channel: "ui",
                message: "Admin selected user detail fetch failed",
                error,
                detail: {
                    adminView: "users",
                    action: "fetch_selected_user_detail",
                    userId: user.uid,
                },
                consoleLabel: "[Admin Users] fetch selected user detail failed",
            });
            toast.error(getAdminUsersSafeErrorMessage(error, "Failed to load user detail"));
            if (options.openContent) {
                setContentUser(user);
            }
        } finally {
            setSelectedUserDetailLoading(null);
        }
    }, [isLocalAdminUiTestSession, mergeUserDetail]);

    const fetchSummary = useCallback(async (options: { silent?: boolean; reason?: string } = {}) => {
        if (isLocalAdminUiTestSession) {
            setSummary(null);
            lastUsableSummaryRef.current = false;
            setSnapshotRefreshState("unavailable");
            if (!options.silent) {
                setSummaryLoading(false);
            }
            return;
        }
        if (!options.silent) {
            setSummaryLoading(true);
        }
        try {
            const response = await authFetch("/api/admin/users?mode=summary");
            const result = await response.json() as AdminUsersLaneResponse;
            if (!response.ok || !result.success) {
                throw new Error(result.error || "Failed to load user metrics");
            }

            setSummary(result.summary || null);
            lastUsableSummaryRef.current = Boolean(result.summary);
            if (options.reason) {
                setSnapshotRefreshState("live");
            }
        } catch (error) {
            if (options.silent) {
                setSnapshotRefreshState(lastUsableSummaryRef.current ? "degraded" : "failed");
            }
            reportClientIssue({
                channel: "ui",
                message: "Admin users summary fetch failed",
                error,
                detail: {
                    adminView: "users",
                    action: "fetch_users_summary",
                },
                consoleLabel: "[Admin Users] fetch users summary failed",
            });
            if (!options.silent || !lastUsableSummaryRef.current) {
                toast.error(getAdminUsersSafeErrorMessage(error, "Failed to load user metrics"));
            }
        } finally {
            if (!options.silent) {
                setSummaryLoading(false);
            }
        }
    }, [isLocalAdminUiTestSession]);

    const fetchUsers = useCallback(async (options: { silent?: boolean; reason?: string } = {}) => {
        if (isLocalAdminUiTestSession) {
            setUsers([]);
            setUserAnalytics({});
            setDropReferences({});
            lastUsableUsersRef.current = false;
            setSnapshotRefreshState("unavailable");
            if (!options.silent) {
                setLoading(false);
            }
            return;
        }
        if (!options.silent) {
            setLoading(true);
        }
        try {
            const response = await authFetch("/api/admin/users?mode=list");
            const result = await response.json() as AdminUsersLaneResponse;
            if (!response.ok || !result.success) {
                throw new Error(result.error || "Failed to load user list");
            }

            setUsers(result.users || []);
            lastUsableUsersRef.current = (result.users?.length || 0) > 0;
            if (options.reason) {
                setSnapshotRefreshState("live");
            }
        } catch (error) {
            if (options.silent) {
                setSnapshotRefreshState((lastUsableUsersRef.current || lastUsableSummaryRef.current) ? "degraded" : "failed");
            }
            reportClientIssue({
                channel: "ui",
                message: "Admin users fetch failed",
                error,
                detail: {
                    adminView: "users",
                    action: "fetch_users_list",
                },
                consoleLabel: "[Admin Users] fetch user list failed",
            });
            if (!options.silent) {
                toast.error(getAdminUsersSafeErrorMessage(error, "Failed to load user list"));
            }
        } finally {
            if (!options.silent) {
                setLoading(false);
            }
        }
    }, [isLocalAdminUiTestSession]);

    const fetchBehaviorLeaderboard = useCallback(async (
        options: {
            silent?: boolean;
            page?: number;
            filter?: AdminBehaviorLeaderboardFilter;
            reason?: string;
        } = {},
    ) => {
        const page = options.page ?? behaviorLeaderboardPage;
        const filter = options.filter ?? behaviorLeaderboardFilter;
        if (isLocalAdminUiTestSession) {
            setBehaviorLeaderboard(null);
            lastUsableBehaviorLeaderboardRef.current = false;
            setSnapshotRefreshState("unavailable");
            if (!options.silent) {
                setBehaviorLeaderboardLoading(false);
            }
            return;
        }
        if (!options.silent) {
            setBehaviorLeaderboardLoading(true);
        }
        try {
            const response = await authFetch(`/api/admin/users?mode=behavior_leaderboard&page=${page}&pageSize=10&filter=${filter}`);
            const result = await response.json() as AdminUsersLaneResponse;
            if (!response.ok || !result.success) {
                throw new Error(result.error || "Failed to load behavior leaderboard");
            }

            setBehaviorLeaderboard(result.behaviorLeaderboard || null);
            lastUsableBehaviorLeaderboardRef.current = Boolean(result.behaviorLeaderboard);
            if (options.reason) {
                setSnapshotRefreshState("live");
            }
        } catch (error) {
            if (options.silent) {
                setSnapshotRefreshState(
                    (lastUsableBehaviorLeaderboardRef.current || lastUsableSummaryRef.current) ? "degraded" : "failed",
                );
            }
            reportClientIssue({
                channel: "ui",
                message: "Admin users behavior leaderboard fetch failed",
                error,
                detail: {
                    adminView: "users",
                    action: "fetch_behavior_leaderboard",
                    page,
                    filter,
                },
                consoleLabel: "[Admin Users] fetch behavior leaderboard failed",
            });
            if (!options.silent) {
                toast.error(getAdminUsersSafeErrorMessage(error, "Failed to load behavior leaderboard"));
            }
        } finally {
            if (!options.silent) {
                setBehaviorLeaderboardLoading(false);
            }
        }
    }, [behaviorLeaderboardFilter, behaviorLeaderboardPage, isLocalAdminUiTestSession]);

    useEffect(() => {
        fetchSummary();
        fetchUsers();
    }, [fetchSummary, fetchUsers]);

    const scheduleRealtimeRefresh = useCallback((reason: string) => {
        if (refreshDebounceRef.current) {
            clearTimeout(refreshDebounceRef.current);
        }
        setSnapshotRefreshState((current) => {
            if (!lastUsableSummaryRef.current && current !== "live") {
                return "loading";
            }
            return current === "live" ? "fallback" : current;
        });
        refreshDebounceRef.current = setTimeout(() => {
            void fetchSummary({ silent: true, reason });
            void fetchUsers({ silent: true, reason });
            void fetchBehaviorLeaderboard({ silent: true, reason });
        }, 450);
    }, [fetchBehaviorLeaderboard, fetchSummary, fetchUsers]);

    const usersRealtimePulse = useAdminUsersRealtime({
        enabled: viewMode === "users" && !isLocalAdminUiTestSession,
        hasSnapshotValue: Boolean(summary),
        onInvalidate: scheduleRealtimeRefresh,
    });

    useEffect(() => {
        return () => {
            if (refreshDebounceRef.current) {
                clearTimeout(refreshDebounceRef.current);
            }
        };
    }, []);

    useEffect(() => {
        void fetchBehaviorLeaderboard({ page: behaviorLeaderboardPage, filter: behaviorLeaderboardFilter });
    }, [behaviorLeaderboardFilter, behaviorLeaderboardPage, fetchBehaviorLeaderboard]);

    const fetchFeedback = async () => {
        if (isLocalAdminUiTestSession) {
            setFeedback([]);
            setLoadingFeedback(false);
            return;
        }
        setLoadingFeedback(true);
        try {
            const response = await authFetch("/api/admin/feedback");
            const result = await response.json() as { success?: boolean; feedback?: AdminFeedbackItem[] };
            if (!response.ok || !result.success) {
                throw new Error("Failed to load feedback");
            }
            setFeedback(result.feedback || []);
        } catch (error) {
            reportClientIssue({
                channel: "feedback",
                message: "Admin feedback fetch failed",
                error,
                detail: {
                    adminView: "users",
                    action: "fetch_feedback",
                },
                consoleLabel: "[Admin Users] fetch feedback failed",
            });
            toast.error("Failed to load feedback");
        } finally {
            setLoadingFeedback(false);
        }
    };

    useEffect(() => {
        if (viewMode === 'feedback') {
            fetchFeedback();
        }
    }, [viewMode]);

    const filteredUsers = users.filter(user =>
    (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.uid.includes(searchQuery))
    );

    const getUserAnalytics = (uid: string) => userAnalytics[uid];
    const getBehaviorRollup = (uid: string) => userAnalytics[uid]?.behaviorRollup;
    const getBehaviorAvailabilityLabel = (behaviorRollup?: UserAnalytics["behaviorRollup"]) => {
        if (behaviorRollup?.dataAvailabilityReason === "privacy_limited_global_privacy_control") {
            return "Privacy-limited by Global Privacy Control.";
        }

        if (behaviorRollup?.dataAvailabilityReason === "privacy_limited_identified_analytics_denied") {
            return "Privacy-limited because identified analytics are disabled.";
        }

        return null;
    };
    const getBehaviorTruthState = (behaviorRollup?: UserAnalytics["behaviorRollup"]) => resolveAdminTruthState({
        hasUsableValue: Boolean(behaviorRollup),
        sourceConfigured: true,
        valueState: behaviorRollup?.dataAvailabilityReason && behaviorRollup.dataAvailabilityReason !== "full_signal"
            ? "privacy_limited"
            : behaviorRollup?.confidence === "unknown"
                ? "unavailable"
                : behaviorRollup?.freshnessState,
        reviewRequired: Boolean(
            behaviorRollup?.issues.some((issue) => !issue.code.startsWith("privacy_limited_")),
        ) || (
            behaviorRollup?.dataAvailabilityReason === "full_signal"
            && (behaviorRollup?.confidence === "insufficient" || behaviorRollup?.confidence === "low")
        ),
    });
    const formatMoney = (value?: number) => typeof value === "number" && Number.isFinite(value) ? `$${value.toFixed(2)}` : "Unavailable";
    const formatPercent = (value?: number) => typeof value === "number" && Number.isFinite(value) ? `${Math.round(value * 100)}%` : "Unavailable";
    const formatCount = (value?: number, analytics?: UserAnalytics) =>
        !analytics || analytics.metricTruthLabel === "unknown" ? "Unavailable" : (value ?? 0).toLocaleString();
    const formatWatchHours = (watchTimeMs?: number, fallbackHours?: number) => {
        if (typeof watchTimeMs === "number" && Number.isFinite(watchTimeMs)) {
            return `${Number((watchTimeMs / 3_600_000).toFixed(1))}h`;
        }

        return `${fallbackHours || 0}h`;
    };
    const getKpiCardTruthState = (card: AdminUsersKpiCard): AdminTruthState => {
        if (card.freshnessState === "live") return "live";
        if (card.freshnessState === "stale") return "stale";
        if (card.freshnessState === "degraded") return "degraded";
        if (card.freshnessState === "delayed") return "delayed";
        if (card.freshnessState === "review") return "review";
        return "unavailable";
    };
    const renderSummaryMetricCard = (card: AdminUsersKpiCard) => {
        const metricState = getKpiCardTruthState(card);
        const hasUsableValue = hasUsableAdminTruthValue(card.primaryValue);
        const reviewDecision = buildAdminReviewBadge({
            truthState: metricState,
            missingRequiredData: card.freshnessState === "unknown",
            viewsExistButWatchMissing: card.id === "watch_time" && card.reasonCode === "watch_time_missing_despite_views",
            revenueExistsButPurchaseCountMissing: card.id === "revenue" && card.reasonCode === "revenue_missing_purchase_count",
            delayedExpected: card.freshnessState === "delayed",
            reviewSummary: card.reasonCode
                ? `${card.explanation}${card.warnings.length ? ` Warnings: ${card.warnings.join(" | ")}` : ""}`
                : card.explanation,
        });
        const sourceDetail = `${card.scope.replace(/_/g, " ")} | ${(card.sourceLabel ?? card.sourceTruth).replace(/_/g, " ")}`;
        const footerReason = card.reasonCode
            ? card.reasonCode.replace(/_/g, " ")
            : card.freshnessState === "live"
                ? "source verified"
                : card.freshnessState.replace(/_/g, " ");

        return (
        <div
            className="rounded-2xl border border-white/10 bg-white/[0.045] px-2.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:px-3 sm:py-3"
            title={`${card.explanation}${card.formula ? ` Formula: ${card.formula}.` : ""}${card.warnings.length ? ` Warnings: ${card.warnings.join(" | ")}` : ""}`}
            data-admin-metric-state={metricState}
            data-admin-metric-source={card.sourceLabel ?? card.sourceTruth}
            data-admin-metric-freshness={card.freshnessState}
            data-admin-users-metric-state={metricState}
            data-admin-users-metric-source={card.sourceLabel ?? card.sourceTruth}
            data-admin-review-reason={reviewDecision?.reasonCode ?? "none"}
            data-admin-users-kpi-id={card.id}
            data-admin-users-kpi-source-truth={card.sourceTruth}
            data-admin-users-kpi-freshness={card.freshnessState}
            data-admin-users-kpi-scope={card.scope}
            data-admin-users-kpi-reason={card.reasonCode ?? "none"}
            data-admin-users-kpi-generated-at-utc={card.generatedAtUtc}
        >
            <div className="flex min-h-5 items-start justify-between gap-1.5">
                <p className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.13em] text-gray-500">{card.label}</p>
                <div className="flex shrink-0 items-center gap-1">
                    <AdminReviewBadge decision={reviewDecision ?? null} className="px-1.5 py-0 text-[8px] tracking-[0.08em]" />
                    <AdminTruthBadge
                        state={metricState}
                        className="px-1.5 py-0 text-[8px] tracking-[0.08em]"
                        pendingInitialLoad={!summary && summaryLoading}
                        hasUsableValue={hasUsableValue}
                    />
                </div>
            </div>
            <p className="mt-1 truncate text-xl font-black leading-none text-white sm:text-2xl">{String(card.primaryValue)}</p>
            <div className="mt-1 min-h-9 space-y-1">
                <p className="text-[10px] leading-snug text-gray-300 sm:text-[11px]">{card.secondaryValue ?? card.explanation}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] uppercase tracking-[0.08em] text-gray-500">
                    <span>{sourceDetail}</span>
                    <span>{footerReason}</span>
                </div>
            </div>
        </div>
    )};
    const formatJoined = (value: unknown) => {
        const timestamp = typeof value === "number"
            ? value
            : value && typeof value === "object" && "toMillis" in value && typeof (value as { toMillis: () => number }).toMillis === "function"
                ? (value as { toMillis: () => number }).toMillis()
                : value instanceof Date
                    ? value.getTime()
                    : 0;
        return timestamp > 0 ? format(new Date(timestamp), "MMM d, yyyy") : "Join date unknown";
    };
    const getBounceRate = (analytics?: UserAnalytics) =>
        analytics && analytics.viewCount > 0 ? analytics.bounceCount / Math.max(1, analytics.viewCount) : 0;
    const pageData = buildAdminUsersPageData({
        summary,
        summaryLoading,
        snapshotRefreshState,
        usersRealtimePulse,
        behaviorLeaderboard,
    });
    const userManagementSummaries = useMemo(() => {
        return filteredUsers.map((user) => buildUserManagementSummary({
            user,
            analytics: getUserAnalytics(user.uid) ?? null,
            summary,
        }));
    }, [filteredUsers, summary, userAnalytics]);
    const userManagementSummaryById = useMemo(() => {
        return new Map(userManagementSummaries.map((entry) => [entry.identity.userId, entry]));
    }, [userManagementSummaries]);
    const lowConfidenceUsers = userManagementSummaries.filter((entry) => entry.personMetricConfidence.lowConfidenceCount > 0 || entry.activitySummary.state === "collecting");
    const userSummaryTruthState = pageData.truthState;
    const usersRealtimePulseTruthState = pageData.realtimePulseTruthState;
    const getOnboardingBadge = (user: UserProfile, analytics?: UserAnalytics) =>
        user.onboardingCompleted || (analytics?.onboardingCompletionCount || 0) > 0
            ? {
                label: "Onboarding Complete",
                className: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
            }
            : (analytics?.onboardingStartCount || 0) > 0
                ? {
                    label: "Onboarding Live",
                    className: "text-amber-200 bg-amber-500/10 border-amber-500/20",
                }
                : {
                    label: "Onboarding Pending",
                    className: "text-gray-300 bg-white/5 border-white/10",
                };

    const formatLastSeen = (timestamp?: number) =>
        timestamp && timestamp > 0 ? `Seen ${format(new Date(timestamp), 'MMM d, h:mm a')}` : "No tracked activity";
    const formatLastPurchase = (timestamp?: number) =>
        timestamp && timestamp > 0 ? `Paid ${format(new Date(timestamp), 'MMM d, h:mm a')}` : "No purchases yet";
    const formatUtcLabel = (value?: string | null) =>
        value ? format(new Date(value), "MMM d, h:mm a") : "No recent activity";
    const formatWatchSecondsCompact = (seconds?: number) => {
        const safeSeconds = Math.max(0, Math.round(seconds || 0));
        const hours = Math.floor(safeSeconds / 3600);
        const minutes = Math.floor((safeSeconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        if (minutes > 0) {
            return `${minutes}m`;
        }
        return `${safeSeconds}s`;
    };
    const selectedSecurityDescriptor = securityDetailsUser
        ? describeSecurityEvent(securityDetailsUser.securityFlags?.lastViolationReason)
        : null;
    const leaderboardRows = behaviorLeaderboard?.rows ?? [];
    const leaderboardPageNumber = behaviorLeaderboard?.page ?? behaviorLeaderboardPage;
    const leaderboardPageSize = behaviorLeaderboard?.pageSize ?? 10;

    const handleUpdateStatus = async () => {
        if (!actionUser || !actionType) return;
        if (isLocalAdminUiTestSession) {
            toast.info("User status changes require a real admin session. Local UI review is read-only.");
            setActionType(null);
            setActionUser(null);
            setReason("");
            return;
        }
        setProcessing(true);

        try {
            let updates: Record<string, any> = {};

            if (actionType === 'activate') {
                updates = { status: 'active', statusReason: "" };
            } else {
                updates = {
                    status: actionType === 'ban' ? 'banned' : 'suspended',
                    statusReason: reason
                };
            }

            const response = await authFetch("/api/admin/users", {
                method: "PUT",
                body: JSON.stringify({ userId: actionUser.uid, updates }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            // Update local state
            setUsers((current) => current.map((u) => (u.uid === actionUser.uid ? { ...u, ...updates } : u)));
            setActionType(null);
            setActionUser(null);
            setReason("");
        } catch (error: any) {
            reportClientIssue({
                channel: "ui",
                message: "Admin user status update failed",
                error,
                detail: {
                    adminView: "users",
                    action: "update_status",
                    userId: actionUser.uid,
                    nextStatus: actionType === "activate" ? "active" : actionType,
                },
                consoleLabel: "[Admin Users] update status failed",
            });
            toast.error(getAdminUsersSafeErrorMessage(error, "Failed to update user status."));
        } finally {
            setProcessing(false);
        }
    };

    const handleUpdateUsername = async () => {
        if (!editUsernameUser) return;
        if (isLocalAdminUiTestSession) {
            toast.info("Username changes require a real admin session. Local UI review is read-only.");
            setEditUsernameUser(null);
            setEditUsernameInput("");
            return;
        }
        setProcessing(true);
        try {
            const response = await authFetch(`/api/admin/users/${editUsernameUser.uid}/username`, {
                method: "PATCH",
                body: JSON.stringify({ username: editUsernameInput }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            setUsers((current) => current.map((u) => (u.uid === editUsernameUser.uid ? { ...u, username: result.username } : u)));
            toast.success("Username updated successfully.");
            setEditUsernameUser(null);
            setEditUsernameInput("");
        } catch (error: any) {
            toast.error(getAdminUsersSafeErrorMessage(error, "Failed to update username."));
        } finally {
            setProcessing(false);
        }
    };

    // --- Content Management ---

    const handleManageContent = async (action: 'add' | 'remove', dropId: string) => {
        const normalizedDropId = dropId.trim();
        if (!contentUser || !normalizedDropId) return;
        if (isLocalAdminUiTestSession) {
            toast.info("Content access changes require a real admin session. Local UI review is read-only.");
            setContentActionProcessing(false);
            return;
        }
        setContentActionProcessing(true);
        try {
            if (action === 'add' && contentUser.unlockedContent?.includes(normalizedDropId)) {
                toast.error("User already has this content unlocked.");
                setContentActionProcessing(false);
                return;
            }

            const response = await authFetch("/api/admin/users", {
                method: "POST",
                body: JSON.stringify({ userId: contentUser.uid, action, dropId: normalizedDropId }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            const canonicalDropId = result.dropReference?.id || normalizedDropId;
            // Update Local State
            const updatedContent = action === 'add'
                ? [...(contentUser.unlockedContent || []), canonicalDropId]
                : (contentUser.unlockedContent || []).filter(id => id !== canonicalDropId);

            setUsers((current) => current.map((u) => (u.uid === contentUser.uid ? { ...u, unlockedContent: updatedContent } : u)));
            setContentUser({ ...contentUser, unlockedContent: updatedContent });
            if (result.dropReference?.id) {
                setDropReferences((current) => ({
                    ...current,
                    [result.dropReference.id]: result.dropReference,
                }));
            }
            setContentInput("");
        } catch (error: any) {
            reportClientIssue({
                channel: "ui",
                message: "Admin user content access update failed",
                error,
                detail: {
                    adminView: "users",
                    action: "manage_content",
                    operation: action,
                    userId: contentUser.uid,
                    dropId: normalizedDropId,
                },
                consoleLabel: "[Admin Users] manage content failed",
            });
            toast.error(getAdminUsersSafeErrorMessage(error, "Failed to update content access."));
        } finally {
            setContentActionProcessing(false);
        }
    };

    // --- Role & Verification Management ---
    const handleRoleUpdate = async (uid: string, newRole: 'user' | 'creator' | 'admin') => {
        if (isLocalAdminUiTestSession) {
            toast.info("Role changes require a real admin session. Local UI review is read-only.");
            return;
        }
        try {
            const response = await authFetch("/api/admin/users", {
                method: "PUT",
                body: JSON.stringify({ userId: uid, updates: { role: newRole } }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            // Update local state
            setUsers((current) => current.map((u) => (u.uid === uid ? { ...u, role: newRole } : u)));
            toast.success(`Role updated to ${newRole}`);
        } catch (error: any) {
            reportClientIssue({
                channel: "ui",
                message: "Admin user role update failed",
                error,
                detail: {
                    adminView: "users",
                    action: "update_role",
                    userId: uid,
                    role: newRole,
                },
                consoleLabel: "[Admin Users] update role failed",
            });
            toast.error(getAdminUsersSafeErrorMessage(error, "Failed to update role"));
        }
    };

    const handleVerification = async (uid: string, isVerified: boolean) => {
        if (isLocalAdminUiTestSession) {
            toast.info("Verification changes require a real admin session. Local UI review is read-only.");
            return;
        }
        try {
            const response = await authFetch("/api/admin/users", {
                method: "PUT",
                body: JSON.stringify({ userId: uid, updates: { isVerified } }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            // Update local state
            setUsers((current) => current.map((u) => (u.uid === uid ? { ...u, isVerified } : u)));
        } catch (error: any) {
            reportClientIssue({
                channel: "ui",
                message: "Admin user verification update failed",
                error,
                detail: {
                    adminView: "users",
                    action: "update_verification",
                    userId: uid,
                    isVerified,
                },
                consoleLabel: "[Admin Users] update verification failed",
            });
            toast.error(getAdminUsersSafeErrorMessage(error, "Failed to update verification"));
        }
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'banned': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'suspended': return 'text-brand-purple bg-brand-purple/10 border-brand-purple/20';
            default: return 'text-brand-purple bg-brand-purple/10 border-brand-purple/20';
        }
    };

    return (
        <div className="space-y-4 md:space-y-5">
            <PageViewEvent eventName="admin_users_viewed" />
            <AdminPageHeader
                eyebrow="Admin Users"
                title={viewMode === 'users' ? 'User Management' : viewMode === 'feedback' ? 'Platform Feedback' : 'Daily Task Control'}
                compact
                subtitle={viewMode === 'users'
                    ? pageData.subtitle
                    : viewMode === 'feedback'
                        ? 'Review user-submitted feedback from daily tasks.'
                        : 'Create daily missions and review latest task-trigger activity.'}
                topSlot={viewMode === "users" ? (
                    <div
                        className="flex flex-wrap items-center gap-2"
                        data-admin-users-snapshot-state={userSummaryTruthState}
                        data-admin-users-pulse-state={usersRealtimePulse.pulseState}
                    >
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-2.5 py-1.5 text-[11px] text-gray-300">
                            <AdminTruthBadge
                                state={userSummaryTruthState}
                                pendingInitialLoad={!summary && summaryLoading}
                                hasUsableValue={Boolean(summary?.kpiCards?.length)}
                                className="px-1.5 py-0 text-[8px] tracking-[0.08em]"
                            />
                            <span>Snapshot totals</span>
                        </div>
                        <div
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-2.5 py-1.5 text-[11px] text-gray-300"
                            data-admin-users-pulse-label={usersRealtimePulse.pulseLabel}
                        >
                            <AdminTruthBadge
                                state={usersRealtimePulseTruthState}
                                pendingInitialLoad={!summary && summaryLoading}
                                hasUsableValue={Boolean(summary)}
                                className="px-1.5 py-0 text-[8px] tracking-[0.08em]"
                            />
                            <span>{usersRealtimePulse.pulseLabel}</span>
                        </div>
                    </div>
                ) : null}
                actions={
                    <>
                    <button
                        onClick={() => setViewMode('users')}
                        className={cn(
                            "inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-all",
                            viewMode === 'users' ? "bg-brand-purple text-white border-brand-purple" : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"
                        )}
                    >
                        <Shield className="w-4 h-4" /> Users
                    </button>
                    <button
                        onClick={() => setViewMode('feedback')}
                        className={cn(
                            "inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-all",
                            viewMode === 'feedback' ? "bg-brand-purple text-white border-brand-purple" : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"
                        )}
                    >
                        <MessageSquare className="w-4 h-4" /> Feedback
                    </button>
                    <button
                        onClick={() => setViewMode('tasks')}
                        className={cn(
                            "inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-all",
                            viewMode === 'tasks' ? "bg-brand-purple text-white border-brand-purple" : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"
                        )}
                    >
                        <DollarSign className="w-4 h-4" /> Tasks
                    </button>
                    </>
                }
            />

            {isLocalAdminUiTestSession ? (
                <div
                    className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
                    data-admin-users-fixture-boundary="true"
                    data-admin-users-fixture-state="source_missing"
                >
                    <p className="font-bold">Local admin UI review only.</p>
                    <p className="mt-1 text-xs leading-5 text-amber-100/80">
                        This local review shows the users layout only. User metrics, feedback, task controls, identity, payment, and content access stay source_missing until a real admin session loads verified records.
                    </p>
                </div>
            ) : null}

            {viewMode === 'users' && (
                <>
                    <div
                        className="grid grid-cols-2 gap-2 min-[390px]:grid-cols-3 md:gap-2.5 xl:grid-cols-5"
                        data-admin-users-stats-layout="compact-grid"
                        data-admin-users-truth-source={summary?.truthSnapshot?.sourceTruth ?? "unavailable"}
                        data-admin-users-truth-freshness={summary?.truthSnapshot?.sourceFreshness ?? "unavailable"}
                    >
                        {(summary?.kpiCards ?? []).map((card) => (
                            <div key={card.id}>
                                {renderSummaryMetricCard(card)}
                            </div>
                        ))}
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
                        <div className="glass-panel p-2 rounded-xl flex items-center gap-3 border border-white/5">
                            <Search className="w-5 h-5 text-gray-500 ml-2" />
                            <input
                                type="text"
                                placeholder="Search users by email, name, username, or ID..."
                                className="bg-transparent border-none outline-none text-white w-full h-10 placeholder:text-gray-600"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="glass-panel rounded-[1.7rem] border border-white/10 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                                        <TrendingUp className="w-4 h-4 text-brand-purple" />
                                        Top behavior users
                                    </div>
                                    <p className="mt-1 text-[11px] text-gray-400">
                                        Ranked by engagement, value, recency, and confidence.
                                    </p>
                                </div>
                                <AdminTruthBadge
                                    state={resolveAdminTruthState({
                                        hasUsableValue: leaderboardRows.length > 0,
                                        sourceConfigured: true,
                                        transportState: behaviorLeaderboard?.sourceFreshness === "live"
                                            ? "live"
                                            : behaviorLeaderboard?.sourceFreshness === "stale"
                                                ? "stale"
                                                : behaviorLeaderboard?.sourceFreshness === "review"
                                                    ? "review"
                                                    : snapshotRefreshState,
                                    })}
                                    pendingInitialLoad={behaviorLeaderboardLoading && leaderboardRows.length === 0}
                                    hasUsableValue={leaderboardRows.length > 0}
                                />
                            </div>
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap gap-2">
                                    {(["all", "returned_7d", "purchasers", "unwrappers", "low_confidence"] as AdminBehaviorLeaderboardFilter[]).map((filter) => (
                                        <button
                                            key={filter}
                                            type="button"
                                            onClick={() => {
                                                setBehaviorLeaderboardPage(1);
                                                setBehaviorLeaderboardFilter(filter);
                                            }}
                                            className={cn(
                                                "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]",
                                                behaviorLeaderboardFilter === filter
                                                    ? "border-brand-purple/50 bg-brand-purple/15 text-white"
                                                    : "border-white/10 bg-white/5 text-gray-400 hover:text-white",
                                            )}
                                        >
                                            {filter.replace(/_/g, " ")}
                                        </button>
                                    ))}
                                </div>
                                <div className="text-[10px] text-gray-500">
                                    {behaviorLeaderboard
                                        ? `${behaviorLeaderboard.totalEligibleUsers} eligible · page size ${behaviorLeaderboard.pageSize}`
                                        : "Loading behavior source"}
                                </div>
                            </div>
                            <div className="mt-3 grid gap-2">
                                {!behaviorLeaderboard && behaviorLeaderboardLoading ? (
                                    <p className="text-sm text-gray-400">Loading behavior leaderboard…</p>
                                ) : leaderboardRows.length === 0 ? (
                                    <p
                                        className="text-sm text-gray-400"
                                        data-admin-users-behavior-empty-state="materializer"
                                    >
                                        {behaviorLeaderboard?.warnings[0] || "Run behavior materializer or inspect event facts."}
                                    </p>
                                ) : leaderboardRows.map((row, index) => (
                                    <Link
                                        key={row.userId}
                                        href={`/admin/user/${row.userId}`}
                                        className="rounded-2xl border border-white/10 bg-black/25 px-3 py-3 transition-colors hover:border-brand-purple/35 hover:bg-black/35"
                                        data-admin-behavior-row-user-id={row.userId}
                                        data-admin-behavior-row-source={row.sourceTruth}
                                        data-admin-behavior-row-freshness={row.freshnessState}
                                        data-admin-behavior-row-identity-state={row.userIdentityState}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-brand-purple">#{((leaderboardPageNumber - 1) * leaderboardPageSize) + index + 1}</span>
                                                    <p className="truncate text-sm font-bold text-white">
                                                        {row.username ? `@${row.username}` : row.displayName}
                                                    </p>
                                                </div>
                                                <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-gray-500">
                                                    {row.userIdentityState === "resolved" ? row.shortUserId : `UID ${row.shortUserId}`}
                                                </p>
                                                <p className="mt-1 text-[11px] text-gray-400">
                                                    Last meaningful action {formatUtcLabel(row.lastMeaningfulActionAtUtc)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-white">{row.engagementScore}</p>
                                                <p className="text-[10px] text-gray-500">engagement</p>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-gray-300">
                                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">value {row.valueScore ?? "—"}</span>
                                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">confidence {row.behaviorConfidence}%</span>
                                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{row.purchaseCount} purchases</span>
                                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{row.unlockCount} unwraps</span>
                                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{formatWatchSecondsCompact(row.watchSeconds)} watch</span>
                                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{row.taskCompletions} tasks</span>
                                        </div>
                                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.08em] text-gray-500">
                                            <span>{row.sourceTruth.replace(/_/g, " ")}</span>
                                            <span>{row.freshnessState}</span>
                                            {row.returnedInLast7d ? <span>returned 7d</span> : null}
                                        </div>
                                        {row.warnings.length > 0 || getBehaviorAvailabilityLabel(getBehaviorRollup(row.userId)) ? (
                                            <p className="mt-2 text-[11px] text-amber-200">{getBehaviorAvailabilityLabel(getBehaviorRollup(row.userId)) ?? row.warnings[0]}</p>
                                        ) : null}
                                    </Link>
                                ))}
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                                <div className="text-[10px] text-gray-500">
                                    {behaviorLeaderboard
                                        ? `Page ${behaviorLeaderboard.page} of ${behaviorLeaderboard.totalPages} · generated ${formatUtcLabel(behaviorLeaderboard.generatedAtUtc)}`
                                        : "Page 1"}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setBehaviorLeaderboardPage((current) => Math.max(1, current - 1))}
                                        disabled={!behaviorLeaderboard || behaviorLeaderboard.page <= 1}
                                        className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-gray-300 disabled:opacity-40"
                                    >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                        Previous
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBehaviorLeaderboardPage((current) => behaviorLeaderboard ? Math.min(behaviorLeaderboard.totalPages, current + 1) : current + 1)}
                                        disabled={!behaviorLeaderboard || behaviorLeaderboard.page >= behaviorLeaderboard.totalPages}
                                        className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-gray-300 disabled:opacity-40"
                                    >
                                        Next
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        className="grid gap-3 md:grid-cols-3"
                        data-admin-user-management-summary-lane="identity-activity-confidence"
                    >
                        <div className="rounded-xl border border-white/10 bg-black/25 p-3" data-admin-user-management-identity-handoff="summary">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-black uppercase tracking-[0.08em] text-gray-400">Identity handoff</p>
                                <AdminTruthBadge
                                    state={userManagementSummaries.length ? "live" : loading ? "refreshing" : "unavailable"}
                                    pendingInitialLoad={loading}
                                    hasUsableValue={userManagementSummaries.length > 0}
                                    className="px-1.5 py-0 text-[8px] tracking-[0.08em]"
                                />
                            </div>
                            <p className="mt-2 text-sm font-bold text-white">
                                {userManagementSummaries.filter((entry) => entry.identity.identityConfidence === "exact").length} exact / {userManagementSummaries.length} shown
                            </p>
                            <p className="mt-1 text-[11px] leading-5 text-gray-400">
                                Guest link status is visible per row. Raw user/event rows stay behind detail actions.
                            </p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/25 p-3" data-admin-user-management-consent-mode="summary">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-black uppercase tracking-[0.08em] text-gray-400">Consent/tracking</p>
                                <AdminTruthBadge
                                    state={userManagementSummaries.some((entry) => entry.consentMode.mode === "unavailable") ? "degraded" : userManagementSummaries.length ? "live" : "unavailable"}
                                    pendingInitialLoad={loading}
                                    hasUsableValue={userManagementSummaries.length > 0}
                                    className="px-1.5 py-0 text-[8px] tracking-[0.08em]"
                                />
                            </div>
                            <p className="mt-2 text-sm font-bold text-white">
                                {userManagementSummaries.filter((entry) => entry.consentMode.mode !== "unavailable").length} consent records visible
                            </p>
                            <p className="mt-1 text-[11px] leading-5 text-gray-400">
                                Behavioral metrics remain unavailable when consent or source materialization is missing.
                            </p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/25 p-3" data-admin-user-management-metric-confidence="summary">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-black uppercase tracking-[0.08em] text-gray-400">Metric confidence</p>
                                <AdminTruthBadge
                                    state={lowConfidenceUsers.length ? "degraded" : userManagementSummaries.length ? "live" : "unavailable"}
                                    pendingInitialLoad={loading}
                                    hasUsableValue={userManagementSummaries.length > 0}
                                    className="px-1.5 py-0 text-[8px] tracking-[0.08em]"
                                />
                            </div>
                            <p className="mt-2 text-sm font-bold text-white">
                                {lowConfidenceUsers.length} collecting / low-confidence rows
                            </p>
                            <p className="mt-1 text-[11px] leading-5 text-gray-400">
                                Missing metrics show their producer, bridge, or materializer in the user detail drilldown.
                            </p>
                        </div>
                    </div>

                    {/* Desktop Users Table */}
                    <div className="hidden md:block glass-panel rounded-2xl overflow-hidden border border-white/5">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                                        <th className="p-4 font-medium">User</th>
                                        <th className="p-4 font-medium">Role</th>
                                        <th className="p-4 font-medium">Status</th>
                                        <th className="p-4 font-medium">Balance</th>
                                        <th className="p-4 font-medium">Analytics</th>
                                        <th className="p-4 font-medium">Joined</th>
                                        <th className="p-4 font-medium">Security</th>
                                        <th className="p-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center">
                                                <Loader2 className="w-6 h-6 text-brand-purple animate-spin mx-auto" />
                                            </td>
                                        </tr>
                                    ) : filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center text-gray-500">
                                                No users found matching &quot;{searchQuery}&quot;
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((user) => {
                                            const analytics = getUserAnalytics(user.uid);
                                            const behaviorRollup = getBehaviorRollup(user.uid);
                                            const engagement = analytics?.engagement ?? behaviorRollup?.engagement;
                                            const value = analytics?.value ?? behaviorRollup?.value;
                                            const truthState = getBehaviorTruthState(behaviorRollup);
                                            const engagementExplanation = buildEngagementBehavioralExplanation({ engagement, behaviorRollup, truthState });
                                            const valueExplanation = buildValueBehavioralExplanation({ value, behaviorRollup, truthState });
                                            const reviewDecision = buildBehaviorRollupReviewBadge({
                                                behaviorRollup,
                                                truthState,
                                                personalizedOutputShown: true,
                                            });
                                            const onboardingBadge = getOnboardingBadge(user, analytics);
                                            const managementSummary = userManagementSummaryById.get(user.uid);
                                            return (
                                            <tr key={user.uid} className="transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-bold text-gray-500 overflow-hidden relative">
                                                            {user.photoURL ? (
                                                                <Image src={user.photoURL} alt={user.displayName || "User"} fill sizes="40px" className="object-cover" />
                                                            ) : (
                                                                (user.displayName?.[0] || user.email?.[0] || "?").toUpperCase()
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-1 font-bold text-white">
                                                                {user.username ? `@${user.username}` : user.displayName || "No Name"}
                                                                {user.isVerified && <CheckCircle className="w-3 h-3 text-brand-purple" />}
                                                                <button onClick={() => { setEditUsernameUser(user); setEditUsernameInput(user.username || ""); }} className="p-1 rounded-md text-gray-500 hover:text-white transition-colors" title="Edit username"><Edit2 className="w-3 h-3" /></button>
                                                            </div>
                                                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">
                                                                {user.username ? user.displayName : user.uid.slice(0, 8)}
                                                            </div>
                                                            <div className="text-xs text-gray-500">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold border capitalize ${user.role === 'admin' ? "bg-red-500/10 text-red-400 border-red-500/20" : user.role === 'creator' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>
                                                        {user.role || 'user'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(user.status)}`}>
                                                            {(user.status || 'active').toUpperCase()}
                                                        </span>
                                                        <span className={`px-2 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${onboardingBadge.className}`}>
                                                            {onboardingBadge.label}
                                                        </span>
                                                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-300">
                                                            {managementSummary?.guestLinkStatus.state.replace(/_/g, " ") ?? "link unknown"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4 font-mono text-brand-purple">
                                                    <div className="flex items-center gap-2">
                                                        {user.gumDropsBalance} GD
                                                        <button onClick={() => setEditBalanceUser(user)} className="p-1 rounded-md text-gray-500 hover:text-white transition-colors" title="Edit balance" aria-label="Edit balance"><Edit2 className="w-3 h-3" /></button>
                                                        <button onClick={() => setHistoryUser(user)} className="p-1 rounded-md text-gray-500 hover:text-white transition-colors" title="View history" aria-label="View history"><ScrollText className="w-3 h-3" /></button>
                                                    </div>
                                                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-gray-500">
                                                        <span>{user.unlockedContent?.length || 0} unlocked</span>
                                                        <span>{user.notificationSettings?.browserPushEnabled ? "Push on" : "Push off"}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm">
                                                    {analytics ? (
                                                        <div
                                                            className="space-y-2"
                                                            data-admin-users-loading-lane="behavioralDetail"
                                                            data-user-behavior-rollup-source={behaviorRollup?.source ?? "unavailable"}
                                                            data-user-behavior-rollup-confidence={behaviorRollup?.confidence ?? "unknown"}
                                                        >
                                                            <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white">
                                                                <span>
                                                                {engagementExplanation.verdict} / Value {valueExplanation.verdict}
                                                                </span>
                                                                <AdminReviewBadge decision={reviewDecision} className="px-1.5 py-0 text-[8px] tracking-[0.08em]" />
                                                            </div>
                                                            <div className="text-[10px] text-gray-500">
                                                                {(getBehaviorAvailabilityLabel(behaviorRollup) ?? valueExplanation.statusLabel ?? engagementExplanation.statusLabel ?? "No recent signal")} / {behaviorRollup?.issues.length ?? 0} issues
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5 text-[10px] text-gray-400">
                                                                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                                                                    {managementSummary?.consentMode.mode.replace(/_/g, " ") ?? "consent unknown"}
                                                                </span>
                                                                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                                                                    {managementSummary?.personMetricConfidence.lowConfidenceCount ?? 0} low confidence
                                                                </span>
                                                            </div>
                                                            <details className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-gray-400">
                                                                <summary className="cursor-pointer font-bold text-gray-200">Metric source</summary>
                                                                <p className="mt-1">Activity: {managementSummary?.activitySummary.state ?? "unknown"} / {managementSummary?.lastActivity.source ?? "not loaded"}</p>
                                                                <p className="mt-1">Wallet: {managementSummary?.walletPaymentConfidence.source ?? "not loaded"}</p>
                                                                <p className="mt-1">Missing: {managementSummary?.personMetricConfidence.lowConfidenceMetrics[0]?.explanation ?? "none"}</p>
                                                            </details>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => void fetchUserDetail(user)}
                                                            className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-gray-300 transition-colors hover:border-brand-purple/40 hover:text-white"
                                                            data-admin-users-loading-lane="selectedUser"
                                                            disabled={selectedUserDetailLoading === user.uid}
                                                        >
                                                            {selectedUserDetailLoading === user.uid ? "Loading detail" : "Load detail"}
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="p-4 text-gray-500 text-sm">
                                                    {formatJoined(user.createdAt)}
                                                    {analytics && (
                                                        <>
                                                            <div className="mt-2 text-[10px] text-gray-500">{formatLastSeen(analytics.lastSeenAt)}</div>
                                                            <div className="mt-1 text-[10px] text-gray-500">{formatLastPurchase(analytics.lastPurchaseAt)}</div>
                                                        </>
                                                    )}
                                                </td>
                                                <td className="p-4 text-sm">
                                                    {(user.securityFlags?.ripAttempts ?? 0) > 0 ? (
                                                        <button
                                                            onClick={() => setSecurityDetailsUser(user)}
                                                            className="flex items-center gap-1 text-red-500 font-bold bg-red-500/10 px-2 py-1 rounded-full w-fit border border-red-500/20 hover:bg-red-500/20 transition-colors"
                                                            title="View security dossier"
                                                            aria-label="View security dossier"
                                                        >
                                                            <AlertTriangle className="w-3 h-3" />
                                                            {user.securityFlags!.ripAttempts} Flags
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-600 font-medium">Clean</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {user.role !== 'creator' && (
                                                            <button onClick={() => handleRoleUpdate(user.uid, 'creator')} className="p-1.5 text-gray-400 rounded transition-colors" title="Promote to creator" aria-label="Promote to creator"><Plus className="w-3 h-3" /></button>
                                                        )}
                                                        <button
                                                            onClick={() => handleVerification(user.uid, !user.isVerified)}
                                                            className={`p-1.5 rounded transition-colors ${user.isVerified ? "text-brand-purple " : "text-gray-400 "}`}
                                                            title={user.isVerified ? "Remove verification badge" : "Add verification badge"}
                                                            aria-label={user.isVerified ? "Remove verification badge" : "Add verification badge"}
                                                        >
                                                            <CheckCircle className="w-3 h-3" />
                                                        </button>
                                                        <Link href={`/admin/user/${user.uid}`} className="p-1.5 rounded text-brand-purple transition-colors" title="Open user analytics" aria-label="Open user analytics">
                                                            <TrendingUp className="w-3 h-3" />
                                                        </Link>
                                                        <div className="w-px h-4 bg-white/10 mx-1" />
                                                        {(!user.status || user.status === 'active') ? (
                                                            <>
                                                                <button onClick={() => { setActionUser(user); setActionType('suspend'); }} className="p-1.5 rounded text-gray-400 transition-colors" title="Suspend user" aria-label="Suspend user"><AlertTriangle className="w-3 h-3" /></button>
                                                                <button onClick={() => { setActionUser(user); setActionType('ban'); }} className="p-1.5 rounded text-gray-400 transition-colors" title="Ban user" aria-label="Ban user"><Ban className="w-3 h-3" /></button>
                                                            </>
                                                        ) : (
                                                            <button onClick={() => { setActionUser(user); setActionType('activate'); }} className="p-1.5 rounded text-brand-purple transition-colors" title="Reactivate user" aria-label="Reactivate user"><CheckCircle className="w-3 h-3" /></button>
                                                        )}
                                                        <button onClick={() => void fetchUserDetail(user, { openContent: true })} className="p-1.5 rounded text-gray-400 transition-colors" title="Manage content access" aria-label="Manage content access"><Lock className="w-3 h-3" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )})
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Card Layout */}
                    <div className="md:hidden flex flex-col gap-4">
                        {loading ? (
                            <div className="p-8 text-center glass-panel rounded-2xl"><Loader2 className="w-6 h-6 text-brand-purple animate-spin mx-auto" /></div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 glass-panel rounded-2xl">No users found.</div>
                        ) : (
                            filteredUsers.map((user) => {
                                const analytics = getUserAnalytics(user.uid);
                                const behaviorRollup = getBehaviorRollup(user.uid);
                                const engagement = analytics?.engagement ?? behaviorRollup?.engagement;
                                const value = analytics?.value ?? behaviorRollup?.value;
                                const truthState = getBehaviorTruthState(behaviorRollup);
                                const engagementExplanation = buildEngagementBehavioralExplanation({ engagement, behaviorRollup, truthState });
                                const valueExplanation = buildValueBehavioralExplanation({ value, behaviorRollup, truthState });
                                const reviewDecision = buildBehaviorRollupReviewBadge({
                                    behaviorRollup,
                                    truthState,
                                    personalizedOutputShown: true,
                                });
                                const onboardingBadge = getOnboardingBadge(user, analytics);
                                const managementSummary = userManagementSummaryById.get(user.uid);
                                return (
                                <div key={user.uid} className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col gap-4 relative overflow-hidden group">
                                    {/* Background Accent based on Role/Status */}
                                    <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -z-10 opacity-20 ${user.status === 'banned' ? 'bg-red-500' : user.role === 'admin' ? 'bg-red-500' : user.role === 'creator' ? 'bg-brand-purple' : 'bg-white'}`} />

                                    {/* Header: Avatar, Name, Role, Status */}
                                    <div className="flex gap-4 items-center">
                                        <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-bold text-gray-500 overflow-hidden shrink-0 relative border border-white/10 shadow-inner">
                                            {user.photoURL ? (
                                                <Image src={user.photoURL} alt={user.displayName || "User"} fill sizes="56px" className="object-cover" />
                                            ) : (
                                                (user.displayName?.[0] || user.email?.[0] || "?").toUpperCase()
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <div className="truncate">
                                                    <div className="flex items-center gap-1.5 font-bold text-white text-base">
                                                        <span className="truncate">{user.username ? `@${user.username}` : user.displayName || "No Name"}</span>
                                                        {user.isVerified && <CheckCircle className="w-4 h-4 text-brand-purple shrink-0" />}
                                                        <button onClick={() => { setEditUsernameUser(user); setEditUsernameInput(user.username || ""); }} className="p-1 rounded-md text-gray-500 hover:text-white transition-colors shrink-0" title="Edit username"><Edit2 className="w-4 h-4" /></button>
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate mb-0.5">
                                                        {user.username ? user.displayName : user.uid.slice(0, 8)}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 font-mono truncate">{user.email}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${user.role === 'admin' ? "bg-red-500/10 text-red-400 border-red-500/30" : user.role === 'creator' ? "bg-purple-500/10 text-purple-400 border-purple-500/30" : "bg-gray-500/10 text-gray-400 border-gray-500/30"}`}>
                                                    {user.role || 'user'}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getStatusColor(user.status)}`}>
                                                    {user.status || 'active'}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${onboardingBadge.className}`}>
                                                    {onboardingBadge.label}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-gray-300">
                                                    {managementSummary?.guestLinkStatus.state.replace(/_/g, " ") ?? "link unknown"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Metrics / Quick Stats */}
                                        <div className="grid grid-cols-2 gap-3 p-3 bg-black/40 rounded-xl border border-white/5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500 font-bold uppercase"><ScrollText className="w-3 h-3 inline mr-1" />Joined</span>
                                                <span className="text-sm font-mono text-gray-300">
                                                    {format((user.createdAt as any)?.toMillis?.() || user.createdAt || Date.now(), 'MM/dd/yy')}
                                            </span>
                                        </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500 font-bold uppercase"><DollarSign className="w-3 h-3 inline mr-1" />Balance</span>
                                                <span className="text-sm font-mono text-brand-purple font-bold">
                                                    {user.gumDropsBalance} GD
                                                </span>
                                            </div>
                                        </div>

                                        {analytics ? (
                                            <div
                                                className="grid grid-cols-2 gap-3 p-3 bg-black/25 rounded-xl border border-white/5"
                                                data-admin-users-loading-lane="behavioralDetail"
                                                data-user-behavior-rollup-source={behaviorRollup?.source ?? "unavailable"}
                                                data-user-behavior-rollup-confidence={behaviorRollup?.confidence ?? "unknown"}
                                            >
                                                <div className="col-span-2 flex justify-end">
                                                    <AdminReviewBadge decision={reviewDecision} className="px-1.5 py-0.5 text-[8px] tracking-[0.08em]" />
                                                </div>
                                                <div className="col-span-2 grid gap-2 rounded-lg border border-white/10 bg-black/20 p-2 text-[10px] text-gray-300">
                                                    <div className="flex justify-between gap-2">
                                                        <span className="text-gray-500">Consent</span>
                                                        <span>{managementSummary?.consentMode.mode.replace(/_/g, " ") ?? "unknown"}</span>
                                                    </div>
                                                    <div className="flex justify-between gap-2">
                                                        <span className="text-gray-500">Confidence</span>
                                                        <span>{managementSummary?.personMetricConfidence.lowConfidenceCount ?? 0} low-confidence</span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-gray-500 font-bold uppercase"><Users className="w-3 h-3 inline mr-1" />Events</span>
                                                    <span className="text-sm font-mono text-gray-300">{behaviorRollup?.totalActions ?? analytics.eventCount ?? 0}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-gray-500 font-bold uppercase"><TrendingUp className="w-3 h-3 inline mr-1" />Unwraps</span>
                                                    <span className="text-sm font-mono text-gray-300">{behaviorRollup?.unwraps ?? analytics.unwrapCount ?? 0}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-gray-500 font-bold uppercase"><Clock3 className="w-3 h-3 inline mr-1" />Watch</span>
                                                    <span className="text-sm font-mono text-gray-300">{formatWatchHours(behaviorRollup?.watchTimeMs, analytics.watchHours)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-gray-500 font-bold uppercase"><Activity className="w-3 h-3 inline mr-1" />Engagement</span>
                                                    <span className="text-sm font-mono text-gray-300">{engagementExplanation.verdict}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-gray-500 font-bold uppercase"><DollarSign className="w-3 h-3 inline mr-1" />Value</span>
                                                    <span className="text-sm font-mono text-gray-300">{valueExplanation.verdict}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => void fetchUserDetail(user)}
                                                className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-gray-300 transition-colors hover:border-brand-purple/40 hover:text-white"
                                                data-admin-users-loading-lane="selectedUser"
                                                disabled={selectedUserDetailLoading === user.uid}
                                            >
                                                {selectedUserDetailLoading === user.uid ? "Loading behavior detail" : "Load behavior detail"}
                                            </button>
                                        )}

                                    {/* Security Flag (Full Width Button if flags exist) */}
                                    {(user.securityFlags?.ripAttempts ?? 0) > 0 ? (
                                        <button
                                            onClick={() => setSecurityDetailsUser(user)}
                                            className="w-full flex items-center justify-between bg-red-500/10 border border-red-500/30 p-3 rounded-xl hover:bg-red-500/20 active:scale-[0.98] transition-all"
                                        >
                                            <div className="flex items-center gap-2 text-red-500 font-bold text-sm">
                                                <AlertTriangle className="w-4 h-4 animate-pulse duration-1000" />
                                                <span>{user.securityFlags!.ripAttempts} Security Flags</span>
                                            </div>
                                            <span className="text-xs font-bold text-red-400 bg-red-500/20 px-2 py-1 rounded-full uppercase tracking-wider">Review Request</span>
                                        </button>
                                    ) : null}

                                    {/* Action Grid */}
                                    <div className="grid grid-cols-4 gap-2 mt-1">
                                        <button onClick={() => setEditBalanceUser(user)} className="flex flex-col items-center justify-center p-3 bg-white/5 hover:bg-brand-purple/20 border border-white/10 rounded-xl transition-colors text-gray-400 hover:text-brand-purple hover:border-brand-purple/50 group">
                                            <Edit2 className="w-5 h-5 mb-1 group-active:scale-95 transition-transform" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Balance</span>
                                        </button>
                                        <button onClick={() => void fetchUserDetail(user, { openContent: true })} className="flex flex-col items-center justify-center p-3 bg-white/5 hover:bg-blue-500/20 border border-white/10 rounded-xl transition-colors text-gray-400 hover:text-blue-400 hover:border-blue-500/50 group">
                                            <Lock className="w-5 h-5 mb-1 group-active:scale-95 transition-transform" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Content</span>
                                        </button>
                                        <button onClick={() => setHistoryUser(user)} className="flex flex-col items-center justify-center p-3 bg-white/5 hover:bg-gray-500/20 border border-white/10 rounded-xl transition-colors text-gray-400 hover:text-white hover:border-white/50 group">
                                            <ScrollText className="w-5 h-5 mb-1 group-active:scale-95 transition-transform" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">History</span>
                                        </button>
                                        <button onClick={() => { setActionUser(user); setActionType('ban'); }} className="flex flex-col items-center justify-center p-3 bg-white/5 hover:bg-red-500/20 border border-white/10 rounded-xl transition-colors text-gray-400 hover:text-red-500 hover:border-red-500/50 group">
                                            <Ban className="w-5 h-5 mb-1 group-active:scale-95 transition-transform" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Ban</span>
                                        </button>
                                    </div>

                                    <Link href={`/admin/user/${user.uid}`} className="flex items-center justify-center gap-2 rounded-xl border border-brand-purple/25 bg-brand-purple/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-brand-purple">
                                        <TrendingUp className="w-4 h-4" />
                                        View Analytics
                                    </Link>

                                    {/* Sub Actions (Roles & Verification) */}
                                    <div className="flex gap-2 w-full pt-1">
                                        <div className="flex-1">
                                            <select
                                                value={user.role || 'user'}
                                                onChange={(e) => handleRoleUpdate(user.uid, e.target.value as any)}
                                                className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-brand-purple font-bold uppercase tracking-wider appearance-none text-center outline-none focus:border-brand-purple hover:bg-black/80 transition-colors"
                                            >
                                                <option value="user">User Role</option>
                                                <option value="creator">Creator Role</option>
                                                <option value="admin">Admin Role</option>
                                            </select>
                                        </div>
                                        <button
                                            onClick={() => handleVerification(user.uid, !user.isVerified)}
                                            className={`flex-1 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border ${user.isVerified ? "bg-brand-purple/10 text-brand-purple border-brand-purple/20" : "bg-zinc-800 text-gray-400 border-white/5"}`}
                                        >
                                            {user.isVerified ? "Verified" : "Verify Badge"}
                                        </button>
                                    </div>
                                </div>
                            )})
                        )}
                    </div>
                </>
            )}

            {/* Platform Feedback View */}
            {viewMode === 'feedback' && (
                <div className="space-y-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-0">
                    {loadingFeedback ? (
                        <div className="rounded-[1.75rem] border border-white/5 bg-black/20 p-8 text-center sm:p-12">
                            <Loader2 className="w-8 h-8 text-brand-purple animate-spin mx-auto mb-4" />
                            <p className="text-gray-500">Loading feedback submissions...</p>
                        </div>
                    ) : feedback.length === 0 ? (
                        <div className="glass-panel rounded-[1.75rem] border border-white/5 p-8 text-center sm:rounded-3xl sm:p-12">
                            <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">No feedback submissions found yet.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3 sm:gap-4">
                            {feedback.map((item) => (
                                <div key={item.id} className="glass-panel space-y-4 overflow-hidden rounded-[1.75rem] border border-white/5 p-4 transition-colors hover:border-white/10 sm:rounded-3xl sm:p-6">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-gray-500">
                                                {(item.email?.[0] || "?").toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="break-all text-sm font-bold text-white sm:text-base">{item.email || 'Anonymous'}</div>
                                                <div className="text-xs text-gray-500">
                                                    {typeof item.timestamp === "number" && item.timestamp > 0 ? format(item.timestamp, 'MMM d, h:mm a') : 'Just now'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 sm:max-w-[45%] sm:justify-end">
                                            {item.rating ? (
                                                <div className="rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1 text-xs font-bold text-brand-purple">
                                                    {item.rating} / 5 Rating
                                                </div>
                                            ) : null}
                                            {item.category ? (
                                                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gray-300">
                                                    {item.category}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="relative rounded-2xl border border-white/5 bg-white/5 p-3 sm:p-4">
                                        <div className="absolute top-4 right-4 opacity-5 pointer-events-none">
                                            <MessageSquare className="w-12 h-12" />
                                        </div>
                                        <p className="relative z-10 whitespace-pre-wrap break-words text-sm text-gray-300 sm:text-base">{item.message}</p>
                                    </div>
                                    <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="max-w-full break-all text-[10px] font-mono uppercase tracking-widest text-gray-600">
                                            User ID: {item.userId}
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSearchQuery(item.userId);
                                                setViewMode('users');
                                            }}
                                            className="self-start text-xs font-bold text-brand-purple hover:underline sm:self-auto"
                                        >
                                            View User Profile
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {viewMode === 'tasks' && (
                isLocalAdminUiTestSession ? (
                    <div
                        className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 text-sm text-gray-300"
                        data-admin-users-tasks-fixture-boundary="true"
                        data-admin-users-tasks-fixture-state="source_missing"
                    >
                        <p className="font-bold text-white">Task controls require verified admin task data.</p>
                        <p className="mt-2 text-xs leading-5 text-gray-400">
                            Local UI review keeps the task builder read-only and skips admin task reads/writes until a real admin session is available.
                        </p>
                    </div>
                ) : (
                    <AdminTasksManager users={users} />
                )
            )}

            {/* Action Modals */}
            {(actionType || editUsernameUser || editBalanceUser || contentUser || historyUser || securityDetailsUser) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    {editUsernameUser && (
                        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                            <h3 className="text-xl font-bold text-white mb-2">Edit Username</h3>
                            <p className="text-gray-400 mb-6">
                                Change username for <strong>{editUsernameUser.email}</strong>
                            </p>
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">New Username</label>
                                <input
                                    type="text"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-brand-purple outline-none"
                                    placeholder="Enter new username..."
                                    value={editUsernameInput}
                                    onChange={(e) => setEditUsernameInput(e.target.value)}
                                />
                                <p className="mt-2 text-xs text-brand-purple/70">Requires exactly 3-20 chars (a-z, 0-9, _).</p>
                                <p className="mt-1 text-xs text-red-400 font-bold">Warning: This instantly alters the creator&apos;s public profile URL!</p>
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button variant="ghost" onClick={() => setEditUsernameUser(null)}>Cancel</Button>
                                <Button
                                    variant="brand"
                                    onClick={handleUpdateUsername}
                                    disabled={processing || !editUsernameInput || editUsernameInput === editUsernameUser.username}
                                >
                                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {actionType && actionUser && (
                        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                            <h3 className="text-xl font-bold text-white mb-2">
                                {actionType === 'ban' ? 'Ban User' : actionType === 'suspend' ? 'Suspend User' : 'Reactivate User'}
                            </h3>
                            <p className="text-gray-400 mb-6">
                                Are you sure you want to {actionType} <strong>{actionUser.email}</strong>?
                                {actionType !== 'activate' && " They will lose access to the platform."}
                            </p>
                            {actionType !== 'activate' && (
                                <div className="mb-6">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Reason</label>
                                    <textarea
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-brand-purple outline-none resize-none h-24"
                                        placeholder={`Reason for ${actionType}...`}
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                    />
                                </div>
                            )}
                            <div className="flex justify-end gap-3">
                                <Button variant="ghost" onClick={() => setActionType(null)}>Cancel</Button>
                                <Button
                                    variant={actionType === 'activate' ? 'brand' : 'danger'}
                                    onClick={handleUpdateStatus}
                                    disabled={processing}
                                >
                                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : `Confirm ${actionType === 'ban' ? 'Ban' : actionType === 'suspend' ? 'Suspend' : 'Reactivate'}`}
                                </Button>
                            </div>
                        </div>
                    )}
                    {editBalanceUser && (
                        <BalanceAdjustmentModal
                            user={editBalanceUser}
                            onClose={() => setEditBalanceUser(null)}
                            onSuccess={(newBalance) => {
                                setUsers((current) => current.map((u) => (u.uid === editBalanceUser.uid ? { ...u, gumDropsBalance: newBalance } : u)));
                            }}
                        />
                    )}
                    {historyUser && (
                        <TransactionHistoryModal
                            user={historyUser}
                            onClose={() => setHistoryUser(null)}
                        />
                    )}
                    {contentUser && (
                        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                            <h3 className="text-xl font-bold text-white mb-2">Manage Content</h3>
                            <p className="text-gray-400 mb-6">Unlocked drops for <strong>{contentUser.username ? `@${contentUser.username}` : contentUser.displayName || contentUser.email}</strong>.</p>
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Unlocked Drops ({contentUser.unlockedContent?.length || 0})</label>
                                <div className="max-h-40 overflow-y-auto space-y-2 mb-4">
                                    {contentUser.unlockedContent && contentUser.unlockedContent.length > 0 ? (
                                        contentUser.unlockedContent.map(dropId => (
                                            <div key={dropId} className="flex items-center justify-between bg-white/5 p-2 rounded-lg text-sm text-gray-300">
                                                <div className="min-w-0">
                                                    <span className="block truncate">{dropReferences[dropId]?.title || dropId}</span>
                                                    <span className="block truncate text-[11px] text-gray-500">{dropId}</span>
                                                </div>
                                                <button onClick={() => handleManageContent('remove', dropId)} disabled={contentActionProcessing} className="p-1 transition-colors" title="Revoke access" aria-label="Revoke access"><Ban className="w-3 h-3" /></button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-gray-600 text-sm italic">No content unlocked.</div>
                                    )}
                                </div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Grant Access (Drop ID)</label>
                                <div className="flex gap-2">
                                    <input type="text" className="w-full bg-black/50 border border-white/10 rounded-xl p-2 text-white focus:border-brand-purple outline-none text-sm" placeholder="Enter Drop ID..." value={contentInput} onChange={(e) => setContentInput(e.target.value)} />
                                    <Button size="sm" variant="brand" disabled={contentActionProcessing || !contentInput} onClick={() => handleManageContent('add', contentInput)}><Plus className="w-4 h-4" /></Button>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button variant="ghost" onClick={() => { setContentUser(null); setContentInput(""); }}>Close</Button>
                            </div>
                        </div>
                    )}
                    {securityDetailsUser && (
                        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-red-500" /> Security Dossier
                            </h3>
                            <p className="text-gray-400 mb-6 flex items-center gap-2">
                                Target: <span className="text-white font-bold">{securityDetailsUser.username ? `@${securityDetailsUser.username}` : securityDetailsUser.displayName || securityDetailsUser.email}</span>
                            </p>

                            <div className="space-y-4 mb-6">
                                <div className="bg-black/50 p-4 rounded-xl border border-white/5">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs text-gray-500 font-bold uppercase">Total Violations</span>
                                        <span className="text-lg font-black text-red-500">{securityDetailsUser.securityFlags?.ripAttempts || 0}</span>
                                    </div>
                                    {securityDetailsUser.securityFlags?.lastViolation && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-gray-500 font-bold uppercase">Last Incident</span>
                                            <span className="text-sm font-mono text-gray-300">
                                                {format(new Date(securityDetailsUser.securityFlags.lastViolation), 'MMM d, yyyy h:mm a')}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                                    <span className="text-xs text-red-400 font-bold uppercase block mb-1">What triggered it</span>
                                    <p className="text-sm font-semibold text-red-200">
                                        {selectedSecurityDescriptor?.label || "Viewer protection warning"}
                                    </p>
                                    <p className="mt-2 text-sm text-red-300 break-words">
                                        {securityDetailsUser.securityFlags?.lastViolationMessage || selectedSecurityDescriptor?.message || "The viewer logged a protection warning for this account."}
                                    </p>
                                </div>

                                {securityDetailsUser.securityFlags?.lastViolationDropId && (
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <span className="text-xs text-gray-500 font-bold uppercase block mb-1">Where it happened</span>
                                        <p className="mb-2 text-sm text-gray-300">
                                            {selectedSecurityDescriptor?.locationLabel || "Protected viewer"}
                                        </p>
                                        <p className="text-sm text-brand-purple font-mono break-all">
                                            {securityDetailsUser.securityFlags.lastViolationDropId}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                <Button variant="ghost" onClick={() => setSecurityDetailsUser(null)}>Close Dossier</Button>
                                {(!securityDetailsUser.status || securityDetailsUser.status === 'active') && (
                                    <Button variant="danger" onClick={() => {
                                        setSecurityDetailsUser(null);
                                        setActionUser(securityDetailsUser);
                                        setActionType('ban');
                                    }}>
                                        Immediate Ban
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
