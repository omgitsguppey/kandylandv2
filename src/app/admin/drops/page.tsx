"use client";

import { type CSSProperties, startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { BellRing, Calendar, Check, ChevronDown, ChevronUp, Clock3, Copy, Edit, Package, PlusCircle, Repeat, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { db } from "@/lib/firebase-data";
import { Drop } from "@/types/db";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/authFetch";
import { toast } from "sonner";
import { sendNotification } from "@/lib/notifications";
import { CreateDropModal } from "@/components/Admin/CreateDropModal";
import { normalizeDropRecord } from "@/lib/drop-normalizers";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { buildProjectedQueueSchedule } from "@/lib/drop-queue-schedule";
import { formatAdminCompactDateTime, formatAdminDetailDateTime } from "@/lib/admin-drop-formatting";

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

interface QueueConfig {
    queue: string[];
    dropsPerDay: number;
    cooldownDays: number;
    timesPerDay: string[];
}

type DropStatusFilter = "all" | "queued" | "live" | "scheduled" | "pending_review" | "rejected" | "ended";
type DropSortMode = "last-active" | "newest" | "oldest" | "last-queued" | "alphabetical";

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

function buildCreatorFallback(drop: Drop) {
    if (drop.submittedByCreatorId) {
        return `Creator ${drop.submittedByCreatorId.slice(0, 8)}`;
    }

    if (drop.creatorId) {
        return `Creator ${drop.creatorId.slice(0, 8)}`;
    }

    return "Unassigned";
}

function getDelaySeed(value: string) {
    return Array.from(value).reduce((total, char) => total + char.charCodeAt(0), 0) % 6;
}

function CompactTitleMarquee({
    title,
    delaySeed,
    className,
}: {
    title: string;
    delaySeed: number;
    className?: string;
}) {
    const frameRef = useRef<HTMLDivElement | null>(null);
    const textRef = useRef<HTMLParagraphElement | null>(null);
    const [overflowPx, setOverflowPx] = useState(0);
    const marqueeStyle = overflowPx > 0 ? ({
        ["--admin-title-shift" as string]: `-${overflowPx}px`,
        animationDelay: `${delaySeed * 1.15}s`,
    } satisfies CSSProperties) : undefined;

    useEffect(() => {
        const measure = () => {
            const frame = frameRef.current;
            const text = textRef.current;
            if (!frame || !text) {
                return;
            }

            const nextOverflow = Math.ceil(text.scrollWidth - frame.clientWidth);
            setOverflowPx(nextOverflow > 20 ? nextOverflow : 0);
        };

        measure();

        if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", measure);
            return () => window.removeEventListener("resize", measure);
        }

        const observer = new ResizeObserver(() => measure());
        if (frameRef.current) {
            observer.observe(frameRef.current);
        }
        if (textRef.current) {
            observer.observe(textRef.current);
        }

        return () => observer.disconnect();
    }, [title]);

    return (
        <div ref={frameRef} className="overflow-hidden">
            <p
                ref={textRef}
                className={cn(
                    "block whitespace-nowrap text-[0.95rem] font-semibold leading-tight tracking-[-0.01em] text-white",
                    overflowPx > 0 ? "admin-drop-title-marquee" : "truncate",
                    className,
                )}
                style={marqueeStyle}
            >
                {title}
            </p>
        </div>
    );
}

function IconChipButton({
    label,
    onClick,
    icon: Icon,
    active = false,
    tone = "neutral",
    disabled = false,
}: {
    label: string;
    onClick: () => void;
    icon: typeof Repeat;
    active?: boolean;
    tone?: "neutral" | "danger" | "success";
    disabled?: boolean;
}) {
    const toneClassName = tone === "danger"
        ? "text-red-300 hover:border-red-400/20 hover:bg-red-500/10"
        : tone === "success"
            ? "text-emerald-300 hover:border-emerald-400/20 hover:bg-emerald-500/10"
            : "text-gray-200 hover:border-white/15 hover:bg-white/8";

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            disabled={disabled}
            className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/45 transition-all disabled:opacity-45",
                toneClassName,
                active ? "border-brand-purple/35 bg-brand-purple/18 text-brand-purple shadow-[0_0_0_1px_rgba(236,72,153,0.12)]" : null,
            )}
        >
            <Icon className="h-4 w-4" />
        </button>
    );
}

function SelectField({
    value,
    onChange,
    label,
    options,
}: {
    value: string;
    onChange: (value: string) => void;
    label: string;
    options: Array<{ value: string; label: string }>;
}) {
    return (
        <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">{label}</span>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="min-h-11 rounded-2xl border border-white/10 bg-black/45 px-3 text-sm text-white outline-none transition-colors focus:border-brand-purple/40"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

export default function AdminDropsPage() {
    const [drops, setDrops] = useState<Drop[]>([]);
    const [selectedDropIds, setSelectedDropIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [notificationDraft, setNotificationDraft] = useState<DropNotificationDraft | null>(null);
    const [sendingNotification, setSendingNotification] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingDropId, setEditingDropId] = useState<string | null>(null);
    const [duplicatingDropId, setDuplicatingDropId] = useState<string | null>(null);
    const [reviewingDropId, setReviewingDropId] = useState<string | null>(null);
    const [expandedDropId, setExpandedDropId] = useState<string | null>(null);
    const [legacyQueueIds, setLegacyQueueIds] = useState<Set<string>>(new Set());
    const [queueConfig, setQueueConfig] = useState<QueueConfig | null>(null);
    const [creatorOptions, setCreatorOptions] = useState<CreatorOption[]>([]);
    const [searchDraft, setSearchDraft] = useState("");
    const [statusFilter, setStatusFilter] = useState<DropStatusFilter>("all");
    const [creatorFilter, setCreatorFilter] = useState("all");
    const [sortMode, setSortMode] = useState<DropSortMode>("last-active");

    const deferredSearch = useDeferredValue(searchDraft.trim().toLowerCase());

    useEffect(() => {
        const q = query(collection(db, "drops"), orderBy("validFrom", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const nextDrops: Drop[] = [];
            const nextLegacyQueueIds = new Set<string>();

            snapshot.forEach((docSnapshot) => {
                const raw = docSnapshot.data() as Record<string, unknown>;
                try {
                    nextDrops.push(normalizeDropRecord(raw, docSnapshot.id));
                } catch {
                    nextDrops.push({ id: docSnapshot.id, ...raw } as Drop);
                }

                const rotationConfig = raw.rotationConfig as Record<string, unknown> | undefined;
                if (rotationConfig?.enabled === true) {
                    nextLegacyQueueIds.add(docSnapshot.id);
                }
            });

            setDrops(nextDrops);
            setLegacyQueueIds(nextLegacyQueueIds);
            setLoadError(null);
            setLoading(false);
        }, (error) => {
            console.error("Failed to subscribe to drops", error);
            setLoadError(error instanceof Error ? error.message : "Failed to load drops.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const validDropIds = new Set(drops.map((drop) => drop.id));
        setSelectedDropIds((current) => new Set(Array.from(current).filter((id) => validDropIds.has(id))));
    }, [drops]);

    useEffect(() => {
        let cancelled = false;

        const fetchQueueConfig = async () => {
            try {
                const response = await authFetch("/api/admin/queue");
                const result = await response.json() as QueueConfig;
                if (!response.ok) {
                    throw new Error("Failed to load queue");
                }

                if (!cancelled) {
                    setQueueConfig(result);
                }
            } catch (error) {
                console.error("Failed to fetch queue config", error);
            }
        };

        void fetchQueueConfig();
        const interval = window.setInterval(() => {
            void fetchQueueConfig();
        }, 30_000);

        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, []);

    useEffect(() => {
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
                console.error("Failed to fetch creator options", error);
            }
        };

        void fetchCreatorOptions();

        return () => {
            cancelled = true;
        };
    }, []);

    const queueOrder = useMemo(() => queueConfig?.queue ?? [], [queueConfig]);
    const queuePositionMap = useMemo(() => {
        const map = new Map<string, number>();
        queueOrder.forEach((dropId, index) => {
            map.set(dropId, index);
        });
        return map;
    }, [queueOrder]);

    const projectedQueueSlotMap = useMemo(() => {
        const map = new Map<string, number>();
        if (!queueConfig || queueOrder.length === 0) {
            return map;
        }

        const projectedSlots = buildProjectedQueueSchedule(queueOrder.length, queueConfig.timesPerDay, Date.now());
        queueOrder.forEach((dropId, index) => {
            const slot = projectedSlots[index];
            if (Number.isFinite(slot)) {
                map.set(dropId, slot);
            }
        });
        return map;
    }, [queueConfig, queueOrder]);

    const creatorMap = useMemo(() => {
        const map = new Map<string, CreatorOption>();
        creatorOptions.forEach((creator) => {
            map.set(creator.uid, creator);
        });
        return map;
    }, [creatorOptions]);

    const visibleQueueIds = useMemo(
        () => new Set<string>([...Array.from(legacyQueueIds), ...queueOrder]),
        [legacyQueueIds, queueOrder],
    );

    const dropViewModels = useMemo(() => {
        const now = Date.now();

        return drops.map((drop) => {
            const creator = (drop.creatorId ? creatorMap.get(drop.creatorId) : undefined)
                ?? (drop.submittedByCreatorId ? creatorMap.get(drop.submittedByCreatorId) : undefined);
            const creatorLabel = creator?.displayName || buildCreatorFallback(drop);
            const creatorSecondary = creator?.username ? `@${creator.username}` : drop.creatorId || drop.submittedByCreatorId || null;
            const isQueueManaged = visibleQueueIds.has(drop.id);
            const queuePosition = queuePositionMap.has(drop.id) ? queuePositionMap.get(drop.id)! : null;
            const queueSlotMs = projectedQueueSlotMap.get(drop.id) ?? null;
            const queueSlotLabel = queueSlotMs ? formatAdminCompactDateTime(queueSlotMs) : null;

            let statusFilterValue: DropCardViewModel["statusFilter"] = "ended";
            let statusLabel = "Ended";
            let statusClassName = "border-white/10 bg-white/6 text-gray-300";

            if ((drop.approvalStatus || "approved") === "pending_review") {
                statusFilterValue = "pending_review";
                statusLabel = "Pending Review";
                statusClassName = "border-amber-400/20 bg-amber-500/10 text-amber-100";
            } else if (drop.approvalStatus === "rejected") {
                statusFilterValue = "rejected";
                statusLabel = "Rejected";
                statusClassName = "border-red-400/20 bg-red-500/10 text-red-200";
            } else if (isQueueManaged && queueSlotLabel) {
                statusFilterValue = "queued";
                statusLabel = "Queued";
                statusClassName = "border-cyan-400/20 bg-cyan-500/10 text-cyan-100";
            } else if (now < drop.validFrom) {
                statusFilterValue = "scheduled";
                statusLabel = "Scheduled";
                statusClassName = "border-white/15 bg-white/8 text-white";
            } else if (!drop.validUntil || now < drop.validUntil) {
                statusFilterValue = "live";
                statusLabel = "Live";
                statusClassName = "border-brand-purple/25 bg-brand-purple/14 text-brand-purple";
            }

            let schedulePrimaryLabel = `Starts ${formatAdminCompactDateTime(drop.validFrom)}`;
            let scheduleSecondaryLabel: string | null = drop.validUntil
                ? `Ends ${formatAdminCompactDateTime(drop.validUntil)}`
                : null;

            if (statusFilterValue === "queued" && queueSlotLabel) {
                schedulePrimaryLabel = `Queued for ${queueSlotLabel}`;
                scheduleSecondaryLabel = `Original start ${formatAdminCompactDateTime(drop.validFrom)}`;
            } else if (statusFilterValue === "live") {
                schedulePrimaryLabel = `Live since ${formatAdminCompactDateTime(drop.validFrom)}`;
                scheduleSecondaryLabel = drop.validUntil ? `Ends ${formatAdminCompactDateTime(drop.validUntil)}` : "No end time";
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
    }, [creatorMap, drops, projectedQueueSlotMap, queuePositionMap, visibleQueueIds]);

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

    const handleDelete = useCallback(async (id: string) => {
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
            toast.success("Drop deleted successfully");
        } catch (error: any) {
            console.error("Error deleting drop:", error);
            toast.error(error.message || "Failed to delete drop.");
        }
    }, []);

    const handleReviewSubmission = useCallback(async (dropId: string, approvalStatus: "approved" | "rejected") => {
        try {
            setReviewingDropId(dropId);
            const response = await authFetch("/api/admin/drops", {
                method: "PUT",
                body: JSON.stringify({
                    dropId,
                    dropData: {
                        approvalStatus,
                        approvalReviewedAt: Date.now(),
                    },
                }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(typeof result.error === "string" ? result.error : "Review failed");
            }

            toast.success(approvalStatus === "approved" ? "Creator drop approved" : "Creator drop rejected");
        } catch (error: any) {
            console.error("Failed to review creator drop", error);
            toast.error(error.message || "Review failed.");
        } finally {
            setReviewingDropId(null);
        }
    }, []);

    const toggleSelection = useCallback((id: string) => {
        setSelectedDropIds((current) => {
            const next = new Set(current);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const toggleAll = useCallback(() => {
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
    }, [filteredDrops, selectedDropIds]);

    const handleBulkDelete = useCallback(async () => {
        if (selectedDropIds.size === 0) {
            return;
        }

        if (!confirm(`Are you sure you want to delete ${selectedDropIds.size} drop(s)? This cannot be undone.`)) {
            return;
        }

        try {
            await Promise.all(Array.from(selectedDropIds).map((dropId) => authFetch("/api/admin/drops", {
                method: "DELETE",
                body: JSON.stringify({ dropId }),
            })));
            toast.success(`Successfully deleted ${selectedDropIds.size} drop(s).`);
            setSelectedDropIds(new Set());
        } catch (error) {
            console.error("Error bulk deleting drops:", error);
            toast.error("One or more drops failed to delete.");
        }
    }, [selectedDropIds]);

    const toggleAutoQueue = useCallback(async (dropId: string) => {
        try {
            const response = await authFetch("/api/admin/queue/toggle", {
                method: "POST",
                body: JSON.stringify({ dropId }),
            });
            const result = await response.json() as { added?: boolean; error?: string };
            if (!response.ok) {
                throw new Error(result.error);
            }

            const added = result.added === true;
            setQueueConfig((current) => current ? {
                ...current,
                queue: added
                    ? [...current.queue.filter((id) => id !== dropId), dropId]
                    : current.queue.filter((id) => id !== dropId),
            } : current);

            toast.success(added ? "Added to Queue" : "Removed from Queue");
        } catch (error: any) {
            console.error("Error toggling queue:", error);
            toast.error(error.message || "Failed to toggle queue state.");
        }
    }, []);

    const openNotificationDraft = useCallback((drop: Drop) => {
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
    }, []);

    const handleSendDropNotification = useCallback(async () => {
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
    }, [notificationDraft, sendingNotification]);

    const openCreateModal = useCallback(() => {
        setEditingDropId(null);
        setDuplicatingDropId(null);
        setIsCreateModalOpen(true);
    }, []);

    const closeCreateModal = useCallback(() => {
        setIsCreateModalOpen(false);
        setEditingDropId(null);
        setDuplicatingDropId(null);
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
            </div>
        );
    }

    return (
        <>
            <div className="pb-[calc(env(safe-area-inset-bottom)+5.5rem)] md:pb-10">
                <PageViewEvent eventName="admin_drops_viewed" />

                <AdminPageHeader
                    eyebrow="Admin Drops"
                    title="Manage Drops"
                    subtitle="Search, queue, edit, and create drops from a denser mobile workflow without losing any of the current controls."
                    actions={(
                        <>
                            <Link
                                href="/admin/queue"
                                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-white/20 whitespace-nowrap"
                            >
                                Manage Queue
                            </Link>
                            <button
                                type="button"
                                onClick={openCreateModal}
                                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-purple px-5 py-2 text-sm font-bold text-white shadow-lg shadow-brand-purple/20 transition-colors whitespace-nowrap"
                            >
                                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20">
                                    <PlusCircle className="h-3 w-3" />
                                </div>
                                Create Drop
                            </button>
                        </>
                    )}
                />

                {loadError ? (
                    <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                        {loadError}
                    </div>
                ) : null}

                <section className="mb-4 rounded-[1.8rem] border border-white/10 bg-black/55 p-3.5 shadow-xl shadow-black/20 backdrop-blur-xl md:p-4">
                    <div className="flex flex-col gap-3">
                        <label className="flex items-center gap-3 rounded-[1.35rem] border border-white/10 bg-black/45 px-3.5 py-3">
                            <Search className="h-4 w-4 shrink-0 text-gray-500" />
                            <input
                                type="text"
                                value={searchDraft}
                                onChange={(event) => setSearchDraft(event.target.value)}
                                placeholder="Search by title, creator, or ID"
                                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
                            />
                        </label>

                        <div className="-mx-1 overflow-x-auto pb-1">
                            <div className="flex min-w-max gap-2 px-1">
                                {STATUS_FILTER_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setStatusFilter(option.value)}
                                        className={cn(
                                            "min-h-10 rounded-full border px-3.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors",
                                            statusFilter === option.value
                                                ? "border-brand-purple/35 bg-brand-purple/18 text-white"
                                                : "border-white/10 bg-black/35 text-gray-400 hover:bg-white/8 hover:text-white",
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                            <SelectField
                                label="Creator"
                                value={creatorFilter}
                                onChange={setCreatorFilter}
                                options={creatorFilterOptions}
                            />
                            <SelectField
                                label="Sort"
                                value={sortMode}
                                onChange={(value) => setSortMode(value as DropSortMode)}
                                options={SORT_OPTIONS}
                            />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/6 pt-2.5">
                            <p className="text-xs text-gray-400">
                                {filteredDrops.length} of {drops.length} drops visible
                            </p>
                            {(searchDraft.length > 0 || statusFilter !== "all" || creatorFilter !== "all" || sortMode !== "last-active") ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchDraft("");
                                        setStatusFilter("all");
                                        setCreatorFilter("all");
                                        setSortMode("last-active");
                                    }}
                                    className="text-xs font-semibold text-gray-300 transition-colors hover:text-white"
                                >
                                    Clear filters
                                </button>
                            ) : null}
                        </div>
                    </div>

                </section>

                <section className="glass-panel overflow-hidden rounded-[2rem] border border-white/10">
                    {selectedDropIds.size > 0 ? (
                        <div className="flex items-center justify-between gap-3 border-b border-brand-purple/18 bg-brand-purple/10 px-4 py-3 md:px-6">
                            <span className="text-sm font-bold text-white">
                                {selectedDropIds.size} selected
                                {visibleSelectedCount > 0 && visibleSelectedCount !== selectedDropIds.size ? ` · ${visibleSelectedCount} visible` : ""}
                            </span>
                            <button
                                type="button"
                                onClick={handleBulkDelete}
                                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-red-500/20 bg-red-500/12 px-4 text-xs font-bold text-white transition-colors hover:bg-red-500/18"
                            >
                                <Trash2 className="h-4 w-4" />
                                Bulk Delete
                            </button>
                        </div>
                    ) : null}

                    <div className="flex flex-col gap-3 p-3 md:hidden">
                        {filteredDrops.map((item) => {
                            const { drop } = item;
                            const isExpanded = expandedDropId === drop.id;
                            const delaySeed = getDelaySeed(drop.id);

                            return (
                                <article
                                    key={drop.id}
                                    className="rounded-[1.55rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-3.5 shadow-[0_12px_30px_rgba(0,0,0,0.22)]"
                                >
                                    <div className="flex gap-3">
                                        <div className="relative h-[4.45rem] w-[4.45rem] shrink-0 overflow-hidden rounded-[1.15rem] border border-white/10 bg-black/55">
                                            {drop.imageUrl ? (
                                                <Image src={drop.imageUrl} alt={drop.title} fill sizes="72px" className="object-contain bg-black" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">KD</div>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                                                        {item.schedulePrimaryLabel}
                                                    </p>
                                                    <CompactTitleMarquee title={drop.title} delaySeed={delaySeed} className="mt-1 text-[0.92rem]" />
                                                </div>
                                                <button
                                                    type="button"
                                                    aria-expanded={isExpanded}
                                                    aria-label={isExpanded ? "Collapse drop details" : "Expand drop details"}
                                                    onClick={() => startTransition(() => setExpandedDropId((current) => current === drop.id ? null : drop.id))}
                                                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/40 text-gray-300 transition-colors hover:bg-white/8 hover:text-white"
                                                >
                                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                </button>
                                            </div>

                                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]", item.statusClassName)}>
                                                    {item.statusLabel}
                                                </span>
                                                {drop.submittedByCreatorId ? (
                                                    <span className="inline-flex rounded-full border border-brand-purple/20 bg-brand-purple/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-purple">
                                                        Creator submission
                                                    </span>
                                                ) : null}
                                                {item.queuePosition != null ? (
                                                    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-gray-300">
                                                        Slot {item.queuePosition + 1}
                                                    </span>
                                                ) : null}
                                            </div>

                                            <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
                                                <span className="inline-flex min-w-0 items-center gap-1 truncate">
                                                    <Clock3 className="h-3.5 w-3.5 shrink-0 text-brand-purple/80" />
                                                    <span className="truncate">{item.scheduleSecondaryLabel || item.creatorLabel}</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-center justify-between gap-3">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {drop.approvalStatus === "pending_review" ? (
                                                <>
                                                    <IconChipButton
                                                        label="Approve creator submission"
                                                        onClick={() => void handleReviewSubmission(drop.id, "approved")}
                                                        icon={Check}
                                                        tone="success"
                                                        disabled={reviewingDropId === drop.id}
                                                    />
                                                    <IconChipButton
                                                        label="Reject creator submission"
                                                        onClick={() => void handleReviewSubmission(drop.id, "rejected")}
                                                        icon={X}
                                                        tone="danger"
                                                        disabled={reviewingDropId === drop.id}
                                                    />
                                                </>
                                            ) : null}
                                            <IconChipButton
                                                label={item.isQueueManaged ? "Remove from queue" : "Add to queue"}
                                                onClick={() => void toggleAutoQueue(drop.id)}
                                                icon={Repeat}
                                                active={item.isQueueManaged}
                                            />
                                            <IconChipButton label="Send drop notification" onClick={() => openNotificationDraft(drop)} icon={BellRing} />
                                            <IconChipButton
                                                label="Duplicate drop"
                                                onClick={() => {
                                                    setEditingDropId(null);
                                                    setDuplicatingDropId(drop.id);
                                                    setIsCreateModalOpen(true);
                                                }}
                                                icon={Copy}
                                            />
                                            <IconChipButton
                                                label="Edit drop"
                                                onClick={() => {
                                                    setDuplicatingDropId(null);
                                                    setEditingDropId(drop.id);
                                                    setIsCreateModalOpen(true);
                                                }}
                                                icon={Edit}
                                            />
                                            <IconChipButton label="Delete drop" onClick={() => void handleDelete(drop.id)} icon={Trash2} tone="danger" />
                                        </div>

                                        <div className="shrink-0 text-right">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Price</p>
                                            <p className="mt-1 text-sm font-bold text-brand-purple">{drop.unlockCost} GD</p>
                                        </div>
                                    </div>

                                    {isExpanded ? (
                                        <div className="mt-3 space-y-3 rounded-[1.25rem] border border-white/8 bg-black/35 p-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Creator</p>
                                                    <p className="mt-1 text-sm text-white">{item.creatorLabel}</p>
                                                    <p className="mt-1 text-xs text-gray-500">{item.creatorSecondary || "No linked creator"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Performance</p>
                                                    <p className="mt-1 text-sm text-white">{(drop.totalUnlocks || 0).toLocaleString()} unwraps</p>
                                                    <p className="mt-1 text-xs text-gray-500">{(drop.totalClicks || 0).toLocaleString()} clicks</p>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-start gap-2 text-xs text-gray-300">
                                                    <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500" />
                                                    <div className="space-y-1">
                                                        <p>{item.schedulePrimaryLabel}</p>
                                                        {item.scheduleSecondaryLabel ? <p className="text-gray-500">{item.scheduleSecondaryLabel}</p> : null}
                                                        {item.uploadedLabel ? <p className="text-gray-500">Uploaded {item.uploadedLabel}</p> : null}
                                                    </div>
                                                </div>
                                                <p className="break-all text-[11px] text-gray-500">{drop.id}</p>
                                            </div>
                                        </div>
                                    ) : null}
                                </article>
                            );
                        })}

                        {filteredDrops.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <Package className="mx-auto mb-4 h-12 w-12 opacity-20" />
                                <p className="font-medium text-white">{drops.length === 0 ? "No drops found yet" : "No drops match these filters"}</p>
                                <p className="mt-2 text-sm text-gray-500">
                                    {drops.length === 0 ? "Create your first drop to populate the manager." : "Try a different search, creator, or status filter."}
                                </p>
                            </div>
                        ) : null}
                    </div>

                    <div className="hidden md:block">
                        <table className="w-full text-left">
                            <thead className="border-b border-white/5 bg-white/5 text-xs uppercase tracking-wider text-gray-400">
                                <tr>
                                    <th className="w-12 px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={filteredDrops.length > 0 && visibleSelectedCount === filteredDrops.length}
                                            onChange={toggleAll}
                                            className="h-4 w-4 cursor-pointer rounded border-white/20 bg-black/50 accent-brand-purple"
                                        />
                                    </th>
                                    <th className="px-6 py-4 font-bold">Drop</th>
                                    <th className="px-6 py-4 font-bold">Schedule</th>
                                    <th className="px-6 py-4 font-bold">Creator</th>
                                    <th className="px-6 py-4 font-bold">Performance</th>
                                    <th className="px-6 py-4 font-bold">Status</th>
                                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredDrops.map((item) => {
                                    const { drop } = item;
                                    const delaySeed = getDelaySeed(drop.id);

                                    return (
                                        <tr
                                            key={drop.id}
                                            className="group cursor-pointer transition-colors hover:bg-white/5"
                                            onClick={() => toggleSelection(drop.id)}
                                        >
                                            <td className="px-6 py-4" onClick={(event) => event.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDropIds.has(drop.id)}
                                                    onChange={() => toggleSelection(drop.id)}
                                                    className="h-4 w-4 cursor-pointer rounded border-white/20 bg-black/50 accent-brand-purple"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-800">
                                                        {drop.imageUrl ? (
                                                            <Image src={drop.imageUrl} alt={drop.title} fill sizes="48px" className="object-contain bg-black" />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white">KD</div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <CompactTitleMarquee title={drop.title} delaySeed={delaySeed} />
                                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                                            <span className="truncate">{drop.id}</span>
                                                            {drop.submittedByCreatorId ? (
                                                                <span className="rounded-full border border-brand-purple/20 bg-brand-purple/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-purple">
                                                                    Creator submission
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-semibold text-white">{item.schedulePrimaryLabel}</p>
                                                {item.scheduleSecondaryLabel ? <p className="mt-1 text-xs text-gray-500">{item.scheduleSecondaryLabel}</p> : null}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-semibold text-white">{item.creatorLabel}</p>
                                                <p className="mt-1 text-xs text-gray-500">{item.creatorSecondary || "No linked creator"}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-semibold text-white">
                                                    {(drop.totalUnlocks || 0).toLocaleString()} <span className="font-normal text-gray-500">unwraps</span>
                                                </p>
                                                <p className="mt-1 text-xs text-gray-500">
                                                    {(drop.totalClicks || 0).toLocaleString()} clicks | {drop.unlockCost} GD
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-bold", item.statusClassName)}>
                                                    {item.statusLabel}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                                    {drop.approvalStatus === "pending_review" ? (
                                                        <>
                                                            <IconChipButton
                                                                label="Approve creator submission"
                                                                onClick={() => void handleReviewSubmission(drop.id, "approved")}
                                                                icon={Check}
                                                                tone="success"
                                                                disabled={reviewingDropId === drop.id}
                                                            />
                                                            <IconChipButton
                                                                label="Reject creator submission"
                                                                onClick={() => void handleReviewSubmission(drop.id, "rejected")}
                                                                icon={X}
                                                                tone="danger"
                                                                disabled={reviewingDropId === drop.id}
                                                            />
                                                        </>
                                                    ) : null}
                                                    <IconChipButton
                                                        label={item.isQueueManaged ? "Remove from queue" : "Add to queue"}
                                                        onClick={() => void toggleAutoQueue(drop.id)}
                                                        icon={Repeat}
                                                        active={item.isQueueManaged}
                                                    />
                                                    <IconChipButton label="Send drop notification" onClick={() => openNotificationDraft(drop)} icon={BellRing} />
                                                    <IconChipButton
                                                        label="Duplicate drop"
                                                        onClick={() => {
                                                            setEditingDropId(null);
                                                            setDuplicatingDropId(drop.id);
                                                            setIsCreateModalOpen(true);
                                                        }}
                                                        icon={Copy}
                                                    />
                                                    <IconChipButton
                                                        label="Edit drop"
                                                        onClick={() => {
                                                            setDuplicatingDropId(null);
                                                            setEditingDropId(drop.id);
                                                            setIsCreateModalOpen(true);
                                                        }}
                                                        icon={Edit}
                                                    />
                                                    <IconChipButton label="Delete drop" onClick={() => void handleDelete(drop.id)} icon={Trash2} tone="danger" />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredDrops.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <Package className="mx-auto mb-4 h-12 w-12 opacity-20" />
                                <p className="font-medium text-white">{drops.length === 0 ? "No drops found yet" : "No drops match these filters"}</p>
                                <p className="mt-2 text-sm text-gray-500">
                                    {drops.length === 0 ? "Create your first drop to populate the manager." : "Try a different search, creator, or status filter."}
                                </p>
                            </div>
                        ) : null}
                    </div>
                </section>

                {notificationDraft ? (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                        <div className="glass-panel w-full max-w-md rounded-3xl border border-white/10 p-5">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black">
                                    <Image src={notificationDraft.imageUrl} alt={notificationDraft.title} fill sizes="48px" className="object-cover" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs uppercase tracking-wider text-gray-400">Drop notification</p>
                                    <p className="truncate text-sm font-semibold text-white">{notificationDraft.title}</p>
                                </div>
                            </div>

                            <textarea
                                value={notificationDraft.message}
                                onChange={(event) => setNotificationDraft((current) => current ? {
                                    ...current,
                                    message: event.target.value.slice(0, 150),
                                } : current)}
                                placeholder="Write a short update for this drop..."
                                className="h-28 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-gray-500 resize-none"
                            />
                            <div className="mt-2 text-right text-xs text-gray-400">
                                {notificationDraft.message.length}/150
                            </div>

                            <div className="mt-5 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setNotificationDraft(null)}
                                    className="rounded-full border border-white/15 px-4 py-2 text-sm text-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSendDropNotification}
                                    disabled={sendingNotification}
                                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                                >
                                    {sendingNotification ? "Sending..." : "Send"}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

                <CreateDropModal
                    isOpen={isCreateModalOpen}
                    onClose={closeCreateModal}
                    dropId={editingDropId}
                    duplicateFromId={duplicatingDropId}
                    onSuccess={closeCreateModal}
                />
            </div>

            <style jsx global>{`
                @keyframes admin-drop-title-marquee {
                    0%,
                    18%,
                    100% {
                        transform: translate3d(0, 0, 0);
                    }
                    34%,
                    58% {
                        transform: translate3d(var(--admin-title-shift), 0, 0);
                    }
                    76% {
                        transform: translate3d(0, 0, 0);
                    }
                }

                .admin-drop-title-marquee {
                    animation: admin-drop-title-marquee 17.5s cubic-bezier(0.23, 1, 0.32, 1) infinite;
                    will-change: transform;
                }

                @media (prefers-reduced-motion: reduce) {
                    .admin-drop-title-marquee {
                        animation: none;
                    }
                }
            `}</style>
        </>
    );
}
