import { describe, expect, it } from "vitest";

import {
  VIEWER_DROP_ENTITLEMENT_EVIDENCE,
  buildViewerDropEntitlementPayload,
} from "@/lib/server/viewer-drop-entitlement";
import type { Drop } from "@/types/db";

describe("viewer drop entitlement hardening", () => {
  it("keeps raw drop reads server-side and only returns sanitized viewer payloads", () => {
    const rawDrop = {
      id: "drop_secure",
      creatorId: "creator_1",
      contentUrl: "https://storage.googleapis.com/private/drop.mp4",
      contentUrls: [
        "https://storage.googleapis.com/private/drop-1.mp4",
        "https://storage.googleapis.com/private/drop-2.mp4",
      ],
    } as Drop;

    const result = buildViewerDropEntitlementPayload(rawDrop);

    expect(result.drop?.contentUrl).toBe("");
    expect(result.drop?.contentUrls).toEqual(["", ""]);
    expect(result.evidence).toMatchObject({
      viewerRouteEntitlementGuarded: true,
      rawDropSanitized: true,
      privateMediaHiddenUntilEntitled: true,
      contentFetchRoute: "/api/drops/content",
    });
    expect(VIEWER_DROP_ENTITLEMENT_EVIDENCE.privateMediaHiddenUntilEntitled).toBe(true);
    expect(JSON.stringify(result)).not.toContain("storage.googleapis.com/private");
  });
});
