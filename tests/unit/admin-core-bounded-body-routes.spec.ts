import fs from "node:fs";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  guardApiRequest: vi.fn(),
  handleApiError: vi.fn(),
  adminCollection: vi.fn(),
  adminBatch: vi.fn(),
  saveQueueConfig: vi.fn(),
  saveOffer: vi.fn(),
  savePackage: vi.fn(),
  savePromo: vi.fn(),
  reset() {
    this.guardApiRequest.mockReset();
    this.handleApiError.mockReset();
    this.adminCollection.mockReset();
    this.adminBatch.mockReset();
    this.saveQueueConfig.mockReset();
    this.saveOffer.mockReset();
    this.savePackage.mockReset();
    this.savePromo.mockReset();
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/request-guard", () => ({
  guardApiRequest: mockState.guardApiRequest,
}));
vi.mock("@/lib/server/auth", () => ({
  handleApiError: mockState.handleApiError,
}));
vi.mock("@/lib/server/rate-limit", () => ({
  ADMIN: {},
}));
vi.mock("@/lib/server/route-runtime-health", () => ({
  withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));
vi.mock("@/lib/server/firebase-admin", () => ({
  adminDb: {
    collection: mockState.adminCollection,
    batch: mockState.adminBatch,
  },
}));
vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    arrayUnion: (...values: string[]) => ({ __queueTransform: "union", values }),
    arrayRemove: (...values: string[]) => ({ __queueTransform: "remove", values }),
    delete: () => ({ __queueTransform: "delete", values: [] }),
  },
}));
vi.mock("@/lib/server/drop-queue", () => ({
  getResolvedQueueConfig: vi.fn(),
  saveResolvedQueueConfig: mockState.saveQueueConfig,
}));
vi.mock("@/lib/server/platform-economy", () => ({
  readPlatformEconomyOffers: vi.fn(),
  readPlatformEconomyPackages: vi.fn(),
  readPlatformEconomyPromos: vi.fn(),
}));
vi.mock("@/lib/server/platform-economy-mutations", () => {
  class PlatformEconomyMutationError extends Error {
    status: number;
    code: string;

    constructor(message: string, status = 400, code = "invalid_admin_request") {
      super(message);
      this.status = status;
      this.code = code;
    }
  }

  return {
    PlatformEconomyMutationError,
    savePlatformEconomyOffer: mockState.saveOffer,
    savePlatformEconomyPackage: mockState.savePackage,
    savePlatformEconomyPromo: mockState.savePromo,
  };
});
vi.mock("@/lib/server/drop-mutations", () => ({
  ADMIN_DROP_REVALIDATION_PATHS: [],
  invalidateDropSurfaces: vi.fn(),
  resolveCreatedDropTiming: vi.fn(),
  resolveUpdatedDropTiming: vi.fn(),
  shouldValidateDropPublishPayload: vi.fn(),
  validateDropPublishState: vi.fn(),
}));
vi.mock("@/lib/server/push-notifications", () => ({
  sendGlobalDropNotification: vi.fn(),
}));
vi.mock("@/lib/server/analytics", () => ({
  trackServerEvent: vi.fn(),
}));
vi.mock("@/lib/server/route-diagnostics", () => ({
  recordRouteWarning: vi.fn(),
}));

import { PUT as putQueue } from "@/app/api/admin/queue/route";
import { POST as postOffer } from "@/app/api/admin/economy/offers/route";
import { POST as postPackage } from "@/app/api/admin/economy/packages/route";
import { POST as postPromo } from "@/app/api/admin/economy/promos/route";
import { POST as postRepair } from "@/app/api/admin/orchestration/repairs/route";
import { POST as postDrop } from "@/app/api/admin/drops/route";

const routeBodyParserCounts = new Map<string, number>([
  ["src/app/api/admin/content/route.ts", 1],
  ["src/app/api/admin/creators/[userId]/action/route.ts", 1],
  ["src/app/api/admin/debug/assistant/fix/route.ts", 1],
  ["src/app/api/admin/debug/assistant/route.ts", 1],
  ["src/app/api/admin/drops/route.ts", 3],
  ["src/app/api/admin/economy/offers/route.ts", 2],
  ["src/app/api/admin/economy/packages/route.ts", 2],
  ["src/app/api/admin/economy/promos/route.ts", 2],
  ["src/app/api/admin/orchestration/repairs/route.ts", 1],
  ["src/app/api/admin/queue/route.ts", 1],
]);

const mutationHandlers = [
  ["queue", putQueue, "http://localhost/api/admin/queue", "PUT"],
  ["offer", postOffer, "http://localhost/api/admin/economy/offers", "POST"],
  ["package", postPackage, "http://localhost/api/admin/economy/packages", "POST"],
  ["promo", postPromo, "http://localhost/api/admin/economy/promos", "POST"],
  ["repair", postRepair, "http://localhost/api/admin/orchestration/repairs", "POST"],
  ["drop", postDrop, "http://localhost/api/admin/drops", "POST"],
] as const;

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function buildRequest(url: string, method: string, body: string) {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    body,
  });
}

function expectNoMutationStarted() {
  expect(mockState.adminCollection).not.toHaveBeenCalled();
  expect(mockState.saveQueueConfig).not.toHaveBeenCalled();
  expect(mockState.saveOffer).not.toHaveBeenCalled();
  expect(mockState.savePackage).not.toHaveBeenCalled();
  expect(mockState.savePromo).not.toHaveBeenCalled();
}

describe("bounded Admin Control Tower and economy JSON routes", () => {
  beforeEach(() => {
    mockState.reset();
    mockState.guardApiRequest.mockResolvedValue({
      uid: "admin_1",
      email: "admin@example.com",
      isAdmin: true,
    });
    mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 }));
    mockState.saveQueueConfig.mockImplementation(async (body: unknown) => body);
    mockState.saveOffer.mockResolvedValue({ offerId: "offer_1" });
    mockState.savePackage.mockResolvedValue({ packageId: "package_1" });
    mockState.savePromo.mockResolvedValue({ promoId: "promo_1" });
    mockState.adminCollection.mockImplementation(() => ({
      doc: () => ({
        get: async () => ({ exists: false, data: () => undefined }),
      }),
    }));
  });

  it("routes every assigned JSON consumer through the canonical byte-counted parser", () => {
    for (const [relativePath, expectedCount] of routeBodyParserCounts) {
      const source = readSource(relativePath);
      const parserCalls = source.match(/readBoundedJsonBody</gu) ?? [];

      expect(source, relativePath).not.toMatch(/request\.json\s*\(/u);
      expect(parserCalls, relativePath).toHaveLength(expectedCount);
      expect(source, relativePath).toContain("retryable: false");
      expect(source, relativePath).toContain("isBoundedJsonBodyError(error)");
    }

    const contentSource = readSource("src/app/api/admin/content/route.ts");
    expect(contentSource).toContain("MAX_ADMIN_DROP_ASSET_BYTES = 250 * 1024 * 1024");
    expect(contentSource).toContain("MAX_ADMIN_CONTENT_MULTIPART_OVERHEAD_BYTES = 64 * 1024");
    expect(contentSource).toContain("ADMIN_CONTENT_BODY_LIMIT_BYTES = MAX_ADMIN_DROP_ASSET_BYTES + MAX_ADMIN_CONTENT_MULTIPART_OVERHEAD_BYTES");
    expect(contentSource).toContain("maxBodyBytes: ADMIN_CONTENT_BODY_LIMIT_BYTES");
  });

  it.each(mutationHandlers)("rejects oversized %s JSON before any mutation owner runs", async (_name, handler, url, method) => {
    const response = await handler(buildRequest(
      url,
      method,
      JSON.stringify({ padding: "x".repeat(64_000) }),
    ));
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body.code ?? body.errorCode).toBe("payload_too_large");
    expect(body.retryable).toBe(false);
    expectNoMutationStarted();
  });

  it.each(mutationHandlers)("classifies malformed %s JSON without starting a mutation", async (_name, handler, url, method) => {
    const response = await handler(buildRequest(url, method, "{not-json"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code ?? body.errorCode).toBe("invalid_json");
    expect(body.retryable).toBe(false);
    expectNoMutationStarted();
  });

  it("preserves valid queue and economy mutations", async () => {
    const queueResponse = await putQueue(buildRequest(
      "http://localhost/api/admin/queue",
      "PUT",
      JSON.stringify({ queue: ["drop_1"], dropsPerDay: 1, cooldownDays: 7, timesPerDay: ["12:00"] }),
    ));
    const offerResponse = await postOffer(buildRequest(
      "http://localhost/api/admin/economy/offers",
      "POST",
      JSON.stringify({ offerId: "offer_1", title: "Offer" }),
    ));

    expect(queueResponse.status).toBe(200);
    expect(offerResponse.status).toBe(201);
    expect(mockState.saveQueueConfig).toHaveBeenCalledTimes(1);
    expect(mockState.saveOffer).toHaveBeenCalledTimes(1);
  });

  it("preserves existing domain validation after bounded parsing", async () => {
    const dropResponse = await postDrop(buildRequest(
      "http://localhost/api/admin/drops",
      "POST",
      "{}",
    ));
    const repairResponse = await postRepair(buildRequest(
      "http://localhost/api/admin/orchestration/repairs",
      "POST",
      JSON.stringify({ proposalId: "missing_proposal", action: "dismiss" }),
    ));

    expect(dropResponse.status).toBe(400);
    expect(await dropResponse.json()).toMatchObject({ error: "Missing drop data" });
    expect(repairResponse.status).toBe(404);
    expect(mockState.adminCollection).toHaveBeenCalledTimes(1);
  });
});


const actualQueueOwner = await vi.importActual<typeof import("@/lib/server/drop-queue")>("@/lib/server/drop-queue");

function configureQueueStore(config: Record<string, unknown> | null, legacyIds = ["legacy-drop"]) {
  const state = {
    config: structuredClone(config),
    drops: new Map<string, Record<string, unknown>>(legacyIds.map(id => [id, { rotationConfig: { enabled: true } }])),
    failWrite: null as string | null,
    failDocumentRead: false,
    failLegacyRead: false,
    legacyReadCount: 0,
    legacyReadLimits: [] as Array<number | undefined>,
  };
  type Transform = { __queueTransform: string; values: string[] };
  const apply = (collection: string, id: string, values: Record<string, unknown>) => {
    const current = structuredClone(collection === "adminSettings" ? state.config ?? {} : state.drops.get(id) ?? {});
    for (const [key, value] of Object.entries(values)) {
      const transform = value && typeof value === "object" ? value as Transform : null;
      if (transform?.__queueTransform === "delete") delete current[key];
      else if (transform?.__queueTransform === "union") current[key] = [...new Set([...(Array.isArray(current[key]) ? current[key] : []), ...transform.values])];
      else if (transform?.__queueTransform === "remove") current[key] = (Array.isArray(current[key]) ? current[key] : []).filter(item => !transform.values.includes(item));
      else current[key] = structuredClone(value);
    }
    if (collection === "adminSettings") state.config = current;
    else state.drops.set(id, current);
  };
  const legacyGet = async (limit?: number) => {
    state.legacyReadCount += 1;
    state.legacyReadLimits.push(limit);
    if (state.failLegacyRead) throw new Error("Controlled legacy read failed");
    return { docs: [...state.drops].filter(([, value]) => (value.rotationConfig as Record<string, unknown> | undefined)?.enabled === true).slice(0, limit).map(([id]) => ({ id })) };
  };
  mockState.adminCollection.mockImplementation((collection: string) => ({
    where: () => ({ get: () => legacyGet(), limit: (limit: number) => { expect(limit).toBe(1_000); return { get: () => legacyGet(limit) }; } }),
    doc: (id: string) => ({
      collection, id,
      get: async () => {
        if (state.failDocumentRead) throw new Error("Controlled document read failed");
        const data = collection === "adminSettings" ? state.config : state.drops.get(id);
        return { exists: data != null, data: () => structuredClone(data) };
      },
      set: async (values: Record<string, unknown>, options: { merge: boolean }) => {
        expect(options.merge).toBe(true);
        if (state.failWrite === `${collection}/${id}`) throw new Error("Controlled write failed");
        apply(collection, id, values);
      },
    }),
  }));
  mockState.adminBatch.mockImplementation(() => {
    const writes: Array<{ collection: string; id: string; values: Record<string, unknown> }> = [];
    return {
      set: (ref: { collection: string; id: string }, values: Record<string, unknown>, options: { merge: boolean }) => {
        expect(options.merge).toBe(true);
        writes.push({ ...ref, values: structuredClone(values) });
      },
      commit: async () => {
        if (writes.some(write => state.failWrite === `${write.collection}/${write.id}`)) throw new Error("Controlled atomic batch failed");
        for (const write of writes) apply(write.collection, write.id, write.values);
      },
    };
  });
  return { state, snapshot: () => JSON.stringify({ config: state.config, drops: [...state.drops] }) };
}

const fullQueueSettings = (queue: string[]) => ({ queue, dropsPerDay: 1, cooldownDays: 7, timesPerDay: ["12:00"] });

describe("saved Admin queue compatibility and persistence", () => {
  beforeEach(() => { mockState.reset(); });

  it.each([
    ["missing", null],
    ["partial", { cooldownDays: 3 }],
    ["unversioned complete", fullQueueSettings(["stored-drop"])],
  ] as const)("recovers unmigrated legacy members from a %s document", async (_label, config) => {
    const store = configureQueueStore(config);
    const result = await actualQueueOwner.getResolvedQueueConfig();
    expect(result.queue).toContain("legacy-drop");
    expect(result.queueAuthorityVersion).toBeUndefined();
    expect(store.state.legacyReadCount).toBe(1);
  });

  it("keeps legacy recovery after the first membership addition creates a partial document", async () => {
    const store = configureQueueStore(null, ["legacy-one", "legacy-two"]);
    await actualQueueOwner.setDropQueueMembership("new-drop", true);
    expect((await actualQueueOwner.getResolvedQueueConfig()).queue).toEqual(["new-drop", "legacy-one", "legacy-two"]);
    expect(store.state.config?.queueAuthorityVersion).toBeUndefined();
  });

  it("removes only the selected bootstrap member and preserves other legacy members", async () => {
    const store = configureQueueStore(null, ["legacy-one", "legacy-two"]);
    await actualQueueOwner.setDropQueueMembership("legacy-one", false);
    expect((await actualQueueOwner.getResolvedQueueConfig()).queue).toEqual(["legacy-two"]);
    expect(store.state.config?.queueAuthorityVersion).toBeUndefined();
  });

  it("retains an explicitly saved empty list after reloading without scanning old flags", async () => {
    const store = configureQueueStore(fullQueueSettings([]));
    const initial = await actualQueueOwner.getResolvedQueueConfig();
    expect(initial.queue).toEqual(["legacy-drop"]);
    const acknowledged = await actualQueueOwner.saveResolvedQueueConfig({ ...initial, queue: [] });
    store.state.legacyReadCount = 0;
    expect(await actualQueueOwner.getResolvedQueueConfig()).toEqual(acknowledged);
    expect(acknowledged.queue).toEqual([]);
    expect(store.state.config?.queueAuthorityVersion).toBe(1);
    expect(store.state.legacyReadCount).toBe(0);
    expect(store.state.drops.get("legacy-drop")?.rotationConfig).toEqual({ enabled: true });
  });

  it("preserves complete-save order, removal, addition and existing schedule normalization", async () => {
    configureQueueStore(fullQueueSettings(["old-drop"]), ["legacy-one", "legacy-two"]);
    const acknowledged = await actualQueueOwner.saveResolvedQueueConfig({ ...fullQueueSettings(["new-drop", "old-drop"]), dropsPerDay: 2, timesPerDay: ["18:00", "12:00"] });
    expect(await actualQueueOwner.getResolvedQueueConfig()).toEqual(acknowledged);
    expect(acknowledged.queue).toEqual(["new-drop", "old-drop"]);
    expect(acknowledged.timesPerDay).toEqual(["12:00", "18:00"]);
    await actualQueueOwner.setDropQueueMembership("intentional-addition", true);
    expect((await actualQueueOwner.getResolvedQueueConfig()).queue).toEqual(["new-drop", "old-drop", "intentional-addition"]);
    await actualQueueOwner.setDropQueueMembership("old-drop", false);
    expect((await actualQueueOwner.getResolvedQueueConfig()).queue).toEqual(["new-drop", "intentional-addition"]);
    expect((await actualQueueOwner.getResolvedQueueConfig()).queueAuthorityVersion).toBe(1);
  });

  it.each([
    ["unknown version", { ...fullQueueSettings([]), queueAuthorityVersion: 2 }],
    ["missing list", { dropsPerDay: 1, cooldownDays: 7, timesPerDay: ["12:00"], queueAuthorityVersion: 1 }],
    ["duplicate IDs", { ...fullQueueSettings(["duplicate", "duplicate"]), queueAuthorityVersion: 1 }],
    ["malformed schedule", { ...fullQueueSettings([]), timesPerDay: [], queueAuthorityVersion: 1 }],
  ])("rejects an authoritative record with %s instead of falling back to healthy legacy state", async (_label, config) => {
    const store = configureQueueStore(config as Record<string, unknown>);
    const before = store.snapshot();
    await expect(actualQueueOwner.getResolvedQueueConfig()).rejects.toThrow();
    expect(store.snapshot()).toBe(before);
    expect(store.state.legacyReadCount).toBe(0);
  });

  it("preserves canonical data after a failed save and recovers on the next valid save/read", async () => {
    const store = configureQueueStore(fullQueueSettings(["stored-drop"]));
    const before = store.snapshot();
    store.state.failWrite = "adminSettings/dropQueue";
    await expect(actualQueueOwner.saveResolvedQueueConfig(fullQueueSettings([]))).rejects.toThrow();
    expect(store.snapshot()).toBe(before);
    store.state.failWrite = null;
    await actualQueueOwner.saveResolvedQueueConfig(fullQueueSettings([]));
    expect((await actualQueueOwner.getResolvedQueueConfig()).queue).toEqual([]);
  });

  it.each(["document", "legacy"])("rejects a failed %s read without mutation and recovers on the next valid read", async source => {
    const store = configureQueueStore(fullQueueSettings(["stored-drop"]));
    const before = store.snapshot();
    if (source === "document") store.state.failDocumentRead = true;
    else store.state.failLegacyRead = true;
    await expect(actualQueueOwner.getResolvedQueueConfig()).rejects.toThrow();
    expect(store.snapshot()).toBe(before);
    store.state.failDocumentRead = false;
    store.state.failLegacyRead = false;
    expect((await actualQueueOwner.getResolvedQueueConfig()).queue).toEqual(["stored-drop", "legacy-drop"]);
  });

  it.each(["adminSettings/dropQueue", "drops/legacy-drop"])("keeps both documents unchanged when the selected membership write fails at %s", async failedWrite => {
    const store = configureQueueStore(fullQueueSettings(["stored-drop", "legacy-drop"]));
    const before = store.snapshot();
    store.state.failWrite = failedWrite;
    await expect(actualQueueOwner.setDropQueueMembership("legacy-drop", false)).rejects.toThrow();
    expect(store.snapshot()).toBe(before);
    store.state.failWrite = null;
    await actualQueueOwner.setDropQueueMembership("legacy-drop", false);
    expect((await actualQueueOwner.getResolvedQueueConfig()).queue).toEqual(["stored-drop"]);
    expect(store.state.drops.get("legacy-drop")?.rotationConfig).toBeUndefined();
  });

  it("recovers bootstrap members only within the existing declared legacy scan window", async () => {
    const legacyIds = Array.from({ length: 1_002 }, (_, index) => "legacy-" + index);
    const store = configureQueueStore(null, legacyIds);
    const result = await actualQueueOwner.getResolvedQueueConfig();
    expect(store.state.legacyReadLimits).toEqual([1_000]);
    expect(result.queue).toEqual(legacyIds.slice(0, 1_000));
    expect(store.state.drops.size).toBe(1_002);
    expect(store.state.config).toBeNull();
  });

});
