"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    ChevronRight,
    PlusCircle,
} from "lucide-react";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import {
    CREATOR_CONTRACT_SUMMARY_BULLETS,
    CREATOR_INTRO_CREATOR_BULLETS,
    CREATOR_INTRO_FAN_BULLETS,
    CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS,
    DEFAULT_CREATOR_TEMPLATE_LABEL,
} from "@/lib/creator-contract";
import {
    describeCreatorOnboardingBlockingReason,
    getCreatorOnboardingStatusSummary,
    type CreatorContractDocumentStatus,
    type CreatorContractSignatureStatus,
    type CreatorOnboardingApprovalStatus,
    type CreatorOnboardingBlockingReason,
    type CreatorOnboardingCanonicalRecord,
    type CreatorOnboardingHistoryEntry,
    type CreatorOnboardingIdStatus,
    type CreatorOnboardingLegalStatus,
    type CreatorOnboardingSubmissionStatus,
} from "@/lib/creator-onboarding";
import { PRIMARY_CREATOR_OWNER_EMAIL } from "@/lib/creator-admin";
import { useAuth } from "@/context/AuthContext";
import { trackEvent } from "@/lib/telemetry";

type RosterTab = "intake" | "live" | "create";

type CreatorReviewQueueEntry = {
    uid: string;
    displayName: string;
    email: string;
    role: "user" | "creator" | "admin";
    creatorDisplayName: string;
    creatorPrimaryPlatform?: string;
    creatorContentFocus?: string;
    queueBucket: string;
    submissionStatus: CreatorOnboardingSubmissionStatus;
    approvalStatus: CreatorOnboardingApprovalStatus;
    legalStatus: CreatorOnboardingLegalStatus;
    idVerificationStatus: CreatorOnboardingIdStatus;
    contractDocumentStatus: CreatorContractDocumentStatus;
    creatorSignatureStatus: CreatorContractSignatureStatus;
    adminSignatureStatus: CreatorContractSignatureStatus;
    blockingReasons: CreatorOnboardingBlockingReason[];
    readyForApproval: boolean;
    ownerOverrideActive?: boolean;
    introAcknowledgedAt?: number;
    submittedAt: number;
    updatedAt: number;
    idDocumentCount: number;
    creatorTemplateLabel?: string;
    kycDueAt?: number;
    reapplyAvailableAt?: number;
    adminNotes?: string;
    idDocumentFrontFileName?: string;
    idDocumentBackFileName?: string;
    idDocumentFaceFileName?: string;
    idDocumentVideoFileName?: string;
};

type RosterUser = {
    uid: string;
    displayName: string;
    email: string;
    username: string;
    role: "user" | "creator" | "admin";
    status: "active" | "suspended" | "banned";
    isVerified: boolean;
};

type CreatorRosterResponse = {
    success: boolean;
    rosterUsers: RosterUser[];
    creatorReviewQueue: CreatorReviewQueueEntry[];
    summary: {
        creatorCount: number;
        reviewQueueCount: number;
        readyForApprovalCount: number;
        waitingOnIdCount: number;
        waitingOnLegalCount: number;
        needsChangesCount: number;
        rejectedCount: number;
    };
};

type CreatorDetailResponse = {
    success: boolean;
    user: {
        uid: string;
        displayName: string;
        role: "user" | "creator" | "admin";
        creatorApplication?: CreatorOnboardingCanonicalRecord | null;
    };
    creatorOnboardingCanonical?: CreatorOnboardingCanonicalRecord | null;
    creatorOnboardingHistory?: CreatorOnboardingHistoryEntry[];
};

type CreateCreatorFormState = {
    displayName: string;
    email: string;
    handle: string;
    platform: string;
    contentType: string;
    password: string;
    creatorPath: "intake" | "live_override";
    compliancePath: "required" | "bypass";
    ownerOverrideReason: string;
};

const DEFAULT_CREATE_CREATOR_FORM: CreateCreatorFormState = {
    displayName: "",
    email: "",
    handle: "",
    platform: "",
    contentType: "",
    password: "",
    creatorPath: "intake",
    compliancePath: "required",
    ownerOverrideReason: "",
};

function formatTimestamp(value: number | undefined) {
    if (!value || !Number.isFinite(value)) {
        return "Not recorded";
    }

    return new Date(value).toLocaleString();
}

function buildHistoryLabel(entry: CreatorOnboardingHistoryEntry) {
    return `${entry.summary} - ${formatTimestamp(entry.timestamp)}`;
}

function countRealBlockers(entry: CreatorReviewQueueEntry) {
    return entry.blockingReasons.length;
}

function buildStage(entry: CreatorReviewQueueEntry) {
    return getCreatorOnboardingStatusSummary(entry).stage;
}

function buildPrimaryActionLabel(entry: CreatorReviewQueueEntry) {
    if (!entry.introAcknowledgedAt) {
        return "Waiting on intro";
    }
    if (entry.idVerificationStatus === "id_not_requested" || entry.idVerificationStatus === "id_rejected") {
        return "Request ID";
    }
    if (entry.contractDocumentStatus !== "contract_sent") {
        return "Send contract";
    }
    if (entry.creatorSignatureStatus === "signature_signed" && entry.adminSignatureStatus !== "signature_signed") {
        return "Countersign";
    }
    if (entry.readyForApproval || entry.ownerOverrideActive) {
        return "Approve";
    }

    return "Open intake";
}

export default function AdminRosterPage() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const [tab, setTab] = useState<RosterTab>("intake");
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [roster, setRoster] = useState<CreatorRosterResponse | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [detail, setDetail] = useState<CreatorDetailResponse | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [ownerOverrideReason, setOwnerOverrideReason] = useState("");
    const [createCreatorForm, setCreateCreatorForm] = useState<CreateCreatorFormState>(DEFAULT_CREATE_CREATOR_FORM);

    const isOwner = user?.email?.toLowerCase() === PRIMARY_CREATOR_OWNER_EMAIL;
    const focusUserId = searchParams.get("focus");

    const intakeEntries = roster?.creatorReviewQueue ?? [];
    const liveCreators = (roster?.rosterUsers ?? []).filter((entry) => entry.role === "creator");
    const selectedEntry = intakeEntries.find((entry) => entry.uid === selectedUserId) ?? null;
    const selectedCanonical = detail?.creatorOnboardingCanonical ?? null;
    const selectedCreatorApplication = detail?.user.creatorApplication ?? null;
    const selectedHistory = detail?.creatorOnboardingHistory ?? [];

    useEffect(() => {
        let cancelled = false;

        async function loadRoster() {
            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (query.trim().length >= 2) {
                    params.set("q", query.trim());
                }
                const response = await authFetch(`/api/admin/roster${params.size ? `?${params}` : ""}`);
                const result = await response.json() as CreatorRosterResponse & { error?: string };
                if (!response.ok || !result.success) {
                    throw new Error(result.error || "Failed to load creator roster.");
                }
                if (!cancelled) {
                    setRoster(result);
                    if (focusUserId && !selectedUserId) {
                        setSelectedUserId(focusUserId);
                    }
                }
            } catch (error) {
                reportClientIssue({
                    channel: "ui",
                    severity: "error",
                    message: "Admin creator roster failed to load",
                    error,
                    detail: {
                        adminView: "creator_roster",
                    },
                    consoleLabel: "[Admin Roster] load failed",
                });
                if (!cancelled) {
                    toast.error(error instanceof Error ? error.message : "Failed to load creator roster.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadRoster();
        return () => {
            cancelled = true;
        };
    }, [focusUserId, query, selectedUserId]);

    useEffect(() => {
        if (!selectedUserId) {
            setDetail(null);
            return;
        }

        let cancelled = false;

        async function loadDetail() {
            try {
                setDetailLoading(true);
                const response = await authFetch(`/api/admin/user/${selectedUserId}`);
                const result = await response.json() as CreatorDetailResponse & { error?: string };
                if (!response.ok || !result.success) {
                    throw new Error(result.error || "Failed to load creator intake detail.");
                }
                if (!cancelled) {
                    setDetail(result);
                    setOwnerOverrideReason(result.creatorOnboardingCanonical?.ownerOverrideReason || "");
                }
            } catch (error) {
                reportClientIssue({
                    channel: "ui",
                    severity: "error",
                    message: "Admin creator intake detail failed to load",
                    error,
                    detail: {
                        adminView: "creator_roster_detail",
                        userId: selectedUserId,
                    },
                    consoleLabel: "[Admin Roster] detail load failed",
                });
                if (!cancelled) {
                    toast.error(error instanceof Error ? error.message : "Failed to load creator intake detail.");
                }
            } finally {
                if (!cancelled) {
                    setDetailLoading(false);
                }
            }
        }

        void loadDetail();
        return () => {
            cancelled = true;
        };
    }, [selectedUserId]);

    const refreshSelectedDetail = async () => {
        if (!selectedUserId) {
            return;
        }

        const response = await authFetch(`/api/admin/user/${selectedUserId}`);
        const result = await response.json() as CreatorDetailResponse & { error?: string };
        if (!response.ok || !result.success) {
            throw new Error(result.error || "Failed to refresh creator intake detail.");
        }
        setDetail(result);
        setOwnerOverrideReason(result.creatorOnboardingCanonical?.ownerOverrideReason || "");
    };

    const refreshRoster = async () => {
        const params = new URLSearchParams();
        if (query.trim().length >= 2) {
            params.set("q", query.trim());
        }
        const response = await authFetch(`/api/admin/roster${params.size ? `?${params}` : ""}`);
        const result = await response.json() as CreatorRosterResponse & { error?: string };
        if (!response.ok || !result.success) {
            throw new Error(result.error || "Failed to refresh creator roster.");
        }
        setRoster(result);
    };

    const submitCreatorUpdate = async (
        actionKey: string,
        patch: Record<string, unknown>,
        extraUpdates?: Record<string, unknown>,
    ) => {
        if (!selectedUserId || !selectedCreatorApplication) {
            return;
        }

        try {
            setSaving(actionKey);
            const response = await authFetch("/api/admin/users", {
                method: "PUT",
                body: JSON.stringify({
                    userId: selectedUserId,
                    updates: {
                        ...extraUpdates,
                        creatorApplication: {
                            ...selectedCreatorApplication,
                            ...patch,
                        },
                    },
                }),
            });
            const result = await response.json().catch(() => ({})) as { error?: string };
            if (!response.ok) {
                throw new Error(result.error || "Failed to update creator intake.");
            }
            await Promise.all([refreshRoster(), refreshSelectedDetail()]);
            const performedAs = Object.prototype.hasOwnProperty.call(patch, "ownerOverrideActive")
                ? "owner_override"
                : "admin_on_behalf";
            const occurredAt = new Date().toISOString();
            trackEvent("creator_application_review_saved", {
                creator_user_id: selectedUserId,
                review_action: actionKey,
                actorType: isOwner ? "owner_admin" : "admin",
                actorUid: user?.uid ?? "",
                actorEmail: user?.email ?? "",
                actorRole: isOwner ? "owner_admin" : "admin",
                targetUserId: selectedUserId,
                targetCreatorId: selectedUserId,
                performedAs,
                surface: "admin_roster",
                route: "/admin/roster",
                actionKey,
                occurredAt,
                dedupeKey: `admin_roster:${actionKey}:${selectedUserId}:${occurredAt.slice(0, 19)}`,
                source: "admin_roster_client",
            });
            toast.success("Creator intake updated.");
        } catch (error) {
            reportClientIssue({
                channel: "ui",
                severity: "error",
                message: "Admin creator intake update failed",
                error,
                detail: {
                    adminView: "creator_roster",
                    action: actionKey,
                    userId: selectedUserId,
                },
                consoleLabel: "[Admin Roster] update failed",
            });
            toast.error(error instanceof Error ? error.message : "Failed to update creator intake.");
        } finally {
            setSaving(null);
        }
    };

    const handleCreateCreator = async () => {
        try {
            setCreating(true);
            const creatorPath = isOwner ? createCreatorForm.creatorPath : "intake";
            const compliancePath = isOwner ? createCreatorForm.compliancePath : "required";
            const response = await authFetch("/api/admin/roster", {
                method: "POST",
                body: JSON.stringify({
                    ...createCreatorForm,
                    creatorPath,
                    compliancePath,
                    ownerOverrideReason: creatorPath === "live_override" ? createCreatorForm.ownerOverrideReason : "",
                }),
            });
            const result = await response.json().catch(() => ({})) as { error?: string; userId?: string };
            if (!response.ok || !result.userId) {
                throw new Error(result.error || "Failed to create creator.");
            }

            await refreshRoster();
            setSelectedUserId(result.userId);
            setTab(creatorPath === "live_override" ? "live" : "intake");
            setCreateCreatorForm(DEFAULT_CREATE_CREATOR_FORM);
            toast.success("Creator account created.");
        } catch (error) {
            reportClientIssue({
                channel: "ui",
                severity: "error",
                message: "Direct creator creation failed",
                error,
                detail: {
                    adminView: "creator_roster_create",
                },
                consoleLabel: "[Admin Roster] direct create failed",
            });
            toast.error(error instanceof Error ? error.message : "Failed to create creator.");
        } finally {
            setCreating(false);
        }
    };

    return (
        <main className="min-h-screen bg-black px-4 pb-24 pt-24 text-white sm:px-6">
            <PageViewEvent eventName="admin_roster_viewed" eventParams={{ component_name: "admin_roster_page" }} />
            <div className="mx-auto max-w-7xl">
                <AdminPageHeader
                    eyebrow="Creator Operations"
                    title="Creator intake and live roster"
                    subtitle="Approve, return, reject, or override creators in one focused roster."
                    compact
                    actions={(
                        <>
                            <button type="button" onClick={() => setTab("intake")} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "intake" ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white"}`}>Intake</button>
                            <button type="button" onClick={() => setTab("live")} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "live" ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white"}`}>Live creators</button>
                            <button type="button" onClick={() => setTab("create")} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "create" ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white"}`}>Create creator</button>
                        </>
                    )}
                />
                <section className="grid gap-4 lg:grid-cols-[0.94fr_1.06fr]">
                    <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            <div className="rounded-[1.6rem] border border-white/10 bg-zinc-950/70 p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Intake queue</p>
                                <p className="mt-2 text-3xl font-black text-white">{roster?.summary.reviewQueueCount ?? 0}</p>
                                <p className="mt-1 text-xs text-gray-400">{roster?.summary.readyForApprovalCount ?? 0} ready for approval</p>
                            </div>
                            <div className="rounded-[1.6rem] border border-white/10 bg-zinc-950/70 p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Waiting on ID</p>
                                <p className="mt-2 text-3xl font-black text-white">{roster?.summary.waitingOnIdCount ?? 0}</p>
                                <p className="mt-1 text-xs text-gray-400">{roster?.summary.waitingOnLegalCount ?? 0} waiting on legal</p>
                            </div>
                            <div className="rounded-[1.6rem] border border-white/10 bg-zinc-950/70 p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Live creators</p>
                                <p className="mt-2 text-3xl font-black text-white">{roster?.summary.creatorCount ?? 0}</p>
                                <p className="mt-1 text-xs text-gray-400">{roster?.summary.needsChangesCount ?? 0} returned, {roster?.summary.rejectedCount ?? 0} rejected</p>
                            </div>
                        </div>

                        {tab !== "create" ? (
                            <div className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h2 className="text-lg font-black text-white">{tab === "intake" ? "Creator intake" : "Live creator roster"}</h2>
                                        <p className="mt-1 text-sm leading-6 text-gray-400">
                                            {tab === "intake"
                                                ? "Each intake row shows the current stage, blocker count, and primary next action."
                                                : "Approved creators stay separate from intake and open into the same creator record."}
                                        </p>
                                    </div>
                                    <input
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                        placeholder="Search name or email"
                                        className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none sm:max-w-xs"
                                    />
                                </div>

                                {loading ? (
                                    <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-black/30 px-4 py-6 text-sm text-gray-400">Loading creator roster...</div>
                                ) : tab === "intake" ? (
                                    <div className="mt-4 space-y-3">
                                        {intakeEntries.length === 0 ? (
                                            <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/30 px-4 py-6 text-sm text-gray-400">
                                                No creator intake records match this view right now.
                                            </div>
                                        ) : intakeEntries.map((entry) => (
                                            <button
                                                key={entry.uid}
                                                type="button"
                                                onClick={() => setSelectedUserId(entry.uid)}
                                                className={`w-full rounded-[1.5rem] border p-4 text-left transition-colors ${selectedUserId === entry.uid ? "border-brand-purple/40 bg-brand-purple/10" : "border-white/10 bg-black/25 hover:border-white/20"}`}
                                            >
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                    <div>
                                                        <p className="text-base font-bold text-white">{entry.creatorDisplayName}</p>
                                                        <p className="mt-1 text-sm text-gray-400">{buildStage(entry)} - {entry.email}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-semibold text-gray-200">
                                                            {countRealBlockers(entry)} blockers
                                                        </span>
                                                        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-black">
                                                            {buildPrimaryActionLabel(entry)}
                                                            <ChevronRight className="h-3.5 w-3.5" />
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-4 space-y-3">
                                        {liveCreators.length === 0 ? (
                                            <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/30 px-4 py-6 text-sm text-gray-400">
                                                No approved creators are live yet.
                                            </div>
                                        ) : liveCreators.map((entry) => (
                                            <div key={entry.uid} className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                    <div>
                                                        <p className="text-base font-bold text-white">{entry.displayName}</p>
                                                        <p className="mt-1 text-sm text-gray-400">@{entry.username || "creator"} - {entry.email}</p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedUserId(entry.uid)}
                                                            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white"
                                                        >
                                                            Open creator record
                                                        </button>
                                                        <Link
                                                            href={`/admin/user/${entry.uid}`}
                                                            className="rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm font-semibold text-gray-200"
                                                        >
                                                            Open user
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-4">
                                <div className="flex items-center gap-2 text-lg font-black text-white">
                                    <PlusCircle className="h-5 w-5 text-brand-purple" />
                                    Create creator
                                </div>
                                <p className="mt-2 text-sm leading-6 text-gray-400">
                                    Direct creation supports either a draft intake shell or a live creator path with owner-controlled compliance bypass.
                                </p>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <input value={createCreatorForm.displayName} onChange={(event) => setCreateCreatorForm((current) => ({ ...current, displayName: event.target.value }))} placeholder="Name" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none" />
                                    <input value={createCreatorForm.email} onChange={(event) => setCreateCreatorForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none" />
                                    <input value={createCreatorForm.handle} onChange={(event) => setCreateCreatorForm((current) => ({ ...current, handle: event.target.value }))} placeholder="Handle" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none" />
                                    <input value={createCreatorForm.platform} onChange={(event) => setCreateCreatorForm((current) => ({ ...current, platform: event.target.value }))} placeholder="Platform" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none" />
                                    <input value={createCreatorForm.contentType} onChange={(event) => setCreateCreatorForm((current) => ({ ...current, contentType: event.target.value }))} placeholder="Content type" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none" />
                                    <input value={createCreatorForm.password} onChange={(event) => setCreateCreatorForm((current) => ({ ...current, password: event.target.value }))} placeholder="Password" type="password" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none" />
                                    <label className="space-y-2">
                                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Creator path</span>
                                        <select value={createCreatorForm.creatorPath} onChange={(event) => setCreateCreatorForm((current) => ({ ...current, creatorPath: event.target.value as CreateCreatorFormState["creatorPath"] }))} disabled={!isOwner} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none disabled:opacity-60">
                                            <option value="intake">Draft intake shell</option>
                                            {isOwner ? <option value="live_override">Live creator path</option> : null}
                                        </select>
                                    </label>
                                    <label className="space-y-2">
                                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Compliance path</span>
                                        <select value={createCreatorForm.compliancePath} onChange={(event) => setCreateCreatorForm((current) => ({ ...current, compliancePath: event.target.value as CreateCreatorFormState["compliancePath"] }))} disabled={!isOwner} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none disabled:opacity-60">
                                            <option value="required">Require compliance intake</option>
                                            {isOwner ? <option value="bypass">Bypass compliance intake</option> : null}
                                        </select>
                                    </label>
                                    {createCreatorForm.creatorPath === "live_override" ? (
                                        <textarea
                                            value={createCreatorForm.ownerOverrideReason}
                                            onChange={(event) => setCreateCreatorForm((current) => ({ ...current, ownerOverrideReason: event.target.value }))}
                                            rows={3}
                                            placeholder="Internal owner override reason"
                                            className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none sm:col-span-2"
                                        />
                                    ) : null}
                                </div>
                                {!isOwner ? (
                                    <p className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-xs leading-6 text-amber-100">
                                        Direct creator creation is available to all admins, but live creator path and compliance bypass stay owner-only because they bypass standard onboarding locks.
                                    </p>
                                ) : null}
                                <div className="mt-4 flex justify-end">
                                    <button type="button" onClick={() => void handleCreateCreator()} disabled={creating} className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black disabled:opacity-50">
                                        {creating ? "Creating..." : "Create creator"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-4">
                        {!selectedUserId ? (
                            <div className="flex h-full min-h-[420px] items-center justify-center rounded-[1.4rem] border border-dashed border-white/10 bg-black/25 px-6 text-center text-sm leading-7 text-gray-400">
                                Open an intake record to review one creator at a time. This keeps owner controls available without cluttering every row.
                            </div>
                        ) : detailLoading ? (
                            <div className="flex min-h-[420px] items-center justify-center rounded-[1.4rem] border border-white/10 bg-black/25 px-6 text-sm text-gray-400">
                                Loading creator record...
                            </div>
                        ) : !selectedCanonical ? (
                            <div className="flex min-h-[420px] items-center justify-center rounded-[1.4rem] border border-white/10 bg-black/25 px-6 text-sm text-gray-400">
                                Creator detail is unavailable for this account.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="rounded-[1.5rem] border border-brand-purple/25 bg-brand-purple/10 p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">Focused creator record</p>
                                            <h2 className="mt-2 text-2xl font-black text-white">{selectedCanonical.creatorDisplayName}</h2>
                                            <p className="mt-2 text-sm leading-6 text-gray-200">{getCreatorOnboardingStatusSummary(selectedCanonical).summary}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Link href={`/admin/roster?focus=${selectedUserId}`} className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm font-semibold text-white">
                                                Focus link
                                            </Link>
                                            <Link href={`/admin/user/${selectedUserId}`} className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm font-semibold text-white">
                                                Open user record
                                            </Link>
                                        </div>
                                    </div>
                                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                        <div className="rounded-[1.2rem] border border-white/10 bg-black/25 p-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Stage</p>
                                            <p className="mt-2 text-base font-bold text-white">{getCreatorOnboardingStatusSummary(selectedCanonical).stage}</p>
                                        </div>
                                        <div className="rounded-[1.2rem] border border-white/10 bg-black/25 p-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Verification package</p>
                                            <p className="mt-2 text-base font-bold text-white">{selectedEntry?.idDocumentCount ?? 0} / 4 files</p>
                                        </div>
                                        <div className="rounded-[1.2rem] border border-white/10 bg-black/25 p-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Template</p>
                                            <p className="mt-2 text-base font-bold text-white">{selectedCanonical.creatorTemplateLabel || DEFAULT_CREATOR_TEMPLATE_LABEL}</p>
                                        </div>
                                        <div className="rounded-[1.2rem] border border-white/10 bg-black/25 p-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">KYC due</p>
                                            <p className="mt-2 text-base font-bold text-white">{formatTimestamp(selectedCanonical.kycDueAt)}</p>
                                        </div>
                                        <div className="rounded-[1.2rem] border border-white/10 bg-black/25 p-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Creator signature</p>
                                            <p className="mt-2 text-base font-bold text-white">{selectedCanonical.creatorSignatureStatus.replaceAll("_", " ")}</p>
                                        </div>
                                        <div className="rounded-[1.2rem] border border-white/10 bg-black/25 p-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Admin countersign</p>
                                            <p className="mt-2 text-base font-bold text-white">{selectedCanonical.adminSignatureStatus.replaceAll("_", " ")}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                                    <div className="flex flex-wrap gap-2">
                                        {selectedCanonical.blockingReasons.length === 0 ? (
                                            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">No canonical blockers</span>
                                        ) : selectedCanonical.blockingReasons.map((reason) => {
                                            const detailReason = describeCreatorOnboardingBlockingReason(reason);
                                            return (
                                                <span key={reason} className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-semibold text-gray-200">
                                                    {detailReason.label}
                                                </span>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-3">
                                        {!selectedCanonical.introAcknowledgedAt ? (
                                            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-300">Waiting on creator intro acknowledgment</span>
                                        ) : null}
                                        {(selectedCanonical.idVerificationStatus === "id_not_requested" || selectedCanonical.idVerificationStatus === "id_rejected") ? (
                                            <button type="button" onClick={() => void submitCreatorUpdate("request-id", { idVerificationStatus: "id_requested", kycDueAt: Date.now() + (7 * 24 * 60 * 60 * 1000) })} disabled={saving === "request-id"} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black disabled:opacity-50">Request ID</button>
                                        ) : null}
                                        {selectedCanonical.contractDocumentStatus !== "contract_sent" && selectedCanonical.introAcknowledgedAt ? (
                                            <button type="button" onClick={() => void submitCreatorUpdate("send-contract", { contractDocumentStatus: "contract_sent", legalStatus: "legal_sent" })} disabled={saving === "send-contract"} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black disabled:opacity-50">Send contract</button>
                                        ) : null}
                                        {selectedCanonical.creatorSignatureStatus === "signature_signed" && selectedCanonical.adminSignatureStatus !== "signature_signed" ? (
                                            <button type="button" onClick={() => void submitCreatorUpdate("countersign", { adminSignatureStatus: "signature_signed", legalStatus: "legal_signed" })} disabled={saving === "countersign"} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black disabled:opacity-50">Countersign</button>
                                        ) : null}
                                        {(selectedCanonical.readyForApproval || selectedCanonical.ownerOverrideActive) ? (
                                            <button type="button" onClick={() => void submitCreatorUpdate("approve", { approvalStatus: "creator_approved" })} disabled={saving === "approve"} className="rounded-full bg-gradient-to-r from-brand-purple to-purple-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Approve</button>
                                        ) : null}
                                        <button type="button" onClick={() => void submitCreatorUpdate("return", { approvalStatus: "creator_needs_changes" })} disabled={saving === "return"} className="rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Return for changes</button>
                                        <button type="button" onClick={() => void submitCreatorUpdate("reject", { approvalStatus: "creator_rejected" })} disabled={saving === "reject"} className="rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 disabled:opacity-50">Hard reject</button>
                                    </div>
                                    <p className="mt-3 text-xs leading-6 text-gray-400">
                                        Approval requires creator intro acknowledgment, accepted identity verification, creator signature, and admin countersign unless owner override is explicitly active.
                                    </p>
                                </div>

                                <details className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                                    <summary className="cursor-pointer list-none text-sm font-bold text-white">Verification package and contract detail</summary>
                                    <div className="mt-4 space-y-4">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {[
                                                { label: "Front of ID", side: "front", fileName: selectedEntry?.idDocumentFrontFileName },
                                                { label: "Back of ID", side: "back", fileName: selectedEntry?.idDocumentBackFileName },
                                                { label: "Face with ID", side: "face_with_id", fileName: selectedEntry?.idDocumentFaceFileName },
                                                { label: "Video with ID", side: "video_with_id", fileName: selectedEntry?.idDocumentVideoFileName },
                                            ].map((document) => (
                                                <div key={document.side} className="rounded-[1.15rem] border border-white/10 bg-black/20 p-3">
                                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">{document.label}</p>
                                                    <p className="mt-2 text-sm font-semibold text-white">{document.fileName || "Not uploaded"}</p>
                                                    {document.fileName ? (
                                                        <a href={`/api/admin/user/${selectedUserId}/creator-onboarding/id-document?side=${document.side}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-semibold text-brand-purple">
                                                            Open file
                                                        </a>
                                                    ) : null}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="rounded-[1.15rem] border border-white/10 bg-black/20 p-3">
                                            <p className="text-sm font-semibold text-white">Plain-language agreement summary</p>
                                            <div className="mt-3 space-y-2 text-sm leading-6 text-gray-300">
                                                {CREATOR_CONTRACT_SUMMARY_BULLETS.map((bullet) => <p key={bullet}>- {bullet}</p>)}
                                            </div>
                                        </div>
                                        <div className="rounded-[1.15rem] border border-white/10 bg-black/20 p-3">
                                            <p className="text-sm font-semibold text-white">Full MGSA</p>
                                            <div className="mt-3 space-y-3 text-sm leading-6 text-gray-300">
                                                {CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS.map((section) => (
                                                    <div key={section.heading}>
                                                        <p className="font-semibold text-white">{section.heading}</p>
                                                        <p className="mt-1">{section.body}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </details>

                                <details className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                                    <summary className="cursor-pointer list-none text-sm font-bold text-white">Audit trail and acknowledgments</summary>
                                    <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                                        <div className="space-y-3">
                                            <div className="rounded-[1.15rem] border border-white/10 bg-black/20 p-3">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Creator intro acknowledgment</p>
                                                <div className="mt-2 space-y-2 text-sm leading-6 text-gray-300">
                                                    {CREATOR_INTRO_CREATOR_BULLETS.map((bullet) => <p key={bullet}>- {bullet}</p>)}
                                                </div>
                                            </div>
                                            <div className="rounded-[1.15rem] border border-white/10 bg-black/20 p-3">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Fan explainer</p>
                                                <div className="mt-2 space-y-2 text-sm leading-6 text-gray-300">
                                                    {CREATOR_INTRO_FAN_BULLETS.map((bullet) => <p key={bullet}>- {bullet}</p>)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="rounded-[1.15rem] border border-white/10 bg-black/20 p-3">
                                                <p className="text-sm font-semibold text-white">Milestones</p>
                                                <div className="mt-3 space-y-2 text-sm text-gray-300">
                                                    <p>Submitted - {formatTimestamp(selectedCanonical.submittedAt)}</p>
                                                    <p>Intro acknowledged - {formatTimestamp(selectedCanonical.introAcknowledgedAt)}</p>
                                                    <p>ID requested - {formatTimestamp(selectedCanonical.idVerificationRequestedAt)}</p>
                                                    <p>ID reviewed - {formatTimestamp(selectedCanonical.idVerificationReviewedAt)}</p>
                                                    <p>Creator signed - {formatTimestamp(selectedCanonical.creatorContractSignedAt)}</p>
                                                    <p>Admin countersigned - {formatTimestamp(selectedCanonical.adminContractSignedAt)}</p>
                                                    <p>Last review touch - {formatTimestamp(selectedCanonical.updatedAt)}</p>
                                                </div>
                                            </div>
                                            <div className="rounded-[1.15rem] border border-white/10 bg-black/20 p-3">
                                                <p className="text-sm font-semibold text-white">History</p>
                                                <div className="mt-3 max-h-[260px] space-y-2 overflow-y-auto pr-1 text-sm text-gray-300">
                                                    {selectedHistory.length === 0 ? (
                                                        <p className="text-gray-500">No history records loaded.</p>
                                                    ) : selectedHistory.map((entry) => (
                                                        <div key={`${entry.eventType}-${entry.timestamp}-${entry.actorId}`} className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3">
                                                            <p className="font-semibold text-white">{buildHistoryLabel(entry)}</p>
                                                            {entry.detail ? <p className="mt-1 text-xs leading-6 text-gray-400">{entry.detail}</p> : null}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </details>

                                {isOwner ? (
                                    <details className="rounded-[1.5rem] border border-amber-400/20 bg-amber-400/10 p-4">
                                        <summary className="cursor-pointer list-none text-sm font-bold text-amber-100">Owner override</summary>
                                        <p className="mt-3 text-sm leading-6 text-amber-50">
                                            Owner override can bypass KYC, legal, approval, and role-activation locks. The reason stays internal and still writes to the audit trail.
                                        </p>
                                        <textarea
                                            value={ownerOverrideReason}
                                            onChange={(event) => setOwnerOverrideReason(event.target.value)}
                                            rows={3}
                                            placeholder="Internal override reason"
                                            className="mt-3 w-full rounded-2xl border border-amber-300/20 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                                        />
                                        <div className="mt-3 flex flex-wrap gap-3">
                                            <button type="button" onClick={() => void submitCreatorUpdate("owner-override-on", { ownerOverrideActive: true, ownerOverrideReason })} disabled={saving === "owner-override-on"} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black disabled:opacity-50">Apply owner override</button>
                                            <button type="button" onClick={() => void submitCreatorUpdate("owner-override-off", { ownerOverrideActive: false, ownerOverrideReason: "" })} disabled={saving === "owner-override-off"} className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Clear override</button>
                                        </div>
                                    </details>
                                ) : null}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}
