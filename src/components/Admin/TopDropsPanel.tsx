"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { Drop } from "@/types/db";
import { normalizeDropRecord } from "@/lib/drop-normalizers";

/**
 * Displays the top 5 drops ranked by unwrap count.
 * Owns its own onSnapshot listener for the drops collection.
 */
export function TopDropsPanel() {
    const [drops, setDrops] = useState<Drop[]>([]);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "drops"), (snapshot) => {
            const list: Drop[] = [];
            snapshot.forEach((doc) => {
                try { list.push(normalizeDropRecord(doc.data(), doc.id)); } catch { /* skip malformed */ }
            });
            setDrops(list);
        });
        return () => unsub();
    }, []);

    const topDrops = useMemo(
        () => [...drops].sort((a, b) => (b.totalUnlocks || 0) - (a.totalUnlocks || 0)).slice(0, 5),
        [drops],
    );

    return (
        <div className="glass-panel p-4 md:p-6 rounded-3xl border border-white/10">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">Top Performing Drops</h3>
                <span className="text-xs text-gray-400">By unwrap count</span>
            </div>
            <div className="space-y-4">
                {topDrops.length === 0 ? (
                    <div className="text-sm text-gray-500 py-4 text-center">No drops found.</div>
                ) : topDrops.map((drop) => (
                    <div key={drop.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-black/30 p-3">
                        <div className="min-w-0">
                            <div className="font-bold text-white line-clamp-1">{drop.title}</div>
                            <div className="text-xs text-gray-500">{drop.totalUnlocks || 0} unwraps • {drop.totalClicks || 0} clicks</div>
                        </div>
                        <span className="text-xs font-mono text-brand-purple">{drop.unlockCost} GD</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
