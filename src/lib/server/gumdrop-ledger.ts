import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { computeNextGumdropBalance, normalizeGumdropAmount, normalizeGumdropBalance, normalizeLedgerStatus } from "@/lib/gumdrop-ledger";
import type { Transaction } from "@/types/db";

type LedgerTransactionType = Transaction["type"];
type LedgerRewardSource = NonNullable<Transaction["rewardSource"]>;

type BuildCompletedGumdropTransactionInput = {
    userId: string;
    type: LedgerTransactionType;
    amount: number;
    description: string;
    balanceBefore: number;
    balanceAfter?: number;
    rewardSource?: LedgerRewardSource;
    relatedDropId?: string;
    timestampMs?: number;
    status?: Transaction["status"];
    extra?: Record<string, unknown>;
};

export function buildCompletedGumdropTransaction(input: BuildCompletedGumdropTransactionInput) {
    const amount = normalizeGumdropAmount(input.amount);
    const balanceBefore = normalizeGumdropBalance(input.balanceBefore);
    const balanceAfter = typeof input.balanceAfter === "number" && Number.isFinite(input.balanceAfter)
        ? normalizeGumdropBalance(input.balanceAfter)
        : computeNextGumdropBalance(balanceBefore, amount);
    const timestampMs = typeof input.timestampMs === "number" && Number.isFinite(input.timestampMs)
        ? Math.trunc(input.timestampMs)
        : Date.now();
    const status = normalizeLedgerStatus(input.status);

    return {
        userId: input.userId,
        type: input.type,
        amount,
        description: input.description,
        status,
        balanceBefore,
        balanceAfter,
        timestamp: FieldValue.serverTimestamp(),
        timestampMs,
        verifiedServerSide: true,
        ...(input.rewardSource ? { rewardSource: input.rewardSource } : {}),
        ...(input.relatedDropId ? { relatedDropId: input.relatedDropId } : {}),
        ...(input.extra ?? {}),
    };
}
