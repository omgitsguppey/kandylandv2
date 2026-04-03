"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UserProfile } from "@/types/db";
import { Loader2, Search, Shield, Ban, CheckCircle, AlertTriangle, Edit2, Lock, Plus, ScrollText, MessageSquare, DollarSign, TrendingUp, Users, Bell, Clock3, Activity } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import { BalanceAdjustmentModal } from "@/components/Admin/BalanceAdjustmentModal";
import { TransactionHistoryModal } from "@/components/Admin/TransactionHistoryModal";
import { authFetch } from "@/lib/authFetch";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { AdminTasksManager } from "@/components/Admin/AdminTasksManager";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { describeSecurityEvent } from "@/lib/security-events";
import { toast } from "sonner";

type UserAnalytics = {
    uid: string;
    username: string;
    eventCount: number;
    sessionCount: number;
    viewCount: number;
    engagedViewCount: number;
    passiveViewCount: number;
    bounceCount: number;
    unwrapCount: number;
    purchaseCount: number;
    authSuccessCount: number;
    onboardingStartCount: number;
    onboardingCompletionCount: number;
    watchSecondsTotal: number;
    watchHours: number;
    avgLoadMs: number;
    lastSeenAt: number;
    grossRevenueUsd: number;
    grossRevenueCents: number;
    adjustedProfitUsd: number;
    adjustedProfitCents: number;
    retailValueUsd: number;
    bonusValueUsd: number;
    bonusGumDrops: number;
    deliveredGumDrops: number;
    paidGumDrops: number;
    averageOrderUsd: number;
    effectiveUsdPer100Gd: number;
    unlockSpendGdTotal: number;
    lastPurchaseAt: number;
    bundleYieldRatio: number;
};

type UsersSummary = {
    totalUsers: number;
    totalCreators: number;
    totalAdmins: number;
    verifiedUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    bannedUsers: number;
    notificationsEnabledUsers: number;
    onboardingCompletedUsers: number;
    activeLast7Days: number;
    totalEvents: number;
    totalUnwraps: number;
    totalPurchases: number;
    totalWatchHours: number;
    grossRevenueUsd: number;
    adjustedProfitUsd: number;
    bonusValueUsd: number;
    bonusGumDrops: number;
    deliveredGumDrops: number;
    paidGumDrops: number;
    unlockSpendGdTotal: number;
    averageOrderUsd: number;
    effectiveUsdPer100Gd: number;
    payingUsers: number;
};

type DropReference = {
    id: string;
    title: string;
    status: string;
    imageUrl?: string;
};

type AdminUsersResponse = {
    success: boolean;
    users: UserProfile[];
    analyticsByUser: Record<string, UserAnalytics>;
    dropReferences: Record<string, DropReference>;
    summary: UsersSummary;
    error?: string;
};

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

export default function UserManagementPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [userAnalytics, setUserAnalytics] = useState<Record<string, UserAnalytics>>({});
    const [dropReferences, setDropReferences] = useState<Record<string, DropReference>>({});
    const [summary, setSummary] = useState<UsersSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [actionUser, setActionUser] = useState<UserProfile | null>(null);
    const [actionType, setActionType] = useState<'suspend' | 'ban' | 'activate' | null>(null);
    const [reason, setReason] = useState("");
    const [processing, setProcessing] = useState(false);

    const [viewMode, setViewMode] = useState<'users' | 'feedback' | 'tasks'>('users');
    const [feedback, setFeedback] = useState<AdminFeedbackItem[]>([]);
    const [loadingFeedback, setLoadingFeedback] = useState(false);

    const [securityDetailsUser, setSecurityDetailsUser] = useState<UserProfile | null>(null);

    // Balance Editing State
    const [editBalanceUser, setEditBalanceUser] = useState<UserProfile | null>(null);
    const [historyUser, setHistoryUser] = useState<UserProfile | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await authFetch("/api/admin/users");
            const result = await response.json() as AdminUsersResponse;
            if (!response.ok || !result.success) {
                throw new Error(result.error || "Failed to load users");
            }

            setUsers(result.users || []);
            setUserAnalytics(result.analyticsByUser || {});
            setDropReferences(result.dropReferences || {});
            setSummary(result.summary || null);
        } catch (error) {
            reportClientIssue({
                channel: "ui",
                message: "Admin users fetch failed",
                error,
                detail: {
                    adminView: "users",
                    action: "fetch_users",
                },
                consoleLabel: "[Admin Users] fetch users failed",
            });
            toast.error(error instanceof Error ? error.message : "Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    const fetchFeedback = async () => {
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
    const formatMoney = (value?: number) => `$${(value || 0).toFixed(2)}`;
    const formatPercent = (value?: number) => `${Math.round((value || 0) * 100)}%`;
    const getBounceRate = (analytics?: UserAnalytics) =>
        analytics && analytics.viewCount > 0 ? analytics.bounceCount / Math.max(1, analytics.viewCount) : 0;
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
    const selectedSecurityDescriptor = securityDetailsUser
        ? describeSecurityEvent(securityDetailsUser.securityFlags?.lastViolationReason)
        : null;

    const topTrackedUsers = [...filteredUsers]
        .sort((left, right) => (getUserAnalytics(right.uid)?.eventCount || 0) - (getUserAnalytics(left.uid)?.eventCount || 0))
        .slice(0, 3);

    const handleUpdateStatus = async () => {
        if (!actionUser || !actionType) return;
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
            toast.error(error.message || "Failed to update user status.");
        } finally {
            setProcessing(false);
        }
    };

    // --- Content Management ---
    const [contentUser, setContentUser] = useState<UserProfile | null>(null);
    const [contentActionProcessing, setContentActionProcessing] = useState(false);
    const [contentInput, setContentInput] = useState("");

    const handleManageContent = async (action: 'add' | 'remove', dropId: string) => {
        const normalizedDropId = dropId.trim();
        if (!contentUser || !normalizedDropId) return;
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
            toast.error(error.message || "Failed to update content access.");
        } finally {
            setContentActionProcessing(false);
        }
    };

    // --- Role & Verification Management ---
    const handleRoleUpdate = async (uid: string, newRole: 'user' | 'creator' | 'admin') => {
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
            toast.error(error.message || "Failed to update role");
        }
    };

    const handleVerification = async (uid: string, isVerified: boolean) => {
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
            toast.error(error.message || "Failed to update verification");
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
        <div className="space-y-6">
            <PageViewEvent eventName="admin_users_viewed" />
            <AdminPageHeader
                eyebrow="Admin Users"
                title={viewMode === 'users' ? 'User Management' : viewMode === 'feedback' ? 'Platform Feedback' : 'Daily Task Control'}
                subtitle={viewMode === 'users'
                    ? 'Manage accounts, roles, balance, and content access.'
                    : viewMode === 'feedback'
                        ? 'Review user-submitted feedback from daily tasks.'
                        : 'Create custom daily missions and monitor live task triggers.'}
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

            {viewMode === 'users' && (
                <>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="glass-panel rounded-[1.7rem] border border-white/10 p-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">User base</p>
                            <p className="mt-2 text-3xl font-black text-white">{summary?.totalUsers || 0}</p>
                            <p className="mt-1 text-xs text-gray-400">{summary?.activeUsers || 0} active, {summary?.verifiedUsers || 0} verified</p>
                        </div>
                        <div className="glass-panel rounded-[1.7rem] border border-white/10 p-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">7 day returners</p>
                            <p className="mt-2 text-3xl font-black text-white">{summary?.activeLast7Days || 0}</p>
                            <p className="mt-1 text-xs text-gray-400">{summary?.notificationsEnabledUsers || 0} with notifications on</p>
                        </div>
                        <div className="glass-panel rounded-[1.7rem] border border-white/10 p-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Tracked unwraps</p>
                            <p className="mt-2 text-3xl font-black text-white">{summary?.totalUnwraps || 0}</p>
                            <p className="mt-1 text-xs text-gray-400">{summary?.totalPurchases || 0} tracked purchases</p>
                        </div>
                        <div className="glass-panel rounded-[1.7rem] border border-white/10 p-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Watch time</p>
                            <p className="mt-2 text-3xl font-black text-white">{summary?.totalWatchHours || 0}h</p>
                            <p className="mt-1 text-xs text-gray-400">{summary?.onboardingCompletedUsers || 0} users completed onboarding</p>
                        </div>
                        <div className="glass-panel rounded-[1.7rem] border border-white/10 p-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Gross cash</p>
                            <p className="mt-2 text-3xl font-black text-white">{formatMoney(summary?.grossRevenueUsd)}</p>
                            <p className="mt-1 text-xs text-gray-400">{summary?.payingUsers || 0} paying users</p>
                        </div>
                        <div className="glass-panel rounded-[1.7rem] border border-white/10 p-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Adjusted profit</p>
                            <p className="mt-2 text-3xl font-black text-white">{formatMoney(summary?.adjustedProfitUsd)}</p>
                            <p className="mt-1 text-xs text-gray-400">{formatMoney(summary?.bonusValueUsd)} bonus value granted</p>
                        </div>
                        <div className="glass-panel rounded-[1.7rem] border border-white/10 p-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Delivered value</p>
                            <p className="mt-2 text-3xl font-black text-white">{(summary?.deliveredGumDrops || 0).toLocaleString()} GD</p>
                            <p className="mt-1 text-xs text-gray-400">{(summary?.bonusGumDrops || 0).toLocaleString()} GD bonus on top</p>
                        </div>
                        <div className="glass-panel rounded-[1.7rem] border border-white/10 p-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Bundle yield</p>
                            <p className="mt-2 text-3xl font-black text-white">{formatMoney(summary?.effectiveUsdPer100Gd)}</p>
                            <p className="mt-1 text-xs text-gray-400">per 100 GD · avg order {formatMoney(summary?.averageOrderUsd)}</p>
                        </div>
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
                            <div className="flex items-center gap-2 text-sm font-bold text-white">
                                <TrendingUp className="w-4 h-4 text-brand-purple" />
                                Most engaged right now
                            </div>
                            <div className="mt-3 grid gap-2">
                                {topTrackedUsers.length === 0 ? (
                                    <p className="text-sm text-gray-400">No tracked engagement yet.</p>
                                ) : topTrackedUsers.map((user) => (
                                    <div key={user.uid} className="rounded-2xl border border-white/10 bg-black/25 px-3 py-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-white">{user.username ? `@${user.username}` : user.displayName || user.email || user.uid}</p>
                                                <p className="text-xs text-gray-500">
                                                    {getUserAnalytics(user.uid)?.eventCount || 0} tracked actions · {formatMoney(getUserAnalytics(user.uid)?.grossRevenueUsd)} cash
                                                </p>
                                            </div>
                                            <Link href={`/admin/user/${user.uid}`} className="text-xs font-bold text-brand-purple hover:underline">
                                                Open
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                                            const onboardingBadge = getOnboardingBadge(user, analytics);
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
                                                    </div>
                                                </td>
                                                <td className="p-4 font-mono text-brand-purple">
                                                    <div className="flex items-center gap-2">
                                                        {user.gumDropsBalance} GD
                                                        <button onClick={() => setEditBalanceUser(user)} className="p-1 rounded-md text-gray-500 hover:text-white transition-colors" title="Edit Balance"><Edit2 className="w-3 h-3" /></button>
                                                        <button onClick={() => setHistoryUser(user)} className="p-1 rounded-md text-gray-500 hover:text-white transition-colors" title="View History"><ScrollText className="w-3 h-3" /></button>
                                                    </div>
                                                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-gray-500">
                                                        <span>{user.unlockedContent?.length || 0} unlocked</span>
                                                        <span>{user.notificationSettings?.browserPushEnabled ? "Push on" : "Push off"}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm">
                                                    <div className="space-y-2">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                                                                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Views</div>
                                                                <div className="mt-1 text-xs font-semibold text-white">{analytics?.viewCount || 0} · {formatPercent(getBounceRate(analytics))} bounce</div>
                                                            </div>
                                                            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                                                                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Onboarding</div>
                                                                <div className="mt-1 text-xs font-semibold text-white">{analytics?.onboardingCompletionCount || 0} done · {analytics?.onboardingStartCount || 0} started</div>
                                                            </div>
                                                        </div>
                                                        <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white">
                                                            {analytics?.eventCount || 0} events · {analytics?.sessionCount || 0} sessions
                                                        </div>
                                                        <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white">
                                                            {getUserAnalytics(user.uid)?.unwrapCount || 0} unwraps · {getUserAnalytics(user.uid)?.purchaseCount || 0} purchases
                                                        </div>
                                                        <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white">
                                                            {formatMoney(getUserAnalytics(user.uid)?.grossRevenueUsd)} cash · {formatMoney(getUserAnalytics(user.uid)?.adjustedProfitUsd)} adj.
                                                        </div>
                                                        <div className="text-[10px] text-gray-500">
                                                            {getUserAnalytics(user.uid)?.watchHours || 0}h watch · avg {getUserAnalytics(user.uid)?.avgLoadMs || 0}ms
                                                        </div>
                                                        <div className="text-[10px] text-gray-500">
                                                            {(getUserAnalytics(user.uid)?.bonusGumDrops || 0).toLocaleString()} bonus GD · {formatMoney(getUserAnalytics(user.uid)?.effectiveUsdPer100Gd)} / 100 GD
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-500 text-sm">
                                                    {format((user.createdAt as any)?.toMillis?.() || user.createdAt || Date.now(), 'MMM d, yyyy')}
                                                    <div className="mt-2 text-[10px] text-gray-500">{formatLastSeen(getUserAnalytics(user.uid)?.lastSeenAt)}</div>
                                                    <div className="mt-1 text-[10px] text-gray-500">{formatLastPurchase(getUserAnalytics(user.uid)?.lastPurchaseAt)}</div>
                                                </td>
                                                <td className="p-4 text-sm">
                                                    {(user.securityFlags?.ripAttempts ?? 0) > 0 ? (
                                                        <button
                                                            onClick={() => setSecurityDetailsUser(user)}
                                                            className="flex items-center gap-1 text-red-500 font-bold bg-red-500/10 px-2 py-1 rounded-full w-fit border border-red-500/20 hover:bg-red-500/20 transition-colors"
                                                            title={`View Dossier`}
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
                                                            <button onClick={() => handleRoleUpdate(user.uid, 'creator')} className="p-1.5 text-gray-400 rounded transition-colors" title="Promote"><Plus className="w-3 h-3" /></button>
                                                        )}
                                                        <button
                                                            onClick={() => handleVerification(user.uid, !user.isVerified)}
                                                            className={`p-1.5 rounded transition-colors ${user.isVerified ? "text-brand-purple " : "text-gray-400 "}`}
                                                            title="Verify"
                                                        >
                                                            <CheckCircle className="w-3 h-3" />
                                                        </button>
                                                        <Link href={`/admin/user/${user.uid}`} className="p-1.5 rounded text-brand-purple transition-colors" title="Analytics">
                                                            <TrendingUp className="w-3 h-3" />
                                                        </Link>
                                                        <div className="w-px h-4 bg-white/10 mx-1" />
                                                        {(!user.status || user.status === 'active') ? (
                                                            <>
                                                                <button onClick={() => { setActionUser(user); setActionType('suspend'); }} className="p-1.5 rounded text-gray-400 transition-colors" title="Suspend"><AlertTriangle className="w-3 h-3" /></button>
                                                                <button onClick={() => { setActionUser(user); setActionType('ban'); }} className="p-1.5 rounded text-gray-400 transition-colors" title="Ban"><Ban className="w-3 h-3" /></button>
                                                            </>
                                                        ) : (
                                                            <button onClick={() => { setActionUser(user); setActionType('activate'); }} className="p-1.5 rounded text-brand-purple transition-colors" title="Reactivate"><CheckCircle className="w-3 h-3" /></button>
                                                        )}
                                                        <button onClick={() => setContentUser(user)} className="p-1.5 rounded text-gray-400 transition-colors" title="Content"><Lock className="w-3 h-3" /></button>
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
                                const onboardingBadge = getOnboardingBadge(user, analytics);
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

                                        <div className="grid grid-cols-2 gap-3 p-3 bg-black/25 rounded-xl border border-white/5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500 font-bold uppercase"><Users className="w-3 h-3 inline mr-1" />Events</span>
                                                <span className="text-sm font-mono text-gray-300">
                                                    {analytics?.eventCount || 0}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500 font-bold uppercase"><TrendingUp className="w-3 h-3 inline mr-1" />Unwraps</span>
                                                <span className="text-sm font-mono text-gray-300">
                                                    {analytics?.unwrapCount || 0}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500 font-bold uppercase"><Clock3 className="w-3 h-3 inline mr-1" />Watch</span>
                                                <span className="text-sm font-mono text-gray-300">
                                                    {analytics?.watchHours || 0}h
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500 font-bold uppercase"><Bell className="w-3 h-3 inline mr-1" />Push</span>
                                                <span className="text-sm font-mono text-gray-300">
                                                    {user.notificationSettings?.browserPushEnabled ? "On" : "Off"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 p-3 bg-black/25 rounded-xl border border-white/5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500 font-bold uppercase"><Activity className="w-3 h-3 inline mr-1" />Views</span>
                                                <span className="text-sm font-mono text-gray-300">
                                                    {analytics?.viewCount || 0}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500 font-bold uppercase"><AlertTriangle className="w-3 h-3 inline mr-1" />Bounce</span>
                                                <span className="text-sm font-mono text-gray-300">
                                                    {formatPercent(getBounceRate(analytics))}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500 font-bold uppercase"><CheckCircle className="w-3 h-3 inline mr-1" />Onboarded</span>
                                                <span className="text-sm font-mono text-gray-300">
                                                    {analytics?.onboardingCompletionCount || 0}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500 font-bold uppercase"><Shield className="w-3 h-3 inline mr-1" />Auth</span>
                                                <span className="text-sm font-mono text-gray-300">
                                                    {analytics?.authSuccessCount || 0}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 p-3 bg-black/25 rounded-xl border border-white/5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500 font-bold uppercase"><DollarSign className="w-3 h-3 inline mr-1" />Cash</span>
                                                <span className="text-sm font-mono text-gray-300">
                                                    {formatMoney(analytics?.grossRevenueUsd)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500 font-bold uppercase"><TrendingUp className="w-3 h-3 inline mr-1" />Profit</span>
                                                <span className="text-sm font-mono text-gray-300">
                                                    {formatMoney(analytics?.adjustedProfitUsd)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500 font-bold uppercase"><Plus className="w-3 h-3 inline mr-1" />Bonus</span>
                                                <span className="text-sm font-mono text-gray-300">
                                                    {(analytics?.bonusGumDrops || 0).toLocaleString()} GD
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500 font-bold uppercase"><Clock3 className="w-3 h-3 inline mr-1" />Yield</span>
                                                <span className="text-sm font-mono text-gray-300">
                                                    {formatMoney(analytics?.effectiveUsdPer100Gd)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-[10px] text-gray-500 -mt-1">
                                            {formatLastSeen(analytics?.lastSeenAt)}
                                        </div>
                                        <div className="text-[10px] text-gray-500 -mt-2">
                                            {formatLastPurchase(analytics?.lastPurchaseAt)}
                                        </div>

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
                                        <button onClick={() => setContentUser(user)} className="flex flex-col items-center justify-center p-3 bg-white/5 hover:bg-blue-500/20 border border-white/10 rounded-xl transition-colors text-gray-400 hover:text-blue-400 hover:border-blue-500/50 group">
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
                <AdminTasksManager users={users} />
            )}

            {/* Action Modals */}
            {(actionType || editBalanceUser || contentUser || historyUser || securityDetailsUser) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
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
                                                <button onClick={() => handleManageContent('remove', dropId)} disabled={contentActionProcessing} className="p-1 transition-colors" title="Revoke Access"><Ban className="w-3 h-3" /></button>
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
