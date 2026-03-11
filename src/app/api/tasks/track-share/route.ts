import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { verifyAuth, handleApiError } from '@/lib/server/auth';
import { checkRateLimit, RELAXED } from '@/lib/server/rate-limit';
import { UserProfile } from '@/types/db';
import { getCSTDayBoundaries } from '@/lib/timezone';

export async function POST(req: NextRequest) {
    try {
        checkRateLimit(req, "tasks_track_share", RELAXED);
        const { uid } = await verifyAuth(req);

        const nowMs = Date.now();
        const { startOfDay } = getCSTDayBoundaries(nowMs);

        const userRef = adminDb.collection('users').doc(uid);

        await userRef.update({
            'dailyTasksState.sharedToday': startOfDay
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return handleApiError(error, "tasks/track-share");
    }
}
