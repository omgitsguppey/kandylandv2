import { NextRequest, NextResponse } from "next/server";

import { adminDb, adminStorage } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { trackServerEvent } from "@/lib/server/analytics";
import {
    CREATOR_ONBOARDING_COLLECTION,
    CREATOR_ONBOARDING_HISTORY_SUBCOLLECTION,
    syncCreatorOnboardingDocuments,
} from "@/lib/server/creator-onboarding";
import { STRICT } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";
import { sendCreatorOnboardingAdminNotification } from "@/lib/server/creator-onboarding-alerts";
import {
    buildCreatorOnboardingCanonicalRecord,
    getCreatorOnboardingIdDocumentSummary,
    normalizeCreatorOnboardingCanonicalRecord,
} from "@/lib/creator-onboarding";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import {
    actorMarkerToTelemetryPayload,
    assertKnownActor,
    buildActorMarker,
    buildActorMarkerDebugFields,
    type ActorMarker,
} from "@/lib/identity/actor-markers";

const MAX_ID_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_ID_CONTENT_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "video/mp4",
    "video/quicktime",
    "video/webm",
]);

function sanitizeFileName(fileName: string) {
    return fileName.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80) || "id-document";
}

function normalizeIdSlot(value: FormDataEntryValue | null) {
    if (value === "back" || value === "face_with_id" || value === "video_with_id") {
        return value;
    }

    return "front";
}

function buildStoragePath(userId: string, slot: "front" | "back" | "face_with_id" | "video_with_id", fileName: string) {
    return `creator-onboarding/${userId}/id/${slot}/${Date.now()}_${sanitizeFileName(fileName)}`;
}

function buildErrorResponse(status: number, message: string) {
    return NextResponse.json({ error: message }, { status });
}

async function POST_handler(request: NextRequest) {
    let uploadedStoragePath: string | null = null;
    let uploadedSlot: "front" | "back" | "face_with_id" | "video_with_id" = "front";
    let actorMarkerForFailure: ActorMarker | null = null;

    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/onboarding/id-submission",
            rateLimit: STRICT,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });

        if (!caller?.uid) {
            return buildErrorResponse(401, "Unauthorized");
        }

        if (!adminDb || !adminStorage) {
            return buildErrorResponse(500, "Database or storage not available");
        }

        const formData = await request.formData();
        uploadedSlot = normalizeIdSlot(formData.get("slot"));
        const file = formData.get("file");
        if (!(file instanceof File)) {
            return buildErrorResponse(400, "Missing ID file upload");
        }

        if (!ALLOWED_ID_CONTENT_TYPES.has(file.type)) {
            return buildErrorResponse(400, "Only JPG, PNG, WebP, PDF, and common video uploads are supported.");
        }

        if (file.size > MAX_ID_UPLOAD_BYTES) {
            return buildErrorResponse(400, "ID uploads must be 15MB or smaller.");
        }

        const onboardingRef = adminDb.collection(CREATOR_ONBOARDING_COLLECTION).doc(caller.uid);
        const userRef = adminDb.collection("users").doc(caller.uid);
        const [onboardingSnap, userSnap] = await Promise.all([
            onboardingRef.get(),
            userRef.get(),
        ]);
        const canonical = normalizeCreatorOnboardingCanonicalRecord(onboardingSnap.data());
        const userData = (userSnap.data() as Record<string, unknown> | undefined) ?? {};

        if (!canonical) {
            await recordServerDiagnostic({
                channel: "creator_onboarding",
                severity: "error",
                message: "Creator ID submission attempted without canonical onboarding record",
                detail: {
                    route: "creator/onboarding/id-submission",
                    userId: caller.uid,
                },
            });
            return buildErrorResponse(409, "Creator onboarding was not found for this account.");
        }

        if (canonical.idVerificationStatus !== "id_requested" && canonical.idVerificationStatus !== "id_rejected") {
            return buildErrorResponse(409, "ID submission is not currently requested for this account.");
        }

        const actorMarker = assertKnownActor(buildActorMarker({
            actor: {
                uid: caller.uid,
                email: caller.email,
                role: typeof userData.role === "string" ? userData.role : canonical.role,
            },
            targetUserId: caller.uid,
            targetCreatorId: caller.uid,
            performedAs: "own_account",
            surface: "creator_intake",
            route: "/api/creator/onboarding/id-submission",
            actionKey: "creator_id_submitted",
            occurredAt: Date.now(),
            dedupeKey: `creator_id_submission:${caller.uid}:${uploadedSlot}`,
            source: "creator_id_submission",
        }));
        actorMarkerForFailure = actorMarker;

        const uploadBuffer = Buffer.from(await file.arrayBuffer());
        uploadedStoragePath = buildStoragePath(caller.uid, uploadedSlot, file.name);
        await adminStorage.bucket().file(uploadedStoragePath).save(uploadBuffer, {
            metadata: {
                contentType: file.type,
                cacheControl: "private, max-age=0, no-store",
                metadata: {
                    documentType: `creator_id_${uploadedSlot}`,
                    idSide: uploadedSlot,
                    uploadedByUid: caller.uid,
                    originalFileName: file.name,
                    uploadedAtMs: String(Date.now()),
                },
            },
        });

        const existingIdDocuments = canonical.idDocuments ?? (canonical.idDocument ? { front: canonical.idDocument } : {});
        const previousIdDocumentPath = existingIdDocuments[uploadedSlot]?.storagePath;
        const nowMs = Date.now();
        const idDocument = {
            fileName: file.name,
            storagePath: uploadedStoragePath,
            contentType: file.type,
            sizeBytes: file.size,
            uploadedAt: nowMs,
            uploadedByUid: caller.uid,
        };

        const result = await adminDb.runTransaction(async (transaction) => {
            const [latestOnboardingSnap, latestUserSnap] = await transaction.getAll(onboardingRef, userRef);
            const latestCanonical = normalizeCreatorOnboardingCanonicalRecord(latestOnboardingSnap.data());
            const latestUserData = (latestUserSnap.data() as Record<string, unknown> | undefined) ?? userData;
            if (!latestCanonical) {
                throw new Error("Creator onboarding canonical record disappeared during ID submission.");
            }

            if (latestCanonical.idVerificationStatus !== "id_requested" && latestCanonical.idVerificationStatus !== "id_rejected") {
                throw new Error("ID submission is not currently requested for this account.");
            }

            const latestIdDocuments = latestCanonical.idDocuments ?? (latestCanonical.idDocument ? { front: latestCanonical.idDocument } : {});
            const nextIdDocuments = {
                ...latestIdDocuments,
                [uploadedSlot]: idDocument,
            };
            const idSummary = getCreatorOnboardingIdDocumentSummary({
                idDocument: nextIdDocuments.front ?? nextIdDocuments.back,
                idDocuments: nextIdDocuments,
            });
            const documentsComplete = idSummary.complete;

            const nextCanonical = buildCreatorOnboardingCanonicalRecord({
                userId: caller.uid,
                email: typeof latestUserData.email === "string" ? latestUserData.email : caller.email ?? null,
                username: typeof latestUserData.username === "string" ? latestUserData.username : canonical.username,
                displayName: typeof latestUserData.displayName === "string" ? latestUserData.displayName : canonical.creatorDisplayName,
                photoURL: typeof latestUserData.photoURL === "string" ? latestUserData.photoURL : canonical.photoURL,
                role: typeof latestUserData.role === "string" ? latestUserData.role : canonical.role,
                createdAt: canonical.createdAt,
                queuePosition: canonical.queuePosition,
                creatorDisplayName: canonical.creatorDisplayName,
                creatorPrimaryPlatform: canonical.creatorPrimaryPlatform,
                creatorContentFocus: canonical.creatorContentFocus,
                nowMs,
                source: {
                    ...latestCanonical,
                    idVerificationStatus: documentsComplete ? "id_submitted" : "id_requested",
                    idVerificationSubmittedAt: documentsComplete ? nowMs : undefined,
                    idVerificationReviewedAt: undefined,
                    updatedAt: nowMs,
                    idDocument: nextIdDocuments.front ?? nextIdDocuments.back,
                    idDocuments: nextIdDocuments,
                },
            });

            const synced = syncCreatorOnboardingDocuments(transaction, {
                userId: caller.uid,
                displayName: typeof latestUserData.displayName === "string" ? latestUserData.displayName : canonical.creatorDisplayName,
                canonical: nextCanonical,
            });

            transaction.set(
                onboardingRef.collection(CREATOR_ONBOARDING_HISTORY_SUBCOLLECTION).doc(`id_submitted_${nowMs}`),
                {
                    eventType: "id_submitted",
                    actorId: caller.uid,
                    actorRole: "creator",
                    actorLabel: typeof latestUserData.displayName === "string" ? latestUserData.displayName : canonical.creatorDisplayName,
                    timestamp: nowMs,
                    summary: documentsComplete
                        ? "Creator verification package submitted for review"
                        : `Creator verification file ${uploadedSlot} uploaded`,
                    metadata: {
                        slot: uploadedSlot,
                        documentsComplete,
                        fileName: file.name,
                        contentType: file.type,
                        sizeBytes: file.size,
                        ...buildActorMarkerDebugFields(actorMarker),
                    },
                },
            );

            return {
                creatorApplication: synced.creatorApplication,
                documentsComplete,
            };
        });

        if (previousIdDocumentPath && previousIdDocumentPath !== uploadedStoragePath) {
            await adminStorage.bucket().file(previousIdDocumentPath).delete({ ignoreNotFound: true }).catch(() => {
                return undefined;
            });
        }

        await Promise.allSettled([
            trackServerEvent("creator_id_document_uploaded", {
                page_path: "/creators/waitlist",
                id_slot: uploadedSlot,
                file_name: file.name,
                file_type: file.type,
                file_size_bytes: file.size,
                documents_complete: result.documentsComplete,
                onboarding_status: result.creatorApplication.submissionStatus,
                legal_status: result.creatorApplication.legalStatus,
                ...actorMarkerToTelemetryPayload(actorMarker),
            }, caller.uid),
            ...(result.documentsComplete ? [
                trackServerEvent("creator_id_submitted", {
                    page_path: "/creators/waitlist",
                    file_name: file.name,
                    file_type: file.type,
                    file_size_bytes: file.size,
                    onboarding_status: result.creatorApplication.submissionStatus,
                    legal_status: result.creatorApplication.legalStatus,
                    ...actorMarkerToTelemetryPayload(actorMarker),
                }, caller.uid),
                sendCreatorOnboardingAdminNotification({
                    eventKey: `creator_id_submitted:${caller.uid}`,
                    title: "Creator verification package ready for review",
                    message: `${canonical.creatorDisplayName} submitted the required verification package for manual review.`,
                    link: `/admin/roster?focus=${caller.uid}`,
                    type: "warning",
                }),
            ] : []),
        ]);

        return NextResponse.json({
            success: true,
            creatorApplication: result.creatorApplication,
            uploadedSlot,
            documentsComplete: result.documentsComplete,
        });
    } catch (error) {
        const routeError = error instanceof Error ? error : new Error(String(error));

        if (uploadedStoragePath && adminStorage) {
            await adminStorage.bucket().file(uploadedStoragePath).delete({ ignoreNotFound: true }).catch(() => {
                return undefined;
            });
        }

        await Promise.allSettled([
            trackServerEvent("creator_id_submission_failed", {
                page_path: "/creators/waitlist",
                error_message: routeError.message,
                ...(actorMarkerForFailure
                    ? actorMarkerToTelemetryPayload(actorMarkerForFailure)
                    : {
                        actorType: "unknown",
                        performedAs: "own_account",
                        surface: "creator_intake",
                        route: "/api/creator/onboarding/id-submission",
                        actionKey: "creator_id_submission_failed",
                        source: "creator_id_submission",
                        unknownActorBlocked: true,
                        actorClassificationReason: "ID submission failed before a trusted actor marker was built.",
                    }),
            }),
            recordServerDiagnostic({
                channel: "creator_onboarding",
                severity: "error",
                message: "Creator ID submission failed",
                detail: {
                    route: "creator/onboarding/id-submission",
                    error: routeError.message,
                },
            }),
        ]);

        if (routeError.message === "ID submission is not currently requested for this account.") {
            return buildErrorResponse(409, routeError.message);
        }

        return handleApiError(routeError, "Creator.Onboarding.IdSubmission");
    }
}

export let POST = withRouteRuntimeHealth("creator/onboarding/id-submission:POST", POST_handler);
