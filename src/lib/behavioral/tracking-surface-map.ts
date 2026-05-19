export type TrackingSurfaceCoverageWeight = 10 | 12 | 13 | 15 | 18;
export type TrackingSurfacePriority = "critical" | "high" | "standard" | "low";

export type TrackingSurfaceDefinition = {
  id: string;
  surface: string;
  label: string;
  weight: TrackingSurfaceCoverageWeight;
  priority: TrackingSurfacePriority;
  critical: boolean;
  files: string[];
  events: string[];
  requiredFields: string[];
  requiredIdentityFields: string[];
  allowedWhenTrackingDisabled: boolean;
  persistenceLane: string;
  aggregationLane: string;
  uiConsumer: string;
  adminConsumer: string;
  enabledBehavior: string;
  disabledBehavior: string;
  serverTruthEvents?: string[];
};

export type TrackingSurfaceMapValidation = {
  ok: boolean;
  findings: string[];
};

const GUEST_INGEST_EVENT_TYPES = ["click", "hover", "scroll", "visibility", "page_view", "page_leave"] as const;

export const TRACKING_SURFACE_MAP: TrackingSurfaceDefinition[] = [
  {
    id: "page_behavior",
    surface: "main_site",
    label: "Page behavior",
    weight: 10,
    priority: "high",
    critical: true,
    files: ["src/components/Analytics/DeepTracker.tsx", "src/app/api/analytics/ingest/route.ts"],
    events: [
      "page_view",
      "page_leave",
      "click",
      "hover",
      "scroll",
      "visibility",
      "semantic_page_viewed",
      "semantic_target_clicked",
      "semantic_page_engaged",
      "semantic_page_passive",
      "semantic_page_bounced",
      "semantic_page_exited",
    ],
    requiredFields: ["page_path", "session_id", "semantic_scope_label"],
    requiredIdentityFields: ["anonymousVisitorId or actorUserId", "sessionId"],
    allowedWhenTrackingDisabled: false,
    persistenceLane: "analytics_guest_batches / analytics_event_facts",
    aggregationLane: "behavioral_timeline_facts and admin analytics snapshots",
    uiConsumer: "Route-level UX and recommendation context",
    adminConsumer: "Admin Analytics event mix and guest/user behavior evidence",
    enabledBehavior: "Queue bounded summarized page, click, hover, scroll, visibility, and exit signals.",
    disabledBehavior: "Suppress behavior queue, external analytics, and non-essential diagnostics.",
  },
  {
    id: "drop_behavior",
    surface: "drops",
    label: "Drop discovery, preview, and unlock companions",
    weight: 18,
    priority: "critical",
    critical: true,
    files: [
      "src/components/DropCard.tsx",
      "src/hooks/useDropCardImpression.ts",
      "src/components/FeaturedCarousel.tsx",
      "src/components/Drops/LockedDropPreviewView.tsx",
      "src/app/api/drops/unlock/route.ts",
    ],
    events: [
      "drop_card_impression",
      "featured_slide_viewed",
      "featured_slide_clicked",
      "drop_preview_opened",
      "drop_preview_cta_clicked",
      "drop_unlock_attempted",
      "drop_unlocked",
      "file_viewed",
    ],
    requiredFields: ["source_component", "drop_id", "file_id"],
    requiredIdentityFields: ["anonymousVisitorId or actorUserId", "sessionId", "dropId"],
    allowedWhenTrackingDisabled: false,
    persistenceLane: "analytics_event_facts with server entitlement truth for unlocks",
    aggregationLane: "drop/user behavior materializers",
    uiConsumer: "Drop cards, preview, and viewer companion state",
    adminConsumer: "Admin revenue/top drops and public beta behavior evidence",
    enabledBehavior: "Persist drop engagement companions while server unlock truth remains authoritative.",
    disabledBehavior: "Do not infer drop engagement from UI state when behavior analytics is disabled.",
    serverTruthEvents: ["drop_unlocked"],
  },
  {
    id: "creator_interactions",
    surface: "creator_profile",
    label: "Creator profile and fan interactions",
    weight: 12,
    priority: "high",
    critical: false,
    files: [
      "src/components/CreatorDiscoveryRail.tsx",
      "src/app/creators/[username]/CreatorProfileClient.tsx",
      "src/components/Creators/CreatorExperiencesPanel.tsx",
    ],
    events: [
      "creator_profile_link_clicked",
      "creator_followed",
      "creator_unfollowed",
      "creator_rail_impression",
      "creator_profile_viewed",
    ],
    requiredFields: ["source_component", "creator_id", "target_creator_id"],
    requiredIdentityFields: ["actorUserId or anonymousVisitorId", "targetCreatorId", "sessionId"],
    allowedWhenTrackingDisabled: false,
    persistenceLane: "analytics_event_facts",
    aggregationLane: "creator CRM and behavior timeline materializers",
    uiConsumer: "Creator profile and creator discovery surfaces",
    adminConsumer: "Creator lane parity and Fan Pass CRM evidence",
    enabledBehavior: "Persist fan/user actions with creator as target, not actor.",
    disabledBehavior: "Suppress creator interaction behavior events unless a server route owns a required product fact.",
  },
  {
    id: "creator_monetization",
    surface: "creator_profile",
    label: "Fan Pass and creator monetization",
    weight: 12,
    priority: "critical",
    critical: true,
    files: [
      "src/components/Creators/CreatorExperiencesPanel.tsx",
      "src/app/api/creator/subscriptions/route.ts",
      "src/lib/server/creator-experiences.ts",
    ],
    events: [
      "creator_fan_pass_started",
      "creator_subscription_started",
      "creator_subscription_renewed",
      "fan_pass_subscription_started",
    ],
    requiredFields: ["source_component", "creator_id", "transaction_id"],
    requiredIdentityFields: ["actorUserId", "targetCreatorId", "sourceTruth"],
    allowedWhenTrackingDisabled: true,
    persistenceLane: "analytics_event_facts plus canonical creator subscription records",
    aggregationLane: "creator CRM and revenue evidence",
    uiConsumer: "Creator profile monetization UI",
    adminConsumer: "Fan Pass CRM and creator monetization reports",
    enabledBehavior: "Persist monetization telemetry only as a companion to canonical server outcomes.",
    disabledBehavior: "Keep required product integrity telemetry separate from behavior analytics; do not send passive behavior spam.",
    serverTruthEvents: ["creator_fan_pass_started", "creator_subscription_started"],
  },
  {
    id: "creator_requests_bookings",
    surface: "creator_profile",
    label: "Creator requests and bookings",
    weight: 12,
    priority: "critical",
    critical: true,
    files: [
      "src/app/api/creator/requests/route.ts",
      "src/app/api/creator/bookings/route.ts",
      "src/lib/server/creator-experiences.ts",
    ],
    events: [
      "creator_custom_request_created",
      "creator_call_booking_created",
      "creator_call_booking_completed",
      "booking_created",
      "request_submitted",
    ],
    requiredFields: ["source_component", "creator_id", "request_id", "booking_id"],
    requiredIdentityFields: ["actorUserId", "targetCreatorId", "sourceTruth"],
    allowedWhenTrackingDisabled: true,
    persistenceLane: "analytics_event_facts plus canonical creator request/booking records",
    aggregationLane: "creator revenue and request/booking evidence",
    uiConsumer: "Creator request and booking flows",
    adminConsumer: "Creator dashboard parity and creator monetization evidence",
    enabledBehavior: "Persist request/booking outcomes through server-owned routes.",
    disabledBehavior: "Allow required account/product integrity facts only; no passive creator behavior signals.",
    serverTruthEvents: ["creator_custom_request_created", "creator_call_booking_created"],
  },
  {
    id: "chat_behavior",
    surface: "chat",
    label: "Chat and support behavior",
    weight: 12,
    priority: "high",
    critical: false,
    files: [
      "src/components/Chat/ChatExperience.tsx",
      "src/components/Support/SupportInbox.tsx",
      "src/app/api/support/threads/route.ts",
      "src/app/api/support/threads/[threadId]/route.ts",
    ],
    events: [
      "chat_thread_opened",
      "chat_message_sent",
      "chat_message_send_failed",
      "support_ticket_created",
      "support_reply_viewed",
      "support_reply_sent",
    ],
    requiredFields: ["source_component", "thread_id", "message_id"],
    requiredIdentityFields: ["actorUserId", "sessionId", "threadId"],
    allowedWhenTrackingDisabled: true,
    persistenceLane: "analytics_event_facts plus canonical support/chat records",
    aggregationLane: "support and chat admin evidence",
    uiConsumer: "Chat and support inbox surfaces",
    adminConsumer: "Admin Support and Admin Analytics event mix",
    enabledBehavior: "Persist chat/support actions when user action or server route writes occur.",
    disabledBehavior: "Keep required account/support facts only; suppress hover, visibility, and passive behavior telemetry.",
  },
  {
    id: "runtime_watch_time",
    surface: "viewer",
    label: "Runtime media watch time",
    weight: 18,
    priority: "critical",
    critical: true,
    files: [
      "src/components/Analytics/RuntimeWatchTracker.tsx",
      "src/hooks/useViewerWatchSession.ts",
      "src/app/api/viewer/watch-session/route.ts",
      "src/lib/analytics/runtime-watch-time-v2.ts",
    ],
    events: [
      "watch_start",
      "watch_heartbeat",
      "watch_pause",
      "watch_resume",
      "watch_complete",
      "watch_abandon",
      "runtime_watch_time_v2",
    ],
    requiredFields: ["watch_session_id", "media_id", "visible", "active", "playhead_ms"],
    requiredIdentityFields: ["actorUserId or anonymousVisitorId", "sessionId", "watchSessionId"],
    allowedWhenTrackingDisabled: false,
    persistenceLane: "analytics_watch_sessions / analytics_watch_observations",
    aggregationLane: "watch-session rollups and runtime watch-time evidence",
    uiConsumer: "Viewer media runtime",
    adminConsumer: "Runtime watch-time v2 and beta analytics/watch-time health",
    enabledBehavior: "Persist foreground, active, media-playback intervals only.",
    disabledBehavior: "Disabled behavior analytics cannot compute watch time from page view, visibility, or page duration; watch time is not page time.",
  },
  {
    id: "admin_projection_behavior",
    surface: "admin",
    label: "Admin projection and diagnostics",
    weight: 10,
    priority: "standard",
    critical: false,
    files: [
      "src/app/admin/users/page.tsx",
      "src/context/AdminViewAsContext.tsx",
      "src/app/api/admin/view-as-creator/route.ts",
    ],
    events: [
      "admin_users_viewed",
      "admin_user_detail_viewed",
      "admin_view_as_creator_started",
      "admin_view_as_creator_ended",
      "admin_view_as_creator_action_blocked",
    ],
    requiredFields: ["source_component", "target_user_id", "target_creator_id"],
    requiredIdentityFields: ["actorAdminId", "targetUserId or targetCreatorId"],
    allowedWhenTrackingDisabled: true,
    persistenceLane: "analytics_event_facts with admin projection exclusion",
    aggregationLane: "admin diagnostics only",
    uiConsumer: "Admin projection tools",
    adminConsumer: "Admin Debug and source truth reports",
    enabledBehavior: "Persist admin evidence while excluding it from user behavior metrics.",
    disabledBehavior: "Admin evidence remains admin-only and never becomes live user or creator behavior.",
  },
];

export const TRACKING_SURFACE_SCORE_TOTAL = TRACKING_SURFACE_MAP.reduce((sum, surface) => sum + surface.weight, 0);

export function findTrackingSurfaceByEvent(eventName: string) {
  return TRACKING_SURFACE_MAP.find((surface) => surface.events.includes(eventName));
}

export function validateBehavioralTrackingSurfaceMap(input: {
  acceptedAnonymousEventTypes?: string[];
} = {}): TrackingSurfaceMapValidation {
  const findings: string[] = [];
  const acceptedAnonymousEventTypes = input.acceptedAnonymousEventTypes ?? [...GUEST_INGEST_EVENT_TYPES];
  const seen = new Set<string>();

  for (const surface of TRACKING_SURFACE_MAP) {
    if (seen.has(surface.id)) {
      findings.push(`duplicate surface id: ${surface.id}`);
    }
    seen.add(surface.id);

    for (const key of [
      "surface",
      "label",
      "priority",
      "persistenceLane",
      "aggregationLane",
      "uiConsumer",
      "adminConsumer",
      "enabledBehavior",
      "disabledBehavior",
    ] as const) {
      if (!surface[key]) {
        findings.push(`${surface.id} missing ${key}`);
      }
    }

    if (surface.events.length === 0) {
      findings.push(`${surface.id} missing events`);
    }
    if (surface.requiredIdentityFields.length === 0) {
      findings.push(`${surface.id} missing required identity fields`);
    }
    if (surface.id === "runtime_watch_time") {
      if (surface.events.includes("page_view") || surface.events.includes("visibility")) {
        findings.push("runtime_watch_time must not use page_view or visibility as watch-time events");
      }
      if (!surface.disabledBehavior.includes("not page time")) {
        findings.push("runtime_watch_time must explicitly say watch time is not page time");
      }
    }
  }

  for (const eventType of acceptedAnonymousEventTypes) {
    if (!TRACKING_SURFACE_MAP.some((surface) => surface.events.includes(eventType))) {
      findings.push(`anonymous ingest event missing from tracking surface map: ${eventType}`);
    }
  }

  for (const stalePattern of ["hardcoded_behavior_score", "fake_behavior_score", "page_time_watch_time"]) {
    if (TRACKING_SURFACE_MAP.some((surface) => surface.enabledBehavior.includes(stalePattern) || surface.disabledBehavior.includes(stalePattern))) {
      findings.push(`stale behavior scoring pattern remains reachable: ${stalePattern}`);
    }
  }

  return {
    ok: findings.length === 0,
    findings,
  };
}
