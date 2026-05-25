import {
  buildTelemetryEventExtensionMetadata,
  getTelemetryEventExtensionMetadata,
  normalizeTelemetryEventName,
} from "@/lib/telemetry-catalog";
import { getSurfaceTelemetryCatalogEventOverride } from "@/lib/telemetry/surface-telemetry-catalog-events";
import { normalizeConsentMode } from "@/lib/privacy/consent-tracking-policy";
import {
  buildEventIdentityEnvelope,
  classifyLegacyIdentity,
} from "@/lib/analytics/identity-handoff-engine";
import type { ActorKind, IdentityConfidence, IdentityState } from "@/lib/analytics/identity-handoff-contract";
import {
  EVENT_ENVELOPE_REQUIRED_FIELDS,
  type CanonicalEventEnvelope,
  type EventEnvelopeInput,
  type EventEnvelopeMetadata,
  type EventEnvelopeMetadataValue,
  type EventEnvelopePipelineStatus,
  type EventEnvelopeQuarantineReason,
  type EventEnvelopeSource,
  type EventEnvelopeValidationResult,
  type EventPrivacyClass,
} from "./event-envelope-contract";

const FORBIDDEN_METADATA_KEY_PATTERN = /(?:email|phone|tel|token|secret|password|raw_prompt|rawprompt|prompt_body|promptbody|prompt_text|prompttext|message_body|messagebody|message_text|messagetext|content_url|contenturl|asset_url|asseturl|media_url|mediaurl|download_url|downloadurl|paypal_order_id|paypalorderid|paypal_capture_id|paypalcaptureid|provider_payload|providerpayload)/iu;
const EMAIL_VALUE_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu;
const PHONE_VALUE_PATTERN = /(?<!\w)(?:\+?\d[\d\s().-]{7,}\d)(?!\w)/u;
const SOURCE_VALUES = new Set<EventEnvelopeSource>([
  "client",
  "guest_client",
  "identified_api_ingest",
  "server",
  "admin_debug",
  "legacy",
  "system",
]);

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function normalizeTimestamp(value: EventEnvelopeInput["timestamp"]) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString();
  const candidate = cleanString(value);
  if (candidate) {
    const parsed = Date.parse(candidate);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : candidate;
  }
  return new Date(0).toISOString();
}

function normalizeSource(value: unknown): EventEnvelopeSource {
  const candidate = cleanString(value);
  return SOURCE_VALUES.has(candidate as EventEnvelopeSource) ? candidate as EventEnvelopeSource : "client";
}

function normalizeMetadataKey(rawKey: string) {
  return rawKey.trim().replace(/\s+/gu, "_").slice(0, 80);
}

function normalizeMetadataValue(value: unknown): EventEnvelopeMetadataValue | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || EMAIL_VALUE_PATTERN.test(trimmed) || PHONE_VALUE_PATTERN.test(trimmed)) {
      return undefined;
    }
    if (/^https?:\/\//iu.test(trimmed)) {
      try {
        const url = new URL(trimmed);
        return `${url.origin}${url.pathname}`.slice(0, 250);
      } catch {
        return trimmed.split(/[?#]/u)[0].slice(0, 250);
      }
    }
    return trimmed.slice(0, 250);
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "boolean") return value;
  return undefined;
}

export function stripForbiddenMetadata(input?: Record<string, unknown> | null): EventEnvelopeMetadata {
  if (!input) return {};
  const metadata: EventEnvelopeMetadata = {};

  for (const [rawKey, value] of Object.entries(input)) {
    const key = normalizeMetadataKey(rawKey);
    if (!key || FORBIDDEN_METADATA_KEY_PATTERN.test(key) || FORBIDDEN_METADATA_KEY_PATTERN.test(key.toLowerCase())) continue;
    const normalizedValue = normalizeMetadataValue(value);
    if (typeof normalizedValue === "undefined") continue;
    metadata[key] = normalizedValue;
  }

  return metadata;
}

export function classifyEventPrivacy(eventName: string): EventPrivacyClass {
  const metadata = getTelemetryEventExtensionMetadata(eventName);
  const canonicalEventName = metadata?.eventName ?? normalizeTelemetryEventName(eventName);
  const familyMetadata = metadata ?? buildTelemetryEventExtensionMetadata(canonicalEventName);

  if (
    familyMetadata?.consentRequirement === "required_integrity"
    || canonicalEventName.includes("purchase")
    || canonicalEventName.includes("checkout")
    || canonicalEventName.includes("paypal")
    || canonicalEventName.includes("wallet")
    || canonicalEventName.includes("gumdrop")
    || canonicalEventName.includes("unlock")
    || canonicalEventName.startsWith("security_")
    || canonicalEventName.startsWith("auth_")
  ) {
    return "required_integrity";
  }
  if (familyMetadata?.debugVisibility === "debug_visible" && familyMetadata.feature === "admin_debug") {
    return "admin_debug";
  }
  if (canonicalEventName.startsWith("admin_") || familyMetadata?.feature === "admin_debug") {
    return "admin_debug";
  }
  if (canonicalEventName.startsWith("system_")) {
    return "system";
  }
  if (familyMetadata?.consentRequirement === "minimal_analytics") {
    return "minimal_product";
  }
  if (familyMetadata?.consentRequirement === "full_behavioral") {
    return "behavioral";
  }
  return familyMetadata ? "minimal_product" : "unknown";
}

function buildUnregisteredDefaults(input: EventEnvelopeInput) {
  return {
    eventName: normalizeTelemetryEventName(input.eventName),
    featureId: input.featureId ?? "unregistered",
    surface: input.surface ?? "unknown",
    materializerLane: input.materializerLane ?? "quarantine",
    debugVisibility: input.debugVisibility ?? "debug_only",
    scoreImpact: input.scoreImpact ?? "none",
  };
}

export function buildEventEnvelope(input: EventEnvelopeInput): CanonicalEventEnvelope {
  const metadata = getTelemetryEventExtensionMetadata(input.eventName);
  const surfaceOverride = getSurfaceTelemetryCatalogEventOverride(normalizeTelemetryEventName(input.eventName));
  const defaults = metadata
    ? {
      eventName: metadata.eventName,
      featureId: input.featureId ?? surfaceOverride?.featureId ?? metadata.feature,
      surface: input.surface ?? surfaceOverride?.surfaceId ?? metadata.surface,
      materializerLane: input.materializerLane ?? surfaceOverride?.materializerLane ?? metadata.materializerLane,
      debugVisibility: input.debugVisibility ?? surfaceOverride?.debugVisibility ?? metadata.debugVisibility,
      scoreImpact: input.scoreImpact ?? surfaceOverride?.scoreEvidenceImpact ?? metadata.scoreEvidenceImpact,
    }
    : buildUnregisteredDefaults(input);
  const identityEnvelope = buildEventIdentityEnvelope({
    eventName: defaults.eventName,
    actorKind: input.actorKind,
    identityState: input.identityState,
    guestId: input.guestId,
    userId: input.userId,
    sessionId: input.sessionId,
    linkId: input.linkId,
    consentMode: normalizeConsentMode(input.consentMode),
    legacyUnknown: input.legacyUnknown,
    projectionMode: input.projectionMode,
    performedAs: input.performedAs,
    roles: input.roles,
    claims: input.claims,
    systemGenerated: input.systemGenerated,
  });
  const pipelineStatus: EventEnvelopePipelineStatus = metadata ? "normal" : "quarantined";
  const quarantineReason: EventEnvelopeQuarantineReason | undefined = metadata ? undefined : "unregistered_event";

  return {
    eventId: cleanString(input.eventId) || `${defaults.eventName}:${identityEnvelope.sessionId}:${normalizeTimestamp(input.timestamp)}`,
    eventName: defaults.eventName,
    eventVersion: typeof input.eventVersion === "number" && input.eventVersion > 0 ? input.eventVersion : 1,
    timestamp: normalizeTimestamp(input.timestamp),
    featureId: defaults.featureId,
    surface: defaults.surface,
    actorKind: identityEnvelope.actorKind as ActorKind,
    identityState: (cleanString(input.identityConfidence) ? identityEnvelope.identityState : identityEnvelope.identityState) as IdentityState,
    identityConfidence: (cleanString(input.identityConfidence) || identityEnvelope.identityConfidence) as IdentityConfidence,
    consentMode: identityEnvelope.consentMode,
    sessionId: identityEnvelope.sessionId,
    guestId: identityEnvelope.guestId,
    userRef: identityEnvelope.userId ? { kind: "user", id: identityEnvelope.userId } : null,
    linkId: identityEnvelope.linkId,
    source: normalizeSource(input.source),
    materializerLane: defaults.materializerLane,
    debugVisibility: defaults.debugVisibility,
    scoreImpact: defaults.scoreImpact,
    privacyClass: input.privacyClass ?? classifyEventPrivacy(defaults.eventName),
    metadata: stripForbiddenMetadata(input.metadata),
    pipelineStatus,
    ...(quarantineReason ? { quarantineReason } : {}),
    unavailableGuestReason: identityEnvelope.unavailableGuestReason,
    includeInUserBehavior: identityEnvelope.includeInUserBehavior,
  };
}

export function normalizeLegacyEventEnvelope(input: EventEnvelopeInput): CanonicalEventEnvelope {
  const legacy = classifyLegacyIdentity({
    eventName: input.eventName,
    userId: input.userId,
    guestId: input.guestId,
    sessionId: input.sessionId,
  });
  return {
    ...buildEventEnvelope({
      ...input,
      actorKind: legacy.actorKind,
      identityState: legacy.identityState,
      identityConfidence: legacy.identityConfidence,
      userId: null,
      guestId: null,
      sessionId: legacy.sessionId ?? input.sessionId,
      consentMode: input.consentMode ?? "unknown",
      source: "legacy",
      legacyUnknown: true,
    }),
    actorKind: "legacy_unknown",
    identityState: "legacy_unknown",
    identityConfidence: "unknown",
    userRef: null,
    guestId: null,
    pipelineStatus: "quarantined",
    quarantineReason: "legacy_event",
    privacyClass: "unknown",
  };
}

export function validateEventEnvelope(envelope: CanonicalEventEnvelope): EventEnvelopeValidationResult {
  const findings: string[] = [];

  for (const field of EVENT_ENVELOPE_REQUIRED_FIELDS) {
    const value = envelope[field];
    const missingObject = field === "metadata" && (!value || typeof value !== "object");
    if (missingObject || value === "" || value === null || typeof value === "undefined") {
      findings.push(`missing_${field}`);
    }
  }

  if ((envelope.guestId || envelope.userRef?.id) && !envelope.identityState) {
    findings.push("identity_id_without_identity_state");
  }
  if (!envelope.consentMode) {
    findings.push("missing_consentMode");
  }
  if (envelope.pipelineStatus === "normal" && envelope.featureId === "unregistered") {
    findings.push("unregistered_event_entered_normal_pipeline");
  }
  if (envelope.pipelineStatus === "quarantined" && envelope.quarantineReason === "unregistered_event") {
    findings.push("unregistered_event_cannot_enter_normal_pipeline");
  }
  const metadataWithForbiddenKeys = Object.keys(envelope.metadata).filter((key) => FORBIDDEN_METADATA_KEY_PATTERN.test(key));
  if (metadataWithForbiddenKeys.length > 0) {
    findings.push("forbidden_metadata_present");
  }
  if (envelope.identityState === "legacy_unknown" && envelope.identityConfidence === "exact") {
    findings.push("legacy_unknown_promoted_to_exact");
  }

  return {
    ok: findings.length === 0,
    findings,
  };
}

export function getEnvelopeDedupeKey(input: CanonicalEventEnvelope) {
  const actorKey = input.userRef?.id
    ? `user:${input.userRef.id}`
    : input.guestId
      ? `guest:${input.guestId}`
      : `session:${input.sessionId}`;
  const timeBucket = input.timestamp.slice(0, 16);
  return [input.eventName, actorKey, input.sessionId, input.linkId ?? "no_link", timeBucket].join("|");
}
