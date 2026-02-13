"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/types/db";
import { format } from "date-fns";
import { Shield, ShieldAlert, CheckCircle2, User, Search, UserCheck, UserX, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AdminRosterPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData: UserProfile[] = [];
            snapshot.forEach((doc) => {
                usersData.push({ ...doc.data() } as UserProfile);
            });
            setUsers(usersData);
            setFilteredUsers(usersData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredUsers(users);
        } else {
            const lower = searchTerm.toLowerCase();
            setFilteredUsers(users.filter(u =>
                (u.username || "").toLowerCase().includes(lower) ||
                (u.email || "").toLowerCase().includes(lower) ||
                (u.displayName || "").toLowerCase().includes(lower)
            ));
        }
    }, [searchTerm, users]);

    const handleRoleUpdate = async (uid: string, newRole: 'user' | 'creator' | 'admin') => {
        try {
            await updateDoc(doc(db, "users", uid), { role: newRole });
            toast.success(`Role updated to ${newRole}`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update role");
        }
    };

    const handleVerification = async (uid: string, isVerified: boolean) => {
        try {
            await updateDoc(doc(db, "users", uid), { isVerified });
            toast.success(isVerified ? "User verified" : "Verification removed");
        } catch (error) {
            console.error(error);
            toast.error("Failed to update verification");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 rounded-full border-2 border-brand-pink border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div>
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Roster Management</h1>
                    <p className="text-gray-400">Manage users, creators, and verification status.</p>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-brand-pink transition-colors"
                    />
                </div>
            </header>

            <div className="glass-panel rounded-3xl overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 border-b border-white/5 text-gray-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 font-bold">User</th>
                                <th className="px-6 py-4 font-bold">Role</th>
                                <th className="px-6 py-4 font-bold">Status</th>
                                <th className="px-6 py-4 font-bold">Joined</th>
                                <th className="px-6 py-4 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredUsers.map((user) => (
                                <tr key={user.uid} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden shrink-0">
                                                {user.photoURL ? (
                                                    <img src={user.photoURL} alt={user.username || ""} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-full h-full p-2 text-gray-500" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1 font-bold text-white">
                                                    {user.displayName || "Unknown"}
                                                    {user.isVerified && <CheckCircle2 className="w-4 h-4 text-brand-cyan" />}
                                                </div>
                                                <div className="text-xs text-gray-500">@{user.username || "no-username"}</div>
                                                <div className="text-xs text-gray-600">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "px-2 py-1 rounded-full text-xs font-bold border capitalize",
                                            user.role === 'admin' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                                user.role === 'creator' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                                    "bg-gray-500/10 text-gray-400 border-gray-500/20"
                                        )}>
                                            {user.role || 'user'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="px-2 py-0.5 rounded bg-zinc-800 text-xs font-mono text-brand-yellow">
                                                {user.gumDropsBalance} GD
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-400">
                                        {user.createdAt ? format(user.createdAt, "MMM d, yyyy") : "-"}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* Role Toggles */}
                                            {user.role !== 'creator' && (
                                                <button
                                                    onClick={() => handleRoleUpdate(user.uid, 'creator')}
                                                    className="p-2 hover:bg-purple-500/20 text-gray-400 hover:text-purple-400 rounded-lg transition-colors"
                                                    title="Promote to Creator"
                                                >
                                                    <Crown className="w-4 h-4" />
                                                </button>
                                            )}
                                            {user.role === 'creator' && (
                                                <button
                                                    onClick={() => handleRoleUpdate(user.uid, 'user')}
                                                    className="p-2 hover:bg-red-500/20 text-purple-400 hover:text-red-400 rounded-lg transition-colors"
                                                    title="Demote to User"
                                                >
                                                    <UserX className="w-4 h-4" />
                                                </button>
                                            )}

                                            {/* Verification Toggle */}
                                            <button
                                                onClick={() => handleVerification(user.uid, !user.isVerified)}
                                                className={cn(
                                                    "p-2 rounded-lg transition-colors",
                                                    user.isVerified
                                                        ? "hover:bg-red-500/20 text-brand-cyan hover:text-red-400"
                                                        : "hover:bg-brand-cyan/20 text-gray-400 hover:text-brand-cyan"
                                                )}
                                                title={user.isVerified ? "Remove Verification" : "Verify User"}
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card Layout */}
                <div className="md:hidden flex flex-col divide-y divide-white/5">
                    {filteredUsers.map((user) => (
                        <div key={user.uid} className="p-4 flex gap-4 items-start">
                            <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden shrink-0 border border-white/10">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt={user.username || ""} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-full h-full p-2 text-gray-500" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-1 font-bold text-white text-sm">
                                            {user.displayName || "Unknown"}
                                            {user.isVerified && <CheckCircle2 className="w-3 h-3 text-brand-cyan" />}
                                        </div>
                                        <div className="text-xs text-gray-500">@{user.username || "no-username"}</div>
                                    </div>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize",
                                        user.role === 'admin' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                            user.role === 'creator' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                                "bg-gray-500/10 text-gray-400 border-gray-500/20"
                                    )}>
                                        {user.role || 'user'}
                                    </span>
                                </div>

                                <div className="text-xs text-brand-pink">{user.email}</div>

                                <div className="flex items-center justify-between pt-2">
                                    <div className="text-xs font-mono text-brand-yellow">{user.gumDropsBalance} GD</div>
                                    <div className="flex gap-2">
                                        {user.role !== 'creator' ? (
                                            <button
                                                onClick={() => handleRoleUpdate(user.uid, 'creator')}
                                                className="px-3 py-1.5 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-lg text-xs font-bold"
                                            >
                                                Promote
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleRoleUpdate(user.uid, 'user')}
                                                className="px-3 py-1.5 bg-zinc-800 text-gray-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-xs font-bold"
                                            >
                                                Demote
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleVerification(user.uid, !user.isVerified)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                                                user.isVerified
                                                    ? "bg-brand-cyan/10 text-brand-cyan hover:bg-red-500/10 hover:text-red-400"
                                                    : "bg-zinc-800 text-gray-400 hover:bg-brand-cyan/10 hover:text-brand-cyan"
                                            )}
                                        >
                                            {user.isVerified ? "Verified" : "Verify"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredUsers.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        <UserX className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No users found matching your search.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
