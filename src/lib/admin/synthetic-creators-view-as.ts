export const SYNTHETIC_CREATOR_TYPES = [
  "internal_character",
  "test_creator",
  "ai_creator",
  "demo_creator",
] as const;

export type SyntheticCreatorType = (typeof SYNTHETIC_CREATOR_TYPES)[number];

export const SYNTHETIC_CREATOR_TYPE_LABELS: Record<SyntheticCreatorType, string> = {
  internal_character: "Internal character",
  test_creator: "Test creator",
  ai_creator: "AI creator",
  demo_creator: "Demo creator",
};

export type SyntheticCreatorMarker = {
  isSyntheticCreator: boolean;
  syntheticCreatorType: SyntheticCreatorType;
  syntheticCreatedByUid: string;
  syntheticCreatedAt: number;
  syntheticReason: string;
  humanOperatorRequired: boolean;
  publicDisclosureMode?: string;
};

export type AdminViewAsRole = "creator";

export type AdminViewAsState = {
  adminViewingAsUserId: string;
  adminViewingAsDisplayName: string;
  adminViewingAsRole: AdminViewAsRole;
  simulationStartedAt: number;
  simulationReason: string;
  viewAsActorUid: string;
  viewAsReturnHref: string;
};

export const ADMIN_VIEW_AS_STORAGE_KEY = "kandydrops.admin.view_as_creator.v1";
export const ADMIN_VIEW_AS_PERFORMED_AS = "admin_view_as_creator";
export const ADMIN_VIEW_AS_PROJECTION_MODE = "read_only_creator_projection";
export const ADMIN_VIEW_AS_SOURCE_TRUTH = "local_projection";
export const ADMIN_PROJECTION_WRITE_BLOCKED_EVENT = "admin_projection_write_blocked";

const BLOCKED_VIEW_AS_ROUTE_RULES = [
  { routePrefix: "/api/paypal", reason: "Payment actions are blocked while viewing as a creator." },
  { routePrefix: "/api/purchase", reason: "Purchase actions are blocked while viewing as a creator." },
  { routePrefix: "/api/wallet", reason: "Wallet actions are blocked while viewing as a creator." },
  { routePrefix: "/api/unlock", reason: "Unlock actions are blocked while viewing as a creator." },
  { routePrefix: "/api/drops/unlock", reason: "Unlock actions are blocked while viewing as a creator." },
  { routePrefix: "/api/creator/settings", reason: "Creator settings changes are blocked in view-as mode." },
  { routePrefix: "/api/creator/broadcasts", reason: "Creator broadcasts are blocked in view-as mode." },
  { routePrefix: "/api/creator/payouts", reason: "Creator payouts are blocked in view-as mode." },
  { routePrefix: "/api/creator/messages", reason: "Creator messaging writes are blocked in view-as mode." },
  { routePrefix: "/api/creator/relationships", reason: "Fan relationship writes are blocked in view-as mode." },
  { routePrefix: "/api/creator/subscriptions", reason: "Fan Pass purchases are blocked in view-as mode." },
  { routePrefix: "/api/creator/requests", reason: "Custom request purchases are blocked in view-as mode." },
  { routePrefix: "/api/creator/bookings", reason: "Live time bookings are blocked in view-as mode." },
] as const;

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeSyntheticCreatorType(value: unknown): SyntheticCreatorType {
  return SYNTHETIC_CREATOR_TYPES.includes(value as SyntheticCreatorType)
    ? value as SyntheticCreatorType
    : "test_creator";
}

export function sanitizeSyntheticReason(value: unknown) {
  return readString(value).slice(0, 500);
}

export function buildSyntheticCreatorMarker(input: {
  syntheticCreatorType: unknown;
  syntheticCreatedByUid: string;
  syntheticCreatedAt: number;
  syntheticReason: unknown;
  humanOperatorRequired?: unknown;
  publicDisclosureMode?: unknown;
}): SyntheticCreatorMarker {
  const syntheticReason = sanitizeSyntheticReason(input.syntheticReason);
  if (syntheticReason.length < 8) {
    throw new Error("Synthetic creator reason is required.");
  }

  return {
    isSyntheticCreator: true,
    syntheticCreatorType: normalizeSyntheticCreatorType(input.syntheticCreatorType),
    syntheticCreatedByUid: input.syntheticCreatedByUid,
    syntheticCreatedAt: Math.trunc(input.syntheticCreatedAt),
    syntheticReason,
    humanOperatorRequired: input.humanOperatorRequired !== false,
    publicDisclosureMode: readString(input.publicDisclosureMode) || undefined,
  };
}

export function parseAdminViewAsState(value: unknown): AdminViewAsState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const source = value as Record<string, unknown>;
  const adminViewingAsUserId = readString(source.adminViewingAsUserId);
  const adminViewingAsDisplayName = readString(source.adminViewingAsDisplayName);
  const viewAsActorUid = readString(source.viewAsActorUid);
  const simulationReason = readString(source.simulationReason);
  const simulationStartedAt = typeof source.simulationStartedAt === "number" && Number.isFinite(source.simulationStartedAt)
    ? Math.trunc(source.simulationStartedAt)
    : 0;

  if (!adminViewingAsUserId || !viewAsActorUid || !simulationStartedAt) {
    return null;
  }

  return {
    adminViewingAsUserId,
    adminViewingAsDisplayName: adminViewingAsDisplayName || "Creator",
    adminViewingAsRole: "creator",
    simulationStartedAt,
    simulationReason,
    viewAsActorUid,
    viewAsReturnHref: readString(source.viewAsReturnHref) || "/admin/roster",
  };
}

export function readAdminViewAsStateFromStorage(): AdminViewAsState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(ADMIN_VIEW_AS_STORAGE_KEY);
    return raw ? parseAdminViewAsState(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeAdminViewAsStateToStorage(state: AdminViewAsState) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(ADMIN_VIEW_AS_STORAGE_KEY, JSON.stringify(state));
}

export function clearAdminViewAsStateFromStorage() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(ADMIN_VIEW_AS_STORAGE_KEY);
}

export function isAdminViewAsBlockedRequest(url: string, method = "GET") {
  const normalizedMethod = method.toUpperCase();
  if (normalizedMethod === "GET" || normalizedMethod === "HEAD" || normalizedMethod === "OPTIONS") {
    return null;
  }

  const pathname = url.startsWith("http")
    ? new URL(url).pathname
    : url.split("?")[0] ?? url;
  const rule = BLOCKED_VIEW_AS_ROUTE_RULES.find((entry) => pathname.startsWith(entry.routePrefix));

  return rule ? {
    routePrefix: rule.routePrefix,
    reason: rule.reason,
  } : null;
}

export function buildAdminViewAsHeaders(state: AdminViewAsState) {
  return {
    "x-admin-view-as-user-id": state.adminViewingAsUserId,
    "x-admin-view-as-role": state.adminViewingAsRole,
    "x-admin-view-as-actor-uid": state.viewAsActorUid,
    "x-admin-view-as-started-at": String(state.simulationStartedAt),
  };
}

export function buildAdminViewAsTelemetryPayload(input: {
  actorAdminId: string;
  targetUserId: string;
  targetCreatorId?: string | null;
  route: string;
  actionKey: string;
  reason?: string | null;
  syntheticCreatorType?: string | null;
  simulationStartedAt?: number | null;
  sourceComponent?: string | null;
}) {
  const actorAdminId = readString(input.actorAdminId);
  const targetUserId = readString(input.targetUserId);
  const targetCreatorId = readString(input.targetCreatorId) || targetUserId;
  const route = readString(input.route) || "/admin/roster";
  const reason = readString(input.reason);
  const syntheticCreatorType = readString(input.syntheticCreatorType);
  const sourceComponent = readString(input.sourceComponent) || "admin_view_as_creator";

  return {
    actorType: "admin",
    actorAdminId,
    adminId: actorAdminId,
    actorUid: actorAdminId,
    actorCreatorId: "",
    targetUserId,
    targetCreatorId,
    performedAs: ADMIN_VIEW_AS_PERFORMED_AS,
    projectionMode: ADMIN_VIEW_AS_PROJECTION_MODE,
    projectionScope: "local_only",
    includeInUserBehavior: false,
    metricEligible: false,
    metricExclusionReason: "admin_projection",
    sourceTruth: ADMIN_VIEW_AS_SOURCE_TRUTH,
    route,
    pagePath: route,
    actionKey: input.actionKey,
    reason,
    syntheticCreatorType,
    simulationStartedAt: input.simulationStartedAt ? Math.trunc(input.simulationStartedAt) : 0,
    sourceComponent,
  };
}

export function buildAdminViewAsDebugFields(state: AdminViewAsState | null) {
  return {
    activeViewAsUserId: state?.adminViewingAsUserId ?? "",
    activeViewAsRole: state?.adminViewingAsRole ?? "",
    viewAsStartedAt: state?.simulationStartedAt ?? 0,
    viewAsActorUid: state?.viewAsActorUid ?? "",
    viewAsReturnHref: state?.viewAsReturnHref ?? "",
    destructiveActionsBlockedInViewAs: Boolean(state),
  };
}
