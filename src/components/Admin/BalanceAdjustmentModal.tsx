"use client";

import { useState } from "react";
import { UserProfile } from "@/types/db";
import { adjustUserBalance } from "@/lib/firebase/admin-actions";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { CandyOutlineIcon as Loader2, CandyOutlineIcon as AlertCircle } from "@/components/ui/Icon";

import { toast } from "sonner";

interface Props {
    user: UserProfile | null;
    onClose: () => void;
    onSuccess: (newBalance: number) => void;
}

export function BalanceAdjustmentModal({ user, onClose, onSuccess }: Props) {
    const { user: currentUser } = useAuth();
    const [amount, setAmount] = useState<string>("");
    const [reason, setReason] = useState("");
    const [processing, setProcessing] = useState(false);

    if (!user) return null;

    const handleConfirm = async () => {
        if (!currentUser) return;

        const val = parseInt(amount);
        if (isNaN(val) || val === 0) {
            toast.error("Please enter a valid non-zero amount");
            return;
        }
        if (!reason.trim()) {
            toast.error("A reason is required for the audit log");
            return;
        }

        setProcessing(true);
        try {
            const result = await adjustUserBalance(user.uid, val, reason);

            if (result.success) {
                const newBalance = (user.gumDropsBalance || 0) + val;
                toast.success(`Balance updated. New Balance: ${newBalance}`);
                onSuccess(newBalance);
                onClose();
            } else {
                toast.error(result.error || "Failed to update balance");
            }
        } catch (error) {
            console.error(error);
            toast.error("An unexpected error occurred");
        } finally {
            setProcessing(false);
        }
    };

    const currentBalance = user.gumDropsBalance || 0;
    const adjustment = parseInt(amount) || 0;
    const finalBalance = currentBalance + adjustment;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <h3 className="text-xl font-bold text-white mb-2">Adjust Balance</h3>
                <p className="text-gray-400 mb-6">
                    Update Gum Drops for <strong>{user.displayName || user.email}</strong>.
                    <br />
                    <span className="text-xs text-amber-500 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" />
                        Actions are permanent and logged.
                    </span>
                </p>

                <div className="space-y-4 mb-6">
                    {/* Current Balance Display */}
                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-xs font-bold text-gray-500 uppercase">Current</span>
                        <span className="font-mono text-xl text-white">{currentBalance} 🍬</span>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Adjustment (+/-)</label>
                            <input
                                type="number"
                                autoFocus
                                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-brand-pink outline-none font-mono text-lg"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Reason</label>
                            <input
                                type="text"
                                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-brand-pink outline-none text-sm h-[52px]"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g. Refund"
                            />
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="bg-black/50 p-3 rounded-xl border border-white/10 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500 uppercase">New Balance</span>
                        <span className={`font-mono text-xl font-bold ${adjustment > 0 ? "text-green-400" : adjustment < 0 ? "text-red-400" : "text-gray-400"}`}>
                            {finalBalance} 🍬
                        </span>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={processing}>Cancel</Button>
                    <Button
                        variant="brand"
                        onClick={handleConfirm}
                        disabled={processing || adjustment === 0 || !reason.trim()}
                    >
                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Adjustment"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
