"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { Drop } from "@/types/db";
import { normalizeDropRecord } from "@/lib/drop-normalizers";
import { Lock } from "lucide-react";
import { useUI } from "@/context/UIContext";

export function LivePreviews() {
    const [drops, setDrops] = useState<Drop[]>([]);
    const [loading, setLoading] = useState(true);
    const { openAuthModal } = useUI();

    useEffect(() => {
        async function fetchSamples() {
            try {
                // Fetch up to 6 active drops
                const q = query(
                    collection(db, "drops"),
                    where("status", "==", "active"),
                    orderBy("createdAt", "desc"),
                    limit(6)
                );
                const snapshot = await getDocs(q);
                const list: Drop[] = [];
                snapshot.forEach((doc) => {
                    try {
                        list.push(normalizeDropRecord(doc.data(), doc.id));
                    } catch {
                        // ignore malformed
                    }
                });
                setDrops(list);
            } catch (err) {
                console.error("Failed to load sample drops", err);
            } finally {
                setLoading(false);
            }
        }
        fetchSamples();
    }, []);

    if (loading || drops.length === 0) return null;

    return (
        <section className="py-24 bg-black relative">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Latest Experiences</h2>
                        <p className="text-gray-400 text-lg max-w-xl">Real content living on the platform right now.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {drops.map((drop) => (
                        <div
                            key={drop.id}
                            onClick={openAuthModal}
                            className="group cursor-pointer rounded-3xl overflow-hidden glass-panel border border-white/5 relative aspect-[4/5] bg-zinc-900"
                        >
                            {/* Blurred Image Background */}
                            {drop.imageUrl && (
                                <img
                                    src={drop.imageUrl}
                                    alt={drop.title}
                                    className="absolute inset-0 w-full h-full object-cover blur-md scale-110 opacity-60 group-hover:scale-125 group-hover:blur-lg transition-all duration-700"
                                />
                            )}

                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent flex flex-col justify-end p-6">
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-white">
                                        <Lock className="w-6 h-6" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{drop.title}</h3>
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 rounded-full bg-brand-purple/20 text-brand-purple text-xs font-bold border border-brand-purple/30">
                                        {drop.unlockCost} GD
                                    </span>
                                    <span className="text-xs text-gray-400">{drop.totalUnlocks || 0} unwraps</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
