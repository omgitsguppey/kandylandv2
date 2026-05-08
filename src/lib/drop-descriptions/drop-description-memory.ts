export type DropDescriptionMemory = {
  acceptedExamples: string[];
  creatorVoicePreferences?: string[];
  bannedPhrases?: string[];
  preferredLength?: "short" | "medium";
};

export function trimDescriptionExamples(input: string[]) {
  return input.filter((value) => value.trim().length > 0).slice(0, 5);
}
