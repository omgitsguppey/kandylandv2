export type TelemetryIntentAliasClassification =
  | "potential_duplicate_intent"
  | "distinct_lifecycle_events"
  | "unsafe_unknown";

export type TelemetryIntentAlias = {
  canonicalIntentId: string;
  eventNames: string[];
  classification: TelemetryIntentAliasClassification;
  historicalStatus: "history_preserved";
  preferredFutureEvent: string;
  migrationRequired: boolean;
  renameAllowed: false;
  validatorsImpacted: string[];
  materializersImpacted: string[];
  debugDisplayLabel: string;
  dedupePolicy: string;
  nextAction: string;
};

export const TELEMETRY_INTENT_ALIASES: TelemetryIntentAlias[] = [
  {
    canonicalIntentId: "drop_preview_view",
    eventNames: ["drop_preview_opened", "drop_preview_page_viewed"],
    classification: "potential_duplicate_intent",
    historicalStatus: "history_preserved",
    preferredFutureEvent: "drop_preview_page_viewed",
    migrationRequired: true,
    renameAllowed: false,
    validatorsImpacted: [
      "check:event-catalog-telemetry",
      "check:telemetry-parity-score",
      "check:monolith-orphan-metric-registry",
    ],
    materializersImpacted: [
      "person_metrics",
      "analytics_event_facts",
      "event_catalog",
    ],
    debugDisplayLabel: "Drop preview view intent",
    dedupePolicy: "Alias both events under one intent and avoid double-counting for the same user/session/drop unless a materializer proves distinct lifecycle moments.",
    nextAction: "Preserve historical events; add materializer alias handling before changing future emitters.",
  },
];

export function validateTelemetryIntentAliases(aliases: readonly TelemetryIntentAlias[] = TELEMETRY_INTENT_ALIASES) {
  const failures: string[] = [];
  const dropPreview = aliases.find((entry) => entry.canonicalIntentId === "drop_preview_view");
  if (!dropPreview) return ["drop preview intent alias is missing."];
  for (const eventName of ["drop_preview_opened", "drop_preview_page_viewed"]) {
    if (!dropPreview.eventNames.includes(eventName)) failures.push(`${eventName} is missing from drop preview alias group.`);
  }
  if (dropPreview.renameAllowed !== false) failures.push("drop preview alias must not allow automatic rename.");
  if (dropPreview.historicalStatus !== "history_preserved") failures.push("drop preview alias must preserve history.");
  if (dropPreview.classification !== "potential_duplicate_intent") failures.push("drop preview alias must be classified as potential duplicate intent.");
  if (!dropPreview.dedupePolicy.includes("double-counting")) failures.push("drop preview alias lacks double-count policy.");
  if (dropPreview.debugDisplayLabel.trim().length === 0) failures.push("drop preview alias lacks debug display label.");
  return failures;
}
