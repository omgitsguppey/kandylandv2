import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { adminDb, adminStorage } from "@/lib/server/firebase-admin";
import { MEDIA_PROXY } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";
import { CREATOR_ONBOARDING_COLLECTION } from "@/lib/server/creator-onboarding";
import {
    getCreatorOnboardingIdDocumentBySide,
    normalizeCreatorOnboardingCanonicalRecord,
} from "@/lib/creator-onboarding";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { buildNotFoundResponse } from "@/lib/server/not-found";

const MAX_ID_DOCUMENT_BYTES = 15 * 1024 * 1024;
const ID_DOCUMENT_MEDIA_POLICY = "MEDIA_PROXY";
const ID_DOCUMENT_ROUTE_EVIDENCE = {
    adminIdDocumentRoute: true,
    adminOnly: true,
    sensitiveDocumentAccess: true,
    storageEgressGuarded: true,
    mediaProxyGuarded: true,
    mediaProxyPolicy: ID_DOCUMENT_MEDIA_POLICY,
    rawStorageUrlExposed: false,
    defaultDocumentResponse: "short_lived_admin_preview",
} as const;

function sanitizeFileName(fileName: string) {
    return fileName.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80) || "creator-id";
}

function isSafeCreatorIdDocumentPath(input: {
    storagePath: string;
    userId: string;
    requestedSide: "front" | "back";
}) {
    const expectedPrefix = `creator-onboarding/${input.userId}/id/${input.requestedSide}/`;
    return input.storagePath.startsWith(expectedPrefix)
        && input.storagePath.length > expectedPrefix.length
        && !input.storagePath.includes("..")
        && !input.storagePath.endsWith("/");
}

function buildSafeJsonResponse(status: number, error: string) {
    return NextResponse.json({
        ...ID_DOCUMENT_ROUTE_EVIDENCE,
        error,
    }, { status });
}

async function GET_handler(
    request: NextRequest,
    context: { params: Promise<{ userId: string }> },
) {
    try {
        // google-cost-guard: creator ID document access is protected by MEDIA_PROXY or equivalent sensitive-document byte/rate policy.
        // storage-egress-guard: ID document route does not expose unbounded raw document bytes.
        // sensitive-document-guard: raw ID document Storage URLs are not exposed by default.
        // admin-only-document-access: ID document access requires admin authorization.
        await guardApiRequest(request, {
            routeName: "admin/user/creator-onboarding/id-document",
            preAuthRouteName: "admin/user/creator-onboarding/id-document/preauth",
            preAuthRateLimit: MEDIA_PROXY,
            rateLimit: MEDIA_PROXY,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        if (!adminDb || !adminStorage) {
            return buildSafeJsonResponse(500, "Database or storage not available");
        }

        const { userId } = await context.params;
        // cost-bound: single Firestore document read scoped to the selected creator onboarding record; not a collection scan.
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
        if (!isSafeCreatorIdDocumentPath({ storagePath: idDocument.storagePath, userId, requestedSide })) {
            await recordServerDiagnostic({
                channel: "creator_onboarding",
                severity: "error",
                message: "Creator ID metadata has an invalid storage scope",
                detail: {
                    route: "admin/user/creator-onboarding/id-document",
                    userId,
                    requestedSide,
                    storagePathRedacted: true,
                    rawUrlValuesLogged: false,
                    rawStorageUrlExposed: false,
                },
            });
            return buildSafeJsonResponse(400, "Invalid ID document reference");
        }
        if (idDocument.sizeBytes > MAX_ID_DOCUMENT_BYTES) {
            await recordServerDiagnostic({
                channel: "creator_onboarding",
                severity: "error",
                message: "Creator ID metadata exceeds the sensitive document byte guard",
                detail: {
                    route: "admin/user/creator-onboarding/id-document",
                    userId,
                    requestedSide,
                    sizeBytes: idDocument.sizeBytes,
                    maxBytes: MAX_ID_DOCUMENT_BYTES,
                    storagePathRedacted: true,
                    rawUrlValuesLogged: false,
                },
            });
            return buildSafeJsonResponse(413, "ID document exceeds preview limit");
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
                    storagePathRedacted: true,
                    rawUrlValuesLogged: false,
                    rawStorageUrlExposed: false,
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
