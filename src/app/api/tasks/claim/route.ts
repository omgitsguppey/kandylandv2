import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError, verifyAuth } from "@/lib/server/auth";
import { STRICT, checkRateLimit } from "@/lib/server/rate-limit";
import { UserProfile } from "@/types/db";

const claimSchema = z.object({
  taskId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    checkRateLimit(req, "tasks_claim", STRICT);
    const { uid } = await verifyAuth(req);
    const { taskId } = claimSchema.parse(await req.json());
    const userRef = adminDb.collection("users").doc(uid);

    const result = await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(userRef);
      if (!snapshot.exists) {
        throw new Error("User not found");
      }

      const userData = snapshot.data() as UserProfile;
      const tasks = userData.dailyTasksState?.tasks ?? [];
      const taskIndex = tasks.findIndex((task) => task.id === taskId);
      if (taskIndex === -1) {
        throw new Error("Task not found");
      }

      const task = tasks[taskIndex];
      if (task.claimed) {
        return { alreadyClaimed: true, reward: task.reward || 0 };
      }

      if ((task.progress || 0) < (task.maxProgress || 1)) {
        throw new Error("Task progress is not complete");
      }

      const updatedTasks = [...tasks];
      updatedTasks[taskIndex] = {
        ...task,
        claimed: true,
        claimedAt: Date.now(),
      };

      transaction.update(userRef, {
        "dailyTasksState.tasks": updatedTasks,
        ...(task.reward ? { gumDropsBalance: FieldValue.increment(task.reward) } : {}),
      });

      return { alreadyClaimed: false, reward: task.reward || 0 };
    });

    if (result.alreadyClaimed) {
      return NextResponse.json({
        success: true,
        alreadyClaimed: true,
        reward: result.reward,
      });
    }

    return NextResponse.json({
      success: true,
      reward: result.reward,
    });
  } catch (error) {
    return handleApiError(error, "tasks/claim");
  }
}
