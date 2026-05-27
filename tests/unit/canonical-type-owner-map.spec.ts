import { describe, expect, it } from "vitest";

import {
  CANONICAL_TYPE_OWNER_MAP,
  validateCanonicalTypeOwnerMap,
} from "../../src/lib/type-hardening/canonical-type-owner-map";

describe("canonical type owner map", () => {
  it("points shared domains at existing source-truth owners", () => {
    const validation = validateCanonicalTypeOwnerMap(CANONICAL_TYPE_OWNER_MAP);

    expect(CANONICAL_TYPE_OWNER_MAP.some((entry) => entry.domain === "user" && entry.canonicalFiles.includes("src/types/db.ts"))).toBe(true);
    expect(CANONICAL_TYPE_OWNER_MAP.some((entry) => entry.domain === "event_envelope" && entry.canonicalFiles.includes("src/lib/analytics/event-envelope-contract.ts"))).toBe(true);
    expect(validation.ok).toBe(true);
  });
});
