import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { verifyAuth, handleApiError } from '@/lib/server/auth';
import { checkRateLimit, STRICT } from '@/lib/server/rate-limit';
import { UserProfile } from '@/types/db';
import { FieldValue, Transaction } from 'firebase-admin/firestore';
import { getCSTDayBoundaries } from '@/lib/timezone';
import { z } from 'zod';

const claimSchema = z.object({
    taskId: z.string(),
});

const TASK_BANK = [
    { id: 'enable_notifications', type: 'daily', maxProgress: 1, reward: 1000 },
    { id: 'unwrap_drops', type: 'daily', maxProgress: 2, reward: 1000 },
    { id: 'streak_30', type: 'daily', maxProgress: 30, reward: 10000 },
    { id: 'give_feedback', type: 'one-time', maxProgress: 1, reward: 1000 },
    { id: 'share_drop', type: 'daily', maxProgress: 1, reward: 200 },
    { id: 'unlock_spicy', type: 'daily', maxProgress: 1, reward: 500 },
];

export async function POST(req: NextRequest) {
    try {
        checkRateLimit(req, "tasks_claim", STRICT);
        const { uid } = await verifyAuth(req);

        const body = await req.json();
        const { taskId } = claimSchema.parse(body);

        const taskDef = TASK_BANK.find(t => t.id === taskId);
        if (!taskDef) {
            return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
        }

        const userRef = adminDb.collection('users').doc(uid);

        let rewardGranted = 0;

        await adminDb.runTransaction(async (t: Transaction) => {
            const userDoc = await t.get(userRef);
            if (!userDoc.exists) {
                throw new Error("User not found");
            }

            const userData = userDoc.data() as UserProfile;
            const nowMs = Date.now();
            const { startOfDay } = getCSTDayBoundaries(nowMs);

            const currentState = userData.dailyTasksState;
            if (!currentState || currentState.lastResetMs < startOfDay) {
                throw new Error("Tasks need to be rotated first.");
            }

            const taskIndex = currentState.tasks.findIndex(tt => tt.id === taskId);
            if (taskIndex === -1) {
                throw new Error("Task not active today");
            }

            const activeTask = currentState.tasks[taskIndex];
            if (activeTask.claimed) {
                throw new Error("Task already claimed");
            }

            // --- Server-Side Verification ---
            if (taskId === 'streak_30') {
                const streak = userData.streakCount || 0;
                if (streak < 30) throw new Error("Streak requirement not met");
            }
            else if (taskId === 'unwrap_drops') {
                const unwraps = (userData.unlockedContentTimestamps || {}) as Record<string, number>;
                let todayUnwraps = 0;
                Object.values(unwraps).forEach((timestamp: number) => {
                    if (timestamp >= startOfDay) todayUnwraps++;
                });
                if (todayUnwraps < 2) throw new Error("Unwrap requirement not met");
            }
            else if (taskId === 'enable_notifications') {
                const tokens = (userData as any).fcmTokens || [];
                if (tokens.length === 0) throw new Error("Notifications not enabled");
            }
            else if (taskId === 'share_drop') {
                if (!userData.dailyTasksState || userData.dailyTasksState.sharedToday !== startOfDay) {
                    throw new Error("Share requirement not met");
                }
            }
            else if (taskId === 'give_feedback') {
                const feedbackDocs = await t.get(adminDb.collection('platform_feedback').where('userId', '==', uid).limit(1));
                if (feedbackDocs.empty) throw new Error("Feedback requirement not met");
            }
            else if (taskId === 'unlock_spicy') {
                const unwraps = (userData.unlockedContentTimestamps || {}) as Record<string, number>;
                const todayDropIds = Object.keys(unwraps).filter(key => unwraps[key] >= startOfDay);

                if (todayDropIds.length === 0) throw new Error("Spicy Drop requirement not met");

                // Get all drops unlocked today
                const dropsData = await t.getAll(...todayDropIds.map(id => adminDb.collection('drops').doc(id)));
                const hasSpicy = dropsData.some(doc => {
                    if (!doc.exists) return false;
                    const tags = doc.data()?.tags || [];
                    return tags.includes('Spicy');
                });

                if (!hasSpicy) throw new Error("Spicy Drop requirement not met");
            }

            // Apply Reward
            rewardGranted = taskDef.reward;

            const updatedTasks = [...currentState.tasks];
            updatedTasks[taskIndex].claimed = true;
            updatedTasks[taskIndex].progress = taskDef.maxProgress;

            const updates: any = {
                'dailyTasksState.tasks': updatedTasks,
                gumDropsBalance: FieldValue.increment(rewardGranted)
            };

            if (taskDef.type === 'one-time') {
                const completed = currentState.completedOneTimeTasks || [];
                if (!completed.includes(taskId)) {
                    updates['dailyTasksState.completedOneTimeTasks'] = [...completed, taskId];
                }
            }

            t.update(userRef, updates);

            const txRef = adminDb.collection('transactions').doc();
            t.set(txRef, {
                userId: uid,
                amount: rewardGranted,
                type: 'daily_reward',
                description: `Completed Task: ${taskId}`,
                timestamp: FieldValue.serverTimestamp()
            });
        });

        return NextResponse.json({ success: true, reward: rewardGranted });

    } catch (error: any) {
        return handleApiError(error, "tasks/claim");
    }
}
