import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";
import { guardApiRequest } from "@/lib/server/request-guard";
import { buildCompletedGumdropTransaction } from "@/lib/server/gumdrop-ledger";
import { readSourceAwareBalance, creditSourceAwareGumdrops, buildSourceAwareBalancePatch } from "@/lib/gumdrop-ledger";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

const feedbackSchema = z.object({
  dropId: z.string().min(1),
  positive: z.boolean(),
});

async function POST_handler(request: NextRequest) {
  try {
    const caller = await guardApiRequest(request, {
      routeName: "drops/feedback",
      auth: "user",
      requireTrustedOrigin: true,
    });
    
    const { dropId, positive } = feedbackSchema.parse(await request.json());
    const userId = caller?.uid ?? "";
    
    if (!adminDb) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const userRef = adminDb.collection("users").doc(userId);
    const feedbackRef = adminDb.collection("feedbacks").doc(`${userId}_${dropId}`);

    const newBalance = await adminDb.runTransaction(async (transaction) => {
      const feedbackSnap = await transaction.get(feedbackRef);
      if (feedbackSnap.exists) {
        throw new Error("ALREADY_SUBMITTED");
      }

      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) {
        throw new Error("USER_NOT_FOUND");
      }

      const userData = userSnap.data() ?? {};
      const sourceAwareBalance = readSourceAwareBalance(userData);
      const next = creditSourceAwareGumdrops(sourceAwareBalance, 10, "reward");

      transaction.set(feedbackRef, {
        userId,
        dropId,
        positive,
        createdAt: FieldValue.serverTimestamp(),
        rewarded: 10
      });

      transaction.update(userRef, {
        ...buildSourceAwareBalancePatch(next)
      });

      const transactionRef = adminDb.collection("transactions").doc();
      transaction.set(transactionRef, buildCompletedGumdropTransaction({
        userId,
        type: "daily_reward",
        amount: 10,
        description: "Feedback Reward",
        balanceBefore: sourceAwareBalance.total,
        balanceAfter: next.total,
        timestampMs: Date.now(),
        extra: { dropId }
      }));

      return next.total;
    });

    return NextResponse.json({ success: true, reward: 10, newBalance });
  } catch (error: any) {
    if (error.message === "ALREADY_SUBMITTED") {
      return NextResponse.json({ error: "Feedback already submitted" }, { status: 400 });
    }
    return handleApiError(error, "Drops.Feedback");
  }
}

export let POST = withRouteRuntimeHealth("drops/feedback:POST", POST_handler);
