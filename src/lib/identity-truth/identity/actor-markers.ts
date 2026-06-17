export const ACTOR_MARKER_TYPES = [
  "guest",
  "user",
  "creator",
  "admin",
  "owner_admin",
  "system",
  "unknown",
] as const;

export type ActorMarkerType = (typeof ACTOR_MARKER_TYPES)[number];

export const ACTOR_MARKER_PERFORMED_AS = [
  "own_account",
  "admin_on_behalf",
  "owner_override",
  "admin_view_as_creator",
  "system_job",
] as const;

export type ActorMarkerPerformedAs = (typeof ACTOR_MARKER_PERFORMED_AS)[number];

export const ACTOR_MARKER_SURFACES = [
  "admin_roster",
  "creator_intake",
  "creator_experiences",
  "creator_account_admin",
] as const;

export type ActorMarkerSurface = (typeof ACTOR_MARKER_SURFACES)[number];

export type ActorMarkerUserLike = {
  uid?: string | null;
  email?: string | null;
  role?: string | null;
  isAdmin?: boolean | null;
  isCreator?: boolean | null;
  isOwner?: boolean | null;
  ownerAdmin?: boolean | null;
  system?: boolean | null;
};

export type ActorClassification = {
  actorType: ActorMarkerType;
  actorUid?: string;
  actorEmail?: string;
  actorRole: string;
  reason: string;
};

export type ActorMarker = {
  actorType: ActorMarkerType;
  actorUid?: string;
  actorEmail?: string;
  actorRole: string;
  targetUserId?: string;
  targetCreatorId?: string;
  performedAs: ActorMarkerPerformedAs;
  surface: ActorMarkerSurface;
  route: string;
  actionKey: string;
  occurredAt: string;
  dedupeKey: string;
  source: string;
  actorClassificationReason: string;
  unknownActorBlocked: boolean;
};

export class UnknownActorMarkerError extends Error {
  constructor(marker: Pick<ActorMarker, "surface" | "actionKey">) {
    super(`Unknown actor blocked for ${marker.surface}:${marker.actionKey}`);
    this.name = "UnknownActorMarkerError";
  }
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: unknown) {
  const email = readString(value).toLowerCase();
  return email || undefined;
}

function normalizeRole(value: unknown) {
  return readString(value).toLowerCase().replace(/\s+/g, "_");
}

function hasOwnerRole(role: string) {
  return role === "owner" || role === "owner_admin" || role === "super_admin" || role === "primary_owner";
}

export function classifyActorFromUser(user: ActorMarkerUserLike | null | undefined): ActorClassification {
  if (!user) {
    return {
      actorType: "unknown",
      actorRole: "unknown",
      reason: "No authenticated actor object was provided.",
    };
  }

  const role = normalizeRole(user.role) || "user";
  const actorUid = readString(user.uid) || undefined;
  const actorEmail = normalizeEmail(user.email);

  if (user.system === true || role === "system") {
    return {
      actorType: "system",
      actorUid: actorUid ?? "system",
      actorEmail,
      actorRole: "system",
      reason: "System flag or system role is present.",
    };
  }

  if (user.isOwner === true || user.ownerAdmin === true || hasOwnerRole(role)) {
    return {
      actorType: "owner_admin",
      actorUid,
      actorEmail,
      actorRole: role,
      reason: "Owner admin flag or owner-level role is present.",
    };
  }

  if (user.isAdmin === true || role === "admin") {
    return {
      actorType: "admin",
      actorUid,
      actorEmail,
      actorRole: "admin",
      reason: "Admin flag or admin role is present.",
    };
  }

  if (user.isCreator === true || role === "creator") {
    return {
      actorType: "creator",
      actorUid,
      actorEmail,
      actorRole: "creator",
      reason: "Creator flag or creator role is present.",
    };
  }

  if (role === "guest") {
    return {
      actorType: "guest",
      actorUid,
      actorEmail,
      actorRole: "guest",
      reason: "Guest role is present.",
    };
  }

  if (actorUid) {
    return {
      actorType: "user",
      actorUid,
      actorEmail,
      actorRole: role || "user",
      reason: "Authenticated user uid is present and no elevated role was found.",
    };
  }

  return {
    actorType: "unknown",
    actorEmail,
    actorRole: role || "unknown",
    reason: "No trusted uid or trusted lane marker was present.",
  };
}

function normalizeOccurredAt(value: string | number | Date | undefined) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  const text = readString(value);
  return text || new Date().toISOString();
}

function buildDefaultDedupeKey(input: {
  surface: ActorMarkerSurface;
  actionKey: string;
  actorType: ActorMarkerType;
  actorUid?: string;
  targetUserId?: string;
  targetCreatorId?: string;
  occurredAt: string;
}) {
  return [
    "actor-marker",
    input.surface,
    input.actionKey,
    input.actorType,
    input.actorUid || "no-actor",
    input.targetUserId || input.targetCreatorId || "self",
    input.occurredAt.slice(0, 19),
  ]
    .join(":")
    .toLowerCase()
    .replace(/[^a-z0-9:_./-]+/g, "-");
}

export function buildActorMarker(input: {
  actor?: ActorMarkerUserLike | null;
  actorType?: ActorMarkerType;
  actorUid?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  targetUserId?: string | null;
  targetCreatorId?: string | null;
  performedAs: ActorMarkerPerformedAs;
  surface: ActorMarkerSurface;
  route: string;
  actionKey: string;
  occurredAt?: string | number | Date;
  dedupeKey?: string | null;
  source: string;
  actorClassificationReason?: string | null;
}) {
  const classified = input.actorType
    ? {
      actorType: input.actorType,
      actorUid: readString(input.actorUid) || undefined,
      actorEmail: normalizeEmail(input.actorEmail),
      actorRole: normalizeRole(input.actorRole) || input.actorType,
      reason: readString(input.actorClassificationReason) || "Explicit actor type was provided.",
    }
    : classifyActorFromUser(input.actor);
  const occurredAt = normalizeOccurredAt(input.occurredAt);
  const targetUserId = readString(input.targetUserId) || undefined;
  const targetCreatorId = readString(input.targetCreatorId) || undefined;
  const marker: ActorMarker = {
    actorType: classified.actorType,
    actorUid: classified.actorUid,
    actorEmail: classified.actorEmail,
    actorRole: classified.actorRole,
    targetUserId,
    targetCreatorId,
    performedAs: input.performedAs,
    surface: input.surface,
    route: input.route,
    actionKey: input.actionKey,
    occurredAt,
    dedupeKey: readString(input.dedupeKey) || buildDefaultDedupeKey({
      surface: input.surface,
      actionKey: input.actionKey,
      actorType: classified.actorType,
      actorUid: classified.actorUid,
      targetUserId,
      targetCreatorId,
      occurredAt,
    }),
    source: input.source,
    actorClassificationReason: readString(input.actorClassificationReason) || classified.reason,
    unknownActorBlocked: classified.actorType === "unknown",
  };

  if (
    (
      marker.performedAs === "admin_on_behalf"
      || marker.performedAs === "owner_override"
      || marker.performedAs === "admin_view_as_creator"
    )
    && !marker.targetUserId
  ) {
    throw new Error("Admin-on-behalf actor markers require targetUserId.");
  }

  return marker;
}

export function buildAdminOnBehalfMarker(
  admin: ActorMarkerUserLike | null | undefined,
  targetUser: ActorMarkerUserLike | string | null | undefined,
  options?: {
    surface?: ActorMarkerSurface;
    route?: string;
    actionKey?: string;
    occurredAt?: string | number | Date;
    source?: string;
    performedAs?: Extract<ActorMarkerPerformedAs, "admin_on_behalf" | "owner_override" | "admin_view_as_creator">;
    targetCreatorId?: string | null;
    dedupeKey?: string | null;
  },
) {
  const targetUserId = typeof targetUser === "string"
    ? targetUser
    : readString(targetUser?.uid);
  const classification = classifyActorFromUser(admin);
  const performedAs = options?.performedAs
    ?? (classification.actorType === "owner_admin" ? "owner_override" : "admin_on_behalf");

  return buildActorMarker({
    actor: admin,
    actorType: classification.actorType === "owner_admin" ? "owner_admin" : classification.actorType,
    actorUid: classification.actorUid,
    actorEmail: classification.actorEmail,
    actorRole: classification.actorRole,
    targetUserId,
    targetCreatorId: options?.targetCreatorId,
    performedAs,
    surface: options?.surface ?? "admin_roster",
    route: options?.route ?? "/admin/roster",
    actionKey: options?.actionKey ?? "admin_on_behalf",
    occurredAt: options?.occurredAt,
    dedupeKey: options?.dedupeKey,
    source: options?.source ?? "admin_server",
    actorClassificationReason: classification.reason,
  });
}

export function assertKnownActor(marker: ActorMarker) {
  if (marker.actorType === "unknown" || marker.unknownActorBlocked) {
    throw new UnknownActorMarkerError(marker);
  }

  return marker;
}

export function explainActorMarker(marker: ActorMarker) {
  const actor = marker.actorUid ? `${marker.actorType}:${marker.actorUid}` : marker.actorType;
  const target = marker.targetUserId || marker.targetCreatorId || "self";
  return `${actor} performed ${marker.actionKey} on ${target} as ${marker.performedAs} from ${marker.surface}. ${marker.actorClassificationReason}`;
}

export function buildActorMarkerDebugFields(marker: ActorMarker) {
  return {
    actorMarkerPresent: true,
    actorType: marker.actorType,
    performedAs: marker.performedAs,
    targetUserId: marker.targetUserId ?? null,
    targetCreatorId: marker.targetCreatorId ?? null,
    actorClassificationReason: marker.actorClassificationReason,
    unknownActorBlocked: marker.unknownActorBlocked,
  };
}

export function actorMarkerToTelemetryPayload(marker: ActorMarker) {
  const actorAdminId = marker.actorType === "admin" || marker.actorType === "owner_admin"
    ? marker.actorUid ?? ""
    : "";
  const actorCreatorId = marker.actorType === "creator" ? marker.actorUid ?? "" : "";
  const actorUserId = marker.actorType === "user" ? marker.actorUid ?? "" : "";

  return {
    actorType: marker.actorType,
    actorUid: marker.actorUid ?? "",
    actorAdminId,
    actorCreatorId,
    actorUserId,
    actorEmail: marker.actorEmail ?? "",
    actorRole: marker.actorRole,
    targetUserId: marker.targetUserId ?? "",
    targetCreatorId: marker.targetCreatorId ?? "",
    performedAs: marker.performedAs,
    surface: marker.surface,
    route: marker.route,
    actionKey: marker.actionKey,
    occurredAt: marker.occurredAt,
    dedupeKey: marker.dedupeKey,
    source: marker.source,
    actorClassificationReason: marker.actorClassificationReason,
    unknownActorBlocked: marker.unknownActorBlocked,
    actor_type: marker.actorType,
    actor_uid: marker.actorUid ?? "",
    actor_admin_id: actorAdminId,
    actor_creator_id: actorCreatorId,
    actor_user_id: actorUserId,
    actor_email: marker.actorEmail ?? "",
    actor_role: marker.actorRole,
    target_user_id: marker.targetUserId ?? "",
    target_creator_id: marker.targetCreatorId ?? "",
    performed_as: marker.performedAs,
    action_key: marker.actionKey,
    occurred_at: marker.occurredAt,
    dedupe_key: marker.dedupeKey,
    actor_classification_reason: marker.actorClassificationReason,
    unknown_actor_blocked: marker.unknownActorBlocked,
  };
}
