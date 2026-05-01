import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { buildSourceAwareBalancePatch, creditSourceAwareGumdrops, normalizeGumdropBalance, readSourceAwareBalance, spendSourceAwareGumdrops } from "@/lib/gumdrop-ledger";
import { buildCompletedGumdropTransaction } from "@/lib/server/gumdrop-ledger";
import { touchUserRuntime } from "@/lib/server/user-runtime";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { buildNotFoundResponse } from "@/lib/server/not-found";

const bodySchema = z.object({
    userId: z.string().trim().min(1).max(128),
    amount: z.number().int().gte(-1_000_000).lte(1_000_000).refine((value) => value !== 0, {
        message: "Amount must be non-zero",
    }),
    reason: z.string().trim().min(2).max(160),
});

async function POST_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/balance",
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
        });
        if (!caller) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

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

            const sourceAwareBalance = readSourceAwareBalance(userDoc.data() ?? {});
            const currentBalance = normalizeGumdropBalance(sourceAwareBalance.total);
            const nextBalanceResult = amount >= 0
                ? {
                    ok: true as const,
                    next: creditSourceAwareGumdrops(sourceAwareBalance, amount, "reward"),
                  }
                : spendSourceAwareGumdrops(sourceAwareBalance, Math.abs(amount));

            if (!nextBalanceResult.ok) {
                return {
                    status: "insufficient_balance" as const,
                    currentBalance,
                };
            }

            transaction.update(userRef, buildSourceAwareBalancePatch(nextBalanceResult.next));
            transaction.set(transactionRef, buildCompletedGumdropTransaction({
                userId,
                type: "admin_adjustment",
                amount,
                description: `Admin Adjustment: ${reason}`,
                balanceBefore: currentBalance,
                balanceAfter: nextBalanceResult.next.total,
                extra: {
                    adjustedBy: caller.email || caller.uid || "admin",
                    adjustedByEmail: caller.email || null,
                    adjustedByUid: caller.uid,
                    adjustmentReason: reason,
                    adjustmentSource: "admin_balance_route",
                    auditedServerSide: true,
                },
            }));

            return {
                status: "ok" as const,
                balanceAfter: nextBalanceResult.next.total,
            };
        });

        if (result.status === "missing_user") {
            return buildNotFoundResponse("user", "User not found");
        }

        if (result.status === "insufficient_balance") {
            return NextResponse.json({
                error: "Adjustment would make the balance negative",
                currentBalance: result.currentBalance,
            }, { status: 400 });
        }

        await touchUserRuntime(userId, {
            activity: true,
            profile: true,
        });

        return NextResponse.json({
            success: true,
            balanceAfter: result.balanceAfter,
        });
    } catch (error) {
        return handleApiError(error, "Admin.Balance");
    }
}

export let POST = withRouteRuntimeHealth("admin/balance:POST", POST_handler);
