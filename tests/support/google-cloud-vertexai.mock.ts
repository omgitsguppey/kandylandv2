import { vi } from "vitest";

export const SchemaType = {
  STRING: "STRING",
  NUMBER: "NUMBER",
  INTEGER: "INTEGER",
  BOOLEAN: "BOOLEAN",
  ARRAY: "ARRAY",
  OBJECT: "OBJECT",
} as const;

type GenerateContentInput = {
  contents?: Array<{
    role?: string;
    parts?: Array<{ text?: string }>;
  }>;
};

function readPromptText(input: GenerateContentInput | undefined) {
  return input?.contents
    ?.flatMap((entry) => entry.parts || [])
    .map((part) => part.text || "")
    .join("\n")
    .trim() || "Mock Vertex response";
}

function createModel(modelName?: string) {
  return {
    generateContent: vi.fn(async (input?: GenerateContentInput) => ({
      response: {
        candidates: [{
          content: {
            parts: [{
              text: readPromptText(input),
            }],
          },
        }],
        usageMetadata: {
          promptTokenCount: 0,
          candidatesTokenCount: 0,
          totalTokenCount: 0,
        },
        modelVersion: modelName || "mock-vertex-model",
      },
    })),
  };
}

export class VertexAI {
  readonly preview: {
    getGenerativeModel: (options?: { model?: string }) => ReturnType<typeof createModel>;
  };

  constructor(_config?: { project?: string; location?: string }) {
    this.preview = {
      getGenerativeModel: (options) => createModel(options?.model),
    };
  }

  getGenerativeModel(options?: { model?: string }) {
    return createModel(options?.model);
  }
}
