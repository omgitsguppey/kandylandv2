import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/server/firebase-admin";
import { AuthError, handleApiError } from "@/lib/server/auth";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import { FieldValue } from "firebase-admin/firestore";
import { guardApiRequest } from "@/lib/server/request-guard";
import { SENSITIVE_WRITE } from "@/lib/server/rate-limit";
import { buildCompletedGumdropTransaction } from "@/lib/server/gumdrop-ledger";
import { readSourceAwareBalance, creditSourceAwareGumdrops, buildSourceAwareBalancePatch } from "@/lib/gumdrop-ledger";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { trackServerEvent } from "@/lib/server/analytics";
import { touchUserRuntime } from "@/lib/server/user-runtime";

const feedbackSchema = z.object({
  dropId: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9_-]+$/u, "Invalid dropId format"),
  positive: z.boolean(),
});

const VIEWER_FEEDBACK_REWARD = 10;
const DROP_FEEDBACK_BODY_LIMIT_BYTES = 16_384;

async function POST_handler(request: NextRequest) {
  try {
    const caller = await guardApiRequest(request, {
      routeName: "drops/feedback",
      auth: "user",
      rateLimit: SENSITIVE_WRITE,
      requireTrustedOrigin: true,
    });
    
    const rawBody = await readBoundedJsonBody<unknown>(request, {
      maxBytes: DROP_FEEDBACK_BODY_LIMIT_BYTES,
      routeName: "drops/feedback",
    });
    const { dropId, positive } = feedbackSchema.parse(rawBody);
    const userId = caller?.uid ?? "";
    
    if (!adminDb) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const userRef = adminDb.collection("users").doc(userId);
    const feedbackRef = adminDb.collection("feedbacks").doc(`${userId}_${dropId}`);
    const dropRef = adminDb.collection("drops").doc(dropId);

    const result = await adminDb.runTransaction(async (transaction) => {
      const feedbackSnap = await transaction.get(feedbackRef);
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) {
        throw new AuthError("User not found", 404, "user");
      }
      const dropSnap = await transaction.get(dropRef);
      if (!dropSnap.exists) {
        throw new AuthError("Drop not found", 404, "drop");
      }

      const userData = userSnap.data() ?? {};
      const dropData = dropSnap.data() ?? {};
      const creatorId = typeof dropData.creatorId === "string" ? dropData.creatorId : "";
      if (creatorId === userId) {
        throw new AuthError("Creators cannot claim viewer feedback rewards for their own Drops", 403);
      }

      const unlockedContent = Array.isArray(userData.unlockedContent)
        ? userData.unlockedContent.filter((value): value is string => typeof value === "string")
        : [];
      const unlockedTimestamp = Number((userData.unlockedContentTimestamps as Record<string, unknown> | undefined)?.[dropId]);
      const hasUnlockedDrop = unlockedContent.includes(dropId) || Number.isFinite(unlockedTimestamp);
      if (!hasUnlockedDrop) {
        throw new AuthError("Feedback is available after this Drop is unwrapped", 403);
      }

      const sourceAwareBalance = readSourceAwareBalance(userData);
      if (feedbackSnap.exists) {
        const existingData = feedbackSnap.data() ?? {};
        return {
          alreadySubmitted: true,
          positive: typeof existingData.positive === "boolean" ? existingData.positive : positive,
          rewardCredited: false,
          reward: 0,
          newBalance: sourceAwareBalance.total,
          purchasedBalance: sourceAwareBalance.purchased,
          rewardBalance: sourceAwareBalance.reward,
        };
      }

      const submittedAt = Date.now();
      const next = creditSourceAwareGumdrops(sourceAwareBalance, VIEWER_FEEDBACK_REWARD, "reward");

      transaction.set(feedbackRef, {
        userId,
        dropId,
        positive,
        createdAt: FieldValue.serverTimestamp(),
        createdAtMs: submittedAt,
        rewarded: VIEWER_FEEDBACK_REWARD,
        feedbackSource: "viewer",
        verifiedUnlockedDrop: true,
      });

      transaction.update(userRef, {
        ...buildSourceAwareBalancePatch(next)
      });

      const transactionRef = adminDb.collection("transactions").doc();
      transaction.set(transactionRef, buildCompletedGumdropTransaction({
        userId,
        type: "daily_reward",
        amount: VIEWER_FEEDBACK_REWARD,
        description: "Viewer Feedback Reward",
        balanceBefore: sourceAwareBalance.total,
        balanceAfter: next.total,
        relatedDropId: dropId,
        timestampMs: submittedAt,
        extra: {
          dropId,
          rewardContext: "viewer_feedback",
          feedbackPositive: positive,
        }
      }));

      return {
        alreadySubmitted: false,
        positive,
        rewardCredited: true,
        reward: VIEWER_FEEDBACK_REWARD,
        newBalance: next.total,
        purchasedBalance: next.purchased,
        rewardBalance: next.reward,
      };
    });

    if (result.rewardCredited) {
      await Promise.all([
        touchUserRuntime(userId, { activity: true, profile: true }),
        trackServerEvent("feedback_submitted", {
          drop_id: dropId,
          positive: result.positive,
          reward_amount: result.reward,
          reward_credited: result.rewardCredited,
          feedback_source: "viewer",
          source_component: "viewer_feedback",
          page_path: "/dashboard/viewer",
        }, userId),
      ]);
    }

    return NextResponse.json({
      success: true,
      alreadySubmitted: result.alreadySubmitted,
      rewardCredited: result.rewardCredited,
      reward: result.reward,
      positive: result.positive,
      newBalance: result.newBalance,
      purchasedBalance: result.purchasedBalance,
      rewardBalance: result.rewardBalance,
    });
  } catch (error: unknown) {
    if (isBoundedJsonBodyError(error)) {
      return NextResponse.json({
        success: false,
        error: error.message,
        errorCode: error.code,
        retryable: false,
      }, { status: error.status });
    }
    return handleApiError(error, "Drops.Feedback");
  }
}

export let POST = withRouteRuntimeHealth("drops/feedback:POST", POST_handler);
