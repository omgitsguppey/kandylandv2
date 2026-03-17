import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { handleApiError } from '@/lib/server/auth';
import { STANDARD } from '@/lib/server/rate-limit';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { recordCanonicalTaskEvent } from '@/lib/server/daily-tasks';
import { guardApiRequest } from '@/lib/server/request-guard';

const feedbackSchema = z.object({
    message: z.string().trim().min(1).max(2000),
    rating: z.number().min(1).max(5).optional(),
    category: z.enum(["general", "feature_request", "bug_report", "creator_request"]).default("general"),
});

export async function POST(req: NextRequest) {
    try {
        const caller = await guardApiRequest(req, {
            routeName: "tasks_feedback",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        const uid = caller?.uid ?? "";
        const email = caller?.email;

        const body = await req.json();
        const { message, rating, category } = feedbackSchema.parse(body);

        // Save to platform_feedback collection
        const feedbackRef = adminDb.collection('platform_feedback').doc();
        await feedbackRef.set({
            userId: uid,
            email: email || null,
            message,
            rating: rating || null,
            category,
            timestamp: FieldValue.serverTimestamp(),
            status: 'new'
        });

        await recordCanonicalTaskEvent(uid, email || uid, "feedback_submitted", {
            category,
            rating: rating || 0,
            source: "feedback_api",
            feedback_id: feedbackRef.id,
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return handleApiError(error, "tasks/feedback");
    }
}
