"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
    ROSTER_DECISION_TABS,
    ROSTER_DETAIL_SECTION_KEYS,
    buildPrimaryActionLabel,
    buildRosterTelemetryPayload,
    classifyRosterDecisionEntry,
    formatAgreementStatus,
    formatApprovalStatus,
    formatIdStatus,
    formatIntakeStatus,
    type RosterDetailSectionKey,
    type RosterTab,
} from "./decision-queue";

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

export default function AdminRosterPage() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const [tab, setTab] = useState<RosterTab>("needs_review");
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
    const [expandedSections, setExpandedSections] = useState<Record<RosterDetailSectionKey, boolean>>({
        agreement_record: false,
        id_files: false,
        audit_trail: false,
        admin_notes: false,
        owner_controls: false,
    });

    const isOwner = user?.email?.toLowerCase() === PRIMARY_CREATOR_OWNER_EMAIL;
    const focusUserId = searchParams.get("focus");

    const intakeEntries = roster?.creatorReviewQueue ?? [];
    const liveCreators = (roster?.rosterUsers ?? []).filter((entry) => entry.role === "creator");
    const selectedEntry = intakeEntries.find((entry) => entry.uid === selectedUserId) ?? null;
    const selectedCanonical = detail?.creatorOnboardingCanonical ?? null;
    const selectedCreatorApplication = detail?.user.creatorApplication ?? null;
    const selectedHistory = detail?.creatorOnboardingHistory ?? [];
    const entriesByDecision = useMemo(() => ({
        needs_review: intakeEntries.filter((entry) => classifyRosterDecisionEntry(entry) === "needs_review"),
        waiting: intakeEntries.filter((entry) => classifyRosterDecisionEntry(entry) === "waiting"),
        approved: intakeEntries.filter((entry) => classifyRosterDecisionEntry(entry) === "approved"),
    }), [intakeEntries]);
    const approvedQueueIds = useMemo(() => new Set(entriesByDecision.approved.map((entry) => entry.uid)), [entriesByDecision.approved]);
    const approvedLiveCreators = liveCreators.filter((entry) => !approvedQueueIds.has(entry.uid));
    const visibleDecisionEntries = tab === "create" ? [] : entriesByDecision[tab];
    const collapsedSections = ROSTER_DETAIL_SECTION_KEYS.filter((sectionKey) => !expandedSections[sectionKey]);
    const selectedPrimaryAction = selectedCanonical ? buildPrimaryActionLabel(selectedCanonical) : selectedEntry ? buildPrimaryActionLabel(selectedEntry) : "";

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
            setTab(creatorPath === "live_override" ? "approved" : "needs_review");
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

    const buildTelemetryPayload = (input: {
        targetUserId?: string | null;
        actionKey: string;
        sectionKey?: string;
        tabOverride?: RosterTab;
    }) => buildRosterTelemetryPayload({
        isOwner,
        actorUid: user?.uid,
        actorEmail: user?.email,
        targetUserId: input.targetUserId ?? selectedUserId,
        tab: input.tabOverride ?? tab,
        actionKey: input.actionKey,
        sectionKey: input.sectionKey,
    });

    const handleTabChange = (nextTab: RosterTab) => {
        setTab(nextTab);
        trackEvent("admin_roster_tab_changed", buildTelemetryPayload({
            actionKey: "admin_roster_tab_changed",
            tabOverride: nextTab,
        }));
    };

    const handleOpenCreatorRecord = (targetUserId: string) => {
        setSelectedUserId(targetUserId);
        trackEvent("admin_creator_record_opened", buildTelemetryPayload({
            targetUserId,
            actionKey: "admin_creator_record_opened",
        }));
    };

    const handlePrimaryActionClick = (actionKey: string, patch: Record<string, unknown>, extraUpdates?: Record<string, unknown>) => {
        trackEvent("admin_creator_primary_action_clicked", buildTelemetryPayload({
            actionKey,
        }));
        void submitCreatorUpdate(actionKey, patch, extraUpdates);
    };

    const handleSectionToggle = (sectionKey: RosterDetailSectionKey, open: boolean) => {
        setExpandedSections((current) => ({ ...current, [sectionKey]: open }));
        if (open) {
            trackEvent("admin_creator_section_expanded", buildTelemetryPayload({
                actionKey: "admin_creator_section_expanded",
                sectionKey,
            }));
        }
    };

    const rosterDebugMetadata = {
        rosterMode: "decision_queue",
        selectedTab: tab,
        selectedCreatorId: selectedUserId ?? "",
        primaryAction: selectedPrimaryAction,
        collapsedSections: collapsedSections.join(","),
        ownerControlsVisible: Boolean(isOwner && expandedSections.owner_controls),
        actorMarkerPresent: true,
    };

    return (
        <main className="min-h-screen bg-black px-4 pb-24 pt-24 text-white sm:px-6" data-roster-mode="decision_queue" data-admin-debug-metadata={JSON.stringify(rosterDebugMetadata)}>
            <PageViewEvent eventName="admin_roster_viewed" eventParams={{ component_name: "admin_roster_page", roster_mode: "decision_queue", actorMarkerPresent: true }} />
            <div className="mx-auto max-w-7xl">
                <AdminPageHeader
                    eyebrow="Creator Operations"
                    title="Creator Review"
                    subtitle="Review applications, send agreements, verify identity, and activate approved creators."
                    compact
                    actions={(
                        <div className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-white/10 bg-zinc-950/80 p-1" role="tablist" aria-label="Creator review views">
                            {ROSTER_DECISION_TABS.map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === item.key}
                                    onClick={() => handleTabChange(item.key)}
                                    className={`min-h-10 whitespace-nowrap rounded-full px-3 text-sm font-semibold transition-colors ${tab === item.key ? "bg-white text-black" : "text-zinc-300 hover:bg-white/10 hover:text-white"}`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    )}
                />
                <section className="grid gap-4 lg:grid-cols-[0.94fr_1.06fr]">
                    <div className="space-y-4">
                        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
                            <div className="min-w-[180px] rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Needs admin</p>
                                <p className="mt-2 text-2xl font-black text-white">{entriesByDecision.needs_review.length}</p>
                                <p className="mt-1 text-xs leading-5 text-zinc-400">Creators waiting for your next action.</p>
                            </div>
                            <div className="min-w-[180px] rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Waiting on creator</p>
                                <p className="mt-2 text-2xl font-black text-white">{entriesByDecision.waiting.length}</p>
                                <p className="mt-1 text-xs leading-5 text-zinc-400">Agreement, ID, or intake steps still missing.</p>
                            </div>
                            <div className="min-w-[180px] rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Live creators</p>
                                <p className="mt-2 text-2xl font-black text-white">{roster?.summary.creatorCount ?? approvedLiveCreators.length}</p>
                                <p className="mt-1 text-xs leading-5 text-zinc-400">Approved creators with active access.</p>
                            </div>
                        </div>

                        {tab !== "create" ? (
                            <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h2 className="text-lg font-black text-white">{ROSTER_DECISION_TABS.find((item) => item.key === tab)?.label}</h2>
                                        <p className="mt-1 text-sm leading-6 text-zinc-400">
                                            Each row shows the next decision needed. Open a creator only when you need the full record.
                                        </p>
                                    </div>
                                    <input
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                        placeholder="Search name or email"
                                        className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-brand-purple/60 sm:max-w-xs"
                                    />
                                </div>

                                {loading ? (
                                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 px-4 py-5 text-sm text-zinc-400">Loading creator roster...</div>
                                ) : tab === "approved" ? (
                                    <div className="mt-4 space-y-3">
                                        {visibleDecisionEntries.length === 0 && approvedLiveCreators.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-white/10 bg-black/30 px-4 py-5 text-sm text-zinc-400">
                                                No approved creators match this view right now.
                                            </div>
                                        ) : visibleDecisionEntries.map((entry) => (
                                            <button
                                                key={entry.uid}
                                                type="button"
                                                onClick={() => handleOpenCreatorRecord(entry.uid)}
                                                className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${selectedUserId === entry.uid ? "border-brand-purple/50 bg-brand-purple/10" : "border-white/10 bg-black/25 hover:border-white/20"}`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-base font-bold text-white">{entry.creatorDisplayName}</p>
                                                        <p className="mt-1 truncate text-sm text-zinc-400">{formatApprovalStatus(entry.approvalStatus, entry.role)} - {entry.email}</p>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-2 text-sm font-semibold text-white">
                                                        Review
                                                        <ChevronRight className="h-4 w-4 text-brand-purple" />
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                        {approvedLiveCreators.map((entry) => (
                                            <button
                                                key={entry.uid}
                                                type="button"
                                                onClick={() => handleOpenCreatorRecord(entry.uid)}
                                                className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${selectedUserId === entry.uid ? "border-brand-purple/50 bg-brand-purple/10" : "border-white/10 bg-black/25 hover:border-white/20"}`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-base font-bold text-white">{entry.displayName}</p>
                                                        <p className="mt-1 truncate text-sm text-zinc-400">@{entry.username || "creator"} - {entry.email}</p>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-2 text-sm font-semibold text-white">
                                                        Open
                                                        <ChevronRight className="h-4 w-4 text-brand-purple" />
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-4 space-y-3">
                                        {visibleDecisionEntries.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-white/10 bg-black/30 px-4 py-5 text-sm text-zinc-400">
                                                No creators match this decision queue right now.
                                            </div>
                                        ) : visibleDecisionEntries.map((entry) => (
                                            <button
                                                key={entry.uid}
                                                type="button"
                                                onClick={() => handleOpenCreatorRecord(entry.uid)}
                                                className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${selectedUserId === entry.uid ? "border-brand-purple/50 bg-brand-purple/10" : "border-white/10 bg-black/25 hover:border-white/20"}`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-base font-bold text-white">{entry.creatorDisplayName}</p>
                                                        <p className="mt-1 truncate text-sm text-zinc-400">{buildStage(entry)} - {entry.email}</p>
                                                        <p className="mt-1 text-xs text-zinc-500">{countRealBlockers(entry)} review notes</p>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-2 text-sm font-semibold text-white">
                                                        <span>{buildPrimaryActionLabel(entry)}</span>
                                                        <ChevronRight className="h-4 w-4 text-brand-purple" />
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
                                <div className="flex items-center gap-2 text-lg font-black text-white">
                                    <PlusCircle className="h-5 w-5 text-brand-purple" />
                                    Create
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
                                    <p className="mt-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs leading-6 text-zinc-300">
                                        Direct creator creation is available to all admins, but live creator path and compliance bypass stay owner-only because they bypass standard onboarding locks.
                                    </p>
                                ) : null}
                                <div className="mt-4 flex justify-end">
                                    <button type="button" onClick={() => void handleCreateCreator()} disabled={creating} className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black disabled:opacity-50">
                                        {creating ? "Creating..." : "Create account"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
                        {!selectedUserId ? (
                            <div className="flex h-full min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/25 px-6 text-center text-sm leading-7 text-zinc-400">
                                Select a creator to review their next step, agreement status, ID status, and audit trail.
                            </div>
                        ) : detailLoading ? (
                            <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-white/10 bg-black/25 px-6 text-sm text-zinc-400">
                                Loading creator record...
                            </div>
                        ) : !selectedCanonical ? (
                            <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-white/10 bg-black/25 px-6 text-sm text-zinc-400">
                                Creator detail is unavailable for this account.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="rounded-2xl border border-brand-purple/25 bg-brand-purple/10 p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">Review step</p>
                                            <h2 className="mt-2 text-2xl font-black text-white">{selectedCanonical.creatorDisplayName}</h2>
                                            <p className="mt-2 text-sm leading-6 text-zinc-200">{getCreatorOnboardingStatusSummary(selectedCanonical).summary}</p>
                                            <p className="mt-2 text-sm font-semibold text-white">{selectedPrimaryAction}</p>
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
                                    <div className="mt-4 flex flex-wrap gap-3">
                                        {!selectedCanonical.introAcknowledgedAt ? (
                                            <p className="text-sm text-zinc-300">Creator still needs to acknowledge the intro before review can move forward.</p>
                                        ) : null}
                                        {(selectedCanonical.idVerificationStatus === "id_not_requested" || selectedCanonical.idVerificationStatus === "id_rejected") ? (
                                            <button type="button" onClick={() => handlePrimaryActionClick("request-id", { idVerificationStatus: "id_requested", kycDueAt: Date.now() + (7 * 24 * 60 * 60 * 1000) })} disabled={saving === "request-id"} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black disabled:opacity-50">Request ID upload</button>
                                        ) : null}
                                        {selectedCanonical.contractDocumentStatus !== "contract_sent" && selectedCanonical.introAcknowledgedAt ? (
                                            <button type="button" onClick={() => handlePrimaryActionClick("send-contract", { contractDocumentStatus: "contract_sent", legalStatus: "legal_sent" })} disabled={saving === "send-contract"} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black disabled:opacity-50">Send agreement</button>
                                        ) : null}
                                        {selectedCanonical.creatorSignatureStatus === "signature_signed" && selectedCanonical.adminSignatureStatus !== "signature_signed" ? (
                                            <button type="button" onClick={() => handlePrimaryActionClick("countersign", { adminSignatureStatus: "signature_signed", legalStatus: "legal_signed" })} disabled={saving === "countersign"} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black disabled:opacity-50">Countersign agreement</button>
                                        ) : null}
                                        {(selectedCanonical.readyForApproval || selectedCanonical.ownerOverrideActive) ? (
                                            <button type="button" onClick={() => handlePrimaryActionClick("approve", { approvalStatus: "creator_approved" })} disabled={saving === "approve"} className="rounded-full bg-brand-purple px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Approve creator</button>
                                        ) : null}
                                        <button type="button" onClick={() => void submitCreatorUpdate("return", { approvalStatus: "creator_needs_changes" })} disabled={saving === "return"} className="rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Return for changes</button>
                                        <button type="button" onClick={() => void submitCreatorUpdate("reject", { approvalStatus: "creator_rejected" })} disabled={saving === "reject"} className="rounded-full border border-white/10 bg-zinc-950 px-4 py-2 text-sm font-semibold text-zinc-200 disabled:opacity-50">Reject application</button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Intake</p>
                                        <p className="mt-2 text-sm font-bold text-white">{formatIntakeStatus(selectedCanonical)}</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Agreement</p>
                                        <p className="mt-2 text-sm font-bold text-white">{formatAgreementStatus(selectedCanonical)}</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">ID</p>
                                        <p className="mt-2 text-sm font-bold text-white">{formatIdStatus(selectedCanonical.idVerificationStatus)}</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Approval</p>
                                        <p className="mt-2 text-sm font-bold text-white">{formatApprovalStatus(selectedCanonical.approvalStatus, selectedCanonical.role)}</p>
                                    </div>
                                </div>

                                <details className="rounded-2xl border border-white/10 bg-black/25 p-4" onToggle={(event) => handleSectionToggle("agreement_record", event.currentTarget.open)}>
                                    <summary className="cursor-pointer list-none text-sm font-bold text-white">Agreement record</summary>
                                    <div className="mt-4 space-y-4">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Template</p>
                                                <p className="mt-2 text-sm font-semibold text-white">{selectedCanonical.creatorTemplateLabel || DEFAULT_CREATOR_TEMPLATE_LABEL}</p>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Countersign</p>
                                                <p className="mt-2 text-sm font-semibold text-white">{formatAgreementStatus(selectedCanonical)}</p>
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                            <p className="text-sm font-semibold text-white">Plain-language agreement summary</p>
                                            <div className="mt-3 space-y-2 text-sm leading-6 text-zinc-300">
                                                {CREATOR_CONTRACT_SUMMARY_BULLETS.map((bullet) => <p key={bullet}>- {bullet}</p>)}
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                            <p className="text-sm font-semibold text-white">Full MGSA</p>
                                            <div className="mt-3 space-y-3 text-sm leading-6 text-zinc-300">
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

                                <details className="rounded-2xl border border-white/10 bg-black/25 p-4" onToggle={(event) => handleSectionToggle("id_files", event.currentTarget.open)}>
                                    <summary className="cursor-pointer list-none text-sm font-bold text-white">ID files</summary>
                                    <div className="mt-4 space-y-4">
                                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">KYC due</p>
                                            <p className="mt-2 text-sm font-semibold text-white">{formatTimestamp(selectedCanonical.kycDueAt)}</p>
                                            <p className="mt-1 text-xs text-zinc-500">{selectedEntry?.idDocumentCount ?? 0} of 4 files uploaded.</p>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {[
                                                { label: "Front of ID", side: "front", fileName: selectedEntry?.idDocumentFrontFileName },
                                                { label: "Back of ID", side: "back", fileName: selectedEntry?.idDocumentBackFileName },
                                                { label: "Face with ID", side: "face_with_id", fileName: selectedEntry?.idDocumentFaceFileName },
                                                { label: "Video with ID", side: "video_with_id", fileName: selectedEntry?.idDocumentVideoFileName },
                                            ].map((document) => (
                                                <div key={document.side} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{document.label}</p>
                                                    <p className="mt-2 text-sm font-semibold text-white">{document.fileName || "Not uploaded"}</p>
                                                    {document.fileName ? (
                                                        <a href={`/api/admin/user/${selectedUserId}/creator-onboarding/id-document?side=${document.side}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-semibold text-brand-purple">
                                                            Open file
                                                        </a>
                                                    ) : null}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </details>

                                <details className="rounded-2xl border border-white/10 bg-black/25 p-4" onToggle={(event) => handleSectionToggle("audit_trail", event.currentTarget.open)}>
                                    <summary className="cursor-pointer list-none text-sm font-bold text-white">Audit trail</summary>
                                    <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                                        <div className="space-y-3">
                                            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Creator intro acknowledgment</p>
                                                <div className="mt-2 space-y-2 text-sm leading-6 text-zinc-300">
                                                    {CREATOR_INTRO_CREATOR_BULLETS.map((bullet) => <p key={bullet}>- {bullet}</p>)}
                                                </div>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Fan explainer</p>
                                                <div className="mt-2 space-y-2 text-sm leading-6 text-zinc-300">
                                                    {CREATOR_INTRO_FAN_BULLETS.map((bullet) => <p key={bullet}>- {bullet}</p>)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                                <p className="text-sm font-semibold text-white">Milestones</p>
                                                <div className="mt-3 space-y-2 text-sm text-zinc-300">
                                                    <p>Submitted - {formatTimestamp(selectedCanonical.submittedAt)}</p>
                                                    <p>Intro acknowledged - {formatTimestamp(selectedCanonical.introAcknowledgedAt)}</p>
                                                    <p>ID requested - {formatTimestamp(selectedCanonical.idVerificationRequestedAt)}</p>
                                                    <p>ID reviewed - {formatTimestamp(selectedCanonical.idVerificationReviewedAt)}</p>
                                                    <p>Creator signed - {formatTimestamp(selectedCanonical.creatorContractSignedAt)}</p>
                                                    <p>Admin countersigned - {formatTimestamp(selectedCanonical.adminContractSignedAt)}</p>
                                                    <p>Last review touch - {formatTimestamp(selectedCanonical.updatedAt)}</p>
                                                </div>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                                <p className="text-sm font-semibold text-white">History</p>
                                                <div className="mt-3 max-h-[260px] space-y-2 overflow-y-auto pr-1 text-sm text-zinc-300">
                                                    {selectedHistory.length === 0 ? (
                                                        <p className="text-zinc-500">No history records loaded.</p>
                                                    ) : selectedHistory.map((entry) => (
                                                        <div key={`${entry.eventType}-${entry.timestamp}-${entry.actorId}`} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                                                            <p className="font-semibold text-white">{buildHistoryLabel(entry)}</p>
                                                            {entry.detail ? <p className="mt-1 text-xs leading-6 text-zinc-400">{entry.detail}</p> : null}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </details>

                                <details className="rounded-2xl border border-white/10 bg-black/25 p-4" onToggle={(event) => handleSectionToggle("admin_notes", event.currentTarget.open)}>
                                    <summary className="cursor-pointer list-none text-sm font-bold text-white">Admin notes</summary>
                                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-zinc-300">
                                        {selectedCanonical.adminNotes || "No admin notes recorded."}
                                    </div>
                                    {selectedCanonical.blockingReasons.length > 0 ? (
                                        <div className="mt-3 space-y-2 text-sm text-zinc-300">
                                            {selectedCanonical.blockingReasons.map((reason) => {
                                                const detailReason = describeCreatorOnboardingBlockingReason(reason);
                                                return <p key={reason}>- {detailReason.label}</p>;
                                            })}
                                        </div>
                                    ) : null}
                                </details>

                                {isOwner ? (
                                    <details className="rounded-2xl border border-brand-purple/25 bg-brand-purple/10 p-4" onToggle={(event) => handleSectionToggle("owner_controls", event.currentTarget.open)}>
                                        <summary className="cursor-pointer list-none text-sm font-bold text-white">Owner controls</summary>
                                        <p className="mt-3 text-sm leading-6 text-zinc-200">
                                            Owner override can bypass KYC, legal, approval, and role-activation locks. The reason stays internal and still writes to the audit trail.
                                        </p>
                                        <textarea
                                            value={ownerOverrideReason}
                                            onChange={(event) => setOwnerOverrideReason(event.target.value)}
                                            rows={3}
                                            placeholder="Internal override reason"
                                            className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-brand-purple/60"
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
