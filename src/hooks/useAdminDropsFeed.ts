"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

import { reportClientIssue } from "@/lib/client-error-reporting";
import { db } from "@/lib/firebase-data";
import { normalizeDropRecordOrFallback } from "@/lib/drop-read-models";
import type { Drop } from "@/types/db";
import { createAutoHealingObserver } from "@/lib/self-healing";
import { buildFirestoreClientFallbackMessage, buildFirestoreClientIssueDetail } from "@/lib/firestore-client-errors";

export function useAdminDropsFeed() {
    const [drops, setDrops] = useState<Drop[]>([]);
    const [legacyQueueIds, setLegacyQueueIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const dropsQuery = query(collection(db, "drops"), orderBy("validFrom", "desc"));
        
        const control = createAutoHealingObserver(() => onSnapshot(dropsQuery, (snapshot) => {
            if (cancelled) return;
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
            if (cancelled) return;
            reportClientIssue({
                channel: "firebase",
                severity: "warn",
                message: "Admin drops feed realtime listener failed",
                error,
                detail: buildFirestoreClientIssueDetail(error, {
                    listener: "admin_drops_feed",
                    scope: "admin_drops_subscription",
                    fallbackMessage: buildFirestoreClientFallbackMessage("Admin drops feed", error),
                }),
                consoleLabel: "[Admin Drops Feed] realtime listener failed",
            });
            setLoadError(buildFirestoreClientFallbackMessage("Admin drops feed", error));
            setLoading(false);
            control.triggerReconnect(error);
        }));

        return () => {
            cancelled = true;
            control.cleanup();
        };
    }, []);

    return {
        drops,
        legacyQueueIds,
        loading,
        loadError,
    };
}
