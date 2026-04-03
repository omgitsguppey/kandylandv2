"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { format, formatDistanceToNow } from "date-fns";
import {
    Activity,
    AlertCircle,
    ArrowLeft,
    Ban,
    CalendarDays,
    Eye,
    History,
    LifeBuoy,
    MessageSquare,
    Play,
    ShieldAlert,
    Sparkles,
    Users,
    Wallet,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { deriveGumdropEconomics } from "@/lib/gumdrop-economics";
import { Transaction, UserProfile } from "@/types/db";
import { authFetch } from "@/lib/authFetch";
import { toast } from "sonner";
import type { SupportReadinessSnapshot } from "@/lib/support-readiness";
import { trackEvent } from "@/lib/telemetry";
import { reportClientIssue } from "@/lib/client-error-reporting";
import {
    describeCreatorOnboardingBlockingReason,
    type CreatorOnboardingCanonicalRecord,
    type CreatorOnboardingHistoryEntry,
} from "@/lib/creator-onboarding";

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
    status: "healthy" | "partial" | "empty";
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
    { value: "legal_pending", label: "Pending" },
    { value: "legal_sent", label: "Sent" },
    { value: "legal_signed", label: "Signed" },
] as const satisfies Array<{ value: CreatorApplicationState["legalStatus"]; label: string }>;

const CREATOR_ID_STATUS_OPTIONS = [
    { value: "id_not_requested", label: "Not requested" },
    { value: "id_requested", label: "Requested" },
    { value: "id_submitted", label: "Submitted" },
    { value: "id_verified", label: "Verified" },
    { value: "id_rejected", label: "Rejected" },
] as const satisfies Array<{ value: CreatorApplicationState["idVerificationStatus"]; label: string }>;

const CREATOR_SEGMENTATION_STATUS_OPTIONS = [
    { value: "segment_unassigned", label: "Unassigned" },
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

function getCoverageClasses(status: "healthy" | "partial" | "empty") {
    if (status === "healthy") {
        return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
    }

    if (status === "empty") {
        return "border-red-500/20 bg-red-500/10 text-red-200";
    }

    return "border-amber-400/20 bg-amber-400/10 text-amber-200";
}

function formatRelativeTimestamp(value: unknown) {
    return typeof value === "number" && value > 0
        ? formatDistanceToNow(value, { addSuffix: true })
        : "No timestamp";
}

function formatCreatorStatusLabel(value: string | undefined) {
    return value ? value.replaceAll("_", " ") : "pending";
}

function getPrimaryCreatorReviewStatus(value: CreatorApplicationState | null) {
    if (!value) {
        return "pending";
    }

    if (value.approvalStatus !== "creator_pending") {
        return formatCreatorStatusLabel(value.approvalStatus);
    }

    return formatCreatorStatusLabel(value.submissionStatus);
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
    const [securityEvents, setSecurityEvents] = useState<SecurityEventItem[]>([]);
    const [securitySummary, setSecuritySummary] = useState<SecuritySummary | null>(null);
    const [supportReadiness, setSupportReadiness] = useState<SupportReadinessSnapshot | null>(null);
    const [creatorOps, setCreatorOps] = useState<CreatorOpsState | null>(null);
    const [creatorApplicationState, setCreatorApplicationState] = useState<CreatorApplicationState | null>(null);
    const [creatorOnboardingCanonical, setCreatorOnboardingCanonical] = useState<CreatorOnboardingCanonicalRecord | null>(null);
    const [creatorOnboardingHistory, setCreatorOnboardingHistory] = useState<CreatorOnboardingHistoryEntry[]>([]);
    const [savingCreatorApplication, setSavingCreatorApplication] = useState(false);
    const [creatorRestrictionsState, setCreatorRestrictionsState] = useState<CreatorRestrictionFlags | null>(null);
    const [savingCreatorRestrictions, setSavingCreatorRestrictions] = useState(false);
    const [creatorActionKey, setCreatorActionKey] = useState<string | null>(null);
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
            setSecuritySummary(result.securitySummary || null);
            setSecurityEvents(result.securityEvents || []);
            setSupportReadiness(result.supportReadiness || null);
            setCreatorOps(result.creatorOps || null);
            setCreatorApplicationState(result.user.creatorApplication || null);
            setCreatorOnboardingCanonical(result.creatorOnboardingCanonical || null);
            setCreatorOnboardingHistory(result.creatorOnboardingHistory || []);
            setCreatorRestrictionsState(result.user.creatorRestrictions || null);
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
            setSecuritySummary(null);
            setSecurityEvents([]);
            setSupportReadiness(null);
            setCreatorOps(null);
            setCreatorApplicationState(null);
            setCreatorOnboardingCanonical(null);
            setCreatorOnboardingHistory([]);
            setCreatorRestrictionsState(null);
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
    const averageOrderUsd = (analytics?.purchaseCount || purchaseTransactions.length) > 0
        ? totalSpentUsd / (analytics?.purchaseCount || purchaseTransactions.length)
        : 0;
    const failedTxCount = transactions.filter((transaction) => transaction.status === "failed").length;
    const parity = analytics?.parity;

    const watchTimeLabel = useMemo(() => {
        if (!analytics?.watchSecondsTotal) {
            return "0m";
        }

        if (analytics.watchSecondsTotal >= 3600) {
            return `${analytics.watchHours.toFixed(1)}h`;
        }

        return `${Math.max(1, Math.round(analytics.watchSecondsTotal / 60))}m`;
    }, [analytics]);

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

    const updateCreatorApplicationField = <K extends keyof CreatorApplicationState>(key: K, value: CreatorApplicationState[K]) => {
        setCreatorApplicationState((current) => {
            if (!current) {
                return current;
            }

            return {
                ...current,
                [key]: value,
            };
        });
    };

    const handleSaveCreatorApplication = async () => {
        if (!targetUser || !creatorApplicationState) {
            return;
        }

        try {
            setSavingCreatorApplication(true);
            const response = await authFetch("/api/admin/users", {
                method: "PUT",
                body: JSON.stringify({
                    userId: targetUser.uid,
                    updates: {
                        creatorApplication: creatorApplicationState,
                    },
                }),
            });
            const result = await response.json().catch(() => ({})) as { error?: string };
            if (!response.ok) {
                throw new Error(typeof result.error === "string" ? result.error : "Failed to save creator application.");
            }
            trackEvent("creator_application_review_saved", {
                component_name: "admin_creator_application_panel",
                submission_status: creatorApplicationState.submissionStatus,
                approval_status: creatorApplicationState.approvalStatus,
                legal_document_status: creatorApplicationState.legalStatus,
                id_verification_status: creatorApplicationState.idVerificationStatus,
                segmentation_status: creatorApplicationState.segmentationStatus,
            });
            toast.success("Creator intake updated.");
            await loadUserData();
        } catch (actionError) {
            reportClientIssue({
                channel: "ui",
                message: "Admin creator application save failed",
                error: actionError,
                detail: {
                    adminView: "user_detail",
                    action: "save_creator_application",
                    userId: targetUser?.uid ?? userId,
                },
                consoleLabel: "[Admin User Detail] save creator application failed",
            });
            toast.error(actionError instanceof Error ? actionError.message : "Failed to save creator application.");
        } finally {
            setSavingCreatorApplication(false);
        }
    };

    const updateCreatorRestriction = (key: keyof CreatorRestrictionFlags, value: boolean) => {
        setCreatorRestrictionsState((current) => ({
            messagingRestricted: current?.messagingRestricted === true,
            broadcastsRestricted: current?.broadcastsRestricted === true,
            subscriptionsRestricted: current?.subscriptionsRestricted === true,
            bookingsRestricted: current?.bookingsRestricted === true,
            customRequestsRestricted: current?.customRequestsRestricted === true,
            dropSubmissionsRestricted: current?.dropSubmissionsRestricted === true,
            payoutsRestricted: current?.payoutsRestricted === true,
            moderationNote: current?.moderationNote,
            [key]: value,
        }));
    };

    const handleSaveCreatorRestrictions = async () => {
        if (!targetUser || !creatorRestrictionsState) {
            return;
        }

        try {
            setSavingCreatorRestrictions(true);
            const response = await authFetch("/api/admin/users", {
                method: "PUT",
                body: JSON.stringify({
                    userId: targetUser.uid,
                    updates: {
                        creatorRestrictions: creatorRestrictionsState,
                    },
                }),
            });
            const result = await response.json().catch(() => ({})) as { error?: string };
            if (!response.ok) {
                throw new Error(typeof result.error === "string" ? result.error : "Failed to save creator restrictions.");
            }
            toast.success("Creator restrictions updated.");
            await loadUserData();
        } catch (actionError) {
            reportClientIssue({
                channel: "ui",
                message: "Admin creator restrictions save failed",
                error: actionError,
                detail: {
                    adminView: "user_detail",
                    action: "save_creator_restrictions",
                    userId: targetUser?.uid ?? userId,
                },
                consoleLabel: "[Admin User Detail] save creator restrictions failed",
            });
            toast.error(actionError instanceof Error ? actionError.message : "Failed to save creator restrictions.");
        } finally {
            setSavingCreatorRestrictions(false);
        }
    };

    const handleRemoveCreatorMessage = async (messageId: string) => {
        try {
            setCreatorActionKey(`message:${messageId}`);
            const response = await authFetch(`/api/creator/messages?messageId=${encodeURIComponent(messageId)}`, {
                method: "DELETE",
            });
            const result = await response.json().catch(() => ({})) as { error?: string };
            if (!response.ok) {
                throw new Error(typeof result.error === "string" ? result.error : "Failed to remove creator message.");
            }
            toast.success("Creator message removed.");
            await loadUserData();
        } catch (actionError) {
            reportClientIssue({
                channel: "ui",
                message: "Admin creator message removal failed",
                error: actionError,
                detail: {
                    adminView: "user_detail",
                    action: "remove_creator_message",
                    userId: targetUser?.uid ?? userId,
                    messageId,
                },
                consoleLabel: "[Admin User Detail] remove creator message failed",
            });
            toast.error(actionError instanceof Error ? actionError.message : "Failed to remove creator message.");
        } finally {
            setCreatorActionKey(null);
        }
    };

    const handleRemoveCreatorBroadcast = async (broadcastId: string) => {
        try {
            setCreatorActionKey(`broadcast:${broadcastId}`);
            const response = await authFetch(`/api/creator/broadcasts?broadcastId=${encodeURIComponent(broadcastId)}`, {
                method: "DELETE",
            });
            const result = await response.json().catch(() => ({})) as { error?: string };
            if (!response.ok) {
                throw new Error(typeof result.error === "string" ? result.error : "Failed to remove creator broadcast.");
            }
            toast.success("Creator broadcast removed.");
            await loadUserData();
        } catch (actionError) {
            reportClientIssue({
                channel: "ui",
                message: "Admin creator broadcast removal failed",
                error: actionError,
                detail: {
                    adminView: "user_detail",
                    action: "remove_creator_broadcast",
                    userId: targetUser?.uid ?? userId,
                    broadcastId,
                },
                consoleLabel: "[Admin User Detail] remove creator broadcast failed",
            });
            toast.error(actionError instanceof Error ? actionError.message : "Failed to remove creator broadcast.");
        } finally {
            setCreatorActionKey(null);
        }
    };

    const handleReviewPayout = async (payoutRequestId: string, action: "honor" | "reject") => {
        try {
            setCreatorActionKey(`payout:${payoutRequestId}:${action}`);
            const response = await authFetch("/api/creator/payouts", {
                method: "PUT",
                body: JSON.stringify({
                    payoutRequestId,
                    action,
                }),
            });
            const result = await response.json().catch(() => ({})) as { error?: string };
            if (!response.ok) {
                throw new Error(typeof result.error === "string" ? result.error : "Failed to review payout.");
            }
            toast.success(action === "honor" ? "Payout honored." : "Payout rejected.");
            await loadUserData();
        } catch (actionError) {
            reportClientIssue({
                channel: "payments",
                message: "Admin creator payout review failed",
                error: actionError,
                detail: {
                    adminView: "user_detail",
                    action: "review_payout",
                    userId: targetUser?.uid ?? userId,
                    payoutRequestId,
                    reviewAction: action,
                },
                consoleLabel: "[Admin User Detail] review payout failed",
            });
            toast.error(actionError instanceof Error ? actionError.message : "Failed to review payout.");
        } finally {
            setCreatorActionKey(null);
        }
    };

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
        <div className="mx-auto max-w-5xl space-y-6 pb-20">
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
                                    <Image src={targetUser.photoURL} alt="Avatar" fill className="object-cover" />
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
                                <p className="mt-1 text-xs text-gray-500">Detailed activity, watch behavior, and protection events for this account.</p>
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

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="glass-panel rounded-3xl border border-white/5 p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                        <Activity className="h-4 w-4 text-brand-purple" /> Behavior Profile
                    </h3>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Gross cash</span>
                            <span className="text-sm font-bold text-brand-purple">${totalSpentUsd.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">PayPal fees</span>
                            <span className="text-sm font-bold text-white">${paypalFeeUsd.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Net cash</span>
                            <span className="text-sm font-bold text-white">${netRevenueUsd.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Adjusted profit</span>
                            <span className="text-sm font-bold text-white">${adjustedProfitUsd.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Bonus granted</span>
                            <span className="text-sm font-bold text-white">{bonusGumDrops.toLocaleString()} GD</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Bonus value</span>
                            <span className="text-sm font-bold text-white">${bonusValueUsd.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Avg order</span>
                            <span className="text-sm font-bold text-white">${averageOrderUsd.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Effective rate</span>
                            <span className="text-sm font-bold text-white">
                                ${deliveredGumDrops > 0 ? (totalSpentUsd / (deliveredGumDrops / 100)).toFixed(2) : "0.00"} / 100 GD
                            </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Failed transactions</span>
                            <span className="text-sm font-bold text-red-400">{failedTxCount}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Tracked actions</span>
                            <span className="text-sm font-bold text-white">{analytics?.eventCount || 0}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Unwraps</span>
                            <span className="text-sm font-bold text-white">{analytics?.unwrapCount || 0}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Unlock spend</span>
                            <span className="text-sm font-bold text-white">{analytics?.unlockSpendGdTotal || 0} GD</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Viewer sessions</span>
                            <span className="text-sm font-bold text-white">{analytics?.viewerSessionCount || 0}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Unique drops viewed</span>
                            <span className="text-sm font-bold text-white">{analytics?.uniqueViewedDrops || 0}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Watch time</span>
                            <span className="text-sm font-bold text-white">{watchTimeLabel}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Files started / completed</span>
                            <span className="text-sm font-bold text-white">
                                {analytics?.assetViewCount || 0} / {analytics?.assetCompletionCount || 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Avg load</span>
                            <span className="text-sm font-bold text-white">{analytics?.avgLoadMs || 0}ms</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <span className="text-sm text-gray-400">Last seen</span>
                            <span className="text-sm font-bold text-white">
                                {analytics?.lastSeenAt ? formatDistanceToNow(analytics.lastSeenAt, { addSuffix: true }) : "No activity yet"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="glass-panel rounded-3xl border border-white/5 p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                        <History className="h-4 w-4 text-brand-purple" /> Action Ledger
                    </h3>

                    <div className="custom-scrollbar max-h-[400px] space-y-3 overflow-y-auto pr-2">
                        {transactions.length === 0 ? (
                            <p className="py-8 text-center text-sm text-gray-500">No behavior logged yet.</p>
                        ) : (
                            transactions.map((transaction) => {
                                const transactionType = String(transaction.type);

                                return (
                                    <div key={transaction.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/40 p-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="line-clamp-1 text-sm font-bold text-white">
                                                {transaction.description || transactionType}
                                            </div>
                                            <div className="mt-1 font-mono text-[10px] text-gray-500">
                                                {formatDistanceToNow((transaction.timestamp as number) > 0 ? (transaction.timestamp as number) : Date.now(), { addSuffix: true })}
                                            </div>
                                        </div>
                                        <div className="ml-4 flex shrink-0 flex-col items-end gap-1">
                                            {transaction.type === "unlock_content" ? (
                                                <span className="rounded-md border border-white/10 bg-zinc-800 px-2 py-0.5 text-xs font-bold text-zinc-400">
                                                    {transaction.amount} GD
                                                </span>
                                            ) : transactionType === "purchase_currency" || transactionType === "purchase" ? (
                                                <span className="rounded-md border border-brand-purple/20 bg-brand-purple/10 px-2 py-0.5 text-xs font-bold text-brand-purple">
                                                    ${((transaction.grossRevenueUsd ?? transaction.cost ?? 0)).toFixed(2)}
                                                </span>
                                            ) : Number.isFinite(transaction.amount) && transaction.amount !== 0 ? (
                                                <span className="rounded-md border border-white/10 bg-black/25 px-2 py-0.5 text-xs font-bold text-gray-300">
                                                    {transaction.amount > 0 ? "+" : ""}{transaction.amount} GD
                                                </span>
                                            ) : (
                                                <span className="text-xs font-bold text-gray-400">Log</span>
                                            )}

                                            {transaction.status === "failed" ? (
                                                <span className="flex items-center gap-1 text-[9px] font-bold uppercase text-red-500">
                                                    <Ban className="h-2 w-2" /> Failed
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

            <div className="glass-panel rounded-3xl border border-white/5 p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                            <LifeBuoy className="h-4 w-4 text-brand-purple" /> Support Readiness
                        </h3>
                        <p className="mt-1 text-xs leading-6 text-gray-400">
                            Future in-site support hooks for this account, using today&apos;s bug reports and identity channels without requiring the live chat system yet.
                        </p>
                    </div>
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${getSupportStateClasses(supportReadiness?.summary.state || "ready")}`}>
                        {supportReadiness?.summary.stateLabel || "Ready for support"}
                    </span>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                    <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Support handle</p>
                                <p className="mt-2 text-lg font-black text-white">{supportReadiness?.summary.primaryHandle || targetUser.username || targetUser.email || targetUser.uid}</p>
                                <p className="mt-1 text-xs text-gray-400">Primary identity future live support will attach to.</p>
                            </div>
                            <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Future thread key</p>
                                <p className="mt-2 break-all font-mono text-xs font-semibold text-white">{supportReadiness?.summary.threadKey || `support:${targetUser.uid}`}</p>
                                <p className="mt-1 text-xs text-gray-400">Stable anchor for future support-thread ownership.</p>
                            </div>
                            <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Open support threads</p>
                                <p className="mt-2 text-2xl font-black text-white">{supportReadiness?.summary.openThreads ?? 0}</p>
                                <p className="mt-1 text-xs text-gray-400">{supportReadiness?.summary.totalThreads ?? 0} total historical threads.</p>
                            </div>
                            <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Support signals</p>
                                <p className="mt-2 text-2xl font-black text-white">{supportReadiness?.summary.bugReportCount ?? 0}</p>
                                <p className="mt-1 text-xs text-gray-400">Bug reports already usable as early support intake.</p>
                            </div>
                        </div>

                        <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                            <div className="flex flex-wrap gap-2">
                                <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${supportReadiness?.summary.channels.email ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-white/5 text-gray-400"}`}>
                                    Email {supportReadiness?.summary.channels.email ? "ready" : "missing"}
                                </span>
                                <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${supportReadiness?.summary.channels.inApp ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-white/5 text-gray-400"}`}>
                                    In-app {supportReadiness?.summary.channels.inApp ? "ready" : "blocked"}
                                </span>
                                <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${supportReadiness?.summary.channels.browserPush ? "border-brand-purple/20 bg-brand-purple/10 text-brand-purple" : "border-white/10 bg-white/5 text-gray-400"}`}>
                                    Push {supportReadiness?.summary.channels.browserPush ? "enabled" : "off"}
                                </span>
                            </div>
                            <p className="mt-3 text-xs leading-6 text-gray-400">
                                {supportReadiness?.summary.stateDescription || "No current support thread exists, but the account is ready for future in-site support handoff."}
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
                                <p className="mt-1 text-xs leading-6 text-gray-400">
                                    Live support threads will plug in here later. For now, existing bug reports and any seeded thread records already surface in the same operational lane.
                                </p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                                {supportReadiness?.signals.length ?? 0} loaded
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
                                    No current support conversations or bug reports are attached to this account yet. This lane is ready for future in-site support thread integration.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {creatorApplication ? (
                <div className="glass-panel rounded-3xl border border-white/5 p-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                                <Sparkles className="h-4 w-4 text-brand-purple" /> Creator Intake Review
                            </h3>
                            <p className="mt-1 text-xs leading-6 text-gray-400">
                                Manage the pre-creator lane: legal documents, ID verification, manual segmenting, and review state before this account ever sees creator tools.
                            </p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                            Queue #{creatorApplication.queuePosition.toLocaleString()}
                        </span>
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                        <div className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Creator name</p>
                                    <p className="mt-2 text-lg font-black text-white">{creatorApplication.creatorDisplayName}</p>
                                    <p className="mt-1 text-xs text-gray-400">Submitted {formatRelativeTimestamp(creatorApplication.submittedAt)}</p>
                                </div>
                                <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Primary platform</p>
                                    <p className="mt-2 text-lg font-black text-white">{creatorApplication.creatorPrimaryPlatform || "Pending"}</p>
                                    <p className="mt-1 text-xs text-gray-400">Current status: {getPrimaryCreatorReviewStatus(creatorApplication)}</p>
                                </div>
                                <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Bypass fan onboarding</p>
                                    <p className="mt-2 text-2xl font-black text-white">{creatorApplication.bypassFanOnboarding ? "Enabled" : "Disabled"}</p>
                                    <p className="mt-1 text-xs text-gray-400">Keeps creator applicants out of the regular fan onboarding lane.</p>
                                </div>
                                <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Last review touch</p>
                                    <p className="mt-2 text-lg font-black text-white">{formatRelativeTimestamp(creatorApplication.updatedAt)}</p>
                                    <p className="mt-1 text-xs text-gray-400">{creatorApplication.reviewedBy ? `Reviewed by ${creatorApplication.reviewedBy}` : "No reviewer stamped yet"}</p>
                                </div>
                            </div>

                            <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                                <p className="text-sm font-semibold text-white">Creator context</p>
                                <p className="mt-3 text-sm leading-7 text-gray-400">
                                    {creatorApplication.creatorContentFocus || "No creator content note supplied yet."}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="space-y-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Submission status</span>
                                    <select
                                        value={creatorApplication.submissionStatus}
                                        onChange={(event) => updateCreatorApplicationField("submissionStatus", event.target.value as CreatorApplicationState["submissionStatus"])}
                                        className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none"
                                    >
                                        {CREATOR_SUBMISSION_STATUS_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </label>

                                <label className="space-y-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Approval state</span>
                                    <select
                                        value={creatorApplication.approvalStatus}
                                        onChange={(event) => updateCreatorApplicationField("approvalStatus", event.target.value as CreatorApplicationState["approvalStatus"])}
                                        className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none"
                                    >
                                        {CREATOR_APPROVAL_STATUS_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </label>

                                <label className="space-y-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Manual segment</span>
                                    <select
                                        value={creatorApplication.segmentationStatus}
                                        onChange={(event) => updateCreatorApplicationField("segmentationStatus", event.target.value as CreatorApplicationState["segmentationStatus"])}
                                        className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none"
                                    >
                                        {CREATOR_SEGMENTATION_STATUS_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </label>

                                <label className="space-y-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Legal doc state</span>
                                    <select
                                        value={creatorApplication.legalStatus}
                                        onChange={(event) => updateCreatorApplicationField("legalStatus", event.target.value as CreatorApplicationState["legalStatus"])}
                                        className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none"
                                    >
                                        {CREATOR_LEGAL_STATUS_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </label>

                                <label className="space-y-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">ID verification</span>
                                    <select
                                        value={creatorApplication.idVerificationStatus}
                                        onChange={(event) => updateCreatorApplicationField("idVerificationStatus", event.target.value as CreatorApplicationState["idVerificationStatus"])}
                                        className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none"
                                    >
                                        {CREATOR_ID_STATUS_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </label>

                                <label className="space-y-2 sm:col-span-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Legal document link</span>
                                    <input
                                        value={creatorApplication.legalDocumentUrl || ""}
                                        onChange={(event) => updateCreatorApplicationField("legalDocumentUrl", event.target.value)}
                                        className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none"
                                        placeholder="Paste the creator document link here"
                                    />
                                </label>

                                <label className="space-y-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Segment label</span>
                                    <input
                                        value={creatorApplication.segmentLabel || ""}
                                        onChange={(event) => updateCreatorApplicationField("segmentLabel", event.target.value)}
                                        className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none"
                                        placeholder="Ex: priority creator, launch partner"
                                    />
                                </label>

                                <label className="space-y-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Queue position</span>
                                    <input
                                        value={creatorApplication.queuePosition}
                                        onChange={(event) => updateCreatorApplicationField("queuePosition", Math.max(1, Number(event.target.value) || 1))}
                                        type="number"
                                        min={1}
                                        className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none"
                                    />
                                </label>

                                <label className="space-y-2 sm:col-span-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Admin notes</span>
                                    <textarea
                                        value={creatorApplication.adminNotes || ""}
                                        onChange={(event) => updateCreatorApplicationField("adminNotes", event.target.value)}
                                        rows={4}
                                        className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none"
                                        placeholder="Internal notes for contracts, docs, ID review, or segment decisions"
                                    />
                                </label>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-gray-500">
                                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Submission: {formatCreatorStatusLabel(creatorApplication.submissionStatus)}</span>
                                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Approval: {formatCreatorStatusLabel(creatorApplication.approvalStatus)}</span>
                                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Legal: {formatCreatorStatusLabel(creatorApplication.legalStatus)}</span>
                                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">ID: {formatCreatorStatusLabel(creatorApplication.idVerificationStatus)}</span>
                                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Segment: {formatCreatorStatusLabel(creatorApplication.segmentationStatus)}</span>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Approval readiness</p>
                                    <p className="mt-2 text-lg font-black text-white">{creatorReadyForApproval ? "Ready now" : "Blocked"}</p>
                                    <p className="mt-1 text-xs text-gray-400">
                                        {creatorReadyForApproval
                                            ? "Legal, ID, and segment prerequisites are satisfied for approval."
                                            : "The canonical onboarding record still has unresolved blockers."}
                                    </p>
                                </div>
                                <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Public role state</p>
                                    <p className="mt-2 text-lg font-black text-white">{formatCreatorStatusLabel(creatorRoleState)}</p>
                                    <p className="mt-1 text-xs text-gray-400">
                                        {creatorRoleState === "creator"
                                            ? "Creator tools are currently active for this account."
                                            : "This account is still isolated from public creator tooling."}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-white">Current blockers</p>
                                        <p className="mt-1 text-xs leading-6 text-gray-400">
                                            Canonical onboarding blockers are derived from legal, ID, segment, approval, and role activation state.
                                        </p>
                                    </div>
                                    <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                                        {creatorBlockingReasons.length} open
                                    </span>
                                </div>

                                <div className="mt-4 space-y-3">
                                    {creatorBlockingReasons.length === 0 ? (
                                        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                                            No canonical blockers remain on this creator onboarding record.
                                        </div>
                                    ) : (
                                        creatorBlockingReasons.map((blockingReason) => (
                                            <div key={blockingReason.reason} className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                                                <div className="flex items-start gap-3">
                                                    <AlertCircle className={`mt-0.5 h-4 w-4 shrink-0 ${
                                                        blockingReason.severity === "error"
                                                            ? "text-red-300"
                                                            : blockingReason.severity === "warn"
                                                                ? "text-amber-300"
                                                                : "text-brand-purple"
                                                    }`} />
                                                    <div>
                                                        <p className="text-sm font-semibold text-white">{blockingReason.label}</p>
                                                        <p className="mt-1 text-xs leading-6 text-gray-400">{blockingReason.description}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {targetUser && (creatorApplication.idDocuments?.front || creatorApplication.idDocuments?.back || creatorApplication.idDocument) ? (
                                <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Submitted ID files</p>
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                        {(["front", "back"] as const).map((side) => {
                                            const document = creatorApplication.idDocuments?.[side]
                                                ?? (side === "front" && (!creatorApplication.idDocuments || Object.keys(creatorApplication.idDocuments).length === 0)
                                                    ? creatorApplication.idDocument
                                                    : undefined);
                                            return (
                                                <div key={side} className="rounded-[1.1rem] border border-white/10 bg-black/25 p-3">
                                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">{side === "front" ? "Front of ID" : "Back of ID"}</p>
                                                    <p className="mt-2 text-sm font-semibold text-white">{document?.fileName || "Not uploaded"}</p>
                                                    {document ? (
                                                        <>
                                                            <p className="mt-1 text-xs text-gray-400">
                                                                Submitted {formatRelativeTimestamp(document.uploadedAt)} · {(document.sizeBytes / 1024).toFixed(1)} KB
                                                            </p>
                                                            <a
                                                                href={`/api/admin/user/${targetUser.uid}/creator-onboarding/id-document?side=${side}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="mt-3 inline-flex items-center justify-center rounded-2xl border border-brand-purple/25 bg-brand-purple/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-purple transition-colors hover:bg-brand-purple/20"
                                                            >
                                                                Open {side === "front" ? "front" : "back"}
                                                            </a>
                                                        </>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : null}

                            <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-white">Audit trail</p>
                                        <p className="mt-1 text-xs leading-6 text-gray-400">
                                            Every creator onboarding state transition writes back to the canonical history log.
                                        </p>
                                    </div>
                                    <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                                        {creatorOnboardingHistory.length} events
                                    </span>
                                </div>

                                <div className="mt-4 space-y-3">
                                    {creatorOnboardingHistory.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-400">
                                            No canonical history events have been loaded for this creator yet.
                                        </div>
                                    ) : (
                                        creatorOnboardingHistory.slice(0, 8).map((entry) => (
                                            <div key={`${entry.eventType}-${entry.timestamp}-${entry.actorId}`} className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-white">{entry.summary}</p>
                                                        <p className="mt-1 text-xs text-gray-400">
                                                            {entry.actorLabel} · {format(entry.timestamp, "MMM d, yyyy h:mm a")}
                                                        </p>
                                                        {entry.detail ? (
                                                            <p className="mt-2 text-xs leading-6 text-gray-400">{entry.detail}</p>
                                                        ) : null}
                                                    </div>
                                                    <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                                                        {entry.eventType.replaceAll("_", " ")}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="mt-5 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => void handleSaveCreatorApplication()}
                                    disabled={savingCreatorApplication}
                                    className="rounded-full bg-gradient-to-r from-brand-purple to-purple-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-purple/20 transition-transform active:scale-[0.98] disabled:opacity-50"
                                >
                                    {savingCreatorApplication ? "Saving..." : "Save creator intake"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {isCreatorOpsUser ? (
                <div className="glass-panel rounded-3xl border border-white/5 p-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                                <Sparkles className="h-4 w-4 text-brand-purple" /> Creator Operations
                            </h3>
                            <p className="mt-1 text-xs leading-6 text-gray-400">
                                Live creator relationship, monetization, moderation, and submission state inside the existing admin user view.
                            </p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                            {creatorOps ? "Creator engine live" : "No creator activity yet"}
                        </span>
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                        <div className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {[
                                    { label: "Followers", value: creatorOps?.summary.followerCount ?? 0, helper: `${creatorOps?.summary.favoriteCount ?? 0} favorites` },
                                    { label: "Alerts enabled", value: creatorOps?.summary.notificationsEnabledCount ?? 0, helper: `${creatorOps?.summary.broadcasts ?? 0} broadcasts` },
                                    { label: "Subscribers", value: creatorOps?.summary.activeSubscribers ?? 0, helper: `${creatorOps?.summary.lapsedSubscribers ?? 0} lapsed` },
                                    { label: "Open requests", value: creatorOps?.summary.openRequests ?? 0, helper: `${creatorOps?.summary.bookedCalls ?? 0} booked calls` },
                                    { label: "Pending payouts", value: creatorOps?.summary.pendingPayouts ?? 0, helper: `${creatorOps?.summary.pendingCashoutGd ?? 0} GD pending` },
                                    { label: "Drop submissions", value: creatorOps?.summary.pendingDropSubmissions ?? 0, helper: `${creatorOps?.summary.openThreads ?? 0} active chat threads` },
                                ].map((item) => (
                                    <div key={item.label} className="rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">{item.label}</p>
                                        <p className="mt-2 text-2xl font-black text-white">{item.value}</p>
                                        <p className="mt-1 text-xs text-gray-400">{item.helper}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                                <div className="mb-3 flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-white">Creator restrictions</p>
                                        <p className="mt-1 text-xs leading-6 text-gray-400">Disable specific creator systems without changing the user’s role.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleSaveCreatorRestrictions}
                                        disabled={!creatorRestrictionsState || savingCreatorRestrictions}
                                        className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white disabled:opacity-60"
                                    >
                                        {savingCreatorRestrictions ? "Saving..." : "Save"}
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {CREATOR_RESTRICTION_FIELDS.map((field) => (
                                        <label key={field.key} className="flex items-start justify-between gap-4 rounded-[1.1rem] border border-white/10 bg-black/25 px-3 py-3">
                                            <div>
                                                <p className="text-sm font-semibold text-white">{field.label}</p>
                                                <p className="mt-1 text-xs leading-5 text-gray-400">{field.description}</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={creatorRestrictionsState?.[field.key] === true}
                                                onChange={(event) => updateCreatorRestriction(field.key, event.target.checked)}
                                                className="mt-1 h-4 w-4 rounded border-white/20 bg-black/40 text-brand-purple"
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                                <p className="text-sm font-semibold text-white">Creator pricing + availability snapshot</p>
                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Subscription</p>
                                        <p className="mt-1 text-sm font-semibold text-white">
                                            {targetUser.creatorSettings?.subscriptionsEnabled === false ? "Off" : `${targetUser.creatorSettings?.subscriptionPriceGd ?? 0} GD / month`}
                                        </p>
                                    </div>
                                    <div className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Bookings</p>
                                        <p className="mt-1 text-sm font-semibold text-white">
                                            {targetUser.creatorSettings?.bookingsEnabled === false
                                                ? "Off"
                                                : `${targetUser.creatorSettings?.phoneRatePerMinuteGd ?? 0} GD phone • ${targetUser.creatorSettings?.videoRatePerMinuteGd ?? 0} GD video`}
                                        </p>
                                    </div>
                                    <div className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Messaging</p>
                                        <p className="mt-1 text-sm font-semibold text-white">
                                            {targetUser.creatorSettings?.messagingEnabled === false ? "Off" : "Paid chat live"}
                                        </p>
                                    </div>
                                    <div className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Accrued creator GD</p>
                                        <p className="mt-1 text-sm font-semibold text-white">{creatorOps?.summary.totalAccruedGd ?? 0} GD</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                                    <div className="mb-3 flex items-start justify-between gap-3">
                                        <div>
                                            <p className="flex items-center gap-2 text-sm font-semibold text-white"><MessageSquare className="h-4 w-4 text-brand-purple" /> Recent creator messages</p>
                                            <p className="mt-1 text-xs text-gray-400">Admins can unsend any creator-side message or media.</p>
                                        </div>
                                    </div>
                                    <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                                        {(creatorOps?.messages.length || 0) === 0 ? (
                                            <p className="text-xs text-gray-500">No creator messages recorded yet.</p>
                                        ) : (
                                            creatorOps!.messages.map((message) => (
                                                <div key={String(message.id)} className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
                                                                {String(message.senderRole || "user")} • {String(message.messageKind || "text")}
                                                            </p>
                                                            <p className="mt-1 text-sm text-white">
                                                                {typeof message.text === "string" && message.text.trim().length > 0
                                                                    ? message.text
                                                                    : typeof message.assetUrl === "string"
                                                                        ? message.assetUrl
                                                                        : "Media message"}
                                                            </p>
                                                            <p className="mt-1 text-[11px] text-gray-500">{formatRelativeTimestamp(message.createdAt)}</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            disabled={creatorActionKey === `message:${String(message.id)}` || typeof message.moderationRemovedAt === "number"}
                                                            onClick={() => handleRemoveCreatorMessage(String(message.id))}
                                                            className="rounded-lg border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white disabled:opacity-50"
                                                        >
                                                            {typeof message.moderationRemovedAt === "number" ? "Removed" : creatorActionKey === `message:${String(message.id)}` ? "..." : "Unsend"}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                                    <p className="flex items-center gap-2 text-sm font-semibold text-white"><Wallet className="h-4 w-4 text-brand-purple" /> Payouts + accruals</p>
                                    <div className="mt-3 max-h-[320px] space-y-2 overflow-y-auto pr-1">
                                        {(creatorOps?.payouts.length || 0) === 0 && (creatorOps?.accruals.length || 0) === 0 ? (
                                            <p className="text-xs text-gray-500">No creator payouts or accruals yet.</p>
                                        ) : (
                                            <>
                                                {(creatorOps?.payouts || []).map((payout) => (
                                                    <div key={`payout-${String(payout.id)}`} className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <p className="text-sm font-semibold text-white">{typeof payout.requestedGd === "number" ? payout.requestedGd : 0} GD payout</p>
                                                                <p className="mt-1 text-[11px] text-gray-500">{String(payout.status || "pending")} • {formatRelativeTimestamp(payout.createdAt)}</p>
                                                            </div>
                                                            {payout.status === "pending" ? (
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleReviewPayout(String(payout.id), "honor")}
                                                                        disabled={creatorActionKey === `payout:${String(payout.id)}:honor`}
                                                                        className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200 disabled:opacity-50"
                                                                    >
                                                                        Honor
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleReviewPayout(String(payout.id), "reject")}
                                                                        disabled={creatorActionKey === `payout:${String(payout.id)}:reject`}
                                                                        className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-red-200 disabled:opacity-50"
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                ))}
                                                {(creatorOps?.accruals || []).slice(0, 6).map((accrual) => (
                                                    <div key={`accrual-${String(accrual.id)}`} className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3">
                                                        <p className="text-sm font-semibold text-white">
                                                            {typeof accrual.creatorShareGd === "number" ? accrual.creatorShareGd : 0} GD • {String(accrual.sourceType || "accrual")}
                                                        </p>
                                                        <p className="mt-1 text-[11px] text-gray-500">{formatRelativeTimestamp(accrual.createdAt)}</p>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-3">
                                <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                                    <p className="flex items-center gap-2 text-sm font-semibold text-white"><Users className="h-4 w-4 text-brand-purple" /> Requests</p>
                                    <div className="mt-3 max-h-[260px] space-y-2 overflow-y-auto pr-1">
                                        {(creatorOps?.requests.length || 0) === 0 ? (
                                            <p className="text-xs text-gray-500">No creator requests yet.</p>
                                        ) : (
                                            creatorOps!.requests.map((request) => (
                                                <div key={String(request.id)} className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3">
                                                    <p className="text-sm font-semibold text-white">{String(request.categoryLabel || "Request")}</p>
                                                    <p className="mt-1 text-[11px] text-gray-400">{String(request.status || "pending")} • {typeof request.priceGd === "number" ? request.priceGd : 0} GD</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                                    <p className="flex items-center gap-2 text-sm font-semibold text-white"><Activity className="h-4 w-4 text-brand-purple" /> Bookings</p>
                                    <div className="mt-3 max-h-[260px] space-y-2 overflow-y-auto pr-1">
                                        {(creatorOps?.bookings.length || 0) === 0 ? (
                                            <p className="text-xs text-gray-500">No creator bookings yet.</p>
                                        ) : (
                                            creatorOps!.bookings.map((booking) => (
                                                <div key={String(booking.id)} className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3">
                                                    <p className="text-sm font-semibold text-white">{String(booking.serviceType || "call")} • {typeof booking.durationMinutes === "number" ? booking.durationMinutes : 0} min</p>
                                                    <p className="mt-1 text-[11px] text-gray-400">{String(booking.status || "booked")} • {formatRelativeTimestamp(booking.startAt)}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                                    <p className="flex items-center gap-2 text-sm font-semibold text-white"><Sparkles className="h-4 w-4 text-brand-purple" /> Broadcasts + submissions</p>
                                    <div className="mt-3 max-h-[260px] space-y-2 overflow-y-auto pr-1">
                                        {(creatorOps?.broadcasts.length || 0) === 0 && (creatorOps?.pendingSubmissions.length || 0) === 0 ? (
                                            <p className="text-xs text-gray-500">No creator broadcasts or submissions yet.</p>
                                        ) : (
                                            <>
                                                {(creatorOps?.broadcasts || []).map((broadcast) => (
                                                    <div key={`broadcast-${String(broadcast.id)}`} className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <p className="text-sm font-semibold text-white">{String(broadcast.title || "Creator update")}</p>
                                                                <p className="mt-1 text-[11px] text-gray-400">{formatRelativeTimestamp(broadcast.createdAtMs)}</p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                disabled={creatorActionKey === `broadcast:${String(broadcast.id)}`}
                                                                onClick={() => handleRemoveCreatorBroadcast(String(broadcast.id))}
                                                                className="rounded-lg border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white disabled:opacity-50"
                                                            >
                                                                {creatorActionKey === `broadcast:${String(broadcast.id)}` ? "..." : "Remove"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(creatorOps?.pendingSubmissions || []).map((submission) => (
                                                    <div key={`submission-${String(submission.id)}`} className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3">
                                                        <p className="text-sm font-semibold text-white">{String(submission.title || "Creator drop")}</p>
                                                        <p className="mt-1 text-[11px] text-gray-400">{String(submission.approvalStatus || "approved")} • {formatRelativeTimestamp(submission.validFrom)}</p>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="glass-panel rounded-3xl border border-white/5 p-6">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                    <Activity className="h-4 w-4 text-brand-purple" /> Parity Engine
                </h3>

                <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-[1.4rem] border border-white/10 bg-black/30 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Overall Confidence</p>
                        <p className="mt-2 text-3xl font-black text-white">{parity?.score ?? 0}%</p>
                        <p className="mt-1 text-xs text-gray-400">Purchase and unlock analytics aligned across indexed sources.</p>
                    </div>
                    <div className="rounded-[1.4rem] border border-white/10 bg-black/30 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Purchase Parity</p>
                                <p className="mt-2 text-3xl font-black text-white">{parity?.purchase.canonicalCount ?? 0}</p>
                                <p className="mt-1 text-xs text-gray-400">{parity?.purchase.populatedSources ?? 0} populated sources</p>
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
                                <p className="mt-2 text-3xl font-black text-white">{parity?.unlock.canonicalCount ?? 0}</p>
                                <p className="mt-1 text-xs text-gray-400">{parity?.unlock.populatedSources ?? 0} populated sources</p>
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
                                        Confidence {entry.insight?.score ?? 0}% with a source spread of {entry.insight?.spread ?? 0}.
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
                                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${getCoverageClasses(module.status)}`}>
                                    {module.status}
                                </span>
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
            </div>

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

                <div className="glass-panel rounded-3xl border border-white/5 p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                        <ShieldAlert className="h-4 w-4 text-brand-purple" /> Security Events
                    </h3>
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
                </div>
            </div>
        </div>
    );
}
