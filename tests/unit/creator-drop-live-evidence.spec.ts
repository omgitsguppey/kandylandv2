import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("creator drop live evidence", () => {
  it("registers creator drop workflow events in the telemetry catalog", () => {
    const catalog = read("src/lib/telemetry-catalog.ts");
    const expectedEvents = [
      "creator_drop_manager_viewed",
      "creator_drop_draft_created",
      "creator_drop_draft_saved",
      "creator_drop_submit_attempted",
      "creator_drop_submit_succeeded",
      "creator_drop_submit_failed",
      "creator_drop_pending_review_viewed",
      "admin_creator_drop_review_viewed",
      "admin_creator_drop_approved",
      "admin_creator_drop_rejected",
      "admin_creator_drop_needs_changes",
      "creator_drop_status_viewed",
    ];

    for (const eventName of expectedEvents) {
      expect(catalog).toContain(eventName);
    }
  });

  it("keeps creator drop workflow connected to analytics, live evidence, and debug docs", () => {
    expect(read("docs/agent-truth/creator-drop-live-evidence.md")).toContain("analytics panel hydration");
    expect(read("docs/agent-truth/creator-drop-live-evidence.md")).toContain("live evidence gate");
    expect(read("agent/state/creator-drop-live-evidence.generated.json")).toContain("pending_review");
  });
});
