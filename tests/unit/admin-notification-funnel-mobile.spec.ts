import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "src/components/Admin/Analytics/AdminTaskAndNotificationModules.tsx"),
  "utf8",
);

describe("Admin notification funnel mobile consolidation", () => {
  it("renders Notification Funnel as one compact mobile view mode at a time", () => {
    expect(source).toContain("notificationFunnelViewMode");
    expect(source).toContain("setNotificationFunnelViewMode");
    expect(source).toContain("data-admin-analytics-mobile-view-mode={notificationFunnelViewMode}");
    expect(source).toContain('data-notification-funnel-chart="compact"');
    expect(source).toContain('data-notification-funnel-table="compact"');
    expect(source).toContain("data-notification-funnel-source-mode={props.notificationFunnelModel.sourceMode}");
    expect(source).toContain("data-notification-denominator-mode={props.notificationFunnelModel.denominatorMode}");
    expect(source).toContain("data-notification-missing-source-count={props.notificationFunnelModel.missingSourceCount}");
    expect(source).toContain('notificationFunnelViewMode === "chart"');
    expect(source).toContain('notificationFunnelViewMode === "table"');
    expect(source).toContain('notificationFunnelViewMode === "cards"');
  });
});
