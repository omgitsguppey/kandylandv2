import { NextRequest, NextResponse } from "next/server";

import {
    CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS,
    CREATOR_MASTER_SERVICE_AGREEMENT_VERSION,
} from "@/lib/creator-contract";
import {
    CREATOR_AGREEMENT_DISPATCHES_SUBCOLLECTION,
    CREATOR_AGREEMENT_SIGNATURES_SUBCOLLECTION,
    CREATOR_AGREEMENT_TEMPLATE_COLLECTION,
    buildCreatorAgreementDispatch,
    buildCreatorAgreementSignature,
    buildDefaultCreatorAgreementTemplate,
    normalizeCreatorAgreementTemplate,
} from "@/lib/creator-agreement-documents";
import {
    hasRequiredCreatorAgreementAcknowledgements,
    normalizeCreatorAgreementAcknowledgements,
} from "@/lib/creator-agreement-signature-ux";
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

class ContractSignaturePreconditionError extends Error {
    status: number;

    constructor(message: string, status = 409) {
        super(message);
        this.name = "ContractSignaturePreconditionError";
        this.status = status;
    }
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

function assertContentSourceAvailable(input: {
    agreementSource?: string;
    pdfStoragePath?: string;
    fullTextStoragePath?: string;
    legalDocumentUrl?: string;
}) {
    if (input.agreementSource === "native_full_text") {
        return CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS.length > 0;
    }

    if (input.agreementSource === "hybrid") {
        return CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS.length > 0
            || Boolean(input.pdfStoragePath || input.fullTextStoragePath || input.legalDocumentUrl);
    }

    return Boolean(input.pdfStoragePath || input.fullTextStoragePath || input.legalDocumentUrl);
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

        const body = await request.json().catch(() => ({})) as {
            signatureName?: unknown;
            acknowledgementValues?: unknown;
        };
        const signatureName = readString(body.signatureName);
        if (signatureName.length < 2) {
            return buildErrorResponse(400, "Enter your legal name before signing.");
        }
        const acknowledgementValues = normalizeCreatorAgreementAcknowledgements(body.acknowledgementValues);
        if (!hasRequiredCreatorAgreementAcknowledgements(acknowledgementValues)) {
            return buildErrorResponse(400, "Review and accept every agreement acknowledgement before signing.");
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

        if (!canonical.agreementDispatchId) {
            return buildErrorResponse(409, "No active agreement dispatch exists for this account.");
        }

        if (!canonical.contractVersion) {
            return buildErrorResponse(409, "Agreement version is missing.");
        }

        if (!canonical.agreementHash) {
            return buildErrorResponse(409, "Agreement hash is missing.");
        }

        const nowMs = Date.now();
        const actorLabel = readString(userData.displayName) || canonical.creatorDisplayName;
        const signerEmail = readString(userData.email) || readString(caller.email);
        if (!signerEmail) {
            return buildErrorResponse(409, "Your account email is required before signing.");
        }
        const signatureIp = readRequestIp(request) || "unavailable";
        const signatureUserAgent = request.headers.get("user-agent")?.trim() || "unavailable";
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
            actionKey: "creator_agreement_signed",
            occurredAt: nowMs,
            dedupeKey: `creator_agreement_signed:${caller.uid}:${canonical.agreementDispatchId}:${canonical.agreementHash}`,
            source: "creator_agreement_signature_ux",
        }));
        const initialTemplateRef = canonical.agreementTemplateId
            ? adminDb.collection(CREATOR_AGREEMENT_TEMPLATE_COLLECTION).doc(canonical.agreementTemplateId)
            : null;

        const result = await adminDb.runTransaction(async (transaction) => {
            const snaps = await transaction.getAll(
                onboardingRef,
                userRef,
                ...(initialTemplateRef ? [initialTemplateRef] : []),
            );
            const [latestOnboardingSnap, latestUserSnap, templateSnap] = snaps;
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

            if (!latestCanonical.agreementDispatchId) {
                throw new ContractSignaturePreconditionError("No active agreement dispatch exists for this account.");
            }
            if (!latestCanonical.contractVersion) {
                throw new ContractSignaturePreconditionError("Agreement version is missing.");
            }
            if (!latestCanonical.agreementHash) {
                throw new ContractSignaturePreconditionError("Agreement hash is missing.");
            }

            const defaultTemplate = buildDefaultCreatorAgreementTemplate(nowMs);
            const storedTemplate = normalizeCreatorAgreementTemplate(templateSnap?.data());
            const template = storedTemplate ?? {
                ...defaultTemplate,
                templateId: latestCanonical.agreementTemplateId || defaultTemplate.templateId,
                agreementVersion: latestCanonical.contractVersion,
                agreementTitle: latestCanonical.agreementTitle || defaultTemplate.agreementTitle,
                agreementHash: latestCanonical.agreementHash,
                agreementSource: latestCanonical.agreementSource || defaultTemplate.agreementSource,
            };
            if (!assertContentSourceAvailable({
                agreementSource: latestCanonical.agreementSource || template.agreementSource,
                pdfStoragePath: template.pdfStoragePath,
                fullTextStoragePath: template.fullTextStoragePath,
                legalDocumentUrl: latestCanonical.legalDocumentUrl,
            })) {
                throw new ContractSignaturePreconditionError("Agreement content is unavailable. Ask creator support to resend it.");
            }

            const nextCanonical = buildCreatorOnboardingCanonicalRecord({
                userId: caller.uid,
                email: typeof latestUserData.email === "string" ? latestUserData.email : signerEmail,
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
                    agreementDispatchStatus: "signed",
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
                agreementSource: template.agreementSource,
                pdfStoragePath: template.pdfStoragePath,
                fullTextSnapshotPath: template.fullTextStoragePath,
                signerUid: caller.uid,
                signerName: signatureName,
                signerEmail,
                signedAt: nowMs,
                signerIp: signatureIp,
                signerUserAgent: signatureUserAgent,
                acknowledgementValues: {
                    ...acknowledgementValues,
                    creatorSignature: true,
                    route: "/api/creator/onboarding/contract-signature",
                },
            });

            transaction.set(
                onboardingRef.collection(CREATOR_AGREEMENT_DISPATCHES_SUBCOLLECTION).doc(dispatch.dispatchId),
                {
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

        const telemetryPayload = {
            page_path: "/creators/waitlist",
            contract_version: result.creatorApplication.contractVersion ?? CREATOR_MASTER_SERVICE_AGREEMENT_VERSION,
            onboarding_status: result.creatorApplication.submissionStatus,
            legal_status: result.creatorApplication.legalStatus,
            agreement_version: result.creatorApplication.contractVersion ?? CREATOR_MASTER_SERVICE_AGREEMENT_VERSION,
            agreement_hash: result.creatorApplication.agreementHash ?? "",
            agreement_source: result.creatorApplication.agreementSource ?? "",
            template_id: result.creatorApplication.agreementTemplateId ?? "",
            dispatch_id: result.creatorApplication.agreementDispatchId ?? "",
            ...actorMarkerToTelemetryPayload(actorMarker),
        };

        await Promise.all([
            trackServerEvent("creator_agreement_signed", telemetryPayload, caller.uid),
            trackServerEvent("creator_contract_signed", telemetryPayload, caller.uid),
        ]).catch(() => undefined);

        return NextResponse.json({
            success: true,
            creatorApplication: result.creatorApplication,
        });
    } catch (error) {
        if (error instanceof ContractSignaturePreconditionError) {
            return buildErrorResponse(error.status, error.message);
        }

        return handleApiError(error, "Creator.Onboarding.ContractSignature");
    }
}

export let POST = withRouteRuntimeHealth("creator/onboarding/contract-signature:POST", POST_handler);
