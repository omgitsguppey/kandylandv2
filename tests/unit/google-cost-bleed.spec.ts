import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { hasUnboundedFirestoreDeleteFanout } from "../../scripts/agent/score-google-cost-bleed";

describe("Google cost Firestore cleanup detection", () => {
  it("detects an unbounded Firestore batch delete inside an iteration", () => {
    const source = `
      const batch = adminDb.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    `;

    expect(hasUnboundedFirestoreDeleteFanout(source)).toBe(true);
  });

  it("accepts the canonical bounded rate-limit cleanup", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/server/rate-limit.ts"), "utf8");

    expect(hasUnboundedFirestoreDeleteFanout(source)).toBe(false);
  });

  it("does not mistake separate Storage object cleanup branches for a Firestore fanout", () => {
    const source = `
      const observedFile = bucket.file(storagePath);
      if (canceledBeforeFinalize) {
        await observedFile.delete();
      }
      if (canceledAfterFinalize) {
        await observedFile.delete();
      }
    `;

    expect(hasUnboundedFirestoreDeleteFanout(source)).toBe(false);
  });
});
