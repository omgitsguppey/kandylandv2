import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const ADMIN_DROPS_AT_GLANCE_SOURCE = readFileSync(
  join(__dirname, "../../src/components/Admin/AdminDropsAtGlancePanel.tsx"),
  "utf-8",
);

describe("admin drops cache truth", () => {
  it("labels Firestore cache snapshots as cached, not fallback or stale truth", () => {
    expect(ADMIN_DROPS_AT_GLANCE_SOURCE).toContain('if (state.fromCache) return "cached"');
    expect(ADMIN_DROPS_AT_GLANCE_SOURCE).not.toContain('if (state.fromCache) return "fallback"');
    expect(ADMIN_DROPS_AT_GLANCE_SOURCE).not.toContain('if (state.fromCache) return "stale"');
  });
});
