import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { verifyAuth, handleApiError } from '@/lib/server/auth';
import { checkRateLimit, STRICT } from '@/lib/server/rate-limit';
import { getCSTDayBoundaries } from '@/lib/timezone';
import { UserProfile } from '@/types/db';
import { Transaction } from 'firebase-admin/firestore';

const TASK_BANK = [
    { id: 'enable_notifications', type: 'one-time', maxProgress: 1, reward: 100 },
    { id: 'unwrap_drops', type: 'daily', maxProgress: 2, reward: 1000 },
    { id: 'streak_30', type: 'daily', maxProgress: 30, reward: 10000 },
    { id: 'give_feedback', type: 'one-time', maxProgress: 1, reward: 1000 },
    { id: 'share_drop', type: 'daily', maxProgress: 1, reward: 200 },
    { id: 'unlock_spicy', type: 'daily', maxProgress: 1, reward: 500 },
];

export async function POST(req: NextRequest) {
    try {
        checkRateLimit(req, "tasks_rotate", STRICT);
        const { uid } = await verifyAuth(req);

        const userRef = adminDb.collection('users').doc(uid);

        let activeTasks: { id: string; progress: number; claimed: boolean }[] = [];
        let didRotate = false;

        await adminDb.runTransaction(async (t: Transaction) => {
            const userDoc = await t.get(userRef);
            if (!userDoc.exists) {
                throw new Error("User not found");
            }

            const userData = userDoc.data() as UserProfile;
            const nowMs = Date.now();
            const { startOfDay } = getCSTDayBoundaries(nowMs);

            const currentState = userData.dailyTasksState || {
                lastResetMs: 0,
                tasks: [],
                completedOneTimeTasks: []
            };

            const completedOneTimeTasks = currentState.completedOneTimeTasks || [];

            // Check if rotation is needed
            if (currentState.lastResetMs < startOfDay || currentState.tasks.length === 0) {
                // Filter out completed one-time tasks
                const availableTasks = TASK_BANK.filter(task =>
                    !(task.type === 'one-time' && completedOneTimeTasks.includes(task.id))
                );

                // Shuffle and pick 3
                const shuffled = availableTasks.sort(() => 0.5 - Math.random());
                const selectedTasks = shuffled.slice(0, 3).map(task => ({
                    id: task.id,
                    progress: 0,
                    claimed: false
                }));

                t.update(userRef, {
                    'dailyTasksState.lastResetMs': startOfDay,
                    'dailyTasksState.tasks': selectedTasks,
                    'dailyTasksState.completedOneTimeTasks': completedOneTimeTasks
                });

                activeTasks = selectedTasks;
                didRotate = true;
            } else {
                activeTasks = (currentState.tasks || []) as { id: string; progress: number; claimed: boolean }[];
            }
        });

        return NextResponse.json({ success: true, rotated: didRotate, tasks: activeTasks });

    } catch (error: any) {
        return handleApiError(error, "tasks/rotate");
    }
}
