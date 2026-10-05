"use client";

import { Surface } from "@/components/ui/content-layout";


import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, Loader2, ScrollText, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { sanitizeErrorForUser } from "@/lib/errors/resolve-human-error";
import { deriveGumdropEconomics } from "@/lib/gumdrop-economics";
import {
    getTransactionBadgeLabel,
    getTransactionDisplayLabel,
    isCreatorSpendTransactionType,
} from "@/lib/transaction-normalizers";
import { Transaction, UserProfile } from "@/types/db";

interface Props {
    user: UserProfile | null;
    onClose: () => void;
}

function getAdminTransactionHistorySafeErrorMessage(error: unknown) {
    const safeError = sanitizeErrorForUser(error, "admin_truth", "admin_truth_unavailable");
    return safeError.errorKey === "unknown_error" ? "Transaction history could not be loaded." : safeError.operatorMessage;
}

export function TransactionHistoryPanel({ user, onClose }: Props) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;

        const fetchHistory = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await authFetch(`/api/admin/user/${user.uid}?limit=30`);
                const result = await response.json() as { success?: boolean; transactions?: Transaction[] };
                if (!response.ok || !result.success) {
                    throw new Error("Failed to load transactions");
                }
                setTransactions(result.transactions || []);
            } catch (error) {
                reportClientIssue({
                    channel: "payments",
                    message: "Admin transaction history fetch failed",
                    error,
                    detail: {
                        component: "TransactionHistoryPanel",
                        userId: user.uid,
                    },
                    consoleLabel: "[Transaction History Panel] fetch failed",
                });
                setTransactions([]);
                setError(getAdminTransactionHistorySafeErrorMessage(error));
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [user]);

    if (!user) return null;

    const formatTxTime = (timestampMs: number) => {
        if (!Number.isFinite(timestampMs) || timestampMs <= 0) return "Unknown";
        return format(timestampMs, "MMM d, h:mm a");
    };

    return (
        <Surface className="relative flex max-h-[34rem] flex-col overflow-hidden rounded-[1.65rem] border border-primary/15 bg-card p-4 shadow-none">
            <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                            <ScrollText className="h-5 w-5 text-primary" />
                            Transaction history
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">{user.displayName || user.email || "Selected user"} - Last 30 records</p>
                    </div>
                    <div className="rounded-[1.1rem] border border-primary/15 bg-primary/[0.08] px-3 py-2 text-right">
                        <span className="block text-[10px] font-semibold uppercase text-muted-foreground">Balance</span>
                        <span className="font-mono font-semibold text-primary">{user.gumDropsBalance || 0} GD</span>
                    </div>
            </div>

            <div className="custom-scrollbar -mr-2 flex-1 space-y-3 overflow-y-auto pr-2">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
                        </div>
                    ) : error ? (
                        <div className="rounded-xl border border-destructive/20 bg-destructive/10 py-8 text-center text-sm text-destructive">
                            <ScrollText className="mx-auto mb-3 h-8 w-8 opacity-60" />
                            {error}
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="rounded-[1.15rem] border border-dashed border-border bg-background/20 py-12 text-center text-sm text-primary/50">
                            <ScrollText className="mx-auto mb-3 h-8 w-8 opacity-20" />
                            No recent transactions for this user.
                        </div>
                    ) : (
                        transactions.map((tx) => {
                            const isPositive = tx.amount > 0;
                            const isZero = tx.amount === 0;
                            const isCreatorSpend = isCreatorSpendTransactionType(tx.type);

                            return (
                                <div
                                    key={tx.id}
                                    className="flex items-center justify-between rounded-[1.15rem] border border-border bg-background/25 p-3 transition-colors hover:border-primary/20 hover:bg-primary/[0.045]"
                                >
                                    <div className="min-w-0 flex-1 pr-4">
                                        <div className="mb-1 flex items-center gap-2">
                                            {tx.status === "failed" ? (
                                                <span className="rounded border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold capitalize text-destructive">
                                                    Failed
                                                </span>
                                            ) : null}
                                            <span
                                                className={`rounded border px-2 py-0.5 text-[10px] font-semibold capitalize ${
                                                    tx.type === "admin_adjustment"
                                                    || tx.type === "purchase_currency"
                                                    || tx.type === "daily_reward"
                                                    || tx.type === "referral_bonus"
                                                    || tx.type === "onboarding_reward"
                                                        ? "border-primary/20 bg-primary/10 text-primary"
                                                        : tx.type === "unlock_content"
                                                            ? "border-primary/20 bg-primary/10 text-primary"
                                                            : isCreatorSpend
                                                                ? "border-info/20 bg-info/10 text-info"
                                                                : "border-border bg-secondary text-muted-foreground"
                                                }`}
                                            >
                                                {getTransactionBadgeLabel(tx)}
                                            </span>
                                            {isCreatorSpend && tx.ledgerSource ? (
                                                <span className="rounded border border-info/20 bg-background/30 px-2 py-0.5 text-[10px] font-semibold text-info">
                                                    {tx.ledgerSource}
                                                </span>
                                            ) : null}
                                            <span className="whitespace-nowrap text-xs text-muted-foreground">
                                                {formatTxTime(tx.timestamp as number)}
                                            </span>
                                        </div>
                                        <p className="truncate text-sm text-muted-foreground" title={tx.description}>
                                            {getTransactionDisplayLabel(tx)}
                                        </p>
                                        {tx.type === "purchase_currency" ? (() => {
                                            const economics = deriveGumdropEconomics(
                                                tx.deliveredGumDrops ?? tx.amount,
                                                tx.grossRevenueUsd ?? tx.cost ?? 0,
                                            );
                                            return (
                                                <p className="mt-1 text-[11px] text-muted-foreground">
                                                    {`$${economics.grossRevenueUsd.toFixed(2)} cash - ${economics.bonusGumDrops.toLocaleString()} bonus GD - $${economics.adjustedProfitUsd.toFixed(2)} adjusted`}
                                                </p>
                                            );
                                        })() : null}
                                        {isCreatorSpend ? (
                                            <p className="mt-1 text-[11px] text-muted-foreground">
                                                {`Purchased spent: ${tx.purchasedAmountSpent ?? 0} GD - Reward spent: ${tx.rewardAmountSpent ?? 0} GD - Creator share: ${tx.creatorRevenueShareGd ?? 0} GD`}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div
                                        className={`flex shrink-0 items-center gap-1 font-mono font-bold ${
                                            isPositive ? "text-primary" : isZero ? "text-muted-foreground" : "text-destructive"
                                        }`}
                                    >
                                        {isPositive ? (
                                            <ArrowUpRight className="h-4 w-4" />
                                        ) : isZero ? (
                                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <ArrowDownLeft className="h-4 w-4" />
                                        )}
                                        {isPositive ? "+" : ""}
                                        {tx.amount}
                                    </div>
                                </div>
                            );
                        })
                    )}
            </div>

            <div className="mt-3 flex shrink-0 justify-end border-t border-primary/10 pt-3">
                <Button variant="ghost" onClick={onClose}>Close</Button>
            </div>
        </Surface>
    );
}
