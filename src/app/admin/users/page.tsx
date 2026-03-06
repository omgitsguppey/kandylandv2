"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { UserProfile } from "@/types/db";
import { Loader2, Search, Shield, Ban, CheckCircle, AlertTriangle, Edit2, Lock, Plus, ScrollText, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import { BalanceAdjustmentModal } from "@/components/Admin/BalanceAdjustmentModal";
import { TransactionHistoryModal } from "@/components/Admin/TransactionHistoryModal";
import { authFetch } from "@/lib/authFetch";
import Image from "next/image";
import { cn } from "@/lib/utils";

export default function UserManagementPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [actionUser, setActionUser] = useState<UserProfile | null>(null);
    const [actionType, setActionType] = useState<'suspend' | 'ban' | 'activate' | null>(null);
    const [reason, setReason] = useState("");
    const [processing, setProcessing] = useState(false);

    const [viewMode, setViewMode] = useState<'users' | 'feedback'>('users');
    const [feedback, setFeedback] = useState<any[]>([]);
    const [loadingFeedback, setLoadingFeedback] = useState(false);

    // Balance Editing State
    const [editBalanceUser, setEditBalanceUser] = useState<UserProfile | null>(null);
    const [historyUser, setHistoryUser] = useState<UserProfile | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const fetchedUsers: UserProfile[] = [];
            querySnapshot.forEach((doc) => {
                fetchedUsers.push(doc.data() as UserProfile);
            });
            setUsers(fetchedUsers);
        } catch (error) {
            console.error("Error fetching users:", error);
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
        user.uid.includes(searchQuery))
    );

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
            alert(error.message || "Failed to update user status.");
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
                alert("User already has this content unlocked.");
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
            alert(error.message || "Failed to update content access.");
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
            alert(`Role updated to ${newRole}`);
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Failed to update role");
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
            alert(error.message || "Failed to update verification");
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {viewMode === 'users' ? 'User Management' : 'Platform Feedback'}
                    </h1>
                    <p className="text-gray-400">
                        {viewMode === 'users'
                            ? 'Manage accounts, roles, balance, and content access.'
                            : 'Review user-submitted feedback from daily tasks.'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('users')}
                        className={cn(
                            "px-4 py-2 rounded-xl border font-bold text-sm transition-all flex items-center gap-2",
                            viewMode === 'users' ? "bg-brand-purple text-white border-brand-purple" : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"
                        )}
                    >
                        <Shield className="w-4 h-4" /> Users
                    </button>
                    <button
                        onClick={() => setViewMode('feedback')}
                        className={cn(
                            "px-4 py-2 rounded-xl border font-bold text-sm transition-all flex items-center gap-2",
                            viewMode === 'feedback' ? "bg-brand-purple text-white border-brand-purple" : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"
                        )}
                    >
                        <MessageSquare className="w-4 h-4" /> Feedback
                    </button>
                </div>
            </div>

            {viewMode === 'users' && (
                <>
                    <div className="glass-panel p-2 rounded-xl flex items-center gap-3 border border-white/5">
                        <Search className="w-5 h-5 text-gray-500 ml-2" />
                        <input
                            type="text"
                            placeholder="Search users by email, name, or ID..."
                            className="bg-transparent border-none outline-none text-white w-full h-10 placeholder:text-gray-600"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
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
                                        <th className="p-4 font-medium">Joined</th>
                                        <th className="p-4 font-medium">Security</th>
                                        <th className="p-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center">
                                                <Loader2 className="w-6 h-6 text-brand-purple animate-spin mx-auto" />
                                            </td>
                                        </tr>
                                    ) : filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-gray-500">
                                                No users found matching "{searchQuery}"
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
                                                                {user.displayName || "No Name"}
                                                                {user.isVerified && <CheckCircle className="w-3 h-3 text-brand-purple" />}
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
                                                        {user.gumDropsBalance} 🍬
                                                        <button onClick={() => setEditBalanceUser(user)} className="p-1 rounded-md text-gray-500 hover:text-white transition-colors" title="Edit Balance"><Edit2 className="w-3 h-3" /></button>
                                                        <button onClick={() => setHistoryUser(user)} className="p-1 rounded-md text-gray-500 hover:text-white transition-colors" title="View History"><ScrollText className="w-3 h-3" /></button>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-500 text-sm">
                                                    {format((user.createdAt as any)?.toMillis?.() || user.createdAt || Date.now(), 'MMM d, yyyy')}
                                                </td>
                                                <td className="p-4 text-sm">
                                                    {(user.securityFlags?.ripAttempts ?? 0) > 0 ? (
                                                        <div className="flex items-center gap-1 text-red-500 font-bold bg-red-500/10 px-2 py-1 rounded-full w-fit border border-red-500/20" title={`Last violation: ${user.securityFlags?.lastViolationReason || 'Unknown'}`}>
                                                            <AlertTriangle className="w-3 h-3" />
                                                            {user.securityFlags!.ripAttempts} Flags
                                                        </div>
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
                    <div className="md:hidden flex flex-col divide-y divide-white/5 glass-panel rounded-2xl border border-white/5">
                        {loading ? (
                            <div className="p-8 text-center"><Loader2 className="w-6 h-6 text-brand-purple animate-spin mx-auto" /></div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No users found.</div>
                        ) : (
                            filteredUsers.map((user) => (
                                <div key={user.uid} className="p-4 flex gap-4 items-start">
                                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-bold text-gray-500 overflow-hidden shrink-0 relative">
                                        {user.photoURL ? (
                                            <Image src={user.photoURL} alt={user.displayName || "User"} fill sizes="48px" className="object-cover" />
                                        ) : (
                                            (user.displayName?.[0] || user.email?.[0] || "?").toUpperCase()
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-1 font-bold text-white text-sm">
                                                    {user.displayName || "No Name"}
                                                    {user.isVerified && <CheckCircle className="w-3 h-3 text-brand-purple" />}
                                                </div>
                                                <div className="text-xs text-gray-500">{user.email}</div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${getStatusColor(user.status)}`}>
                                                {user.status || 'active'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-1.5 py-0.5 rounded border capitalize ${user.role === 'admin' ? "bg-red-500/10 text-red-400 border-red-500/20" : user.role === 'creator' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>
                                                    {user.role || 'user'}
                                                </span>
                                                {(user.securityFlags?.ripAttempts ?? 0) > 0 && (
                                                    <div className="flex items-center gap-1 text-red-500 font-bold bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20" title={`Last violation: ${user.securityFlags?.lastViolationReason || 'Unknown'}`}>
                                                        <AlertTriangle className="w-3 h-3" />
                                                        {user.securityFlags!.ripAttempts} Flags
                                                    </div>
                                                )}
                                            </div>
                                            <div className="font-mono text-brand-purple flex items-center gap-1">
                                                {user.gumDropsBalance} 🍬
                                                <button onClick={() => setEditBalanceUser(user)}><Edit2 className="w-3 h-3 text-gray-500 hover:text-white" /></button>
                                                <button onClick={() => setHistoryUser(user)}><ScrollText className="w-3 h-3 text-gray-500 hover:text-white" /></button>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                                            {user.role !== 'creator' ? (
                                                <button onClick={() => handleRoleUpdate(user.uid, 'creator')} className="px-3 py-1.5 bg-purple-500/10 text-purple-400 rounded-lg text-xs font-bold">Promote</button>
                                            ) : (
                                                <button onClick={() => handleRoleUpdate(user.uid, 'user')} className="px-3 py-1.5 bg-zinc-800 text-gray-400 rounded-lg text-xs font-bold">Demote</button>
                                            )}
                                            <button onClick={() => handleVerification(user.uid, !user.isVerified)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${user.isVerified ? "bg-brand-purple/10 text-brand-purple" : "bg-zinc-800 text-gray-400"}`}>
                                                {user.isVerified ? "Verified" : "Verify"}
                                            </button>
                                            <button onClick={() => setContentUser(user)} className="p-1.5 bg-zinc-800 text-gray-400 rounded-lg"><Lock className="w-4 h-4" /></button>
                                        </div>
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

            {/* Action Modals */}
            {(actionType || editBalanceUser || contentUser || historyUser) && (
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
                            <p className="text-gray-400 mb-6">Unlocked drops for <strong>{contentUser.displayName || contentUser.email}</strong>.</p>
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
                </div>
            )}
        </div>
    );
}
