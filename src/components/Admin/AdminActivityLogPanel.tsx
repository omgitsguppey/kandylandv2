"use client";

import { ShieldAlert, Fingerprint } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAdminOverview } from "@/hooks/useAdminOverview";

export function AdminActivityLogPanel() {
    const { data, isLoading } = useAdminOverview();
    const logs = data?.adminActivity || [];
    const loading = isLoading;

    return (
        <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col h-full lg:col-span-2">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-brand-purple" />
                Admin Activity Log
            </h2>

            {loading ? (
                <div className="flex-1 flex items-center justify-center min-h-[150px]">
                    <div className="w-6 h-6 rounded-full border-2 border-brand-purple border-t-transparent animate-spin" />
                </div>
            ) : logs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 py-10">
                    <Fingerprint className="w-10 h-10 mb-3 opacity-20" />
                    <p className="text-sm">No recent admin adjustments found.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4 overflow-y-auto pr-2 max-h-[300px] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {logs.map((log) => (
                        <div key={log.id} className="flex gap-4 items-start pb-4 border-b border-white/5 last:border-0 last:pb-0">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20">
                                <ShieldAlert className="w-4 h-4 text-red-400" />
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-sm font-bold text-white leading-tight">
                                        Admin Adjustment
                                    </p>
                                    <span className="text-[10px] text-gray-500 whitespace-nowrap ml-3">
                                        {formatDistanceToNow(log.timestamp as number, { addSuffix: true })}
                                    </span>
                                </div>
                                <p className="text-xs text-brand-purple mb-1">
                                    <span className="text-gray-500 mr-1">Target UID:</span>
                                    {log.userId}
                                </p>
                                <p className="text-sm text-gray-300">
                                    {log.description}
                                </p>
                                {log.amount !== 0 && (
                                    <p className="text-xs font-mono mt-1 font-bold text-brand-purple">
                                        {log.amount > 0 ? "+" : ""}{log.amount} Gum Drops
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
