"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import {
    CheckCircle2,
    Clock3,
    FileText,
    RefreshCw,
    Search,
    ShieldUser,
    Sparkles,
    X,
    UserPlus2,
    UserRoundSearch,
} from "lucide-react";
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
    creatorPrimaryPlatform?: string;
    creatorContentFocus?: string;
    queueBucket: QueueBucket;
    queuePosition: number;
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
    idDocumentFileName?: string;
    idDocumentFrontFileName?: string;
    idDocumentBackFileName?: string;
    idDocumentFrontContentType?: string;
    idDocumentBackContentType?: string;
    idDocumentCount: number;
    adminNotes?: string;
    reviewedBy?: string;
};

type DocumentPreviewState = {
    title: string;
    href: string;
    contentType?: string;
    fileName?: string;
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
type QueuePatch = Partial<Pick<CreatorReviewQueueEntry, "approvalStatus" | "legalStatus" | "idVerificationStatus" | "segmentationStatus" | "segmentLabel" | "adminNotes">>;

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

function getStatusChipClasses(tone: "accent" | "success" | "warn" | "danger" | "muted") {
    switch (tone) {
        case "accent":
            return "border-brand-purple/30 bg-brand-purple/12 text-white";
        case "success":
            return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
        case "warn":
            return "border-amber-400/25 bg-amber-400/10 text-amber-200";
        case "danger":
            return "border-red-500/25 bg-red-500/10 text-red-200";
        default:
            return "border-white/10 bg-white/5 text-gray-300";
    }
}

function getQueueTone(entry: CreatorReviewQueueEntry): "accent" | "success" | "warn" | "danger" {
    if (entry.approvalStatus === "creator_rejected") {
        return "danger";
    }

    if (entry.readyForApproval || entry.approvalStatus === "creator_approved") {
        return "success";
    }

    if (entry.approvalStatus === "creator_needs_changes") {
        return "warn";
    }

    return "accent";
}

function getStatusTone(value: string) {
    if (value.includes("approved") || value.includes("signed") || value.includes("verified") || value.includes("assigned")) {
        return "success" as const;
    }

    if (value.includes("rejected")) {
        return "danger" as const;
    }

    if (value.includes("needs_changes") || value.includes("pending") || value.includes("requested")) {
        return "warn" as const;
    }

    return "muted" as const;
}

function buildAdminIdDocumentHref(userId: string, side: "front" | "back") {
    return `/api/admin/user/${userId}/creator-onboarding/id-document?side=${side}`;
}

function canInlinePreviewDocument(contentType?: string, fileName?: string) {
    if (contentType?.startsWith("image/") || contentType === "application/pdf") {
        return true;
    }

    const normalizedFileName = fileName?.toLowerCase() || "";
    return normalizedFileName.endsWith(".pdf")
        || normalizedFileName.endsWith(".png")
        || normalizedFileName.endsWith(".jpg")
        || normalizedFileName.endsWith(".jpeg")
        || normalizedFileName.endsWith(".webp");
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

function Avatar({ entry, compact = false }: { entry: Pick<RosterEntry, "displayName" | "photoURL">; compact?: boolean }) {
    const sizeClasses = compact ? "h-10 w-10 rounded-2xl" : "h-12 w-12 rounded-2xl";

    if (entry.photoURL) {
        return (
            <div className={cn("relative overflow-hidden border border-white/10 bg-black/30", sizeClasses)}>
                <Image src={entry.photoURL} alt={entry.displayName} fill sizes={compact ? "40px" : "48px"} className="object-cover" />
            </div>
        );
    }

    return (
        <div className={cn("flex items-center justify-center border border-white/10 bg-black/30 font-black text-white", sizeClasses, compact ? "text-xs" : "text-sm")}>
            {initialsFor(entry.displayName)}
        </div>
    );
}

function DocumentPreviewModal({
    preview,
    onClose,
}: {
    preview: DocumentPreviewState | null;
    onClose: () => void;
}) {
    if (!preview) {
        return null;
    }

    const inlinePreview = canInlinePreviewDocument(preview.contentType, preview.fileName);
    return (
        <div className="fixed inset-0 z-50 flex items-end bg-black/80 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
            <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[1.8rem] border border-white/10 bg-zinc-950 shadow-2xl shadow-black/60">
                <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Secure document review</p>
                        <h3 className="mt-2 truncate text-base font-bold text-white">{preview.title}</h3>
                        {preview.fileName ? (
                            <p className="mt-1 truncate text-xs text-gray-400">{preview.fileName}</p>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-gray-300 transition-colors hover:border-white/20 hover:text-white"
                        aria-label="Close document preview"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="min-h-[50vh] flex-1 bg-black/40">
                    {inlinePreview ? (
                        <iframe
                            src={preview.href}
                            title={preview.title}
                            className="h-[68vh] w-full border-0"
                        />
                    ) : (
                        <div className="flex h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
                            <p className="max-w-md text-sm leading-6 text-gray-300">
                                This file type opens more reliably in a new tab. Use the button below to review it without leaving the secure admin route.
                            </p>
                            <a
                                href={preview.href}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full border border-brand-purple/30 bg-brand-purple/15 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-purple/20"
                            >
                                Open in new tab
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function buildQueueQuickActions(entry: CreatorReviewQueueEntry) {
    const actions: Array<{
        key: string;
        label: string;
        patch: QueuePatch;
        tone: "accent" | "success" | "warn";
    }> = [];

    if (entry.legalStatus === "legal_pending") {
        actions.push({
            key: "legal_sent",
            label: "Send legal packet",
            patch: { legalStatus: "legal_sent" },
            tone: "accent",
        });
    } else if (entry.legalStatus === "legal_sent") {
        actions.push({
            key: "legal_signed",
            label: "Mark legal signed",
            patch: { legalStatus: "legal_signed" },
            tone: "success",
        });
    }

    if (entry.idVerificationStatus === "id_not_requested") {
        actions.push({
            key: "id_requested",
            label: "Enable ID upload",
            patch: { idVerificationStatus: "id_requested" },
            tone: "accent",
        });
    } else if (entry.idVerificationStatus === "id_submitted") {
        actions.push({
            key: "id_verified",
            label: "Verify ID",
            patch: { idVerificationStatus: "id_verified" },
            tone: "success",
        });
    } else if (entry.idVerificationStatus === "id_rejected") {
        actions.push({
            key: "id_requested_retry",
            label: "Request new upload",
            patch: { idVerificationStatus: "id_requested" },
            tone: "warn",
        });
    }

    if (entry.readyForApproval) {
        actions.push({
            key: "creator_approved",
            label: "Approve",
            patch: { approvalStatus: "creator_approved" },
            tone: "success",
        });
    } else if (entry.approvalStatus === "creator_pending") {
        actions.push({
            key: "creator_needs_changes",
            label: "Request changes",
            patch: { approvalStatus: "creator_needs_changes" },
            tone: "warn",
        });
    } else if (entry.approvalStatus === "creator_needs_changes" || entry.approvalStatus === "creator_rejected") {
        actions.push({
            key: "creator_pending",
            label: "Resume review",
            patch: { approvalStatus: "creator_pending" },
            tone: "accent",
        });
    }

    return actions.slice(0, 3);
}

function buildSummaryCards(summary: RosterSummary | null) {
    return [
        { key: "reviewQueueCount", label: "Review lane", value: summary?.reviewQueueCount ?? 0, detail: "Awaiting admin action" },
        { key: "readyForApprovalCount", label: "Ready now", value: summary?.readyForApprovalCount ?? 0, detail: "Clear to approve" },
        { key: "waitingOnIdCount", label: "Waiting on ID", value: summary?.waitingOnIdCount ?? 0, detail: "Request, upload, or review" },
        { key: "waitingOnLegalCount", label: "Waiting on legal", value: summary?.waitingOnLegalCount ?? 0, detail: "Still blocked on signatures" },
        { key: "needsChangesCount", label: "Needs changes", value: summary?.needsChangesCount ?? 0, detail: "Returned for fixes" },
        { key: "creatorCount", label: "Live creators", value: summary?.creatorCount ?? 0, detail: "Currently active in roster" },
    ];
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
    const [expandedQueueId, setExpandedQueueId] = useState<string | null>(null);
    const [documentPreview, setDocumentPreview] = useState<DocumentPreviewState | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [queueActionKey, setQueueActionKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isAdmin = userProfile?.role === "admin";
    const trimmedSearchTerm = searchTerm.trim();

    const refreshRoster = useCallback(async (options?: {
        keepLoading?: boolean;
        includeSearch?: boolean;
        searchOverride?: string;
    }) => {
        const includeSearch = options?.includeSearch !== false;
        const searchValue = options?.searchOverride ?? trimmedSearchTerm;
        const shouldQuerySearch = includeSearch && searchValue.length >= SEARCH_MIN_LENGTH;

        if (!options?.keepLoading) {
            setRefreshing(true);
        }

        try {
            setError(null);
            const [baseResult, searchResult] = await Promise.all([
                fetchRoster(),
                shouldQuerySearch ? fetchRoster(searchValue) : Promise.resolve<RosterResponse>({ searchResults: [] }),
            ]);
            setRosterUsers(baseResult.rosterUsers || []);
            setCreatorReviewQueue(baseResult.creatorReviewQueue || []);
            setSummary(baseResult.summary || null);
            setCreatorOpsByUser(baseResult.creatorOpsByUser || {});
            setSearchResults(searchResult.searchResults || []);
        } catch (refreshError) {
            setError(refreshError instanceof Error ? refreshError.message : "Unable to load creator roster right now.");
            setRosterUsers([]);
            setCreatorReviewQueue([]);
            setSummary(null);
            setCreatorOpsByUser({});
            setSearchResults([]);
        } finally {
            if (!options?.keepLoading) {
                setRefreshing(false);
            }
        }
    }, [trimmedSearchTerm]);

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
                if (!cancelled) {
                    setRosterUsers([]);
                    setCreatorReviewQueue([]);
                    setSummary(null);
                    setCreatorOpsByUser({});
                    setError(loadError instanceof Error ? loadError.message : "Unable to load creator roster right now.");
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
        if (authLoading || !isAdmin || loading) {
            return;
        }

        const intervalId = window.setInterval(() => {
            void refreshRoster({ includeSearch: false });
        }, 15_000);

        const handleFocus = () => {
            void refreshRoster({ includeSearch: false });
        };
        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                void refreshRoster({ includeSearch: false });
            }
        };

        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [authLoading, isAdmin, loading, refreshRoster]);

    useEffect(() => {
        if (authLoading || !isAdmin) {
            return;
        }

        if (trimmedSearchTerm.length < SEARCH_MIN_LENGTH) {
            setSearchResults([]);
            setSearchLoading(false);
            return;
        }

        let cancelled = false;
        const timeoutId = window.setTimeout(async () => {
            try {
                setSearchLoading(true);
                const result = await fetchRoster(trimmedSearchTerm);
                if (!cancelled) {
                    setSearchResults(result.searchResults || []);
                }
            } catch {
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
    }, [authLoading, isAdmin, trimmedSearchTerm]);

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
    const summaryCards = useMemo(() => buildSummaryCards(summary), [summary]);

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

            await refreshRoster({ includeSearch: true });
            if (selectedCandidate?.uid === entry.uid) {
                setSelectedCandidate(null);
                setSearchTerm("");
                setSearchResults([]);
            }
            toast.success(`Role updated to ${role}`);
        } catch (updateError) {
            toast.error(updateError instanceof Error ? updateError.message : "Could not update role.");
        }
    };

    const handleQueuePatch = async (entry: CreatorReviewQueueEntry, patch: QueuePatch, successMessage: string, actionKey: string) => {
        try {
            setQueueActionKey(actionKey);
            const response = await authFetch("/api/admin/users", {
                method: "PUT",
                body: JSON.stringify({
                    userId: entry.uid,
                    updates: {
                        creatorApplication: patch,
                    },
                }),
            });
            const result = await response.json().catch(() => ({})) as { error?: string };
            if (!response.ok) {
                throw new Error(typeof result.error === "string" ? result.error : "Failed to update creator intake.");
            }

            await refreshRoster({ includeSearch: true });
            toast.success(successMessage);
        } catch (actionError) {
            toast.error(actionError instanceof Error ? actionError.message : "Failed to update creator intake.");
        } finally {
            setQueueActionKey(null);
        }
    };

    const openIdPreview = (entry: CreatorReviewQueueEntry, side: "front" | "back") => {
        const fileName = side === "front" ? entry.idDocumentFrontFileName : entry.idDocumentBackFileName;
        const contentType = side === "front" ? entry.idDocumentFrontContentType : entry.idDocumentBackContentType;
        if (!fileName) {
            toast.error(`No ${side} ID file has been uploaded yet.`);
            return;
        }

        setDocumentPreview({
            title: `${entry.creatorDisplayName} · ${side === "front" ? "Front of ID" : "Back of ID"}`,
            href: buildAdminIdDocumentHref(entry.uid, side),
            contentType,
            fileName,
        });
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
        <div className="space-y-5 pb-12">
            <DocumentPreviewModal preview={documentPreview} onClose={() => setDocumentPreview(null)} />
            <PageViewEvent eventName="admin_roster_viewed" />
            <AdminPageHeader
                eyebrow="Admin Roster"
                title="Creator Intake + Live Roster"
                subtitle="Review new creator submissions, inspect documents, clear blockers, and keep live creator accounts manageable without leaving the roster."
                actions={
                    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                        <div className="relative w-full sm:max-w-[24rem]">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Search signed-up users"
                                className="w-full rounded-2xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-4 text-sm text-white focus:border-brand-purple focus:outline-none"
                            />

                            {trimmedSearchTerm.length >= SEARCH_MIN_LENGTH ? (
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
                                                <Avatar entry={entry} compact />
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

                        <button
                            type="button"
                            onClick={() => void refreshRoster({ includeSearch: true })}
                            disabled={refreshing}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:border-white/20 hover:text-white disabled:opacity-60"
                        >
                            <RefreshCw className={cn("h-4 w-4", refreshing ? "animate-spin" : "")} />
                            Refresh
                        </button>
                    </div>
                }
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                {summaryCards.map((card) => (
                    <div key={card.key} className="glass-panel rounded-[1.55rem] border border-white/10 px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">{card.label}</p>
                        <p className="mt-2 text-2xl font-black text-white">{card.value}</p>
                        <p className="mt-1 text-xs text-gray-400">{card.detail}</p>
                    </div>
                ))}
            </div>

            {selectedCandidate ? (
                <div className="glass-panel rounded-[1.8rem] border border-brand-purple/20 p-4">
                    <div className="flex items-start gap-3">
                        <Avatar entry={selectedCandidate} compact />
                        <div className="min-w-0 flex-1">
                            <div className="inline-flex items-center gap-2 rounded-full border border-brand-purple/25 bg-brand-purple/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                                <UserPlus2 className="h-3.5 w-3.5" />
                                Search result
                            </div>
                            <h3 className="mt-3 truncate text-base font-bold text-white">{selectedCandidate.displayName}</h3>
                            <p className="truncate text-sm text-gray-400">{selectedCandidate.username ? `@${selectedCandidate.username}` : selectedCandidate.email || selectedCandidate.uid}</p>
                            <p className="mt-2 text-sm leading-6 text-gray-300">
                                Use direct creator promotion only for one-off exceptions. Most creator accounts should stay in the review queue below so legal, ID, and approval steps remain visible.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => void handleRoleUpdate(selectedCandidate, "creator")}
                                    className="rounded-2xl border border-brand-purple/30 bg-brand-purple/15 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-brand-purple/20"
                                >
                                    Promote directly
                                </button>
                                <Link
                                    href={`/admin/user/${selectedCandidate.uid}`}
                                    className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-200 transition-colors hover:border-white/20 hover:text-white"
                                >
                                    Open user detail
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="rounded-[2rem] border border-white/10 bg-black/20 p-4 md:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Creator review queue</p>
                        <h3 className="mt-2 text-lg font-bold text-white">Review, documents, and approval in one lane</h3>
                        <p className="mt-1 text-sm text-gray-400">Handle legal, ID, and approval steps here first, then open the full detail page only when you need deeper account context.</p>
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
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                            {creatorReviewQueue.length} open
                        </span>
                    </div>
                </div>

                <div className="mt-4 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
                    {QUEUE_FILTER_OPTIONS.map((option) => (
                        <button
                            key={option.key}
                            type="button"
                            onClick={() => setQueueFilter(option.key)}
                            className={cn(
                                "snap-start whitespace-nowrap rounded-full border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors",
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
                    <div className="mt-4 space-y-3">
                        {filteredQueue.map((entry) => {
                            const isExpanded = expandedQueueId === entry.uid;
                            const quickActions = buildQueueQuickActions(entry);
                            const queueTone = getQueueTone(entry);

                            return (
                                <article
                                    key={entry.uid}
                                    className={cn(
                                        "glass-panel rounded-[1.6rem] border p-4 transition-colors",
                                        queueTone === "danger"
                                            ? "border-red-500/20"
                                            : queueTone === "success"
                                                ? "border-emerald-400/20"
                                                : queueTone === "warn"
                                                    ? "border-amber-400/20"
                                                    : "border-brand-purple/20",
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <Avatar entry={entry} compact />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <Link href={`/admin/user/${entry.uid}`} className="inline-flex max-w-full items-center gap-1 truncate text-sm font-black text-white transition-colors hover:text-brand-purple">
                                                        <span className="truncate">{entry.creatorDisplayName}</span>
                                                        {entry.isVerified ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand-purple" /> : null}
                                                    </Link>
                                                    <p className="truncate text-[11px] text-gray-500">
                                                        {entry.displayName !== entry.creatorDisplayName ? `${entry.displayName} · ` : ""}
                                                        {entry.username ? `@${entry.username}` : entry.email || entry.uid}
                                                    </p>
                                                </div>
                                                <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]", getStatusChipClasses(queueTone))}>
                                                    {formatQueueBucketLabel(entry.queueBucket)}
                                                </span>
                                            </div>

                                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-400">
                                                <span className="inline-flex items-center gap-1">
                                                    <Clock3 className="h-3.5 w-3.5 text-gray-500" />
                                                    Review lane item
                                                </span>
                                                <span>Submitted {formatRelativeTime(entry.submittedAt)}</span>
                                                <span>Updated {formatRelativeTime(entry.updatedAt)}</span>
                                            </div>

                                            {entry.creatorPrimaryPlatform || entry.creatorContentFocus ? (
                                                <p className="mt-2 line-clamp-1 text-xs text-gray-400">
                                                    {[entry.creatorPrimaryPlatform, entry.creatorContentFocus].filter(Boolean).join(" · ")}
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]", getStatusChipClasses(getStatusTone(entry.approvalStatus)))}>
                                            Approval {formatStatusLabel(entry.approvalStatus)}
                                        </span>
                                        <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]", getStatusChipClasses(getStatusTone(entry.legalStatus)))}>
                                            Legal {formatStatusLabel(entry.legalStatus)}
                                        </span>
                                        <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]", getStatusChipClasses(getStatusTone(entry.idVerificationStatus)))}>
                                            ID {formatStatusLabel(entry.idVerificationStatus)}
                                        </span>
                                        <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]", getStatusChipClasses(getStatusTone(entry.segmentationStatus)))}>
                                            Segment {entry.segmentLabel || formatStatusLabel(entry.segmentationStatus)}
                                        </span>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Link
                                            href={`/admin/user/${entry.uid}`}
                                            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-200 transition-colors hover:border-white/20 hover:text-white"
                                        >
                                            Full review
                                        </Link>
                                        {entry.legalDocumentUrl ? (
                                            <a
                                                href={entry.legalDocumentUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-200 transition-colors hover:border-white/20 hover:text-white"
                                            >
                                                <FileText className="h-3.5 w-3.5" />
                                                Legal link
                                            </a>
                                        ) : null}
                                        {quickActions.map((action) => {
                                            const buttonKey = `${entry.uid}:${action.key}`;
                                            return (
                                                <button
                                                    key={buttonKey}
                                                    type="button"
                                                    onClick={() => void handleQueuePatch(entry, action.patch, `${action.label} saved.`, buttonKey)}
                                                    disabled={queueActionKey === buttonKey}
                                                    className={cn(
                                                        "rounded-2xl border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors disabled:opacity-60",
                                                        getStatusChipClasses(action.tone),
                                                    )}
                                                >
                                                    {queueActionKey === buttonKey ? "Saving..." : action.label}
                                                </button>
                                            );
                                        })}
                                        <button
                                            type="button"
                                            onClick={() => setExpandedQueueId(isExpanded ? null : entry.uid)}
                                            className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-300 transition-colors hover:border-white/20 hover:text-white"
                                        >
                                            {isExpanded ? "Hide review panel" : "Open review panel"}
                                        </button>
                                    </div>

                                    {isExpanded ? (
                                        <div className="mt-3 grid gap-3 rounded-[1.3rem] border border-white/10 bg-black/25 p-3 text-sm text-gray-300 md:grid-cols-[0.95fr_1.05fr]">
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Active blockers</p>
                                                {entry.blockingReasons.length > 0 ? (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {entry.blockingReasons.map((reason) => (
                                                            <span key={`${entry.uid}-${reason}`} className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200">
                                                                {formatStatusLabel(reason)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="mt-2 text-sm text-emerald-200">No blockers are currently recorded.</p>
                                                )}

                                                <div className="rounded-[1.1rem] border border-white/10 bg-black/20 p-3">
                                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Review notes</p>
                                                    <p className="mt-2 text-sm text-gray-300">{entry.adminNotes || "No review notes are stored yet."}</p>
                                                    <div className="mt-3 text-xs text-gray-500">
                                                        <p>{entry.readyForApproval ? "All review requirements are complete and this application can be approved." : "Keep clearing the missing steps above until the creator is ready for approval."}</p>
                                                        {entry.reviewedBy ? <p className="mt-1">Last reviewed by {entry.reviewedBy}.</p> : null}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="rounded-[1.1rem] border border-white/10 bg-black/20 p-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Documents</p>
                                                            <p className="mt-2 text-sm text-gray-300">
                                                                {entry.idDocumentCount > 0
                                                                    ? `${entry.idDocumentCount}/2 ID files received`
                                                                    : "No ID files uploaded yet"}
                                                            </p>
                                                        </div>
                                                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                                                            Safe review
                                                        </span>
                                                    </div>

                                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => openIdPreview(entry, "front")}
                                                            disabled={!entry.idDocumentFrontFileName}
                                                            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-gray-200 transition-colors hover:border-white/20 hover:text-white disabled:opacity-45"
                                                        >
                                                            <span className="block">Front of ID</span>
                                                            <span className="mt-1 block normal-case tracking-normal text-gray-400">
                                                                {entry.idDocumentFrontFileName || "Not uploaded"}
                                                            </span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => openIdPreview(entry, "back")}
                                                            disabled={!entry.idDocumentBackFileName}
                                                            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-gray-200 transition-colors hover:border-white/20 hover:text-white disabled:opacity-45"
                                                        >
                                                            <span className="block">Back of ID</span>
                                                            <span className="mt-1 block normal-case tracking-normal text-gray-400">
                                                                {entry.idDocumentBackFileName || "Not uploaded"}
                                                            </span>
                                                        </button>
                                                    </div>

                                                    {entry.legalDocumentUrl ? (
                                                        <a
                                                            href={entry.legalDocumentUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="mt-3 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-200 transition-colors hover:border-white/20 hover:text-white"
                                                        >
                                                            Open legal document
                                                        </a>
                                                    ) : (
                                                        <p className="mt-3 text-xs text-gray-500">No legal document link is attached yet.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>

            {primaryAdmin ? (
                <div className="glass-panel rounded-[1.8rem] border border-red-500/20 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-3">
                            <Avatar entry={primaryAdmin} compact />
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-red-200">
                                    <ShieldUser className="h-3.5 w-3.5" />
                                    Primary admin record
                                </div>
                                <h3 className="mt-3 text-base font-bold text-white">{primaryAdmin.displayName}</h3>
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
                        <h3 className="mt-2 text-lg font-bold text-white">Live creator accounts</h3>
                        <p className="mt-1 text-sm text-gray-400">Use this section for active creator accounts, then jump into the full user detail page for payouts, moderation, or deeper creator operations.</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
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
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {creators.map((entry) => {
                            const ops = creatorOpsByUser[entry.uid];

                            return (
                                <div key={entry.uid} className="glass-panel rounded-[1.6rem] border border-brand-purple/15 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar entry={entry} compact />
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

                                    <div className="mt-3 flex flex-wrap gap-2">
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

                                    <div className="mt-3 grid grid-cols-2 gap-2">
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

                                    <div className="mt-3 grid grid-cols-2 gap-2">
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

