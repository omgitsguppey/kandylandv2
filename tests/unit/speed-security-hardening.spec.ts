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
  });
});
