"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { Drop } from "@/types/db";
import { format } from "date-fns";
import { Trash2, Edit, Calendar, Clock, Package, PlusCircle, BellRing } from "lucide-react";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/authFetch";
import { toast } from "sonner";
import Image from "next/image";
import { sendNotification } from "@/lib/notifications";

interface DropNotificationDraft {
    dropId: string;
    title: string;
    imageUrl: string;
    message: string;
}

export default function AdminDropsPage() {
    const [drops, setDrops] = useState<Drop[]>([]);
    const [loading, setLoading] = useState(true);
    const [notificationDraft, setNotificationDraft] = useState<DropNotificationDraft | null>(null);
    const [sendingNotification, setSendingNotification] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "drops"), orderBy("validFrom", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const dropsData: Drop[] = [];
            snapshot.forEach((doc) => {
                dropsData.push({ id: doc.id, ...doc.data() } as Drop);
            });
            setDrops(dropsData);
            setLoading(false);
        });

        return () => unsubscribe();
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

        toast.success("Drop notification sent.");
        setNotificationDraft(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 rounded-full border-2 border-brand-pink border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div>
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Manage Drops</h1>
                    <p className="text-gray-400">View and manage all content drops.</p>
                </div>
                <Link
                    href="/admin/create"
                    className="px-5 py-2 rounded-full bg-brand-pink font-bold text-white text-sm transition-colors shadow-lg shadow-brand-pink/20 flex items-center gap-2 whitespace-nowrap"
                >
                    <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                        <PlusCircle className="w-3 h-3" />
                    </div>
                    Create Drop
                </Link>
            </header>

            <div className="glass-panel rounded-3xl overflow-hidden">
                <div className="hidden md:block">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 border-b border-white/5 text-gray-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 font-bold">Drop Details</th>
                                <th className="px-6 py-4 font-bold">Schedule</th>
                                <th className="px-6 py-4 font-bold">Cost</th>
                                <th className="px-6 py-4 font-bold">Status</th>
                                <th className="px-6 py-4 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {drops.map((drop) => {
                                const now = Date.now();
                                let status = "expired";
                                let statusColor = "bg-red-500/10 text-red-400 border-red-500/20";

                                if (now < drop.validFrom) {
                                    status = "scheduled";
                                    statusColor = "bg-brand-yellow/10 text-brand-yellow border-brand-yellow/20";
                                } else if (!drop.validUntil || now < drop.validUntil) {
                                    status = "active";
                                    statusColor = "bg-brand-green/10 text-brand-green border-brand-green/20";
                                }

                                return (
                                    <tr key={drop.id} className="transition-colors group">
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
                                                    <div className="text-xs text-gray-500 mt-1">{drop.id}</div>
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
                                            <div className="flex items-center gap-1 font-mono font-bold text-brand-yellow">
                                                {drop.unlockCost}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold border capitalize", statusColor)}>
                                                {status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openNotificationDraft(drop)}
                                                    className="p-2.5 rounded-full bg-black text-gray-200 hover:bg-white/10 transition-colors border border-white/10"
                                                    title="Send drop notification"
                                                >
                                                    <BellRing className="w-4 h-4" />
                                                </button>
                                                <Link
                                                    href={`/admin/create?id=${drop.id}`}
                                                    className="p-2.5 rounded-full bg-black text-white hover:bg-white/10 transition-colors border border-white/10"
                                                    title="Edit"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(drop.id)}
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
                        let status = "expired";
                        let statusColor = "bg-red-500/10 text-red-400 border-red-500/20";

                        if (now < drop.validFrom) {
                            status = "scheduled";
                            statusColor = "bg-brand-yellow/10 text-brand-yellow border-brand-yellow/20";
                        } else if (!drop.validUntil || now < drop.validUntil) {
                            status = "active";
                            statusColor = "bg-brand-green/10 text-brand-green border-brand-green/20";
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
                                        <span className="text-[10px] font-bold text-brand-yellow">{drop.unlockCost}</span>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-white truncate pr-2">{drop.title}</h3>
                                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize shrink-0", statusColor)}>
                                            {status}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-400 flex items-center gap-3">
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(drop.validFrom, "MMM d")}</span>
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(drop.validFrom, "HH:mm")}</span>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-1">
                                        <button
                                            onClick={() => openNotificationDraft(drop)}
                                            className="px-3 py-1.5 rounded-full bg-black border border-white/10 text-gray-200 text-xs font-bold transition-colors flex items-center gap-1 hover:bg-white/10"
                                        >
                                            <BellRing className="w-3 h-3" /> Notify
                                        </button>
                                        <Link
                                            href={`/admin/create?id=${drop.id}`}
                                            className="px-3 py-1.5 rounded-full bg-black border border-white/10 text-white text-xs font-bold transition-colors flex items-center gap-1 hover:bg-white/10"
                                        >
                                            <Edit className="w-3 h-3" /> Edit
                                        </Link>
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
        </div >
    );
}
