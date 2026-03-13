"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { UserProfile } from "@/types/db";
import { Loader2, Search, Shield, Ban, CheckCircle, AlertTriangle, Edit2, Lock, Plus, ScrollText, MessageSquare, DollarSign, TrendingUp, Users, Bell, Clock3 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import { BalanceAdjustmentModal } from "@/components/Admin/BalanceAdjustmentModal";
import { TransactionHistoryModal } from "@/components/Admin/TransactionHistoryModal";
import { authFetch } from "@/lib/authFetch";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { AdminTasksManager } from "@/components/Admin/AdminTasksManager";
import { toast } from "sonner";

type UserAnalytics = {
    uid: string;
    username: string;
    eventCount: number;
    sessionCount: number;
    unwrapCount: number;
    purchaseCount: number;
    watchSecondsTotal: number;
    watchHours: number;
    avgLoadMs: number;
    lastSeenAt: number;
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
};

type AdminUsersResponse = {
    success: boolean;
    users: UserProfile[];
    analyticsByUser: Record<string, UserAnalytics>;
    summary: UsersSummary;
    error?: string;
};

export default function UserManagementPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [userAnalytics, setUserAnalytics] = useState<Record<string, UserAnalytics>>({});
    const [summary, setSummary] = useState<UsersSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [actionUser, setActionUser] = useState<UserProfile | null>(null);
    const [actionType, setActionType] = useState<'suspend' | 'ban' | 'activate' | null>(null);
    const [reason, setReason] = useState("");
    const [processing, setProcessing] = useState(false);

    const [viewMode, setViewMode] = useState<'users' | 'feedback' | 'tasks'>('users');
    const [feedback, setFeedback] = useState<any[]>([]);
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
            setSummary(result.summary || null);
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error(error instanceof Error ? error.message : "Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    const fetchFeedback = async () => {
        setLoadingFeedback(true);
        try {
            const q = query(collection(db, "platform_feedback"), orderBy("timestamp", "desc"));
            const querySnapshot = await getDocs(q);
            const fetched: any[] = [];
            querySnapshot.forEach((doc) => {
                fetched.push({ id: doc.id, ...doc.data() });
            });
            setFeedback(fetched);
        } catch (error) {
            console.error("Error fetching feedback:", error);
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

    const formatLastSeen = (timestamp?: number) =>
        timestamp && timestamp > 0 ? `Seen ${format(new Date(timestamp), 'MMM d, h:mm a')}` : "No tracked activity";

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
            setUsers(users.map(u => u.uid === actionUser.uid ? { ...u, ...updates } : u));
            setActionType(null);
            setActionUser(null);
            setReason("");
        } catch (error: any) {
            console.error("Error updating user status:", error);
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
        if (!contentUser || !dropId) return;
        setContentActionProcessing(true);
        try {
            if (action === 'add' && contentUser.unlockedContent?.includes(dropId)) {
                toast.error("User already has this content unlocked.");
                setContentActionProcessing(false);
                return;
            }

            const response = await authFetch("/api/admin/users", {
                method: "POST",
                body: JSON.stringify({ userId: contentUser.uid, action, dropId }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            // Update Local State
            const updatedContent = action === 'add'
                ? [...(contentUser.unlockedContent || []), dropId]
                : (contentUser.unlockedContent || []).filter(id => id !== dropId);

            setUsers(users.map(u => u.uid === contentUser.uid ? { ...u, unlockedContent: updatedContent } : u));
            setContentUser({ ...contentUser, unlockedContent: updatedContent });
            setContentInput("");
        } catch (error: any) {
            console.error("Error managing content:", error);
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
            setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole } : u));
            toast.success(`Role updated to ${newRole}`);
        } catch (error: any) {
            console.error(error);
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
            setUsers(users.map(u => u.uid === uid ? { ...u, isVerified } : u));
        } catch (error: any) {
            console.error(error);
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
                                                <p className="text-xs text-gray-500">{getUserAnalytics(user.uid)?.eventCount || 0} tracked actions</p>
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
                                        filteredUsers.map((user) => (
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
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(user.status)}`}>
                                                        {(user.status || 'active').toUpperCase()}
                                                    </span>
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
                                                        <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white">
                                                            {getUserAnalytics(user.uid)?.eventCount || 0} events
                                                        </div>
                                                        <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white">
                                                            {getUserAnalytics(user.uid)?.unwrapCount || 0} unwraps · {getUserAnalytics(user.uid)?.purchaseCount || 0} purchases
                                                        </div>
                                                        <div className="text-[10px] text-gray-500">
                                                            {getUserAnalytics(user.uid)?.watchHours || 0}h watch · avg {getUserAnalytics(user.uid)?.avgLoadMs || 0}ms
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-500 text-sm">
                                                    {format((user.createdAt as any)?.toMillis?.() || user.createdAt || Date.now(), 'MMM d, yyyy')}
                                                    <div className="mt-2 text-[10px] text-gray-500">{formatLastSeen(getUserAnalytics(user.uid)?.lastSeenAt)}</div>
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
                                        ))
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
                            filteredUsers.map((user) => (
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
                                                    {getUserAnalytics(user.uid)?.eventCount || 0}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500 font-bold uppercase"><TrendingUp className="w-3 h-3 inline mr-1" />Unwraps</span>
                                                <span className="text-sm font-mono text-gray-300">
                                                    {getUserAnalytics(user.uid)?.unwrapCount || 0}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500 font-bold uppercase"><Clock3 className="w-3 h-3 inline mr-1" />Watch</span>
                                                <span className="text-sm font-mono text-gray-300">
                                                    {getUserAnalytics(user.uid)?.watchHours || 0}h
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500 font-bold uppercase"><Bell className="w-3 h-3 inline mr-1" />Push</span>
                                                <span className="text-sm font-mono text-gray-300">
                                                    {user.notificationSettings?.browserPushEnabled ? "On" : "Off"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-[10px] text-gray-500 -mt-1">
                                            {formatLastSeen(getUserAnalytics(user.uid)?.lastSeenAt)}
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
                            ))
                        )}
                    </div>
                </>
            )}

            {/* Platform Feedback View */}
            {viewMode === 'feedback' && (
                <div className="space-y-4">
                    {loadingFeedback ? (
                        <div className="p-12 text-center">
                            <Loader2 className="w-8 h-8 text-brand-purple animate-spin mx-auto mb-4" />
                            <p className="text-gray-500">Loading feedback submissions...</p>
                        </div>
                    ) : feedback.length === 0 ? (
                        <div className="glass-panel p-12 text-center rounded-3xl border border-white/5">
                            <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">No feedback submissions found yet.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {feedback.map((item) => (
                                <div key={item.id} className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 hover:border-white/10 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-gray-500">
                                                {(item.email?.[0] || "?").toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white">{item.email || 'Anonymous'}</div>
                                                <div className="text-xs text-gray-500">
                                                    {item.timestamp?.toMillis ? format(item.timestamp.toMillis(), 'MMM d, h:mm a') : 'Just now'}
                                                </div>
                                            </div>
                                        </div>
                                        {item.rating && (
                                            <div className="px-3 py-1 rounded-full bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-xs font-bold">
                                                {item.rating} / 5 Rating
                                            </div>
                                        )}
                                        {item.category && (
                                            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 text-xs font-bold uppercase tracking-wider">
                                                {item.category}
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 relative">
                                        <div className="absolute top-4 right-4 opacity-5 pointer-events-none">
                                            <MessageSquare className="w-12 h-12" />
                                        </div>
                                        <p className="text-gray-300 whitespace-pre-wrap relative z-10">{item.message}</p>
                                    </div>
                                    <div className="flex items-center justify-between pt-2">
                                        <div className="text-[10px] text-gray-600 font-mono uppercase tracking-widest">
                                            User ID: {item.userId}
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSearchQuery(item.userId);
                                                setViewMode('users');
                                            }}
                                            className="text-xs font-bold text-brand-purple hover:underline"
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
                                setUsers(users.map(u => u.uid === editBalanceUser.uid ? { ...u, gumDropsBalance: newBalance } : u));
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
                                                <span className="truncate">{dropId}</span>
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
                                    <span className="text-xs text-red-400 font-bold uppercase block mb-1">Violation Vector</span>
                                    <p className="text-sm text-red-300 font-mono break-words">
                                        {securityDetailsUser.securityFlags?.lastViolationReason || "Unknown Method"}
                                    </p>
                                </div>

                                {securityDetailsUser.securityFlags?.lastViolationDropId && (
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <span className="text-xs text-gray-500 font-bold uppercase block mb-1">Target Asset (Drop ID)</span>
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
