"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { Drop } from "@/types/db";
import { normalizeDropRecord } from "@/lib/drop-normalizers";

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
        try {
          const now = Date.now();
          const dropsData: Drop[] = snapshot.docs
            .map((dropDoc) => normalizeDropRecord(dropDoc.data(), dropDoc.id))
            .filter((drop) => {
              // Real-time client-side expiration filter
              if (drop.status === "active" && drop.validUntil && now >= drop.validUntil) {
                return false;
              }
              // Real-time client-side scheduled-to-active filter
              if (drop.status === "scheduled" && drop.validFrom && now < drop.validFrom) {
                // Keep it for now, it will become active later
                return true;
              }
              return true;
            });
          setDrops(dropsData);
          setLoading(false);
        } catch (parseError) {
          setError("Failed to load drops.");
          setDrops([]);
          setLoading(false);
        }
      },
      (err) => {
        setError("Failed to load drops.");
        setLoading(false);
      }
    );

    // Periodic check to expire drops that are already in the list
    const timer = setInterval(() => {
      const now = Date.now();
      setDrops((currentDrops) => {
        let changed = false;
        const nextDrops = currentDrops.filter((drop) => {
          if (drop.status === "active" && drop.validUntil && now >= drop.validUntil) {
            changed = true;
            return false;
          }
          if (drop.status === "scheduled" && drop.validFrom && now >= drop.validFrom) {
            // Ideally we'd change status to active here, but we'll wait for the next snapshot
            // unless we want to "fudge" it client-side.
          }
          return true;
        });
        return changed ? nextDrops : currentDrops;
      });
    }, 10000); // Check every 10 seconds

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [filterKey]);

  return { drops, loading, error };
}
