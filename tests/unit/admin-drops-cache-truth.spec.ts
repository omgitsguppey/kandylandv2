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

  it("keeps queue config on snapshot refresh without repeating truth badges in every counter", () => {
    expect(ADMIN_DROPS_AT_GLANCE_SOURCE).toContain("const ADMIN_DROP_QUEUE_SNAPSHOT_REFRESH_INTERVAL_MS = 0");
    expect(ADMIN_DROPS_AT_GLANCE_SOURCE).toContain('useAdminPollingSWR<AdminDropQueueConfig>("/api/admin/queue", ADMIN_DROP_QUEUE_SNAPSHOT_REFRESH_INTERVAL_MS)');
    expect(ADMIN_DROPS_AT_GLANCE_SOURCE).not.toContain('useAdminPollingSWR<AdminDropQueueConfig>("/api/admin/queue", 30_000)');
    expect(ADMIN_DROPS_AT_GLANCE_SOURCE).not.toContain('sourceLabel === "filtered"');
    expect(ADMIN_DROPS_AT_GLANCE_SOURCE).not.toContain('className="mt-1 py-0 text-[8px]"');
  });
});
