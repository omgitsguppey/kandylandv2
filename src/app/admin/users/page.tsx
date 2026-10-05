"use client";

import { Textarea } from "@/components/ui/textarea";
import { Surface } from "@/components/ui/content-layout";
import { Input } from "@/components/ui/input";
import { TableScrollArea } from "@/components/ui/data-table";


import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { UserProfile } from "@/types/db";
import { Loader2, Search, Shield, Ban, Plus, MessageSquare, DollarSign, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { BalanceAdjustmentPanel } from "@/components/Admin/BalanceAdjustmentPanel";
import { TransactionHistoryPanel } from "@/components/Admin/TransactionHistoryPanel";
import { authFetch } from "@/lib/authFetch";
import { isAdminUiTestSessionUser } from "@/lib/admin/admin-ui-test-session";
import { cn } from "@/lib/utils";
import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import { AdminUserDirectory, AdminUserMetricCard, AdminUsersOperations, AdminUsersOperatorEntryBand } from "@/components/creative-tim/kandydrops/admin-users/AdminUsersOperations";
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
            toast.info("permission_blocked: user detail requires verified admin access; user source is not loaded in this fixture.");
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
    const formatOptionalCount = (value: number | null | undefined) =>
        typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "No source";
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
            <AdminUserMetricCard
                id={card.id}
                label={card.label}
                primaryValue={String(card.primaryValue)}
                secondaryValue={card.secondaryValue ?? card.explanation}
                title={card.explanation + (card.formula ? " Formula: " + card.formula + "." : "") + (card.warnings.length ? " Warnings: " + card.warnings.join(" | ") : "")}
                state={metricState}
                pendingInitialLoad={!summary && summaryLoading}
                hasUsableValue={hasUsableValue}
                reviewDecision={reviewDecision ?? null}
                source={card.sourceLabel ?? card.sourceTruth}
                freshness={card.freshnessState}
                scope={card.scope}
                reason={card.reasonCode ?? "none"}
                generatedAtUtc={card.generatedAtUtc}
                sourceDetail={sourceDetail}
                footerReason={footerReason}
            />
        );
    };
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
    const exactIdentityCount = userManagementSummaries.filter((entry) => entry.identity.identityConfidence === "exact").length;
    const identityHandoffSummaryLabel = isLocalAdminUiTestSession
        ? "-- exact / -- shown"
        : `${exactIdentityCount} exact / ${userManagementSummaries.length} shown`;
    const metricConfidenceSummaryLabel = isLocalAdminUiTestSession
        ? "-- collecting / low-confidence rows"
        : `${lowConfidenceUsers.length} collecting / low-confidence rows`;
    const userSummaryTruthState = pageData.truthState;
    const usersRealtimePulseTruthState = pageData.realtimePulseTruthState;
    const getOnboardingBadge = (user: UserProfile, analytics?: UserAnalytics) =>
        user.onboardingCompleted || (analytics?.onboardingCompletionCount || 0) > 0
            ? {
                label: "Onboarding Complete",
                className: "text-success bg-success/10 border-success/20",
            }
            : (analytics?.onboardingStartCount || 0) > 0
                ? {
                    label: "Onboarding Live",
                    className: "text-warning bg-warning/10 border-warning/20",
                }
                : {
                    label: "Onboarding Pending",
                    className: "text-muted-foreground bg-secondary border-border",
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

    const adminDirectoryRecords = filteredUsers.map((user) => {
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
        const managementSummary = userManagementSummaryById.get(user.uid);

        return {
            user,
            joined: formatJoined(user.createdAt),
            lastSeen: analytics ? formatLastSeen(analytics.lastSeenAt) : undefined,
            lastPurchase: analytics ? formatLastPurchase(analytics.lastPurchaseAt) : undefined,
            onboarding: getOnboardingBadge(user, analytics),
            guestLinkLabel: managementSummary?.guestLinkStatus.state.replace(/_/g, " ") ?? "link unknown",
            behavior: {
                loaded: Boolean(analytics),
                engagement: engagementExplanation.verdict,
                engagementReason: engagementExplanation.reasons[0] ?? engagementExplanation.summary,
                value: valueExplanation.verdict,
                valueReason: valueExplanation.reasons[0] ?? valueExplanation.summary,
                mathMode: behaviorRollup?.mathCalibration?.activeMode ?? "unavailable",
                mathVerdict: behaviorRollup?.mathCalibration?.verdict ?? "unavailable",
                availability: getBehaviorAvailabilityLabel(behaviorRollup) ?? valueExplanation.statusLabel ?? engagementExplanation.statusLabel ?? "No recent signal",
                issueCount: behaviorRollup?.issues.length ?? 0,
                consent: managementSummary?.consentMode.mode.replace(/_/g, " ") ?? "consent unknown",
                lowConfidence: managementSummary?.personMetricConfidence.lowConfidenceCount ?? 0,
                activitySource: (managementSummary?.activitySummary.state ?? "unknown") + " / " + (managementSummary?.lastActivity.source ?? "not loaded"),
                walletSource: managementSummary?.walletPaymentConfidence.source ?? "not loaded",
                missingMetric: managementSummary?.personMetricConfidence.lowConfidenceMetrics[0]?.explanation ?? "none",
                activityEvents: managementSummary
                    ? formatOptionalCount(managementSummary.activitySummary.totalEvents)
                    : formatOptionalCount(behaviorRollup?.totalActions),
                unwraps: managementSummary
                    ? formatOptionalCount(managementSummary.dropUnwrapMetrics.unwraps)
                    : formatOptionalCount(behaviorRollup?.unwraps),
                watchTime: formatWatchHours(behaviorRollup?.watchTimeMs, analytics?.watchHours),
                source: behaviorRollup?.source ?? "unavailable",
                confidence: behaviorRollup?.confidence ?? "unknown",
                reviewDecision,
            },
        };
    });
    const handleUpdateStatus = async () => {
        if (!actionUser || !actionType) return;
        if (isLocalAdminUiTestSession) {
            toast.info("permission_blocked: user status changes require verified admin access.");
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
            toast.info("permission_blocked: username changes require verified admin access.");
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
            toast.info("permission_blocked: content access changes require verified admin access.");
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
            toast.info("permission_blocked: role changes require verified admin access.");
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
            toast.info("permission_blocked: verification changes require verified admin access.");
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
            case 'banned': return 'text-destructive bg-destructive/10 border-destructive/20';
            case 'suspended': return 'text-primary bg-primary/10 border-primary/20';
            default: return 'text-primary bg-primary/10 border-primary/20';
        }
    };

    return (
        <div className="space-y-4 md:space-y-5">
            <PageViewEvent eventName="admin_users_viewed" />
            <AdminUsersOperatorEntryBand
                eyebrow="Admin Users"
                title={viewMode === 'users' ? 'User Management' : viewMode === 'feedback' ? 'Platform Feedback' : 'Daily Task Control'}
                subtitle={viewMode === 'users'
                    ? pageData.subtitle
                    : viewMode === 'feedback'
                        ? 'Review user-submitted feedback from daily tasks.'
                        : 'Create daily missions and review latest task-trigger activity.'}
                sourceSignals={viewMode === "users" ? (
                    <div
                        className="flex flex-wrap items-center gap-2"
                        data-admin-users-snapshot-state={userSummaryTruthState}
                        data-admin-users-pulse-state={usersRealtimePulse.pulseState}
                    >
                        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/25 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                            <AdminTruthBadge
                                state={userSummaryTruthState}
                                pendingInitialLoad={!summary && summaryLoading}
                                hasUsableValue={Boolean(summary?.kpiCards?.length)}
                                className="px-1.5 py-0 text-[8px] tracking-wide"
                            />
                            <span>Snapshot totals</span>
                        </div>
                        <div
                            className="inline-flex items-center gap-2 rounded-full border border-border bg-background/25 px-2.5 py-1.5 text-[11px] text-muted-foreground"
                            data-admin-users-pulse-label={usersRealtimePulse.pulseLabel}
                        >
                            <AdminTruthBadge
                                state={usersRealtimePulseTruthState}
                                pendingInitialLoad={!summary && summaryLoading}
                                hasUsableValue={Boolean(summary)}
                                className="px-1.5 py-0 text-[8px] tracking-wide"
                            />
                            <span>{usersRealtimePulse.pulseLabel}</span>
                        </div>
                    </div>
                ) : null}
                controls={
                    <>
                    <Button variant="ghost"
                        onClick={() => setViewMode('users')}
                        className={cn(
                            "inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all",
                            viewMode === 'users' ? "bg-primary text-foreground border-primary" : "bg-secondary text-muted-foreground border-border hover:bg-secondary"
                        )}
                    >
                        <Shield className="w-4 h-4" /> Users
                    </Button>
                    <Button variant="ghost"
                        onClick={() => setViewMode('feedback')}
                        className={cn(
                            "inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all",
                            viewMode === 'feedback' ? "bg-primary text-foreground border-primary" : "bg-secondary text-muted-foreground border-border hover:bg-secondary"
                        )}
                    >
                        <MessageSquare className="w-4 h-4" /> Feedback
                    </Button>
                    <Button variant="ghost"
                        onClick={() => setViewMode('tasks')}
                        className={cn(
                            "inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all",
                            viewMode === 'tasks' ? "bg-primary text-foreground border-primary" : "bg-secondary text-muted-foreground border-border hover:bg-secondary"
                        )}
                    >
                        <DollarSign className="w-4 h-4" /> Tasks
                    </Button>
                    </>
                }
            />

            {isLocalAdminUiTestSession ? (
                <div
                    className="rounded-2xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning"
                    data-admin-users-fixture-boundary="true"
                    data-admin-users-fixture-state="source_missing"
                >
                    <p className="font-bold">source_missing fixture.</p>
                    <p className="mt-1 text-xs leading-5 text-warning/80">
                        source_missing: users source is not loaded in this fixture. Protected user records, metrics, feedback, task controls, identity, payment, and content access stay blocked.
                    </p>
                </div>
            ) : null}

            {viewMode === 'users' && (
                <AdminUsersOperations
                    mode="directory"
                    eyebrow="User operations"
                    title="Evidence-led user directory"
                    description="Search a user, inspect the current source state, then take a targeted account action without separating identity, wallet, behavior, or protection work into competing dashboards."
                >
                    <TableScrollArea
                        className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]"
                        data-admin-users-stats-layout="evidence-ribbon"
                        data-admin-users-truth-source={summary?.truthSnapshot?.sourceTruth ?? "unavailable"}
                        data-admin-users-truth-freshness={summary?.truthSnapshot?.sourceFreshness ?? "unavailable"}
                    >
                        {(summary?.kpiCards ?? []).map((card) => (
                            <div key={card.id} className="min-w-[12.5rem] flex-1">
                                {renderSummaryMetricCard(card)}
                            </div>
                        ))}
                    </TableScrollArea>

                    <div className="space-y-4">
                        <div className="flex min-h-14 items-center gap-3 border-y border-border px-2">
                            <Search className="w-5 h-5 text-muted-foreground ml-2" />
                            <Input
                                type="text"
                                placeholder="Search users by email, name, username, or ID..."
                                className="bg-transparent border-none outline-none text-foreground w-full h-10 placeholder:text-muted-foreground"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <section className="border-y border-border py-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                        <TrendingUp className="w-4 h-4 text-primary" />
                                        Top behavior users
                                    </div>
                                    <p className="mt-1 text-[11px] text-muted-foreground">
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
                                        <Button variant="ghost"
                                            key={filter}
                                            type="button"
                                            onClick={() => {
                                                setBehaviorLeaderboardPage(1);
                                                setBehaviorLeaderboardFilter(filter);
                                            }}
                                            className={cn(
                                                "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                                                behaviorLeaderboardFilter === filter
                                                    ? "border-primary/50 bg-primary/15 text-foreground"
                                                    : "border-border bg-secondary text-muted-foreground hover:text-foreground",
                                            )}
                                        >
                                            {filter.replace(/_/g, " ")}
                                        </Button>
                                    ))}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                    {behaviorLeaderboard
                                        ? `${behaviorLeaderboard.totalEligibleUsers} eligible - page size ${behaviorLeaderboard.pageSize}`
                                        : "Loading behavior source"}
                                </div>
                            </div>
                            <div className="mt-3 grid gap-2">
                                {!behaviorLeaderboard && behaviorLeaderboardLoading ? (
                                    <p className="text-sm text-muted-foreground">Loading behavior leaderboard…</p>
                                ) : leaderboardRows.length === 0 ? (
                                    <p
                                        className="text-sm text-muted-foreground"
                                        data-admin-users-behavior-empty-state="materializer"
                                    >
                                        {behaviorLeaderboard?.warnings[0] || "Run behavior materializer or inspect event facts."}
                                    </p>
                                ) : leaderboardRows.map((row, index) => (
                                    <Link
                                        key={row.userId}
                                        href={`/admin/user/${row.userId}`}
                                        className="rounded-2xl border border-border bg-background/25 px-3 py-3 transition-colors hover:border-primary/35 hover:bg-background/35"
                                        data-admin-behavior-row-user-id={row.userId}
                                        data-admin-behavior-row-source={row.sourceTruth}
                                        data-admin-behavior-row-freshness={row.freshnessState}
                                        data-admin-behavior-row-identity-state={row.userIdentityState}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-primary">#{((leaderboardPageNumber - 1) * leaderboardPageSize) + index + 1}</span>
                                                    <p className="truncate text-sm font-semibold text-foreground">
                                                        {row.username ? `@${row.username}` : row.displayName}
                                                    </p>
                                                </div>
                                                <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                                                    {row.userIdentityState === "resolved" ? row.shortUserId : `UID ${row.shortUserId}`}
                                                </p>
                                                <p className="mt-1 text-[11px] text-muted-foreground">
                                                    Last meaningful action {formatUtcLabel(row.lastMeaningfulActionAtUtc)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-foreground">{row.engagementScore}</p>
                                                <p className="text-[10px] text-muted-foreground">engagement</p>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                                            <span className="rounded-full border border-border bg-secondary px-2 py-1">value {row.valueScore ?? "--"}</span>
                                            <span className="rounded-full border border-border bg-secondary px-2 py-1">confidence {row.behaviorConfidence}%</span>
                                            <span className="rounded-full border border-border bg-secondary px-2 py-1">{row.purchaseCount} purchases</span>
                                            <span className="rounded-full border border-border bg-secondary px-2 py-1">{row.unlockCount} unwraps</span>
                                            <span className="rounded-full border border-border bg-secondary px-2 py-1">{formatWatchSecondsCompact(row.watchSeconds)} watch</span>
                                            <span className="rounded-full border border-border bg-secondary px-2 py-1">{row.taskCompletions} tasks</span>
                                        </div>
                                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                                            <span>{row.sourceTruth.replace(/_/g, " ")}</span>
                                            <span>{row.freshnessState}</span>
                                            {row.returnedInLast7d ? <span>returned 7d</span> : null}
                                        </div>
                                        {row.warnings.length > 0 || getBehaviorAvailabilityLabel(getBehaviorRollup(row.userId)) ? (
                                            <p className="mt-2 text-[11px] text-warning">{getBehaviorAvailabilityLabel(getBehaviorRollup(row.userId)) ?? row.warnings[0]}</p>
                                        ) : null}
                                    </Link>
                                ))}
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                                <div className="text-[10px] text-muted-foreground">
                                    {behaviorLeaderboard
                                        ? `Page ${behaviorLeaderboard.page} of ${behaviorLeaderboard.totalPages} - generated ${formatUtcLabel(behaviorLeaderboard.generatedAtUtc)}`
                                        : "Page 1"}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost"
                                        type="button"
                                        onClick={() => setBehaviorLeaderboardPage((current) => Math.max(1, current - 1))}
                                        disabled={!behaviorLeaderboard || behaviorLeaderboard.page <= 1}
                                        className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-border bg-secondary px-3 text-xs font-semibold text-muted-foreground disabled:opacity-40"
                                    >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                        Previous
                                    </Button>
                                    <Button variant="ghost"
                                        type="button"
                                        onClick={() => setBehaviorLeaderboardPage((current) => behaviorLeaderboard ? Math.min(behaviorLeaderboard.totalPages, current + 1) : current + 1)}
                                        disabled={!behaviorLeaderboard || behaviorLeaderboard.page >= behaviorLeaderboard.totalPages}
                                        className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-border bg-secondary px-3 text-xs font-semibold text-muted-foreground disabled:opacity-40"
                                    >
                                        Next
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div
                        className="divide-y divide-border border-y border-border"
                        data-admin-user-management-summary-lane="identity-activity-confidence"
                    >
                        <div className="py-4" data-admin-user-management-identity-handoff="summary">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identity handoff</p>
                                <AdminTruthBadge
                                    state={userManagementSummaries.length ? "live" : loading ? "refreshing" : "unavailable"}
                                    pendingInitialLoad={loading}
                                    hasUsableValue={userManagementSummaries.length > 0}
                                    className="px-1.5 py-0 text-[8px] tracking-wide"
                                />
                            </div>
                            <p className="mt-2 text-sm font-semibold text-foreground">
                                {identityHandoffSummaryLabel}
                            </p>
                            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                                Guest link status is visible per row. Raw user/event rows stay behind detail actions.
                            </p>
                        </div>
                        <div className="py-4" data-admin-user-management-consent-mode="summary">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Consent/tracking</p>
                                <AdminTruthBadge
                                    state={userManagementSummaries.some((entry) => entry.consentMode.mode === "unavailable") ? "degraded" : userManagementSummaries.length ? "live" : "unavailable"}
                                    pendingInitialLoad={loading}
                                    hasUsableValue={userManagementSummaries.length > 0}
                                    className="px-1.5 py-0 text-[8px] tracking-wide"
                                />
                            </div>
                            <p className="mt-2 text-sm font-semibold text-foreground">
                                {isLocalAdminUiTestSession
                                    ? "No consent source loaded"
                                    : `${userManagementSummaries.filter((entry) => entry.consentMode.mode !== "unavailable").length} consent records visible`}
                            </p>
                            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                                Behavioral metrics wait for consent and source materialization before they can be shown.
                            </p>
                        </div>
                        <div className="py-4" data-admin-user-management-metric-confidence="summary">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Metric confidence</p>
                                <AdminTruthBadge
                                    state={lowConfidenceUsers.length ? "degraded" : userManagementSummaries.length ? "live" : "unavailable"}
                                    pendingInitialLoad={loading}
                                    hasUsableValue={userManagementSummaries.length > 0}
                                    className="px-1.5 py-0 text-[8px] tracking-wide"
                                />
                            </div>
                            <p className="mt-2 text-sm font-semibold text-foreground">
                                {metricConfidenceSummaryLabel}
                            </p>
                            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                                Missing metrics show their producer, bridge, or materializer in the user detail drilldown.
                            </p>
                        </div>
                    </div>

                    <AdminUserDirectory
                        records={adminDirectoryRecords}
                        loading={loading}
                        searchQuery={searchQuery}
                        selectedDetailUserId={selectedUserDetailLoading}
                        getStatusColor={getStatusColor}
                        onEditUsername={(user) => {
                            setEditUsernameUser(user);
                            setEditUsernameInput(user.username || "");
                        }}
                        onEditBalance={setEditBalanceUser}
                        onViewHistory={setHistoryUser}
                        onLoadDetail={(user) => {
                            void fetchUserDetail(user);
                        }}
                        onOpenContent={(user) => {
                            void fetchUserDetail(user, { openContent: true });
                        }}
                        onViewSecurity={setSecurityDetailsUser}
                        onPromoteCreator={(user) => {
                            void handleRoleUpdate(user.uid, "creator");
                        }}
                        onChangeRole={(user, role) => {
                            void handleRoleUpdate(user.uid, role);
                        }}
                        onToggleVerification={(user) => {
                            void handleVerification(user.uid, !user.isVerified);
                        }}
                        onSetStatus={(user, status) => {
                            setActionUser(user);
                            setActionType(status);
                        }}
                    />
                </AdminUsersOperations>
            )}

            {/* Platform Feedback View */}
            {viewMode === 'feedback' && (
                <div className="space-y-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-0">
                    {loadingFeedback ? (
                        <div className="rounded-[1.75rem] border border-border bg-background/20 p-8 text-center sm:p-12">
                            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                            <p className="text-muted-foreground">Loading feedback submissions...</p>
                        </div>
                    ) : feedback.length === 0 ? (
                        <div className="glass-panel rounded-[1.75rem] border border-border p-8 text-center sm:rounded-3xl sm:p-12">
                            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground text-lg">No feedback submissions found yet.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3 sm:gap-4">
                            {feedback.map((item) => (
                                <div key={item.id} className="glass-panel space-y-4 overflow-hidden rounded-[1.75rem] border border-border p-4 transition-colors hover:border-border sm:rounded-3xl sm:p-6">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-muted-foreground">
                                                {(item.email?.[0] || "?").toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="break-all text-sm font-semibold text-foreground sm:text-base">{item.email || 'Anonymous'}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {typeof item.timestamp === "number" && item.timestamp > 0 ? format(item.timestamp, 'MMM d, h:mm a') : 'Just now'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 sm:max-w-[45%] sm:justify-end">
                                            {item.rating ? (
                                                <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                                    {item.rating} / 5 Rating
                                                </div>
                                            ) : null}
                                            {item.category ? (
                                                <div className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                    {item.category}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="relative rounded-2xl border border-border bg-secondary p-3 sm:p-4">
                                        <div className="absolute top-4 right-4 opacity-5 pointer-events-none">
                                            <MessageSquare className="w-12 h-12" />
                                        </div>
                                        <p className="relative z-10 whitespace-pre-wrap break-words text-sm text-muted-foreground sm:text-base">{item.message}</p>
                                    </div>
                                    <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="max-w-full break-all text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                                            User ID: {item.userId}
                                        </div>
                                        <Button variant="ghost"
                                            onClick={() => {
                                                setSearchQuery(item.userId);
                                                setViewMode('users');
                                            }}
                                            className="self-start text-xs font-semibold text-primary hover:underline sm:self-auto"
                                        >
                                            View User Profile
                                        </Button>
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
                        className="rounded-2xl border border-border bg-secondary p-5 text-sm text-muted-foreground"
                        data-admin-users-tasks-fixture-boundary="true"
                        data-admin-users-tasks-fixture-state="source_missing"
                    >
                        <p className="font-semibold text-foreground">Task controls require verified admin task data.</p>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            permission_blocked: this fixture keeps the task builder read-only and skips protected task reads and writes.
                        </p>
                    </div>
                ) : (
                    <AdminTasksManager users={users} />
                )
            )}

            {(actionType || editUsernameUser || editBalanceUser || contentUser || historyUser || securityDetailsUser) && (
                <section className="rounded-2xl border border-border bg-background/40 p-3 sm:p-4">
                    <div className="mb-3 flex flex-col gap-2 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Selected action</p>
                            <h2 className="mt-1 text-base font-semibold text-foreground">Confirm connected controls</h2>
                            <p className="mt-1 text-xs text-muted-foreground">Missing data stays labeled.</p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setActionType(null);
                                setActionUser(null);
                                setEditUsernameUser(null);
                                setEditBalanceUser(null);
                                setContentUser(null);
                                setHistoryUser(null);
                                setSecurityDetailsUser(null);
                                setContentInput("");
                            }}
                        >
                            Clear action
                        </Button>
                    </div>
                    <div className="grid gap-3 xl:grid-cols-2">
                    {editUsernameUser && (
                        <Surface className="w-full rounded-xl border border-border bg-card p-4">
                            <h3 className="mb-1 text-base font-semibold text-foreground">Edit username</h3>
                            <p className="mb-4 text-sm text-muted-foreground">
                                Change username for <strong>{editUsernameUser.email}</strong>
                            </p>
                            <div className="mb-4">
                                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">New Username</label>
                                <Input
                                    type="text"
                                    className="w-full bg-background/50 border border-border rounded-xl p-3 text-foreground focus:border-primary outline-none"
                                    placeholder="Enter new username..."
                                    value={editUsernameInput}
                                    onChange={(e) => setEditUsernameInput(e.target.value)}
                                />
                                <p className="mt-2 text-xs text-primary/70">Requires exactly 3-20 chars (a-z, 0-9, _).</p>
                                <p className="mt-1 text-xs font-semibold text-destructive">Changes the creator&apos;s public profile URL immediately.</p>
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button variant="ghost" onClick={() => setEditUsernameUser(null)}>Cancel</Button>
                                <Button
                                    variant="brand"
                                    onClick={handleUpdateUsername}
                                    disabled={processing || !editUsernameInput || editUsernameInput === editUsernameUser.username}
                                >
                                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save username"}
                                </Button>
                            </div>
                        </Surface>
                    )}

                    {actionType && actionUser && (
                        <Surface className="w-full rounded-xl border border-border bg-card p-4">
                            <h3 className="mb-1 text-base font-semibold text-foreground">
                                {actionType === "ban" ? "Ban user" : actionType === "suspend" ? "Suspend user" : "Reactivate user"}
                            </h3>
                            <p className="mb-4 text-sm text-muted-foreground">
                                Are you sure you want to {actionType} <strong>{actionUser.email}</strong>?
                                {actionType !== "activate" && " This removes platform access."}
                            </p>
                            {actionType !== 'activate' && (
                                <div className="mb-4">
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">Reason</label>
                                    <Textarea
                                        className="w-full bg-background/50 border border-border rounded-xl p-3 text-foreground focus:border-primary outline-none resize-none h-24"
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
                        </Surface>
                    )}
                    {editBalanceUser && (
                        <BalanceAdjustmentPanel
                            user={editBalanceUser}
                            onClose={() => setEditBalanceUser(null)}
                            onSuccess={(newBalance) => {
                                setUsers((current) => current.map((u) => (u.uid === editBalanceUser.uid ? { ...u, gumDropsBalance: newBalance } : u)));
                            }}
                        />
                    )}
                    {historyUser && (
                        <TransactionHistoryPanel
                            user={historyUser}
                            onClose={() => setHistoryUser(null)}
                        />
                    )}
                    {contentUser && (
                        <Surface className="w-full rounded-xl border border-border bg-card p-4">
                            <h3 className="mb-1 text-base font-semibold text-foreground">Content access</h3>
                            <p className="mb-4 text-sm text-muted-foreground">Unlocked Drops for <strong>{contentUser.username ? `@${contentUser.username}` : contentUser.displayName || contentUser.email}</strong>.</p>
                            <div className="mb-4">
                                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">Unlocked Drops ({contentUser.unlockedContent?.length || 0})</label>
                                <div className="max-h-40 overflow-y-auto space-y-2 mb-4">
                                    {contentUser.unlockedContent && contentUser.unlockedContent.length > 0 ? (
                                        contentUser.unlockedContent.map(dropId => (
                                            <div key={dropId} className="flex items-center justify-between bg-secondary p-2 rounded-lg text-sm text-muted-foreground">
                                                <div className="min-w-0">
                                                    <span className="block truncate">{dropReferences[dropId]?.title || dropId}</span>
                                                    <span className="block truncate text-[11px] text-muted-foreground">{dropId}</span>
                                                </div>
                                                <Button variant="ghost" onClick={() => handleManageContent('remove', dropId)} disabled={contentActionProcessing} className="p-1 transition-colors" title="Revoke access" aria-label="Revoke access"><Ban className="w-3 h-3" /></Button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-sm text-muted-foreground">No unlocked Drops.</div>
                                    )}
                                </div>
                                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">Grant Access (Drop ID)</label>
                                <div className="flex gap-2">
                                    <Input type="text" className="w-full bg-background/50 border border-border rounded-xl p-2 text-foreground focus:border-primary outline-none text-sm" placeholder="Enter Drop ID..." value={contentInput} onChange={(e) => setContentInput(e.target.value)} />
                                    <Button size="sm" variant="brand" disabled={contentActionProcessing || !contentInput} onClick={() => handleManageContent('add', contentInput)}><Plus className="w-4 h-4" /></Button>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button variant="ghost" onClick={() => { setContentUser(null); setContentInput(""); }}>Close</Button>
                            </div>
                        </Surface>
                    )}
                    {securityDetailsUser && (
                        <Surface className="w-full rounded-xl border border-border bg-card p-4">
                            <h3 className="mb-1 flex items-center gap-2 text-base font-semibold text-foreground">
                                <Shield className="w-5 h-5 text-destructive" /> Security details
                            </h3>
                            <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                                Target: <span className="text-foreground font-semibold">{securityDetailsUser.username ? `@${securityDetailsUser.username}` : securityDetailsUser.displayName || securityDetailsUser.email}</span>
                            </p>

                            <div className="mb-4 space-y-3">
                                <div className="bg-background/50 p-4 rounded-xl border border-border">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs text-muted-foreground font-semibold uppercase">Total Violations</span>
                                        <span className="text-lg font-semibold text-destructive">{securityDetailsUser.securityFlags?.ripAttempts || 0}</span>
                                    </div>
                                    {securityDetailsUser.securityFlags?.lastViolation && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-muted-foreground font-semibold uppercase">Last Incident</span>
                                            <span className="text-sm font-mono text-muted-foreground">
                                                {format(new Date(securityDetailsUser.securityFlags.lastViolation), 'MMM d, yyyy h:mm a')}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-destructive/10 p-4 rounded-xl border border-destructive/20">
                                    <span className="text-xs text-destructive font-semibold uppercase block mb-1">What triggered it</span>
                                    <p className="text-sm font-semibold text-destructive">
                                        {selectedSecurityDescriptor?.label || "Viewer protection warning"}
                                    </p>
                                    <p className="mt-2 text-sm text-destructive break-words">
                                        {securityDetailsUser.securityFlags?.lastViolationMessage || selectedSecurityDescriptor?.message || "The viewer logged a protection warning for this account."}
                                    </p>
                                </div>

                                {securityDetailsUser.securityFlags?.lastViolationDropId && (
                                    <div className="bg-secondary p-4 rounded-xl border border-border">
                                        <span className="text-xs text-muted-foreground font-semibold uppercase block mb-1">Where it happened</span>
                                        <p className="mb-2 text-sm text-muted-foreground">
                                            {selectedSecurityDescriptor?.locationLabel || "Protected viewer"}
                                        </p>
                                        <p className="text-sm text-primary font-mono break-all">
                                            {securityDetailsUser.securityFlags.lastViolationDropId}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <Button variant="ghost" onClick={() => setSecurityDetailsUser(null)}>Close details</Button>
                                {(!securityDetailsUser.status || securityDetailsUser.status === 'active') && (
                                    <Button variant="danger" onClick={() => {
                                        setSecurityDetailsUser(null);
                                        setActionUser(securityDetailsUser);
                                        setActionType('ban');
                                    }}>
                                        Ban account
                                    </Button>
                                )}
                            </div>
                        </Surface>
                    )}
                    </div>
                </section>
            )}
        </div>
    );
}
