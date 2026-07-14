import { NextRequest, NextResponse } from "next/server";
import { AggregateField } from "firebase-admin/firestore";

import { AuthError, handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { adminDb } from "@/lib/server/firebase-admin";
import { guardApiRequest } from "@/lib/server/request-guard";
import {
    DEFAULT_CREATOR_RESTRICTIONS,
    DEFAULT_CREATOR_SETTINGS,
    isCreatorOrAdminRole,
    normalizeCreatorRestrictions,
    normalizeCreatorSettings,
} from "@/lib/creator-experiences";
import { buildAdminCreatorProjectionReadOnlyResponse, readAdminCreatorProjectionContext } from "@/lib/server/admin-creator-projection";
import { buildCreatorUpdateMerge, sanitizeCreatorRestrictionsUpdate, sanitizeCreatorSettingsUpdate } from "@/lib/server/creator-experiences";
import { shouldCountDropForCreatorDashboard } from "@/lib/server/creator-drop-scope";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { trackServerEvent } from "@/lib/server/analytics";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import {
    actorMarkerToTelemetryPayload,
    assertKnownActor,
    buildActorMarker,
} from "@/lib/identity-truth/identity/actor-markers";
import {
    buildCreatorSettingsCompletion,
    buildCreatorSettingsControlPlane,
    buildCreatorSettingsUserFacingImpact,
    sanitizeCreatorSettingsControlPlaneUpdate,
    stripAdminOnlyCreatorSettingsFields,
} from "@/lib/creator-settings/creator-settings-contract";
import {
    resolveCreatorMonetizationSettings,
    resolveUserFacingCreatorMonetization,
} from "@/lib/creator-monetization/creator-monetization-resolver";

const CREATOR_SETTINGS_BODY_LIMIT_BYTES = 32_768;

type CreatorStatsEvidenceState =
    | "verified_sample"
    | "queried_zero"
    | "partial"
    | "missing_source"
    | "needs_review"
    | "unavailable";

type CreatorStatsEvidenceSource = {
    state: CreatorStatsEvidenceState;
    value: number;
    sampleKnown: boolean;
    collection: string;
};

type CreatorSettingsSourceResult<T> = {
    state: CreatorStatsEvidenceState;
    value: T;
    issue: string | null;
    sampleKnown: boolean;
    collection: string;
};

type CreatorStatsEvidence = {
    generatedAtUtc: string;
    sourceTruth: "canonical" | "partial" | "needs_review" | "unavailable";
    sourceFreshness: "fresh" | "stale" | "unknown" | "unavailable";
    sampleCount: number;
    zeroValuesAreProven: boolean;
    readOnlyProjection: boolean;
    sources: {
        fans: CreatorStatsEvidenceSource;
        content: CreatorStatsEvidenceSource;
        ledgerAccruals: CreatorStatsEvidenceSource;
        pendingPayouts: CreatorStatsEvidenceSource;
        subscriptions: CreatorStatsEvidenceSource;
        customRequests: CreatorStatsEvidenceSource;
        callBookings: CreatorStatsEvidenceSource;
        relationshipsOps: CreatorStatsEvidenceSource;
        drops: CreatorStatsEvidenceSource;
        userProfile: CreatorStatsEvidenceSource;
    };
    fanCountSource: "relationship_count" | "profile_follower_count" | "settings_snapshot" | "unavailable";
    contentCountIncludes: Array<"active" | "expired" | "archived" | "unlisted">;
    contentCountScope: "creator_owned_or_assigned";
    issues: string[];
};

function toFiniteNumber(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function evidenceStateForCount(value: number, queried: boolean): CreatorStatsEvidenceState {
    if (!queried) return "missing_source";
    return value > 0 ? "verified_sample" : "queried_zero";
}

function evidenceSource(collection: string, value: number, state: CreatorStatsEvidenceState, sampleKnown: boolean): CreatorStatsEvidenceSource {
    return {
        collection,
        value,
        state,
        sampleKnown,
    };
}

function evidenceStateForSum(value: number, queried: boolean): CreatorStatsEvidenceState {
    if (!queried) return "missing_source";
    return value > 0 ? "verified_sample" : "queried_zero";
}

async function readCountFromQuery(query: any): Promise<number> {
    if (typeof query.count !== "function") {
        throw new Error("Firestore aggregate count is unavailable.");
    }

    const snapshot = await query.count().get();
    return toFiniteNumber(snapshot.data().count);
}

async function readCreatorFanCountSource(creatorId: string, userData: Record<string, unknown>): Promise<{
    state: CreatorStatsEvidenceState;
    value: number;
    issue: string | null;
    sampleKnown: boolean;
    collection: string;
    fanCountSource: CreatorStatsEvidence["fanCountSource"];
}> {
    if (!adminDb) {
        throw new AuthError("Creator settings database unavailable", 503);
    }

    try {
        const relationshipsQuery = adminDb.collection("creator_relationships")
            .where("creatorId", "==", creatorId)
            .where("following", "==", true);
        const followerCount = await readCountFromQuery(relationshipsQuery);
        return {
            state: evidenceStateForCount(followerCount, true),
            value: followerCount,
            issue: null,
            sampleKnown: true,
            collection: "creator_relationships",
            fanCountSource: "relationship_count",
        };
    } catch (relationshipError) {
        recordRouteWarning("creator/settings", "creator_relationships fan source unavailable", relationshipError, { channel: "runtime" });
    }

    const profileFollowerCount = userData.followerCount;
    if (typeof profileFollowerCount === "number" && Number.isFinite(profileFollowerCount)) {
        return {
            state: profileFollowerCount > 0 ? "partial" : "queried_zero",
            value: profileFollowerCount,
            issue: "relationships_source_unavailable_profile_fallback",
            sampleKnown: true,
            collection: "users",
            fanCountSource: "profile_follower_count",
        };
    }

    try {
        const snapshot = await adminDb.collection("creator_relationships_ops").doc(creatorId).get();
        if (!snapshot.exists) {
            throw new Error("creator_relationships_ops_missing");
        }
        const followerCount = toFiniteNumber((snapshot.data() as { followerCount?: number }).followerCount);
        return {
            state: followerCount > 0 ? "partial" : "queried_zero",
            value: followerCount,
            issue: "relationships_source_unavailable_settings_snapshot",
            sampleKnown: true,
            collection: "creator_relationships_ops",
            fanCountSource: "settings_snapshot",
        };
    } catch (opsError) {
        recordRouteWarning("creator/settings", "creator_relationships_ops fan fallback unavailable", opsError, { channel: "runtime" });
    }

    return {
        state: "unavailable",
        value: 0,
        issue: "fans_source_unavailable",
        sampleKnown: false,
        collection: "creator_relationships",
        fanCountSource: "unavailable",
    };
}

async function readCreatorDashboardDropCounts(creatorId: string): Promise<{
    state: CreatorStatsEvidenceState;
    contentCount: number;
    liveDropsCount: number;
    issue: string | null;
    sampleKnown: boolean;
    collection: string;
    contentCountIncludes: CreatorStatsEvidence["contentCountIncludes"];
}> {
    if (!adminDb) {
        throw new AuthError("Creator settings database unavailable", 503);
    }

    const docsById = new Map<string, Record<string, unknown>>();
    const addDocs = (snapshot: { docs?: Array<{ id: string; data: () => Record<string, unknown> }> }) => {
        for (const doc of snapshot.docs ?? []) {
            docsById.set(doc.id, { id: doc.id, ...doc.data() });
        }
    };

    try {
        const dropsCollection = adminDb.collection("drops");
        const snapshots = await Promise.all([
            dropsCollection.where("creatorId", "==", creatorId).limit(500).get(),
            dropsCollection.where("submittedByCreatorId", "==", creatorId).limit(500).get(),
            dropsCollection.where("assignedCreatorIds", "array-contains", creatorId).limit(500).get().catch(() => null),
        ]);
        for (const snapshot of snapshots) {
            if (snapshot) {
                addDocs(snapshot);
            }
        }

        const ownedDrops = Array.from(docsById.values())
            .filter((drop) => shouldCountDropForCreatorDashboard(drop, creatorId));
        const contentCountIncludes = Array.from(new Set(ownedDrops.flatMap((drop) => {
            const states: CreatorStatsEvidence["contentCountIncludes"] = [];
            const status = typeof drop.status === "string" ? drop.status : "";
            if (status === "expired") states.push("expired");
            else states.push("active");
            if (drop.archived === true || drop.isArchived === true) states.push("archived");
            if (drop.unlisted === true || drop.isUnlisted === true) states.push("unlisted");
            return states;
        }))) as CreatorStatsEvidence["contentCountIncludes"];
        const liveDropsCount = ownedDrops.filter((drop) => drop.status === "active").length;

        return {
            state: evidenceStateForCount(ownedDrops.length, true),
            contentCount: ownedDrops.length,
            liveDropsCount,
            issue: null,
            sampleKnown: true,
            collection: "drops",
            contentCountIncludes: contentCountIncludes.length > 0 ? contentCountIncludes : ["active"],
        };
    } catch (error) {
        recordRouteWarning("creator/settings", "drops dashboard scope source unavailable", error, { channel: "runtime" });
        return {
            state: "unavailable",
            contentCount: 0,
            liveDropsCount: 0,
            issue: "drops_source_unavailable",
            sampleKnown: false,
            collection: "drops",
            contentCountIncludes: ["active"],
        };
    }
}

async function readCreatorSettingsSource<T>(
    name: string,
    collection: string,
    fallback: T,
    loader: () => Promise<T>,
    unavailableState: CreatorStatsEvidenceState = "unavailable",
): Promise<CreatorSettingsSourceResult<T>> {
    try {
        return {
            state: "verified_sample",
            value: await loader(),
            issue: null,
            sampleKnown: true,
            collection,
        };
    } catch (error) {
        recordRouteWarning("creator/settings", `${name} source unavailable`, error, { channel: "runtime" });
        return {
            state: unavailableState,
            value: fallback,
            issue: `${name}_source_unavailable`,
            sampleKnown: false,
            collection,
        };
    }
}

function buildCreatorStatsEvidence(input: {
    generatedAtUtc: string;
    earningsGd: number;
    pendingCashoutGd: number;
    activeSubscribers: number;
    openRequests: number;
    bookedCalls: number;
    followerCount: number;
    fanCountSource: CreatorStatsEvidence["fanCountSource"];
    liveDropsCount: number;
    contentCount: number;
    contentCountIncludes: CreatorStatsEvidence["contentCountIncludes"];
    profileViewsCount: number;
    relationshipsOpsKnown: boolean;
    userProfileKnown: boolean;
    readOnlyProjection: boolean;
    sourceStates?: Partial<Record<keyof CreatorStatsEvidence["sources"], {
        state: CreatorStatsEvidenceState;
        sampleKnown: boolean;
        issue?: string | null;
    }>>;
    issues?: string[];
}): CreatorStatsEvidence {
    const sources: CreatorStatsEvidence["sources"] = {
        fans: evidenceSource("creator_relationships", input.followerCount, evidenceStateForCount(input.followerCount, input.relationshipsOpsKnown), input.relationshipsOpsKnown),
        content: evidenceSource("drops", input.contentCount, evidenceStateForCount(input.contentCount, true), true),
        ledgerAccruals: evidenceSource("creator_ledger_accruals", input.earningsGd, evidenceStateForSum(input.earningsGd, true), true),
        pendingPayouts: evidenceSource("creator_payout_requests", input.pendingCashoutGd, evidenceStateForSum(input.pendingCashoutGd, true), true),
        subscriptions: evidenceSource("creator_subscriptions", input.activeSubscribers, evidenceStateForCount(input.activeSubscribers, true), true),
        customRequests: evidenceSource("creator_custom_requests", input.openRequests, evidenceStateForCount(input.openRequests, true), true),
        callBookings: evidenceSource("creator_call_bookings", input.bookedCalls, evidenceStateForCount(input.bookedCalls, true), true),
        relationshipsOps: evidenceSource("creator_relationships_ops", input.followerCount, evidenceStateForCount(input.followerCount, input.relationshipsOpsKnown), input.relationshipsOpsKnown),
        drops: evidenceSource("drops", input.contentCount, evidenceStateForCount(input.contentCount, true), true),
        userProfile: evidenceSource("users", input.profileViewsCount, evidenceStateForCount(input.profileViewsCount, input.userProfileKnown), input.userProfileKnown),
    };
    for (const [key, override] of Object.entries(input.sourceStates ?? {}) as Array<[keyof CreatorStatsEvidence["sources"], NonNullable<typeof input.sourceStates>[keyof CreatorStatsEvidence["sources"]]]>) {
        if (!override) continue;
        sources[key] = {
            ...sources[key],
            state: override.state,
            sampleKnown: override.sampleKnown,
        };
    }
    const sourceList = Object.entries(sources);
    const sampleCount = sourceList.filter(([, source]) => source.sampleKnown).length;
    const partialSources = sourceList.filter(([, source]) => source.state === "partial");
    const needsReviewSources = sourceList.filter(([, source]) => source.state === "needs_review");
    const missingSources = sourceList.filter(([, source]) => source.state === "missing_source" || source.state === "unavailable");
    const zeroValuesAreProven = sourceList.every(([, source]) => source.value !== 0 || source.sampleKnown);
    const issues = [
        ...partialSources.map(([key]) => `${key}_sample_count_unknown`),
        ...needsReviewSources.map(([key]) => `${key}_needs_review`),
        ...missingSources.map(([key]) => `${key}_missing_source`),
        ...(zeroValuesAreProven ? [] : ["zero_values_not_fully_proven"]),
        ...(input.issues ?? []),
        ...Object.values(input.sourceStates ?? {}).flatMap((override) => override?.issue ? [override.issue] : []),
    ];
    const hasInputIssues = (input.issues ?? []).length > 0;
    const sourceTruth: CreatorStatsEvidence["sourceTruth"] = sampleCount === 0
        ? "unavailable"
        : needsReviewSources.length > 0
            ? "needs_review"
            : partialSources.length > 0 || missingSources.length > 0 || hasInputIssues
                ? "partial"
                : "canonical";

    return {
        generatedAtUtc: input.generatedAtUtc,
        sourceTruth,
        sourceFreshness: sampleCount > 0 ? "fresh" : "unavailable",
        sampleCount,
        zeroValuesAreProven,
        readOnlyProjection: input.readOnlyProjection,
        sources,
        fanCountSource: input.fanCountSource,
        contentCountIncludes: input.contentCountIncludes,
        contentCountScope: "creator_owned_or_assigned",
        issues,
    };
}

async function requireCreator(uid: string) {
    if (!adminDb) {
        throw new AuthError("Creator settings database unavailable", 503);
    }

    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (!userSnap.exists) {
        throw new AuthError("Creator profile not found", 404, "creator");
    }

    const data = userSnap.data() as Record<string, unknown>;
    if (!isCreatorOrAdminRole(data.role)) {
        throw new AuthError("Creator access required", 403);
    }

    return { snap: userSnap, data };
}

async function GET_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/settings",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const callerSnap = await adminDb.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        const projection = readAdminCreatorProjectionContext(request, caller.uid, typeof callerData?.role === "string" ? callerData.role : null);
        const creatorId = projection?.targetCreatorId || caller.uid;
        const { data } = await requireCreator(creatorId);
        const [
            ledgerSource,
            payoutSource,
            subscriptionSource,
            requestSource,
            bookingSource,
            fanSource,
            dropsSource,
            userProfileSource,
        ] = await Promise.all([
            readCreatorSettingsSource("ledgerAccruals", "creator_ledger_accruals", 0, async () => {
                const snap = await adminDb.collection("creator_ledger_accruals")
                    .where("creatorId", "==", creatorId)
                    .aggregate({ totalEarnings: AggregateField.sum("creatorShareGd") })
                    .get();
                return toFiniteNumber(snap.data().totalEarnings);
            }, "partial"),
            readCreatorSettingsSource("pendingPayouts", "creator_payout_requests", 0, async () => {
                const snap = await adminDb.collection("creator_payout_requests")
                    .where("creatorId", "==", creatorId)
                    .where("status", "==", "pending")
                    .aggregate({ totalPending: AggregateField.sum("requestedGd") })
                    .get();
                return toFiniteNumber(snap.data().totalPending);
            }, "partial"),
            readCreatorSettingsSource("subscriptions", "creator_subscriptions", 0, async () => {
                const snap = await adminDb.collection("creator_subscriptions")
                    .where("creatorId", "==", creatorId)
                    .where("status", "==", "active")
                    .count()
                    .get();
                return toFiniteNumber(snap.data().count);
            }),
            readCreatorSettingsSource("customRequests", "creator_custom_requests", 0, async () => {
                const snap = await adminDb.collection("creator_custom_requests")
                    .where("creatorId", "==", creatorId)
                    .where("status", "==", "pending")
                    .count()
                    .get();
                return toFiniteNumber(snap.data().count);
            }),
            readCreatorSettingsSource("callBookings", "creator_call_bookings", 0, async () => {
                const snap = await adminDb.collection("creator_call_bookings")
                    .where("creatorId", "==", creatorId)
                    .where("status", "==", "booked")
                    .count()
                    .get();
                return toFiniteNumber(snap.data().count);
            }),
            readCreatorFanCountSource(creatorId, data),
            readCreatorDashboardDropCounts(creatorId),
            readCreatorSettingsSource("userProfile", "users", 0, async () => toFiniteNumber(data.profileViewsCount)),
        ]);

        const earningsGd = ledgerSource.value;
        const pendingCashoutGd = payoutSource.value;
        const followerCount = fanSource.value;
        const profileViewsCount = userProfileSource.value;
        const liveDropsCount = dropsSource.liveDropsCount;
        const contentCount = dropsSource.contentCount;
        const activeSubscribers = subscriptionSource.value;
        const openRequests = requestSource.value;
        const bookedCalls = bookingSource.value;
        const rawCreatorSettings = data.creatorSettings;
        const rawCreatorRestrictions = data.creatorRestrictions;
        const settingsState = rawCreatorSettings && typeof rawCreatorSettings === "object" ? "configured" : "not_configured";
        const creatorSettings = settingsState === "configured" ? normalizeCreatorSettings(rawCreatorSettings) : DEFAULT_CREATOR_SETTINGS;
        const controlPlaneSettings = buildCreatorSettingsControlPlane(creatorSettings, {
            displayName: data.displayName,
            bio: data.bio,
            photoURL: data.photoURL,
        });
        const settingsCompletion = buildCreatorSettingsCompletion(controlPlaneSettings, settingsState);
        const creatorRestrictions = rawCreatorRestrictions && typeof rawCreatorRestrictions === "object"
            ? normalizeCreatorRestrictions(rawCreatorRestrictions)
            : DEFAULT_CREATOR_RESTRICTIONS;
        const monetizationSettings = resolveCreatorMonetizationSettings({
            creatorId,
            rawSettings: rawCreatorSettings ?? creatorSettings,
            rawRestrictions: rawCreatorRestrictions ?? creatorRestrictions,
            settingsConfigured: settingsState === "configured",
            updatedAt: typeof data.creatorSettingsUpdatedAt === "number" ? toFiniteNumber(data.creatorSettingsUpdatedAt) : null,
        });
        const sourceIssues = [
            settingsState === "not_configured" ? "creator_settings_not_configured" : null,
        ].filter((issue): issue is string => Boolean(issue));
        const sourceStates = {
            ledgerAccruals: { state: ledgerSource.state === "verified_sample" ? evidenceStateForSum(earningsGd, ledgerSource.sampleKnown) : ledgerSource.state, sampleKnown: ledgerSource.sampleKnown, issue: ledgerSource.issue },
            pendingPayouts: { state: payoutSource.state === "verified_sample" ? evidenceStateForSum(pendingCashoutGd, payoutSource.sampleKnown) : payoutSource.state, sampleKnown: payoutSource.sampleKnown, issue: payoutSource.issue },
            subscriptions: { state: subscriptionSource.state === "verified_sample" ? evidenceStateForCount(activeSubscribers, true) : subscriptionSource.state, sampleKnown: subscriptionSource.sampleKnown, issue: subscriptionSource.issue },
            customRequests: { state: requestSource.state === "verified_sample" ? evidenceStateForCount(openRequests, true) : requestSource.state, sampleKnown: requestSource.sampleKnown, issue: requestSource.issue },
            callBookings: { state: bookingSource.state === "verified_sample" ? evidenceStateForCount(bookedCalls, true) : bookingSource.state, sampleKnown: bookingSource.sampleKnown, issue: bookingSource.issue },
            fans: { state: fanSource.state === "verified_sample" ? evidenceStateForCount(followerCount, true) : fanSource.state, sampleKnown: fanSource.sampleKnown, issue: fanSource.issue },
            relationshipsOps: { state: fanSource.state === "verified_sample" ? evidenceStateForCount(followerCount, true) : fanSource.state, sampleKnown: fanSource.sampleKnown, issue: fanSource.issue },
            content: { state: dropsSource.state === "verified_sample" ? evidenceStateForCount(contentCount, true) : dropsSource.state, sampleKnown: dropsSource.sampleKnown, issue: dropsSource.issue },
            drops: { state: dropsSource.state === "verified_sample" ? evidenceStateForCount(contentCount, true) : dropsSource.state, sampleKnown: dropsSource.sampleKnown, issue: dropsSource.issue },
            userProfile: { state: userProfileSource.state === "verified_sample" ? evidenceStateForCount(profileViewsCount, true) : userProfileSource.state, sampleKnown: userProfileSource.sampleKnown, issue: userProfileSource.issue },
        } satisfies NonNullable<Parameters<typeof buildCreatorStatsEvidence>[0]["sourceStates"]>;
        const generatedAtUtc = new Date().toISOString();
        const statsEvidence = buildCreatorStatsEvidence({
            generatedAtUtc,
            earningsGd,
            pendingCashoutGd,
            activeSubscribers,
            openRequests,
            bookedCalls,
            followerCount,
            fanCountSource: fanSource.fanCountSource,
            liveDropsCount,
            contentCount,
            contentCountIncludes: dropsSource.contentCountIncludes,
            profileViewsCount,
            relationshipsOpsKnown: fanSource.sampleKnown,
            userProfileKnown: userProfileSource.sampleKnown,
            readOnlyProjection: Boolean(projection),
            sourceStates,
            issues: sourceIssues,
        });

        return NextResponse.json({
            success: true,
            settingsState,
            projection: projection ? {
                active: true,
                targetCreatorId: projection.targetCreatorId,
                actorAdminUid: projection.actorAdminUid,
                startedAt: projection.startedAt,
                projectionMode: projection.projectionMode,
                sourceTruth: projection.sourceTruth,
                readOnly: true,
            } : null,
            creatorSettings,
            settings: controlPlaneSettings,
            settingsCompletion,
            missingSetupItems: settingsCompletion.missingSetupItems,
            sourceTruth: settingsState === "configured" ? "creator_settings_doc" : "safe_defaults_missing_settings_doc",
            userFacingImpact: buildCreatorSettingsUserFacingImpact(controlPlaneSettings),
            monetizationSettings,
            userFacingMonetization: resolveUserFacingCreatorMonetization(monetizationSettings),
            creatorRestrictions,
            stats: {
                earningsGd,
                pendingCashoutGd,
                followerCount,
                profileViewsCount,
                liveDropsCount,
                contentCount,
                activeSubscribers,
                openRequests,
                bookedCalls,
            },
            statsEvidence,
        });
    } catch (error) {
        return handleApiError(error, "Creator.Settings.GET");
    }
}

async function PUT_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/settings",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const callerSnap = await adminDb.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        const projection = readAdminCreatorProjectionContext(request, caller.uid, typeof callerData?.role === "string" ? callerData.role : null);
        if (projection) {
            return buildAdminCreatorProjectionReadOnlyResponse();
        }

        const { data } = await requireCreator(caller.uid);
        const payload = await readBoundedJsonBody<{
            creatorSettings?: Record<string, unknown>;
            settings?: Record<string, unknown>;
            controlPlane?: Record<string, unknown>;
            creatorRestrictions?: Record<string, unknown>;
        }>(request, {
            maxBytes: CREATOR_SETTINGS_BODY_LIMIT_BYTES,
            routeName: "creator/settings",
            allowEmpty: false,
        });

        const update: Record<string, unknown> = {};
        let profilePatch: Record<string, unknown> = {};
        let changedSections: string[] = [];
        const controlPlanePayload = payload.settings ?? payload.controlPlane;
        if (controlPlanePayload) {
            const sanitized = sanitizeCreatorSettingsControlPlaneUpdate(controlPlanePayload, data.creatorSettings ?? DEFAULT_CREATOR_SETTINGS);
            if (!sanitized.ok) {
                await trackServerEvent("creator_monetization_save_failed", {
                    page_path: "/dashboard/creator",
                    error_code: "invalid_creator_settings",
                    source_truth: "creator_settings_control_plane",
                    changed_sections: "invalid_control_plane",
                }, caller.uid).catch(() => undefined);
                return NextResponse.json({
                    success: false,
                    code: "invalid_creator_settings",
                    errorCode: "invalid_creator_request",
                    error: "Check creator settings and try again.",
                    message: "Check creator settings and try again.",
                    retryable: false,
                    errors: sanitized.errors,
                    rejectedAdminOnlyFields: sanitized.rejectedAdminOnlyFields,
                }, { status: 400 });
            }
            update.creatorSettings = sanitized.creatorSettings;
            profilePatch = sanitized.profilePatch;
            changedSections = sanitized.changedSections;
        } else if (payload.creatorSettings) {
            const stripped = stripAdminOnlyCreatorSettingsFields(payload.creatorSettings);
            if (stripped.rejectedAdminOnlyFields.length > 0) {
                await trackServerEvent("creator_monetization_save_failed", {
                    page_path: "/dashboard/creator",
                    error_code: "admin_only_creator_settings_fields",
                    source_truth: "creator_settings_control_plane",
                    changed_sections: "legacy_creator_settings",
                }, caller.uid).catch(() => undefined);
                return NextResponse.json({
                    success: false,
                    code: "admin_only_creator_settings_fields",
                    errorCode: "invalid_creator_request",
                    error: "Creator settings cannot include admin-only fields.",
                    message: "Creator settings cannot include admin-only fields.",
                    retryable: false,
                    rejectedAdminOnlyFields: stripped.rejectedAdminOnlyFields,
                }, { status: 400 });
            }
            update.creatorSettings = sanitizeCreatorSettingsUpdate(stripped.input);
            changedSections = ["legacy_creator_settings"];
        }

        if (payload.creatorRestrictions) {
            const isAdmin = data.role === "admin";
            if (!isAdmin) {
                return NextResponse.json({
                    success: false,
                    code: "forbidden",
                    error: "Only admins can update creator restrictions from this route.",
                    message: "Only admins can update creator restrictions from this route.",
                    retryable: false,
                }, { status: 403 });
            }
            update.creatorRestrictions = sanitizeCreatorRestrictionsUpdate(payload.creatorRestrictions);
        }

        const mergedUpdate = {
            ...buildCreatorUpdateMerge(update),
            ...profilePatch,
        };
        if (Object.keys(mergedUpdate).length === 0) {
            return NextResponse.json({
                success: false,
                code: "invalid_creator_request",
                error: "No valid creator settings provided.",
                message: "No valid creator settings provided.",
                retryable: false,
            }, { status: 400 });
        }

        const actorMarker = assertKnownActor(buildActorMarker({
            actor: {
                uid: caller.uid,
                email: caller.email,
                role: typeof data.role === "string" ? data.role : "creator",
            },
            targetUserId: caller.uid,
            targetCreatorId: caller.uid,
            performedAs: payload.creatorRestrictions ? "admin_on_behalf" : "own_account",
            surface: "creator_experiences",
            route: "/api/creator/settings",
            actionKey: "creator_settings_updated",
            occurredAt: Date.now(),
            dedupeKey: `creator_settings_updated:${caller.uid}:${payload.creatorRestrictions ? "restrictions" : "settings"}`,
            source: "creator_settings_route",
        }));
        await adminDb.collection("users").doc(caller.uid).update(mergedUpdate);
        await trackServerEvent("creator_settings_updated", {
            page_path: "/dashboard/creator",
            creator_settings_updated: Boolean(payload.creatorSettings || controlPlanePayload),
            creator_restrictions_updated: Boolean(payload.creatorRestrictions),
            changed_sections: changedSections.join(","),
            source_truth: "creator_settings_control_plane",
            ...actorMarkerToTelemetryPayload(actorMarker),
        }, caller.uid).catch(() => undefined);
        await trackServerEvent("creator_monetization_save_succeeded", {
            page_path: "/dashboard/creator",
            creator_settings_updated: Boolean(payload.creatorSettings || controlPlanePayload),
            creator_restrictions_updated: Boolean(payload.creatorRestrictions),
            changed_sections: changedSections.join(","),
            source_truth: "creator_settings_doc",
            ...actorMarkerToTelemetryPayload(actorMarker),
        }, caller.uid).catch(() => undefined);
        const nextControlPlaneSettings = buildCreatorSettingsControlPlane(update.creatorSettings ?? data.creatorSettings ?? DEFAULT_CREATOR_SETTINGS, {
            displayName: profilePatch.displayName ?? data.displayName,
            bio: profilePatch.bio ?? data.bio,
            photoURL: profilePatch.photoURL ?? data.photoURL,
        });
        const nextCompletion = buildCreatorSettingsCompletion(nextControlPlaneSettings, "configured");
        const nextMonetizationSettings = resolveCreatorMonetizationSettings({
            creatorId: caller.uid,
            rawSettings: update.creatorSettings ?? data.creatorSettings ?? DEFAULT_CREATOR_SETTINGS,
            rawRestrictions: update.creatorRestrictions ?? data.creatorRestrictions ?? DEFAULT_CREATOR_RESTRICTIONS,
            settingsConfigured: true,
            updatedAt: Date.now(),
        });
        return NextResponse.json({
            success: true,
            settings: nextControlPlaneSettings,
            settingsCompletion: nextCompletion,
            missingSetupItems: nextCompletion.missingSetupItems,
            sourceTruth: "creator_settings_doc",
            userFacingImpact: buildCreatorSettingsUserFacingImpact(nextControlPlaneSettings),
            monetizationSettings: nextMonetizationSettings,
            userFacingMonetization: resolveUserFacingCreatorMonetization(nextMonetizationSettings),
        });
    } catch (error) {
        if (isBoundedJsonBodyError(error)) {
            return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.status });
        }
        return handleApiError(error, "Creator.Settings.PUT");
    }
}

export let GET = withRouteRuntimeHealth("creator/settings:GET", GET_handler);
export let PUT = withRouteRuntimeHealth("creator/settings:PUT", PUT_handler);
