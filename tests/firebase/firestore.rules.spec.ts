import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, query, setDoc } from "firebase/firestore";
import { afterAll, beforeAll, describe, it } from "vitest";

let testEnv: RulesTestEnvironment;

async function seedFirestore() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await Promise.all([
      setDoc(doc(db, "drops/test-drop"), { title: "Test Drop" }),
      setDoc(doc(db, "users/alice"), { displayName: "Alice" }),
      setDoc(doc(db, "users/bob"), { displayName: "Bob" }),
      setDoc(doc(db, "users/admin"), { displayName: "Admin", role: "admin" }),
      setDoc(doc(db, "transactions/tx-alice"), { userId: "alice", amount: 10 }),
      setDoc(doc(db, "transactions/tx-bob"), { userId: "bob", amount: 15 }),
      setDoc(doc(db, "notifications/notif-alice"), { userId: "alice", title: "Hi Alice" }),
      setDoc(doc(db, "notifications/notif-bob"), { userId: "bob", title: "Hi Bob" }),
      setDoc(doc(db, "creator_message_threads/thread-alice-bob"), {
        creatorId: "alice",
        userId: "bob",
        lastMessagePreview: "Hi Bob",
      }),
      setDoc(doc(db, "creator_messages/msg-alice-bob"), {
        threadId: "thread-alice-bob",
        creatorId: "alice",
        userId: "bob",
        text: "Hi Bob",
      }),
      setDoc(doc(db, "security_events/event-1"), {
        userId: "bob",
        username: "Bob",
        label: "Screenshot attempt",
        timestamp: 1710000000000,
      }),
    ]);
  });
}

beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error("FIRESTORE_EMULATOR_HOST is required. Run this suite via `npm run test:rules:firestore`.");
  }

  testEnv = await initializeTestEnvironment({
    projectId: "kandydrops-rules-test",
    firestore: {
      rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8"),
    },
  });

  await seedFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("firestore.rules", () => {
  it("blocks public reads for drops", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "drops/test-drop")));
  });

  it("blocks authenticated reads and queries for drops", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(getDoc(doc(db, "drops/test-drop")));
    await assertFails(getDocs(query(collection(db, "drops"))));
  });

  it("blocks unauthenticated reads for users", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "users/alice")));
  });

  it("allows users to read their own profile", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(db, "users/alice")));
  });

  it("blocks users from reading another user's profile", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(getDoc(doc(db, "users/bob")));
  });

  it("allows users to read their own transactions and notifications only", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();

    await assertSucceeds(getDoc(doc(db, "transactions/tx-alice")));
    await assertSucceeds(getDoc(doc(db, "notifications/notif-alice")));
    await assertFails(getDoc(doc(db, "transactions/tx-bob")));
    await assertFails(getDoc(doc(db, "notifications/notif-bob")));
  });

  it("allows chat participants to read their thread and messages", async () => {
    const creatorDb = testEnv.authenticatedContext("alice").firestore();
    const userDb = testEnv.authenticatedContext("bob").firestore();

    await assertSucceeds(getDoc(doc(creatorDb, "creator_message_threads/thread-alice-bob")));
    await assertSucceeds(getDoc(doc(creatorDb, "creator_messages/msg-alice-bob")));
    await assertSucceeds(getDoc(doc(userDb, "creator_message_threads/thread-alice-bob")));
    await assertSucceeds(getDoc(doc(userDb, "creator_messages/msg-alice-bob")));
  });

  it("blocks non-participants from reading chat threads and messages", async () => {
    const db = testEnv.authenticatedContext("carol").firestore();

    await assertFails(getDoc(doc(db, "creator_message_threads/thread-alice-bob")));
    await assertFails(getDoc(doc(db, "creator_messages/msg-alice-bob")));
  });

  it("allows admins to read chat threads, messages, and security events in the client", async () => {
    const db = testEnv.authenticatedContext("admin").firestore();

    await assertSucceeds(getDoc(doc(db, "creator_message_threads/thread-alice-bob")));
    await assertSucceeds(getDoc(doc(db, "creator_messages/msg-alice-bob")));
    await assertSucceeds(getDoc(doc(db, "security_events/event-1")));
  });

  it("blocks direct client writes everywhere", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();

    await assertFails(setDoc(doc(db, "drops/new-drop"), { title: "Nope" }));
    await assertFails(setDoc(doc(db, "users/alice"), { displayName: "Changed" }));
  });
});
