"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { Drop } from "@/types/db";
import { format } from "date-fns";
import { Trash2, Edit, Calendar, Clock, Package, PlusCircle, BellRing, Repeat } from "lucide-react";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/authFetch";
import { toast } from "sonner";
import Image from "next/image";
import { sendNotification } from "@/lib/notifications";
import { CreateDropModal } from "@/components/Admin/CreateDropModal";
import { normalizeDropRecord } from "@/lib/drop-normalizers";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";

interface DropNotificationDraft {
    dropId: string;
    title: string;
    imageUrl: string;
    message: string;
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

    const [queueIds, setQueueIds] = useState<Set<string>>(new Set());
    const [legacyQueueIds, setLegacyQueueIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const q = query(collection(db, "drops"), orderBy("validFrom", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const dropsData: Drop[] = [];
            const nextLegacyQueueIds = new Set<string>();
            snapshot.forEach((doc) => {
                const raw = doc.data() as Record<string, unknown>;
                try {
                    dropsData.push(normalizeDropRecord(raw, doc.id));
                } catch {
                    dropsData.push({ id: doc.id, ...raw } as Drop);
                }

                const rotationConfig = raw.rotationConfig as Record<string, unknown> | undefined;
                if (rotationConfig?.enabled === true) {
                    nextLegacyQueueIds.add(doc.id);
                }
            });
            setDrops(dropsData);
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

        const fetchQueueMembership = async () => {
            try {
                const response = await authFetch("/api/admin/queue");
                const result = await response.json() as { queue?: string[] };
                if (!response.ok) {
                    throw new Error("Failed to load queue");
                }

                if (!cancelled) {
                    setQueueIds(new Set(Array.isArray(result.queue) ? result.queue : []));
                }
            } catch (error) {
                console.error("Failed to fetch queue membership", error);
            }
        };

        void fetchQueueMembership();
        const interval = window.setInterval(() => {
            void fetchQueueMembership();
        }, 30_000);

        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, []);

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this drop? This cannot be undone.")) {
            try {
                const response = await authFetch("/api/admin/drops", {
                    method: "DELETE",
                    body: JSON.stringify({ dropId: id }),
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error);
                toast.success("Drop deleted successfully");
            } catch (err: any) {
                console.error("Error deleting drop:", err);
                toast.error(err.message || "Failed to delete drop.");
            }
        }
    };

    const handleReviewSubmission = async (dropId: string, approvalStatus: "approved" | "rejected") => {
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
    };

    const toggleSelection = (id: string) => {
        setSelectedDropIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedDropIds.size === drops.length && drops.length > 0) {
            setSelectedDropIds(new Set());
        } else {
            setSelectedDropIds(new Set(drops.map((d) => d.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedDropIds.size === 0) return;
        if (confirm(`Are you sure you want to delete ${selectedDropIds.size} drop(s)? This cannot be undone.`)) {
            try {
                const limit = Array.from(selectedDropIds);
                await Promise.all(limit.map(id => authFetch("/api/admin/drops", { method: "DELETE", body: JSON.stringify({ dropId: id }) })));
                toast.success(`Successfully deleted ${selectedDropIds.size} drop(s).`);
                setSelectedDropIds(new Set());
            } catch (err: any) {
                console.error("Error bulk deleting drops:", err);
                toast.error("One or more drops failed to delete.");
            }
        }
    };

    const toggleAutoQueue = async (dropId: string) => {
        try {
            const response = await authFetch("/api/admin/queue/toggle", {
                method: "POST",
                body: JSON.stringify({ dropId }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            toast.success(result.added ? "Added to Queue" : "Removed from Queue");
            setQueueIds((prev) => {
                const next = new Set(prev);
                if (result.added) {
                    next.add(dropId);
                } else {
                    next.delete(dropId);
                }
                return next;
            });
        } catch (err: any) {
            console.error("Error toggling queue:", err);
            toast.error(err.message || "Failed to toggle queue state.");
        }
    };

    const openNotificationDraft = (drop: Drop) => {
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
    };

    const handleSendDropNotification = async () => {
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
            link: `/drops`,
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
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 rounded-full border-2 border-brand-purple border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div>
            <PageViewEvent eventName="admin_drops_viewed" />
            <AdminPageHeader
                eyebrow="Admin Drops"
                title="Manage Drops"
                subtitle="View and manage all content drops."
                actions={
                    <>
                    <Link
                        href="/admin/queue"
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-white/20 whitespace-nowrap"
                    >
                        Manage Queue
                    </Link>
                    <button
                        onClick={() => {
                            setEditingDropId(null);
                            setDuplicatingDropId(null);
                            setIsCreateModalOpen(true);
                        }}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-purple px-5 py-2 text-sm font-bold text-white shadow-lg shadow-brand-purple/20 transition-colors whitespace-nowrap"
                    >
                        <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                            <PlusCircle className="w-3 h-3" />
                        </div>
                        Create Drop
                    </button>
                    </>
                }
            />

            {loadError ? (
                <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                    {loadError}
                </div>
            ) : null}

            <div className="glass-panel rounded-3xl overflow-hidden">
                {selectedDropIds.size > 0 && (
                    <div className="bg-brand-purple/10 px-6 py-4 flex items-center justify-between border-b border-brand-purple/20">
                        <span className="text-white font-bold">{selectedDropIds.size} item(s) selected</span>
                        <div className="flex items-center gap-3">
                            <button onClick={handleBulkDelete} className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-full transition-colors border border-red-500/20 flex gap-2 items-center">
                                <Trash2 className="w-4 h-4" /> Bulk Delete
                            </button>
                        </div>
                    </div>
                )}
                <div className="hidden md:block">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 border-b border-white/5 text-gray-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 w-12">
                                    <input
                                        type="checkbox"
                                        checked={drops.length > 0 && selectedDropIds.size === drops.length}
                                        onChange={toggleAll}
                                        className="w-4 h-4 rounded border-white/20 bg-black/50 accent-brand-purple cursor-pointer"
                                    />
                                </th>
                                <th className="px-6 py-4 font-bold">Drop Details</th>
                                <th className="px-6 py-4 font-bold">Schedule</th>
                                <th className="px-6 py-4 font-bold">Cost</th>
                                <th className="px-6 py-4 font-bold">Performance</th>
                                <th className="px-6 py-4 font-bold">Status</th>
                                <th className="px-6 py-4 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {drops.map((drop) => {
                                const now = Date.now();
                                const isQueueManaged = queueIds.has(drop.id) || legacyQueueIds.has(drop.id);
                                let displayStatus = "expired";
                                let statusColor = "bg-red-500/10 text-red-400 border-red-500/20";
                                const approvalStatus = drop.approvalStatus || "approved";
                                const isCreatorSubmission = Boolean(drop.submittedByCreatorId);

                                if (approvalStatus === "pending_review") {
                                    displayStatus = "pending review";
                                    statusColor = "bg-amber-500/10 text-amber-200 border-amber-500/20";
                                } else if (approvalStatus === "rejected") {
                                    displayStatus = "rejected";
                                    statusColor = "bg-red-500/10 text-red-300 border-red-500/20";
                                } else if (now < drop.validFrom) {
                                    displayStatus = "scheduled";
                                    statusColor = "bg-white/10 text-white border-white/15";
                                } else if (!drop.validUntil || now < drop.validUntil) {
                                    displayStatus = "active";
                                    statusColor = "bg-brand-purple/10 text-brand-purple border-brand-purple/20";
                                }

                                return (
                                    <tr key={drop.id} className="transition-colors group hover:bg-white/5 cursor-pointer" onClick={() => toggleSelection(drop.id)}>
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selectedDropIds.has(drop.id)}
                                                onChange={() => toggleSelection(drop.id)}
                                                className="w-4 h-4 rounded border-white/20 bg-black/50 accent-brand-purple cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden shrink-0 border border-white/10 relative">
                                                    {drop.imageUrl ? (
                                                        <Image src={drop.imageUrl} alt={drop.title} fill sizes="48px" className="object-contain bg-black" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xl">🍬</div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white">{drop.title}</div>
                                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                                        <span>{drop.id}</span>
                                                        {isCreatorSubmission ? (
                                                            <span className="rounded-full border border-brand-purple/20 bg-brand-purple/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-purple">
                                                                Creator submission
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-300 flex items-center gap-2">
                                                <Calendar className="w-3 h-3 text-gray-500" />
                                                {format(drop.validFrom, "MMM d, HH:mm")}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                                <Clock className="w-3 h-3" />
                                                {drop.validUntil ? format(drop.validUntil, "MMM d, HH:mm") : "Forever"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 font-mono font-bold text-brand-purple">
                                                {drop.unlockCost}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <div className="text-white font-bold">{drop.totalUnlocks || 0} <span className="text-gray-500 font-normal">Unwraps</span></div>
                                                <div className="text-xs text-gray-500 mt-0.5">{drop.totalClicks || 0} Clicks</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold border capitalize", statusColor)}>
                                                {displayStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {approvalStatus === "pending_review" ? (
                                                    <>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                void handleReviewSubmission(drop.id, "approved");
                                                            }}
                                                            disabled={reviewingDropId === drop.id}
                                                            className="px-3 py-1.5 rounded-full bg-brand-purple/15 border border-brand-purple/20 text-brand-purple text-xs font-bold transition-colors flex items-center gap-1 hover:bg-brand-purple/20 disabled:opacity-60"
                                                            title="Approve creator submission"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                void handleReviewSubmission(drop.id, "rejected");
                                                            }}
                                                            disabled={reviewingDropId === drop.id}
                                                            className="px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-bold transition-colors flex items-center gap-1 hover:bg-red-500/15 disabled:opacity-60"
                                                            title="Reject creator submission"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                ) : null}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        void toggleAutoQueue(drop.id);
                                                    }}
                                                    className={cn("p-2.5 rounded-full text-white hover:bg-white/10 transition-colors border border-white/10", isQueueManaged ? "bg-brand-purple/20 border-brand-purple/30 text-brand-purple" : "bg-black")}
                                                    title={isQueueManaged ? "Remove from Queue" : "Add to Queue"}
                                                >
                                                    <Repeat className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openNotificationDraft(drop);
                                                    }}
                                                    className="p-2.5 rounded-full bg-black text-gray-200 hover:bg-white/10 transition-colors border border-white/10"
                                                    title="Send drop notification"
                                                >
                                                    <BellRing className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingDropId(null);
                                                        setDuplicatingDropId(drop.id);
                                                        setIsCreateModalOpen(true);
                                                    }}
                                                    className="px-3 py-1.5 rounded-full bg-black border border-white/10 text-white text-xs font-bold transition-colors flex items-center gap-1 hover:bg-white/10"
                                                    title="Duplicate"
                                                >
                                                    Duplicate
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDuplicatingDropId(null);
                                                        setEditingDropId(drop.id);
                                                        setIsCreateModalOpen(true);
                                                    }}
                                                    className="p-2.5 rounded-full bg-black text-white hover:bg-white/10 transition-colors border border-white/10"
                                                    title="Edit"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        void handleDelete(drop.id);
                                                    }}
                                                    className="p-2.5 rounded-full bg-black text-red-500 hover:bg-red-500/10 transition-colors border border-white/10"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="md:hidden flex flex-col divide-y divide-white/5">
                    {drops.map((drop) => {
                        const now = Date.now();
                        const isQueueManaged = queueIds.has(drop.id) || legacyQueueIds.has(drop.id);
                        let displayStatus = "expired";
                        let statusColor = "bg-red-500/10 text-red-400 border-red-500/20";
                        const approvalStatus = drop.approvalStatus || "approved";
                        const isCreatorSubmission = Boolean(drop.submittedByCreatorId);

                        if (approvalStatus === "pending_review") {
                            displayStatus = "pending review";
                            statusColor = "bg-amber-500/10 text-amber-200 border-amber-500/20";
                        } else if (approvalStatus === "rejected") {
                            displayStatus = "rejected";
                            statusColor = "bg-red-500/10 text-red-300 border-red-500/20";
                        } else if (now < drop.validFrom) {
                            displayStatus = "scheduled";
                            statusColor = "bg-white/10 text-white border-white/15";
                        } else if (!drop.validUntil || now < drop.validUntil) {
                            displayStatus = "active";
                            statusColor = "bg-brand-purple/10 text-brand-purple border-brand-purple/20";
                        }

                        return (
                            <div key={drop.id} className="p-4 flex gap-4 items-start active:bg-white/5 transition-colors">
                                <div className="w-16 h-16 rounded-xl bg-zinc-800 overflow-hidden shrink-0 border border-white/10 relative">
                                    {drop.imageUrl ? (
                                        <Image src={drop.imageUrl} alt={drop.title} fill sizes="64px" className="object-contain bg-black" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-2xl">🍬</div>
                                    )}
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-0.5 text-center">
                                        <span className="text-[10px] font-bold text-brand-purple">{drop.unlockCost}</span>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div className="min-w-0 pr-2">
                                            <h3 className="font-bold text-white truncate">{drop.title}</h3>
                                            {isCreatorSubmission ? (
                                                <span className="mt-1 inline-flex rounded-full border border-brand-purple/20 bg-brand-purple/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-purple">
                                                    Creator submission
                                                </span>
                                            ) : null}
                                        </div>
                                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize shrink-0", statusColor)}>
                                            {displayStatus}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-400 flex items-center gap-3">
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(drop.validFrom, "MMM d")}</span>
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(drop.validFrom, "HH:mm")}</span>
                                        <span className="flex items-center gap-1 text-brand-purple font-bold ml-auto">{drop.totalUnlocks || 0} Unwraps</span>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-1">
                                        {approvalStatus === "pending_review" ? (
                                            <>
                                                <button
                                                    onClick={() => void handleReviewSubmission(drop.id, "approved")}
                                                    disabled={reviewingDropId === drop.id}
                                                    className="px-3 py-1.5 rounded-full border border-brand-purple/20 bg-brand-purple/10 text-brand-purple text-xs font-bold transition-colors flex items-center gap-1 hover:bg-brand-purple/20 disabled:opacity-60"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => void handleReviewSubmission(drop.id, "rejected")}
                                                    disabled={reviewingDropId === drop.id}
                                                    className="px-3 py-1.5 rounded-full border border-red-500/20 bg-red-500/10 text-red-300 text-xs font-bold transition-colors flex items-center gap-1 hover:bg-red-500/15 disabled:opacity-60"
                                                >
                                                    Reject
                                                </button>
                                            </>
                                        ) : null}
                                        <button
                                            onClick={() => toggleAutoQueue(drop.id)}
                                            className={cn("px-3 py-1.5 rounded-full border border-white/10 text-xs font-bold transition-colors flex items-center gap-1 hover:bg-white/10", isQueueManaged ? "bg-brand-purple/20 border-brand-purple/30 text-brand-purple" : "bg-black text-gray-200")}
                                        >
                                            <Repeat className="w-3 h-3" /> Queue
                                        </button>
                                        <button
                                            onClick={() => openNotificationDraft(drop)}
                                            className="px-3 py-1.5 rounded-full bg-black border border-white/10 text-gray-200 text-xs font-bold transition-colors flex items-center gap-1 hover:bg-white/10"
                                        >
                                            <BellRing className="w-3 h-3" /> Notify
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingDropId(drop.id);
                                                setIsCreateModalOpen(true);
                                            }}
                                            className="px-3 py-1.5 rounded-full bg-black border border-white/10 text-white text-xs font-bold transition-colors flex items-center gap-1 hover:bg-white/10"
                                        >
                                            <Edit className="w-3 h-3" /> Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(drop.id)}
                                            className="px-3 py-1.5 rounded-full bg-black border border-white/10 text-red-500 text-xs font-bold transition-colors flex items-center gap-1 hover:bg-red-500/10"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {drops.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No drops found. Create your first one!</p>
                    </div>
                )}
            </div>

            {notificationDraft && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md glass-panel rounded-3xl border border-white/10 p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/10 bg-black shrink-0">
                                <Image src={notificationDraft.imageUrl} alt={notificationDraft.title} fill sizes="48px" className="object-cover" />
                            </div>
                            <div>
                                <p className="text-xs uppercase text-gray-400 tracking-wider">Drop notification</p>
                                <p className="text-sm font-semibold text-white truncate">{notificationDraft.title}</p>
                            </div>
                        </div>

                        <textarea
                            value={notificationDraft.message}
                            onChange={(event) => setNotificationDraft((prev) => prev ? { ...prev, message: event.target.value.slice(0, 150) } : prev)}
                            placeholder="Write a short update for this drop..."
                            className="w-full h-28 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-gray-500 resize-none"
                        />
                        <div className="mt-2 text-right text-xs text-gray-400">
                            {notificationDraft.message.length}/150
                        </div>

                        <div className="flex items-center justify-end gap-2 mt-5">
                            <button
                                onClick={() => setNotificationDraft(null)}
                                className="px-4 py-2 rounded-full border border-white/15 text-sm text-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendDropNotification}
                                disabled={sendingNotification}
                                className="px-4 py-2 rounded-full bg-white text-black font-semibold text-sm disabled:opacity-50"
                            >
                                {sendingNotification ? "Sending..." : "Send"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CreateDropModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setDuplicatingDropId(null);
                }}
                dropId={editingDropId}
                duplicateFromId={duplicatingDropId}
                onSuccess={() => {
                    setIsCreateModalOpen(false);
                    setDuplicatingDropId(null);
                }}
            />
        </div >
    );
}
