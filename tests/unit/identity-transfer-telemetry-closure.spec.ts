import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  buildAnalyticsIdentityLink,
  buildGuestUserIdentityLinkId,
  buildIdentityTransferCountingKeys,
  resolveIdentityTransferTelemetryState,
} from "@/lib/analytics/identity-transfer";
import {
  ANALYTICS_IDENTITY_STATES,
  createCanonicalAnalyticsEvent,
  resolveAnalyticsIdentityState,
} from "@/lib/analytics/analytics-event-contract";
import {
  buildIdentityTransferTelemetryClosureReport,
  validateIdentityTransferTelemetryClosureReport,
} from "../../scripts/agent/validate-identity-transfer-telemetry-closure";

describe("identity transfer telemetry closure", () => {
  it("exposes all closed-loop identity states", () => {
    expect(ANALYTICS_IDENTITY_STATES).toEqual([
      "guest_only",
      "user_only",
      "guest_linked_to_user",
      "creator_user",
      "admin_projection",
      "unknown_legacy",
    ]);
  });

  it("uses one deterministic identity link id across transfer helpers", () => {
    const link = buildAnalyticsIdentityLink({
      guestId: "guest_123",
      sessionId: "session_abc",
      userId: "user_789",
      linkedAt: "2026-05-19T12:00:00.000Z",
      reason: "signup",
    });

    expect(link.identityLinkId).toBe(buildGuestUserIdentityLinkId({
      guestId: "guest_123",
      sessionId: "session_abc",
      userId: "user_789",
    }));
  });

  it("does not treat a signed-in session id alone as linked guest history", () => {
    expect(resolveIdentityTransferTelemetryState({
      userId: "user_1",
      sessionId: "session_1",
    })).toBe("user_only");

    expect(resolveIdentityTransferTelemetryState({
      userId: "user_1",
      sessionId: "session_1",
      anonymousVisitorId: "guest_1",
    })).toBe("guest_linked_to_user");
  });

  it("separates creator and admin projection identities from normal users", () => {
    expect(resolveAnalyticsIdentityState({
      actorType: "creator",
      actorCreatorId: "creator_1",
      userId: "creator_user_1",
    })).toBe("creator_user");

    expect(resolveAnalyticsIdentityState({
      actorType: "admin",
      actorAdminId: "admin_1",
      performedAs: "admin_view_as_creator",
      projectionMode: "read_only_creator_projection",
      userId: "admin_user_1",
    })).toBe("admin_projection");
  });

  it("keeps linked guest lineage from becoming a second known user count", () => {
    const counting = buildIdentityTransferCountingKeys({
      userId: "user_1",
      anonymousVisitorId: "guest_1",
      sessionId: "session_1",
      identityLinkId: "identity_link_1",
    });

    expect(counting.knownUserCountKey).toBe("user_1");
    expect(counting.linkedGuestCountKey).toBe("guest_1");
    expect(counting.countAsKnownUser).toBe(true);
    expect(counting.countAsAdditionalKnownUser).toBe(false);
    expect(counting.countAsUnknownLegacy).toBe(false);
  });

  it("keeps unknown legacy out of clean known user analysis", () => {
    const counting = buildIdentityTransferCountingKeys({});

    expect(counting.identityState).toBe("unknown_legacy");
    expect(counting.countAsKnownUser).toBe(false);
    expect(counting.countAsAdditionalKnownUser).toBe(false);
    expect(counting.countAsUnknownLegacy).toBe(true);
  });

  it("persists individual user events with session continuity and optional link state", () => {
    const event = createCanonicalAnalyticsEvent({
      eventId: "evt_user_continuity",
      eventName: "drop_clicked",
      actorType: "user",
      userId: "user_1",
      sessionId: "session_1",
      source: "identified_ingest",
    });

    expect(event.userId).toBe("user_1");
    expect(event.sessionId).toBe("session_1");
    expect(event.identityState).toBe("user_only");

    const linked = createCanonicalAnalyticsEvent({
      eventId: "evt_user_linked",
      eventName: "drop_clicked",
      actorType: "user",
      userId: "user_1",
      anonymousVisitorId: "guest_1",
      sessionId: "session_1",
      identityLinkId: "identity_link_1",
      source: "identified_ingest",
    });

    expect(linked.identityState).toBe("guest_linked_to_user");
  });

  it("keeps the server upsert path on the shared deterministic id helper", () => {
    const source = readFileSync("src/lib/server/analytics-identity-linking.ts", "utf8");

    expect(source).toContain("buildGuestUserIdentityLinkId");
    expect(source).not.toContain("createHash");
  });

  it("validator blocks a missing linked-guest double-count guard", () => {
    const report = buildIdentityTransferTelemetryClosureReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-19T12:00:00.000Z",
    });
    const packageJson = readFileSync("package.json", "utf8");
    const sources = {
      "src/lib/analytics/identity-transfer.ts": "export { buildGuestUserIdentityLinkId } from './analytics-identity-link';",
      "src/lib/analytics/analytics-identity-link.ts": `
        export const ANALYTICS_IDENTITY_STATES = ["guest_only", "user_only", "guest_linked_to_user", "creator_user", "admin_projection", "unknown_legacy"];
        export function buildGuestUserIdentityLinkId() {}
        export function buildIdentityTransferCountingKeys() { return {}; }
        const countAsUnknownLegacy = true;
      `,
      "src/lib/analytics/analytics-event-contract.ts": `
        export const ANALYTICS_IDENTITY_STATES = ["guest_only", "user_only", "guest_linked_to_user", "creator_user", "admin_projection", "unknown_legacy"];
      `,
      "src/lib/server/analytics-identity-linking.ts": "import { buildGuestUserIdentityLinkId } from '@/lib/analytics/identity-transfer';",
      "src/app/api/analytics/identity-link/route.ts": `guardApiRequest(request, { auth: "user", requireAuthHeaderPresence: true });`,
      "src/app/api/analytics/ingest-identified/route.ts": "resolveIdentityTransferTelemetryState(); const sourceIdentity = {};",
      "src/context/AuthContext.tsx": "hasSubmittedIdentityLink(); markIdentityLinkSubmitted();",
      "tests/unit/identity-transfer-telemetry-closure.spec.ts": readFileSync("tests/unit/identity-transfer-telemetry-closure.spec.ts", "utf8"),
      "package.json": packageJson,
    };

    expect(validateIdentityTransferTelemetryClosureReport(report, sources, { currentHead: "head" })).toContain(
      "linked guest history double-count guard missing.",
    );
  });
});
