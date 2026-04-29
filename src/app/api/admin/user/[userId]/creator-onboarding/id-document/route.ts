import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { adminDb, adminStorage } from "@/lib/server/firebase-admin";
import { HEAVY_READ, ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";
import { CREATOR_ONBOARDING_COLLECTION } from "@/lib/server/creator-onboarding";
import {
    getCreatorOnboardingIdDocumentBySide,
    normalizeCreatorOnboardingCanonicalRecord,
} from "@/lib/creator-onboarding";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { buildNotFoundResponse } from "@/lib/server/not-found";

function sanitizeFileName(fileName: string) {
    return fileName.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80) || "creator-id";
}

async function GET_handler(
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
        const requestedSide = request.nextUrl.searchParams.get("side") === "back" ? "back" : "front";
        const idDocument = getCreatorOnboardingIdDocumentBySide(canonical, requestedSide)
            ?? (requestedSide === "front" && (!canonical?.idDocuments || Object.keys(canonical.idDocuments).length === 0)
                ? canonical?.idDocument
                : undefined);
        if (!idDocument) {
            return buildNotFoundResponse("asset", `No submitted ${requestedSide} ID document found`);
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
                    requestedSide,
                    storagePath: idDocument.storagePath,
                },
            });
            return buildNotFoundResponse("asset", "Submitted ID file is missing from storage");
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

export let GET = withRouteRuntimeHealth("admin/user/[userId]/creator-onboarding/id-document:GET", GET_handler);
