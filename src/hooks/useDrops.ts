"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Drop } from "@/types/db";

export function useDrops(statusFilter: string[] | null = ["active", "scheduled"]) {
    const [drops, setDrops] = useState<Drop[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Stable reference for the filter array
    const filterKey = useMemo(
        () => (statusFilter ? statusFilter.sort().join(",") : "all"),
        [statusFilter]
    );

    useEffect(() => {
        const dropsRef = collection(db, "drops");
        let q;

        if (statusFilter && statusFilter.length > 0) {
            q = query(
                dropsRef,
                where("status", "in", statusFilter),
                orderBy("validFrom", "asc")
            );
        } else {
            // Fetch all drops if no filter provided
            q = query(dropsRef, orderBy("validFrom", "asc"));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const dropsData: Drop[] = [];
            snapshot.forEach((doc) => {
                dropsData.push({ id: doc.id, ...doc.data() } as Drop);
            });
            setDrops(dropsData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching drops:", err);
            setError("Failed to load drops.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [filterKey]); // Stable dependency instead of JSON.stringify

    return { drops, loading, error };
}
