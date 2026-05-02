import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const fixturePath = join(process.cwd(), "tests/fixtures/launch-demo-fixtures.json");

function readFixtures() {
  return JSON.parse(readFileSync(fixturePath, "utf8")) as {
    writesLiveDataByDefault: boolean;
    productionWritesAllowed: boolean;
    credentialPolicy: Record<string, unknown>;
    personas: Array<Record<string, unknown>>;
    drops: Array<Record<string, unknown>>;
    notifications: Array<Record<string, unknown>>;
    chatThreads: Array<Record<string, unknown>>;
    transactions: Array<Record<string, unknown>>;
    criticalPaths: Array<Record<string, unknown>>;
  };
}

describe("launch demo fixture contract", () => {
  const requiredPersonas = [
    "guest_visitor",
    "new_user",
    "user_zero_gd",
    "user_gd_balance",
    "user_unlocked_drop",
    "user_failed_purchase",
    "creator_profile_public_drops",
    "admin",
    "user_notification_read_unread",
    "user_chat_thread",
  ];

  const requiredDropStates = [
    "expired",
    "queued",
    "live_ending_soon",
    "archived",
    "live_missing_cover",
    "live_locked_assets",
  ];

  it("documents every required launch persona without enabling live writes", () => {
    const fixtures = readFixtures();
    const personaIds = new Set(fixtures.personas.map((persona) => persona.id));

    expect(fixtures.writesLiveDataByDefault).toBe(false);
    expect(fixtures.productionWritesAllowed).toBe(false);
    expect(fixtures.credentialPolicy.committedCredentials).toBe(false);
    expect(fixtures.credentialPolicy.authPasswordsCommitted).toBe(false);
    expect([...personaIds].sort()).toEqual([...requiredPersonas].sort());
  });

  it("covers Drop lifecycle, media fallback, entitlement, notifications, chat, and money splits", () => {
    const fixtures = readFixtures();
    const dropStates = new Set(fixtures.drops.map((drop) => drop.state));

    for (const state of requiredDropStates) {
      expect(dropStates.has(state)).toBe(true);
    }

    expect(fixtures.drops.some((drop) => drop.id === "fixture_drop_missing_cover" && drop.imageUrl === null)).toBe(true);
    expect(fixtures.drops.some((drop) => drop.id === "fixture_drop_locked_assets" && drop.contentAccess === "requiresEntitlement")).toBe(true);
    expect(fixtures.notifications.some((notification) => notification.read === false)).toBe(true);
    expect(fixtures.notifications.some((notification) => notification.read === true)).toBe(true);
    expect(fixtures.chatThreads.some((thread) => Array.isArray(thread.participantIds) && thread.participantIds.includes("fixture_user_chat"))).toBe(true);
    expect(fixtures.transactions.some((transaction) => Number(transaction.paidGumDrops) > 0 && Number(transaction.bonusGumDrops) > 0)).toBe(true);
    expect(fixtures.transactions.some((transaction) => Number(transaction.adminGumDrops) > 0)).toBe(true);
    expect(fixtures.criticalPaths.length).toBeGreaterThanOrEqual(6);
  });
});
