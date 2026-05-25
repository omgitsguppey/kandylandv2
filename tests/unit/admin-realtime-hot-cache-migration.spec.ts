import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import {
  ADMIN_REALTIME_TO_HOT_CACHE_MIGRATION,
  validateAdminRealtimeMigrationEntries,
} from "@/lib/admin/admin-realtime-to-hot-cache-migration";

describe("admin realtime to hot-cache migration", () => {
  it("keeps admin overview off Firestore realtime listeners while preserving chat realtime", () => {
    const overviewHook = readFileSync(join(process.cwd(), "src/hooks/useAdminOverviewRealtime.ts"), "utf-8");
    const chatSource = readFileSync(join(process.cwd(), "src/components/Chat/ChatExperience.tsx"), "utf-8");

    expect(overviewHook).not.toContain("onSnapshot");
    expect(overviewHook).not.toContain("realtime_firestore");
    expect(chatSource).toContain("onSnapshot");
    expect(ADMIN_REALTIME_TO_HOT_CACHE_MIGRATION.some((entry) => entry.classification === "realtime_allowed_user_chat")).toBe(true);
  });

  it("requires owner, reason, max query size, detach behavior, and fallback for realtime exceptions", () => {
    expect(validateAdminRealtimeMigrationEntries()).toEqual([]);
    const exception = ADMIN_REALTIME_TO_HOT_CACHE_MIGRATION.find((entry) => entry.classification === "realtime_allowed_operator_live_debug")?.exception;
    expect(exception).toMatchObject({
      owner: "admin_debug",
      detachBehavior: "cleanup_required",
      fallbackHotCachePath: "admin_debug_snapshot",
    });
    expect(exception?.reason).toContain("Operator live debug");
    expect(exception?.maxQuerySize).toBeGreaterThan(0);
  });
});
