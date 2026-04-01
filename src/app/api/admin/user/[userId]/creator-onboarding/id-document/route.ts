import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { adminDb, adminStorage } from "@/lib/server/firebase-admin";
import { HEAVY_READ, ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";
import { CREATOR_ONBOARDING_COLLECTION } from "@/lib/server/creator-onboarding";
import { normalizeCreatorOnboardingCanonicalRecord } from "@/lib/creator-onboarding";

function sanitizeFileName(fileName: string) {
    return fileName.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80) || "creator-id";
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ userId: string }> },
) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/user/creator-onboarding/id-document",
            preAuthRouteName: "admin/user/creator-onboarding/id-document/preauth",
            preAuthRateLimit: HEAVY_READ,
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        if (!adminDb || !adminStorage) {
            return NextResponse.json({ error: "Database or storage not available" }, { status: 500 });
        }

        const { userId } = await context.params;
        const onboardingSnap = await adminDb.collection(CREATOR_ONBOARDING_COLLECTION).doc(userId).get();
        const canonical = normalizeCreatorOnboardingCanonicalRecord(onboardingSnap.data());
        const idDocument = canonical?.idDocument;
        if (!idDocument) {
            return NextResponse.json({ error: "No submitted ID document found" }, { status: 404 });
        }

        const fileRef = adminStorage.bucket().file(idDocument.storagePath);
        const [exists] = await fileRef.exists();
        if (!exists) {
            await recordServerDiagnostic({
                channel: "creator_onboarding",
                severity: "error",
                message: "Creator ID metadata exists but storage object is missing",
                detail: {
                    route: "admin/user/creator-onboarding/id-document",
                    userId,
                    storagePath: idDocument.storagePath,
                },
            });
            return NextResponse.json({ error: "Submitted ID file is missing from storage" }, { status: 404 });
        }

        const [buffer] = await fileRef.download();
        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
                "Content-Type": idDocument.contentType,
                "Content-Disposition": `inline; filename="${sanitizeFileName(idDocument.fileName)}"`,
                "Cache-Control": "private, no-store",
            },
        });
    } catch (error) {
        return handleApiError(error, "Admin.User.CreatorOnboarding.IdDocument.GET");
    }
}
