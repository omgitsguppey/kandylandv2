import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { sanitizeFirestorePayload } from "@/lib/server/firestore-sanitize";

describe("AI description feedback Firestore cleanup", () => {
  it("removes undefined editor fields while preserving explicit nulls", () => {
    const payload = sanitizeFirestorePayload({
      lastEditedByUid: undefined,
      lastEditedByEmail: null,
      updatedAtMs: 123,
      nested: {
        keep: true,
        drop: undefined,
      },
    });

    expect(payload).toEqual({
      lastEditedByEmail: null,
      updatedAtMs: 123,
      nested: {
        keep: true,
      },
    });
    expect(JSON.stringify(payload)).not.toContain("lastEditedByUid");
  });

  it("sanitizes AI drop description prompt policy writes before Firestore set", () => {
    const source = readFileSync("src/lib/server/ai-drop-descriptions.ts", "utf8");

    expect(source).toContain("sanitizeFirestorePayload");
    expect(source).toContain("sanitizeFirestorePayload(nextPolicy");
    expect(source).not.toContain(".set(nextPolicy, { merge: true })");
  });
});
