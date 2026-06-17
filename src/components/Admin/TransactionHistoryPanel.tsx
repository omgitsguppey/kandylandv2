"use client";

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
    return safeError.errorKey === "unknown_error" ? "Failed to load transactions" : safeError.operatorMessage;
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
        <div className="flex max-h-[34rem] flex-col rounded-2xl border border-white/10 bg-zinc-900/85 p-4 shadow-xl md:p-5">
            <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                            <ScrollText className="h-5 w-5 text-brand-purple" />
                            Transaction history
                        </h3>
                        <p className="mt-1 text-sm text-gray-400">{user.displayName || user.email || "Selected user"} - Last 30 transactions</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-center">
                        <span className="block text-[10px] font-bold uppercase text-gray-500">Balance</span>
                        <span className="font-mono font-bold text-brand-purple">{user.gumDropsBalance || 0} GD</span>
                    </div>
            </div>

            <div className="custom-scrollbar -mr-2 flex-1 space-y-3 overflow-y-auto pr-2">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-brand-purple" aria-hidden="true" />
                        </div>
                    ) : error ? (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/10 py-8 text-center text-sm text-red-200">
                            <ScrollText className="mx-auto mb-3 h-8 w-8 opacity-60" />
                            {error}
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="rounded-xl border border-white/5 bg-white/5 py-12 text-center text-sm text-gray-500">
                            <ScrollText className="mx-auto mb-3 h-8 w-8 opacity-20" />
                            No transactions found for this user.
                        </div>
                    ) : (
                        transactions.map((tx) => {
                            const isPositive = tx.amount > 0;
                            const isZero = tx.amount === 0;
                            const isCreatorSpend = isCreatorSpendTransactionType(tx.type);

                            return (
                                <div
                                    key={tx.id}
                                    className="flex items-center justify-between rounded-xl border border-white/5 bg-black/40 p-3 transition-colors hover:bg-white/5"
                                >
                                    <div className="min-w-0 flex-1 pr-4">
                                        <div className="mb-1 flex items-center gap-2">
                                            {tx.status === "failed" ? (
                                                <span className="rounded border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold capitalize text-red-500">
                                                    Failed
                                                </span>
                                            ) : null}
                                            <span
                                                className={`rounded border px-2 py-0.5 text-[10px] font-bold capitalize ${
                                                    tx.type === "admin_adjustment"
                                                    || tx.type === "purchase_currency"
                                                    || tx.type === "daily_reward"
                                                    || tx.type === "referral_bonus"
                                                    || tx.type === "onboarding_reward"
                                                        ? "border-brand-purple/20 bg-brand-purple/10 text-brand-purple"
                                                        : tx.type === "unlock_content"
                                                            ? "border-purple-500/20 bg-purple-500/10 text-purple-400"
                                                            : isCreatorSpend
                                                                ? "border-sky-400/20 bg-sky-500/10 text-sky-300"
                                                                : "border-gray-500/20 bg-gray-500/10 text-gray-400"
                                                }`}
                                            >
                                                {getTransactionBadgeLabel(tx)}
                                            </span>
                                            {isCreatorSpend && tx.ledgerSource ? (
                                                <span className="rounded border border-sky-400/20 bg-black/30 px-2 py-0.5 text-[10px] font-bold text-sky-200">
                                                    {tx.ledgerSource}
                                                </span>
                                            ) : null}
                                            <span className="whitespace-nowrap text-xs text-gray-500">
                                                {formatTxTime(tx.timestamp as number)}
                                            </span>
                                        </div>
                                        <p className="truncate text-sm text-gray-300" title={tx.description}>
                                            {getTransactionDisplayLabel(tx)}
                                        </p>
                                        {tx.type === "purchase_currency" ? (() => {
                                            const economics = deriveGumdropEconomics(
                                                tx.deliveredGumDrops ?? tx.amount,
                                                tx.grossRevenueUsd ?? tx.cost ?? 0,
                                            );
                                            return (
                                                <p className="mt-1 text-[11px] text-gray-500">
                                                    {`$${economics.grossRevenueUsd.toFixed(2)} cash · ${economics.bonusGumDrops.toLocaleString()} bonus GD · $${economics.adjustedProfitUsd.toFixed(2)} adjusted`}
                                                </p>
                                            );
                                        })() : null}
                                        {isCreatorSpend ? (
                                            <p className="mt-1 text-[11px] text-gray-500">
                                                {`Purchased spent: ${tx.purchasedAmountSpent ?? 0} GD · Reward spent: ${tx.rewardAmountSpent ?? 0} GD · Creator share: ${tx.creatorRevenueShareGd ?? 0} GD`}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div
                                        className={`flex shrink-0 items-center gap-1 font-mono font-bold ${
                                            isPositive ? "text-brand-purple" : isZero ? "text-gray-400" : "text-red-400"
                                        }`}
                                    >
                                        {isPositive ? (
                                            <ArrowUpRight className="h-4 w-4" />
                                        ) : isZero ? (
                                            <TrendingUp className="h-4 w-4 text-gray-500" />
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

            <div className="mt-4 flex shrink-0 justify-end border-t border-white/10 pt-4">
                <Button variant="ghost" onClick={onClose}>Close</Button>
            </div>
        </div>
    );
}
