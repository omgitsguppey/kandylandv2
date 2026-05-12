import { createHash } from "node:crypto";

export function buildCoverFeedbackRecordHash(input: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 24);
}
