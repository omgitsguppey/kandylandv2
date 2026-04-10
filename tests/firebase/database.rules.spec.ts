import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, describe, it } from "vitest";

let testEnv: RulesTestEnvironment;

async function seedDatabase() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.database();

    await Promise.all([
      db.ref("chat_presence/creator-1/user-1/creator-1").set({
        typing: false,
        activeAt: 1710000000000,
        role: "creator",
        displayName: "Creator One",
      }),
      db.ref("chat_presence/creator-1/user-1/user-1").set({
        typing: true,
        activeAt: 1710000001000,
        role: "user",
        displayName: "User One",
      }),
    ]);
  });
}

beforeAll(async () => {
  if (!process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
    throw new Error("FIREBASE_DATABASE_EMULATOR_HOST is required. Run this suite via `npm run test:rules:database`.");
  }

  testEnv = await initializeTestEnvironment({
    projectId: "kandydrops-rules-test",
    database: {
      rules: readFileSync(resolve(process.cwd(), "database.rules.json"), "utf8"),
    },
  });

  await seedDatabase();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("database.rules.json", () => {
  it("allows thread participants to read chat presence", async () => {
    const creatorDb = testEnv.authenticatedContext("creator-1").database();
    const userDb = testEnv.authenticatedContext("user-1").database();

    await assertSucceeds(creatorDb.ref("chat_presence/creator-1/user-1/user-1").get());
    await assertSucceeds(userDb.ref("chat_presence/creator-1/user-1/creator-1").get());
  });

  it("blocks non-participants from reading chat presence", async () => {
    const outsiderDb = testEnv.authenticatedContext("outsider").database();

    await assertFails(outsiderDb.ref("chat_presence/creator-1/user-1/user-1").get());
  });

  it("allows participants to write only their own member presence", async () => {
    const creatorDb = testEnv.authenticatedContext("creator-1").database();
    const userDb = testEnv.authenticatedContext("user-1").database();

    await assertSucceeds(creatorDb.ref("chat_presence/creator-1/user-1/creator-1").set({
      typing: true,
      activeAt: 1710000002000,
      role: "creator",
      displayName: "Creator One",
    }));
    await assertSucceeds(userDb.ref("chat_presence/creator-1/user-1/user-1").set({
      typing: false,
      activeAt: 1710000003000,
      role: "user",
      displayName: "User One",
    }));
  });

  it("blocks participants from writing the other participant's presence", async () => {
    const creatorDb = testEnv.authenticatedContext("creator-1").database();

    await assertFails(creatorDb.ref("chat_presence/creator-1/user-1/user-1").set({
      typing: true,
      activeAt: 1710000004000,
      role: "creator",
      displayName: "Creator One",
    }));
  });

  it("rejects invalid presence payload shapes", async () => {
    const creatorDb = testEnv.authenticatedContext("creator-1").database();

    await assertFails(creatorDb.ref("chat_presence/creator-1/user-1/creator-1").set({
      activeAt: 1710000005000,
      role: "creator",
    }));
    await assertFails(creatorDb.ref("chat_presence/creator-1/user-1/creator-1").set({
      typing: "yes",
      activeAt: 1710000005000,
    }));
    await assertFails(creatorDb.ref("chat_presence/creator-1/user-1/creator-1").set({
      typing: true,
      activeAt: "later",
    }));
  });

  it("blocks writes to malformed or mismatched presence paths", async () => {
    const creatorDb = testEnv.authenticatedContext("creator-1").database();
    const userDb = testEnv.authenticatedContext("user-1").database();

    await assertFails(creatorDb.ref("chat_presence/creator-1/user-1/outsider").set({
      typing: true,
      activeAt: 1710000006000,
    }));
    await assertFails(userDb.ref("chat_presence/creator-1/other-user/user-1").set({
      typing: false,
      activeAt: 1710000007000,
    }));
  });
});
