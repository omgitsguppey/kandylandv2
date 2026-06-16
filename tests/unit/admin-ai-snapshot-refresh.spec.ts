import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const coverStateSource = readFileSync(join(process.cwd(), "src/app/admin/ai/hooks/useAdminAiState.tsx"), "utf8");
const pageSource = readFileSync(join(process.cwd(), "src/app/admin/ai/page.tsx"), "utf8");
const recentGenerationsSource = readFileSync(join(process.cwd(), "src/app/admin/ai/components/AdminAiRecentgenerationsSection.tsx"), "utf8");
const descriptionSource = readFileSync(join(process.cwd(), "src/components/Admin/AdminAiDescriptionOperations.tsx"), "utf8");

describe("admin AI snapshot refresh", () => {
  it("keeps cover operations on snapshot refresh instead of active or idle polling", () => {
    expect(coverStateSource).toContain("const ADMIN_AI_SNAPSHOT_REFRESH_INTERVAL_MS = 0");
    expect(coverStateSource).toContain('"/api/admin/ai/drop-covers", ADMIN_AI_SNAPSHOT_REFRESH_INTERVAL_MS');
    expect(coverStateSource).toContain('"/api/admin/ui/preferences", ADMIN_AI_SNAPSHOT_REFRESH_INTERVAL_MS');
    expect(coverStateSource).not.toContain("ADMIN_AI_DROP_COVER_ACTIVE_POLL_INTERVAL_MS");
    expect(coverStateSource).not.toContain("ADMIN_AI_DROP_COVER_IDLE_POLL_INTERVAL_MS");
    expect(coverStateSource).not.toContain("setRefreshIntervalMs");
    expect(pageSource).toContain("state.mutate()");
  });

  it("keeps description operations on snapshot refresh instead of active or idle polling", () => {
    expect(descriptionSource).toContain("const ADMIN_AI_DESCRIPTION_SNAPSHOT_REFRESH_INTERVAL_MS = 0");
    expect(descriptionSource).toContain('"/api/admin/ai/drop-descriptions", ADMIN_AI_DESCRIPTION_SNAPSHOT_REFRESH_INTERVAL_MS');
    expect(descriptionSource).toContain('"/api/admin/ui/preferences", ADMIN_AI_DESCRIPTION_SNAPSHOT_REFRESH_INTERVAL_MS');
    expect(descriptionSource).toContain("void mutate()");
    expect(descriptionSource).not.toContain("ADMIN_AI_DROP_DESCRIPTION_ACTIVE_POLL_INTERVAL_MS");
    expect(descriptionSource).not.toContain("ADMIN_AI_DROP_DESCRIPTION_IDLE_POLL_INTERVAL_MS");
    expect(descriptionSource).not.toContain("setRefreshIntervalMs");
  });

  it("does not show fake active or idle cadence chips in recent generations", () => {
    expect(recentGenerationsSource).not.toContain("2.5s active");
    expect(recentGenerationsSource).not.toContain("10s idle");
    expect(recentGenerationsSource).not.toContain("refreshIntervalMs");
  });
});
