import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAuth, handleApiError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";

const unlockRequestSchema = z.object({
  dropId: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9_-]+$/u, "Invalid dropId format"),
});

export async function POST(request: NextRequest) {
  try {
    const caller = await verifyAuth(request);
    const { dropId } = unlockRequestSchema.parse(await request.json());

    if (!adminDb) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const userId = caller.uid;
    const userRef = adminDb.collection("users").doc(userId);
    const dropRef = adminDb.collection("drops").doc(dropId);

    const dropSnap = await dropRef.get();
    if (!dropSnap.exists) {
      return NextResponse.json({ error: "Drop not found" }, { status: 404 });
    }

    const dropData = dropSnap.data() ?? {};
    const parsedUnlockCost = Number(dropData.unlockCost);
    if (!Number.isFinite(parsedUnlockCost) || parsedUnlockCost < 0) {
      return NextResponse.json({ error: "Invalid drop configuration" }, { status: 400 });
    }
    const unlockCost = Math.floor(parsedUnlockCost);

    const result = await adminDb.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) {
        throw new Error("User not found");
      }

      const userData = userSnap.data() ?? {};
      const currentBalanceRaw = Number(userData.gumDropsBalance);
      const balance = Number.isFinite(currentBalanceRaw) ? Math.floor(currentBalanceRaw) : 0;

      const unlockedContentRaw = Array.isArray(userData.unlockedContent) ? userData.unlockedContent : [];
      const unlockedContent = new Set(
        unlockedContentRaw.filter((value): value is string => typeof value === "string")
      );

      if (unlockedContent.has(dropId)) {
        return { newBalance: balance, alreadyUnlocked: true };
      }

      if (balance < unlockCost) {
        throw new Error(`INSUFFICIENT_FUNDS:${unlockCost}:${balance}`);
      }

      transaction.update(userRef, {
        gumDropsBalance: FieldValue.increment(-unlockCost),
        unlockedContent: FieldValue.arrayUnion(dropId),
      });

      const transactionRef = adminDb.collection("transactions").doc();
      transaction.set(transactionRef, {
        userId,
        type: "unlock_content",
        amount: -unlockCost,
        relatedDropId: dropId,
        description: `Unlocked: ${typeof dropData.title === "string" ? dropData.title : "Drop"}`,
        timestamp: FieldValue.serverTimestamp(),
        verifiedServerSide: true,
      });

      transaction.update(dropRef, {
        totalUnlocks: FieldValue.increment(1),
      });

      return { newBalance: balance - unlockCost, alreadyUnlocked: false };
    });

    revalidatePath("/drops");
    revalidatePath("/dashboard");

    return NextResponse.json({
      success: true,
      title: typeof dropData.title === "string" ? dropData.title : "Drop",
      cost: unlockCost,
      newBalance: result.newBalance,
      alreadyUnlocked: result.alreadyUnlocked,
    });
  } catch (error: any) {
    if (error.message && error.message.startsWith("INSUFFICIENT_FUNDS:")) {
      const parts = error.message.split(":");
      return NextResponse.json(
        {
          error: "Not enough Gum Drops",
          required: Number.parseInt(parts[1], 10),
          balance: Number.parseInt(parts[2], 10),
        },
        { status: 402 }
      );
    }

    if (error.message === "User not found") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return handleApiError(error, "Drops.Unlock");
  }
}
