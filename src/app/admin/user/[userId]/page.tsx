"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { format, formatDistanceToNow } from "date-fns";
import {
    Activity,
    AlertCircle,
    ArrowLeft,
    CalendarDays,
    Eye,
    History,
    LifeBuoy,
    Play,
    ShieldAlert,
    Sparkles,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import type { AdminSurfaceState } from "@/lib/admin-parity";
import {
    coerceAdminTruthState,
    hasUsableAdminTruthValue,
    resolveAdminTruthState,
    type AdminTruthState,
} from "@/lib/admin-truth-state";
import { deriveGumdropEconomics } from "@/lib/gumdrop-economics";
import { Transaction, UserProfile } from "@/types/db";
import { authFetch } from "@/lib/authFetch";
import type { SupportReadinessSnapshot } from "@/lib/support-readiness";
import { reportClientIssue } from "@/lib/client-error-reporting";
import type { UserActionLedgerItem } from "@/lib/analytics-action-taxonomy";
import {
    describeCreatorOnboardingBlockingReason,
    getCreatorOnboardingStatusSummary,
    type CreatorOnboardingCanonicalRecord,
    type CreatorOnboardingHistoryEntry,
} from "@/lib/creator-onboarding";
import type { UserBehaviorRollup } from "@/lib/user-behavior-rollup-contract";
import type { UserEngagementScoreResult } from "@/lib/behavioral/user-engagement-score";
import type { UserValueScoreResult } from "@/lib/behavioral/user-value-score";

type UserDetailAnalytics = {
    eventCount: number;
    unwrapCount: number;
    purchaseCount: number;
    viewerSessionCount: number;
    viewerCompletionCount: number;
    assetViewCount: number;
    assetCompletionCount: number;
    uniqueViewedDrops: number;
    watchSecondsTotal: number;
    watchHours: number;
    viewCount: number;
    bounceCount: number;
    authSuccessCount: number;
    onboardingStartCount: number;
    onboardingCompletionCount: number;
    downloadCount: number;
    relatedClickCount: number;
    avgLoadMs: number;
    lastSeenAt: number;
    grossRevenueUsd: number;
    netRevenueUsd: number;
    paypalFeeUsd: number;
    adjustedProfitUsd: number;
    bonusValueUsd: number;
    bonusGumDrops: number;
    deliveredGumDrops: number;
    paidGumDrops: number;
    effectiveUsdPer100Gd: number;
    commerceTruthLabel?: AdminSurfaceState | "partial" | "unknown";
    commerceSourceLabel?: string;
    commerceEmptyReason?: string | null;
    metricTruthLabel?: AdminSurfaceState | "partial" | "unknown";
    metricSourceLabel?: string;
    metricIntegrityFailures?: string[];
    recoveredFromFacts?: boolean;
    engagementScore?: number;
    engagement?: UserEngagementScoreResult;
    valueScore?: number;
    value?: UserValueScoreResult;
    behaviorRollup?: UserBehaviorRollup;
    actionLedger?: UserActionLedgerItem[];
    actionTaxonomyVersion?: string;
    unlockSpendGdTotal: number;
    topViewedDrops: Array<{ dropId: string; dropTitle: string; views: number; watchSeconds: number }>;
    parity: {
        score: number;
        purchase: UserDetailParityInsight;
        unlock: UserDetailParityInsight;
        coverage: UserDetailCoverageItem[];
        validations: UserDetailValidationItem[];
    };
};

type UserDetailParitySource = {
    key: string;
    label: string;
    count: number;
};

type UserDetailParityInsight = {
    status: "pass" | "warn" | "fail";
    score: number;
    referenceCount: number;
    spread: number;
    populatedSources: number;
    canonicalCount: number;
    sources: UserDetailParitySource[];
};

type UserDetailCoverageItem = {
    key: string;
    label: string;
    status: AdminSurfaceState | "healthy" | "partial" | "empty";
    score: number;
    total: number;
    populatedSources: number;
    detail: string;
    sources: UserDetailParitySource[];
};

type UserDetailValidationItem = {
    label: string;
    status: "pass" | "warn" | "fail";
    detail: string;
};

type SecurityEventItem = {
    id: string;
    reason: string;
    label: string;
    message: string;
    locationLabel: string;
    severity: string;
    dropId: string | null;
    dropTitle?: string | null;
    pagePath?: string | null;
    sessionId?: string | null;
    contentKind?: string | null;
    assetKey?: string | null;
    assetIndex?: number;
    timestamp: number;
};

type SecuritySummary = {
    allTimeCount: number;
    last30DaysCount: number;
    lastViolationAt: string | number | null;
    lastViolationReason: string;
    reasons: Array<{
        reason: string;
        label: string;
        count: number;
    }>;
};

type CreatorOpsSummary = {
    followerCount: number;
    favoriteCount: number;
    notificationsEnabledCount: number;
    activeSubscribers: number;
    lapsedSubscribers: number;
    openRequests: number;
    bookedCalls: number;
    completedCalls: number;
    pendingPayouts: number;
    openThreads: number;
    pendingDropSubmissions: number;
    totalAccruedGd: number;
    pendingCashoutGd: number;
    broadcasts: number;
};

type CreatorOpsState = {
    summary: CreatorOpsSummary;
    subscriptions: Array<Record<string, unknown>>;
    requests: Array<Record<string, unknown>>;
    bookings: Array<Record<string, unknown>>;
    payouts: Array<Record<string, unknown>>;
    accruals: Array<Record<string, unknown>>;
    threads: Array<Record<string, unknown>>;
    messages: Array<Record<string, unknown>>;
    broadcasts: Array<Record<string, unknown>>;
    pendingSubmissions: Array<Record<string, unknown>>;
};

type SupportReadinessState = SupportReadinessSnapshot["summary"]["state"];

type CreatorApplicationState = NonNullable<UserProfile["creatorApplication"]>;
type CreatorRestrictionFlags = NonNullable<UserProfile["creatorRestrictions"]>;

const CREATOR_RESTRICTION_FIELDS = [
    { key: "messagingRestricted", label: "Restrict messaging", description: "Blocks paid chat and direct creator replies." },
    { key: "broadcastsRestricted", label: "Restrict broadcasts", description: "Stops follower broadcasts and creator alerts." },
    { key: "subscriptionsRestricted", label: "Restrict subscriptions", description: "Prevents new creator subscriptions and renewals." },
    { key: "bookingsRestricted", label: "Restrict bookings", description: "Stops phone and video booking purchases." },
    { key: "customRequestsRestricted", label: "Restrict requests", description: "Blocks new custom content requests." },
    { key: "dropSubmissionsRestricted", label: "Restrict drop submissions", description: "Prevents creator drop drafts from being submitted." },
    { key: "payoutsRestricted", label: "Restrict payouts", description: "Prevents payout requests from being submitted." },
] as const satisfies Array<{ key: keyof CreatorRestrictionFlags; label: string; description: string }>;

const CREATOR_SUBMISSION_STATUS_OPTIONS = [
    { value: "onboarding_started", label: "Onboarding started" },
    { value: "onboarding_submitted", label: "Onboarding submitted" },
    { value: "awaiting_manual_review", label: "Awaiting manual review" },
] as const satisfies Array<{ value: CreatorApplicationState["submissionStatus"]; label: string }>;

const CREATOR_APPROVAL_STATUS_OPTIONS = [
    { value: "creator_pending", label: "Pending review" },
    { value: "creator_approved", label: "Approved" },
    { value: "creator_rejected", label: "Rejected" },
    { value: "creator_needs_changes", label: "Needs changes" },
] as const satisfies Array<{ value: CreatorApplicationState["approvalStatus"]; label: string }>;

const CREATOR_LEGAL_STATUS_OPTIONS = [
    { value: "legal_pending", label: "Legal not started" },
    { value: "legal_sent", label: "Waiting on signatures" },
    { value: "legal_signed", label: "Agreement complete" },
] as const satisfies Array<{ value: CreatorApplicationState["legalStatus"]; label: string }>;

const CREATOR_ID_STATUS_OPTIONS = [
    { value: "id_not_requested", label: "ID not requested" },
    { value: "id_requested", label: "Waiting for ID upload" },
    { value: "id_submitted", label: "ID ready for review" },
    { value: "id_verified", label: "ID verified" },
    { value: "id_rejected", label: "ID needs resubmission" },
] as const satisfies Array<{ value: CreatorApplicationState["idVerificationStatus"]; label: string }>;

const CREATOR_SEGMENTATION_STATUS_OPTIONS = [
    { value: "segment_unassigned", label: "Not assigned" },
    { value: "segment_assigned", label: "Assigned" },
] as const satisfies Array<{ value: CreatorApplicationState["segmentationStatus"]; label: string }>;

function getValidationClasses(status: "pass" | "warn" | "fail") {
    if (status === "pass") {
        return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
    }

    if (status === "fail") {
        return "border-red-500/20 bg-red-500/10 text-red-200";
    }

    return "border-amber-400/20 bg-amber-400/10 text-amber-200";
}

function getCoverageClasses(status: AdminSurfaceState | "healthy" | "partial" | "empty") {
    const state = coerceUserDetailTruthState(status);
    if (state === "live") {
        return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
    }

    if (state === "failed" || state === "unavailable") {
        return "border-red-500/20 bg-red-500/10 text-red-200";
    }

    return "border-amber-400/20 bg-amber-400/10 text-amber-200";
}

function coerceUserDetailTruthState(value: unknown): AdminTruthState {
    if (value === "healthy") return "live";
    if (value === "empty") return "unavailable";
    return coerceAdminTruthState(value) ?? "unavailable";
}

function formatRelativeTimestamp(value: unknown) {
    return typeof value === "number" && value > 0
        ? formatDistanceToNow(value, { addSuffix: true })
        : "No timestamp";
}

function getSupportStateClasses(state: SupportReadinessState) {
    if (state === "waiting_on_support") {
        return "border-amber-400/20 bg-amber-400/10 text-amber-200";
    }

    if (state === "waiting_on_user" || state === "open") {
        return "border-brand-purple/20 bg-brand-purple/10 text-brand-purple";
    }

    if (state === "resolved") {
        return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
    }

    return "border-white/10 bg-white/5 text-gray-200";
}

export default function AdminUserAnalyticsPage() {
    const params = useParams();
    const router = useRouter();
    const { userProfile, loading: authLoading } = useAuth();

    const userId = params?.userId as string;

    const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [analytics, setAnalytics] = useState<UserDetailAnalytics | null>(null);
    const [behavioralProfile, setBehavioralProfile] = useState<any>(null);
    const [recommendationDebug, setRecommendationDebug] = useState<any>(null);
    const [securityEvents, setSecurityEvents] = useState<SecurityEventItem[]>([]);
    const [securitySummary, setSecuritySummary] = useState<SecuritySummary | null>(null);
    const [supportReadiness, setSupportReadiness] = useState<SupportReadinessSnapshot | null>(null);
    const [creatorOps, setCreatorOps] = useState<CreatorOpsState | null>(null);
    const [creatorApplicationState, setCreatorApplicationState] = useState<CreatorApplicationState | null>(null);
    const [creatorOnboardingCanonical, setCreatorOnboardingCanonical] = useState<CreatorOnboardingCanonicalRecord | null>(null);
    const [creatorOnboardingHistory, setCreatorOnboardingHistory] = useState<CreatorOnboardingHistoryEntry[]>([]);
    const [securityWindow, setSecurityWindow] = useState<"all" | "30d">("all");
    const [securitySeverityFilter, setSecuritySeverityFilter] = useState("all");
    const [securityReasonFilter, setSecurityReasonFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isAdmin = userProfile?.role === "admin";

    const loadUserData = useCallback(async () => {
        if (authLoading || !isAdmin || !userId) {
            return;
        }

        setLoading(true);
        try {
            const response = await authFetch(`/api/admin/user/${userId}`);
            const result = await response.json() as {
                success?: boolean;
                user?: UserProfile;
                creatorOnboardingCanonical?: CreatorOnboardingCanonicalRecord | null;
                creatorOnboardingHistory?: CreatorOnboardingHistoryEntry[];
                transactions?: Transaction[];
                analytics?: UserDetailAnalytics;
                behavioralProfile?: any;
                recommendationDebug?: any;
                securitySummary?: SecuritySummary;
                securityEvents?: SecurityEventItem[];
                supportReadiness?: SupportReadinessSnapshot | null;
                creatorOps?: CreatorOpsState | null;
                error?: string;
            };

            if (!response.ok || !result.success || !result.user) {
                throw new Error(result.error || "Failed to load deeper analytics. Try again.");
            }

            setTargetUser(result.user);
            setTransactions(result.transactions || []);
            setAnalytics(result.analytics || null);
            setBehavioralProfile(result.behavioralProfile || null);
            setRecommendationDebug(result.recommendationDebug || null);
            setSecuritySummary(result.securitySummary || null);
            setSecurityEvents(result.securityEvents || []);
            setSupportReadiness(result.supportReadiness || null);
            setCreatorOps(result.creatorOps || null);
            setCreatorApplicationState(result.user.creatorApplication || null);
            setCreatorOnboardingCanonical(result.creatorOnboardingCanonical || null);
            setCreatorOnboardingHistory(result.creatorOnboardingHistory || []);
            setError(null);
        } catch (fetchError: unknown) {
            reportClientIssue({
                channel: "ui",
                message: "Admin user detail fetch failed",
                error: fetchError,
                detail: {
                    adminView: "user_detail",
                    userId,
                },
                consoleLabel: "[Admin User Detail] load analytics failed",
            });
            const message = fetchError instanceof Error ? fetchError.message : "Failed to load deeper analytics. Try again.";
            setTargetUser(null);
            setTransactions([]);
            setAnalytics(null);
            setBehavioralProfile(null);
            setRecommendationDebug(null);
            setSecuritySummary(null);
            setSecurityEvents([]);
            setSupportReadiness(null);
            setCreatorOps(null);
            setCreatorApplicationState(null);
            setCreatorOnboardingCanonical(null);
            setCreatorOnboardingHistory([]);
            setError(message === "User not found" ? "User not found." : message);
        } finally {
            setLoading(false);
        }
    }, [authLoading, isAdmin, userId]);

    useEffect(() => {
        void loadUserData();
    }, [loadUserData]);

    const purchaseTransactions = useMemo(() => (
        transactions
            .filter((transaction) => transaction.status === "completed" && (transaction.type === "purchase_currency" || String(transaction.type) === "purchase"))
            .map((transaction) => ({
                ...transaction,
                economics: deriveGumdropEconomics(
                    transaction.deliveredGumDrops ?? transaction.amount,
                    transaction.grossRevenueUsd ?? transaction.cost ?? 0,
                ),
            }))
    ), [transactions]);

    const totalSpentUsd = analytics?.grossRevenueUsd ?? purchaseTransactions.reduce((sum, transaction) => sum + transaction.economics.grossRevenueUsd, 0);
    const adjustedProfitUsd = analytics?.adjustedProfitUsd ?? purchaseTransactions.reduce((sum, transaction) => sum + transaction.economics.adjustedProfitUsd, 0);
    const bonusValueUsd = analytics?.bonusValueUsd ?? purchaseTransactions.reduce((sum, transaction) => sum + transaction.economics.bonusValueUsd, 0);
    const bonusGumDrops = analytics?.bonusGumDrops ?? purchaseTransactions.reduce((sum, transaction) => sum + transaction.economics.bonusGumDrops, 0);
    const paypalFeeUsd = analytics?.paypalFeeUsd ?? purchaseTransactions.reduce((sum, transaction) => sum + transaction.economics.paypalFeeUsd, 0);
    const netRevenueUsd = analytics?.netRevenueUsd ?? purchaseTransactions.reduce((sum, transaction) => sum + transaction.economics.netRevenueUsd, 0);
    const deliveredGumDrops = analytics?.deliveredGumDrops ?? purchaseTransactions.reduce((sum, transaction) => sum + transaction.economics.deliveredGumDrops, 0);
    const effectiveUsdPer100Gd = analytics?.effectiveUsdPer100Gd ?? (deliveredGumDrops > 0 ? totalSpentUsd / (deliveredGumDrops / 100) : 0);
    const averageOrderUsd = (analytics?.purchaseCount || purchaseTransactions.length) > 0
        ? totalSpentUsd / (analytics?.purchaseCount || purchaseTransactions.length)
        : 0;
    const failedTxCount = transactions.filter((transaction) => transaction.status === "failed").length;
    const parity = analytics?.parity;
    const behaviorRollup = analytics?.behaviorRollup;
    const engagement = analytics?.engagement ?? behaviorRollup?.engagement;
    const value = analytics?.value ?? behaviorRollup?.value;
    const actionLedger = analytics?.actionLedger ?? [];
    const behaviorIssueSummary = behaviorRollup?.issues.map((issue) => issue.message).join(" ");
    const behavioralConfidence = Math.round(((behavioralProfile?.confidenceScore ?? recommendationDebug?.profileConfidence ?? 0) as number) * 100);
    const behavioralTopCreators = ((behavioralProfile?.topCreators || []) as Array<{ key: string; score: number }>).filter((entry) => entry.score > 0.5);
    const behavioralTopCategories = ((behavioralProfile?.topCategories || []) as Array<{ key: string; score: number }>).filter((entry) => entry.score > 0.35);
    const behavioralTopThemes = ((behavioralProfile?.topThemes || []) as Array<{ key: string; score: number }>).filter((entry) => entry.score > 0.35);
    const showBehavioralAffinity = behavioralTopCreators.length > 0 || behavioralTopCategories.length > 0 || behavioralTopThemes.length > 0;
    const recommendationDisplayMode = recommendationDebug?.displayMode || "fallback-compact";
    const showBehavioralExplanationCards = recommendationDebug?.showExplanationCards === true;
    const behavioralRecommendations = Array.isArray(recommendationDebug?.drops) ? recommendationDebug.drops : [];
    const commerceTruthState = resolveAdminTruthState({
        hasUsableValue: hasUsableAdminTruthValue(
            analytics?.grossRevenueUsd,
            analytics?.netRevenueUsd,
            analytics?.adjustedProfitUsd,
            totalSpentUsd,
        ),
        sourceConfigured: Boolean(analytics?.commerceSourceLabel || purchaseTransactions.length > 0 || analytics),
        valueState: analytics?.commerceTruthLabel,
        delayed: coerceAdminTruthState(analytics?.commerceTruthLabel) === "stale",
        reviewRequired: Boolean(analytics?.commerceEmptyReason && analytics),
    });
    const metricTruthState = resolveAdminTruthState({
        hasUsableValue: hasUsableAdminTruthValue(
            behaviorRollup?.totalActions,
            behaviorRollup?.views,
            behaviorRollup?.watchTimeMs,
            analytics?.eventCount,
            analytics?.viewCount,
            analytics?.watchSecondsTotal,
        ),
        sourceConfigured: Boolean(analytics?.metricSourceLabel || analytics),
        valueState: analytics?.metricTruthLabel,
        reviewRequired: Boolean(analytics?.metricIntegrityFailures?.length),
    });
    const behaviorTruthState = resolveAdminTruthState({
        hasUsableValue: Boolean(behaviorRollup),
        sourceConfigured: true,
        valueState: behaviorRollup?.confidence === "unknown" ? "unavailable" : behaviorRollup?.freshnessState,
        reviewRequired: Boolean(behaviorRollup?.issues.length) || behaviorRollup?.confidence === "insufficient" || behaviorRollup?.confidence === "low",
    });
    const supportTruthState = resolveAdminTruthState({
        hasUsableValue: Boolean(supportReadiness),
        sourceConfigured: true,
    });
    const parityTruthState = resolveAdminTruthState({
        hasUsableValue: Boolean(parity),
        sourceConfigured: true,
        reviewRequired: Boolean(parity?.validations?.some((item) => item.status !== "pass")),
    });

    const watchTimeLabel = useMemo(() => {
        const watchTimeMs = behaviorRollup?.watchTimeMs ?? ((analytics?.watchSecondsTotal ?? 0) * 1000);
        if (!watchTimeMs) {
            return "0m";
        }

        const watchSecondsTotal = Math.round(watchTimeMs / 1000);
        if (watchSecondsTotal >= 3600) {
            return `${(watchSecondsTotal / 3600).toFixed(1)}h`;
        }

        return `${Math.max(1, Math.round(watchSecondsTotal / 60))}m`;
    }, [analytics?.watchSecondsTotal, behaviorRollup?.watchTimeMs]);

    const securityReasonOptions = useMemo(() => (
        Array.from(new Map(
            securityEvents
                .filter((event) => event.reason)
                .map((event) => [event.reason, event.label] as const),
        ).entries())
            .sort((left, right) => left[1].localeCompare(right[1]))
            .map(([reason, label]) => ({ reason, label }))
    ), [securityEvents]);

    const securityWindowCutoffMs = useMemo(() => Date.now() - (30 * 24 * 60 * 60 * 1000), []);
    const filteredSecurityEvents = useMemo(() => (
        securityEvents.filter((event) => {
            if (securityWindow === "30d" && event.timestamp < securityWindowCutoffMs) {
                return false;
            }
            if (securitySeverityFilter !== "all" && event.severity !== securitySeverityFilter) {
                return false;
            }
            if (securityReasonFilter !== "all" && event.reason !== securityReasonFilter) {
                return false;
            }
            return true;
        })
    ), [securityEvents, securityReasonFilter, securitySeverityFilter, securityWindow, securityWindowCutoffMs]);
    const creatorApplication = creatorApplicationState ?? targetUser?.creatorApplication ?? null;
    const isCreatorOpsUser = targetUser?.role === "creator" || targetUser?.role === "admin";
    const creatorBlockingReasons = (creatorOnboardingCanonical?.blockingReasons ?? creatorApplication?.blockingReasons ?? [])
        .map((reason) => describeCreatorOnboardingBlockingReason(reason));
    const creatorReadyForApproval = creatorOnboardingCanonical?.readyForApproval ?? creatorApplication?.readyForApproval ?? false;
    const creatorRoleState = creatorOnboardingCanonical?.role ?? targetUser?.role ?? "user";
    const creatorRecordHref = targetUser ? `/admin/roster?focus=${targetUser.uid}` : "/admin/roster";
    const creatorRecordSummary = creatorOnboardingCanonical
        ? getCreatorOnboardingStatusSummary(creatorOnboardingCanonical)
        : creatorApplication
            ? getCreatorOnboardingStatusSummary(creatorApplication)
            : null;


    if (authLoading || loading) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
            </div>
        );
    }

    if (!isAdmin) {
        return <div className="p-8 text-center text-red-500">Access Restricted</div>;
    }

    if (error || !targetUser) {
        return (
            <div className="p-8 text-center text-gray-300">
                <AlertCircle className="mx-auto mb-4 h-8 w-8 text-red-500" />
                <p>{error}</p>
                <button onClick={() => router.back()} className="mt-4 text-brand-purple underline">
                    Go back
                </button>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl space-y-4 pb-20 md:space-y-5">
            <PageViewEvent eventName="admin_user_detail_viewed" />
            <AdminPageHeader
                eyebrow="Admin Roster"
                topSlot={(
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back to Roster
                    </button>
                )}
                title={(
                    <span className="inline-flex flex-wrap items-center justify-center gap-2">
                        <span>{targetUser.displayName || targetUser.email || "User"}</span>
                        {targetUser.status !== "active" ? (
                            <span className="rounded-full border border-red-500/20 bg-red-500/20 px-2 py-0.5 text-[10px] uppercase text-red-400">
                                {targetUser.status}
                            </span>
                        ) : null}
                    </span>
                )}
                compact
                subtitle={(
                    <span className="flex flex-col items-center gap-1 text-center sm:flex-row sm:flex-wrap sm:justify-center">
                        <span className="font-mono text-xs text-gray-400">{targetUser.email || "No email"}</span>
                        <span className="hidden text-gray-600 sm:inline">|</span>
                        <span className="break-all font-mono text-xs text-gray-500">{targetUser.uid}</span>
                        <span className="hidden text-gray-600 sm:inline">|</span>
                        <span className="inline-flex items-center gap-1 text-xs text-brand-purple/80">
                            <CalendarDays className="h-3 w-3" />
                            Joined {format(targetUser.createdAt, "PPP")}
                        </span>
                    </span>
                )}
                actions={(
                    <div className="flex w-full max-w-2xl flex-col gap-3 sm:flex-row sm:items-stretch">
                        <div className="flex min-h-[5.75rem] flex-1 items-center justify-center gap-4 rounded-[1.6rem] border border-white/10 bg-black/35 px-5 py-4">
                            <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-brand-purple/30 bg-zinc-800">
                                {targetUser.photoURL ? (
                                    <Image src={targetUser.photoURL} alt="Avatar" fill sizes="64px" className="object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-black text-2xl font-black text-white">
                                        {targetUser.displayName?.charAt(0) || "U"}
                                    </div>
                                )}
                            </div>
                            <div className="text-left">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Profile Snapshot</p>
                                <p className="mt-1 text-sm font-semibold text-white">
                                    {targetUser.username ? `@${targetUser.username}` : "No public username"}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">Behavior and protection details for this account.</p>
                            </div>
                        </div>
                        <div className="grid flex-1 grid-cols-2 gap-3">
                            <div className="rounded-[1.6rem] border border-white/10 bg-black/35 px-4 py-4 text-center">
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Current Balance</p>
                                <p className="mt-2 text-2xl font-black text-brand-purple">{targetUser.gumDropsBalance}</p>
                            </div>
                            <div className="rounded-[1.6rem] border border-white/10 bg-black/35 px-4 py-4 text-center">
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Total Drops</p>
                                <p className="mt-2 text-2xl font-black text-white">{targetUser.unlockedContent?.length || 0}</p>
                            </div>
                        </div>
                    </div>
                )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="glass-panel rounded-3xl border border-white/5 p-4 md:p-5">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                        <Activity className="h-4 w-4 text-brand-purple" /> Account Summary
                    </h3>

                    <div className="grid gap-3 sm:grid-cols-3">
                        {[
                            { label: "Gross cash", value: `$${totalSpentUsd.toFixed(2)}`, tone: "text-brand-purple" },
                            { label: "Adjusted profit", value: `$${adjustedProfitUsd.toFixed(2)}` },
                            { label: "Bonus value", value: `$${bonusValueUsd.toFixed(2)}` },
                            { label: "Delivered", value: `${deliveredGumDrops.toLocaleString()} GD` },
                            { label: "Effective rate", value: `$${effectiveUsdPer100Gd.toFixed(2)} / 100 GD` },
                            { label: "Avg order", value: `$${averageOrderUsd.toFixed(2)}` },
                            { label: "Actions", value: (behaviorRollup?.totalActions ?? analytics?.eventCount ?? 0).toLocaleString() },
                            { label: "Views", value: (behaviorRollup?.views ?? analytics?.viewCount ?? 0).toLocaleString() },
                            { label: "Engagement", value: engagement ? `${engagement.verdict} · ${engagement.score}` : "Dormant · 0" },
                            { label: "Value", value: value ? `${value.verdict} · ${value.valueScore}` : "Observer · 0", tone: "text-brand-purple" },
                            { label: "Auth", value: (behaviorRollup?.authEvents ?? analytics?.authSuccessCount ?? 0).toLocaleString() },
                            { label: "Watch time", value: watchTimeLabel },
                            { label: "Last seen", value: (behaviorRollup?.lastSeenAt ?? analytics?.lastSeenAt) ? formatDistanceToNow(behaviorRollup?.lastSeenAt ?? analytics!.lastSeenAt, { addSuffix: true }) : "No activity" },
                        ].map((item) => (
                            <div key={item.label} className="rounded-[1.25rem] border border-white/10 bg-black/30 px-3 py-3">
                                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">{item.label}</p>
                                <p className={`mt-1 text-sm font-black ${item.tone || "text-white"}`}>{item.value}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-black/25 px-4 py-3 text-xs leading-5 text-gray-400">
                        <AdminTruthBadge state={commerceTruthState} className="mr-1 py-0.5" hasUsableValue={hasUsableAdminTruthValue(analytics?.grossRevenueUsd, totalSpentUsd)} />{" "}
                        {analytics?.commerceEmptyReason || `${bonusGumDrops.toLocaleString()} bonus GD valued at the package effective rate from ${analytics?.commerceSourceLabel || "commerce rollups"}.`}
                        {failedTxCount > 0 ? ` ${failedTxCount} failed transaction${failedTxCount === 1 ? "" : "s"} excluded from purchase yield.` : ""}
                    </div>
                    <div className="mt-3 rounded-[1.25rem] border border-white/10 bg-black/25 px-4 py-3 text-xs leading-5 text-gray-400">
                        <AdminTruthBadge state={metricTruthState} className="mr-1 py-0.5" hasUsableValue={hasUsableAdminTruthValue(analytics?.eventCount, analytics?.viewCount, analytics?.watchSecondsTotal)} />{" "}
                        {analytics?.metricSourceLabel || "No canonical user metrics source found."}
                        {analytics?.metricIntegrityFailures?.length ? ` Issues: ${analytics.metricIntegrityFailures.join(", ")}.` : ""}
                    </div>
                    <div
                        className="mt-3 rounded-[1.25rem] border border-white/10 bg-black/25 px-4 py-3 text-xs leading-5 text-gray-400"
                        data-user-behavior-rollup-source={behaviorRollup?.source ?? "unavailable"}
                        data-user-behavior-rollup-confidence={behaviorRollup?.confidence ?? "unknown"}
                    >
                        <AdminTruthBadge state={behaviorTruthState} className="mr-1 py-0.5" hasUsableValue={Boolean(behaviorRollup)} />{" "}
                        {behaviorRollup
                            ? `Behavior rollup: ${behaviorRollup.sourceLabel} / ${behaviorRollup.confidence} (${behaviorRollup.confidenceScore}%).`
                            : "Behavior rollup unavailable."}
                        {behaviorIssueSummary ? ` Issues: ${behaviorIssueSummary}` : ""}
                    </div>
                    <div className="mt-3 rounded-[1.25rem] border border-white/10 bg-black/25 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Engagement verdict</p>
                                <p className="mt-1 text-sm font-black text-white">{engagement?.verdict || "Dormant"}</p>
                                <p className="mt-1 text-xs text-gray-400">{engagement?.score ?? 0}/100 · {engagement?.tier || "dormant"}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(engagement?.topReasons ?? []).slice(0, 3).map((reason) => (
                                    <span key={reason.code} className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white">
                                        {reason.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="mt-3 space-y-1 text-xs leading-5 text-gray-400">
                            {(engagement?.topReasons ?? []).slice(0, 3).map((reason) => (
                                <p key={`${reason.code}-summary`}>{reason.summary}</p>
                            ))}
                        </div>
                    </div>
                    <div className="mt-3 rounded-[1.25rem] border border-white/10 bg-black/25 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Value verdict</p>
                                <p className="mt-1 text-sm font-black text-white">{value?.verdict || "Observer"}</p>
                                <p className="mt-1 text-xs text-gray-400">{value?.valueScore ?? 0}/100 · {value?.valueTier || "observer"}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(value?.topReasons ?? []).slice(0, 3).map((reason) => (
                                    <span key={reason.code} className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white">
                                        {reason.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="mt-3 space-y-1 text-xs leading-5 text-gray-400">
                            {(value?.topReasons ?? []).slice(0, 3).map((reason) => (
                                <p key={`${reason.code}-summary`}>{reason.summary}</p>
                            ))}
                            <p>Bonus GD stays separate from cash revenue. Package bonus raises paid-source delivery, not gross spend.</p>
                        </div>
                    </div>
                </div>

                <div className="glass-panel rounded-3xl border border-white/5 p-4 md:p-5">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                        <History className="h-4 w-4 text-brand-purple" /> Action Ledger
                    </h3>

                    <div className="custom-scrollbar max-h-[400px] space-y-3 overflow-y-auto pr-2">
                        {actionLedger.length === 0 ? (
                            <p className="py-8 text-center text-sm text-gray-500">No behavior logged yet.</p>
                        ) : (
                            actionLedger.map((action) => {
                                return (
                                    <div
                                        key={action.actionId}
                                        className="flex items-center justify-between rounded-xl border border-white/5 bg-black/40 p-3"
                                        data-user-action-name={action.actionName}
                                        data-user-action-source={action.sourceComponent}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="line-clamp-1 text-sm font-bold text-white">
                                                {action.label}
                                            </div>
                                            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-gray-500">
                                                <span className="font-mono">
                                                    {formatDistanceToNow(action.timestamp > 0 ? action.timestamp : Date.now(), { addSuffix: true })}
                                                </span>
                                                <span>{action.route}</span>
                                                <span>{action.sourceComponent}</span>
                                            </div>
                                            {action.rawEventName && action.rawEventName !== action.actionName ? (
                                                <details className="mt-2 text-[10px] text-gray-500">
                                                    <summary className="cursor-pointer list-none font-semibold uppercase tracking-[0.14em] text-gray-500">
                                                        Debug
                                                    </summary>
                                                    <div className="mt-1 font-mono">
                                                        Raw event: {action.rawEventName}
                                                    </div>
                                                </details>
                                            ) : null}
                                        </div>
                                        <div className="ml-4 flex shrink-0 flex-col items-end gap-1">
                                            <span className="rounded-md border border-brand-purple/20 bg-brand-purple/10 px-2 py-0.5 text-xs font-bold text-brand-purple">
                                                {action.actionName}
                                            </span>
                                            {action.entityId ? (
                                                <span className="max-w-[9rem] truncate font-mono text-[9px] text-gray-500">
                                                    {action.entityType}:{action.entityId}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            <div className="glass-panel rounded-3xl border border-white/5 p-4 md:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                            <Sparkles className="h-4 w-4 text-brand-purple" /> Behavioral Intelligence
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-gray-400">
                            Deterministic profile, freshness, and recommendation explanations for this account.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${behavioralProfile?.recommendationState === "profile-driven" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-amber-400/20 bg-amber-400/10 text-amber-200"}`}>
                            {behavioralProfile?.recommendationState || "deterministic-fallback"}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-200">
                            {behavioralProfile?.freshnessLabel || "unknown"}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-200">
                            Confidence {behavioralConfidence}%
                        </span>
                    </div>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Eligibility</p>
                                <p className="mt-2 text-lg font-black text-white">{recommendationDebug?.mode || "deterministic-fallback"}</p>
                                <p className="mt-1 text-xs text-gray-400">
                                    {recommendationDisplayMode === "insufficient-signal"
                                        ? (recommendationDebug?.insufficientSignalReason || "Not enough verified behavior signal yet.")
                                        : "Recommendations only expand when consent and confidence both clear the threshold."}
                                </p>
                            </div>
                            <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Fatigue band</p>
                                <p className="mt-2 text-lg font-black text-white">{behavioralProfile?.fatigueState || "unknown"}</p>
                                <p className="mt-1 text-xs text-gray-400">Fatigue score {Math.round((behavioralProfile?.fatigueScore || 0) * 100)}%.</p>
                            </div>
                            <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Exploration vs loyalty</p>
                                <p className="mt-2 text-lg font-black text-white">{Math.round((behavioralProfile?.explorationScore || 0) * 100)} / {Math.round((behavioralProfile?.loyaltyScore || 0) * 100)}</p>
                                <p className="mt-1 text-xs text-gray-400">Exploration / loyalty balance derived from recent creators and repeat consumption.</p>
                            </div>
                            <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Session depth</p>
                                <p className="mt-2 text-lg font-black text-white">{behavioralProfile?.averageSessionDepth || 0}</p>
                                <p className="mt-1 text-xs text-gray-400">{behavioralProfile?.watchSessionCount || 0} tracked watch sessions in the current profile window.</p>
                            </div>
                        </div>

                        {showBehavioralAffinity ? (
                            <>
                                <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Top creator affinity</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {behavioralTopCreators.slice(0, 6).map((entry) => (
                                            <span key={entry.key} className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white">
                                                {entry.key} · {entry.score}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Top content themes</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {behavioralTopCategories.slice(0, 4).map((entry) => (
                                            <span key={`category-${entry.key}`} className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white">
                                                {entry.key} · {entry.score}
                                            </span>
                                        ))}
                                        {behavioralTopThemes.slice(0, 4).map((entry) => (
                                            <span key={`theme-${entry.key}`} className="inline-flex items-center rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1 text-[11px] font-semibold text-brand-purple">
                                                {entry.key} · {entry.score}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-black/20 p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Affinity state</p>
                                <p className="mt-2 text-sm font-semibold text-white">Insufficient signal</p>
                                <p className="mt-1 text-xs leading-5 text-gray-400">
                                    {recommendationDebug?.insufficientSignalReason || "No meaningful creator or content affinity is available for this account yet."}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Recommended drops with explanations</p>
                            <div className="mt-4 space-y-3">
                                {recommendationDisplayMode === "insufficient-signal" ? (
                                    <div className="rounded-[1.1rem] border border-dashed border-white/10 bg-black/20 p-4">
                                        <p className="text-sm font-semibold text-white">Insufficient signal</p>
                                        <p className="mt-1 text-xs leading-5 text-gray-400">
                                            {recommendationDebug?.insufficientSignalReason || "No recommendation explanations are shown until this account has verified behavioral signal."}
                                        </p>
                                    </div>
                                ) : showBehavioralExplanationCards ? (
                                    behavioralRecommendations.slice(0, 4).map((entry: any) => (
                                        <div key={entry.dropId} className="rounded-[1.1rem] border border-white/10 bg-black/30 p-4">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-bold text-white">{entry.dropTitle}</p>
                                                    <p className="mt-1 text-xs text-gray-400">{entry.dropId} · {entry.dropCategory || "unknown"}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                                                        Score {entry.score}
                                                    </span>
                                                    {(entry.labels || []).map((label: string) => (
                                                        <span key={`${entry.dropId}:${label}`} className="inline-flex items-center rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-200">
                                                            {label}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {(entry.factors || []).slice(0, 4).map((factor: any) => (
                                                    <span key={`${entry.dropId}:${factor.key}`} className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white">
                                                        {factor.label} {factor.contribution}
                                                    </span>
                                                ))}
                                            </div>
                                            {(entry.factors || []).slice(0, 2).map((factor: any) => (
                                                <p key={`${entry.dropId}:${factor.key}:detail`} className="mt-2 text-xs leading-5 text-gray-400">{factor.detail}</p>
                                            ))}
                                        </div>
                                    ))
                                ) : (
                                    behavioralRecommendations.slice(0, 3).map((entry: any) => (
                                        <div key={entry.dropId} className="rounded-[1.1rem] border border-white/10 bg-black/20 px-4 py-3">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-white">{entry.dropTitle}</p>
                                                    <p className="mt-1 text-xs text-gray-400">{entry.dropCategory || "unknown"} · fallback recommendation</p>
                                                </div>
                                                <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200">
                                                    Fallback
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                                {!behavioralRecommendations.length && recommendationDisplayMode !== "insufficient-signal" ? <p className="text-sm text-gray-500">No ranked drop candidates are available for this user yet.</p> : null}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <details className="glass-panel rounded-3xl border border-white/5 p-4 md:p-5">
                <summary className="flex cursor-pointer list-none flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                            <LifeBuoy className="h-4 w-4 text-brand-purple" /> Support handoff
                        </h3>
                            <p className="mt-1 text-xs leading-5 text-gray-400">
                                Support-specific thread and bug-report detail is collapsed here and linked to the support queue.
                            </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${getSupportStateClasses(supportReadiness?.summary.state || "ready")}`}>
                            {supportReadiness?.summary.stateLabel || "Ready for support"}
                        </span>
                        <Link
                            href={`/admin/support?userId=${targetUser.uid}`}
                            className="inline-flex items-center rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-200"
                        >
                            Open support queue
                        </Link>
                    </div>
                </summary>

                <div className="mt-5 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                    <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Support handle</p>
                                <p className="mt-2 text-lg font-black text-white">{supportReadiness?.summary.primaryHandle || targetUser.username || targetUser.email || targetUser.uid}</p>
                                <p className="mt-1 text-xs text-gray-400">Primary identity for the in-site support queue.</p>
                            </div>
                            <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Support thread key</p>
                                <p className="mt-2 break-all font-mono text-xs font-semibold text-white">{supportReadiness?.summary.threadKey || `support:${targetUser.uid}`}</p>
                                <p className="mt-1 text-xs text-gray-400">Stable ownership anchor for in-site support threads.</p>
                            </div>
                            <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Open support threads</p>
                                <div className="mt-1"><AdminTruthBadge state={supportTruthState} hasUsableValue={Boolean(supportReadiness)} /></div>
                                <p className="mt-2 text-2xl font-black text-white">{supportReadiness ? supportReadiness.summary.openThreads : "[unavailable]"}</p>
                                <p className="mt-1 text-xs text-gray-400">{supportReadiness ? supportReadiness.summary.totalThreads : "[unavailable]"} historical threads.</p>
                            </div>
                            <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Support signals</p>
                                <div className="mt-1"><AdminTruthBadge state={supportTruthState} hasUsableValue={Boolean(supportReadiness)} /></div>
                                <p className="mt-2 text-2xl font-black text-white">{supportReadiness ? supportReadiness.summary.bugReportCount : "[unavailable]"}</p>
                                <p className="mt-1 text-xs text-gray-400">Bug reports still surface here as support intake signals.</p>
                            </div>
                        </div>

                        <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                            <div className="flex flex-wrap gap-2">
                                <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${supportReadiness?.summary.channels.accountEmail ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-white/5 text-gray-400"}`}>
                                    Account email {supportReadiness?.summary.channels.accountEmail ? "on file" : "missing"}
                                </span>
                                <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${supportReadiness?.summary.channels.inApp ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-white/5 text-gray-400"}`}>
                                    In-app support {supportReadiness?.summary.channels.inApp ? "ready" : "blocked"}
                                </span>
                                <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${supportReadiness?.summary.channels.browserPush ? "border-brand-purple/20 bg-brand-purple/10 text-brand-purple" : "border-white/10 bg-white/5 text-gray-400"}`}>
                                    Push alerts {supportReadiness?.summary.channels.browserPush ? "enabled" : "off"}
                                </span>
                            </div>
                            <p className="mt-3 text-xs leading-5 text-gray-400">
                                {supportReadiness?.summary.stateDescription || "No current in-site support thread is open for this account."}
                            </p>
                            <p className="mt-2 text-[11px] text-gray-500">
                                Last signal: {formatRelativeTimestamp(supportReadiness?.summary.lastSupportAt || 0)} via {supportReadiness?.summary.lastSupportSource === "support_thread" ? "support thread" : supportReadiness?.summary.lastSupportSource === "feedback" ? "bug report" : "no support activity yet"}.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-white">Recent support signals</p>
                                <p className="mt-1 text-xs leading-5 text-gray-400">
                                    Current support threads and bug reports share the same operational lane.
                                </p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                                {supportReadiness ? `${supportReadiness.signals.length} loaded` : "[unavailable]"}
                            </span>
                        </div>

                        <div className="custom-scrollbar mt-4 max-h-[320px] space-y-3 overflow-y-auto pr-1">
                            {supportReadiness?.signals.length ? supportReadiness.signals.map((signal) => (
                                <div key={signal.id} className="rounded-[1.1rem] border border-white/10 bg-black/20 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="line-clamp-2 text-sm font-semibold text-white">{signal.summary}</p>
                                            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-gray-500">
                                                {signal.kind === "thread" ? "Support thread" : "Bug report"} • {signal.status.replaceAll("_", " ")}
                                            </p>
                                        </div>
                                        <span className="shrink-0 text-[11px] text-gray-500">{formatRelativeTimestamp(signal.timestamp)}</span>
                                    </div>
                                    {signal.path ? (
                                        <p className="mt-2 break-all font-mono text-[11px] text-gray-500">{signal.path}</p>
                                    ) : null}
                                </div>
                            )) : (
                                <div className="rounded-[1.1rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                                    No support conversations or bug reports are attached to this account yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </details>

            {(creatorApplication || isCreatorOpsUser) ? (
                <div className="glass-panel rounded-3xl border border-white/5 p-4 md:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                                <Sparkles className="h-4 w-4 text-brand-purple" /> Creator record handoff
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-gray-400">
                                Creator intake, approval, and live operations now stay in the dedicated creator roster.
                            </p>
                        </div>
                        {creatorRecordSummary ? (
                            <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                                {creatorRecordSummary.stage}
                            </span>
                        ) : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                            href={creatorRecordHref}
                            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black"
                        >
                            Open creator record
                            <ArrowLeft className="h-4 w-4 rotate-180" />
                        </Link>
                        {creatorOnboardingCanonical ? (
                            <p className="max-w-2xl text-sm leading-5 text-gray-400">{creatorRecordSummary?.summary}</p>
                        ) : (
                            <p className="max-w-2xl text-sm leading-5 text-gray-400">This account has creator-linked state, but the focused roster record remains canonical.</p>
                        )}
                    </div>
                </div>
            ) : null}



            <details className="glass-panel rounded-3xl border border-white/5 p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-white">
                    <span className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-brand-purple" /> Source diagnostics
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${getValidationClasses(parity?.validations?.some((item) => item.status === "fail") ? "fail" : parity?.validations?.some((item) => item.status === "warn") ? "warn" : "pass")}`}>
                        {parity ? `${parity.score}% parity` : "[unavailable] parity"}
                    </span>
                </summary>

                <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-[1.4rem] border border-white/10 bg-black/30 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Overall Confidence</p>
                        <div className="mt-1"><AdminTruthBadge state={parityTruthState} hasUsableValue={Boolean(parity)} /></div>
                        <p className="mt-2 text-3xl font-black text-white">{parity ? `${parity.score}%` : "[unavailable]"}</p>
                        <p className="mt-1 text-xs text-gray-400">Purchase and unlock analytics aligned across indexed sources.</p>
                    </div>
                    <div className="rounded-[1.4rem] border border-white/10 bg-black/30 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Purchase Parity</p>
                                <p className="mt-2 text-3xl font-black text-white">{parity ? parity.purchase.canonicalCount : "[unavailable]"}</p>
                                <p className="mt-1 text-xs text-gray-400">{parity ? parity.purchase.populatedSources : "[unavailable]"} populated sources</p>
                            </div>
                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${getValidationClasses(parity?.purchase.status ?? "fail")}`}>
                                {parity?.purchase.status ?? "fail"}
                            </span>
                        </div>
                    </div>
                    <div className="rounded-[1.4rem] border border-white/10 bg-black/30 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Unlock Parity</p>
                                <p className="mt-2 text-3xl font-black text-white">{parity ? parity.unlock.canonicalCount : "[unavailable]"}</p>
                                <p className="mt-1 text-xs text-gray-400">{parity ? parity.unlock.populatedSources : "[unavailable]"} populated sources</p>
                            </div>
                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${getValidationClasses(parity?.unlock.status ?? "fail")}`}>
                                {parity?.unlock.status ?? "fail"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    {[
                        { label: "Purchases", insight: parity?.purchase },
                        { label: "Unlocks", insight: parity?.unlock },
                    ].map((entry) => (
                        <div key={entry.label} className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                            <div className="mb-3 flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-white">{entry.label}</p>
                                    <p className="mt-1 text-xs text-gray-400">
                                        {entry.insight ? `Confidence ${entry.insight.score}% with a source spread of ${entry.insight.spread}.` : "Parity insight unavailable."}
                                    </p>
                                </div>
                                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${getValidationClasses(entry.insight?.status ?? "fail")}`}>
                                    {entry.insight?.status ?? "fail"}
                                </span>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {(entry.insight?.sources ?? []).map((source) => (
                                    <div key={`${entry.label}-${source.key}`} className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">{source.label}</p>
                                        <p className="mt-1 text-sm font-semibold text-white">{source.count.toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                    {(parity?.coverage ?? []).map((module) => (
                        <div key={module.key} className="rounded-[1.4rem] border border-white/10 bg-black/25 p-4">
                            <div className="mb-2 flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-white">{module.label}</p>
                                    <p className="mt-1 text-xs leading-6 text-gray-400">{module.detail}</p>
                                </div>
                                <AdminTruthBadge state={coerceUserDetailTruthState(module.status)} hasUsableValue={module.total > 0 || module.score > 0} />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-400">
                                {module.sources.map((source) => (
                                    <span key={`${module.key}-${source.key}`} className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">
                                        {source.label}: {source.count.toLocaleString()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-3">
                    {(parity?.validations ?? []).map((item) => (
                        <div key={item.label} className="rounded-[1.4rem] border border-white/10 bg-black/25 p-4">
                            <div className="mb-2 flex items-start justify-between gap-3">
                                <p className="text-sm font-semibold text-white">{item.label}</p>
                                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${getValidationClasses(item.status)}`}>
                                    {item.status}
                                </span>
                            </div>
                            <p className="text-xs leading-6 text-gray-400">{item.detail}</p>
                        </div>
                    ))}
                </div>
            </details>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="glass-panel rounded-3xl border border-white/5 p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                        <Play className="h-4 w-4 text-brand-purple" /> Top Viewed Drops
                    </h3>
                    <div className="space-y-3">
                        {(analytics?.topViewedDrops?.length || 0) === 0 ? (
                            <p className="text-sm text-gray-500">No library viewing has been tracked for this user yet.</p>
                        ) : (
                            analytics!.topViewedDrops.map((dropEntry) => (
                                <div key={dropEntry.dropId} className="rounded-2xl border border-white/5 bg-black/35 px-4 py-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-white">{dropEntry.dropTitle}</p>
                                            <p className="mt-1 text-xs text-gray-500">Drop ID: {dropEntry.dropId}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="inline-flex items-center gap-1 text-sm font-bold text-brand-purple">
                                                <Eye className="h-3.5 w-3.5" />
                                                {dropEntry.views}
                                            </p>
                                            <p className="mt-1 text-xs text-gray-400">
                                                {dropEntry.watchSeconds > 0
                                                    ? `${Math.max(1, Math.round(dropEntry.watchSeconds / 60))}m watched`
                                                    : "No completed watch time"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <details className="glass-panel rounded-3xl border border-white/5 p-6">
                    <summary className="mb-4 flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-white">
                        <span className="flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4 text-brand-purple" /> Security handoff
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                            {securitySummary?.allTimeCount ?? securityEvents.length} flags
                        </span>
                    </summary>
                    <div className="mb-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">All time flags</p>
                            <p className="mt-2 text-2xl font-black text-white">{securitySummary?.allTimeCount ?? securityEvents.length}</p>
                            <p className="mt-1 text-xs text-gray-500">Includes historical counters carried forward from legacy flags.</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Last 30 days</p>
                            <p className="mt-2 text-2xl font-black text-white">{securitySummary?.last30DaysCount ?? filteredSecurityEvents.length}</p>
                            <p className="mt-1 text-xs text-gray-500">Recent viewer protection alerts in the last month.</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Latest flag</p>
                            <p className="mt-2 text-sm font-bold text-white">{securitySummary?.lastViolationReason || "No flags recorded"}</p>
                            <p className="mt-1 text-xs text-gray-500">
                                {securitySummary?.lastViolationAt
                                    ? `${typeof securitySummary.lastViolationAt === "string"
                                        ? formatDistanceToNow(new Date(securitySummary.lastViolationAt), { addSuffix: true })
                                        : formatDistanceToNow(securitySummary.lastViolationAt, { addSuffix: true })}`
                                    : "No timestamp available"}
                            </p>
                        </div>
                    </div>

                    <div className="mb-4 flex flex-wrap gap-2">
                        {[
                            { key: "all" as const, label: "All time" },
                            { key: "30d" as const, label: "Last 30 days" },
                        ].map((option) => (
                            <button
                                key={option.key}
                                type="button"
                                onClick={() => setSecurityWindow(option.key)}
                                className={`rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] transition-colors ${
                                    securityWindow === option.key
                                        ? "border-brand-purple/40 bg-brand-purple/15 text-white"
                                        : "border-white/10 bg-black/30 text-gray-400 hover:text-white"
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    <div className="mb-4 grid gap-3 sm:grid-cols-2">
                        <label className="space-y-2 text-left">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Severity</span>
                            <select
                                value={securitySeverityFilter}
                                onChange={(event) => setSecuritySeverityFilter(event.target.value)}
                                className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none"
                            >
                                <option value="all">All severities</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </label>
                        <label className="space-y-2 text-left">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Reason</span>
                            <select
                                value={securityReasonFilter}
                                onChange={(event) => setSecurityReasonFilter(event.target.value)}
                                className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none"
                            >
                                <option value="all">All reasons</option>
                                {securityReasonOptions.map((reason) => (
                                    <option key={reason.reason} value={reason.reason}>{reason.label}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                    {securitySummary?.reasons?.length ? (
                        <div className="mb-4 flex flex-wrap gap-2">
                            {securitySummary.reasons.map((item) => (
                                <span key={item.reason} className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[11px] font-semibold text-gray-300">
                                    {item.label}: {item.count.toLocaleString()}
                                </span>
                            ))}
                        </div>
                    ) : null}
                    <div className="space-y-3">
                        {filteredSecurityEvents.length === 0 ? (
                            <p className="text-sm text-gray-500">No viewer protection issues have been logged for this account.</p>
                        ) : (
                            filteredSecurityEvents.map((event) => (
                                <div key={event.id} className="rounded-2xl border border-white/5 bg-black/35 px-4 py-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-white">{event.label}</p>
                                            <p className="mt-1 text-sm leading-6 text-gray-400">{event.message}</p>
                                            <p className="mt-2 text-xs text-gray-500">
                                                {event.locationLabel}
                                                {event.dropTitle ? ` | ${event.dropTitle}` : event.dropId ? ` | Drop ${event.dropId}` : ""}
                                            </p>
                                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500">
                                                {event.reason ? <span>Signal: {event.label}</span> : null}
                                                {event.pagePath ? <span>Path: {event.pagePath}</span> : null}
                                                {event.contentKind ? <span>Type: {event.contentKind}</span> : null}
                                                {event.assetKey ? <span>Asset: {event.assetKey}</span> : null}
                                                {typeof event.assetIndex === "number" && event.assetIndex >= 0 ? <span>Index: {event.assetIndex}</span> : null}
                                                {event.sessionId ? <span>Session: {event.sessionId}</span> : null}
                                            </div>
                                            {event.dropTitle && event.dropId ? (
                                                <p className="mt-1 text-[11px] text-gray-500">{event.dropId}</p>
                                            ) : null}
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                                                event.severity === "high"
                                                    ? "bg-red-500/15 text-red-300"
                                                    : event.severity === "medium"
                                                        ? "bg-amber-500/15 text-amber-300"
                                                        : "bg-white/10 text-gray-300"
                                            }`}>
                                                {event.severity}
                                            </span>
                                            <p className="mt-2 text-xs text-gray-500">
                                                {event.timestamp ? formatDistanceToNow(event.timestamp, { addSuffix: true }) : "Time unavailable"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    {targetUser.securityFlags?.ripAttempts ? (
                        <p className="mt-4 text-xs text-gray-500">
                            Showing {filteredSecurityEvents.length} of {securityEvents.length} stored security logs. Historical total on this account: {securitySummary?.allTimeCount ?? targetUser.securityFlags.ripAttempts}
                        </p>
                    ) : null}
                </details>
            </div>
        </div>
    );
}
