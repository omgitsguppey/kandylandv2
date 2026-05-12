export type CoverPromptAdapterModel = "image_2_5" | "image_3_pro_preview" | "default";

export function mapCoverModelAdapter(model: string): CoverPromptAdapterModel {
  const normalized = model.toLowerCase();
  if (normalized.includes("2.5") || normalized.includes("flash")) return "image_2_5";
  if (normalized.includes("3") && normalized.includes("pro")) return "image_3_pro_preview";
  return "default";
}

export function adaptCoverPromptForModel(model: CoverPromptAdapterModel, basePrompt: string, avoidList: string[]) {
  if (model === "image_2_5") {
    return {
      prompt: `${basePrompt} Keep strict edit-style layout consistency.`,
      negativePrompt: avoidList.join(", "),
    };
  }
  if (model === "image_3_pro_preview") {
    return {
      prompt: `${basePrompt} Use premium art-direction detail while preserving layout DNA.`,
      negativePrompt: avoidList.join(", "),
    };
  }
  return {
    prompt: basePrompt,
    negativePrompt: avoidList.join(", "),
  };
}
