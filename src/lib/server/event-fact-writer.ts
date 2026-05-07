import type { BehavioralEventFact } from "@/lib/behavioral/event-fact-contract";
import type { IdentifiedMetricParityFact } from "@/lib/behavioral/event-fact-normalizer";
import { materializeCanonicalMetricFact } from "@/lib/server/metric-fact-materializer";

export type CanonicalEventFactWritePayload = {
  behavioralFact: BehavioralEventFact;
  metricFact: ReturnType<typeof materializeCanonicalMetricFact>;
};

export function buildCanonicalEventFactWritePayload(
  parityFact: IdentifiedMetricParityFact,
): CanonicalEventFactWritePayload | null {
  if (!parityFact.behavioralFact) {
    return null;
  }

  return {
    behavioralFact: parityFact.behavioralFact,
    metricFact: materializeCanonicalMetricFact(parityFact.behavioralFact),
  };
}

