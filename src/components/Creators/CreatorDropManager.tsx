"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Package, Plus, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";

import { CreateDropModal } from "@/components/Admin/CreateDropModal";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";

type CreatorDropReviewStatus = "draft" | "pending_admin_approval" | "approved" | "needs_changes" | "rejected";

type CreatorDropRow = {
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    status?: string;
    approvalStatus?: string;
    reviewStatus?: string;
    publicDiscovery?: boolean;
    rotationEligibility?: boolean;
};

const REVIEW_TABS: Array<{
    id: CreatorDropReviewStatus;
    label: string;
    icon: typeof Package;
}> = [
    { id: "draft", label: "Drafts", icon: Package },
    { id: "pending_admin_approval", label: "Pending review", icon: Clock3 },
    { id: "approved", label: "Approved/live", icon: CheckCircle2 },
    { id: "needs_changes", label: "Needs changes", icon: AlertCircle },
    { id: "rejected", label: "Rejected", icon: XCircle },
];

function classifyDrop(drop: CreatorDropRow): CreatorDropReviewStatus {
    if (drop.reviewStatus === "needs_changes") return "needs_changes";
    if (drop.reviewStatus === "rejected" || drop.approvalStatus === "rejected") return "rejected";
    if (drop.reviewStatus === "approved" || drop.approvalStatus === "approved") return "approved";
    if (drop.reviewStatus === "pending_admin_approval" || drop.approvalStatus === "pending_review") return "pending_admin_approval";
    return "draft";
}

export function CreatorDropManager() {
    const { user } = useAuth();
    const [drops, setDrops] = useState<CreatorDropRow[]>([]);
    const [activeTab, setActiveTab] = useState<CreatorDropReviewStatus>("pending_admin_approval");
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const loadDrops = useCallback(async () => {
        setLoading(true);
        try {
            const response = await authFetch("/api/creator/drops?limit=100");
            const result = await response.json() as { drops?: CreatorDropRow[]; error?: string };
            if (!response.ok) {
                throw new Error(result.error || "Unable to load creator drops.");
            }
            setDrops(Array.isArray(result.drops) ? result.drops : []);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to load creator drops.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadDrops();
    }, [loadDrops]);

    const tabCounts = useMemo(() => {
        return REVIEW_TABS.reduce<Record<CreatorDropReviewStatus, number>>((acc, tab) => {
            acc[tab.id] = drops.filter((drop) => classifyDrop(drop) === tab.id).length;
            return acc;
        }, {
            draft: 0,
            pending_admin_approval: 0,
            approved: 0,
            needs_changes: 0,
            rejected: 0,
        });
    }, [drops]);

    const visibleDrops = useMemo(
        () => drops.filter((drop) => classifyDrop(drop) === activeTab),
        [activeTab, drops],
    );

    return (
        <main
            className="min-h-screen bg-[#0b0614] px-4 pb-24 pt-6 text-white sm:px-6 lg:px-8"
            data-creator-drop-manager="true"
            data-drop-manager-surface="creator_submission"
            data-admin-approval-required="true"
        >
            <section className="mx-auto flex w-full max-w-5xl flex-col gap-5">
                <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/20 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="space-y-1.5">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-purple">Creator tools</p>
                        <h1 className="text-2xl font-black tracking-normal text-white sm:text-3xl">Manage drops</h1>
                        <p className="max-w-2xl text-sm leading-6 text-gray-300">Submit drops for admin approval before they go live.</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => void loadDrops()}
                            className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 text-sm font-bold text-gray-100 transition-colors hover:bg-white/10"
                            aria-label="Refresh creator drops"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-brand-purple px-4 text-sm font-black text-white shadow-lg shadow-brand-purple/30 transition-transform hover:scale-[1.01]"
                        >
                            <Plus className="h-4 w-4" />
                            Submit drop
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {REVIEW_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex min-h-16 flex-col justify-between rounded-xl border p-3 text-left transition-colors ${active ? "border-brand-purple/60 bg-brand-purple/20" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"}`}
                            >
                                <span className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-300">
                                    {tab.label}
                                    <Icon className="h-3.5 w-3.5" />
                                </span>
                                <span className="text-xl font-black text-white">{tabCounts[tab.id]}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                    {loading ? (
                        <p className="py-8 text-center text-sm text-gray-300">Loading creator drops...</p>
                    ) : visibleDrops.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                            <Package className="h-8 w-8 text-brand-purple" />
                            <div>
                                <p className="text-base font-black text-white">No creator drops submitted yet.</p>
                                <p className="mt-1 text-sm text-gray-400">Use Submit drop when a Drop is ready for review.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {visibleDrops.map((drop) => (
                                <article key={drop.id} className="flex gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                                    {drop.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={drop.imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
                                    ) : (
                                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white/5">
                                            <Package className="h-5 w-5 text-gray-400" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <h2 className="truncate text-sm font-black text-white">{drop.title}</h2>
                                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-400">{drop.description || "No description provided."}</p>
                                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-300">
                                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{drop.reviewStatus || drop.approvalStatus || "draft"}</span>
                                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">Admin approval required</span>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <CreateDropModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    setIsModalOpen(false);
                    void loadDrops();
                }}
                mode="creator"
                creatorIdOverride={user?.uid || null}
            />
        </main>
    );
}
