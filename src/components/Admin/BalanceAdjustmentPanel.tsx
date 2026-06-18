"use client";

import { useState } from "react";
import { UserProfile } from "@/types/db";
import { adjustUserBalance } from "@/lib/firebase/admin-actions";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Loader2, AlertCircle } from "lucide-react";
import { dispatchAdminOverviewSync } from "@/hooks/client-runtime";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { sanitizeErrorForUser } from "@/lib/errors/resolve-human-error";

import { toast } from "sonner";

interface Props {
    user: UserProfile | null;
    onClose: () => void;
    onSuccess: (newBalance: number) => void;
}

export function BalanceAdjustmentPanel({ user, onClose, onSuccess }: Props) {
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
                const newBalance = result.newBalance ?? ((user.gumDropsBalance || 0) + val);
                toast.success(`Balance updated. New balance: ${newBalance} GD`);
                dispatchAdminOverviewSync();
                onSuccess(newBalance);
                onClose();
            } else {
                toast.error("Balance update was not completed. Check the audit reason and try again.");
            }
        } catch (error) {
            const safeError = sanitizeErrorForUser(error, "admin_truth", "admin_truth_unavailable");
            reportClientIssue({
                channel: "payments",
                message: "Admin balance adjustment failed",
                error,
                detail: {
                    component: "BalanceAdjustmentPanel",
                    userId: user.uid,
                    amount: val,
                },
                consoleLabel: "[Balance Adjustment Panel] update failed",
            });
            toast.error(safeError.errorKey === "unknown_error" ? "Balance update was not completed." : safeError.operatorMessage);
        } finally {
            setProcessing(false);
        }
    };

    const currentBalance = user.gumDropsBalance || 0;
    const adjustment = parseInt(amount) || 0;
    const finalBalance = currentBalance + adjustment;

    return (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/8 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-base font-bold text-white">Adjust balance</h3>
                    <p className="mt-1 text-sm text-gray-400">
                        Update GumDrops for <strong>{user.displayName || user.email}</strong>.
                    </p>
                    <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-100">
                        <AlertCircle className="h-3 w-3" />
                        Audit reason required. Payment proof required for money-affecting recovery.
                    </p>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose} disabled={processing}>Close</Button>
            </div>

            <div className="space-y-3">
                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-xs font-bold text-gray-500 uppercase">Current</span>
                        <span className="font-mono text-xl text-white">{currentBalance} GD</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Adjustment (+/-)</label>
                            <input
                                type="number"
                                autoFocus
                                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-brand-purple outline-none font-mono text-lg"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Reason</label>
                            <input
                                type="text"
                                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-brand-purple outline-none text-sm h-[52px]"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g. Refund"
                            />
                        </div>
                    </div>

                    <div className="bg-black/50 p-3 rounded-xl border border-white/10 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500 uppercase">New balance</span>
                        <span className={`font-mono text-xl font-bold ${adjustment > 0 ? "text-brand-purple" : adjustment < 0 ? "text-red-400" : "text-gray-400"}`}>
                            {finalBalance} GD
                        </span>
                    </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
                <Button
                    variant="brand"
                    onClick={handleConfirm}
                    disabled={processing || adjustment === 0 || !reason.trim()}
                >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : "Confirm adjustment"}
                </Button>
            </div>
        </div>
    );
}
