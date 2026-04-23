"use client";

import React, { useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import type { AdminSurfaceState } from "@/lib/admin-parity";

function useA11yHealthFeed() {
    const [health, setHealth] = useState(() => ({ status: "unavailable" as AdminSurfaceState, lastScan: 0 }));

    useEffect(() => {
        const unsubscribe = onSnapshot(
            doc(collection(db, "_system"), "a11y_health"),
            (snapshot) => {
                if (snapshot.exists()) {
                    const lastScan = snapshot.data().lastScan?.toMillis?.() || 0;
                    const ageMs = lastScan > 0 ? Date.now() - lastScan : Number.POSITIVE_INFINITY;
                    setHealth({ status: ageMs < 24 * 60 * 60 * 1000 ? "live" : "stale", lastScan });
                } else {
                    setHealth({ status: "unavailable", lastScan: 0 });
                }
            },
            () => {
                setHealth({ status: "failed", lastScan: 0 });
            }
        );
        return () => unsubscribe();
    }, []);

    return health;
}

function useWebVitalsFeed() {
    const [vitals, setVitals] = useState({
        status: "unavailable" as AdminSurfaceState,
        message: "No canonical web-vitals stream is available yet.",
    });

    useEffect(() => {
        const unsubscribe = onSnapshot(
            doc(collection(db, "_system"), "web_vitals"),
            (snapshot) => {
                if (snapshot.exists()) {
                    const updatedAt = snapshot.data().updatedAt?.toMillis?.() || snapshot.data().timestamp?.toMillis?.() || 0;
                    const ageMs = updatedAt > 0 ? Date.now() - updatedAt : Number.POSITIVE_INFINITY;
                    setVitals({
                        status: ageMs < 10 * 60 * 1000 ? "live" : "stale",
                        message: snapshot.data().message || "Realtime vitals stream connected.",
                    });
                } else {
                    setVitals({
                        status: "unavailable",
                        message: "No canonical web-vitals stream is available yet.",
                    });
                }
            },
            () => {
                setVitals({
                    status: "failed",
                    message: "Web-vitals observer failed. Falling back to route diagnostics only.",
                });
            }
        );
        return () => unsubscribe();
    }, []);

    return vitals;
}

export function AdminTruthSurfaces() {
    const a11yHealth = useA11yHealthFeed();
    const webVitals = useWebVitalsFeed();

    return (
        <section className="mt-8 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-white/50">Core Truth Surfaces</h3>
            <p className="text-xs text-gray-400">SEO, Accessibility, and Performance observability layer.</p>
            
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="font-semibold text-white">SEO Index Check</p>
                            <p className="mt-1 text-xs text-gray-400">Canonical path verification</p>
                        </div>
                        <AdminStatusBadge state="unavailable" />
                    </div>
                    <p className="mt-4 text-sm text-slate-300">No canonical SEO health feed is wired into this panel yet. Use route audits or search-console evidence instead of treating this as live.</p>
                </div>
                
                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="font-semibold text-white">Accessibility (A11y)</p>
                            <p className="mt-1 text-xs text-gray-400">Aria labels and contrast</p>
                        </div>
                        <AdminStatusBadge state={a11yHealth.status} />
                    </div>
                    <p className={`mt-4 text-sm ${a11yHealth.status === "live" ? "text-emerald-100" : a11yHealth.status === "failed" ? "text-red-100" : "text-amber-100"}`}>
                        {a11yHealth.status === "live"
                            ? "Continuous accessibility scanner is active with a recent canonical scan."
                            : a11yHealth.status === "failed"
                                ? "Accessibility health could not be read from the canonical system feed."
                                : a11yHealth.status === "unavailable"
                                    ? "No accessibility health document is present for this environment."
                                    : "Accessibility scan data is stale and needs a fresh run before it can be trusted as live."}
                    </p>
                </div>
                
                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="font-semibold text-white">Core Web Vitals</p>
                            <p className="mt-1 text-xs text-gray-400">LCP, INP, CLS scores</p>
                        </div>
                        <AdminStatusBadge state={webVitals.status} />
                    </div>
                    <p className={`mt-4 text-sm ${webVitals.status === "live" ? "text-emerald-100" : webVitals.status === "failed" ? "text-red-100" : "text-amber-100"}`}>
                        {webVitals.message}
                    </p>
                </div>
            </div>
        </section>
    );
}
