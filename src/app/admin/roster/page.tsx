"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Search, User, UserX, Sparkles, Users, HeartHandshake, Wand2 } from "lucide-react";
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";

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

    const isAdmin = userProfile?.role === "admin";

    useEffect(() => {
        if (authLoading || !isAdmin) {
            return;
        }

        let cancelled = false;

        const fetchRoster = async () => {
            try {
                const response = await authFetch("/api/admin/users");
                const result = await response.json() as { success?: boolean; users?: Array<Record<string, unknown>> };
                if (!response.ok || !result.success) {
                    throw new Error("Unable to load roster right now. Please try again shortly.");
                }

                if (cancelled) {
                    return;
                }

                const normalized = (result.users || []).map((entry) => ({
                    uid: typeof entry.uid === "string" ? entry.uid : "",
                    displayName: typeof entry.displayName === "string" && entry.displayName.trim().length > 0 ? entry.displayName : "Unknown user",
                    email: typeof entry.email === "string" && entry.email.trim().length > 0 ? entry.email : "No email",
                    username: typeof entry.username === "string" ? entry.username : "",
                    photoURL: typeof entry.photoURL === "string" ? entry.photoURL : null,
                    role: entry.role === "admin" || entry.role === "creator" || entry.role === "user" ? entry.role : "user",
                    status: entry.status === "suspended" || entry.status === "banned" || entry.status === "active" ? entry.status : "active",
                    isVerified: entry.isVerified === true,
                    createdAt: typeof entry.createdAt === "number" ? entry.createdAt : 0,
                })) as RosterEntry[];

                setUsers(normalized);
                setError(null);
                setLoading(false);
            } catch (snapshotError) {
                console.error("Failed to load roster", snapshotError);
                if (!cancelled) {
                    setError("Unable to load roster right now. Please try again shortly.");
                    setLoading(false);
                }
            }
        };

        void fetchRoster();

        return () => {
            cancelled = true;
        };
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
    const creatorUsers = useMemo(
        () => users.filter((entry) => entry.role === "creator" || entry.role === "admin"),
        [users],
    );

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
            setUsers((current) => current.map((entry) => (
                entry.uid === uid
                    ? { ...entry, role }
                    : entry
            )));
            toast.success(`Role updated to ${role}`);
        } catch (updateError) {
            console.error("Role update failed", updateError);
            toast.error("Could not update role. Please try again.");
        }
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <div className="w-8 h-8 rounded-full border-2 border-brand-purple border-t-transparent animate-spin" />
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
            <AdminPageHeader
                eyebrow="Admin Roster"
                title="Roster"
                subtitle="Manage the creator roster today while prepping the pipeline for creator onboarding, follow systems, and roster-led drop programming."
                actions={
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search by name, email, username"
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-brand-purple"
                    />
                </div>
                }
            />

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="glass-panel rounded-[1.7rem] border border-white/10 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Creators on roster</p>
                    <p className="mt-2 text-3xl font-black text-white">{creatorUsers.length}</p>
                    <p className="mt-1 text-xs text-gray-400">Accounts already positioned for creator-facing experiences.</p>
                </div>
                <div className="glass-panel rounded-[1.7rem] border border-white/10 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Verified roster</p>
                    <p className="mt-2 text-3xl font-black text-white">{creatorUsers.filter((entry) => entry.isVerified).length}</p>
                    <p className="mt-1 text-xs text-gray-400">Verified talent with public-facing trust signals.</p>
                </div>
                <div className="glass-panel rounded-[1.7rem] border border-white/10 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Active creators</p>
                    <p className="mt-2 text-3xl font-black text-white">{creatorUsers.filter((entry) => entry.status === "active").length}</p>
                    <p className="mt-1 text-xs text-gray-400">Ready for onboarding connections and future follow prompts.</p>
                </div>
                <div className="glass-panel rounded-[1.7rem] border border-white/10 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Scouting pool</p>
                    <p className="mt-2 text-3xl font-black text-white">{users.filter((entry) => entry.role === "user").length}</p>
                    <p className="mt-1 text-xs text-gray-400">Potential accounts that could be promoted into the creator roster.</p>
                </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
                {[
                    {
                        icon: Sparkles,
                        title: "Creator onboarding pipeline",
                        copy: "Work in progress. This panel will map invite status, onboarding milestones, verification, and readiness for first-drop setup.",
                    },
                    {
                        icon: HeartHandshake,
                        title: "Social + follow graph",
                        copy: "Work in progress. This panel will track fan follows, creator affinity, social prompts, and follow-driven retention loops.",
                    },
                    {
                        icon: Wand2,
                        title: "Creator experiences + drops",
                        copy: "Work in progress. This panel will coordinate creator-specific experiences, drop calendars, and roster programming.",
                    },
                ].map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.title} className="glass-panel rounded-[1.8rem] border border-white/10 p-5">
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-purple/25 bg-brand-purple/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                                <Users className="h-3.5 w-3.5" />
                                Work in progress
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-purple/25 bg-brand-purple/15 text-white">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">{item.title}</h3>
                                    <p className="mt-2 text-sm leading-6 text-gray-400">{item.copy}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center min-h-[260px]">
                        <div className="w-8 h-8 rounded-full border-2 border-brand-purple border-t-transparent animate-spin" />
                    </div>
                ) : error ? (
                    <div className="p-8 text-center text-gray-300">{error}</div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 inline-flex flex-col items-center gap-2 w-full">
                        <UserX className="w-10 h-10 opacity-30" />
                        <p>No roster entries yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 p-4 md:p-6 bg-black/20">
                        {visibleUsers.map((entry) => {
                            const isAdminUser = entry.role === "admin";
                            const isCreator = entry.role === "creator";

                            return (
                                <div key={entry.uid} className={`glass-panel rounded-3xl p-5 border relative overflow-hidden group transition-all hover:-translate-y-1 ${isAdminUser ? "border-red-500/30 hover:shadow-[0_0_30px_-5px_rgba(239,68,68,0.3)] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-500/10 via-black to-black" :
                                        isCreator ? "border-brand-purple/30 hover:shadow-[0_0_30px_-5px_rgba(178,140,255,0.3)] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-purple/10 via-black to-black" :
                                            "border-white/10 hover:border-white/20 bg-black/40"
                                    }`}>
                                    {/* Card Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg relative overflow-hidden shrink-0 border shadow-inner ${isAdminUser ? 'border-red-500/50 bg-red-500/20 text-red-500' :
                                                    isCreator ? 'border-brand-purple/50 bg-brand-purple/20 text-brand-purple' :
                                                        'border-white/10 bg-zinc-800 text-gray-400'
                                                }`}>
                                                {entry.photoURL ? (
                                                    <Image src={entry.photoURL} alt={entry.displayName} fill sizes="48px" className="object-cover" />
                                                ) : (
                                                    initialsFor(entry.displayName)
                                                )}
                                            </div>
                                            <div>
                                                <Link href={`/admin/user/${entry.uid}`} className="text-sm font-black text-white truncate inline-flex items-center gap-1 hover:text-brand-purple transition-colors max-w-[140px]">
                                                    {entry.displayName}
                                                    {entry.isVerified ? <CheckCircle2 className="w-3.5 h-3.5 text-brand-purple shrink-0" /> : null}
                                                </Link>
                                                <div className="text-[10px] text-gray-500 font-mono truncate max-w-[140px]">{entry.username ? `@${entry.username}` : entry.email}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Account Information */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center bg-black/50 px-3 py-2 rounded-xl border border-white/5">
                                            <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px]">Permission Level</span>
                                            <select
                                                className={`bg-transparent text-xs font-bold uppercase tracking-wider outline-none transition-colors appearance-none text-right cursor-pointer ${isAdminUser ? "text-red-400" :
                                                        isCreator ? "text-brand-purple" :
                                                            "text-gray-300"
                                                    }`}
                                                value={entry.role}
                                                onChange={(event) => handleRoleUpdate(entry.uid, event.target.value as RosterRole)}
                                            >
                                                <option value="user" className="bg-black">User</option>
                                                <option value="creator" className="bg-black text-brand-purple">Creator</option>
                                                <option value="admin" className="bg-black text-red-500">Admin</option>
                                            </select>
                                        </div>

                                        <div className="flex justify-between items-center bg-black/50 px-3 py-2 rounded-xl border border-white/5">
                                            <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px]">Status</span>
                                            <span className={cn(
                                                "text-[10px] font-black uppercase tracking-widest",
                                                entry.status === "active" ? "text-green-500" : "text-red-500 opacity-80"
                                            )}>
                                                {entry.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Footer Actions */}
                                    <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-2">
                                        <Link
                                            href={`/admin/user/${entry.uid}`}
                                            className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                                        >
                                            Analytics
                                        </Link>
                                        {entry.username ? (
                                            <Link
                                                href={`/creators/${entry.username}`}
                                                className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider py-2 rounded-xl bg-brand-purple/10 border border-brand-purple/20 text-brand-purple hover:bg-brand-purple/20 transition-colors"
                                            >
                                                <User className="w-3 h-3" />
                                                Profile
                                            </Link>
                                        ) : (
                                            <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider py-2 rounded-xl bg-black/40 border border-white/5 text-gray-600 cursor-not-allowed">
                                                No Profile
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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
