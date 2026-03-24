"use client";

import { ShieldAlert, Fingerprint } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAdminOverview } from "@/hooks/useAdminOverview";

export function AdminActivityLogPanel() {
    const { data, isLoading } = useAdminOverview();
    const logs = data?.adminActivity || [];
    const loading = isLoading;

    return (
        <div className="glass-panel flex h-full flex-col rounded-[1.6rem] border border-white/10 p-4 md:p-5 lg:col-span-2">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
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
                <div className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 flex max-h-[320px] flex-col gap-2.5 overflow-y-auto pr-1">
                    {logs.map((log) => (
                        <details key={log.id} className="rounded-2xl border border-white/10 bg-black/30 p-3">
                            <summary className="flex list-none items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
                                <ShieldAlert className="w-4 h-4 text-red-400" />
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                                <div className="mb-1 flex items-start justify-between gap-2">
                                    <p className="text-sm font-bold leading-tight text-white">
                                        Admin Adjustment
                                    </p>
                                    <span className="text-[10px] text-gray-500 whitespace-nowrap ml-3">
                                        {formatDistanceToNow(log.timestamp as number, { addSuffix: true })}
                                    </span>
                                </div>
                                <p className="mb-1 text-xs text-brand-purple">
                                    <span className="text-gray-500 mr-1">Target UID:</span>
                                    {log.userId}
                                </p>
                                <p className="line-clamp-1 text-sm text-gray-300">
                                    {log.description}
                                </p>
                                {log.amount !== 0 && (
                                    <p className="text-xs font-mono mt-1 font-bold text-brand-purple">
                                        {log.amount > 0 ? "+" : ""}{log.amount} Gum Drops
                                    </p>
                                )}
                            </div>
                            </summary>
                            <p className="mt-2 rounded-xl border border-white/10 bg-black/40 px-2.5 py-2 text-xs text-gray-300">{log.description}</p>
                        </details>
                    ))}
                </div>
            )}
        </div>
    );
}
