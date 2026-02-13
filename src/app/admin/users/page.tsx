"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs, doc, updateDoc, Timestamp, writeBatch, serverTimestamp, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/types/db";
import { Loader2, Search, Shield, Ban, CheckCircle, AlertTriangle, MoreVertical, Edit2, Lock, Unlock, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";

export default function UserManagementPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [actionUser, setActionUser] = useState<UserProfile | null>(null);
    const [actionType, setActionType] = useState<'suspend' | 'ban' | 'activate' | null>(null);
    const [reason, setReason] = useState("");
    const [processing, setProcessing] = useState(false);

    // Balance Editing State
    const [editBalanceUser, setEditBalanceUser] = useState<UserProfile | null>(null);
    const [newBalance, setNewBalance] = useState<string>("");

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

    const filteredUsers = users.filter(user =>
    (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.uid.includes(searchQuery))
    );

    const handleUpdateStatus = async () => {
        if (!actionUser || !actionType) return;
        setProcessing(true);

        try {
            const userRef = doc(db, "users", actionUser.uid);
            let updateData: Partial<UserProfile> = {};

            if (actionType === 'activate') {
                updateData = { status: 'active', statusReason: "" };
            } else {
                updateData = {
                    status: actionType === 'ban' ? 'banned' : 'suspended',
                    statusReason: reason
                };
            }

            await updateDoc(userRef, updateData);

            // Update local state
            setUsers(users.map(u => u.uid === actionUser.uid ? { ...u, ...updateData } : u));
            setActionType(null);
            setActionUser(null);
            setReason("");
        } catch (error) {
            console.error("Error updating user status:", error);
            alert("Failed to update user status.");
        } finally {
            setProcessing(false);
        }
    };

    const handleUpdateBalance = async () => {
        if (!editBalanceUser || newBalance === "") return;
        setProcessing(true);
        try {
            const targetBalance = parseInt(newBalance);
            if (isNaN(targetBalance)) throw new Error("Invalid balance");

            const difference = targetBalance - editBalanceUser.gumDropsBalance;
            if (difference === 0) {
                setEditBalanceUser(null);
                setNewBalance("");
                setProcessing(false);
                return;
            }

            const batch = writeBatch(db);
            const userRef = doc(db, "users", editBalanceUser.uid);
            const transactionRef = doc(collection(db, "transactions"));

            // 1. Update User Balance
            batch.update(userRef, {
                gumDropsBalance: targetBalance
            });

            // 2. Create Ledger Entry
            batch.set(transactionRef, {
                userId: editBalanceUser.uid,
                amount: difference, // Can be positive or negative
                type: 'admin_adjustment',
                description: `Admin Adjustment: ${difference > 0 ? '+' : ''}${difference} Drops`,
                timestamp: serverTimestamp()
            });

            await batch.commit();

            // Update local state
            setUsers(users.map(u => u.uid === editBalanceUser.uid ? { ...u, gumDropsBalance: targetBalance } : u));
            setEditBalanceUser(null);
            setNewBalance("");
        } catch (error) {
            console.error("Error updating balance:", error);
            alert("Failed to update balance.");
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
            const userRef = doc(db, "users", contentUser.uid);
            const batch = writeBatch(db);

            // 1. Update User Unlocked Content
            if (action === 'add') {
                if (contentUser.unlockedContent?.includes(dropId)) {
                    alert("User already has this content unlocked.");
                    setContentActionProcessing(false);
                    return;
                }
                batch.update(userRef, {
                    unlockedContent: arrayUnion(dropId)
                });
            } else {
                batch.update(userRef, {
                    unlockedContent: arrayRemove(dropId)
                });
            }

            // 2. Log Admin Adjustment
            const transactionRef = doc(collection(db, "transactions"));
            batch.set(transactionRef, {
                userId: contentUser.uid,
                type: 'admin_adjustment',
                amount: 0,
                description: `Admin ${action === 'add' ? 'Unlocked' : 'Locked'} Drop: ${dropId}`,
                timestamp: serverTimestamp()
            });

            await batch.commit();

            // Update Local State
            const updatedContent = action === 'add'
                ? [...(contentUser.unlockedContent || []), dropId]
                : (contentUser.unlockedContent || []).filter(id => id !== dropId);

            setUsers(users.map(u => u.uid === contentUser.uid ? { ...u, unlockedContent: updatedContent } : u));
            setContentUser({ ...contentUser, unlockedContent: updatedContent });
            setContentInput("");
        } catch (error) {
            console.error("Error managing content:", error);
            alert("Failed to update content access.");
        } finally {
            setContentActionProcessing(false);
        }
    };

    // --- Role & Verification Management ---
    const handleRoleUpdate = async (uid: string, newRole: 'user' | 'creator' | 'admin') => {
        try {
            await updateDoc(doc(db, "users", uid), { role: newRole });
            // Update local state
            setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole } : u));
            alert(`Role updated to ${newRole}`);
        } catch (error) {
            console.error(error);
            alert("Failed to update role");
        }
    };

    const handleVerification = async (uid: string, isVerified: boolean) => {
        try {
            await updateDoc(doc(db, "users", uid), { isVerified });
            // Update local state
            setUsers(users.map(u => u.uid === uid ? { ...u, isVerified } : u));
        } catch (error) {
            console.error(error);
            alert("Failed to update verification");
        }
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'banned': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'suspended': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
            default: return 'text-green-500 bg-green-500/10 border-green-500/20';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
                    <p className="text-gray-400">Manage accounts, roles, balance, and content access.</p>
                </div>
                <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-mono text-gray-400">
                    <Shield className="w-4 h-4 text-brand-pink" />
                    <span>{users.length} Total Users</span>
                </div>
            </div>

            {/* Search Bar */}
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
                                <th className="p-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center">
                                        <Loader2 className="w-6 h-6 text-brand-pink animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        No users found matching "{searchQuery}"
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.uid} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-bold text-gray-500 overflow-hidden">
                                                    {user.photoURL ? (
                                                        <img src={user.photoURL} alt={user.displayName || "User"} className="w-full h-full object-cover" />
                                                    ) : (
                                                        (user.displayName?.[0] || user.email?.[0] || "?").toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1 font-bold text-white">
                                                        {user.displayName || "No Name"}
                                                        {user.isVerified && <CheckCircle className="w-3 h-3 text-brand-cyan" />}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold border capitalize ${user.role === 'admin' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                                    user.role === 'creator' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                                        "bg-gray-500/10 text-gray-400 border-gray-500/20"
                                                }`}>
                                                {user.role || 'user'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(user.status)}`}>
                                                {(user.status || 'active').toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="p-4 font-mono text-brand-pink">
                                            <div className="flex items-center gap-2">
                                                {user.gumDropsBalance} 🍬
                                                <button
                                                    onClick={() => { setEditBalanceUser(user); setNewBalance(user.gumDropsBalance.toString()); }}
                                                    className="p-1 rounded-md hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                                                    title="Edit Balance"
                                                >
                                                    <Edit2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-500 text-sm">
                                            {format(user.createdAt, 'MMM d, yyyy')}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {/* Role Toggles - Compact */}
                                                {user.role !== 'creator' && (
                                                    <button onClick={() => handleRoleUpdate(user.uid, 'creator')} className="p-1.5 hover:bg-purple-500/20 text-gray-400 hover:text-purple-400 rounded transition-colors" title="Promote"><Plus className="w-3 h-3" /></button>
                                                )}
                                                <button
                                                    onClick={() => handleVerification(user.uid, !user.isVerified)}
                                                    className={`p-1.5 rounded transition-colors ${user.isVerified ? "text-brand-cyan hover:bg-red-500/10 hover:text-red-400" : "text-gray-400 hover:text-brand-cyan"}`}
                                                    title="Verify"
                                                >
                                                    <CheckCircle className="w-3 h-3" />
                                                </button>

                                                <div className="w-px h-4 bg-white/10 mx-1" />

                                                {(!user.status || user.status === 'active') ? (
                                                    <>
                                                        <button
                                                            onClick={() => { setActionUser(user); setActionType('suspend'); }}
                                                            className="p-1.5 rounded hover:bg-orange-500/20 text-gray-400 hover:text-orange-500 transition-colors"
                                                            title="Suspend"
                                                        >
                                                            <AlertTriangle className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={() => { setActionUser(user); setActionType('ban'); }}
                                                            className="p-1.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition-colors"
                                                            title="Ban"
                                                        >
                                                            <Ban className="w-3 h-3" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => { setActionUser(user); setActionType('activate'); }}
                                                        className="p-1.5 rounded hover:bg-green-500/20 text-green-500 transition-colors"
                                                        title="Reactivate"
                                                    >
                                                        <CheckCircle className="w-3 h-3" />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => setContentUser(user)}
                                                    className="p-1.5 rounded hover:bg-brand-purple/20 text-gray-400 hover:text-brand-purple transition-colors"
                                                    title="Content"
                                                >
                                                    <Lock className="w-3 h-3" />
                                                </button>
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
                    <div className="p-8 text-center"><Loader2 className="w-6 h-6 text-brand-pink animate-spin mx-auto" /></div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No users found.</div>
                ) : (
                    filteredUsers.map((user) => (
                        <div key={user.uid} className="p-4 flex gap-4 items-start">
                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-bold text-gray-500 overflow-hidden shrink-0">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt={user.displayName || "User"} className="w-full h-full object-cover" />
                                ) : (
                                    (user.displayName?.[0] || user.email?.[0] || "?").toUpperCase()
                                )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-1 font-bold text-white text-sm">
                                            {user.displayName || "No Name"}
                                            {user.isVerified && <CheckCircle className="w-3 h-3 text-brand-cyan" />}
                                        </div>
                                        <div className="text-xs text-gray-500">{user.email}</div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${getStatusColor(user.status)}`}>
                                        {user.status || 'active'}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-xs">
                                    <span className={`px-1.5 py-0.5 rounded border capitalize ${user.role === 'admin' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                            user.role === 'creator' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                                "bg-gray-500/10 text-gray-400 border-gray-500/20"
                                        }`}>
                                        {user.role || 'user'}
                                    </span>
                                    <div className="font-mono text-brand-pink flex items-center gap-1">
                                        {user.gumDropsBalance} 🍬
                                        <button onClick={() => { setEditBalanceUser(user); setNewBalance(user.gumDropsBalance.toString()); }}><Edit2 className="w-3 h-3 text-gray-500" /></button>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                                    {user.role !== 'creator' ? (
                                        <button onClick={() => handleRoleUpdate(user.uid, 'creator')} className="px-3 py-1.5 bg-purple-500/10 text-purple-400 rounded-lg text-xs font-bold">Promote</button>
                                    ) : (
                                        <button onClick={() => handleRoleUpdate(user.uid, 'user')} className="px-3 py-1.5 bg-zinc-800 text-gray-400 rounded-lg text-xs font-bold">Demote</button>
                                    )}

                                    <button onClick={() => handleVerification(user.uid, !user.isVerified)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${user.isVerified ? "bg-brand-cyan/10 text-brand-cyan" : "bg-zinc-800 text-gray-400"}`}>
                                        {user.isVerified ? "Verified" : "Verify"}
                                    </button>

                                    <button onClick={() => setContentUser(user)} className="p-1.5 bg-zinc-800 text-gray-400 rounded-lg"><Lock className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Action Modal (Same as existing, no changes needed here mostly but ensuring it closes properly) */}
            {(actionType || editBalanceUser) && (
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
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-brand-pink outline-none resize-none h-24"
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
                        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                            <h3 className="text-xl font-bold text-white mb-2">Adjust Balance</h3>
                            <p className="text-gray-400 mb-6">
                                Update Gum Drops for <strong>{editBalanceUser.displayName || editBalanceUser.email}</strong>.
                            </p>

                            <div className="mb-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Current Balance</label>
                                    <div className="text-2xl font-mono text-white">{editBalanceUser.gumDropsBalance} 🍬</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">New Balance</label>
                                    <input
                                        type="number"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-brand-pink outline-none font-mono text-lg"
                                        value={newBalance}
                                        onChange={(e) => setNewBalance(e.target.value)}
                                        placeholder="Enter amount..."
                                    />
                                </div>
                                {newBalance !== "" && !isNaN(Number(newBalance)) && (
                                    <div className="text-sm text-gray-400">
                                        Adjustment: <span className={Number(newBalance) > editBalanceUser.gumDropsBalance ? "text-green-500" : "text-red-500"}>
                                            {Number(newBalance) > editBalanceUser.gumDropsBalance ? "+" : ""}
                                            {Number(newBalance) - editBalanceUser.gumDropsBalance}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3">
                                <Button variant="ghost" onClick={() => { setEditBalanceUser(null); setNewBalance(""); }}>Cancel</Button>
                                <Button
                                    variant="brand"
                                    onClick={handleUpdateBalance}
                                    disabled={processing || newBalance === "" || isNaN(Number(newBalance))}
                                >
                                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Balance"}
                                </Button>
                            </div>
                        </div>
                    )}
                    {contentUser && (
                        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                            <h3 className="text-xl font-bold text-white mb-2">Manage Content</h3>
                            <p className="text-gray-400 mb-6">
                                Unlocked drops for <strong>{contentUser.displayName || contentUser.email}</strong>.
                            </p>

                            <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Unlocked Drops ({contentUser.unlockedContent?.length || 0})</label>
                                <div className="max-h-40 overflow-y-auto space-y-2 mb-4">
                                    {contentUser.unlockedContent && contentUser.unlockedContent.length > 0 ? (
                                        contentUser.unlockedContent.map(dropId => (
                                            <div key={dropId} className="flex items-center justify-between bg-white/5 p-2 rounded-lg text-sm text-gray-300">
                                                <span className="truncate">{dropId}</span>
                                                <button
                                                    onClick={() => handleManageContent('remove', dropId)}
                                                    disabled={contentActionProcessing}
                                                    className="p-1 hover:text-red-500 transition-colors"
                                                    title="Revoke Access"
                                                >
                                                    <Ban className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-gray-600 text-sm italic">No content unlocked.</div>
                                    )}
                                </div>

                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Grant Access (Drop ID)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-2 text-white focus:border-brand-pink outline-none text-sm"
                                        placeholder="Enter Drop ID..."
                                        value={contentInput}
                                        onChange={(e) => setContentInput(e.target.value)}
                                    />
                                    <Button
                                        size="sm"
                                        variant="brand"
                                        disabled={contentActionProcessing || !contentInput}
                                        onClick={() => handleManageContent('add', contentInput)}
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
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
