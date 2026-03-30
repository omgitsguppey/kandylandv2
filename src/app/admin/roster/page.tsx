"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Search, ShieldUser, Sparkles, UserPlus2 } from "lucide-react";
import { toast } from "sonner";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import { cn } from "@/lib/utils";

type RosterRole = "user" | "creator" | "admin";
type RosterStatus = "active" | "suspended" | "banned";

type RosterEntry = {
    uid: string;
    displayName: string;
    email: string;
    username: string;
    photoURL: string | null;
    role: RosterRole;
    status: RosterStatus;
    isVerified: boolean;
};

type RosterCreatorOps = {
    followerCount: number;
    activeSubscribers: number;
    openThreads: number;
    pendingDropSubmissions: number;
    totalAccruedGd: number;
};

type RosterSummary = {
    creatorCount: number;
    activeCreatorCount: number;
    totalFollowers: number;
    activeSubscriptions: number;
    pendingDropSubmissions: number;
    totalAccruedGd: number;
};

type RosterResponse = {
    success?: boolean;
    rosterUsers?: RosterEntry[];
    searchResults?: RosterEntry[];
    creatorOpsByUser?: Record<string, RosterCreatorOps>;
    summary?: RosterSummary;
};

const SEARCH_MIN_LENGTH = 2;

function initialsFor(name: string) {
    const parts = name.split(" ").filter(Boolean);
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "U";
}

async function fetchRoster(query = ""): Promise<RosterResponse> {
    const suffix = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
    const response = await authFetch(`/api/admin/roster${suffix}`);
    const result = await response.json() as RosterResponse;
    if (!response.ok || !result.success) {
        throw new Error("Unable to load creator roster right now.");
    }
    return result;
}

function Avatar({ entry }: { entry: RosterEntry }) {
    if (entry.photoURL) {
        return (
            <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                <Image src={entry.photoURL} alt={entry.displayName} fill sizes="48px" className="object-cover" />
            </div>
        );
    }

    return (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-sm font-black text-white">
            {initialsFor(entry.displayName)}
        </div>
    );
}

export default function AdminRosterPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const [rosterUsers, setRosterUsers] = useState<RosterEntry[]>([]);
    const [searchResults, setSearchResults] = useState<RosterEntry[]>([]);
    const [selectedCandidate, setSelectedCandidate] = useState<RosterEntry | null>(null);
    const [summary, setSummary] = useState<RosterSummary | null>(null);
    const [creatorOpsByUser, setCreatorOpsByUser] = useState<Record<string, RosterCreatorOps>>({});
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isAdmin = userProfile?.role === "admin";

    useEffect(() => {
        if (authLoading || !isAdmin) {
            return;
        }

        let cancelled = false;

        const load = async () => {
            try {
                const result = await fetchRoster();
                if (cancelled) return;
                setRosterUsers(result.rosterUsers || []);
                setSummary(result.summary || null);
                setCreatorOpsByUser(result.creatorOpsByUser || {});
                setError(null);
                setLoading(false);
            } catch (loadError) {
                console.error("Failed to load creator roster", loadError);
                if (!cancelled) {
                    setRosterUsers([]);
                    setSummary(null);
                    setCreatorOpsByUser({});
                    setError("Unable to load creator roster right now.");
                    setLoading(false);
                }
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, [authLoading, isAdmin]);

    useEffect(() => {
        if (authLoading || !isAdmin) {
            return;
        }

        if (searchTerm.trim().length < SEARCH_MIN_LENGTH) {
            setSearchResults([]);
            setSearchLoading(false);
            return;
        }

        let cancelled = false;
        const timeoutId = window.setTimeout(async () => {
            try {
                setSearchLoading(true);
                const result = await fetchRoster(searchTerm);
                if (!cancelled) {
                    setSearchResults(result.searchResults || []);
                }
            } catch (searchError) {
                console.error("Failed to search roster users", searchError);
                if (!cancelled) {
                    setSearchResults([]);
                    setSelectedCandidate(null);
                }
            } finally {
                if (!cancelled) {
                    setSearchLoading(false);
                }
            }
        }, 180);

        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
        };
    }, [authLoading, isAdmin, searchTerm]);

    const primaryAdmin = useMemo(
        () => rosterUsers.find((entry) => entry.role === "admin") ?? null,
        [rosterUsers],
    );
    const creators = useMemo(
        () => rosterUsers.filter((entry) => entry.role === "creator"),
        [rosterUsers],
    );

    const refreshRoster = async () => {
        setError(null);
        const [baseResult, searchResult] = await Promise.all([
            fetchRoster(),
            searchTerm.trim().length >= SEARCH_MIN_LENGTH ? fetchRoster(searchTerm) : Promise.resolve<RosterResponse>({ searchResults: [] }),
        ]);
        setRosterUsers(baseResult.rosterUsers || []);
        setSummary(baseResult.summary || null);
        setCreatorOpsByUser(baseResult.creatorOpsByUser || {});
        setSearchResults(searchResult.searchResults || []);
    };

    const handleRoleUpdate = async (entry: RosterEntry, role: RosterRole) => {
        try {
            const response = await authFetch("/api/admin/users", {
                method: "PUT",
                body: JSON.stringify({ userId: entry.uid, updates: { role } }),
            });
            const result = await response.json() as { error?: string };
            if (!response.ok) {
                throw new Error(result.error || "Failed to update role");
            }

            await refreshRoster();
            if (selectedCandidate?.uid === entry.uid) {
                setSelectedCandidate(null);
                setSearchTerm("");
                setSearchResults([]);
            }
            toast.success(`Role updated to ${role}`);
        } catch (updateError) {
            console.error("Failed to update roster role", updateError);
            toast.error(updateError instanceof Error ? updateError.message : "Could not update role.");
        }
    };

    if (authLoading) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
            </div>
        );
    }

    if (!isAdmin) {
        return <div className="glass-panel rounded-2xl p-6 text-center text-gray-300">Access denied.</div>;
    }

    return (
        <div className="space-y-5">
            <PageViewEvent eventName="admin_roster_viewed" />
            <AdminPageHeader
                eyebrow="Admin Roster"
                title="Creator + Admin Roster"
                subtitle="Search signed-up users only when you need to elevate them. The live roster stays focused on creators plus your primary admin record."
                actions={
                    <div className="relative w-full sm:w-[24rem]">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search signed-up users to add to creator management"
                            className="w-full rounded-2xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-4 text-sm text-white focus:border-brand-purple focus:outline-none"
                        />

                        {searchTerm.trim().length >= SEARCH_MIN_LENGTH ? (
                            <div className="absolute left-0 right-0 top-[calc(100%+0.6rem)] z-20 overflow-hidden rounded-[1.4rem] border border-white/10 bg-black/95 shadow-2xl shadow-black/40">
                                {searchLoading ? (
                                    <div className="px-4 py-3 text-sm text-gray-400">Searching signed-up users...</div>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map((entry) => (
                                        <button
                                            key={entry.uid}
                                            type="button"
                                            onClick={() => {
                                                setSelectedCandidate(entry);
                                                setSearchTerm("");
                                                setSearchResults([]);
                                            }}
                                            className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-white/[0.04]"
                                        >
                                            <Avatar entry={entry} />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-white">{entry.displayName}</p>
                                                <p className="truncate text-xs text-gray-500">{entry.username ? `@${entry.username}` : entry.email || entry.uid}</p>
                                            </div>
                                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                                                {entry.status}
                                            </span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-4 py-3 text-sm text-gray-400">No signed-up users matched that search.</div>
                                )}
                            </div>
                        ) : null}
                    </div>
                }
            />

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="glass-panel rounded-[1.7rem] border border-white/10 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Creators on roster</p>
                    <p className="mt-2 text-3xl font-black text-white">{summary?.creatorCount ?? 0}</p>
                    <p className="mt-1 text-xs text-gray-400">Only creator accounts stay in this curated view.</p>
                </div>
                <div className="glass-panel rounded-[1.7rem] border border-white/10 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Active creators</p>
                    <p className="mt-2 text-3xl font-black text-white">{summary?.activeCreatorCount ?? 0}</p>
                    <p className="mt-1 text-xs text-gray-400">Ready for discovery, follows, and creator experiences.</p>
                </div>
                <div className="glass-panel rounded-[1.7rem] border border-white/10 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Follower graph</p>
                    <p className="mt-2 text-3xl font-black text-white">{summary?.totalFollowers ?? 0}</p>
                    <p className="mt-1 text-xs text-gray-400">Durable creator relationships tied to rostered creators.</p>
                </div>
                <div className="glass-panel rounded-[1.7rem] border border-white/10 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Creator revenue</p>
                    <p className="mt-2 text-3xl font-black text-white">{(summary?.totalAccruedGd ?? 0).toLocaleString()}</p>
                    <p className="mt-1 text-xs text-gray-400">Accrued GD still sitting inside the creator ledger.</p>
                </div>
            </div>

            {selectedCandidate ? (
                <div className="glass-panel rounded-[1.9rem] border border-brand-purple/20 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-3">
                            <Avatar entry={selectedCandidate} />
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-brand-purple/25 bg-brand-purple/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                                    <UserPlus2 className="h-3.5 w-3.5" />
                                    Search result
                                </div>
                                <h3 className="mt-3 text-lg font-bold text-white">{selectedCandidate.displayName}</h3>
                                <p className="mt-1 text-sm text-gray-400">{selectedCandidate.username ? `@${selectedCandidate.username}` : selectedCandidate.email || selectedCandidate.uid}</p>
                                <p className="mt-2 text-sm leading-6 text-gray-400">
                                    Promote this signed-up user into creator management when you are ready. Once they become a creator, they will move into the curated roster automatically.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => void handleRoleUpdate(selectedCandidate, "creator")}
                                className="rounded-2xl border border-brand-purple/30 bg-brand-purple/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-purple/20"
                            >
                                Promote to creator
                            </button>
                            <Link
                                href={`/admin/user/${selectedCandidate.uid}`}
                                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:border-white/20 hover:text-white"
                            >
                                Open user detail
                            </Link>
                        </div>
                    </div>
                </div>
            ) : null}

            {primaryAdmin ? (
                <div className="glass-panel rounded-[1.9rem] border border-red-500/20 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-3">
                            <Avatar entry={primaryAdmin} />
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-red-200">
                                    <ShieldUser className="h-3.5 w-3.5" />
                                    Primary admin record
                                </div>
                                <h3 className="mt-3 text-lg font-bold text-white">{primaryAdmin.displayName}</h3>
                                <p className="mt-1 text-sm text-gray-400">{primaryAdmin.email || primaryAdmin.uid}</p>
                            </div>
                        </div>

                        <Link
                            href={`/admin/user/${primaryAdmin.uid}`}
                            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:border-white/20 hover:text-white"
                        >
                            Open admin detail
                        </Link>
                    </div>
                </div>
            ) : null}

            <div className="rounded-[2rem] border border-white/10 bg-black/20 p-4 md:p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Creator roster</p>
                        <h3 className="mt-2 text-lg font-bold text-white">Live creator management</h3>
                        <p className="mt-1 text-sm text-gray-400">The roster stays creator-first, while user discovery happens through the search box instead of an all-user wall.</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                        {creators.length} creators
                    </span>
                </div>

                {loading ? (
                    <div className="flex min-h-[220px] items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
                    </div>
                ) : error ? (
                    <div className="rounded-[1.6rem] border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">{error}</div>
                ) : creators.length === 0 ? (
                    <div className="rounded-[1.7rem] border border-dashed border-white/10 bg-black/25 px-5 py-10 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-gray-400">
                            <Sparkles className="h-6 w-6" />
                        </div>
                        <h4 className="mt-4 text-lg font-bold text-white">No creators are live in roster right now</h4>
                        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-400">
                            Search for a signed-up user above and promote them into creator management when you are ready.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {creators.map((entry) => {
                            const ops = creatorOpsByUser[entry.uid];

                            return (
                                <div key={entry.uid} className="glass-panel rounded-[1.8rem] border border-brand-purple/15 p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar entry={entry} />
                                            <div className="min-w-0">
                                                <Link href={`/admin/user/${entry.uid}`} className="inline-flex max-w-[14rem] items-center gap-1 truncate text-sm font-black text-white transition-colors hover:text-brand-purple">
                                                    {entry.displayName}
                                                    {entry.isVerified ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand-purple" /> : null}
                                                </Link>
                                                <p className="truncate text-[11px] text-gray-500">{entry.username ? `@${entry.username}` : entry.email || entry.uid}</p>
                                            </div>
                                        </div>

                                        <select
                                            className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white outline-none"
                                            value={entry.role}
                                            onChange={(event) => void handleRoleUpdate(entry, event.target.value as RosterRole)}
                                        >
                                            <option value="user" className="bg-black">User</option>
                                            <option value="creator" className="bg-black">Creator</option>
                                            <option value="admin" className="bg-black">Admin</option>
                                        </select>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <span className={cn(
                                            "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                                            entry.status === "active"
                                                ? "border-green-500/25 bg-green-500/10 text-green-200"
                                                : "border-amber-500/20 bg-amber-500/10 text-amber-200",
                                        )}>
                                            {entry.status}
                                        </span>
                                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                                            {ops?.followerCount || 0} followers
                                        </span>
                                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                                            {ops?.activeSubscribers || 0} subscribers
                                        </span>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                        <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5">
                                            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-gray-500">Threads</p>
                                            <p className="mt-1 text-sm font-black text-white">{ops?.openThreads || 0}</p>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5">
                                            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-gray-500">Pending drops</p>
                                            <p className="mt-1 text-sm font-black text-white">{ops?.pendingDropSubmissions || 0}</p>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5">
                                            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-gray-500">Followers</p>
                                            <p className="mt-1 text-sm font-black text-white">{ops?.followerCount || 0}</p>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5">
                                            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-gray-500">Accrued GD</p>
                                            <p className="mt-1 text-sm font-black text-white">{(ops?.totalAccruedGd || 0).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                        <Link
                                            href={`/admin/user/${entry.uid}`}
                                            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-200 transition-colors hover:border-white/20 hover:text-white"
                                        >
                                            Admin detail
                                        </Link>
                                        {entry.username ? (
                                            <Link
                                                href={`/creators/${entry.username}`}
                                                className="inline-flex items-center justify-center rounded-2xl border border-brand-purple/25 bg-brand-purple/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-purple transition-colors hover:bg-brand-purple/20"
                                            >
                                                Creator page
                                            </Link>
                                        ) : (
                                            <div className="inline-flex items-center justify-center rounded-2xl border border-white/5 bg-black/25 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-600">
                                                No public page
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
