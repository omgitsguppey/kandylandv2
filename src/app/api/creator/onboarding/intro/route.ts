import { NextRequest, NextResponse } from "next/server";

import { CREATOR_ONBOARDING_INTRO_VERSION } from "@/lib/creator-contract";
import {
    buildCreatorOnboardingCanonicalRecord,
    normalizeCreatorOnboardingCanonicalRecord,
} from "@/lib/creator-onboarding";
import { handleApiError } from "@/lib/server/auth";
import { trackServerEvent } from "@/lib/server/analytics";
import {
    buildCreatorOnboardingHistoryEntry,
    CREATOR_ONBOARDING_COLLECTION,
    recordCreatorOnboardingHistoryEntries,
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
} from "@/lib/identity-truth/identity/actor-markers";

function buildErrorResponse(status: number, message: string) {
    const expectedCode = status === 401
        ? "unauthorized"
        : status >= 400 && status < 500
            ? "invalid_creator_request"
            : null;
    return NextResponse.json({
        success: false,
        error: message,
        message,
        ...(expectedCode ? { code: expectedCode, retryable: false } : {}),
    }, { status });
}

function readRole(value: unknown) {
    return value === "creator" || value === "admin" || value === "user"
        ? value
        : "user";
}

function readString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

async function POST_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/onboarding/intro",
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
                message: "Creator intro acknowledgment attempted without canonical onboarding record",
                detail: {
                    route: "creator/onboarding/intro",
                    userId: caller.uid,
                },
            });
            return buildErrorResponse(409, "Creator onboarding was not found for this account.");
        }

        const nowMs = Date.now();
        const actorLabel = readString(userData.displayName) || canonical.creatorDisplayName;
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
            route: "/api/creator/onboarding/intro",
            actionKey: "creator_intro_acknowledged",
            occurredAt: nowMs,
            dedupeKey: `creator_intro_acknowledged:${caller.uid}`,
            source: "creator_onboarding_intro",
        }));

        const result = await adminDb.runTransaction(async (transaction) => {
            const [latestOnboardingSnap, latestUserSnap] = await transaction.getAll(onboardingRef, userRef);
            const latestCanonical = normalizeCreatorOnboardingCanonicalRecord(latestOnboardingSnap.data());
            const latestUserData = (latestUserSnap.data() as Record<string, unknown> | undefined) ?? userData;
            if (!latestCanonical) {
                throw new Error("Creator onboarding canonical record disappeared during intro acknowledgment.");
            }

            if (latestCanonical.introAcknowledgedAt) {
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
                    introAcknowledgedAt: nowMs,
                    introAcknowledgedVersion: CREATOR_ONBOARDING_INTRO_VERSION,
                    introAcknowledgedByUid: caller.uid,
                    introAcknowledgedByName: actorLabel,
                    idVerificationStatus: latestCanonical.idVerificationStatus === "id_not_requested"
                        ? "id_requested"
                        : latestCanonical.idVerificationStatus,
                    idVerificationRequestedAt: latestCanonical.idVerificationRequestedAt ?? nowMs,
                    updatedAt: nowMs,
                },
            });

            const synced = syncCreatorOnboardingDocuments(transaction, {
                userId: caller.uid,
                displayName: readString(latestUserData.displayName) || latestCanonical.creatorDisplayName,
                canonical: nextCanonical,
            });

            const historyEntries: Array<{ id: string; entry: ReturnType<typeof buildCreatorOnboardingHistoryEntry> }> = [{
                id: `intro_acknowledged_${nowMs}`,
                entry: buildCreatorOnboardingHistoryEntry({
                    eventType: "intro_acknowledged",
                    actor: {
                        id: caller.uid,
                        role: "creator",
                        label: actorLabel,
                        marker: actorMarker,
                    },
                    timestamp: nowMs,
                    summary: "Creator intro acknowledged",
                    metadata: {
                        introVersion: CREATOR_ONBOARDING_INTRO_VERSION,
                    },
                }),
            }];

            if (latestCanonical.idVerificationStatus === "id_not_requested") {
                historyEntries.push({
                    id: `id_requested_${nowMs}`,
                    entry: buildCreatorOnboardingHistoryEntry({
                        eventType: "id_requested",
                        actor: {
                            id: "system",
                            role: "system",
                            label: "System",
                        },
                        timestamp: nowMs,
                        summary: "Creator ID verification requested",
                        targetUserId: caller.uid,
                        targetCreatorId: caller.uid,
                    }),
                });
            }

            recordCreatorOnboardingHistoryEntries(transaction, caller.uid, historyEntries);

            return {
                creatorApplication: synced.creatorApplication,
            };
        });

        await trackServerEvent("creator_intro_acknowledged", {
            page_path: "/creators/waitlist",
            intro_version: CREATOR_ONBOARDING_INTRO_VERSION,
            onboarding_status: result.creatorApplication.submissionStatus,
            legal_status: result.creatorApplication.legalStatus,
            ...actorMarkerToTelemetryPayload(actorMarker),
        }, caller.uid).catch(() => undefined);

        return NextResponse.json({
            success: true,
            creatorApplication: result.creatorApplication,
        });
    } catch (error) {
        return handleApiError(error, "Creator.Onboarding.Intro");
    }
}

export let POST = withRouteRuntimeHealth("creator/onboarding/intro:POST", POST_handler);
