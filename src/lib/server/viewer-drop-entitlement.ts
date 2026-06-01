import "server-only";

import { sanitizeDropForClient } from "@/lib/server/drops";
import type { Drop } from "@/types/db";

export const VIEWER_DROP_ENTITLEMENT_EVIDENCE = {
  viewerRouteEntitlementGuarded: true,
  rawDropSanitized: true,
  privateMediaHiddenUntilEntitled: true,
  contentFetchRoute: "/api/drops/content",
  entitlementSource: "drop-view-access:creator_or_unlockedContent_or_unlockedContentTimestamps",
  mediaApiEntitlementSource: "/api/drops/content",
} as const;

export function buildViewerDropEntitlementPayload(rawDrop: Drop | null) {
  return {
    drop: rawDrop ? sanitizeDropForClient(rawDrop) : null,
    evidence: VIEWER_DROP_ENTITLEMENT_EVIDENCE,
  };
}
