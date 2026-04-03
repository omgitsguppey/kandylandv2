"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

import { reportRealtimeIssue } from "@/lib/client-error-reporting";
import { db } from "@/lib/firebase-data";
import { normalizeDropRecordOrFallback } from "@/lib/drop-read-models";
import type { Drop } from "@/types/db";

export function useAdminDropsFeed() {
    const [drops, setDrops] = useState<Drop[]>([]);
    const [legacyQueueIds, setLegacyQueueIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        const dropsQuery = query(collection(db, "drops"), orderBy("validFrom", "desc"));
        const unsubscribe = onSnapshot(dropsQuery, (snapshot) => {
            const nextDrops: Drop[] = [];
            const nextLegacyQueueIds = new Set<string>();

            snapshot.forEach((docSnapshot) => {
                const raw = docSnapshot.data() as Record<string, unknown>;
                nextDrops.push(normalizeDropRecordOrFallback(raw, docSnapshot.id));

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
            reportRealtimeIssue("admin drops feed", error, {
                scope: "admin_drops_subscription",
            });
            setLoadError(error instanceof Error ? error.message : "Failed to load drops.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return {
        drops,
        legacyQueueIds,
        loading,
        loadError,
    };
}
