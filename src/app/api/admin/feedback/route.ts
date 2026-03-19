import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";

function toTimestampNumber(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (
        value
        && typeof value === "object"
        && "toMillis" in value
        && typeof (value as { toMillis: () => number }).toMillis === "function"
    ) {
        return (value as { toMillis: () => number }).toMillis();
    }

    return 0;
}

export async function GET(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/feedback",
            rateLimit: ADMIN,
            auth: "admin",
        });

        const snapshot = await adminDb.collection("platform_feedback").orderBy("timestamp", "desc").limit(200).get();
        const feedback = snapshot.docs.map((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            return {
                id: doc.id,
                userId: typeof raw.userId === "string" ? raw.userId : "",
                email: typeof raw.email === "string" ? raw.email : null,
                summary: typeof raw.summary === "string" ? raw.summary : null,
                message: typeof raw.message === "string" ? raw.message : "",
                rating: typeof raw.rating === "number" ? raw.rating : null,
                category: typeof raw.category === "string" ? raw.category : null,
                contextId: typeof raw.contextId === "string" ? raw.contextId : null,
                issueType: typeof raw.issueType === "string" ? raw.issueType : null,
                severity: typeof raw.severity === "string" ? raw.severity : null,
                currentPath: typeof raw.currentPath === "string" ? raw.currentPath : null,
                componentName: typeof raw.componentName === "string" ? raw.componentName : null,
                diagnosticsCount: typeof raw.diagnosticsCount === "number" ? raw.diagnosticsCount : 0,
                breadcrumbsCount: typeof raw.breadcrumbsCount === "number" ? raw.breadcrumbsCount : 0,
                rolloutCount: typeof raw.rolloutCount === "number" ? raw.rolloutCount : 0,
                status: typeof raw.status === "string" ? raw.status : null,
                timestamp: toTimestampNumber(raw.timestamp),
            };
        });

        return NextResponse.json({ success: true, feedback });
    } catch (error) {
        return handleApiError(error, "Admin.Feedback.GET");
    }
}
