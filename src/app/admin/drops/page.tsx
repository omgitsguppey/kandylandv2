"use client";

import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/textarea";


import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import { Drop } from "@/types/db";
import { useAuth } from "@/context/AuthContext";
import { isAdminUiTestSessionUser } from "@/lib/admin/admin-ui-test-session";

import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { sanitizeErrorForUser } from "@/lib/errors/resolve-human-error";
import { resolveClientActionError } from "@/lib/errors/client-error-adapter";
import { readUiJson } from "@/lib/ui-continuity";
import { toast } from "sonner";
import { sendNotification } from "@/lib/notifications";
import { CreateDropModal } from "@/components/Admin/CreateDropModal";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { AdminDropsInventoryPanel } from "@/components/creative-tim/kandydrops/admin/drops/AdminDropsInventoryPanel";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { formatAdminCompactDateTime, formatAdminDetailDateTime } from "@/lib/admin-drop-formatting";
import { buildAdminQueueProjection, type AdminDropQueueConfig } from "@/lib/admin-drop-queue";
import { resolveAdminDropLifecycleFacts } from "@/lib/admin-drop-lifecycle";
import { dispatchAdminOverviewSync } from "@/hooks/client-runtime";
import { useAdminDropsFeed } from "@/hooks/useAdminDropsFeed";
import { useAdminPollingSWR } from "@/hooks/useAdminPollingSWR";
import { useNow } from "@/hooks/useNow";
import { trackEvent } from "@/lib/telemetry";


interface DropNotificationDraft {
    dropId: string;
    title: string;
    imageUrl: string;
    message: string;
}

interface CreatorOption {
    uid: string;
    displayName: string;
    username: string;
    photoURL: string | null;
    role: string;
}

type DropStatusFilter = "all" | "queued" | "live" | "scheduled" | "pending_review" | "rejected" | "ended";
type DropSortMode = "last-active" | "newest" | "oldest" | "last-queued" | "alphabetical";
type CreatorDropReviewDecision = "approved" | "rejected" | "needs_changes";

type DropCardViewModel = {
    drop: Drop;
    creatorLabel: string;
    creatorSecondary: string | null;
    isQueueManaged: boolean;
    queuePosition: number | null;
    queueSlotMs: number | null;
    queueSlotLabel: string | null;
    statusFilter: Exclude<DropStatusFilter, "all">;
    statusLabel: string;
    statusClassName: string;
    schedulePrimaryLabel: string;
    scheduleSecondaryLabel: string | null;
    uploadedLabel: string | null;
    createdAtSortValue: number;
    lastActiveSortValue: number;
    searchIndex: string;
};

const STATUS_FILTER_OPTIONS: Array<{ value: DropStatusFilter; label: string }> = [
    { value: "all", label: "All" },
    { value: "queued", label: "Queued" },
    { value: "live", label: "Live" },
    { value: "scheduled", label: "Scheduled" },
    { value: "pending_review", label: "Pending" },
    { value: "rejected", label: "Rejected" },
    { value: "ended", label: "Ended" },
];

const SORT_OPTIONS: Array<{ value: DropSortMode; label: string }> = [
    { value: "last-active", label: "Last active" },
    { value: "last-queued", label: "Last queued" },
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "alphabetical", label: "A-Z" },
];

const ADMIN_DROP_QUEUE_SNAPSHOT_REFRESH_INTERVAL_MS = 0;

function getAdminDropsSafeErrorMessage(error: unknown, fallback: string) {
    const safeError = sanitizeErrorForUser(error, "admin_truth", "admin_truth_unavailable");
    return safeError.errorKey === "unknown_error" ? fallback : safeError.operatorMessage;
}

function buildCreatorFallback(drop: Drop) {
    if (drop.submittedByCreatorId) {
        return `Creator ${drop.submittedByCreatorId.slice(0, 8)}`;
    }

    if (drop.creatorId) {
        return `Creator ${drop.creatorId.slice(0, 8)}`;
    }

    return "Unassigned";
}

export default function AdminDropsPage() {
    const { user } = useAuth();
    const [selectedDropIds, setSelectedDropIds] = useState<Set<string>>(new Set());
    const [notificationDraft, setNotificationDraft] = useState<DropNotificationDraft | null>(null);
    const [sendingNotification, setSendingNotification] = useState(false);
    const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
    const [editingDropId, setEditingDropId] = useState<string | null>(null);
    const [duplicatingDropId, setDuplicatingDropId] = useState<string | null>(null);
    const [reviewingDropId, setReviewingDropId] = useState<string | null>(null);
    const [expandedDropId, setExpandedDropId] = useState<string | null>(null);
    const [creatorOptions, setCreatorOptions] = useState<CreatorOption[]>([]);
    const [searchDraft, setSearchDraft] = useState("");
    const [statusFilter, setStatusFilter] = useState<DropStatusFilter>("all");
    const [creatorFilter, setCreatorFilter] = useState("all");
    const [sortMode, setSortMode] = useState<DropSortMode>("last-active");
    const isLocalAdminUiTestSession = isAdminUiTestSessionUser(user);
    const { drops, legacyQueueIds, loading, loadError } = useAdminDropsFeed({ enabled: !isLocalAdminUiTestSession });
    const {
        data: queueConfig,
        mutate: mutateQueueConfig,
    } = useAdminPollingSWR<AdminDropQueueConfig>(isLocalAdminUiTestSession ? null : "/api/admin/queue", ADMIN_DROP_QUEUE_SNAPSHOT_REFRESH_INTERVAL_MS);
    const nowMs = useNow({ intervalMs: 60_000, initialNowMs: 0, enabled: drops.length > 0 });

    const deferredSearch = useDeferredValue(searchDraft.trim().toLowerCase());

    useEffect(() => {
        if (typeof window === "undefined") return;

        const params = new URLSearchParams(window.location.search);
        const targetDropId = params.get("dropId")?.trim();
        const searchValue = targetDropId || params.get("search")?.trim() || "";

        if (!searchValue) return;

        setSearchDraft(searchValue);
        setStatusFilter("all");
        setCreatorFilter("all");
        if (targetDropId) {
            setExpandedDropId(targetDropId);
        }
    }, []);

    useEffect(() => {
        const validDropIds = new Set(drops.map((drop) => drop.id));
        setSelectedDropIds((current) => new Set(Array.from(current).filter((id) => validDropIds.has(id))));
    }, [drops]);

    useEffect(() => {
        if (isLocalAdminUiTestSession) {
            setCreatorOptions([]);
            return;
        }

        let cancelled = false;

        const fetchCreatorOptions = async () => {
            try {
                const response = await authFetch("/api/admin/creator-options");
                const result = await response.json() as { creators?: CreatorOption[] };
                if (!response.ok) {
                    throw new Error("Failed to load creator options");
                }

                if (!cancelled) {
                    setCreatorOptions(Array.isArray(result.creators) ? result.creators : []);
                }
            } catch (error) {
                reportClientIssue({
                    channel: "network",
                    severity: "warn",
                    message: "Admin drops creator options fetch failed",
                    error,
                    detail: {
                        action: "fetch_creator_options",
                    },
                    consoleLabel: "[Admin Drops] creator options fetch failed",
                });
            }
        };

        void fetchCreatorOptions();

        return () => {
            cancelled = true;
        };
    }, [isLocalAdminUiTestSession]);

    const queueOrder = useMemo(() => queueConfig?.queue ?? [], [queueConfig]);
    const queuePositionMap = useMemo(() => {
        const map = new Map<string, number>();
        queueOrder.forEach((dropId, index) => {
            map.set(dropId, index);
        });
        return map;
    }, [queueOrder]);

    const creatorMap = useMemo(() => {
        const map = new Map<string, CreatorOption>();
        creatorOptions.forEach((creator) => {
            map.set(creator.uid, creator);
        });
        return map;
    }, [creatorOptions]);

    const dropMap = useMemo(() => {
        const map = new Map<string, Drop>();
        drops.forEach((drop) => {
            map.set(drop.id, drop);
        });
        return map;
    }, [drops]);

    const queueProjection = useMemo(() => buildAdminQueueProjection({
        getDropById: (dropId) => dropMap.get(dropId),
        queueOrder,
        legacyQueueIds,
        queueAuthorityVersion: queueConfig?.queueAuthorityVersion,
        cooldownDays: queueConfig?.cooldownDays ?? 1,
        timesPerDay: queueConfig?.timesPerDay ?? [],
        now: nowMs,
    }), [dropMap, legacyQueueIds, nowMs, queueConfig?.cooldownDays, queueConfig?.queueAuthorityVersion, queueConfig?.timesPerDay, queueOrder]);

    const visibleQueueIds = queueProjection.visibleQueueIds;
    const queueLifecycleMap = queueProjection.lifecycleMap;

    const dropViewModels = useMemo(() => {
        return drops.map((drop) => {
            const creator = (drop.creatorId ? creatorMap.get(drop.creatorId) : undefined)
                ?? (drop.submittedByCreatorId ? creatorMap.get(drop.submittedByCreatorId) : undefined);
            const creatorLabel = creator?.displayName || buildCreatorFallback(drop);
            const creatorSecondary = creator?.username ? `@${creator.username}` : drop.creatorId || drop.submittedByCreatorId || null;
            const isQueueManaged = visibleQueueIds.has(drop.id);
            const queuePosition = queuePositionMap.has(drop.id) ? queuePositionMap.get(drop.id)! : null;
            const queueLifecycle = queueLifecycleMap.get(drop.id);
            const lifecycle = resolveAdminDropLifecycleFacts(drop, {
                now: nowMs,
                isQueueManaged,
                queueLifecycle,
            });
            const queueSlotMs = lifecycle.queueSlotMs;
            const queueSlotLabel = lifecycle.queueSlotLabel;

            let statusFilterValue: DropCardViewModel["statusFilter"] = "ended";
            let statusLabel = "Ended";
            let statusClassName = "border-border bg-secondary text-muted-foreground";

            if (lifecycle.kind === "pending_review") {
                statusFilterValue = "pending_review";
                statusLabel = "Pending Review";
                statusClassName = "border-warning/20 bg-warning/10 text-warning";
            } else if (lifecycle.kind === "rejected") {
                statusFilterValue = "rejected";
                statusLabel = "Rejected";
                statusClassName = "border-destructive/20 bg-destructive/10 text-destructive";
            } else if (lifecycle.kind === "queued" && queueSlotLabel) {
                statusFilterValue = "queued";
                statusLabel = "Queued";
                statusClassName = "border-info/20 bg-info/10 text-info";
            } else if (lifecycle.kind === "scheduled") {
                statusFilterValue = "scheduled";
                statusLabel = "Scheduled";
                statusClassName = "border-border bg-secondary text-foreground";
            } else if (lifecycle.kind === "live") {
                statusFilterValue = "live";
                statusLabel = "Live";
                statusClassName = "border-primary/25 bg-primary/14 text-primary";
            } else if (lifecycle.kind === "cooldown") {
                statusFilterValue = "ended";
                statusLabel = "Cooling Down";
                statusClassName = "border-border bg-secondary text-foreground";
            }

            let schedulePrimaryLabel = `Starts ${formatAdminCompactDateTime(drop.validFrom)}`;
            let scheduleSecondaryLabel: string | null = drop.validUntil
                ? `Ends ${formatAdminCompactDateTime(drop.validUntil)}`
                : null;

            if (statusFilterValue === "queued" && queueSlotLabel) {
                schedulePrimaryLabel = `Queued for ${queueSlotLabel}`;
                scheduleSecondaryLabel = lifecycle.liveStatus === "scheduled"
                    ? `Original start ${formatAdminCompactDateTime(drop.validFrom)}`
                    : drop.validUntil
                        ? `Last window ended ${formatAdminCompactDateTime(drop.validUntil)}`
                        : "Ready for the next release slot";
            } else if (statusFilterValue === "live") {
                schedulePrimaryLabel = `Live since ${formatAdminCompactDateTime(drop.validFrom)}`;
                scheduleSecondaryLabel = drop.validUntil ? `Ends ${formatAdminCompactDateTime(drop.validUntil)}` : "No end time";
            } else if (statusLabel === "Cooling Down") {
                schedulePrimaryLabel = lifecycle.cooldownEndsAt
                    ? `Eligible again ${formatAdminCompactDateTime(lifecycle.cooldownEndsAt)}`
                    : (drop.validUntil ? `Ended ${formatAdminCompactDateTime(drop.validUntil)}` : "Waiting on queue cooldown");
                scheduleSecondaryLabel = drop.validUntil ? `Ended ${formatAdminCompactDateTime(drop.validUntil)}` : null;
            } else if (statusFilterValue === "ended") {
                schedulePrimaryLabel = drop.validUntil
                    ? `Ended ${formatAdminCompactDateTime(drop.validUntil)}`
                    : `Started ${formatAdminCompactDateTime(drop.validFrom)}`;
                scheduleSecondaryLabel = drop.createdAt ? `Uploaded ${formatAdminCompactDateTime(drop.createdAt)}` : null;
            }

            const uploadedLabel = drop.createdAt ? formatAdminDetailDateTime(drop.createdAt) : null;

            return {
                drop,
                creatorLabel,
                creatorSecondary,
                isQueueManaged,
                queuePosition,
                queueSlotMs,
                queueSlotLabel,
                statusFilter: statusFilterValue,
                statusLabel,
                statusClassName,
                schedulePrimaryLabel,
                scheduleSecondaryLabel,
                uploadedLabel,
                createdAtSortValue: drop.createdAt || drop.validFrom || 0,
                lastActiveSortValue: drop.validFrom || 0,
                searchIndex: [
                    drop.title,
                    creatorLabel,
                    creatorSecondary || "",
                    drop.id,
                ].join(" ").toLowerCase(),
            } satisfies DropCardViewModel;
        });
    }, [creatorMap, drops, nowMs, queueLifecycleMap, queuePositionMap, visibleQueueIds]);

    const creatorFilterOptions = useMemo(() => {
        const seen = new Set<string>();
        const options = dropViewModels
            .map((item) => ({
                value: item.drop.creatorId || item.drop.submittedByCreatorId || "unassigned",
                label: item.creatorSecondary ? `${item.creatorLabel} (${item.creatorSecondary})` : item.creatorLabel,
            }))
            .filter((option) => {
                if (seen.has(option.value)) {
                    return false;
                }
                seen.add(option.value);
                return true;
            })
            .sort((left, right) => left.label.localeCompare(right.label));

        return [{ value: "all", label: "All creators" }, ...options];
    }, [dropViewModels]);

    const filteredDrops = useMemo(() => {
        const next = dropViewModels.filter((item) => {
            if (statusFilter !== "all" && item.statusFilter !== statusFilter) {
                return false;
            }

            if (creatorFilter !== "all") {
                const creatorId = item.drop.creatorId || item.drop.submittedByCreatorId || "unassigned";
                if (creatorId !== creatorFilter) {
                    return false;
                }
            }

            if (deferredSearch.length > 0 && !item.searchIndex.includes(deferredSearch)) {
                return false;
            }

            return true;
        });

        next.sort((left, right) => {
            if (sortMode === "alphabetical") {
                return left.drop.title.localeCompare(right.drop.title);
            }

            if (sortMode === "oldest") {
                return left.createdAtSortValue - right.createdAtSortValue;
            }

            if (sortMode === "newest") {
                return right.createdAtSortValue - left.createdAtSortValue;
            }

            if (sortMode === "last-queued") {
                const leftRank = left.queuePosition == null ? Number.POSITIVE_INFINITY : -left.queuePosition;
                const rightRank = right.queuePosition == null ? Number.POSITIVE_INFINITY : -right.queuePosition;
                if (leftRank !== rightRank) {
                    return leftRank - rightRank;
                }
                return right.lastActiveSortValue - left.lastActiveSortValue;
            }

            return right.lastActiveSortValue - left.lastActiveSortValue;
        });

        return next;
    }, [creatorFilter, deferredSearch, dropViewModels, sortMode, statusFilter]);

    const visibleSelectedCount = useMemo(
        () => filteredDrops.reduce((total, item) => total + (selectedDropIds.has(item.drop.id) ? 1 : 0), 0),
        [filteredDrops, selectedDropIds],
    );
    const dropVisibilityLabel = isLocalAdminUiTestSession
        ? "No drop source loaded"
        : `${filteredDrops.length} of ${drops.length} drops visible`;

    const pendingCreatorSubmissionCount = useMemo(
        () => dropViewModels.filter((item) => item.drop.approvalStatus === "pending_review").length,
        [dropViewModels],
    );

    useEffect(() => {
        if (pendingCreatorSubmissionCount <= 0) {
            return;
        }

        trackEvent("admin_creator_drop_review_viewed", {
            surface: "admin_drops",
            pending_creator_submissions: pendingCreatorSubmissionCount,
        });
    }, [pendingCreatorSubmissionCount]);

    const handleDelete = useCallback(async (id: string) => {
        if (isLocalAdminUiTestSession) {
            return;
        }

        if (!confirm("Are you sure you want to delete this drop? This cannot be undone.")) {
            return;
        }

        try {
            const response = await authFetch("/api/admin/drops", {
                method: "DELETE",
                body: JSON.stringify({ dropId: id }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error);
            }
            dispatchAdminOverviewSync();
            toast.success("Drop deleted successfully");
        } catch (error: any) {
            reportClientIssue({
                channel: "network",
                message: "Admin drop delete failed",
                error,
                detail: {
                    action: "delete_drop",
                    dropId: id,
                },
                consoleLabel: "[Admin Drops] delete failed",
            });
            toast.error(getAdminDropsSafeErrorMessage(error, "Failed to delete drop."));
        }
    }, [isLocalAdminUiTestSession]);

    const handleReviewSubmission = useCallback(async (dropId: string, approvalStatus: CreatorDropReviewDecision) => {
        if (isLocalAdminUiTestSession) {
            return;
        }

        try {
            setReviewingDropId(dropId);
            const dropData = approvalStatus === "needs_changes"
                ? {
                    reviewStatus: "needs_changes",
                    approvalReviewedAt: Date.now(),
                }
                : {
                    approvalStatus,
                    approvalReviewedAt: Date.now(),
                };
            const response = await authFetch("/api/admin/drops", {
                method: "PUT",
                body: JSON.stringify({
                    dropId,
                    dropData,
                }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(typeof result.error === "string" ? result.error : "Review failed");
            }

            dispatchAdminOverviewSync();
            toast.success(
                approvalStatus === "approved"
                    ? "Creator drop approved"
                    : approvalStatus === "rejected"
                        ? "Creator drop rejected"
                        : "Creator drop marked as needs changes",
            );
        } catch (error: any) {
            reportClientIssue({
                channel: "network",
                message: "Admin drop review failed",
                error,
                detail: {
                    action: "review_drop",
                    dropId,
                    approvalStatus,
                },
                consoleLabel: "[Admin Drops] review failed",
            });
            toast.error(getAdminDropsSafeErrorMessage(error, "Review failed."));
        } finally {
            setReviewingDropId(null);
        }
    }, [isLocalAdminUiTestSession]);

    const toggleSelection = useCallback((id: string) => {
        if (isLocalAdminUiTestSession) {
            return;
        }

        setSelectedDropIds((current) => {
            const next = new Set(current);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, [isLocalAdminUiTestSession]);

    const toggleAll = useCallback(() => {
        if (isLocalAdminUiTestSession) {
            return;
        }

        const visibleIds = filteredDrops.map((item) => item.drop.id);
        if (visibleIds.length === 0) {
            return;
        }

        const allVisibleSelected = visibleIds.every((id) => selectedDropIds.has(id));
        setSelectedDropIds((current) => {
            const next = new Set(current);
            if (allVisibleSelected) {
                visibleIds.forEach((id) => next.delete(id));
            } else {
                visibleIds.forEach((id) => next.add(id));
            }
            return next;
        });
    }, [filteredDrops, isLocalAdminUiTestSession, selectedDropIds]);

    const handleBulkDelete = useCallback(async () => {
        if (isLocalAdminUiTestSession) {
            return;
        }

        if (selectedDropIds.size === 0) {
            return;
        }

        if (!confirm(`Are you sure you want to delete ${selectedDropIds.size} drop(s)? This cannot be undone.`)) {
            return;
        }

        try {
            const responses = await Promise.all(Array.from(selectedDropIds).map((dropId) => authFetch("/api/admin/drops", {
                method: "DELETE",
                body: JSON.stringify({ dropId }),
            })));
            const firstFailure = responses.find((response) => !response.ok);
            if (firstFailure) {
                const result = await firstFailure.json().catch(() => ({}));
                throw new Error(typeof result.error === "string" ? result.error : "One or more drops failed to delete.");
            }

            dispatchAdminOverviewSync();
            toast.success(`Successfully deleted ${selectedDropIds.size} drop(s).`);
            setSelectedDropIds(new Set());
        } catch (error) {
            reportClientIssue({
                channel: "network",
                message: "Admin bulk drop delete failed",
                error,
                detail: {
                    action: "bulk_delete_drops",
                    selectedCount: selectedDropIds.size,
                },
                consoleLabel: "[Admin Drops] bulk delete failed",
            });
            toast.error(getAdminDropsSafeErrorMessage(error, "One or more drops failed to delete."));
        }
    }, [isLocalAdminUiTestSession, selectedDropIds]);

    const toggleAutoQueue = useCallback(async (dropId: string) => {
        if (isLocalAdminUiTestSession) {
            return;
        }

        try {
            const response = await authFetch("/api/admin/queue/toggle", {
                method: "POST",
                body: JSON.stringify({ dropId }),
            });
            const result = await readUiJson<{ added?: unknown }>(response, {
                moduleLabel: "Admin queue toggle",
                url: "/api/admin/queue/toggle",
                requireSuccess: true,
            });
            if (typeof result.added !== "boolean") {
                throw Object.assign(new Error("Admin queue toggle returned no valid added state"), {
                    status: response.status,
                    code: "mutation_failed",
                });
            }

            const added = result.added;
            await mutateQueueConfig((current) => current ? {
                ...current,
                queue: added
                    ? [...current.queue.filter((id) => id !== dropId), dropId]
                    : current.queue.filter((id) => id !== dropId),
            } : current, {
                revalidate: false,
            });

            dispatchAdminOverviewSync();
            toast.success(added ? "Added to Queue" : "Removed from Queue");
        } catch (error) {
            const resolvedError = resolveClientActionError(error, {
                surface: "admin_truth",
                route: "/api/admin/queue/toggle",
                fallbackKey: "mutation_failed",
                context: {
                    action: "toggle_auto_queue",
                    dropId,
                },
            });
            reportClientIssue({
                channel: "network",
                message: "Admin queue toggle failed",
                error,
                detail: resolvedError.context,
                humanMessage: resolvedError.descriptor.userMessage,
                consoleLabel: "[Admin Drops] queue toggle failed",
            });
            toast.error(resolvedError.descriptor.userMessage);
        }
    }, [isLocalAdminUiTestSession, mutateQueueConfig]);

    const openNotificationDraft = useCallback((drop: Drop) => {
        if (isLocalAdminUiTestSession) {
            return;
        }

        if (!drop.imageUrl) {
            toast.error("Drop needs a preview image before sending a drop notification.");
            return;
        }

        setNotificationDraft({
            dropId: drop.id,
            title: drop.title,
            imageUrl: drop.imageUrl,
            message: "",
        });
    }, [isLocalAdminUiTestSession]);

    const handleSendDropNotification = useCallback(async () => {
        if (isLocalAdminUiTestSession) {
            return;
        }

        if (!notificationDraft || sendingNotification) {
            return;
        }

        const message = notificationDraft.message.trim();
        if (!message) {
            toast.error("Please enter a message.");
            return;
        }

        if (message.length > 150) {
            toast.error("Message must be 150 characters or less.");
            return;
        }

        setSendingNotification(true);

        const result = await sendNotification({
            title: "New drop update",
            message,
            type: "info",
            target: { global: true, userIds: [] },
            dropContext: {
                dropId: notificationDraft.dropId,
                dropTitle: notificationDraft.title,
                previewImageUrl: notificationDraft.imageUrl,
            },
            link: "/drops",
        });

        setSendingNotification(false);

        if (!result.success) {
            toast.error("Failed to send notification.");
            return;
        }

        if (result.duplicate) {
            toast.info("That drop update was already sent a moment ago.");
            setNotificationDraft(null);
            return;
        }

        toast.success("Drop notification sent.");
        setNotificationDraft(null);
    }, [isLocalAdminUiTestSession, notificationDraft, sendingNotification]);

    const openCreatePanel = useCallback(() => {
        if (isLocalAdminUiTestSession) {
            return;
        }

        setEditingDropId(null);
        setDuplicatingDropId(null);
        setIsCreatePanelOpen(true);
    }, [isLocalAdminUiTestSession]);

    const closeCreatePanel = useCallback(() => {
        setIsCreatePanelOpen(false);
        setEditingDropId(null);
        setDuplicatingDropId(null);
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <>
            <div className="min-w-0 space-y-4">
                <PageViewEvent eventName="admin_drops_viewed" />

                <AdminPageHeader
                    compact
                    eyebrow="Admin Drops"
                    title="Manage Drops"
                    subtitle="Search, queue, edit, and create drops in one compact view without losing the current controls."
                    actions={(
                        <>
                            <Link
                                href="/admin/queue"
                                className={buttonVariants({ variant: "outline" })}
                            >
                                Manage Queue
                            </Link>
                        </>
                    )}
                />

                <AdminDropsInventoryPanel
                    items={filteredDrops}
                    totalDrops={drops.length}
                    searchValue={searchDraft}
                    onSearchChange={setSearchDraft}
                    statusFilter={statusFilter}
                    onStatusFilterChange={(value) => setStatusFilter(value as DropStatusFilter)}
                    statusOptions={STATUS_FILTER_OPTIONS}
                    creatorFilter={creatorFilter}
                    onCreatorFilterChange={setCreatorFilter}
                    creatorOptions={creatorFilterOptions}
                    sortMode={sortMode}
                    onSortModeChange={(value) => setSortMode(value as DropSortMode)}
                    sortOptions={SORT_OPTIONS}
                    selectedDropIds={selectedDropIds}
                    selectedCount={selectedDropIds.size}
                    visibleSelectedCount={visibleSelectedCount}
                    onToggleSelection={toggleSelection}
                    onToggleAll={toggleAll}
                    onBulkDelete={() => void handleBulkDelete()}
                    isFixture={isLocalAdminUiTestSession}
                    loadError={loadError}
                    dropVisibilityLabel={dropVisibilityLabel}
                    pendingCreatorSubmissionCount={pendingCreatorSubmissionCount}
                    reviewingDropId={reviewingDropId}
                    expandedDropId={expandedDropId}
                    onToggleExpanded={(dropId) => setExpandedDropId((current) => current === dropId ? null : dropId)}
                    onReviewSubmission={(dropId, decision) => void handleReviewSubmission(dropId, decision)}
                    onToggleQueue={(dropId) => void toggleAutoQueue(dropId)}
                    onOpenNotification={openNotificationDraft}
                    onDuplicate={(dropId) => {
                        setEditingDropId(null);
                        setDuplicatingDropId(dropId);
                        setIsCreatePanelOpen(true);
                    }}
                    onEdit={(dropId) => {
                        setDuplicatingDropId(null);
                        setEditingDropId(dropId);
                        setIsCreatePanelOpen(true);
                    }}
                    onDelete={(dropId) => void handleDelete(dropId)}
                    isCreating={isCreatePanelOpen}
                    onStartCreate={openCreatePanel}
                    onCloseCreate={closeCreatePanel}
                    creationWorkspace={(
                        <CreateDropModal
                            isOpen={isCreatePanelOpen}
                            onClose={closeCreatePanel}
                            dropId={editingDropId}
                            duplicateFromId={duplicatingDropId}
                            onSuccess={closeCreatePanel}
                            presentation="inline"
                        />
                    )}
                />
                {notificationDraft ? (
                    <section className="mt-4 rounded-[1.75rem] border border-primary/20 bg-primary/8 p-4 shadow-xl shadow-scrim/20 sm:p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
                                    <Image src={notificationDraft.imageUrl} alt={notificationDraft.title} fill sizes="48px" className="object-cover" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Drop notification</p>
                                    <p className="truncate text-sm font-semibold text-foreground">{notificationDraft.title}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Send a bounded update through the existing notification path.</p>
                                </div>
                            </div>

                            <div className="min-w-0 flex-1">
                                <Textarea
                                    value={notificationDraft.message}
                                    onChange={(event) => setNotificationDraft((current) => current ? {
                                        ...current,
                                        message: event.target.value.slice(0, 150),
                                    } : current)}
                                    placeholder="Write a short update for this drop..."
                                    className="h-24 w-full resize-none rounded-2xl border border-border bg-background/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground"
                                />
                                <div className="mt-2 text-right text-xs text-muted-foreground">
                                    {notificationDraft.message.length}/150
                                </div>
                            </div>

                            <div className="flex shrink-0 items-center justify-end gap-2">
                                <Button variant="ghost"
                                    type="button"
                                    onClick={() => setNotificationDraft(null)}
                                    className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground"
                                >
                                    Cancel
                                </Button>
                                <Button variant="ghost"
                                    type="button"
                                    onClick={handleSendDropNotification}
                                    disabled={sendingNotification}
                                    className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
                                >
                                    {sendingNotification ? "Sending..." : "Send"}
                                </Button>
                            </div>
                        </div>
                    </section>
                ) : null}
            </div>
        </>
    );
}
