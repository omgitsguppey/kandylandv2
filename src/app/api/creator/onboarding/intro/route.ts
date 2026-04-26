import { NextRequest, NextResponse } from "next/server";

import { CREATOR_ONBOARDING_INTRO_VERSION } from "@/lib/creator-contract";
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

            transaction.set(
                onboardingRef.collection(CREATOR_ONBOARDING_HISTORY_SUBCOLLECTION).doc(`intro_acknowledged_${nowMs}`),
                {
                    eventType: "intro_acknowledged",
                    actorId: caller.uid,
                    actorRole: "creator",
                    actorLabel,
                    timestamp: nowMs,
                    summary: "Creator intro acknowledged",
                    metadata: {
                        introVersion: CREATOR_ONBOARDING_INTRO_VERSION,
                    },
                },
            );

            if (latestCanonical.idVerificationStatus === "id_not_requested") {
                transaction.set(
                    onboardingRef.collection(CREATOR_ONBOARDING_HISTORY_SUBCOLLECTION).doc(`id_requested_${nowMs}`),
                    {
                        eventType: "id_requested",
                        actorId: "system",
                        actorRole: "system",
                        actorLabel: "System",
                        timestamp: nowMs,
                        summary: "Creator ID verification requested",
                    },
                );
            }

            return {
                creatorApplication: synced.creatorApplication,
            };
        });

        await trackServerEvent("creator_intro_acknowledged", {
            page_path: "/creators/waitlist",
            intro_version: CREATOR_ONBOARDING_INTRO_VERSION,
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
