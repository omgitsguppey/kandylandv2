import {
    actorMarkerToTelemetryPayload,
    buildActorMarker,
    type ActorMarkerUserLike,
} from "@/lib/identity/actor-markers";

export const CREATOR_DASHBOARD_ROUTE = "/dashboard/creator";
export const CREATOR_SETTINGS_ROUTE = "/dashboard/creator/settings";
export const USER_SETTINGS_ROUTE = "/dashboard/settings";
export const USER_PROFILE_ROUTE = "/dashboard/profile";

export type CreatorProfileRouteSource =
    | "admin_roster"
    | "chat_header"
    | "creator_discovery"
    | "creator_experiences"
    | "creator_notification"
    | "metadata";

export type CreatorProfileRouteInput = {
    uid?: string | null;
    id?: string | null;
    userId?: string | null;
    targetUserId?: string | null;
    creatorId?: string | null;
    username?: string | null;
    handle?: string | null;
    creatorUsername?: string | null;
    publicProfileEnabled?: boolean | null;
    profilePublic?: boolean | null;
    isSyntheticCreator?: boolean | null;
    status?: string | null;
};

function readRouteString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

export function normalizeCreatorProfileSlug(value: string | null | undefined) {
    const normalized = readRouteString(value).replace(/^@+/, "").toLowerCase();
    if (
        !normalized
        || normalized.includes("/")
        || normalized.includes("?")
        || normalized.includes("#")
        || !/^[a-z0-9._-]+$/u.test(normalized)
    ) {
        return "";
    }

    return normalized;
}

function resolveCreatorProfileSlug(creator: CreatorProfileRouteInput | null | undefined) {
    if (!creator) {
        return "";
    }

    return normalizeCreatorProfileSlug(creator.username)
        || normalizeCreatorProfileSlug(creator.handle)
        || normalizeCreatorProfileSlug(creator.creatorUsername);
}

function resolveCreatorRouteId(creator: CreatorProfileRouteInput | string | null | undefined) {
    if (typeof creator === "string") {
        return readRouteString(creator);
    }
    if (!creator) {
        return "";
    }

    return readRouteString(creator.uid)
        || readRouteString(creator.userId)
        || readRouteString(creator.targetUserId)
        || readRouteString(creator.id)
        || readRouteString(creator.creatorId);
}

export function explainCreatorProfileRouteMissing(creator: CreatorProfileRouteInput | null | undefined) {
    if (!creator) {
        return "creator_missing";
    }

    const status = readRouteString(creator.status).toLowerCase();
    if (status === "suspended" || status === "banned") {
        return "creator_account_unavailable";
    }

    if (creator.publicProfileEnabled === false || creator.profilePublic === false) {
        return creator.isSyntheticCreator ? "synthetic_public_profile_disabled" : "public_profile_disabled";
    }

    if (!resolveCreatorProfileSlug(creator)) {
        return creator.isSyntheticCreator ? "synthetic_creator_username_missing" : "creator_username_missing_or_invalid";
    }

    return "";
}

export function canLinkToCreatorPublicProfile(creator: CreatorProfileRouteInput | null | undefined) {
    return explainCreatorProfileRouteMissing(creator) === "";
}

export function buildCreatorPublicHref(creator: CreatorProfileRouteInput | null | undefined) {
    if (!canLinkToCreatorPublicProfile(creator)) {
        return null;
    }

    const slug = resolveCreatorProfileSlug(creator);
    return slug ? `/creators/${encodeURIComponent(slug)}` : null;
}

export function buildCreatorProfileHref(input: {
    creatorUsername?: string | null;
}) {
    return buildCreatorPublicHref({ creatorUsername: input.creatorUsername });
}

export function buildCreatorAdminHref(creator: CreatorProfileRouteInput | string | null | undefined) {
    const id = resolveCreatorRouteId(creator);
    return id ? `/admin/user/${encodeURIComponent(id)}` : null;
}

export function buildCreatorReviewHref(userId: string | null | undefined) {
    const id = readRouteString(userId);
    return id ? `/admin/roster?focus=${encodeURIComponent(id)}` : null;
}

export function buildCreatorProfileLinkTelemetryPayload(input: {
    actor?: ActorMarkerUserLike | null;
    creator: CreatorProfileRouteInput | null | undefined;
    href: string | null;
    routeSource: CreatorProfileRouteSource;
    currentRoute?: string | null;
    missingReason?: string | null;
}) {
    const actionKey = input.href ? "creator_profile_link_clicked" : "creator_profile_link_missing";
    const creatorId = resolveCreatorRouteId(input.creator);
    const actor = input.actor ?? { role: "guest" };
    const marker = buildActorMarker({
        actor,
        actorType: input.actor ? undefined : "guest",
        targetCreatorId: creatorId || undefined,
        performedAs: "own_account",
        surface: input.routeSource === "admin_roster" ? "admin_roster" : "creator_experiences",
        route: input.currentRoute || input.href || "/creators",
        actionKey,
        source: "creator_profile_routing",
    });

    return {
        ...actorMarkerToTelemetryPayload(marker),
        creatorId,
        creator_id: creatorId,
        routeSource: input.routeSource,
        route_source: input.routeSource,
        creatorProfileHref: input.href ?? "",
        creator_profile_href: input.href ?? "",
        missingReason: input.missingReason ?? "",
        missing_reason: input.missingReason ?? "",
    };
}
