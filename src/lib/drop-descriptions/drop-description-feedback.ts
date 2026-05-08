export type DescriptionFeedbackUpdate = {
  patternPreference?: "default" | "urgency" | "sensory";
  bannedPhrase?: string;
  creatorWordingPreference?: string;
  flavorAdjectivePreference?: string;
  preferredLength?: "short" | "medium";
};

export function normalizeFeedbackUpdate(input: DescriptionFeedbackUpdate) {
  return {
    ...input,
    bannedPhrase: input.bannedPhrase?.trim() || undefined,
    creatorWordingPreference: input.creatorWordingPreference?.trim() || undefined,
    flavorAdjectivePreference: input.flavorAdjectivePreference?.trim() || undefined,
  };
}
