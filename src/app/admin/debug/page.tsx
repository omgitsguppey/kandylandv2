"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, runTransaction } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { Loader2, Terminal, RefreshCw, Plus, PlayCircle } from "lucide-react";

export default function DebugConsole() {
    const { user, userProfile } = useAuth();
    const [logs, setLogs] = useState<any[]>([]);
    const [processing, setProcessing] = useState(false);
    const [simAmount, setSimAmount] = useState("500");

    // Real-time Logs
    useEffect(() => {
        const q = query(collection(db, "transactions"), orderBy("timestamp", "desc"), limit(20));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newLogs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate().toLocaleString() || "Pending..."
            }));
            setLogs(newLogs);
        });
        return () => unsubscribe();
    }, []);

    const handleSimulatePurchase = async () => {
        if (!user) return;
        setProcessing(true);
        try {
            const amount = parseInt(simAmount);
            await runTransaction(db, async (transaction) => {
                const userRef = doc(db, "users", user.uid);
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw "User does not exist!";

                const newBalance = (userDoc.data().gumDropsBalance || 0) + amount;
                transaction.update(userRef, { gumDropsBalance: newBalance });

                const txRef = doc(collection(db, "transactions"));
                transaction.set(txRef, {
                    userId: user.uid,
                    type: 'debug_adjustment',
                    amount: amount,
                    description: `Debug Console Adjustment: +${amount}`,
                    timestamp: serverTimestamp()
                });
            });
            alert("Simulation Successful!");
        } catch (error) {
            console.error(error);
            alert("Simulation Failed");
        } finally {
            setProcessing(false);
        }
    };

    const handleTestWebhook = async () => {
        alert("Webhook simulation requires backend endpoint. (Not Implemented)");
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <Terminal className="w-8 h-8 text-brand-cyan" />
                <h1 className="text-3xl font-bold text-white">Debug Console</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Simulation Tools */}
                <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <PlayCircle className="w-5 h-5 text-brand-pink" />
                        Simulate Actions
                    </h2>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Add Gum Drops (To Self)</label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white flex-1"
                                value={simAmount}
                                onChange={(e) => setSimAmount(e.target.value)}
                            />
                            <Button variant="brand" onClick={handleSimulatePurchase} disabled={processing}>
                                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500">Adds Gum Drops to your current admin account.</p>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <Button variant="glass" className="w-full" onClick={handleTestWebhook}>
                            Test Payment Webhook (Mock)
                        </Button>
                    </div>
                </div>

                {/* System Info */}
                <div className="glass-panel p-6 rounded-2xl border border-white/5">
                    <h2 className="text-xl font-bold text-white mb-4">System Status</h2>
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
            <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-gray-400" />
                        Live Transaction Logs
                    </h3>
                    <span className="text-xs text-gray-500">Last 20 entries</span>
                </div>
                <div className="max-h-96 overflow-y-auto font-mono text-xs">
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
                                <tr key={log.id} className="hover:bg-white/5">
                                    <td className="p-3 text-gray-400">{log.timestamp}</td>
                                    <td className="p-3 text-brand-cyan">{log.type}</td>
                                    <td className="p-3 text-white">{log.amount}</td>
                                    <td className="p-3 text-gray-500 truncate max-w-[100px]" title={log.userId}>{log.userId}</td>
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
