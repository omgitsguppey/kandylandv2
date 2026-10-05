"use client";

import { Input } from "@/components/ui/input";
import { Surface } from "@/components/ui/content-layout";


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
        <Surface className="relative overflow-hidden rounded-[1.65rem] border border-primary/15 bg-card p-4 shadow-none">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Adjust GumDrops balance</h3>
                    <p className="mt-1 text-sm text-primary/68">
                        Update GumDrops for <strong>{user.displayName || user.email}</strong>.
                    </p>
                    <p className="mt-3 inline-flex rounded-xl border border-warning/20 bg-warning/[0.08] px-3 py-2 text-xs font-semibold leading-5 text-warning">
                        <AlertCircle className="h-3 w-3" />
                        Audit reason required. Payment proof required for money-affecting recovery.
                    </p>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose} disabled={processing}>Close</Button>
            </div>

            <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-[1.15rem] border border-border bg-background/25 p-3">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">Current</span>
                        <span className="font-mono text-xl text-foreground">{currentBalance} GD</span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">Adjustment (+/-)</label>
                            <Input
                                type="number"
                                autoFocus
                                className="min-h-11 w-full rounded-xl border border-border bg-background/45 px-3 font-mono text-lg text-foreground outline-none transition-colors focus:border-primary/50"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">Reason</label>
                            <Input
                                type="text"
                                className="min-h-11 w-full rounded-xl border border-border bg-background/45 px-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g. Refund"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-[1.15rem] border border-primary/15 bg-primary/[0.07] p-3">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">New balance</span>
                        <span className={`font-mono text-xl font-semibold ${adjustment > 0 ? "text-primary" : adjustment < 0 ? "text-destructive" : "text-muted-foreground"}`}>
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
        </Surface>
    );
}
