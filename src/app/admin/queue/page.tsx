"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { authFetch } from "@/lib/authFetch";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ArrowUp, ArrowDown, Save, Clock, Calendar, RefreshCw, Trash2, GripVertical } from "lucide-react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { Drop } from "@/types/db";
import NextImage from "next/image";
import { format, addDays, startOfDay, parse } from "date-fns";
import { fromCSTInput, toCSTString } from "@/lib/timezone";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";

interface QueueConfig {
    queue: string[];
    dropsPerDay: number;
    cooldownDays: number;
    timesPerDay: string[];
}

export default function ManageQueuePage() {
    const [config, setConfig] = useState<QueueConfig | null>(null);
    const [drops, setDrops] = useState<Record<string, Drop>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function fetchQueueData() {
            try {
                const [queueRes, dropsSnap] = await Promise.all([
                    authFetch("/api/admin/queue"),
                    getDocs(collection(db, "drops"))
                ]);

                if (!queueRes.ok) throw new Error("Failed to fetch queue config");
                const queueData = await queueRes.json();

                const dropsMap: Record<string, Drop> = {};
                dropsSnap.forEach(doc => {
                    dropsMap[doc.id] = { id: doc.id, ...doc.data() } as Drop;
                });

                // Ensure timesPerDay array matches dropsPerDay
                let times = queueData.timesPerDay || ["12:00", "18:00"];
                if (times.length < queueData.dropsPerDay) {
                    times = [...times, ...Array(queueData.dropsPerDay - times.length).fill("12:00")];
                } else if (times.length > queueData.dropsPerDay) {
                    times = times.slice(0, queueData.dropsPerDay);
                }

                setConfig({
                    ...queueData,
                    timesPerDay: times
                });
                setDrops(dropsMap);
            } catch (err: any) {
                console.error(err);
                toast.error("Failed to load queue data");
            } finally {
                setLoading(false);
            }
        }

        fetchQueueData();
    }, []);

    const handleSave = async () => {
        if (!config) return;
        setSaving(true);
        try {
            const response = await authFetch("/api/admin/queue", {
                method: "PUT",
                body: JSON.stringify(config),
            });
            if (!response.ok) throw new Error("Save failed");
            toast.success("Queue configuration saved!");
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to save configuration.");
        } finally {
            setSaving(false);
        }
    };

    const moveDrop = (index: number, direction: 'up' | 'down') => {
        if (!config) return;
        const newQueue = [...config.queue];
        if (direction === 'up' && index > 0) {
            [newQueue[index - 1], newQueue[index]] = [newQueue[index], newQueue[index - 1]];
        } else if (direction === 'down' && index < newQueue.length - 1) {
            [newQueue[index + 1], newQueue[index]] = [newQueue[index], newQueue[index + 1]];
        }
        setConfig({ ...config, queue: newQueue });
    };

    const removeDrop = (index: number) => {
        if (!config) return;
        const newQueue = config.queue.filter((_, i) => i !== index);
        setConfig({ ...config, queue: newQueue });
    };

    // Simulate upcoming drop times
    const simulatedSchedule = useMemo(() => {
        if (!config || config.queue.length === 0 || config.dropsPerDay <= 0) return [];

        const schedule: { date: Date, timeStr: string }[] = [];
        let currDate = new Date();
        // Assume queue processing starts scheduling for tomorrow to be safe, or today if there's time. 
        // We'll just visualize from "Day 1".

        for (let i = 0; i < config.queue.length; i++) {
            const dayOffset = Math.floor(i / config.dropsPerDay);
            const slotIndex = i % config.dropsPerDay;
            const timeStr = config.timesPerDay[slotIndex] || "12:00";

            const scheduledDay = addDays(currDate, dayOffset);
            schedule.push({ date: scheduledDay, timeStr });
        }

        return schedule;
    }, [config]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
            </div>
        );
    }

    if (!config) return null;

    return (
        <div className="max-w-4xl mx-auto pb-32">
            <AdminPageHeader
                eyebrow="Admin Queue"
                topSlot={
                    <Link href="/admin/drops" className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white">
                        <ArrowLeft className="w-4 h-4" /> Back to Drops
                    </Link>
                }
                title="Manage Queue"
                subtitle="Configure your automated drop rotation and schedule."
                actions={
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-purple px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-purple/20 transition-all hover:bg-[#d946ef] disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Settings
                    </button>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                    <div className="glass-panel p-5 rounded-3xl space-y-4 shadow-lg border-white/5 bg-white/[0.02] sticky top-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-brand-purple" />
                            Schedule Settings
                        </h2>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-400 block">Drops Per Day</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={config.dropsPerDay}
                                    onChange={(e) => {
                                        const count = parseInt(e.target.value) || 1;
                                        let times = [...config.timesPerDay];
                                        if (times.length < count) {
                                            times = [...times, ...Array(count - times.length).fill("12:00")];
                                        } else if (times.length > count) {
                                            times = times.slice(0, count);
                                        }
                                        setConfig({ ...config, dropsPerDay: count, timesPerDay: times });
                                    }}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-brand-purple/50 shadow-inner"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-400 block">Time Slots (CST)</label>
                                {config.timesPerDay.map((time, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <div className="text-xs text-brand-purple font-mono font-bold w-6">#{idx + 1}</div>
                                        <input
                                            type="time"
                                            value={time}
                                            onChange={(e) => {
                                                const newTimes = [...config.timesPerDay];
                                                newTimes[idx] = e.target.value;
                                                setConfig({ ...config, timesPerDay: newTimes });
                                            }}
                                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-purple/50 shadow-inner [color-scheme:dark]"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-1.5 pt-2 border-t border-white/10">
                                <label className="text-sm font-bold text-gray-400 flex items-center gap-1.5">
                                    <RefreshCw className="w-4 h-4" />
                                    Return Cooldown (Days)
                                </label>
                                <p className="text-xs text-gray-500 mb-2">Wait time before a drop can be re-queued and activated again.</p>
                                <input
                                    type="number"
                                    min="1"
                                    value={config.cooldownDays}
                                    onChange={(e) => setConfig({ ...config, cooldownDays: parseInt(e.target.value) || 1 })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-brand-purple/50 shadow-inner"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="glass-panel rounded-3xl overflow-hidden shadow-lg border-white/5 bg-white/[0.02]">
                        <div className="px-6 py-4 border-b border-white/10 bg-black/20 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-brand-purple" />
                                Active Queue
                            </h2>
                            <span className="text-xs font-bold text-gray-500 bg-black/50 px-3 py-1 rounded-full border border-white/10">
                                {config.queue.length} items
                            </span>
                        </div>

                        <div className="p-4 flex flex-col gap-2">
                            {config.queue.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-2xl bg-black/20">
                                    <RefreshCw className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-400 font-medium">Queue is empty</p>
                                    <p className="text-sm text-gray-500 mt-1">Add drops to the queue from the Manage Drops page.</p>
                                </div>
                            ) : (
                                config.queue.map((dropId, index) => {
                                    const drop = drops[dropId];
                                    const sim = simulatedSchedule[index];

                                    if (!drop) {
                                        return (
                                            <div key={`${dropId}-${index}`} className="flex items-center p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                                Unknown Drop ID: {dropId}
                                                <button onClick={() => removeDrop(index)} className="ml-auto p-2 hover:bg-red-500/20 rounded-lg">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={`${dropId}-${index}`} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-black/40 border border-white/5 hover:bg-white/5 transition-colors group relative">

                                            <div className="flex w-full sm:w-auto items-center gap-3">
                                                {/* Drag handle */}
                                                <div className="text-gray-500 cursor-grab active:cursor-grabbing opacity-50 group-hover:opacity-100 p-2 -ml-2 hover:text-white hover:bg-white/5 rounded-lg transition-all hidden sm:block">
                                                    <GripVertical className="w-6 h-6" />
                                                </div>

                                                <div className="w-16 h-16 sm:w-14 sm:h-14 rounded-xl bg-zinc-800 border border-white/10 overflow-hidden relative shrink-0 shadow-inner">
                                                    {drop.imageUrl ? (
                                                        <NextImage src={drop.imageUrl} alt={drop.title} fill sizes="64px" className="object-cover" />
                                                    ) : null}
                                                </div>

                                                <div className="flex-1 min-w-0 sm:hidden">
                                                    <h3 className="font-bold text-white text-base truncate">{drop.title}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-bold tracking-widest uppercase bg-brand-purple/20 text-brand-purple px-2 py-0.5 rounded border border-brand-purple/20">
                                                            Slot {index + 1}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0 hidden sm:block">
                                                <h3 className="font-bold text-white text-base truncate">{drop.title}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-bold tracking-widest uppercase bg-brand-purple/20 text-brand-purple px-2 py-0.5 rounded border border-brand-purple/20">
                                                        Slot {index + 1}
                                                    </span>
                                                    {sim && (
                                                        <span className="text-xs text-gray-400 flex items-center gap-1 font-medium">
                                                            <Calendar className="w-3.5 h-3.5 text-brand-purple/70" /> {format(sim.date, 'MMM d')} @ {sim.timeStr}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {sim && (
                                                <div className="sm:hidden w-full bg-black/50 p-2.5 rounded-lg border border-white/5">
                                                    <span className="text-xs text-gray-400 flex justify-between items-center font-medium">
                                                        <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-brand-purple/70" /> Projected Release</span>
                                                        <span className="text-white font-mono bg-white/5 px-2 py-1 rounded-md">{format(sim.date, 'MMM d')} @ {sim.timeStr}</span>
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto mt-1 sm:mt-0 pt-3 sm:pt-0 border-t border-white/5 sm:border-0 shrink-0 gap-2">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => moveDrop(index, 'up')}
                                                        disabled={index === 0}
                                                        className="p-2 sm:p-1.5 rounded-lg sm:rounded bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors flex items-center justify-center w-12 sm:w-8 h-12 sm:h-8"
                                                    >
                                                        <ArrowUp className="w-5 h-5 sm:w-4 sm:h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => moveDrop(index, 'down')}
                                                        disabled={index === config.queue.length - 1}
                                                        className="p-2 sm:p-1.5 rounded-lg sm:rounded bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors flex items-center justify-center w-12 sm:w-8 h-12 sm:h-8"
                                                    >
                                                        <ArrowDown className="w-5 h-5 sm:w-4 sm:h-4" />
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => removeDrop(index)}
                                                    className="p-2 sm:p-2 sm:ml-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-300 transition-colors flex items-center justify-center w-12 sm:w-auto h-12 sm:h-auto font-bold uppercase"
                                                    title="Remove from queue"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                    <span className="hidden sm:inline-block ml-2 text-xs font-bold uppercase tracking-wider">Remove</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
