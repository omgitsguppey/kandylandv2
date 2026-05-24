import { describe, expect, it } from "vitest";

import { classifyOptionalManualLegacyRoutePolicy } from "@/lib/debug/optional-manual-legacy-route-policy";

describe("optional/manual/legacy route policy", () => {
  it("keeps quiet and legacy routes out of live diagnostic health", () => {
    expect(classifyOptionalManualLegacyRoutePolicy("creator/messages:POST")).toMatchObject({
      policy: "legacy_visible_until_removal",
      displaysLive: false,
      affectsScore: false,
    });
    expect(classifyOptionalManualLegacyRoutePolicy("admin/drops/[dropId]:DELETE")).toMatchObject({
      policy: "optional_quiet",
      displaysLive: false,
      affectsScore: false,
    });
    expect(classifyOptionalManualLegacyRoutePolicy("admin/manual/balance-adjust:POST")).toMatchObject({
      policy: "manual_operator_action",
      displaysLive: false,
    });
  });
});
