import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const firestoreState = vi.hoisted(() => ({
  aggregateData: {} as Record<string, unknown>,
  walletDocs: [] as Array<{ id: string; data: () => Record<string, unknown> }>,
  commerceExists: false,
  commerceData: {} as Record<string, unknown>,
}));

vi.mock("firebase-admin/firestore", () => ({
  AggregateField: {
    sum: (field: string) => ({ field }),
  },
}));

vi.mock("@/lib/server/firebase-admin", () => ({
  adminDb: {
    collection: (name: string) => {
      if (name === "users") {
        return {
          aggregate: () => ({
            get: async () => ({
              data: () => firestoreState.aggregateData,
            }),
          }),
          orderBy: () => ({
            limit: () => ({
              get: async () => ({
                docs: firestoreState.walletDocs,
              }),
            }),
          }),
        };
      }

      if (name === "analytics_commerce_rollup") {
        return {
          doc: () => ({
            get: async () => ({
              exists: firestoreState.commerceExists,
              data: () => firestoreState.commerceData,
            }),
          }),
        };
      }

      return {
        limit: () => ({
          get: async () => ({
            empty: true,
            docs: [],
          }),
        }),
      };
    },
  },
}));

vi.mock("@/lib/server/admin-user-metrics-snapshot", () => ({
  readAdminUserMetricsSnapshot: async () => ({
    snapshot: {
      freshnessState: "live",
      totalRevenueUsd: 0,
    },
  }),
}));

describe("platform economy treasury summary", () => {
  beforeEach(() => {
    firestoreState.aggregateData = {
      totalBalance: 0,
      purchasedBalance: 0,
      rewardBalance: 0,
    };
    firestoreState.walletDocs = [];
    firestoreState.commerceExists = true;
    firestoreState.commerceData = {
      bonusGumDrops: 0,
      grossRevenueUsd: 0,
      deliveredGumDrops: 0,
    };
  });

  it("keeps missing aggregate fields unavailable instead of rendering them as zero", async () => {
    firestoreState.aggregateData = {};

    const { buildPlatformEconomyTreasurySummary } = await import("@/lib/server/platform-economy");
    const summary = await buildPlatformEconomyTreasurySummary();

    expect(summary.outstandingGd).toBeNull();
    expect(summary.paidGd).toBeNull();
    expect(summary.rewardFreeGd).toBeNull();
    expect(summary.freshnessState).toBe("review");
    expect(summary.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "treasury_source_missing",
          label: "Treasury balance source missing",
        }),
      ]),
    );
  });

  it("marks missing commerce rollup as source missing for paid bonus and floor evidence", async () => {
    firestoreState.commerceExists = false;

    const { buildPlatformEconomyTreasurySummary } = await import("@/lib/server/platform-economy");
    const summary = await buildPlatformEconomyTreasurySummary();

    expect(summary.paidBonusGd).toBeNull();
    expect(summary.paidSourceAvgUsdPer100Gd).toBeNull();
    expect(summary.floorState).toBe("unknown");
    expect(summary.freshnessState).toBe("review");
    expect(summary.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "treasury_source_missing",
          label: "Commerce rollup source missing",
        }),
      ]),
    );
  });

  it("labels legacy wallet rows whose source split is missing", async () => {
    firestoreState.aggregateData = {
      totalBalance: 100,
      purchasedBalance: 100,
      rewardBalance: 0,
    };
    firestoreState.walletDocs = [
      {
        id: "user_legacy",
        data: () => ({
          displayName: "Legacy Wallet",
          gumDropsBalance: 100,
        }),
      },
    ];

    const { buildPlatformEconomyTreasurySummary } = await import("@/lib/server/platform-economy");
    const summary = await buildPlatformEconomyTreasurySummary();

    expect(summary.walletRows[0]).toMatchObject({
      totalGd: 100,
      paidGd: 100,
      rewardFreeGd: 0,
    });
    expect(summary.walletRows[0]?.sourceWarnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "treasury_source_missing",
          label: "Wallet source split missing",
        }),
      ]),
    );
  });
});
