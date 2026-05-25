export const CREATOR_RELATIONSHIP_DEBUG_LANE = "Creator discovery/relationships";

export const CREATOR_RELATIONSHIP_EVENTS = [
  "creator_discovery_surface_viewed",
  "creator_card_viewed",
  "creator_card_clicked",
  "creator_profile_opened",
  "creator_follow_attempted",
  "creator_follow_succeeded",
  "creator_follow_failed",
  "creator_unfollow_attempted",
  "creator_unfollow_succeeded",
  "creator_recommendation_viewed",
  "creator_recommendation_clicked",
  "creator_relationship_list_loaded",
  "creator_relationship_list_failed",
] as const;

export type CreatorRelationshipEventName = typeof CREATOR_RELATIONSHIP_EVENTS[number];

export const CREATOR_RELATIONSHIP_STATES = [
  "not_following",
  "following",
  "blocked",
  "unavailable",
  "self",
  "creator_hidden",
  "unknown",
] as const;

export type CreatorRelationshipState = typeof CREATOR_RELATIONSHIP_STATES[number];

export type CreatorRecommendationSource =
  | "relationship_route"
  | "creator_discovery"
  | "creator_profile"
  | "deterministic_recommendation"
  | "seeded_surface"
  | "unknown";

export type CreatorRelationshipStateInput = {
  viewerUserId?: string | null;
  creatorId?: string | null;
  following?: boolean | null;
  blocked?: boolean | null;
  creatorHidden?: boolean | null;
  unavailable?: boolean | null;
  available?: boolean | null;
};

export type CreatorRelationshipTelemetryInput = {
  eventName: CreatorRelationshipEventName;
  viewerUserId?: string | null;
  creatorId?: string | null;
  surface: string;
  sourceComponent: string;
  relationshipState?: CreatorRelationshipState;
  recommendationSource?: CreatorRecommendationSource | string | null;
  failureReason?: string | null;
  route?: string | null;
  position?: number | null;
  impressionSessionId?: string | null;
  listCount?: number | null;
  recommendationCount?: number | null;
  followerCount?: number | null;
  action?: "follow" | "unfollow" | "load" | "view" | "click" | null;
};

export type CreatorRelationshipTelemetryPayload = {
  event_name: CreatorRelationshipEventName;
  user_id?: string;
  actor_user_id?: string;
  creator_id?: string;
  target_creator_id?: string;
  surface: string;
  source_component: string;
  relationship_state: CreatorRelationshipState;
  recommendation_source?: string;
  failure_reason?: string;
  route?: string;
  position?: number;
  impression_session_id?: string;
  list_count?: number;
  recommendation_count?: number;
  follower_count?: number;
  action?: string;
  debug_lane: typeof CREATOR_RELATIONSHIP_DEBUG_LANE;
  privacy_class: "product_behavior";
};

export type CreatorRelationshipDebugEvent = {
  eventName: CreatorRelationshipEventName;
  relationshipState?: CreatorRelationshipState;
  state?: CreatorRelationshipState;
  failureReason?: string | null;
  recommendationCount?: number | null;
  profileRouteMissing?: boolean | null;
  recommendationSource?: string | null;
};

export type CreatorRelationshipDebugLane = {
  label: typeof CREATOR_RELATIONSHIP_DEBUG_LANE;
  lane: typeof CREATOR_RELATIONSHIP_DEBUG_LANE;
  followFailures: number;
  relationshipListFailures: number;
  emptyRecommendationState: number;
  profileRouteMissing: number;
  recommendationSourceHealth: "ok" | "review";
};

export type CreatorRelationshipFunnelReport = {
  generatedAtUtc?: string;
  events: readonly CreatorRelationshipEventName[];
  states: readonly CreatorRelationshipState[];
  debugLane: string | CreatorRelationshipDebugLane;
  scoreBefore?: Record<string, number>;
  scoreAfter?: Record<string, number>;
  scoreDimensions?: {
    before?: Record<string, number>;
    after?: Record<string, number>;
  };
  remainingGaps?: readonly string[];
};

function cleanString(value: string | null | undefined) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : undefined;
}

function cleanNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function classifyCreatorRelationshipState(input: CreatorRelationshipStateInput): CreatorRelationshipState {
  const viewerUserId = cleanString(input.viewerUserId);
  const creatorId = cleanString(input.creatorId);

  if (viewerUserId && creatorId && viewerUserId === creatorId) {
    return "self";
  }
  if (input.blocked === true) {
    return "blocked";
  }
  if (input.creatorHidden === true) {
    return "creator_hidden";
  }
  if (input.unavailable === true || input.available === false) {
    return "unavailable";
  }
  if (input.following === true) {
    return "following";
  }
  if (input.following === false || (viewerUserId && creatorId)) {
    return "not_following";
  }

  return "unknown";
}

export function buildCreatorRelationshipTelemetryPayload(
  input: CreatorRelationshipTelemetryInput,
): CreatorRelationshipTelemetryPayload {
  const relationshipState = input.relationshipState ?? classifyCreatorRelationshipState({
    viewerUserId: input.viewerUserId,
    creatorId: input.creatorId,
  });
  const viewerUserId = cleanString(input.viewerUserId);
  const creatorId = cleanString(input.creatorId);
  const payload: CreatorRelationshipTelemetryPayload = {
    event_name: input.eventName,
    surface: cleanString(input.surface) ?? "creator_discovery",
    source_component: cleanString(input.sourceComponent) ?? "creator_relationships",
    relationship_state: relationshipState,
    debug_lane: CREATOR_RELATIONSHIP_DEBUG_LANE,
    privacy_class: "product_behavior",
  };

  if (viewerUserId) {
    payload.user_id = viewerUserId;
    payload.actor_user_id = viewerUserId;
  }
  if (creatorId) {
    payload.creator_id = creatorId;
    payload.target_creator_id = creatorId;
  }

  const recommendationSource = cleanString(input.recommendationSource ?? undefined);
  if (recommendationSource) {
    payload.recommendation_source = recommendationSource;
  }
  const failureReason = cleanString(input.failureReason ?? undefined);
  if (failureReason) {
    payload.failure_reason = failureReason;
  }
  const route = cleanString(input.route ?? undefined);
  if (route) {
    payload.route = route;
  }
  const position = cleanNumber(input.position);
  if (position !== undefined) {
    payload.position = position;
  }
  const impressionSessionId = cleanString(input.impressionSessionId ?? undefined);
  if (impressionSessionId) {
    payload.impression_session_id = impressionSessionId;
  }
  const listCount = cleanNumber(input.listCount);
  if (listCount !== undefined) {
    payload.list_count = listCount;
  }
  const recommendationCount = cleanNumber(input.recommendationCount);
  if (recommendationCount !== undefined) {
    payload.recommendation_count = recommendationCount;
  }
  const followerCount = cleanNumber(input.followerCount);
  if (followerCount !== undefined) {
    payload.follower_count = followerCount;
  }
  const action = cleanString(input.action ?? undefined);
  if (action) {
    payload.action = action;
  }

  return payload;
}

export function buildCreatorRelationshipDebugLane(
  events: readonly CreatorRelationshipDebugEvent[],
): CreatorRelationshipDebugLane {
  const followFailures = events.filter((event) => event.eventName === "creator_follow_failed").length;
  const relationshipListFailures = events.filter((event) => event.eventName === "creator_relationship_list_failed").length;
  const emptyRecommendationState = events.filter((event) => (
    event.eventName === "creator_relationship_list_loaded"
    && event.recommendationCount === 0
  ) || (
    event.eventName === "creator_recommendation_viewed"
    && event.recommendationSource === "empty"
  )).length;
  const profileRouteMissing = events.filter((event) => (
    event.profileRouteMissing === true
    || event.failureReason === "profile_route_missing"
  )).length;
  const sourceMissing = events.some((event) => !cleanString(event.recommendationSource ?? undefined) || event.recommendationSource === "empty");

  return {
    label: CREATOR_RELATIONSHIP_DEBUG_LANE,
    lane: CREATOR_RELATIONSHIP_DEBUG_LANE,
    followFailures,
    relationshipListFailures,
    emptyRecommendationState,
    profileRouteMissing,
    recommendationSourceHealth: sourceMissing || relationshipListFailures > 0 ? "review" : "ok",
  };
}

export function validateCreatorRelationshipFunnelReport(report: CreatorRelationshipFunnelReport): string[] {
  const failures: string[] = [];
  const eventSet = new Set(report.events);
  const stateSet = new Set(report.states);

  for (const eventName of CREATOR_RELATIONSHIP_EVENTS) {
    if (!eventSet.has(eventName)) {
      failures.push(`missing creator relationship event: ${eventName}`);
    }
  }
  for (const state of CREATOR_RELATIONSHIP_STATES) {
    if (!stateSet.has(state)) {
      failures.push(`missing creator relationship state: ${state}`);
    }
  }
  const debugLane = typeof report.debugLane === "string" ? report.debugLane : report.debugLane.lane;
  if (debugLane !== CREATOR_RELATIONSHIP_DEBUG_LANE) {
    failures.push("creator relationship debug lane missing");
  }
  const scoreBefore = report.scoreBefore ?? report.scoreDimensions?.before;
  const scoreAfter = report.scoreAfter ?? report.scoreDimensions?.after;
  if (!scoreBefore || !scoreAfter) {
    failures.push("score dimension before/after missing");
  }
  if ((report.remainingGaps ?? []).some((gap) => gap.trim().length > 0)) {
    failures.push("creator relationship report has remaining gaps");
  }

  return failures;
}
