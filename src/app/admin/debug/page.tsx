"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Loader2, Terminal, RefreshCw, Plus, PlayCircle } from "lucide-react";

import { authFetch } from "@/lib/authFetch";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { useAdminOverview } from "@/hooks/useAdminOverview";

export default function DebugConsole() {
    const { user, userProfile } = useAuth();
    const [logs, setLogs] = useState<any[]>([]);
    const [processing, setProcessing] = useState(false);
    const [simAmount, setSimAmount] = useState("500");
    const { data } = useAdminOverview();

    useEffect(() => {
        const recentLogs = (data?.recentTransactions || []).map((log) => ({
            ...log,
            timestamp: typeof log.timestamp === "number" && log.timestamp > 0
                ? new Date(log.timestamp).toLocaleString()
                : "Pending...",
        }));
        setLogs(recentLogs);
    }, [data]);

    const handleSimulatePurchase = async () => {
        if (!user) return;
        setProcessing(true);
        try {
            const amount = parseInt(simAmount);
            const response = await authFetch("/api/admin/balance", {
                method: "POST",
                body: JSON.stringify({
                    userId: user.uid,
                    amount,
                    reason: `Debug Console Adjustment: +${amount}`,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            toast.success("Simulation Successful!");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Simulation Failed");
        } finally {
            setProcessing(false);
        }
    };

    const handleTestWebhook = async () => {
        alert("Webhook simulation requires backend endpoint. (Not Implemented)");
    };

    return (
        <div className="space-y-4 md:space-y-6">
            <AdminPageHeader
                eyebrow="Admin Debug"
                title="Debug Console"
                subtitle="Run safe admin-side checks and inspect recent transaction activity."
                actions={
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-gray-300">
                        <Terminal className="w-4 h-4 text-brand-purple" />
                        Production Firebase tools
                    </div>
                }
            />

            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 md:gap-5">
                {/* Simulation Tools */}
                <div className="glass-panel space-y-3.5 rounded-[1.4rem] border border-white/5 p-4 md:p-5">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                        <PlayCircle className="w-5 h-5 text-brand-purple" />
                        Simulate Actions
                    </h2>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Add Gum Drops (To Self)</label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                className="min-h-10 flex-1 rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-white"
                                value={simAmount}
                                onChange={(e) => setSimAmount(e.target.value)}
                            />
                            <Button variant="brand" onClick={handleSimulatePurchase} disabled={processing}>
                                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500">Adds Gum Drops to your current admin account.</p>
                    </div>

                    <div className="border-t border-white/5 pt-3">
                        <Button variant="glass" className="w-full" onClick={handleTestWebhook}>
                            Test Payment Webhook (Mock)
                        </Button>
                    </div>
                </div>

                {/* System Info */}
                <div className="glass-panel rounded-[1.4rem] border border-white/5 p-4 md:p-5">
                    <h2 className="mb-3 text-lg font-bold text-white">System Status</h2>
                    <div className="space-y-2 text-sm text-gray-400">
                        <div className="flex justify-between">
                            <span>Environment</span>
                            <span className="text-white">Production (Firebase)</span>
                        </div>
                        <div className="flex justify-between">
                            <span>User ID</span>
                            <span className="font-mono text-xs">{user?.uid}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Email</span>
                            <span className="text-white">{user?.email}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Role</span>
                            <span className="text-brand-purple font-bold uppercase">{userProfile?.role || 'User'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Logs */}
            <div className="glass-panel overflow-hidden rounded-[1.4rem] border border-white/5">
                <div className="flex items-center justify-between border-b border-white/5 bg-white/5 p-3.5">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-gray-400" />
                        Live Transaction Logs
                    </h3>
                    <span className="text-xs text-gray-500">Last 20 entries</span>
                </div>
                <div className="max-h-[22rem] overflow-y-auto font-mono text-xs">
                    <table className="w-full text-left">
                        <thead className="bg-black/50 text-gray-500 sticky top-0">
                            <tr>
                                <th className="p-3">Time</th>
                                <th className="p-3">Type</th>
                                <th className="p-3">Amount</th>
                                <th className="p-3">User</th>
                                <th className="p-3">Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {logs.map((log) => (
                                <tr key={log.id} className="">
                                    <td className="p-3 text-gray-400">{log.timestamp}</td>
                                    <td className="p-3 text-brand-purple">{log.type}</td>
                                    <td className="p-3 text-white">{log.amount}</td>
                                    <td className="p-3 text-gray-500 font-bold truncate max-w-[100px]" title={log.userId}>
                                        {log.username ? `@${log.username}` : log.userId}
                                    </td>
                                    <td className="p-3 text-gray-300">{log.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
