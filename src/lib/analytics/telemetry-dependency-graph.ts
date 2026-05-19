import type { TelemetryEventOption } from "@/lib/telemetry-catalog";

export type TelemetryLaneId =
  | "page_view"
  | "session"
  | "guest_event"
  | "auth_transition"
  | "identity_link"
  | "purchase"
  | "gumdrop_balance"
  | "creator_experience"
  | "creator_subscription"
  | "creator_drop_submission"
  | "runtime_watch"
  | "behavior_signal"
  | "admin_evidence"
  | "external_ga4_evidence";

export type TelemetryCostPriority = "priority" | "standard" | "non_priority" | "evidence_only";
export type TelemetryDestinationState = "persisted" | "queued" | "external_evidence_only";

export interface TelemetryDependencyLane {
  id: TelemetryLaneId;
  label: string;
  producer: string;
  clientEvent: string;
  routeApi: string;
  persistenceDestination: string;
  materializerExportDestination: string;
  adminEvidenceConsumer: string;
  requiredIdentityFields: string[];
  enabledBehavior: string;
  disabledBehavior: string;
  costPriority: TelemetryCostPriority;
  failureBehavior: string;
  destinationState: TelemetryDestinationState;
  productTruth: boolean;
  evidenceOnly: boolean;
  sourceReadyButNotTracked?: string;
  exactEventNames?: string[];
  eventNamePrefixes?: string[];
  eventNameIncludes?: string[];
  categories?: string[];
  modules?: string[];
  sources?: string[];
}

export interface TelemetryDependencyGraphValidation {
  ok: boolean;
  findings: string[];
  unmappedEvents: string[];
}

export const TELEMETRY_DEPENDENCY_GRAPH: TelemetryDependencyLane[] = [
  {
    id: "page_view",
    label: "Page view and route engagement",
    producer: "PageViewEvent, DeepTracker, route-level client components",
    clientEvent: "page_viewed, *_page_viewed, semantic_page_viewed",
    routeApi: "/api/analytics/ingest for anonymous batches; /api/analytics/ingest-identified for authenticated events",
    persistenceDestination: "analytics_guest_batches, analytics_sessions, analytics_event_facts",
    materializerExportDestination: "behavioral_timeline_facts from guest ingest; analytics rollups and BigQuery export from analytics_event_facts",
    adminEvidenceConsumer: "Admin Analytics hot-cache/snapshots, Admin Debug telemetry evidence, public beta analytics evidence",
    requiredIdentityFields: ["sessionId", "anonymousVisitorId or actorUserId", "route"],
    enabledBehavior: "Persist anonymous page context as guest batches and authenticated page events as event facts.",
    disabledBehavior: "Respect analytics consent; anonymous denied consent returns ignored without writes.",
    costPriority: "priority",
    failureBehavior: "Do not show fake zero traffic; mark page-view evidence unavailable or stale when persistence is missing.",
    destinationState: "persisted",
    productTruth: true,
    evidenceOnly: false,
    exactEventNames: ["page_viewed"],
    eventNameIncludes: ["page_viewed", "_viewed"],
    modules: ["navigation"],
  },
  {
    id: "session",
    label: "Session lifecycle",
    producer: "DeepTracker, AuthContext, client session helpers",
    clientEvent: "auth_session_restored, auth_logout, auth_session_established, viewer_backgrounded",
    routeApi: "/api/analytics/ingest and /api/analytics/ingest-identified",
    persistenceDestination: "analytics_sessions, analytics_guest_batches, analytics_event_facts",
    materializerExportDestination: "session rollups, behavioral timeline facts, admin analytics snapshots",
    adminEvidenceConsumer: "Admin Analytics audience/live pulse and Admin Debug session evidence",
    requiredIdentityFields: ["sessionId", "anonymousVisitorId or actorUserId", "occurredAt"],
    enabledBehavior: "Persist session events and anonymous session snapshots with bounded guest batches.",
    disabledBehavior: "Do not create guest session records when anonymous analytics consent is denied.",
    costPriority: "priority",
    failureBehavior: "Treat missing session persistence as unavailable session evidence, not zero users.",
    destinationState: "persisted",
    productTruth: true,
    evidenceOnly: false,
    exactEventNames: ["auth_session_restored", "auth_logout", "auth_session_established", "viewer_backgrounded"],
    eventNameIncludes: ["session"],
    modules: ["auth"],
  },
  {
    id: "guest_event",
    label: "Anonymous guest event batches",
    producer: "DeepTracker semantic event queue",
    clientEvent: "semantic_page_viewed, semantic_target_clicked, semantic_page_engaged, semantic_page_bounced, semantic_page_exited",
    routeApi: "/api/analytics/ingest",
    persistenceDestination: "analytics_guest_batches and analytics_sessions",
    materializerExportDestination: "behavioral_timeline_facts writes plus later guest-to-user transfer materializers",
    adminEvidenceConsumer: "Guest analytics cutover report, Admin Analytics guest bounce quality, Admin Debug guest evidence",
    requiredIdentityFields: ["anonymousVisitorId", "sessionId", "consent.analytics"],
    enabledBehavior: "Queue anonymous telemetry with sendBeacon/fetch and persist accepted batches.",
    disabledBehavior: "Return ignored for denied consent without writing priority guest telemetry.",
    costPriority: "priority",
    failureBehavior: "Mark guest evidence unavailable when batches are absent; do not infer tracked state from client calls alone.",
    destinationState: "persisted",
    productTruth: true,
    evidenceOnly: false,
    exactEventNames: [
      "semantic_page_viewed",
      "semantic_target_clicked",
      "semantic_page_engaged",
      "semantic_page_passive",
      "semantic_page_bounced",
      "semantic_page_exited",
    ],
    sources: ["guest"],
  },
  {
    id: "auth_transition",
    label: "Authentication and onboarding transitions",
    producer: "Auth UI, onboarding flows, server auth handlers",
    clientEvent: "auth_*, user_registered, password_reset_*, guided_onboarding_*",
    routeApi: "/api/analytics/ingest-identified for authenticated events; server trackServerEvent for canonical backend outcomes",
    persistenceDestination: "analytics_event_facts; analytics_guest_batches before login when anonymous",
    materializerExportDestination: "behavioral_timeline_facts, analytics rollups, admin auth outcome snapshots",
    adminEvidenceConsumer: "Admin Analytics auth outcomes, onboarding performance, analytics truth layer",
    requiredIdentityFields: ["actorUserId or anonymousVisitorId", "sessionId when client-sourced", "source"],
    enabledBehavior: "Persist auth and onboarding transitions with actor classification and source truth.",
    disabledBehavior: "Keep unauthenticated pre-login events in guest batches when consent allows; otherwise skip writes.",
    costPriority: "priority",
    failureBehavior: "Do not coerce unknown actors to users; missing auth evidence remains unavailable.",
    destinationState: "persisted",
    productTruth: true,
    evidenceOnly: false,
    categories: ["auth"],
    modules: ["onboarding"],
    eventNamePrefixes: ["auth_", "password_reset_", "guided_onboarding_", "onboarding_"],
    exactEventNames: ["user_registered", "avatar_uploaded"],
  },
  {
    id: "identity_link",
    label: "Guest-to-user identity transfer",
    producer: "analytics identity-link route and identified ingest identity_linked events",
    clientEvent: "identity_linked",
    routeApi: "/api/analytics/identity-link and /api/analytics/ingest-identified",
    persistenceDestination: "analytics_identity_links and analytics_event_facts",
    materializerExportDestination: "guest-to-user transfer materializers, behavioral timeline facts",
    adminEvidenceConsumer: "Analytics identity transfer inventory, guest-user analytics cutover, Admin Debug identity evidence",
    requiredIdentityFields: ["anonymousVisitorId", "sessionId", "actorUserId"],
    enabledBehavior: "Persist explicit identity links without erasing guest lineage.",
    disabledBehavior: "Reject missing authenticated user context and do not link anonymous records silently.",
    costPriority: "priority",
    failureBehavior: "Treat link failure as transfer unavailable; preserve original guest records.",
    destinationState: "persisted",
    productTruth: true,
    evidenceOnly: false,
    exactEventNames: ["identity_linked"],
  },
  {
    id: "purchase",
    label: "Purchase and checkout telemetry",
    producer: "Checkout UI and server purchase verification",
    clientEvent: "begin_checkout, gumdrops_purchase_*, server_purchase_verified",
    routeApi: "Client analytics ingest plus server trackServerEvent from purchase verification routes",
    persistenceDestination: "analytics_event_facts and canonical transaction records",
    materializerExportDestination: "commerce snapshots, analytics rollups, BigQuery export from event facts",
    adminEvidenceConsumer: "Admin revenue/top drops truth, Admin Analytics commerce snapshot, beta revenue evidence",
    requiredIdentityFields: ["actorUserId", "objectId or transactionId", "sourceTruth"],
    enabledBehavior: "Persist telemetry only after canonical checkout/purchase outcomes; server facts outrank client intent.",
    disabledBehavior: "Client checkout intent may be queued, but purchase success is not product truth without server verification.",
    costPriority: "priority",
    failureBehavior: "Missing purchase telemetry is unavailable evidence; never infer revenue from GA4-only events.",
    destinationState: "persisted",
    productTruth: true,
    evidenceOnly: false,
    categories: ["commerce"],
    exactEventNames: ["begin_checkout", "purchase", "gumdrops_purchase_completed", "gumdrops_purchase_failed", "server_purchase_verified"],
    eventNameIncludes: ["purchase", "checkout", "paypal", "wallet"],
  },
  {
    id: "gumdrop_balance",
    label: "GumDrop balance and reward lifecycle",
    producer: "Daily task pipeline, wallet/economy server handlers, ledger-backed reward flows",
    clientEvent: "daily_task_*, daily_checkin_claimed, spend_virtual_currency",
    routeApi: "Canonical server task/economy handlers plus /api/analytics/ingest-identified for UI companions",
    persistenceDestination: "analytics_event_facts plus canonical GumDrop ledger/transaction truth",
    materializerExportDestination: "task pipeline rollups, commerce/economy admin evidence, BigQuery export from event facts",
    adminEvidenceConsumer: "Admin daily task pipeline, economy evidence, public beta score economy lane",
    requiredIdentityFields: ["actorUserId", "sourceTruth", "objectId when applicable"],
    enabledBehavior: "Persist reward/economy telemetry as companions to canonical ledger transitions.",
    disabledBehavior: "Do not emit economy success telemetry when ledger write fails or is unavailable.",
    costPriority: "priority",
    failureBehavior: "Ledger truth wins; telemetry gaps cannot change balances.",
    destinationState: "persisted",
    productTruth: true,
    evidenceOnly: false,
    categories: ["tasks"],
    eventNamePrefixes: ["daily_task_"],
    eventNameIncludes: ["gumdrop", "gumdrops", "reward", "virtual_currency", "checkin"],
    exactEventNames: ["daily_checkin_claimed", "spend_virtual_currency"],
  },
  {
    id: "creator_experience",
    label: "Creator experience and fan actions",
    producer: "Creator profile, Fan Pass, broadcast, chat, booking, and creator dashboard surfaces",
    clientEvent: "creator_*, fan_pass_*, booking_*, broadcast_*",
    routeApi: "/api/analytics/ingest-identified and creator/admin server routes using trackServerEvent",
    persistenceDestination: "analytics_event_facts with actor/target creator separation",
    materializerExportDestination: "creator CRM/admin evidence, behavioral timeline facts, BigQuery export from event facts",
    adminEvidenceConsumer: "Creator dashboard role boundary reports, Fan Pass CRM/broadcast evidence, Admin Analytics creator lanes",
    requiredIdentityFields: ["actorUserId or actorCreatorId", "targetCreatorId when fan action targets creator", "sourceTruth"],
    enabledBehavior: "Persist creator/fan events with actor and target creator fields separated.",
    disabledBehavior: "Do not promote fan actions into creator behavior without creator actor context.",
    costPriority: "standard",
    failureBehavior: "Missing creator evidence is unavailable and must not be replaced by raw UID labels.",
    destinationState: "persisted",
    productTruth: true,
    evidenceOnly: false,
    modules: ["creator"],
    eventNamePrefixes: ["creator_", "fan_pass_", "booking_", "broadcast_", "chat_"],
    eventNameIncludes: ["creator", "fan_pass", "booking", "broadcast"],
  },
  {
    id: "creator_subscription",
    label: "Creator subscription and Fan Pass lifecycle",
    producer: "Creator subscription/Fan Pass server routes and UI companions",
    clientEvent: "creator_subscription_*, fan_pass_subscription_*",
    routeApi: "Creator subscription server routes using trackServerEvent plus identified ingest companions",
    persistenceDestination: "analytics_event_facts and canonical creator subscription records",
    materializerExportDestination: "creator CRM/subscriber materializers, admin creator evidence, BigQuery export",
    adminEvidenceConsumer: "Fan Pass CRM/broadcast evidence, creator parity reports, creator dashboard stats evidence",
    requiredIdentityFields: ["actorUserId", "targetCreatorId", "sourceTruth"],
    enabledBehavior: "Persist subscription state changes only when canonical subscription state changes or user action is queued.",
    disabledBehavior: "Do not count UI-only subscription intent as active subscription truth.",
    costPriority: "priority",
    failureBehavior: "Subscription records outrank telemetry; missing events stay evidence gaps.",
    destinationState: "persisted",
    productTruth: true,
    evidenceOnly: false,
    eventNameIncludes: ["subscription", "subscriber", "fan_pass"],
  },
  {
    id: "creator_drop_submission",
    label: "Creator drop submission and admin review",
    producer: "Creator drop API and Admin drops review route",
    clientEvent: "creator_drop_submitted, creator_drop_updated, admin_creator_drop_reviewed",
    routeApi: "/api/creator/drops and /api/admin/drops using trackServerEvent",
    persistenceDestination: "analytics_event_facts plus pending creator drop submission records",
    materializerExportDestination: "creator drop management approval evidence, admin CMS workflow evidence, BigQuery export",
    adminEvidenceConsumer: "Creator drop management approval report, Admin Drops CMS audit, public beta creator supply evidence",
    requiredIdentityFields: ["actorUserId or actorAdminId", "actorCreatorId or targetCreatorId", "sourceTruth"],
    enabledBehavior: "Persist creator submission and admin review telemetry alongside approval-state mutations.",
    disabledBehavior: "Do not mark a creator drop tracked or approved when the pending/review record write fails.",
    costPriority: "standard",
    failureBehavior: "Pending submissions stay out of public discovery and rotation when telemetry is missing.",
    destinationState: "persisted",
    productTruth: true,
    evidenceOnly: false,
    exactEventNames: ["creator_drop_submitted", "creator_drop_updated", "admin_creator_drop_reviewed"],
  },
  {
    id: "runtime_watch",
    label: "Runtime watch-time proof",
    producer: "useViewerWatchSession and viewer watch-session route; RuntimeWatchTracker is source-ready but not the persisted default path",
    clientEvent: "watch observations, viewer engagement intervals, runtime_watch_time_v2 companion events",
    routeApi: "/api/viewer/watch-session for persisted runtime proof; /api/analytics/ingest-identified for companion event facts",
    persistenceDestination: "analytics_watch_sessions, analytics_watch_observations, analytics_event_facts companions",
    materializerExportDestination: "watch-session rollups, runtime watch-time evidence, analytics admin snapshots",
    adminEvidenceConsumer: "Runtime watch-time v2 evidence, Admin Analytics watch-time health, public beta runtime proof",
    requiredIdentityFields: ["actorUserId", "dropId or assetId", "visible/foreground timing source"],
    enabledBehavior: "Persist watch intervals through the watch-session route; source-only trackers are not enough.",
    disabledBehavior: "When route wiring is absent, mark watch-time as source-ready or evidence missing instead of tracked.",
    costPriority: "priority",
    failureBehavior: "Do not use page duration as watch-time truth; mark deployed runtime proof missing when sessions are absent.",
    destinationState: "persisted",
    productTruth: true,
    evidenceOnly: false,
    sourceReadyButNotTracked: "RuntimeWatchTracker defaults to no ingest endpoint and is not production-mounted as the product-truth persistence path.",
    modules: ["viewer", "runtime"],
    eventNameIncludes: ["watch", "viewer", "video", "file_viewed"],
    exactEventNames: ["runtime_watch_time_v2", "file_viewed", "video_played"],
  },
  {
    id: "behavior_signal",
    label: "Behavior and recommendation signals",
    producer: "Client interactions, recommendation surfaces, support flows, behavioral normalizers",
    clientEvent: "drop_clicked, search/filter/sort, support, satisfaction, recommendation, semantic target events",
    routeApi: "/api/analytics/ingest, /api/analytics/ingest-identified, server trackServerEvent for canonical outcomes",
    persistenceDestination: "analytics_guest_batches, analytics_event_facts, behavioral_timeline_facts",
    materializerExportDestination: "behavioral intelligence materializers, recommendation ranker inputs, admin event mix",
    adminEvidenceConsumer: "Admin Analytics event mix, recommendation evidence, public beta behavior evidence",
    requiredIdentityFields: ["anonymousVisitorId or actorUserId", "eventName", "objectId when applicable"],
    enabledBehavior: "Persist user actions as guest batches or identified facts, then materialize normalized behavior.",
    disabledBehavior: "Skip or queue only within consent/auth rules; debug-only UI calls are not product truth.",
    costPriority: "standard",
    failureBehavior: "Missing behavior signals reduce confidence; do not synthesize engagement from UI state.",
    destinationState: "persisted",
    productTruth: true,
    evidenceOnly: false,
    categories: ["engagement", "content", "navigation", "notifications"],
    modules: ["engagement", "content", "notifications", "task_guidance"],
    eventNameIncludes: ["clicked", "selected", "submitted", "opened", "closed", "search", "filter", "sort", "support", "notification"],
  },
  {
    id: "admin_evidence",
    label: "Admin/debug/security evidence",
    producer: "Admin routes, security/moderation handlers, debug evidence pipeline, server system jobs",
    clientEvent: "admin_*, security_*, owner_override_*, system_*",
    routeApi: "Admin/server routes using trackServerEvent and admin evidence validators",
    persistenceDestination: "analytics_event_facts, debug evidence artifacts, admin metric snapshots",
    materializerExportDestination: "admin/debug snapshots, source-truth reports, BigQuery export from event facts when applicable",
    adminEvidenceConsumer: "Admin Debug Control Tower, source truth authority map, public beta evidence reports",
    requiredIdentityFields: ["actorAdminId or actorType=system", "sourceTruth", "route or job id"],
    enabledBehavior: "Persist admin/system evidence with admin actor separation and explicit source-state labels.",
    disabledBehavior: "Do not mix admin projection or system evidence into user behavior analytics.",
    costPriority: "standard",
    failureBehavior: "Unavailable admin evidence must be labeled unavailable/degraded, never healthy by fallback.",
    destinationState: "persisted",
    productTruth: true,
    evidenceOnly: false,
    categories: ["admin", "security", "system"],
    modules: ["admin", "security"],
    eventNamePrefixes: ["admin_", "owner_", "security_", "system_"],
    eventNameIncludes: ["moderation", "debug", "projection"],
  },
  {
    id: "external_ga4_evidence",
    label: "External GA4/PostHog/BigQuery evidence",
    producer: "Ga4EvidenceTracker, PostHog provider, analytics export jobs",
    clientEvent: "GA4 page_view only when configured and consented; PostHog evidence-only pageview",
    routeApi: "No default Admin Data API route; explicit evidence refresh only when configured",
    persistenceDestination: "GA4 vendor store or exported evidence snapshot only; excluded from first-party event fact truth",
    materializerExportDestination: "GA4 recovery truth report, admin analytics external evidence panel, BigQuery export snapshots",
    adminEvidenceConsumer: "Admin Analytics external evidence, GA4 recovery truth, beta analytics supporting evidence",
    requiredIdentityFields: ["measurementId/propertyId when configured", "consent.analytics", "external source label"],
    enabledBehavior: "Load or refresh only when configured, consented, explicit, and TTL guarded.",
    disabledBehavior: "Show unavailable/config missing; do not display missing GA4 as zero traffic.",
    costPriority: "evidence_only",
    failureBehavior: "External evidence failures do not override first-party analytics product truth.",
    destinationState: "external_evidence_only",
    productTruth: false,
    evidenceOnly: true,
    sources: ["ga4"],
    eventNameIncludes: ["ga4", "posthog"],
  },
];

const RESOLUTION_ORDER: TelemetryLaneId[] = [
  "identity_link",
  "creator_drop_submission",
  "creator_subscription",
  "runtime_watch",
  "purchase",
  "gumdrop_balance",
  "admin_evidence",
  "creator_experience",
  "auth_transition",
  "page_view",
  "session",
  "guest_event",
  "behavior_signal",
  "external_ga4_evidence",
];

export function getTelemetryDependencyGraph(): TelemetryDependencyLane[] {
  return TELEMETRY_DEPENDENCY_GRAPH;
}

export function getTelemetryDependencyLane(id: TelemetryLaneId): TelemetryDependencyLane | undefined {
  return TELEMETRY_DEPENDENCY_GRAPH.find((lane) => lane.id === id);
}

function eventMatchesLane(event: TelemetryEventOption | { eventName: string }, lane: TelemetryDependencyLane): boolean {
  const eventName = event.eventName.toLowerCase();
  const category = "category" in event ? event.category : undefined;
  const sources = "sources" in event ? event.sources ?? [] : [];
  const modules = "modules" in event ? event.modules ?? [] : [];

  if (lane.exactEventNames?.some((name) => name.toLowerCase() === eventName)) {
    return true;
  }
  if (lane.eventNamePrefixes?.some((prefix) => eventName.startsWith(prefix.toLowerCase()))) {
    return true;
  }
  if (lane.eventNameIncludes?.some((fragment) => eventName.includes(fragment.toLowerCase()))) {
    return true;
  }
  if (category && lane.categories?.includes(category)) {
    return true;
  }
  if (lane.sources?.some((source) => sources.includes(source as never))) {
    return true;
  }
  if (lane.modules?.some((moduleName) => modules.includes(moduleName as never))) {
    return true;
  }

  return false;
}

export function resolveTelemetryLaneForEvent(event: TelemetryEventOption | { eventName: string }): TelemetryDependencyLane | undefined {
  for (const laneId of RESOLUTION_ORDER) {
    const lane = getTelemetryDependencyLane(laneId);
    if (lane && eventMatchesLane(event, lane)) {
      return lane;
    }
  }
  return undefined;
}

export function findUnmappedTelemetryEvents(events: TelemetryEventOption[]): string[] {
  return events
    .filter((event) => !resolveTelemetryLaneForEvent(event))
    .map((event) => event.eventName)
    .sort();
}

export function validateTelemetryDependencyGraphClosure(events: TelemetryEventOption[]): TelemetryDependencyGraphValidation {
  const findings: string[] = [];
  const ids = new Set<TelemetryLaneId>();

  for (const lane of TELEMETRY_DEPENDENCY_GRAPH) {
    if (ids.has(lane.id)) {
      findings.push(`duplicate lane id: ${lane.id}`);
    }
    ids.add(lane.id);

    for (const field of [
      "producer",
      "routeApi",
      "persistenceDestination",
      "materializerExportDestination",
      "adminEvidenceConsumer",
      "enabledBehavior",
      "disabledBehavior",
      "failureBehavior",
    ] as const) {
      if (!lane[field]) {
        findings.push(`${lane.id} missing ${field}`);
      }
    }

    if (lane.requiredIdentityFields.length === 0) {
      findings.push(`${lane.id} missing identity requirements`);
    }

    if (lane.costPriority !== "evidence_only" && lane.destinationState !== "persisted" && lane.destinationState !== "queued") {
      findings.push(`${lane.id} priority lane has no persisted or queued destination`);
    }

    if (lane.id === "external_ga4_evidence" && (lane.productTruth || !lane.evidenceOnly)) {
      findings.push("external_ga4_evidence must remain external evidence only");
    }

    if (lane.id === "runtime_watch" && !lane.sourceReadyButNotTracked?.includes("RuntimeWatchTracker")) {
      findings.push("runtime_watch must document RuntimeWatchTracker source-ready state");
    }
  }

  const unmappedEvents = findUnmappedTelemetryEvents(events);
  if (unmappedEvents.length > 0) {
    findings.push(`unmapped telemetry events: ${unmappedEvents.join(", ")}`);
  }

  return {
    ok: findings.length === 0,
    findings,
    unmappedEvents,
  };
}
