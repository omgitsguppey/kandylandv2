import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  hasBodyLimitEvidence,
  hasBoundedPromiseAllEvidence,
  hasBoundedFirestoreGetEvidence,
  hasBoundedStorageUploadEvidence,
  hasApprovedShellIntervalEvidence,
  hasExpectedFailureCodeEvidence,
  hasRequestBodyConsumptionEvidence,
} from "../../scripts/agent/score-speed-security-hardening";
import {
  findProductFacingCoinsVocabularyIndex,
  hasCanonicalTelemetrySourceComponentEvidence,
} from "../../scripts/agent/score-codebase-hardening";

describe("speed-security hardening scanner helpers", () => {
  it("recognizes only the visibility-aware canonical chat presence lease heartbeat", () => {
    const source = readFileSync(join(process.cwd(), "src/components/Chat/ChatExperience.tsx"), "utf8");

    expect(hasApprovedShellIntervalEvidence("src/components/Chat/ChatExperience.tsx", source)).toBe(true);
    expect(hasApprovedShellIntervalEvidence("src/components/Analytics/DeepTracker.tsx", source)).toBe(false);
  });

  it.each([
    ["visibility guard", 'document.visibilityState === "visible"'],
    ["visibility listener", 'document.addEventListener("visibilitychange", handlePresenceVisibilityChange)'],
    ["visibility cleanup", 'document.removeEventListener("visibilitychange", handlePresenceVisibilityChange)'],
    ["timer cleanup", "window.clearInterval(heartbeatTimer)"],
    ["disconnect cleanup", "onDisconnect(ownPresenceRef).remove()"],
  ])("keeps a chat heartbeat without %s reportable", (_label, requiredEvidence) => {
    const source = readFileSync(join(process.cwd(), "src/components/Chat/ChatExperience.tsx"), "utf8")
      .replaceAll(requiredEvidence, "missing_required_evidence");

    expect(hasApprovedShellIntervalEvidence("src/components/Chat/ChatExperience.tsx", source)).toBe(false);
  });

  it("recognizes the bounded JSON body parser as source-visible body limit evidence", () => {
    const routeSource = `
      const bodyLimitBytes = 64_000;
      await readBoundedJsonBody(request, { maxBytes: bodyLimitBytes, routeName: "admin/test" });
    `;

    expect(hasBodyLimitEvidence(routeSource)).toBe(true);
  });

  it("recognizes the canonical streaming multipart parser as source-visible body limit evidence", () => {
    const routeSource = `
      const bodyLimitBytes = 64_000;
      await readBoundedFormDataBody(request, { maxBytes: bodyLimitBytes, routeName: "admin/upload" });
    `;

    expect(hasBodyLimitEvidence(routeSource)).toBe(true);
  });

  it("does not treat bounded-parser error names without an enforcing parser call as body limit evidence", () => {
    const routeSource = `
      if (error instanceof BoundedJsonBodyError) {
        return NextResponse.json({ code: "payload_too_large" }, { status: 413 });
      }
    `;

    expect(hasBodyLimitEvidence(routeSource)).toBe(false);
  });

  it.each([
    ["JSON", "const payload = await request.json();"],
    ["form data", "const form = await request.formData();"],
    ["request stream", "const stream = request.body;"],
    ["bounded parser", "const payload = await readBoundedJsonBody(request, { maxBytes: 1024 });"],
    ["bounded form parser", "const form = await readBoundedFormDataBody(request, { maxBytes: 1024 });"],
  ])("detects %s request-body consumption", (_label, routeSource) => {
    expect(hasRequestBodyConsumptionEvidence(routeSource)).toBe(true);
  });

  it("does not require a body cap for a mutation handler that never consumes the request body", () => {
    const routeSource = `
      export async function POST(request: NextRequest) {
        await guardApiRequest(request, { auth: "user" });
        return NextResponse.json({ success: true });
      }
    `;

    expect(hasRequestBodyConsumptionEvidence(routeSource)).toBe(false);
  });

  it("recognizes only an enforcing request-guard cap, not a body-limit declaration by itself", () => {
    expect(hasBodyLimitEvidence("await guardApiRequest(request, { maxBodyBytes: BODY_LIMIT_BYTES });")).toBe(true);
    expect(hasBodyLimitEvidence("const bodyLimitBytes = 64_000;")).toBe(false);
    expect(hasBodyLimitEvidence("const unusedOptions = { maxBodyBytes: BODY_LIMIT_BYTES };")).toBe(false);
  });

  it("recognizes a custom content-length comparison that rejects an oversized request", () => {
    const routeSource = `
      const contentLength = Number(request.headers.get("content-length") || "0");
      if (contentLength > MAX_BODY_BYTES) {
        throw new RouteError("invalid_payload", "Submission is too large.");
      }
    `;

    expect(hasBodyLimitEvidence(routeSource)).toBe(true);
  });

  it("recognizes auth failures flowing through the canonical guard and typed shared handler", () => {
    const routeSource = `
      try {
        await guardApiRequest(request, { auth: "admin", requireTrustedOrigin: true });
      } catch (error) {
        return handleApiError(error, "Admin.Example.POST");
      }
    `;

    expect(hasExpectedFailureCodeEvidence(routeSource, "unauthorized")).toBe(true);
    expect(hasExpectedFailureCodeEvidence(routeSource, "forbidden")).toBe(true);
  });

  it("does not credit a generic handler without the canonical typed request guard", () => {
    const routeSource = `
      try {
        throw new Error("Forbidden");
      } catch (error) {
        return handleApiError(error, "Example.POST");
      }
    `;

    expect(hasExpectedFailureCodeEvidence(routeSource, "forbidden")).toBe(false);
  });

  it("recognizes the canonical admin domain error normalizer without crediting unrelated invalid codes", () => {
    const routeSource = `
      if (isKnownAdminDomainError(error)) {
        return buildAdminErrorResponse(mapKnownAdminDomainError(error)!);
      }
      return buildAdminInvalidRequestResponse("Invalid command");
    `;

    expect(hasExpectedFailureCodeEvidence(routeSource, "forbidden")).toBe(true);
    expect(hasExpectedFailureCodeEvidence(routeSource, "invalid_admin_request")).toBe(true);
    expect(hasExpectedFailureCodeEvidence(routeSource, "invalid_creator_request")).toBe(false);
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

  it("recognizes a sequential fixed-size chunk as bounded Promise.all fanout", () => {
    const source = `
      const chunkSize = 20;
      for (let index = 0; index < items.length; index += chunkSize) {
        const chunk = items.slice(index, index + chunkSize);
        await Promise.all(chunk.map(async (item) => work(item)));
      }
    `;

    expect(hasBoundedPromiseAllEvidence(source, source.indexOf("Promise.all"))).toBe(true);
  });

  it("does not credit a chunk whose size is controlled by an unbounded input", () => {
    const source = `
      const chunk = items.slice(index, index + requestedChunkSize);
      await Promise.all(chunk.map(async (item) => work(item)));
    `;

    expect(hasBoundedPromiseAllEvidence(source, source.indexOf("Promise.all"))).toBe(false);
  });

  it("recognizes a fixed contract constant in an Array.from worker cap", () => {
    const source = `
      await Promise.all(Array.from({
        length: Math.min(refs.length, USER_INDEX_MATERIALIZER_MAX_REQUESTS_PER_RUN),
      }, (_, index) => read(refs[index])));
    `;

    expect(hasBoundedPromiseAllEvidence(source, source.indexOf("Promise.all"))).toBe(true);
  });

  it("does not credit a caller-controlled Math.min worker cap", () => {
    const source = `
      await Promise.all(Array.from({
        length: Math.min(refs.length, requestedConcurrency),
      }, (_, index) => read(refs[index])));
    `;

    expect(hasBoundedPromiseAllEvidence(source, source.indexOf("Promise.all"))).toBe(false);
  });

  it("recognizes the current bounded creator-subscription chunk", () => {
    const source = readFileSync(join(process.cwd(), "src/app/api/cron/process-creator-subscriptions/route.ts"), "utf8");
    const promiseAllIndex = source.indexOf("Promise.all(chunk.map");

    expect(promiseAllIndex).toBeGreaterThan(-1);
    expect(hasBoundedPromiseAllEvidence(source, promiseAllIndex)).toBe(true);
  });

  it.each([
    ["creator ID", "src/app/api/creator/onboarding/id-submission/route.ts"],
    ["landing asset", "src/app/api/settings/landing/upload/route.ts"],
  ])("recognizes the complete %s Storage upload boundary", (_label, filePath) => {
    const source = readFileSync(join(process.cwd(), filePath), "utf8");

    expect(hasBoundedStorageUploadEvidence(source)).toBe(true);
  });

  it.each([
    ["canonical auth", 'auth: "user"', 'auth: "none"'],
    ["byte cap", "file.size > MAX_ID_UPLOAD_BYTES", "false"],
    ["type allowlist", "ALLOWED_ID_CONTENT_TYPES.has(file.type)", "true"],
    ["caller-scoped path", "scopeToCaller: true", "scopeToCaller: false"],
    ["cleanup", "ignoreNotFound: true", "ignoreNotFound: false"],
  ])("keeps a Storage upload without %s reportable", (_label, evidence, replacement) => {
    const source = readFileSync(
      join(process.cwd(), "src/app/api/creator/onboarding/id-submission/route.ts"),
      "utf8",
    ).replaceAll(evidence, replacement);

    expect(hasBoundedStorageUploadEvidence(source)).toBe(false);
  });

  it("does not mistake an arbitrary admin upload for the allowlisted public-asset lane", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/api/settings/landing/upload/route.ts"),
      "utf8",
    ).replace("isAllowedLandingAssetKey(key)", "true");

    expect(hasBoundedStorageUploadEvidence(source)).toBe(false);
  });

  it.each([
    [
      "inline document reference",
      'const existing = await adminDb.collection("analytics_event_facts").doc(eventId).get();',
    ],
    [
      "assigned document reference",
      `
        const ref = adminDb.collection("analytics_event_facts").doc(eventId);
        const existing = await ref.get();
      `,
    ],
    [
      "document reference with a template-literal id",
      "const existing = await adminDb.collection(\"creator_relationships\").doc(`${callerUid}__${creatorId}`).get();",
    ],
    [
      "document reference assigned earlier in a long handler",
      `
        const userRef = adminDb.collection("users").doc(userId);
        ${"const unrelatedValue = 1;\n".repeat(180)}
        const existing = await userRef.get();
      `,
    ],
  ])("excludes a %s from unbounded collection findings", (_label, source) => {
    expect(hasBoundedFirestoreGetEvidence(source, source.indexOf(".get()"))).toBe(true);
  });

  it.each([
    [
      "direct collection read",
      'const snapshot = await adminDb.collection("analytics_event_facts").get();',
    ],
    [
      "unbounded query reference despite its Ref suffix",
      `
        const unboundedQueryRef = adminDb.collection("analytics_event_facts").where("uid", "==", uid);
        const snapshot = await unboundedQueryRef.get();
      `,
    ],
  ])("keeps a %s reportable", (_label, source) => {
    expect(hasBoundedFirestoreGetEvidence(source, source.indexOf(".get()"))).toBe(false);
  });

  it("keeps both hardening scorers on the shared Firestore get classifier", () => {
    const hardeningSource = readFileSync(join(process.cwd(), "scripts/agent/score-codebase-hardening.ts"), "utf8");

    expect(hardeningSource).toContain('import { hasBoundedFirestoreGetEvidence } from "./score-speed-security-hardening";');
    expect(hardeningSource).toContain("!hasBoundedFirestoreGetEvidence(source, match.index ?? 0)");
    expect(hardeningSource).not.toContain("directDocumentRead");
  });

  it.each([
    ['trackEvent("media_upload_blocked_type", buildChatMediaUploadPayload(input))', "chat media lifecycle builder"],
    ['trackEvent("chat_message_sent", buildChatTelemetryPayload(input))', "canonical builder"],
    ['trackEvent("daily_task_completed", buildDailyTaskLifecycleEventPayload(input))', "imported canonical builder"],
  ])("recognizes source_component ownership through a %s", (call) => {
    expect(hasCanonicalTelemetrySourceComponentEvidence(call, call, 0)).toBe(true);
  });

  it("resolves source_component through a local payload variable", () => {
    const source = `
      const telemetryPayload = { source_component: "daily_tasks_module", task_id: task.id };
      trackEvent("daily_task_guidance_opened", telemetryPayload);
    `;
    const call = 'trackEvent("daily_task_guidance_opened", telemetryPayload)';
    expect(hasCanonicalTelemetrySourceComponentEvidence(source, call, source.indexOf(call))).toBe(true);
  });

  it("keeps a genuinely unowned telemetry payload reportable", () => {
    const call = 'trackEvent("checkout_clicked", { package_id: id })';
    expect(hasCanonicalTelemetrySourceComponentEvidence(call, call, 0)).toBe(false);
  });

  it("distinguishes the Lucide Coins icon from user-facing Coins copy", () => {
    expect(findProductFacingCoinsVocabularyIndex('import { Coins } from "lucide-react"; const icon = <Coins />;')).toBeUndefined();
    expect(findProductFacingCoinsVocabularyIndex('const label = "Coins available";')).toBeTypeOf("number");
    expect(findProductFacingCoinsVocabularyIndex('<span>Coins available</span>')).toBeTypeOf("number");
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
