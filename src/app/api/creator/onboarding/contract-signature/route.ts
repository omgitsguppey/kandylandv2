import { NextRequest, NextResponse } from "next/server";

import { CREATOR_MASTER_SERVICE_AGREEMENT_VERSION } from "@/lib/creator-contract";
import {
    CREATOR_AGREEMENT_DISPATCHES_SUBCOLLECTION,
    CREATOR_AGREEMENT_SIGNATURES_SUBCOLLECTION,
    buildCreatorAgreementDispatch,
    buildCreatorAgreementSignature,
    buildDefaultCreatorAgreementTemplate,
} from "@/lib/creator-agreement-documents";
import {
    buildCreatorOnboardingCanonicalRecord,
    normalizeCreatorOnboardingCanonicalRecord,
} from "@/lib/creator-onboarding";
import { handleApiError } from "@/lib/server/auth";
import { trackServerEvent } from "@/lib/server/analytics";
import {
    CREATOR_ONBOARDING_COLLECTION,
    CREATOR_ONBOARDING_HISTORY_SUBCOLLECTION,
    syncCreatorOnboardingDocuments,
} from "@/lib/server/creator-onboarding";
import { adminDb } from "@/lib/server/firebase-admin";
import { STRICT } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import {
    actorMarkerToTelemetryPayload,
    assertKnownActor,
    buildActorMarker,
    buildActorMarkerDebugFields,
} from "@/lib/identity/actor-markers";

function buildErrorResponse(status: number, message: string) {
    return NextResponse.json({ error: message }, { status });
}

function readRole(value: unknown) {
    return value === "creator" || value === "admin" || value === "user"
        ? value
        : "user";
}

function readString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function readRequestIp(request: NextRequest) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0]?.trim() || undefined;
    }

    return request.headers.get("x-real-ip")?.trim() || undefined;
}

async function POST_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/onboarding/contract-signature",
            rateLimit: STRICT,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });

        if (!caller?.uid) {
            return buildErrorResponse(401, "Unauthorized");
        }

        if (!adminDb) {
            return buildErrorResponse(500, "Database not available");
        }

        const body = await request.json().catch(() => ({})) as { signatureName?: unknown };
        const signatureName = readString(body.signatureName);
        if (signatureName.length < 2) {
            return buildErrorResponse(400, "Enter your legal name before signing.");
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
                message: "Creator contract signature attempted without canonical onboarding record",
                detail: {
                    route: "creator/onboarding/contract-signature",
                    userId: caller.uid,
                },
            });
            return buildErrorResponse(409, "Creator onboarding was not found for this account.");
        }

        if (!canonical.introAcknowledgedAt) {
            return buildErrorResponse(409, "Acknowledge the creator intro before signing the agreement.");
        }

        if (canonical.idVerificationStatus !== "id_verified" && canonical.ownerOverrideActive !== true) {
            return buildErrorResponse(409, "Identity verification must be accepted before contract signing can continue.");
        }

        if (canonical.contractDocumentStatus !== "contract_sent") {
            return buildErrorResponse(409, "No creator agreement has been sent yet.");
        }

        const nowMs = Date.now();
        const actorLabel = readString(userData.displayName) || canonical.creatorDisplayName;
        const signatureIp = readRequestIp(request);
        const signatureUserAgent = request.headers.get("user-agent")?.trim() || undefined;
        const actorMarker = assertKnownActor(buildActorMarker({
            actor: {
                uid: caller.uid,
                email: caller.email,
                role: readRole(userData.role ?? canonical.role),
            },
            targetUserId: caller.uid,
            targetCreatorId: caller.uid,
            performedAs: "own_account",
            surface: "creator_intake",
            route: "/api/creator/onboarding/contract-signature",
            actionKey: "creator_contract_signed",
            occurredAt: nowMs,
            dedupeKey: `creator_contract_signed:${caller.uid}:${CREATOR_MASTER_SERVICE_AGREEMENT_VERSION}`,
            source: "creator_contract_signature",
        }));

        const result = await adminDb.runTransaction(async (transaction) => {
            const [latestOnboardingSnap, latestUserSnap] = await transaction.getAll(onboardingRef, userRef);
            const latestCanonical = normalizeCreatorOnboardingCanonicalRecord(latestOnboardingSnap.data());
            const latestUserData = (latestUserSnap.data() as Record<string, unknown> | undefined) ?? userData;
            if (!latestCanonical) {
                throw new Error("Creator onboarding canonical record disappeared during contract signing.");
            }

            if (latestCanonical.creatorSignatureStatus === "signature_signed") {
                return {
                    creatorApplication: syncCreatorOnboardingDocuments(transaction, {
                        userId: caller.uid,
                        displayName: readString(latestUserData.displayName) || latestCanonical.creatorDisplayName,
                        canonical: latestCanonical,
                    }).creatorApplication,
                };
            }

            const nextCanonical = buildCreatorOnboardingCanonicalRecord({
                userId: caller.uid,
                email: typeof latestUserData.email === "string" ? latestUserData.email : caller.email ?? null,
                username: typeof latestUserData.username === "string" ? latestUserData.username : latestCanonical.username,
                displayName: readString(latestUserData.displayName) || latestCanonical.creatorDisplayName,
                photoURL: typeof latestUserData.photoURL === "string" ? latestUserData.photoURL : latestCanonical.photoURL,
                role: readRole(latestUserData.role ?? latestCanonical.role),
                createdAt: latestCanonical.createdAt,
                queuePosition: latestCanonical.queuePosition,
                creatorDisplayName: latestCanonical.creatorDisplayName,
                creatorPrimaryPlatform: latestCanonical.creatorPrimaryPlatform,
                creatorContentFocus: latestCanonical.creatorContentFocus,
                nowMs,
                source: {
                    ...latestCanonical,
                    contractVersion: latestCanonical.contractVersion ?? CREATOR_MASTER_SERVICE_AGREEMENT_VERSION,
                    creatorSignatureStatus: "signature_signed",
                    creatorContractSignedAt: nowMs,
                    creatorContractSignedByName: signatureName,
                    creatorContractSignedIp: signatureIp,
                    creatorContractSignedUserAgent: signatureUserAgent,
                    updatedAt: nowMs,
                },
            });

            const synced = syncCreatorOnboardingDocuments(transaction, {
                userId: caller.uid,
                displayName: readString(latestUserData.displayName) || latestCanonical.creatorDisplayName,
                canonical: nextCanonical,
            });
            const template = {
                ...buildDefaultCreatorAgreementTemplate(nowMs),
                templateId: latestCanonical.agreementTemplateId || buildDefaultCreatorAgreementTemplate(nowMs).templateId,
                agreementVersion: latestCanonical.contractVersion ?? CREATOR_MASTER_SERVICE_AGREEMENT_VERSION,
                agreementTitle: latestCanonical.agreementTitle || buildDefaultCreatorAgreementTemplate(nowMs).agreementTitle,
                agreementHash: latestCanonical.agreementHash || buildDefaultCreatorAgreementTemplate(nowMs).agreementHash,
                agreementSource: latestCanonical.agreementSource || buildDefaultCreatorAgreementTemplate(nowMs).agreementSource,
            };
            const dispatch = buildCreatorAgreementDispatch({
                userId: caller.uid,
                sentByUid: "admin",
                template,
                sentAt: latestCanonical.legalDocumentSentAt ?? nowMs,
                dispatchId: latestCanonical.agreementDispatchId,
                status: "signed",
            });
            const signature = buildCreatorAgreementSignature({
                dispatch,
                signerUid: caller.uid,
                signerName: signatureName,
                signerEmail: caller.email,
                signedAt: nowMs,
                signerIp: signatureIp,
                signerUserAgent: signatureUserAgent,
                acknowledgementValues: {
                    creatorSignature: true,
                    route: "/api/creator/onboarding/contract-signature",
                },
            });

            transaction.set(
                onboardingRef.collection(CREATOR_AGREEMENT_DISPATCHES_SUBCOLLECTION).doc(dispatch.dispatchId),
                latestCanonical.agreementDispatchId
                    ? {
                        status: "signed",
                        agreementVersion: dispatch.agreementVersion,
                        templateId: dispatch.templateId,
                        agreementHash: dispatch.agreementHash,
                    }
                    : {
                        ...dispatch,
                        status: "signed",
                    },
                { merge: true },
            );
            transaction.set(
                onboardingRef.collection(CREATOR_AGREEMENT_SIGNATURES_SUBCOLLECTION).doc(`creator_${dispatch.dispatchId}`),
                signature,
                { merge: false },
            );
            transaction.set(
                onboardingRef.collection(CREATOR_ONBOARDING_HISTORY_SUBCOLLECTION).doc(`creator_contract_signed_${nowMs}`),
                {
                    eventType: "creator_contract_signed",
                    actorId: caller.uid,
                    actorRole: "creator",
                    actorLabel,
                    timestamp: nowMs,
                    summary: "Creator signed the agreement",
                    metadata: {
                        contractVersion: dispatch.agreementVersion,
                        agreementVersion: dispatch.agreementVersion,
                        agreementHash: dispatch.agreementHash,
                        templateId: dispatch.templateId,
                        dispatchId: dispatch.dispatchId,
                        signatureName,
                        ...buildActorMarkerDebugFields(actorMarker),
                    },
                },
            );

            return {
                creatorApplication: synced.creatorApplication,
            };
        });

        await trackServerEvent("creator_contract_signed", {
            page_path: "/creators/waitlist",
            contract_version: result.creatorApplication.contractVersion ?? CREATOR_MASTER_SERVICE_AGREEMENT_VERSION,
            onboarding_status: result.creatorApplication.submissionStatus,
            legal_status: result.creatorApplication.legalStatus,
            agreement_version: result.creatorApplication.contractVersion ?? CREATOR_MASTER_SERVICE_AGREEMENT_VERSION,
            agreement_hash: result.creatorApplication.agreementHash ?? "",
            template_id: result.creatorApplication.agreementTemplateId ?? "",
            dispatch_id: result.creatorApplication.agreementDispatchId ?? "",
            ...actorMarkerToTelemetryPayload(actorMarker),
        }, caller.uid).catch(() => undefined);

        return NextResponse.json({
            success: true,
            creatorApplication: result.creatorApplication,
        });
    } catch (error) {
        return handleApiError(error, "Creator.Onboarding.ContractSignature");
    }
}

export let POST = withRouteRuntimeHealth("creator/onboarding/contract-signature:POST", POST_handler);
