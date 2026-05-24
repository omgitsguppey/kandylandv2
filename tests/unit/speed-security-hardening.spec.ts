import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  hasBodyLimitEvidence,
  hasBoundedPromiseAllEvidence,
} from "../../scripts/agent/score-speed-security-hardening";

describe("speed-security hardening scanner helpers", () => {
  it("recognizes the bounded JSON body parser as source-visible body limit evidence", () => {
    const routeSource = `
      const bodyLimitBytes = 64_000;
      await readBoundedJsonBody(request, { maxBytes: bodyLimitBytes, routeName: "admin/test" });
    `;

    expect(hasBodyLimitEvidence(routeSource)).toBe(true);
  });

  it("recognizes bounded parser error and payload codes as body limit evidence", () => {
    const routeSource = `
      if (error instanceof BoundedJsonBodyError) {
        return NextResponse.json({ code: "payload_too_large" }, { status: 413 });
      }
    `;

    expect(hasBodyLimitEvidence(routeSource)).toBe(true);
  });

  it("treats a cost-bound worker pool Promise.all as bounded", () => {
    const source = `
      // cost-bound: bounded Promise.all worker pool; never fan out more than the supplied concurrency.
      await Promise.all(
        Array.from({ length: Math.min(limit, items.length) }, () => runWorker()),
      );
    `;

    expect(hasBoundedPromiseAllEvidence(source, source.indexOf("Promise.all"))).toBe(true);
  });

  it("recognizes the shared bounded concurrency helper at fanout call sites", () => {
    const source = `
      await mapWithConcurrency(items, WORK_CONCURRENCY, async (item) => work(item));
    `;

    expect(hasBoundedPromiseAllEvidence(source, source.indexOf("mapWithConcurrency"))).toBe(true);
  });

  it("does not treat unrelated variable-array Promise.all as bounded", () => {
    const source = "await Promise.all(items.map(async (item) => work(item)));";

    expect(hasBoundedPromiseAllEvidence(source, source.indexOf("Promise.all"))).toBe(false);
  });

  it("keeps the analytics fixes source-visible to the scanner", () => {
    const root = process.cwd();
    const eventFacts = readFileSync(join(root, "functions/src/analytics-event-facts.ts"), "utf8");
    const semantics = readFileSync(join(root, "functions/src/analytics-semantics.ts"), "utf8");
    const preferencesRoute = readFileSync(join(root, "src/app/api/admin/analytics/preferences/route.ts"), "utf8");
    const refreshRoute = readFileSync(join(root, "src/app/api/admin/analytics/refresh/route.ts"), "utf8");
    const creatorSettingsRoute = readFileSync(join(root, "src/app/api/creator/settings/route.ts"), "utf8");
    const creatorBroadcastsRoute = readFileSync(join(root, "src/app/api/creator/broadcasts/route.ts"), "utf8");
    const creatorRequestsRoute = readFileSync(join(root, "src/app/api/creator/requests/route.ts"), "utf8");
    const creatorBookingsRoute = readFileSync(join(root, "src/app/api/creator/bookings/route.ts"), "utf8");
    const creatorSubscriptionsRoute = readFileSync(join(root, "src/app/api/creator/subscriptions/route.ts"), "utf8");

    expect(eventFacts).toContain("IDENTIFIED_ANALYTICS_MAX_BATCH_EVENTS = 100");
    expect(eventFacts).toContain("IDENTIFIED_ANALYTICS_EVENT_WRITE_CONCURRENCY = 8");
    expect(eventFacts).toContain("ANALYTICS_EVENT_FACT_SIDE_EFFECT_CONCURRENCY = 2");
    expect(eventFacts).toContain("Too many analytics events in one batch.");
    expect(semantics).toContain("GUEST_SEMANTIC_ROLLUP_MAX_EVENTS = 250");
    expect(semantics).toContain("GUEST_SEMANTIC_ROLLUP_CONCURRENCY = 8");
    expect(preferencesRoute).toContain("readBoundedJsonBody");
    expect(refreshRoute).toContain("readBoundedJsonBody");
    expect(preferencesRoute).not.toContain("request.json()");
    expect(refreshRoute).not.toContain("request.json()");
    expect(creatorSettingsRoute).toContain("readBoundedJsonBody");
    expect(creatorBroadcastsRoute).toContain("readBoundedJsonBody");
    expect(creatorRequestsRoute).toContain("readBoundedJsonBody");
    expect(creatorBookingsRoute).toContain("readBoundedJsonBody");
    expect(creatorSubscriptionsRoute).toContain("readBoundedJsonBody");
    expect(creatorSettingsRoute).not.toContain("request.json()");
    expect(creatorBroadcastsRoute).not.toContain("request.json()");
    expect(creatorRequestsRoute).not.toContain("request.json()");
    expect(creatorBookingsRoute).not.toContain("request.json()");
    expect(creatorSubscriptionsRoute).not.toContain("request.json()");
  });

  it("keeps focused fanout and body-limit fixes source-visible", () => {
    const root = process.cwd();
    const boundedConcurrency = readFileSync(join(root, "src/lib/server/bounded-concurrency.ts"), "utf8");
    const creatorDiscovery = readFileSync(join(root, "src/lib/server/creator-discovery.ts"), "utf8");
    const usernameSuggestions = readFileSync(join(root, "src/lib/server/username-suggestions.ts"), "utf8");
    const queueRuntime = readFileSync(join(root, "src/lib/server/queue-runtime.ts"), "utf8");
    const relationshipsRoute = readFileSync(join(root, "src/app/api/creator/relationships/route.ts"), "utf8");
    const debugPreferencesRoute = readFileSync(join(root, "src/app/api/admin/debug/preferences/route.ts"), "utf8");
    const creatorFanExperienceRoute = readFileSync(join(root, "src/app/api/admin/creator-fan-experience-settings/route.ts"), "utf8");
    const adminBalanceRoute = readFileSync(join(root, "src/app/api/admin/balance/route.ts"), "utf8");

    expect(boundedConcurrency).toContain("cost-bound: bounded Promise.all worker pool");
    expect(creatorDiscovery).toContain("mapWithConcurrency");
    expect(usernameSuggestions).toContain("mapWithConcurrency");
    expect(queueRuntime).toContain("mapWithConcurrency");
    expect(relationshipsRoute).toContain("mapWithConcurrency");
    expect(relationshipsRoute).toContain("readBoundedJsonBody");
    expect(debugPreferencesRoute).toContain("readBoundedJsonBody");
    expect(creatorFanExperienceRoute).toContain("readBoundedJsonBody");
    expect(adminBalanceRoute).toContain("readBoundedJsonBody");
    expect(adminBalanceRoute).toContain("ADMIN_BALANCE_BODY_LIMIT_BYTES = 8_192");
    expect(adminBalanceRoute).not.toContain("request.json()");
  });
});
