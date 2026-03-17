import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAdmin, handleApiError } from "@/lib/server/auth";
import { checkRateLimit, ADMIN } from "@/lib/server/rate-limit";

const bodySchema = z.object({
    userId: z.string().trim().min(1).max(128),
    amount: z.number().int().gte(-1_000_000).lte(1_000_000).refine((value) => value !== 0, {
        message: "Amount must be non-zero",
    }),
    reason: z.string().trim().min(2).max(160),
});

export async function POST(request: NextRequest) {
    try {
        await checkRateLimit(request, "admin/balance", ADMIN);
        const admin = await verifyAdmin(request);

        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const { userId, amount, reason } = bodySchema.parse(await request.json());
        const userRef = adminDb.collection("users").doc(userId);
        const transactionRef = adminDb.collection("transactions").doc();

        const result = await adminDb.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                return { status: "missing_user" as const };
            }

            const currentBalanceRaw = userDoc.data()?.gumDropsBalance;
            const currentBalance = typeof currentBalanceRaw === "number" && Number.isFinite(currentBalanceRaw)
                ? currentBalanceRaw
                : 0;
            const nextBalance = currentBalance + amount;

            if (nextBalance < 0) {
                return {
                    status: "insufficient_balance" as const,
                    currentBalance,
                };
            }

            transaction.update(userRef, {
                gumDropsBalance: nextBalance,
            });
            transaction.set(transactionRef, {
                userId,
                type: "admin_adjustment",
                amount,
                description: `Admin Adjustment: ${reason}`,
                adjustedBy: admin.email || "admin",
                balanceBefore: currentBalance,
                balanceAfter: nextBalance,
                status: "completed",
                timestamp: FieldValue.serverTimestamp(),
                verifiedServerSide: true,
            });

            return {
                status: "ok" as const,
                balanceAfter: nextBalance,
            };
        });

        if (result.status === "missing_user") {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (result.status === "insufficient_balance") {
            return NextResponse.json({
                error: "Adjustment would make the balance negative",
                currentBalance: result.currentBalance,
            }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            balanceAfter: result.balanceAfter,
        });
    } catch (error) {
        return handleApiError(error, "Admin.Balance");
    }
}
