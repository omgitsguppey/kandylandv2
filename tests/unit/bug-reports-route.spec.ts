import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/bug-reports/route";

type FirestoreDoc = Record<string, unknown>;

const store = new Map<string, FirestoreDoc>();
const guardApiRequest = vi.fn();

vi.mock("@/lib/server/request-guard", () => ({
  guardApiRequest: (...args: unknown[]) => guardApiRequest(...args),
}));

vi.mock("@/lib/server/rate-limit", () => ({
  STANDARD: { windowMs: 60_000, max: 60 },
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => ({ __serverTimestamp: true }),
  },
}));

vi.mock("@/lib/server/firebase-admin", () => ({
  adminDb: {
    collection: (name: string) => buildCollection(name),
    runTransaction: async (callback: (tx: MockTransaction) => Promise<unknown>) => callback(new MockTransaction()),
  },
}));

class MockTransaction {
  async get(ref: MockDocRef) {
    return ref.get();
  }

  set(ref: MockDocRef, data: FirestoreDoc) {
    store.set(ref.path, { ...data, id: ref.id });
  }

  update(ref: MockDocRef, data: FirestoreDoc) {
    store.set(ref.path, { ...(store.get(ref.path) ?? {}), ...data });
  }
}

class MockDocRef {
  constructor(public collectionName: string, public id: string) {}

  get path() {
    return `${this.collectionName}/${this.id}`;
  }

  async get() {
    const data = store.get(this.path);
    return {
      exists: Boolean(data),
      id: this.id,
      data: () => data,
    };
  }
}

class MockQuery {
  private filters: Array<[string, string, unknown]> = [];
  private maxDocs = Number.POSITIVE_INFINITY;

  constructor(private collectionName: string) {}

  where(field: string, op: string, value: unknown) {
    this.filters.push([field, op, value]);
    return this;
  }

  limit(value: number) {
    this.maxDocs = value;
    return this;
  }

  async get() {
    const docs = [...store.entries()]
      .filter(([path]) => path.startsWith(`${this.collectionName}/`))
      .map(([path, data]) => ({ id: path.split("/")[1], data }))
      .filter(({ data }) => this.filters.every(([field, op, value]) => {
        const actual = data[field];
        if (op === "==") return actual === value;
        if (op === ">=") return typeof actual === "number" && typeof value === "number" && actual >= value;
        return false;
      }))
      .slice(0, this.maxDocs)
      .map(({ id, data }) => ({ id, data: () => data }));

    return {
      empty: docs.length === 0,
      size: docs.length,
      docs,
    };
  }
}

function buildCollection(name: string) {
  return {
    doc: (id?: string) => new MockDocRef(name, id ?? `${name}_${store.size + 1}`),
    where: (field: string, op: string, value: unknown) => new MockQuery(name).where(field, op, value),
  };
}

function request(body: unknown) {
  return new NextRequest("http://localhost/api/bug-reports", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
    },
    body: JSON.stringify(body),
  });
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("/api/bug-reports", () => {
  beforeEach(() => {
    store.clear();
    vi.useRealTimers();
    guardApiRequest.mockReset();
    guardApiRequest.mockResolvedValue({ uid: "user_1", email: "user@example.com" });
    store.set("users/user_1", {
      gumDropsBalance: 20,
      gumDropsPurchasedBalance: 5,
      gumDropsRewardBalance: 15,
    });
  });

  it("requires auth", async () => {
    guardApiRequest.mockResolvedValue(null);

    const response = await POST(request({ errorKey: "internal_server_error", surface: "runtime" }));
    const json = await readJson(response);

    expect(response.status).toBe(401);
    expect(json.errorKey).toBe("auth_required");
  });

  it("grants 10 reward GumDrops for an eligible platform bug", async () => {
    const response = await POST(request({
      errorKey: "internal_server_error",
      surface: "runtime",
      route: "/drops",
      previousRoute: "/",
      context: { token: "raw", component: "DropCard" },
    }));
    const json = await readJson(response);
    const user = store.get("users/user_1");
    const transaction = [...store.entries()].find(([path]) => path.startsWith("transactions/"))?.[1];
    const report = [...store.entries()].find(([path]) => path.startsWith("bug_reports/"))?.[1];

    expect(response.status).toBe(200);
    expect(json.status).toBe("rewarded");
    expect(json.rewardGranted).toBe(true);
    expect(json.rewardGd).toBe(10);
    expect(user?.gumDropsBalance).toBe(30);
    expect(user?.gumDropsRewardBalance).toBe(25);
    expect(user?.gumDropsPurchasedBalance).toBe(5);
    expect(transaction).toMatchObject({
      rewardSource: "bug_report",
      sourceTruth: "bug_report_reward",
      bugReportId: expect.any(String),
      rewardCreditGumDrops: 10,
      purchasedCreditGumDrops: 0,
    });
    expect(report?.sanitizedContext).not.toHaveProperty("token");
  });

  it("does not reward a duplicate report inside the duplicate window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00.000Z"));

    await POST(request({ errorKey: "internal_server_error", surface: "runtime", route: "/drops", previousRoute: "/" }));
    const duplicate = await POST(request({ errorKey: "internal_server_error", surface: "runtime", route: "/drops", previousRoute: "/" }));
    const json = await readJson(duplicate);
    const user = store.get("users/user_1");

    expect(json.status).toBe("duplicate");
    expect(json.rewardGranted).toBe(false);
    expect(user?.gumDropsRewardBalance).toBe(25);
  });

  it("enforces the daily reward cap", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00.000Z"));
    for (let index = 0; index < 3; index += 1) {
      store.set(`bug_reports/old_${index}`, {
        userId: "user_1",
        status: "rewarded",
        createdAt: Date.now() - index * 60_000,
      });
    }

    const response = await POST(request({ errorKey: "internal_server_error", surface: "runtime", route: "/new" }));
    const json = await readJson(response);
    const user = store.get("users/user_1");

    expect(json.status).toBe("reward_cap_reached");
    expect(json.rewardGranted).toBe(false);
    expect(user?.gumDropsRewardBalance).toBe(15);
  });

  it("records non-reward-eligible bugs without crediting reward balance", async () => {
    const response = await POST(request({ errorKey: "validation_failed", surface: "runtime", route: "/drops" }));
    const json = await readJson(response);
    const user = store.get("users/user_1");

    expect(json.status).toBe("not_reward_eligible");
    expect(json.rewardGranted).toBe(false);
    expect(user?.gumDropsRewardBalance).toBe(15);
  });

  it("returns only safe internal redirects", async () => {
    const safe = await POST(request({
      errorKey: "internal_server_error",
      surface: "runtime",
      route: "/drops",
      previousRoute: "/dashboard",
    }));
    const unsafe = await POST(request({
      errorKey: "service_unavailable",
      surface: "runtime",
      route: "https://evil.example",
      previousRoute: "//evil.example",
    }));

    expect((await readJson(safe)).redirectTo).toBe("/dashboard");
    expect((await readJson(unsafe)).redirectTo).toBe("/");
  });
});
