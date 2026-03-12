"use client";

import { useMemo } from "react";
import { Clock, PlayCircle } from "lucide-react";
import { useAuthSWR } from "@/hooks/useAuthSWR";

export function AdminOnboardingAnalytics() {
    const { data: analyticsResponse, isLoading, error } = useAuthSWR('/api/admin/analytics?type=historical&period=all');

    const stats = useMemo(() => {
        if (!analyticsResponse?.onboardingStats) return { completions: 0, avgDuration: 0 };
        return analyticsResponse.onboardingStats;
    }, [analyticsResponse]);

    const formatDuration = (seconds: number) => {
        if (!seconds) return "0s";
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };

    if (isLoading) {
        return (
            <div className="glass-panel p-6 rounded-3xl border border-white/10 animate-pulse mt-8">
                <div className="h-8 w-48 bg-white/10 rounded-lg mb-6" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-24 bg-white/5 rounded-2xl" />
                    <div className="h-24 bg-white/5 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (error || !analyticsResponse?.success) {
        return null;
    }

    return (
        <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden mt-8">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-[50px] pointer-events-none" />
            
            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-pink-500/20 text-pink-500 flex items-center justify-center">
                    <PlayCircle className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">Guided Onboarding Metrics</h3>
                    <p className="text-sm text-gray-400">Lifetime completion and completion velocity stats.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                <div className="p-5 rounded-2xl bg-black/40 border border-white/5 flex flex-col justify-between">
                    <div className="text-gray-400 text-sm font-medium mb-2">Total Completions</div>
                    <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                        {stats.completions.toLocaleString()}
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-black/40 border border-white/5 flex flex-col justify-between">
                    <div className="text-gray-400 text-sm font-medium mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Avg Completion Time
                    </div>
                    <div className="text-3xl font-black text-white">
                        {formatDuration(stats.avgDuration)}
                    </div>
                </div>
            </div>
        </div>
    );
}
