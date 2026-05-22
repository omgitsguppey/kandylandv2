import type {
  ActorKind,
  IdentityConfidence,
  IdentityState,
} from "@/lib/analytics/identity-handoff-contract";
import type { ConsentMode } from "@/lib/privacy/consent-tracking-contract";

export const EVENT_ENVELOPE_CONTRACT_VERSION = "2026.05.event-envelope.1";

export const EVENT_ENVELOPE_REQUIRED_FIELDS = [
  "eventId",
  "eventName",
  "eventVersion",
  "timestamp",
  "featureId",
  "surface",
  "actorKind",
  "identityState",
  "identityConfidence",
  "consentMode",
  "sessionId",
  "source",
  "materializerLane",
  "debugVisibility",
  "scoreImpact",
  "privacyClass",
  "metadata",
] as const;

export type EventEnvelopeRequiredField = (typeof EVENT_ENVELOPE_REQUIRED_FIELDS)[number];

export type EventEnvelopeSource =
  | "client"
  | "guest_client"
  | "identified_api_ingest"
  | "server"
  | "admin_debug"
  | "legacy"
  | "system";

export type EventPrivacyClass =
  | "required_integrity"
  | "minimal_product"
  | "behavioral"
  | "admin_debug"
  | "system"
  | "unknown";

export type EventEnvelopePipelineStatus = "normal" | "quarantined";

export type EventEnvelopeQuarantineReason =
  | "unregistered_event"
  | "invalid_envelope"
  | "legacy_event"
  | "forbidden_metadata";

export type EventEnvelopeMetadataValue = string | number | boolean | null;
export type EventEnvelopeMetadata = Record<string, EventEnvelopeMetadataValue>;

export interface EventUserRef {
  kind: "user";
  id: string;
}

export interface CanonicalEventEnvelope {
  eventId: string;
  eventName: string;
  eventVersion: number;
  timestamp: string;
  featureId: string;
  surface: string;
  actorKind: ActorKind;
  identityState: IdentityState;
  identityConfidence: IdentityConfidence;
  consentMode: ConsentMode;
  sessionId: string;
  guestId?: string | null;
  userRef?: EventUserRef | null;
  linkId?: string | null;
  source: EventEnvelopeSource;
  materializerLane: string;
  debugVisibility: string;
  scoreImpact: string;
  privacyClass: EventPrivacyClass;
  metadata: EventEnvelopeMetadata;
  pipelineStatus: EventEnvelopePipelineStatus;
  quarantineReason?: EventEnvelopeQuarantineReason;
  unavailableGuestReason?: string | null;
  includeInUserBehavior: boolean;
}

export interface EventEnvelopeInput {
  eventId?: string | null;
  eventName: string;
  eventVersion?: number | null;
  timestamp?: string | number | Date | null;
  featureId?: string | null;
  surface?: string | null;
  actorKind?: ActorKind | string | null;
  identityState?: IdentityState | string | null;
  identityConfidence?: IdentityConfidence | string | null;
  consentMode?: ConsentMode | string | null;
  sessionId?: string | null;
  guestId?: string | null;
  userId?: string | null;
  linkId?: string | null;
  source?: EventEnvelopeSource | string | null;
  materializerLane?: string | null;
  debugVisibility?: string | null;
  scoreImpact?: string | null;
  privacyClass?: EventPrivacyClass | null;
  metadata?: Record<string, unknown> | null;
  legacyUnknown?: boolean | null;
  projectionMode?: string | null;
  performedAs?: string | null;
  roles?: readonly string[] | null;
  claims?: Record<string, unknown> | null;
  systemGenerated?: boolean | null;
}

export interface EventEnvelopeValidationResult {
  ok: boolean;
  findings: string[];
}
