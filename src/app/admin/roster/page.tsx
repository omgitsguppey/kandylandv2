"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Search, User, UserX } from "lucide-react";
import { db } from "@/lib/firebase-data";
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type RosterRole = "user" | "creator" | "admin";
type RosterStatus = "active" | "suspended" | "banned";

interface RosterEntry {
    uid: string;
    displayName: string;
    email: string;
    username: string;
    photoURL: string | null;
    role: RosterRole;
    status: RosterStatus;
    isVerified: boolean;
    createdAt: number;
}

const PAGE_SIZE = 25;
const ADMIN_EMAIL = "uylusjohnson@gmail.com";

function normalizeRosterEntry(doc: QueryDocumentSnapshot<DocumentData>): RosterEntry | null {
    const raw = doc.data();
    if (!raw || typeof raw !== "object") {
        return null;
    }

    const source = raw as Record<string, unknown>;
    const uid = typeof source.uid === "string" && source.uid.trim().length > 0 ? source.uid : doc.id;
    if (!uid) {
        return null;
    }

    const displayName = typeof source.displayName === "string" && source.displayName.trim().length > 0
        ? source.displayName.trim()
        : "Unknown user";
    const email = typeof source.email === "string" && source.email.trim().length > 0
        ? source.email.trim()
        : "No email";
    const username = typeof source.username === "string" && source.username.trim().length > 0
        ? source.username.trim()
        : "";
    const photoURL = typeof source.photoURL === "string" && source.photoURL.trim().length > 0
        ? source.photoURL.trim()
        : null;

    const role = source.role === "admin" || source.role === "creator" || source.role === "user"
        ? source.role
        : "user";
    const status = source.status === "suspended" || source.status === "banned" || source.status === "active"
        ? source.status
        : "active";

    const createdAt = Number.isFinite(source.createdAt) ? Number(source.createdAt) : 0;

    return {
        uid,
        displayName,
        email,
        username,
        photoURL,
        role,
        status,
        isVerified: source.isVerified === true,
        createdAt,
    };
}

function initialsFor(name: string): string {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length === 0) return "U";
    const initials = parts.slice(0, 2).map((segment) => segment[0]?.toUpperCase() || "").join("");
    return initials || "U";
}

export default function AdminRosterPage() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const [users, setUsers] = useState<RosterEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    const isAdmin = userProfile?.role === "admin" || user?.email === ADMIN_EMAIL;

    useEffect(() => {
        if (authLoading || !isAdmin) {
            return;
        }

        const rosterQuery = query(collection(db, "users"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(
            rosterQuery,
            (snapshot) => {
                const normalized = snapshot.docs
                    .map((entryDoc) => normalizeRosterEntry(entryDoc))
                    .filter((entry): entry is RosterEntry => entry !== null);
                setUsers(normalized);
                setError(null);
                setLoading(false);
            },
            (snapshotError) => {
                console.error("Failed to load roster", snapshotError);
                setError("Unable to load roster right now. Please try again shortly.");
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [authLoading, isAdmin]);

    const filteredUsers = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        if (!normalizedSearch) {
            return users;
        }

        return users.filter((entry) =>
            entry.displayName.toLowerCase().includes(normalizedSearch)
            || entry.email.toLowerCase().includes(normalizedSearch)
            || entry.username.toLowerCase().includes(normalizedSearch)
            || entry.uid.toLowerCase().includes(normalizedSearch)
        );
    }, [searchTerm, users]);

    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [searchTerm]);

    const visibleUsers = useMemo(() => filteredUsers.slice(0, visibleCount), [filteredUsers, visibleCount]);
    const hasMore = visibleCount < filteredUsers.length;

    const handleRoleUpdate = async (uid: string, role: RosterRole) => {
        try {
            const response = await authFetch("/api/admin/users", {
                method: "PUT",
                body: JSON.stringify({ userId: uid, updates: { role } }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(typeof result.error === "string" ? result.error : "Failed to update role");
            }
            toast.success(`Role updated to ${role}`);
        } catch (updateError) {
            console.error("Role update failed", updateError);
            toast.error("Could not update role. Please try again.");
        }
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <div className="w-8 h-8 rounded-full border-2 border-brand-pink border-t-transparent animate-spin" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="glass-panel rounded-2xl p-6 text-center text-gray-300">
                Access denied.
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">Roster</h1>
                    <p className="text-gray-400 text-sm">Manage user roles and review account status.</p>
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search by name, email, username"
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-brand-pink"
                    />
                </div>
            </header>

            <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
                {loading ? (
                    <div className="flex items-center justify-center min-h-[260px]">
                        <div className="w-8 h-8 rounded-full border-2 border-brand-pink border-t-transparent animate-spin" />
                    </div>
                ) : error ? (
                    <div className="p-8 text-center text-gray-300">{error}</div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 inline-flex flex-col items-center gap-2 w-full">
                        <UserX className="w-10 h-10 opacity-30" />
                        <p>No roster entries yet.</p>
                    </div>
                ) : (
                    <>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">User</th>
                                        <th className="px-4 py-3 font-semibold">Email</th>
                                        <th className="px-4 py-3 font-semibold">Role</th>
                                        <th className="px-4 py-3 font-semibold">Status</th>
                                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {visibleUsers.map((entry) => (
                                        <tr key={entry.uid}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 overflow-hidden flex items-center justify-center text-xs font-bold text-gray-300 relative">
                                                        {entry.photoURL ? (
                                                            <Image src={entry.photoURL} alt={entry.displayName} fill sizes="40px" className="object-cover" />
                                                        ) : (
                                                            initialsFor(entry.displayName)
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <Link href={`/admin/user/${entry.uid}`} className="text-sm font-semibold text-white truncate inline-flex items-center gap-1 hover:text-brand-cyan transition-colors">
                                                            {entry.displayName}
                                                            {entry.isVerified ? <CheckCircle2 className="w-3 h-3 text-brand-cyan" /> : null}
                                                        </Link>
                                                        <div className="text-xs text-gray-500 truncate">{entry.username ? `@${entry.username}` : entry.uid}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-300">{entry.email}</td>
                                            <td className="px-4 py-3">
                                                <span className={cn(
                                                    "px-2 py-1 rounded-full text-xs border capitalize",
                                                    entry.role === "admin"
                                                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                                                        : entry.role === "creator"
                                                            ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                                                            : "bg-gray-500/10 border-gray-500/20 text-gray-400"
                                                )}>
                                                    {entry.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn(
                                                    "px-2 py-1 rounded-full text-xs border capitalize",
                                                    entry.status === "active"
                                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                        : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                                )}>
                                                    {entry.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end items-center gap-2">
                                                    <select
                                                        className="bg-black/40 border border-white/10 rounded-lg text-xs text-gray-200 px-2 py-1"
                                                        value={entry.role}
                                                        onChange={(event) => handleRoleUpdate(entry.uid, event.target.value as RosterRole)}
                                                    >
                                                        <option value="user">User</option>
                                                        <option value="creator">Creator</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                    <Link
                                                        href={`/admin/user/${entry.uid}`}
                                                        className="text-xs px-2 py-1 rounded-lg bg-brand-pink/10 border border-brand-pink/20 text-brand-pink font-bold hover:bg-brand-pink/20 transition-colors"
                                                    >
                                                        Analytics
                                                    </Link>
                                                    {entry.username ? (
                                                        <Link
                                                            href={`/creators/${entry.username}`}
                                                            className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-200"
                                                        >
                                                            View profile
                                                        </Link>
                                                    ) : null}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="md:hidden divide-y divide-white/5">
                            {visibleUsers.map((entry) => (
                                <div key={entry.uid} className="p-4 space-y-3">
                                    <div className="flex gap-3 items-center">
                                        <div className="w-11 h-11 rounded-full bg-zinc-800 border border-white/10 overflow-hidden flex items-center justify-center text-xs font-bold text-gray-300 relative">
                                            {entry.photoURL ? (
                                                <Image src={entry.photoURL} alt={entry.displayName} fill sizes="44px" className="object-cover" />
                                            ) : (
                                                initialsFor(entry.displayName)
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold text-white inline-flex items-center gap-1">
                                                {entry.displayName}
                                                {entry.isVerified ? <CheckCircle2 className="w-3 h-3 text-brand-cyan" /> : null}
                                            </div>
                                            <div className="text-xs text-gray-500 truncate">{entry.email}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-400">Role</span>
                                        <select
                                            className="bg-black/40 border border-white/10 rounded-lg text-xs text-gray-200 px-2 py-1"
                                            value={entry.role}
                                            onChange={(event) => handleRoleUpdate(entry.uid, event.target.value as RosterRole)}
                                        >
                                            <option value="user">User</option>
                                            <option value="creator">Creator</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-400">Status</span>
                                        <span className={cn(
                                            "px-2 py-1 rounded-full text-xs border capitalize",
                                            entry.status === "active"
                                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                        )}>
                                            {entry.status}
                                        </span>
                                    </div>

                                    {entry.username ? (
                                        <Link
                                            href={`/creators/${entry.username}`}
                                            className="inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-200"
                                        >
                                            <User className="w-3 h-3" />
                                            View profile
                                        </Link>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {hasMore ? (
                <div className="flex justify-center">
                    <button
                        type="button"
                        onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold border border-white/10 bg-white/5 text-gray-200"
                    >
                        Load more
                    </button>
                </div>
            ) : null}
        </div>
    );
}
