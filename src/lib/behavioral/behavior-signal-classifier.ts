import {
  getTelemetryEventExtensionMetadata,
  type TelemetryEventExtensionMetadata,
} from "@/lib/telemetry-catalog";
import {
  canTrackEvent,
  canUseBehavioralSignals,
  type ConsentMode,
} from "@/lib/privacy/consent-tracking-policy";

export type BehaviorSignalType =
  | "impression"
  | "click"
  | "intent"
  | "interaction"
  | "conversion"
  | "retention"
  | "watch"
  | "profile_interest"
  | "creator_interest"
  | "drop_interest"
  | "monetization_interest";

export type BehaviorEventQuarantineReason =
  | "unregistered_event"
  | "consent_blocked_behavioral_personalization"
  | "missing_identity_requirement"
  | "missing_materializer_lane";

export interface BehaviorSignalClassification {
  eventName: string;
  accepted: boolean;
  signals: BehaviorSignalType[];
  consentAllowed: boolean;
  identityAware: boolean;
  deduped: boolean;
  materializerReady: boolean;
  debugVisible: boolean;
  quarantineReason?: BehaviorEventQuarantineReason;
  metadata?: TelemetryEventExtensionMetadata;
}

function signalsForMetadata(metadata: TelemetryEventExtensionMetadata): BehaviorSignalType[] {
  const eventName = metadata.eventName;
  const signals = new Set<BehaviorSignalType>();

  if (metadata.eventType === "impression") signals.add("impression");
  if (metadata.eventType === "click") signals.add("click");
  if (metadata.eventType === "intent") signals.add("intent");
  if (metadata.eventType === "interaction") signals.add("interaction");
  if (metadata.eventType === "conversion") signals.add("conversion");
  if (metadata.eventType === "purchase") signals.add("conversion");
  if (metadata.eventType === "retention") signals.add("retention");
  if (metadata.eventType === "watch") signals.add("watch");
  if (metadata.eventType === "profile_view") signals.add("profile_interest");
  if (metadata.eventType === "purchase") signals.add("monetization_interest");
  if (metadata.feature === "creator_profile" || metadata.feature === "creator_timeline" || metadata.feature === "broadcasts") {
    signals.add("creator_interest");
  }
  if (metadata.feature === "drops" || eventName.includes("drop")) {
    signals.add("drop_interest");
  }
  if (metadata.feature === "fan_pass" || metadata.feature === "wallet") {
    signals.add("monetization_interest");
  }

  return [...signals];
}

function isBehavioralPersonalization(metadata: TelemetryEventExtensionMetadata) {
  return metadata.consentRequirement === "full_behavioral"
    || metadata.eventType === "impression"
    || metadata.eventType === "profile_view"
    || metadata.eventType === "drop_open"
    || metadata.eventType === "watch"
    || metadata.eventType === "follow"
    || metadata.feature === "creator_profile"
    || metadata.feature === "creator_timeline";
}

export function classifyBehaviorSignalForEvent(
  eventName: string,
  consentMode: ConsentMode = "unknown",
): BehaviorSignalClassification {
  const metadata = getTelemetryEventExtensionMetadata(eventName);

  if (!metadata) {
    return {
      eventName,
      accepted: false,
      signals: [],
      consentAllowed: false,
      identityAware: false,
      deduped: false,
      materializerReady: false,
      debugVisible: false,
      quarantineReason: "unregistered_event",
    };
  }

  const identityAware = metadata.identityRequirement !== "none";
  const materializerReady = metadata.materializerLane.length > 0;
  const consentAllowed = metadata.consentRequirement === "required_integrity"
    || (
      isBehavioralPersonalization(metadata)
        ? canUseBehavioralSignals(consentMode)
        : canTrackEvent(metadata.eventName, consentMode)
    );

  if (!consentAllowed) {
    return {
      eventName: metadata.eventName,
      accepted: false,
      signals: signalsForMetadata(metadata),
      consentAllowed,
      identityAware,
      deduped: metadata.dedupeRequired,
      materializerReady,
      debugVisible: metadata.debugVisibility === "debug_visible",
      quarantineReason: "consent_blocked_behavioral_personalization",
      metadata,
    };
  }

  if (!identityAware) {
    return {
      eventName: metadata.eventName,
      accepted: false,
      signals: signalsForMetadata(metadata),
      consentAllowed,
      identityAware,
      deduped: metadata.dedupeRequired,
      materializerReady,
      debugVisible: metadata.debugVisibility === "debug_visible",
      quarantineReason: "missing_identity_requirement",
      metadata,
    };
  }

  if (!materializerReady) {
    return {
      eventName: metadata.eventName,
      accepted: false,
      signals: signalsForMetadata(metadata),
      consentAllowed,
      identityAware,
      deduped: metadata.dedupeRequired,
      materializerReady,
      debugVisible: metadata.debugVisibility === "debug_visible",
      quarantineReason: "missing_materializer_lane",
      metadata,
    };
  }

  return {
    eventName: metadata.eventName,
    accepted: true,
    signals: signalsForMetadata(metadata),
    consentAllowed,
    identityAware,
    deduped: metadata.dedupeRequired,
    materializerReady,
    debugVisible: metadata.debugVisibility === "debug_visible",
    metadata,
  };
}

export function validateBehaviorEventRegistration(eventName: string) {
  const classification = classifyBehaviorSignalForEvent(eventName, "full_behavioral");
  const findings: string[] = [];

  if (!classification.metadata) {
    findings.push(`${eventName} is not registered in the telemetry catalog`);
  }
  if (classification.metadata && !classification.metadata.consentRequirement) {
    findings.push(`${eventName} lacks consent requirement`);
  }
  if (classification.metadata && !classification.metadata.identityRequirement) {
    findings.push(`${eventName} lacks identity requirement`);
  }
  if (classification.metadata && !classification.metadata.materializerLane) {
    findings.push(`${eventName} lacks materializer lane`);
  }
  if (classification.metadata && !classification.metadata.futureFeatureSafe) {
    findings.push(`${eventName} is not future-feature safe`);
  }

  return {
    ok: findings.length === 0,
    findings,
    classification,
  };
}
