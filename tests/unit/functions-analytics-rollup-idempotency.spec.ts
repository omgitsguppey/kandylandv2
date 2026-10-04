import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createHash } from "node:crypto";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readSource(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("Functions analytics rollup idempotency", () => {
  it("guards transaction commerce rollup increments with a projection receipt", () => {
    const source = readSource("functions/src/analytics-transactions.ts");
    const receiptIndex = source.indexOf("analytics_projection_receipts");
    const receiptCreateIndex = source.indexOf("batch.create(projectionReceiptRef");
    const commitIndex = source.indexOf("await batch.commit()");
    const runtimeTouchIndex = source.indexOf("await touchAnalyticsRuntime(timestamp)");

    expect(receiptIndex).toBeGreaterThan(-1);
    expect(source).toContain("transactions:${event.id}:commerce_rollup");
    expect(source).toContain("Duplicate transaction rollup skipped");
    expect(source).toContain("isFirestoreAlreadyExists");
    expect(receiptCreateIndex).toBeGreaterThan(-1);
    expect(commitIndex).toBeGreaterThan(receiptCreateIndex);
    expect(runtimeTouchIndex).toBeGreaterThan(commitIndex);
  });
});


// Actual Functions modules run here with only the Firestore SDK and event
// registration seams doubled. The store enforces atomic create preconditions.
function orchestrationStore() {
  const rows = new Map<string, any>();
  const calls: Array<Record<string, any>> = [];
  let autoId = 0;
  let commitError: any = null;
  let queryError: any = null;
  const ref = (key: string): any => ({
    id: key.split("/").at(-1), path: key,
    get: async () => { calls.push({ type: "get", path: key }); return snapshot(key); },
  });
  const snapshot = (key: string): any => ({
    id: key.split("/").at(-1), ref: ref(key), exists: rows.has(key),
    data: () => structuredClone(rows.get(key)),
  });
  function collection(prefix: string, filters: any[] = []): any {
    return {
      doc: (id?: string) => ref(prefix + "/" + (id || "auto-" + ++autoId)),
      where: (field: string, operator: string, value: unknown) => collection(prefix, [...filters, { field, operator, value }]),
      get: async () => {
        calls.push({ type: "query", path: prefix });
        if (queryError) { const error = queryError; queryError = null; throw error; }
        const keys = [...rows.keys()].filter(key => key.startsWith(prefix + "/") && key.split("/").length === prefix.split("/").length + 1)
          .filter(key => filters.every(filter => filter.operator === "==" && rows.get(key)[filter.field] === filter.value));
        const docs = keys.map(snapshot);
        return { docs, size: docs.length, empty: docs.length === 0 };
      },
      add: async (data: unknown) => { const key = prefix + "/auto-" + ++autoId; rows.set(key, structuredClone(data)); return ref(key); },
    };
  }
  return {
    rows, calls, collection,
    failCommit: (code: number) => { commitError = Object.assign(new Error("commit_failed"), { code }); },
    failQuery: () => { queryError = Object.assign(new Error("query_failed"), { code: 14 }); },
    batch: () => {
      const writes: any[] = [];
      return {
        set: (target: any, data: any, options: any) => writes.push({ target, data, options, kind: "set" }),
        create: (target: any, data: any) => writes.push({ target, data, kind: "create" }),
        commit: async () => {
          calls.push({ type: "commit", writes: writes.map(write => ({ path: write.target.path, kind: write.kind })) });
          if (commitError) { const error = commitError; commitError = null; throw error; }
          if (writes.some(write => write.kind === "create" && rows.has(write.target.path))) throw Object.assign(new Error("ALREADY_EXISTS"), { code: 6 });
          const next = new Map([...rows].map(([key, data]) => [key, structuredClone(data)]));
          for (const write of writes) {
            const data = write.options?.merge ? next.get(write.target.path) || {} : {};
            for (const [field, value] of Object.entries<any>(write.data)) {
              if (value?.operation === "increment") data[field] = (data[field] || 0) + value.value;
              else if (value?.operation === "arrayUnion") data[field] = [...new Set([...(data[field] || []), ...value.values])];
              else data[field] = structuredClone(value);
            }
            next.set(write.target.path, data);
          }
          rows.clear(); next.forEach((data, key) => rows.set(key, data));
        },
      };
    },
  };
}

function actualOrchestrationFunctions(store: ReturnType<typeof orchestrationStore>) {
  const cache = new Map<string, any>();
  const fieldValue = {
    increment: (value: number) => ({ operation: "increment", value }),
    arrayUnion: (...values: unknown[]) => ({ operation: "arrayUnion", values }),
    serverTimestamp: () => ({ operation: "serverTimestamp" }),
  };
  function load(relativePath: string): any {
    const normalized = relativePath.split(path.sep).join("/");
    if (cache.has(normalized)) return cache.get(normalized).exports;
    const compiled = ts.transpileModule(readSource(normalized), { fileName: normalized, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    const module = { exports: {} as any }; cache.set(normalized, module);
    const requireDouble = (specifier: string): any => {
      if (specifier === "node:crypto") return { createHash };
      if (specifier === "firebase-admin/firestore") return { FieldValue: fieldValue };
      if (specifier === "firebase-functions/v2/firestore") return {
        onDocumentCreated: (_options: unknown, handler: any) => handler,
        onDocumentWritten: (_options: unknown, handler: any) => handler,
      };
      if (specifier === "./firebase-admin.js") return { db: store };
      if (specifier === "./firebase-runtime.js") return { REGION: "us-central1" };
      if (specifier.startsWith(".")) return load(path.posix.normalize(path.posix.join(path.posix.dirname(normalized), specifier.replace(/\.js$/, ".ts"))));
      throw new Error("Undeclared Functions SDK seam: " + specifier);
    };
    vm.runInNewContext(compiled.outputText, { module, exports: module.exports, require: requireDouble, Buffer, Date, Set, Map, console }, { filename: normalized });
    return module.exports;
  }
  return { engine: load("functions/src/orchestration-engine.ts"), runtime: load("functions/src/orchestration-runtime.ts") };
}

function orchestrationSourceEvent(input: { factId?: string; deliveryId?: string; path?: string } = {}) {
  const factId = input.factId || "fact-a";
  const sourcePath = input.path || "analytics_event_facts/" + factId;
  const data = { eventName: "notification_read", userId: "user-a", sessionId: "session-a", pagePath: "/dashboard", timestamp: 1000 };
  return { id: input.deliveryId || "delivery-a", params: { eventId: factId }, data: { id: factId, ref: { id: factId, path: sourcePath }, data: () => data } };
}

describe("Functions immutable event-fact orchestration recovery", () => {
  function fixture() {
    const store = orchestrationStore(); store.rows.set("users/user-a", { role: "user" });
    const functions = actualOrchestrationFunctions(store);
    return { store, ...functions, invoke: functions.engine.onAnalyticsEventFactOrchestrated };
  }
  const events = (store: ReturnType<typeof orchestrationStore>) => [...store.rows.entries()].filter(([key]) => key.startsWith("orchestration_events/"));
  const count = (store: ReturnType<typeof orchestrationStore>) => store.rows.get("orchestration_actor_summaries/user:user-a")?.eventCount;

  it("commits one event and one actor/session increment on repeated delivery", async () => {
    const { store, invoke } = fixture();
    await invoke(orchestrationSourceEvent()); await invoke(orchestrationSourceEvent());
    expect(events(store)).toHaveLength(1); expect(count(store)).toBe(1);
    expect([...store.rows.entries()].filter(([key]) => key.startsWith("orchestration_session_ownership/"))[0][1].eventCount).toBe(1);
  });
  it("preserves the persisted barrier after reopening with a fresh Functions module instance", async () => {
    const { store, invoke } = fixture(); await invoke(orchestrationSourceEvent());
    const reopened = orchestrationStore();
    store.rows.forEach((record, key) => reopened.rows.set(key, structuredClone(record)));
    const fresh = actualOrchestrationFunctions(reopened);
    await fresh.engine.onAnalyticsEventFactOrchestrated(orchestrationSourceEvent({ deliveryId: "redelivered-after-reopen" }));
    expect(events(reopened)).toHaveLength(1); expect(count(reopened)).toBe(1);
  });
  it("uses the immutable source fact even if duplicate transport delivery IDs differ", async () => {
    const { store, invoke } = fixture();
    await invoke(orchestrationSourceEvent()); await invoke(orchestrationSourceEvent({ deliveryId: "duplicate-other-delivery" }));
    expect(events(store)).toHaveLength(1); expect(count(store)).toBe(1);
  });
  it("enforces the atomic guard under concurrent delivery", async () => {
    const { store, invoke } = fixture();
    await Promise.all([invoke(orchestrationSourceEvent()), invoke(orchestrationSourceEvent())]);
    expect(events(store)).toHaveLength(1); expect(count(store)).toBe(1);
  });
  it("keeps distinct immutable source facts separate", async () => {
    const { store, invoke } = fixture();
    await invoke(orchestrationSourceEvent()); await invoke(orchestrationSourceEvent({ factId: "fact-b", deliveryId: "delivery-b" }));
    expect(events(store)).toHaveLength(2); expect(count(store)).toBe(2);
  });
  it("does not collapse different paths sharing a long prefix", async () => {
    const { store, invoke } = fixture(); const prefix = "analytics_event_facts/" + "x".repeat(200);
    await invoke(orchestrationSourceEvent({ path: prefix + "a" })); await invoke(orchestrationSourceEvent({ path: prefix + "b" }));
    expect(events(store)).toHaveLength(2); expect(count(store)).toBe(2);
  });
  it("retains no partial increments on transient commit failure and permits fresh recovery", async () => {
    const { store, invoke } = fixture(); store.failCommit(14);
    await expect(invoke(orchestrationSourceEvent())).rejects.toThrow("commit_failed"); expect(events(store)).toHaveLength(0);
    await invoke(orchestrationSourceEvent()); expect(events(store)).toHaveLength(1); expect(count(store)).toBe(1);
  });
  it("finishes failed post-commit reconciliation without replaying increments", async () => {
    const { store, invoke } = fixture(); store.failQuery();
    await expect(invoke(orchestrationSourceEvent())).rejects.toThrow("query_failed");
    expect(events(store)).toHaveLength(1); await invoke(orchestrationSourceEvent());
    expect(events(store)).toHaveLength(1); expect(count(store)).toBe(1); expect(store.calls.filter(call => call.type === "query")).toHaveLength(4);
  });
  it("uses persisted finding context on redelivery rather than replacing it after role drift", async () => {
    const { store, invoke } = fixture(); await invoke(orchestrationSourceEvent());
    const first = structuredClone(events(store)[0][1]); const writesBefore = [...store.rows.entries()].filter(([key]) => key.startsWith("orchestration_findings/")).length;
    store.rows.set("users/user-a", { role: "admin" }); await invoke(orchestrationSourceEvent());
    expect(events(store)).toHaveLength(1); expect(events(store)[0][1]).toEqual(first);
    expect([...store.rows.entries()].filter(([key]) => key.startsWith("orchestration_findings/")).length).toBe(writesBefore);
  });
  it("fails closed when an existing barrier lacks its committed recovery context", async () => {
    const { store, invoke } = fixture(); await invoke(orchestrationSourceEvent());
    const [key, record] = events(store)[0]; store.rows.set(key, { ...record, activeFindingKeys: null });
    await expect(invoke(orchestrationSourceEvent())).rejects.toThrow("orchestration_recovery_context_missing"); expect(count(store)).toBe(1);
  });
  it("does not swallow permission failures as duplicate events", async () => {
    const { store, invoke } = fixture(); store.failCommit(7);
    await expect(invoke(orchestrationSourceEvent())).rejects.toThrow("commit_failed"); expect(events(store)).toHaveLength(0);
  });
  it("retains explicit manual-repair observations as separate diagnostic work", async () => {
    const { store, runtime } = fixture();
    const event = orchestrationSourceEvent(); const input = { sourceCollection: "analytics_event_facts", sourceDocumentId: event.data.id, sourceDocumentPath: event.data.ref.path, sourceData: event.data.data(), sourceMutation: "repair" };
    await runtime.orchestrateSourceMutation(input); await runtime.orchestrateSourceMutation(input);
    expect(events(store)).toHaveLength(2); expect(count(store)).toBe(2);
  });
  it("retains sibling mutable-source updates as separate diagnostic observations", async () => {
    const { store, runtime } = fixture();
    const input = { sourceCollection: "notifications", sourceDocumentId: "notification-a", sourceDocumentPath: "notifications/notification-a", sourceMutation: "update", sourceData: { userId: "user-a", sessionId: "session-a", pagePath: "/dashboard", type: "drop" } };
    await runtime.orchestrateSourceMutation(input); await runtime.orchestrateSourceMutation(input);
    expect(events(store)).toHaveLength(2); expect(count(store)).toBe(2);
  });
  it("skips a missing source snapshot without database work", async () => {
    const { store, invoke } = fixture(); await invoke({ id: "missing", params: {}, data: undefined });
    expect(store.calls).toHaveLength(0); expect(events(store)).toHaveLength(0);
  });
});
