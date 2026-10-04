import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routeState = vi.hoisted(() => ({
  records: new Map<string, Record<string, unknown>>(),
  reads: [] as Array<{ collection: string; limit: number; field?: string; value?: string }>,
  deletes: [] as string[],
  caller: { uid: "retention-user" } as { uid: string } | null,
  failedRead: "",
  failedWrite: "",
  omitWriteErrorCallback: false,
  updateUser: vi.fn(),
  revokeRefreshTokens: vi.fn(),
  deleteUser: vi.fn(),
  releaseUsername: vi.fn(),
  warning: vi.fn(),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldPath: { documentId: () => "__name__" },
  FieldValue: { serverTimestamp: () => "server-time" },
}));
vi.mock("@/lib/server/request-guard", () => ({ guardApiRequest: async () => routeState.caller }));
vi.mock("@/lib/server/auth", () => ({
  handleApiError: () => NextResponse.json({ success: false, error: "Source unavailable" }, { status: 500 }),
}));
vi.mock("@/lib/server/rate-limit", () => ({ STRICT: {} }));
vi.mock("@/lib/server/route-runtime-health", () => ({ withRouteRuntimeHealth: (_key: string, handler: unknown) => handler }));
vi.mock("@/lib/server/route-diagnostics", () => ({ recordRouteWarning: (...args: unknown[]) => routeState.warning(...args) }));
vi.mock("@/lib/server/username-suggestions", () => ({ releaseUsernameReservationForUser: (...args: unknown[]) => routeState.releaseUsername(...args) }));

function reference(path: string) {
  return {
    path,
    id: path.split("/").at(-1)!,
    get: async () => ({ exists: routeState.records.has(path), data: () => routeState.records.get(path) }),
    listCollections: async () => {
      const names = new Set<string>();
      for (const key of routeState.records.keys()) {
        if (key.startsWith(path + "/")) names.add(key.slice(0, key.lastIndexOf("/")));
      }
      return [...names].map((name) => query(name));
    },
  };
}

function query(collection: string, field?: string, value?: string, max = Infinity, after = "") {
  return {
    doc: (id: string) => reference(`${collection}/${id}`),
    where: (nextField: string, _operator: string, nextValue: string) => query(collection, nextField, nextValue, max, after),
    orderBy: () => query(collection, field, value, max, after),
    limit: (nextMax: number) => query(collection, field, value, nextMax, after),
    startAfter: (doc: { id: string }) => query(collection, field, value, max, doc.id),
    get: async () => {
      routeState.reads.push({ collection, field, value, limit: max });
      if (routeState.failedRead === collection) throw new Error("Read denied");
      const docs = [...routeState.records.entries()]
        .filter(([path, data]) => path.slice(0, path.lastIndexOf("/")) === collection
          && path.split("/").at(-1)! > after && (!field || data[field] === value))
        .sort(([one], [two]) => one.localeCompare(two)).slice(0, max)
        .map(([path, data]) => ({ id: path.split("/").at(-1)!, ref: reference(path), data: () => data }));
      return { empty: docs.length === 0, size: docs.length, docs };
    },
  };
}

vi.mock("@/lib/server/firebase-admin", () => ({
  adminAuth: {
    updateUser: (...args: unknown[]) => routeState.updateUser(...args),
    revokeRefreshTokens: (...args: unknown[]) => routeState.revokeRefreshTokens(...args),
    deleteUser: (...args: unknown[]) => routeState.deleteUser(...args),
  },
  adminDb: {
    collection: (name: string) => query(name),
    bulkWriter: () => {
      let onError: ((error: unknown) => boolean) | undefined;
      return {
        onWriteError: (callback: (error: unknown) => boolean) => { onError = callback; },
        delete: (ref: { path: string }) => {
          routeState.deletes.push(ref.path);
          if (ref.path === routeState.failedWrite) {
            const error = Object.assign(new Error("Write denied"), { code: 7, failedAttempts: 3 });
            if (!routeState.omitWriteErrorCallback) onError?.(error);
            const operation = Promise.reject(error);
            // Observe the mock promise so the baseline exposes false success without an unrelated unhandled-rejection failure.
            void operation.catch(() => undefined);
            return operation;
          }
          routeState.records.delete(ref.path);
          return Promise.resolve({});
        },
        // The SDK's close promise never rejects, including after a terminal individual write failure.
        close: async () => { await Promise.resolve(); },
      };
    },
  },
}));

import {
  DELETE_ACCOUNT_RETENTION_STAGES,
  DELETE_ACCOUNT_RETENTION_TARGETS,
  validateDeleteAccountRetentionPolicy,
} from "@/lib/privacy-data/delete-account-retention-policy";
import { DELETE } from "@/app/api/user/delete/route";

describe("delete account retention policy", () => {
  it("defines every delete stage and keeps ledger/security retention explicit", () => {
    expect(validateDeleteAccountRetentionPolicy()).toEqual([]);
    expect(DELETE_ACCOUNT_RETENTION_STAGES).toEqual(
      expect.arrayContaining(["requested", "verified", "data_delete_queue", "retain_ledger_required", "retain_security_required", "completed"]),
    );
    expect(DELETE_ACCOUNT_RETENTION_TARGETS.some((target) => target.deleteEligibility === "retain_ledger")).toBe(true);
    expect(DELETE_ACCOUNT_RETENTION_TARGETS.some((target) => target.deleteEligibility === "retain_security")).toBe(true);
  });

  it("removes push tokens, anonymizes behavioral data, and redacts admin debug references", () => {
    const notification = DELETE_ACCOUNT_RETENTION_TARGETS.find((target) => target.targetKey === "notification_push_tokens");
    const behavioral = DELETE_ACCOUNT_RETENTION_TARGETS.find((target) => target.targetKey === "behavioral_journey_records");
    const debug = DELETE_ACCOUNT_RETENTION_TARGETS.find((target) => target.targetKey === "admin_debug_references");

    expect(notification?.deleteAction).toContain("revoke");
    expect(behavioral?.deleteEligibility).toBe("anonymize");
    expect(debug?.deleteAction).toContain("redact");
  });
});

describe("actual account deletion retention and settlement boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeState.records.clear();
    routeState.reads.length = 0;
    routeState.deletes.length = 0;
    routeState.failedRead = "";
    routeState.failedWrite = "";
    routeState.omitWriteErrorCallback = false;
    routeState.caller = { uid: "retention-user" };
    routeState.records.set("users/retention-user", { username: "retentionfixture" });
    routeState.records.set("users/retention-user/preferences/theme", { theme: "dark" });
  });

  const protectedCases = [
    ["transactions", "userId"],
    ["paymentLocks", "userId"],
    ["security_events", "userId"],
    ["creator_ledger_accruals", "userId"],
    ["creator_ledger_accruals", "creatorId"],
    ["creator_payout_requests", "creatorId"],
  ] as const;

  it.each(protectedCases)("defers %s.%s before any account or data mutation", async (collection, field) => {
    const retained = { [field]: "retention-user", amount: 725, status: "pending", privateFixture: "keep-exact-until-review" };
    routeState.records.set(`${collection}/retained-fixture`, retained);
    const response = await DELETE(new NextRequest("http://localhost/api/user/delete", { method: "DELETE" }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ success: false, code: "account_deletion_retention_review_required", retryable: false, accountActive: true });
    expect(routeState.records.get(`${collection}/retained-fixture`)).toEqual(retained);
    expect(routeState.records.get("users/retention-user/preferences/theme")).toEqual({ theme: "dark" });
    expect(routeState.deletes).toEqual([]);
    expect(routeState.updateUser).not.toHaveBeenCalled();
    expect(routeState.revokeRefreshTokens).not.toHaveBeenCalled();
    expect(routeState.deleteUser).not.toHaveBeenCalled();
    expect(routeState.releaseUsername).not.toHaveBeenCalled();
    expect(routeState.reads.filter((read) => read.collection === collection).every((read) => read.limit === 1)).toBe(true);
  });

  it("denies an unauthenticated deletion without reading or mutating data", async () => {
    routeState.caller = null;
    expect((await DELETE(new NextRequest("http://localhost/api/user/delete", { method: "DELETE" }))).status).toBe(401);
    expect(routeState.reads).toEqual([]);
    expect(routeState.deletes).toEqual([]);
    expect(routeState.updateUser).not.toHaveBeenCalled();
  });

  it("does not turn an unreadable retention source into verified absence", async () => {
    routeState.failedRead = "transactions";
    expect((await DELETE(new NextRequest("http://localhost/api/user/delete", { method: "DELETE" }))).status).toBe(500);
    expect(routeState.deletes).toEqual([]);
    expect(routeState.updateUser).not.toHaveBeenCalled();
  });

  it("completes acknowledged private cleanup when retention sources are verified empty", async () => {
    const response = await DELETE(new NextRequest("http://localhost/api/user/delete", { method: "DELETE" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, deleted: { authUserDeleted: true, userDocumentTree: 2 } });
    expect(routeState.records.has("users/retention-user")).toBe(false);
    expect(routeState.records.has("users/retention-user/preferences/theme")).toBe(false);
    expect(routeState.deleteUser).toHaveBeenCalledExactlyOnceWith("retention-user");
  });

  it("preserves final Auth and username settlement after a terminal individual write failure", async () => {
    routeState.failedWrite = "users/retention-user/preferences/theme";
    const response = await DELETE(new NextRequest("http://localhost/api/user/delete", { method: "DELETE" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ success: false, code: "account_deletion_cleanup_pending", deleted: { authUserDeleted: false } });
    expect(routeState.records.has(routeState.failedWrite)).toBe(true);
    expect(routeState.deleteUser).not.toHaveBeenCalled();
    expect(routeState.releaseUsername).not.toHaveBeenCalled();
    expect(routeState.warning).toHaveBeenCalled();
  });

  it("observes a rejected individual operation even without the SDK retry callback", async () => {
    routeState.failedWrite = "users/retention-user/preferences/theme";
    routeState.omitWriteErrorCallback = true;
    const response = await DELETE(new NextRequest("http://localhost/api/user/delete", { method: "DELETE" }));
    expect(response.status).toBe(503);
    expect(routeState.deleteUser).not.toHaveBeenCalled();
    expect(routeState.releaseUsername).not.toHaveBeenCalled();
  });

  it("settles every cleanup source before reporting partial cleanup after a failed read", async () => {
    routeState.failedRead = "analytics_event_facts";
    const response = await DELETE(new NextRequest("http://localhost/api/user/delete", { method: "DELETE" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ success: false, code: "account_deletion_cleanup_pending" });
    expect(routeState.deleteUser).not.toHaveBeenCalled();
    expect(routeState.releaseUsername).not.toHaveBeenCalled();
  });

  it.each(["transactions", "creator_ledger_accruals"])("retains an in-flight %s write that appears after preflight", async (collection) => {
    const record = { userId: "retention-user", creatorId: "other-creator", amount: 725, status: "pending" };
    routeState.updateUser.mockImplementationOnce(async () => { routeState.records.set(`${collection}/late-fixture`, record); });
    const response = await DELETE(new NextRequest("http://localhost/api/user/delete", { method: "DELETE" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ success: false, code: "account_deletion_retention_reconciliation_pending", accountActive: false });
    expect(routeState.records.get(`${collection}/late-fixture`)).toEqual(record);
    expect(routeState.deletes).not.toContain(`${collection}/late-fixture`);
    expect(routeState.deleteUser).not.toHaveBeenCalled();
    expect(routeState.releaseUsername).not.toHaveBeenCalled();
  });
});
