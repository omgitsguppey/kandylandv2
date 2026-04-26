import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { handleApiError } from '@/lib/server/auth';
import { STANDARD } from '@/lib/server/rate-limit';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { recordCanonicalTaskEvent } from '@/lib/server/daily-tasks';
import { guardApiRequest } from '@/lib/server/request-guard';
import { BUG_REPORT_ISSUE_TYPES } from '@/lib/bug-reporting';
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

const feedbackSchema = z.object({
    message: z.string().trim().max(2000).optional(),
    summary: z.string().trim().min(1).max(320).optional(),
    rating: z.number().min(1).max(5).optional(),
    category: z.enum(["general", "feature_request", "bug_report", "creator_request"]).default("general"),
    contextId: z.string().trim().max(120).optional(),
    issueType: z.enum(BUG_REPORT_ISSUE_TYPES).optional(),
    severity: z.enum(["low", "medium", "high"]).optional(),
    component: z.object({
        contextId: z.string().trim().max(120),
        title: z.string().trim().max(160),
        componentName: z.string().trim().max(120),
        sourcePath: z.string().trim().max(200).optional(),
        routeHint: z.string().trim().max(160).optional(),
        codeSnippet: z.string().trim().max(500).optional(),
    }).optional(),
    autoContext: z.object({
        currentPath: z.string().trim().max(240),
        currentSearch: z.string().trim().max(400).optional(),
        viewportWidth: z.number().int().min(0).max(10_000),
        viewportHeight: z.number().int().min(0).max(10_000),
        userAgent: z.string().trim().max(400),
        sessionId: z.string().trim().max(120),
        subjectId: z.string().trim().max(120),
        diagnostics: z.array(z.object({
            channel: z.string().trim().max(40),
            severity: z.enum(["info", "warn", "error"]),
            message: z.string().trim().max(240),
            timestamp: z.number().int(),
            detail: z.string().trim().max(800).optional(),
        })).max(24).optional(),
        breadcrumbs: z.array(z.object({
            category: z.enum(["route", "interaction", "network", "error", "state"]),
            label: z.string().trim().max(160),
            timestamp: z.number().int(),
            path: z.string().trim().max(240).optional(),
            detail: z.string().trim().max(800).optional(),
        })).max(24).optional(),
        recentErrors: z.array(z.object({
            message: z.string().trim().max(500),
            timestamp: z.number().int(),
            stack: z.string().trim().max(4000).optional(),
            path: z.string().trim().max(240).optional(),
            componentStack: z.string().trim().max(2000).optional(),
        })).max(8).optional(),
        rolloutAssignments: z.array(z.object({
            id: z.string().trim().max(80),
            variant: z.string().trim().max(80),
            reason: z.string().trim().max(40),
            active: z.boolean(),
        })).max(12).optional(),
    }).optional(),
});

async function POST_handler(req: NextRequest) {
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
        const {
            message,
            summary,
            rating,
            category,
            contextId,
            issueType,
            severity,
            component,
            autoContext,
        } = feedbackSchema.parse(body);
        const normalizedMessage = (message || "").trim();
        const storedSummary = summary?.trim()
            || (normalizedMessage ? normalizedMessage.slice(0, 320) : `[${category}] ${contextId || "feedback"}`);
        const storedMessage = normalizedMessage || storedSummary;

        // Save to platform_feedback collection
        const feedbackRef = adminDb.collection('platform_feedback').doc();
        await feedbackRef.set({
            userId: uid,
            email: email || null,
            message: storedMessage,
            summary: storedSummary,
            rating: rating || null,
            category,
            contextId: contextId || null,
            issueType: issueType || null,
            severity: severity || null,
            component: component || null,
            autoContext: autoContext || null,
            diagnosticsCount: autoContext?.diagnostics?.length || 0,
            breadcrumbsCount: autoContext?.breadcrumbs?.length || 0,
            rolloutCount: autoContext?.rolloutAssignments?.length || 0,
            currentPath: autoContext?.currentPath || component?.routeHint || null,
            componentName: component?.componentName || null,
            timestamp: FieldValue.serverTimestamp(),
            status: 'new'
        });

        await recordCanonicalTaskEvent(uid, email || uid, "feedback_submitted", {
            category,
            rating: rating || 0,
            source: "feedback_api",
            feedback_id: feedbackRef.id,
            issue_type: issueType || "general_feedback",
            severity: severity || "medium",
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return handleApiError(error, "tasks/feedback");
    }
}

export let POST = withRouteRuntimeHealth("tasks/feedback:POST", POST_handler);
