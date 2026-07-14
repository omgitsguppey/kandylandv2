import { createAnalyticsStorageKey } from "@/lib/analytics-identifiers";

export const ANALYTICS_INGEST_CONTRACT_VERSION = "analytics_ingest_firestore_closure_v1";

export const ANALYTICS_INGEST_EVENT_TYPES = [
  "click",
  "hover",
  "scroll",
  "visibility",
  "page_view",
  "page_leave",
] as const;

export type AnalyticsIngestEventType = (typeof ANALYTICS_INGEST_EVENT_TYPES)[number];
export type AnalyticsIngestDestinationLane =
  | "guest_batch"
  | "guest_session"
  | "behavioral_timeline"
  | "user_tracking_materialization"
  | "diagnostics";
export type AnalyticsIngestPriority = "priority" | "supporting";
export type AnalyticsIngestPersistenceStatus = "persisted" | "sampled" | "dropped";
export type AnalyticsIngestFailureReason =
  | "payload_too_large"
  | "invalid_json"
  | "invalid_analytics_payload"
  | "empty_analytics_payload"
  | "analytics_consent_denied"
  | "unknown_event_type"
  | "temporary_firestore_failure"
  | "temporary_server_failure";
export type AnalyticsIngestFailureStatus = "rejected" | "dropped" | "temporary_failure";

export interface AnalyticsIngestEventContract {
  eventType: AnalyticsIngestEventType;
  clientEventName: AnalyticsIngestEventType;
  identityRequirements: string[];
  destinationLanes: AnalyticsIngestDestinationLane[];
  firestoreCollections: typeof ANALYTICS_INGEST_FIRESTORE_COLLECTIONS;
  downstreamProcessing: string[];
  retryability: "non_retryable_after_acceptance";
  priority: AnalyticsIngestPriority;
  persistenceStatus: AnalyticsIngestPersistenceStatus;
  dedupeRule: "session_batch";
  costPolicy: {
    maxEventsPerPayload: number;
    maxBodyBytes: number;
    diagnosticsCapPerHour: number;
  };
}

export interface AnalyticsIngestFailureClassification {
  reason: AnalyticsIngestFailureReason;
  status: AnalyticsIngestFailureStatus;
  httpStatus: 200 | 400 | 413 | 422 | 503;
  retryable: boolean;
  permanent: boolean;
  diagnosticsAllowed: boolean;
}

export const ANALYTICS_INGEST_FIRESTORE_COLLECTIONS = {
  guestBatches: "analytics_guest_batches",
  guestSessions: "analytics_sessions",
  behavioralTimelineFacts: "behavioral_timeline_facts",
  diagnostics: "server_diagnostics",
} as const;

export const ANALYTICS_INGEST_COST_POLICY = {
  maxEventsPerPayload: 200,
  maxBodyBytes: 64 * 1024,
  diagnosticsCapPerHour: 12,
} as const;

export const ANALYTICS_CLIENT_ID_PATTERN = /^(?:sess|subject)_[A-Za-z0-9_-]{4,150}$/u;

export function resolveCanonicalGuestAnonymousVisitorId(input: {
  clientAnonymousVisitorId?: string | null;
  sessionKey: string;
}) {
  const candidate = input.clientAnonymousVisitorId?.trim();
  if (candidate && ANALYTICS_CLIENT_ID_PATTERN.test(candidate)) {
    return candidate;
  }

  return input.sessionKey;
}

const PRIORITY_EVENT_TYPES = new Set<AnalyticsIngestEventType>(["page_view", "page_leave", "click"]);

function buildEventContract(eventType: AnalyticsIngestEventType): AnalyticsIngestEventContract {
  const priority = PRIORITY_EVENT_TYPES.has(eventType) ? "priority" : "supporting";
  return {
    eventType,
    clientEventName: eventType,
    identityRequirements: ["sessionKey", "anonymousVisitorId", "clientSessionId_optional", "consent_allows_anonymous_analytics"],
    destinationLanes: [
      "guest_batch",
      "guest_session",
      "behavioral_timeline",
      "user_tracking_materialization",
    ],
    firestoreCollections: ANALYTICS_INGEST_FIRESTORE_COLLECTIONS,
    downstreamProcessing: [
      "guest_batch_page_rollup",
      "behavioral_timeline_fact_write",
      "deferred_user_tracking_materialization",
      "admin_analytics_snapshot_consumption",
    ],
    retryability: "non_retryable_after_acceptance",
    priority,
    persistenceStatus: priority === "priority" ? "persisted" : "sampled",
    dedupeRule: "session_batch",
    costPolicy: ANALYTICS_INGEST_COST_POLICY,
  };
}

export const ANALYTICS_INGEST_CONTRACT = Object.fromEntries(
  ANALYTICS_INGEST_EVENT_TYPES.map((eventType) => [eventType, buildEventContract(eventType)]),
) as Record<AnalyticsIngestEventType, AnalyticsIngestEventContract>;

const FAILURE_CLASSIFICATIONS: Record<AnalyticsIngestFailureReason, AnalyticsIngestFailureClassification> = {
  payload_too_large: {
    reason: "payload_too_large",
    status: "rejected",
    httpStatus: 413,
    retryable: false,
    permanent: true,
    diagnosticsAllowed: false,
  },
  invalid_json: {
    reason: "invalid_json",
    status: "rejected",
    httpStatus: 400,
    retryable: false,
    permanent: true,
    diagnosticsAllowed: true,
  },
  invalid_analytics_payload: {
    reason: "invalid_analytics_payload",
    status: "rejected",
    httpStatus: 422,
    retryable: false,
    permanent: true,
    diagnosticsAllowed: true,
  },
  empty_analytics_payload: {
    reason: "empty_analytics_payload",
    status: "rejected",
    httpStatus: 422,
    retryable: false,
    permanent: true,
    diagnosticsAllowed: true,
  },
  analytics_consent_denied: {
    reason: "analytics_consent_denied",
    status: "dropped",
    httpStatus: 200,
    retryable: false,
    permanent: true,
    diagnosticsAllowed: false,
  },
  unknown_event_type: {
    reason: "unknown_event_type",
    status: "rejected",
    httpStatus: 422,
    retryable: false,
    permanent: true,
    diagnosticsAllowed: true,
  },
  temporary_firestore_failure: {
    reason: "temporary_firestore_failure",
    status: "temporary_failure",
    httpStatus: 503,
    retryable: true,
    permanent: false,
    diagnosticsAllowed: true,
  },
  temporary_server_failure: {
    reason: "temporary_server_failure",
    status: "temporary_failure",
    httpStatus: 503,
    retryable: true,
    permanent: false,
    diagnosticsAllowed: true,
  },
};

export function isAnalyticsIngestEventType(value: unknown): value is AnalyticsIngestEventType {
  return typeof value === "string" && ANALYTICS_INGEST_EVENT_TYPES.includes(value as AnalyticsIngestEventType);
}

export function getAnalyticsIngestContract(eventType: AnalyticsIngestEventType) {
  return ANALYTICS_INGEST_CONTRACT[eventType];
}

export function classifyAnalyticsIngestFailure(reason: AnalyticsIngestFailureReason) {
  return FAILURE_CLASSIFICATIONS[reason];
}

export function buildAnalyticsIngestDedupeKey(input: {
  sessionKey: string;
  batchId: string;
}) {
  return createAnalyticsStorageKey("guest_batch", input.sessionKey, input.batchId);
}

export function validateAnalyticsIngestContractClosure() {
  const findings: string[] = [];
  const seenTypes = new Set<string>();

  for (const eventType of ANALYTICS_INGEST_EVENT_TYPES) {
    const contract = ANALYTICS_INGEST_CONTRACT[eventType];
    if (!contract) {
      findings.push(`${eventType} missing contract`);
      continue;
    }

    if (seenTypes.has(contract.eventType)) {
      findings.push(`${eventType} duplicate contract event type`);
    }
    seenTypes.add(contract.eventType);

    if (!contract.identityRequirements.includes("sessionKey") || !contract.identityRequirements.includes("anonymousVisitorId")) {
      findings.push(`${eventType} missing required guest identity fields`);
    }

    for (const lane of ["guest_batch", "guest_session"] as const) {
      if (!contract.destinationLanes.includes(lane)) {
        findings.push(`${eventType} missing ${lane} destination lane`);
      }
    }

    if (contract.persistenceStatus !== "persisted" && contract.priority === "priority") {
      findings.push(`${eventType} priority event is not persisted`);
    }

    if (contract.dedupeRule !== "session_batch") {
      findings.push(`${eventType} missing session batch dedupe rule`);
    }

    if (contract.costPolicy.maxEventsPerPayload !== 200 || contract.costPolicy.maxBodyBytes !== 64 * 1024) {
      findings.push(`${eventType} cost bounds drifted from route payload limits`);
    }
  }

  for (const reason of [
    "payload_too_large",
    "invalid_json",
    "invalid_analytics_payload",
    "empty_analytics_payload",
    "analytics_consent_denied",
  ] as const) {
    const classification = classifyAnalyticsIngestFailure(reason);
    if (classification.retryable || !classification.permanent || classification.httpStatus === 503) {
      findings.push(`${reason} must be permanent and non-retryable`);
    }
  }

  for (const reason of ["temporary_firestore_failure", "temporary_server_failure"] as const) {
    const classification = classifyAnalyticsIngestFailure(reason);
    if (!classification.retryable || classification.permanent || classification.httpStatus !== 503) {
      findings.push(`${reason} must be retryable temporary failure`);
    }
  }

  return {
    ok: findings.length === 0,
    findings,
    collections: ANALYTICS_INGEST_FIRESTORE_COLLECTIONS,
  };
}
