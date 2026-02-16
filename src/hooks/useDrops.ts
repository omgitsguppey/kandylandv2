"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Drop } from "@/types/db";

export function useDrops(statusFilter: string[] | null = ["active", "scheduled"]) {
    const [drops, setDrops] = useState<Drop[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const normalizedFilter = useMemo(() => {
        if (!statusFilter || statusFilter.length === 0) {
            return null;
        }

        return [...statusFilter].sort();
    }, [statusFilter]);

    const filterKey = normalizedFilter?.join(",") ?? "all";

    useEffect(() => {
        setLoading(true);
        setError(null);

        const dropsRef = collection(db, "drops");
        const dropsQuery = normalizedFilter
            ? query(dropsRef, where("status", "in", normalizedFilter), orderBy("validFrom", "asc"))
            : query(dropsRef, orderBy("validFrom", "asc"));

        const unsubscribe = onSnapshot(
            dropsQuery,
            (snapshot) => {
                const dropsData: Drop[] = snapshot.docs.map((dropDoc) => ({
                    id: dropDoc.id,
                    ...(dropDoc.data() as Omit<Drop, "id">),
                }));

                setDrops(dropsData);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching drops:", err);
                setError("Failed to load drops.");
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [filterKey]);

    return { drops, loading, error };
}
