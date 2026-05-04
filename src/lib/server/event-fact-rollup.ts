import "server-only";

import {
  BEHAVIORAL_EVENT_FACT_VERSION,
  BEHAVIORAL_NORMALIZED_ACTIONS,
  type BehavioralEventFact,
  type BehavioralEventFactDiagnostic,
  type BehavioralNormalizedAction,
} from "@/lib/behavioral/event-fact-contract";
import { dedupeBehavioralEventFacts } from "@/lib/behavioral/normalize-event-fact";

export type BehavioralEventFactRollup = {
  version: string;
  facts: BehavioralEventFact[];
  diagnostics: BehavioralEventFactDiagnostic[];
  counts: Record<BehavioralNormalizedAction, number>;
  unknownEvents: Array<{ eventName: string; count: number }>;
};

function createEmptyCounts() {
  return Object.fromEntries(
    BEHAVIORAL_NORMALIZED_ACTIONS.map((action) => [action, 0]),
  ) as Record<BehavioralNormalizedAction, number>;
}

export function buildBehavioralEventFactRollup(input: {
  facts: Array<BehavioralEventFact | null | undefined>;
  diagnostics?: Array<BehavioralEventFactDiagnostic | null | undefined>;
}): BehavioralEventFactRollup {
  const facts = dedupeBehavioralEventFacts(input.facts);
  const diagnostics = (input.diagnostics ?? []).filter(
    (diagnostic): diagnostic is BehavioralEventFactDiagnostic => Boolean(diagnostic),
  );
  const counts = createEmptyCounts();
  const unknownEventCounts = new Map<string, number>();

  facts.forEach((fact) => {
    counts[fact.normalizedAction] += 1;
  });

  diagnostics.forEach((diagnostic) => {
    unknownEventCounts.set(
      diagnostic.eventName,
      (unknownEventCounts.get(diagnostic.eventName) || 0) + 1,
    );
  });

  return {
    version: BEHAVIORAL_EVENT_FACT_VERSION,
    facts,
    diagnostics,
    counts,
    unknownEvents: Array.from(unknownEventCounts.entries())
      .map(([eventName, count]) => ({ eventName, count }))
      .sort((left, right) => right.count - left.count || left.eventName.localeCompare(right.eventName)),
  };
}
