import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { verifyAuth, handleApiError } from '@/lib/server/auth';
import { checkRateLimit, RELAXED } from '@/lib/server/rate-limit';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

const feedbackSchema = z.object({
    message: z.string().min(1),
    rating: z.number().min(1).max(5).optional(),
});

export async function POST(req: NextRequest) {
    try {
        checkRateLimit(req, "tasks_feedback", RELAXED);
        const { uid, email } = await verifyAuth(req);

        const body = await req.json();
        const { message, rating } = feedbackSchema.parse(body);

        // Save to platform_feedback collection
        await adminDb.collection('platform_feedback').add({
            userId: uid,
            email: email || null,
            message,
            rating: rating || null,
            timestamp: FieldValue.serverTimestamp(),
            status: 'new'
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return handleApiError(error, "tasks/feedback");
    }
}
