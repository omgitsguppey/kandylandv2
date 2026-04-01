"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Clock3, Search, ShieldUser, Sparkles, UserPlus2, UserRoundSearch } from "lucide-react";
import { toast } from "sonner";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import { cn } from "@/lib/utils";

type RosterRole = "user" | "creator" | "admin";
type RosterStatus = "active" | "suspended" | "banned";
type QueueBucket =
    | "newest_submissions"
    | "waiting_on_legal"
    | "waiting_on_id"
    | "ready_for_approval"
    | "needs_changes"
    | "rejected"
    | "approved";

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

type CreatorReviewQueueEntry = RosterEntry & {
    creatorDisplayName: string;
    queueBucket: QueueBucket;
    submissionStatus: string;
    approvalStatus: string;
    legalStatus: string;
    idVerificationStatus: string;
    segmentationStatus: string;
    blockingReasons: string[];
    readyForApproval: boolean;
    creatorReviewQueueVisible: boolean;
    submittedAt: number;
    updatedAt: number;
    legalDocumentUrl?: string;
    segmentLabel?: string;
    reviewedBy?: string;
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
    reviewQueueCount: number;
    readyForApprovalCount: number;
    waitingOnIdCount: number;
    waitingOnLegalCount: number;
    needsChangesCount: number;
    rejectedCount: number;
};

type RosterResponse = {
    success?: boolean;
    rosterUsers?: RosterEntry[];
    creatorReviewQueue?: CreatorReviewQueueEntry[];
    searchResults?: RosterEntry[];
    creatorOpsByUser?: Record<string, RosterCreatorOps>;
    summary?: RosterSummary;
};

type QueueFilter = "all" | QueueBucket;
type QueueSort = "newest" | "oldest";

const SEARCH_MIN_LENGTH = 2;
const QUEUE_FILTER_OPTIONS: Array<{ key: QueueFilter; label: string }> = [
    { key: "all", label: "All review items" },
    { key: "newest_submissions", label: "Newest" },
    { key: "waiting_on_id", label: "Waiting on ID" },
    { key: "waiting_on_legal", label: "Waiting on legal" },
    { key: "ready_for_approval", label: "Ready to approve" },
    { key: "needs_changes", label: "Needs changes" },
    { key: "rejected", label: "Rejected" },
];

function initialsFor(name: string) {
    const parts = name.split(" ").filter(Boolean);
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "U";
}

function formatStatusLabel(value: string | undefined) {
    return value ? value.replaceAll("_", " ") : "pending";
}

function formatRelativeTime(value: number) {
    return value > 0 ? formatDistanceToNow(value, { addSuffix: true }) : "No timestamp";
}

function formatQueueBucketLabel(value: QueueBucket) {
    if (value === "ready_for_approval") {
        return "Ready for approval";
    }

    if (value === "waiting_on_id") {
        return "Waiting on ID";
    }

    if (value === "waiting_on_legal") {
        return "Waiting on legal";
    }

    return formatStatusLabel(value);
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

function Avatar({ entry }: { entry: Pick<RosterEntry, "displayName" | "photoURL"> }) {
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
    const [creatorReviewQueue, setCreatorReviewQueue] = useState<CreatorReviewQueueEntry[]>([]);
    const [searchResults, setSearchResults] = useState<RosterEntry[]>([]);
    const [selectedCandidate, setSelectedCandidate] = useState<RosterEntry | null>(null);
    const [summary, setSummary] = useState<RosterSummary | null>(null);
    const [creatorOpsByUser, setCreatorOpsByUser] = useState<Record<string, RosterCreatorOps>>({});
    const [searchTerm, setSearchTerm] = useState("");
    const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
    const [queueSort, setQueueSort] = useState<QueueSort>("newest");
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
                setCreatorReviewQueue(result.creatorReviewQueue || []);
                setSummary(result.summary || null);
                setCreatorOpsByUser(result.creatorOpsByUser || {});
                setError(null);
                setLoading(false);
            } catch (loadError) {
                console.error("Failed to load creator roster", loadError);
                if (!cancelled) {
                    setRosterUsers([]);
                    setCreatorReviewQueue([]);
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
    const filteredQueue = useMemo(() => {
        const filtered = queueFilter === "all"
            ? creatorReviewQueue
            : creatorReviewQueue.filter((entry) => entry.queueBucket === queueFilter);

        return [...filtered].sort((left, right) => (
            queueSort === "oldest"
                ? left.submittedAt - right.submittedAt || left.updatedAt - right.updatedAt
                : right.submittedAt - left.submittedAt || right.updatedAt - left.updatedAt
        ));
    }, [creatorReviewQueue, queueFilter, queueSort]);

    const refreshRoster = async () => {
        setError(null);
        const [baseResult, searchResult] = await Promise.all([
            fetchRoster(),
            searchTerm.trim().length >= SEARCH_MIN_LENGTH ? fetchRoster(searchTerm) : Promise.resolve<RosterResponse>({ searchResults: [] }),
        ]);
        setRosterUsers(baseResult.rosterUsers || []);
        setCreatorReviewQueue(baseResult.creatorReviewQueue || []);
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
                title="Creator Review + Live Roster"
                subtitle="New creator submissions land in the review queue first, while approved creator accounts stay in the live roster below."
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
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Review queue</p>
                    <p className="mt-2 text-3xl font-black text-white">{summary?.reviewQueueCount ?? 0}</p>
                    <p className="mt-1 text-xs text-gray-400">Creator submissions still waiting on manual admin action.</p>
                </div>
                <div className="glass-panel rounded-[1.7rem] border border-white/10 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Ready to approve</p>
                    <p className="mt-2 text-3xl font-black text-white">{summary?.readyForApprovalCount ?? 0}</p>
                    <p className="mt-1 text-xs text-gray-400">All legal, ID, and segmentation blockers are cleared.</p>
                </div>
                <div className="glass-panel rounded-[1.7rem] border border-white/10 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Waiting on ID</p>
                    <p className="mt-2 text-3xl font-black text-white">{summary?.waitingOnIdCount ?? 0}</p>
                    <p className="mt-1 text-xs text-gray-400">Applicants still waiting on an ID request, upload, or review.</p>
                </div>
                <div className="glass-panel rounded-[1.7rem] border border-white/10 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Waiting on legal</p>
                    <p className="mt-2 text-3xl font-black text-white">{summary?.waitingOnLegalCount ?? 0}</p>
                    <p className="mt-1 text-xs text-gray-400">Applicants blocked on legal delivery or signature.</p>
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

            <div className="rounded-[2rem] border border-white/10 bg-black/20 p-4 md:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Creator review queue</p>
                        <h3 className="mt-2 text-lg font-bold text-white">Manual creator intake inside roster</h3>
                        <p className="mt-1 text-sm text-gray-400">Every creator submission now lands here first with legal, ID, segmentation, and approval state visible in one place.</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <select
                            value={queueSort}
                            onChange={(event) => setQueueSort(event.target.value as QueueSort)}
                            className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-xs font-semibold text-white outline-none"
                        >
                            <option value="newest">Newest first</option>
                            <option value="oldest">Oldest first</option>
                        </select>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                            {creatorReviewQueue.length} queued
                        </span>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    {QUEUE_FILTER_OPTIONS.map((option) => (
                        <button
                            key={option.key}
                            type="button"
                            onClick={() => setQueueFilter(option.key)}
                            className={cn(
                                "rounded-full border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors",
                                queueFilter === option.key
                                    ? "border-brand-purple/35 bg-brand-purple/15 text-white"
                                    : "border-white/10 bg-black/30 text-gray-400 hover:text-white",
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="mt-4 flex min-h-[220px] items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
                    </div>
                ) : error ? (
                    <div className="mt-4 rounded-[1.6rem] border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">{error}</div>
                ) : filteredQueue.length === 0 ? (
                    <div className="mt-4 rounded-[1.7rem] border border-dashed border-white/10 bg-black/25 px-5 py-10 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-gray-400">
                            <UserRoundSearch className="h-6 w-6" />
                        </div>
                        <h4 className="mt-4 text-lg font-bold text-white">No creator submissions in this queue view</h4>
                        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-400">
                            Adjust the queue filter above or wait for the next creator submission to arrive.
                        </p>
                    </div>
                ) : (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {filteredQueue.map((entry) => (
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

                                    <span className="rounded-full border border-brand-purple/20 bg-brand-purple/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                                        {formatQueueBucketLabel(entry.queueBucket)}
                                    </span>
                                </div>

                                <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Creator identity</p>
                                    <p className="mt-2 text-lg font-black text-white">{entry.creatorDisplayName}</p>
                                    <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                                        <Clock3 className="h-3.5 w-3.5 text-brand-purple" />
                                        Submitted {formatRelativeTime(entry.submittedAt)}
                                    </p>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                                        Submission: {formatStatusLabel(entry.submissionStatus)}
                                    </span>
                                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                                        Approval: {formatStatusLabel(entry.approvalStatus)}
                                    </span>
                                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                                        Legal: {formatStatusLabel(entry.legalStatus)}
                                    </span>
                                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                                        ID: {formatStatusLabel(entry.idVerificationStatus)}
                                    </span>
                                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                                        Segment: {formatStatusLabel(entry.segmentationStatus)}
                                    </span>
                                </div>

                                <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Blocking reasons</p>
                                    {entry.blockingReasons.length > 0 ? (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {entry.blockingReasons.map((reason) => (
                                                <span key={`${entry.uid}-${reason}`} className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200">
                                                    {formatStatusLabel(reason)}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="mt-3 text-sm text-emerald-200">No blockers detected.</p>
                                    )}
                                    <p className="mt-3 text-xs text-gray-500">
                                        {entry.readyForApproval
                                            ? "This submission is clear for creator approval."
                                            : `Last updated ${formatRelativeTime(entry.updatedAt)}${entry.reviewedBy ? ` by ${entry.reviewedBy}` : ""}.`}
                                    </p>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    <Link
                                        href={`/admin/user/${entry.uid}`}
                                        className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-200 transition-colors hover:border-white/20 hover:text-white"
                                    >
                                        Review creator
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => void handleRoleUpdate(entry, "creator")}
                                        className="rounded-2xl border border-brand-purple/25 bg-brand-purple/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-purple transition-colors hover:bg-brand-purple/20"
                                    >
                                        Activate role
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

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
