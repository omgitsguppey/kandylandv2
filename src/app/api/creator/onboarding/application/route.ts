import { NextRequest, NextResponse } from "next/server";

import {
    buildCreatorOnboardingCanonicalRecord,
    canEditCreatorApplicantIntake,
    normalizeCreatorOnboardingCanonicalRecord,
    sanitizeCreatorApplicantEditableFields,
} from "@/lib/creator-onboarding";
import { normalizeCreatorApplication } from "@/lib/creator-application";
import { handleApiError } from "@/lib/server/auth";
import { trackServerEvent } from "@/lib/server/analytics";
import {
    CREATOR_ONBOARDING_COLLECTION,
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

const APPROVED_APPLICATION_EDIT_ERROR = "Approved creator applications must be managed through the standard creator profile tools.";

function buildErrorResponse(status: number, message: string) {
    return NextResponse.json({ error: message }, { status });
}

function readRole(value: unknown) {
    return value === "creator" || value === "admin" || value === "user"
        ? value
        : "user";
}

async function PUT_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/onboarding/application",
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

        const updates = sanitizeCreatorApplicantEditableFields(await request.json());
        if (!updates) {
            return buildErrorResponse(400, "Enter a creator name, platform, and content summary before saving.");
        }

        const onboardingRef = adminDb.collection(CREATOR_ONBOARDING_COLLECTION).doc(caller.uid);
        const userRef = adminDb.collection("users").doc(caller.uid);
        const [onboardingSnap, userSnap] = await Promise.all([
            onboardingRef.get(),
            userRef.get(),
        ]);
        const canonical = normalizeCreatorOnboardingCanonicalRecord(onboardingSnap.data());
        const userData = (userSnap.data() as Record<string, unknown> | undefined) ?? {};
        const existingProjection = normalizeCreatorApplication(userData.creatorApplication);
        const currentRole = readRole(userData.role ?? canonical?.role);
        const currentApprovalStatus = canonical?.approvalStatus ?? existingProjection?.approvalStatus ?? "creator_pending";
        const actorMarker = assertKnownActor(buildActorMarker({
            actor: {
                uid: caller.uid,
                email: caller.email,
                role: currentRole,
            },
            targetUserId: caller.uid,
            targetCreatorId: caller.uid,
            performedAs: "own_account",
            surface: "creator_intake",
            route: "/api/creator/onboarding/application",
            actionKey: "creator_application_updated",
            occurredAt: Date.now(),
            dedupeKey: `creator_application_updated:${caller.uid}`,
            source: "creator_onboarding_application",
        }));

        if (!canonical && !existingProjection) {
            await recordServerDiagnostic({
                channel: "creator_onboarding",
                severity: "error",
                message: "Creator application edit attempted without canonical onboarding record",
                detail: {
                    route: "creator/onboarding/application",
                    userId: caller.uid,
                    ...buildActorMarkerDebugFields(actorMarker),
                },
            });
            return buildErrorResponse(409, "Creator onboarding was not found for this account.");
        }

        if (!canEditCreatorApplicantIntake({
            approvalStatus: currentApprovalStatus,
            role: currentRole,
        })) {
            await recordServerDiagnostic({
                channel: "creator_onboarding",
                severity: "warn",
                message: "Creator application edit blocked after approval",
                detail: {
                    route: "creator/onboarding/application",
                    userId: caller.uid,
                    approvalStatus: currentApprovalStatus,
                    role: currentRole,
                    ...buildActorMarkerDebugFields(actorMarker),
                },
            });
            return buildErrorResponse(409, APPROVED_APPLICATION_EDIT_ERROR);
        }

        const result = await adminDb.runTransaction(async (transaction) => {
            const [latestOnboardingSnap, latestUserSnap] = await transaction.getAll(onboardingRef, userRef);
            const latestCanonical = normalizeCreatorOnboardingCanonicalRecord(latestOnboardingSnap.data());
            const latestUserData = (latestUserSnap.data() as Record<string, unknown> | undefined) ?? userData;
            const latestProjection = normalizeCreatorApplication(latestUserData.creatorApplication);
            const workingCanonical = latestCanonical ?? (latestProjection
                ? buildCreatorOnboardingCanonicalRecord({
                    userId: caller.uid,
                    email: typeof latestUserData.email === "string" ? latestUserData.email : caller.email ?? null,
                    username: typeof latestUserData.username === "string" ? latestUserData.username : undefined,
                    displayName: typeof latestUserData.displayName === "string" ? latestUserData.displayName : latestProjection.creatorDisplayName,
                    photoURL: typeof latestUserData.photoURL === "string" ? latestUserData.photoURL : null,
                    role: readRole(latestUserData.role),
                    createdAt: typeof latestUserData.createdAt === "number" ? latestUserData.createdAt : Date.now(),
                    queuePosition: latestProjection.queuePosition,
                    creatorDisplayName: latestProjection.creatorDisplayName,
                    creatorMonetizationGoals: latestProjection.creatorMonetizationGoals,
                    creatorPrimaryPlatform: latestProjection.creatorPrimaryPlatform,
                    creatorFollowerRange: latestProjection.creatorFollowerRange,
                    creatorPostingFrequency: latestProjection.creatorPostingFrequency,
                    creatorContentFocus: latestProjection.creatorContentFocus,
                    fansAlreadyAskForAccess: latestProjection.fansAlreadyAskForAccess,
                    creatorRecommendedSetup: latestProjection.creatorRecommendedSetup,
                    intakeVersion: latestProjection.intakeVersion,
                    intakeSubmittedAt: latestProjection.intakeSubmittedAt,
                    intakeSource: latestProjection.intakeSource,
                    nowMs: latestProjection.updatedAt || Date.now(),
                    source: latestProjection,
                })
                : null);

            if (!workingCanonical) {
                throw new Error("Creator onboarding canonical record disappeared during application edit.");
            }

            const latestRole = readRole(latestUserData.role ?? workingCanonical.role);
            if (!canEditCreatorApplicantIntake({
                approvalStatus: workingCanonical.approvalStatus,
                role: latestRole,
            })) {
                throw new Error(APPROVED_APPLICATION_EDIT_ERROR);
            }

            const nowMs = Date.now();
            const nextCanonical = buildCreatorOnboardingCanonicalRecord({
                userId: caller.uid,
                email: typeof latestUserData.email === "string" ? latestUserData.email : caller.email ?? null,
                username: typeof latestUserData.username === "string" ? latestUserData.username : workingCanonical.username,
                displayName: typeof latestUserData.displayName === "string" ? latestUserData.displayName : updates.creatorDisplayName,
                photoURL: typeof latestUserData.photoURL === "string" ? latestUserData.photoURL : workingCanonical.photoURL,
                role: latestRole,
                createdAt: workingCanonical.createdAt,
                queuePosition: workingCanonical.queuePosition,
                creatorDisplayName: updates.creatorDisplayName,
                creatorMonetizationGoals: updates.creatorMonetizationGoals,
                creatorPrimaryPlatform: updates.creatorPrimaryPlatform,
                creatorFollowerRange: updates.creatorFollowerRange,
                creatorPostingFrequency: updates.creatorPostingFrequency,
                creatorContentFocus: updates.creatorContentFocus,
                fansAlreadyAskForAccess: updates.fansAlreadyAskForAccess,
                creatorRecommendedSetup: updates.creatorRecommendedSetup,
                intakeVersion: updates.intakeVersion,
                intakeSubmittedAt: workingCanonical.intakeSubmittedAt,
                intakeSource: updates.intakeSource,
                nowMs,
                source: {
                    ...workingCanonical,
                    updatedAt: nowMs,
                    creatorDisplayName: updates.creatorDisplayName,
                    creatorMonetizationGoals: updates.creatorMonetizationGoals,
                    creatorPrimaryPlatform: updates.creatorPrimaryPlatform,
                    creatorFollowerRange: updates.creatorFollowerRange,
                    creatorPostingFrequency: updates.creatorPostingFrequency,
                    creatorContentFocus: updates.creatorContentFocus,
                    fansAlreadyAskForAccess: updates.fansAlreadyAskForAccess,
                    creatorRecommendedSetup: updates.creatorRecommendedSetup,
                    intakeVersion: updates.intakeVersion,
                    intakeSource: updates.intakeSource,
                },
            });

            const synced = syncCreatorOnboardingDocuments(transaction, {
                userId: caller.uid,
                displayName: typeof latestUserData.displayName === "string"
                    ? latestUserData.displayName
                    : updates.creatorDisplayName,
                canonical: nextCanonical,
            });

            return {
                creatorApplication: synced.creatorApplication,
                materializedLegacyProjection: !latestCanonical && Boolean(latestProjection),
            };
        });

        if (result.materializedLegacyProjection) {
            await recordServerDiagnostic({
                channel: "creator_onboarding",
                severity: "warn",
                message: "Creator application edit materialized canonical onboarding from legacy projection",
                detail: {
                    route: "creator/onboarding/application",
                    userId: caller.uid,
                    ...buildActorMarkerDebugFields(actorMarker),
                },
            });
        }

        await trackServerEvent("creator_application_updated", {
            page_path: "/creators/waitlist",
            onboarding_status: result.creatorApplication.submissionStatus,
            legal_status: result.creatorApplication.legalStatus,
            ...actorMarkerToTelemetryPayload(actorMarker),
        }, caller.uid).catch(() => undefined);

        return NextResponse.json({
            success: true,
            creatorApplication: result.creatorApplication,
        });
    } catch (error) {
        if (error instanceof Error && error.message === APPROVED_APPLICATION_EDIT_ERROR) {
            return buildErrorResponse(409, error.message);
        }

        return handleApiError(error, "Creator.Onboarding.Application");
    }
}

export let PUT = withRouteRuntimeHealth("creator/onboarding/application:PUT", PUT_handler);
