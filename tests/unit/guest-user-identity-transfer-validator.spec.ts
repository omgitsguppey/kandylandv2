import { describe, expect, it } from "vitest";

import {
  buildGuestUserIdentityTransferReport,
  validateGuestUserIdentityTransferReport,
  type GuestUserIdentityTransferReport,
} from "../../scripts/agent/validate-guest-user-identity-transfer";

const sources = {
  "src/lib/analytics/analytics-identity-link.ts": `
    export function buildIdentityLink() { return { identityLinkId: "id", authTransitionId: "auth" }; }
    export function createIdentityLinkStorageKey() {}
    export function hasSubmittedIdentityLink() {}
  `,
  "src/lib/analytics/analytics-event-contract.ts": `
    export const ANALYTICS_IDENTITY_STATES = ["guest_only", "user_only", "guest_linked_to_user", "unknown_legacy"] as const;
    type Event = { identityState: string };
  `,
  "src/context/AuthContext.tsx": `
    if (hasSubmittedIdentityLink(payload)) return;
    markIdentityLinkSubmitted(payload);
  `,
  "src/app/api/analytics/identity-link/route.ts": `
    guardApiRequest(request, { auth: "user", requireAuthHeaderPresence: true });
    return NextResponse.json({ reason: "auth_required" }, { status: 401 });
    // cost-bound: link-first transfer writes one association record.
  `,
  "src/app/api/analytics/ingest-identified/route.ts": `
    const eventFactDocument = { identityState, sourceIdentity };
  `,
  "tests/unit/guest-user-identity-transfer.spec.ts": `
    it("builds a deterministic guest-to-user link id", () => {});
    it("uses local idempotency keys", () => {});
    it("lets authenticated events carry guest lineage", () => {});
    it("keeps guest events guest-only", () => {});
    it("records transfer failures as non-blocking", () => {});
    it("requires auth for the transfer route", () => {});
  `,
};

describe("guest-user identity transfer validator", () => {
  it("passes with link, route, event state, idempotency, and cost lanes", () => {
    const report = buildGuestUserIdentityTransferReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-18T05:00:00.000Z",
    });

    expect(validateGuestUserIdentityTransferReport(report, sources, { currentHead: "head" })).toEqual([]);
  });

  it("fails when identity state is missing from the event contract", () => {
    const report = buildGuestUserIdentityTransferReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-18T05:00:00.000Z",
    });
    const brokenSources = {
      ...sources,
      "src/lib/analytics/analytics-event-contract.ts": "export const NO_IDENTITY_STATES = [];",
    };

    expect(validateGuestUserIdentityTransferReport(report, brokenSources, { currentHead: "head" })).toContain(
      "identity_state missing from event contract.",
    );
  });

  it("fails if linked guest history is represented as duplicate user events", () => {
    const report = buildGuestUserIdentityTransferReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-18T05:00:00.000Z",
    }) as GuestUserIdentityTransferReport;
    report.summary.historicalGuestEventsDuplicated = true;

    expect(validateGuestUserIdentityTransferReport(report, sources, { currentHead: "head" })).toContain(
      "linked guest history must not be represented as duplicate user events.",
    );
  });

  it("fails when a cost lane is missing", () => {
    const report = buildGuestUserIdentityTransferReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-18T05:00:00.000Z",
    }) as GuestUserIdentityTransferReport;
    report.costFindings = report.costFindings.filter((finding) => finding.lane !== "cloud_run");

    expect(validateGuestUserIdentityTransferReport(report, sources, { currentHead: "head" })).toContain(
      "cloud_run cost status lane is missing.",
    );
  });
});
