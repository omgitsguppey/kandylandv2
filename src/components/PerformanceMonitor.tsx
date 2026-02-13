"use client";

import { useReportWebVitals } from "next/web-vitals";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export function PerformanceMonitor() {
    const { user } = useAuth();
    const isAdmin = user?.email === "uylusjohnson@gmail.com";
    const [metrics, setMetrics] = useState<Record<string, number>>({});

    useReportWebVitals((metric) => {
        // Log to console for detailed debugging
        // console.log(`[Performance] ${metric.name}:`, metric.value, metric);

        // Update local state for admin overlay
        setMetrics(prev => ({
            ...prev,
            [metric.name]: metric.value
        }));

        // Send to Analytics (Placeholder for GA4/Vercel Analytics)
        // const body = JSON.stringify(metric);
        // if (navigator.sendBeacon) {
        //   navigator.sendBeacon('/api/analytics', body);
        // }
    });

    if (!isAdmin) return null;

    return (
        <div className="fixed bottom-4 left-4 z-[9999] pointer-events-none">
            <div className="bg-black/80 backdrop-blur-md rounded-lg p-3 border border-white/10 text-[10px] font-mono shadow-2xl pointer-events-auto opacity-70 hover:opacity-100 transition-opacity">
                <h4 className="text-white font-bold mb-1 border-b border-white/10 pb-1">Core Web Vitals</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <MetricRow label="FCP" value={metrics.FCP} threshold={1800} />
                    <MetricRow label="LCP" value={metrics.LCP} threshold={2500} />
                    <MetricRow label="CLS" value={metrics.CLS} threshold={0.1} isFloat />
                    <MetricRow label="FID" value={metrics.FID} threshold={100} />
                    <MetricRow label="INP" value={metrics.INP} threshold={200} />
                    <MetricRow label="TTFB" value={metrics.TTFB} threshold={800} />
                </div>
            </div>
        </div>
    );
}

function MetricRow({ label, value, threshold, isFloat }: { label: string, value?: number, threshold: number, isFloat?: boolean }) {
    if (value === undefined) return <div className="text-gray-600">{label}: ...</div>;

    const isGood = value <= threshold;
    const color = isGood ? "text-green-400" : "text-red-400";
    const displayValue = isFloat ? value.toFixed(3) : Math.round(value);
    const unit = isFloat ? "" : "ms";

    return (
        <div className="flex justify-between items-center gap-2">
            <span className="text-gray-400">{label}</span>
            <span className={`font-bold ${color}`}>{displayValue}{unit}</span>
        </div>
    );
}
