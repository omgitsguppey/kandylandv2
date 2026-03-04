import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAuth, handleApiError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { checkRateLimit, STRICT } from "@/lib/server/rate-limit";

const unlockRequestSchema = z.object({
  dropId: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9_-]+$/u, "Invalid dropId format"),
});

export async function POST(request: NextRequest) {
  try {
    checkRateLimit(request, "drops/unlock", STRICT);
    const caller = await verifyAuth(request);
    const { dropId } = unlockRequestSchema.parse(await request.json());

    if (!adminDb) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const userId = caller.uid;
    const userRef = adminDb.collection("users").doc(userId);
    const dropRef = adminDb.collection("drops").doc(dropId);

    const result = await adminDb.runTransaction(async (transaction) => {
      // --- READ PHASE: All reads must happen before any writes ---
      const dropSnap = await transaction.get(dropRef);
      if (!dropSnap.exists) {
        throw new Error("Drop not found");
      }

      const dropData = dropSnap.data() ?? {};
      const parsedUnlockCost = Number(dropData.unlockCost);
      if (!Number.isFinite(parsedUnlockCost) || parsedUnlockCost < 0) {
        throw new Error("Invalid drop configuration");
      }
      const unlockCost = Math.floor(parsedUnlockCost);

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
        const existingUnwrappedRaw = Number((userData.unlockedContentTimestamps as Record<string, unknown> | undefined)?.[dropId]);
        const existingUnwrappedAt = Number.isFinite(existingUnwrappedRaw) ? Math.floor(existingUnwrappedRaw) : null;
        return { newBalance: balance, alreadyUnlocked: true, unwrappedAt: existingUnwrappedAt };
      }

      if (balance < unlockCost) {
        throw new Error(`INSUFFICIENT_FUNDS:${unlockCost}:${balance}`);
      }

      const unwrappedAt = Date.now();
      const transactionRef = adminDb.collection("transactions").doc();

      // --- WRITE PHASE: Mutations only occur after all conditions are met ---

      transaction.update(userRef, {
        gumDropsBalance: FieldValue.increment(-unlockCost),
        unlockedContent: FieldValue.arrayUnion(dropId),
        [`unlockedContentTimestamps.${dropId}`]: unwrappedAt,
      });

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

      return { newBalance: balance - unlockCost, alreadyUnlocked: false, unwrappedAt, cost: unlockCost, title: typeof dropData.title === "string" ? dropData.title : "Drop" };
    });

    revalidatePath("/drops");
    revalidatePath("/dashboard");

    return NextResponse.json({
      success: true,
      title: result.title,
      cost: result.cost,
      newBalance: result.newBalance,
      alreadyUnlocked: result.alreadyUnlocked,
      unwrappedAt: result.unwrappedAt ?? null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("INSUFFICIENT_FUNDS:")) {
      const parts = message.split(":");
      return NextResponse.json(
        {
          error: "Not enough Gum Drops",
          required: Number.parseInt(parts[1], 10),
          balance: Number.parseInt(parts[2], 10),
        },
        { status: 402 }
      );
    }

    if (message === "User not found") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return handleApiError(error, "Drops.Unlock");
  }
}
