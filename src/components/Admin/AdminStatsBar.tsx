"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, where, query } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { Users, Package, DollarSign, Activity } from "lucide-react";
import { Drop, UserProfile } from "@/types/db";
import { normalizeDropRecord } from "@/lib/drop-normalizers";
import { getTransactionRevenueCents, normalizeTransactionRecord } from "@/lib/transaction-normalizers";

function normalizeDashboardUserProfile(id: string, raw: unknown): UserProfile | null {
    if (!raw || typeof raw !== "object") return null;
    const source = raw as Record<string, unknown>;
    const rawUnlocked = source.unlockedContent;
    const unlockedContent = Array.isArray(rawUnlocked) ? rawUnlocked.filter((entry): entry is string => typeof entry === "string") : [];
    const rawStatus = source.status;
    const status = rawStatus === "active" || rawStatus === "suspended" || rawStatus === "banned" ? rawStatus : "active";
    return {
        uid: typeof source.uid === "string" ? source.uid : id,
        email: typeof source.email === "string" || source.email === null ? source.email : null,
        displayName: typeof source.displayName === "string" || source.displayName === null ? source.displayName : null,
        photoURL: typeof source.photoURL === "string" || source.photoURL === null ? source.photoURL : null,
        gumDropsBalance: typeof source.gumDropsBalance === "number" && Number.isFinite(source.gumDropsBalance) ? source.gumDropsBalance : 0,
        unlockedContent,
        createdAt: typeof source.createdAt === "number" && Number.isFinite(source.createdAt) ? source.createdAt : 0,
        status,
        role: source.role === "admin" || source.role === "creator" || source.role === "user" ? source.role : "user",
    };
}

export interface AdminStats {
    totalUsers: number;
    activeDrops: number;
    totalDrops: number;
    grossRevenueCents: number;
    totalUnwraps: number;
}

/**
 * Owns the users, drops, and revenue onSnapshot listeners.
 * Renders the summary stat cards shown inside the analytics link banner.
 */
export function AdminStatsBar() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [drops, setDrops] = useState<Drop[]>([]);
    const [purchaseRevenueCents, setPurchaseRevenueCents] = useState(0);

    useEffect(() => {
        const unsubs = [
            onSnapshot(collection(db, "users"), (snapshot) => {
                const list: UserProfile[] = [];
                snapshot.forEach((doc) => {
                    const normalized = normalizeDashboardUserProfile(doc.id, doc.data());
                    if (normalized) list.push(normalized);
                });
                setUsers(list);
            }),
            onSnapshot(collection(db, "drops"), (snapshot) => {
                const list: Drop[] = [];
                snapshot.forEach((doc) => {
                    try { list.push(normalizeDropRecord(doc.data(), doc.id)); } catch { /* skip malformed */ }
                });
                setDrops(list);
            }),
            onSnapshot(query(collection(db, "transactions"), where("type", "in", ["purchase_currency", "purchase"])), (snapshot) => {
                let revenueCents = 0;
                snapshot.forEach((doc) => {
                    try { revenueCents += getTransactionRevenueCents(normalizeTransactionRecord(doc.data(), doc.id)); } catch { /* skip */ }
                });
                setPurchaseRevenueCents(revenueCents);
            }),
        ];
        return () => unsubs.forEach((u) => u());
    }, []);

    const stats = useMemo<AdminStats>(() => ({
        totalUsers: users.length,
        activeDrops: drops.filter((d) => d.status === "active").length,
        totalDrops: drops.length,
        grossRevenueCents: purchaseRevenueCents,
        totalUnwraps: drops.reduce((sum, d) => sum + (d.totalUnlocks || 0), 0),
    }), [users, drops, purchaseRevenueCents]);

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5">
            <div className="bg-black/60 p-5 backdrop-blur-md">
                <p className="text-xs text-gray-400 flex items-center gap-2 mb-1"><Users className="w-3 h-3 text-brand-purple" /> Accounts</p>
                <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
            </div>
            <div className="bg-black/60 p-5 backdrop-blur-md">
                <p className="text-xs text-gray-400 flex items-center gap-2 mb-1"><Activity className="w-3 h-3 text-brand-purple" /> Active / All Drops</p>
                <p className="text-2xl font-bold text-white">{stats.activeDrops} / {stats.totalDrops}</p>
            </div>
            <div className="bg-black/60 p-5 backdrop-blur-md hidden md:block">
                <p className="text-xs text-gray-400 flex items-center gap-2 mb-1"><DollarSign className="w-3 h-3 text-brand-purple" /> Lifetime Rev</p>
                <p className="text-2xl font-bold text-white font-mono">${(stats.grossRevenueCents / 100).toFixed(2)}</p>
            </div>
            <div className="bg-black/60 p-5 backdrop-blur-md">
                <p className="text-xs text-gray-400 flex items-center gap-2 mb-1"><Package className="w-3 h-3 text-brand-purple" /> Unwraps</p>
                <p className="text-2xl font-bold text-white">{stats.totalUnwraps.toLocaleString()}</p>
            </div>
        </div>
    );
}
