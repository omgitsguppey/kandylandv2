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
      setDoc(doc(db, "support_threads/thread-support"), {
        userId: "alice",
        subject: "Help me",
      }),
      setDoc(doc(db, "support_threads/thread-support/support_messages/msg-support"), {
        body: "Hello",
      }),
      setDoc(doc(db, "security_events/event-1"), {
        userId: "bob",
        username: "Bob",
        label: "Screenshot attempt",
        timestamp: 1710000000000,
      }),
      setDoc(doc(db, "analytics_event_facts/event-1"), {
        eventName: "home_page_viewed",
        timestamp: 1710000000000,
      }),
      setDoc(doc(db, "analytics_guest_batches/batch-1"), {
        sessionKey: "guest-1",
        receivedAtMs: 1710000000000,
      }),
      setDoc(doc(db, "analytics_sessions/session-1"), {
        sessionKey: "guest-1",
        lastReceivedAtMs: 1710000000000,
      }),
      setDoc(doc(db, "analytics_watch_sessions/watch-1"), {
        userId: "alice",
        lastSeenAtMs: 1710000000000,
      }),
      setDoc(doc(db, "adminSettings/debugAssistant"), {
        enabled: true,
      }),
      setDoc(doc(db, "analytics_commerce_rollup/summary"), {
        grossRevenueUsdTotal: 12,
      }),
      setDoc(doc(db, "server_diagnostics/diagnostic-1"), {
        channel: "ai",
        createdAtMs: 1710000000000,
      }),
      setDoc(doc(db, "route_runtime_health/route-1"), {
        updatedAtMs: 1710000000000,
      }),
      setDoc(doc(db, "runtime_warning_records/warning-1"), {
        lastSeenAt: 1710000000000,
      }),
      setDoc(doc(db, "debug_evidence/evidence-1"), {
        fingerprint: "dbg_support_denied",
        category: "support",
        lastSeenAt: 1710000000000,
      }),
      setDoc(doc(db, "debug_evidence_rollups/dbg_support_denied"), {
        fingerprint: "dbg_support_denied",
        category: "support",
        occurrenceCount: 2,
        lastSeenAt: 1710000000000,
      }),
      setDoc(doc(db, "queue_job_heartbeats/job-1"), {
        updatedAtMs: 1710000000000,
      }),
      setDoc(doc(db, "orchestration_repair_proposals/proposal-1"), {
        updatedAtMs: 1710000000000,
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

  it("allows admins to read drops for admin realtime panels", async () => {
    const db = testEnv.authenticatedContext("admin").firestore();

    await assertSucceeds(getDoc(doc(db, "drops/test-drop")));
    await assertSucceeds(getDocs(query(collection(db, "drops"))));
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

  it("allows admins to read user profiles for admin identity resolution", async () => {
    const db = testEnv.authenticatedContext("admin").firestore();
    await assertSucceeds(getDoc(doc(db, "users/bob")));
    await assertSucceeds(getDocs(query(collection(db, "users"))));
  });

  it("allows users to read their own transactions and notifications only", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();

    await assertSucceeds(getDoc(doc(db, "transactions/tx-alice")));
    await assertSucceeds(getDoc(doc(db, "notifications/notif-alice")));
    await assertFails(getDoc(doc(db, "transactions/tx-bob")));
    await assertFails(getDoc(doc(db, "notifications/notif-bob")));
  });

  it("allows admins to read transactions for admin commerce feeds", async () => {
    const db = testEnv.authenticatedContext("admin").firestore();

    await assertSucceeds(getDoc(doc(db, "transactions/tx-bob")));
    await assertSucceeds(getDocs(query(collection(db, "transactions"))));
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
    await assertSucceeds(getDoc(doc(db, "support_threads/thread-support")));
    await assertSucceeds(getDoc(doc(db, "support_threads/thread-support/support_messages/msg-support")));
    await assertSucceeds(getDocs(query(collection(db, "support_threads"))));
    await assertSucceeds(getDocs(query(collection(db, "support_threads", "thread-support", "support_messages"))));
  });

  it("allows admins to read analytics realtime lanes in the client", async () => {
    const db = testEnv.authenticatedContext("admin").firestore();

    await assertSucceeds(getDocs(query(collection(db, "analytics_event_facts"))));
    await assertSucceeds(getDocs(query(collection(db, "analytics_guest_batches"))));
    await assertSucceeds(getDocs(query(collection(db, "analytics_sessions"))));
    await assertSucceeds(getDocs(query(collection(db, "analytics_watch_sessions"))));
  });

  it("blocks non-admin analytics realtime lane reads", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();

    await assertFails(getDoc(doc(db, "analytics_event_facts/event-1")));
    await assertFails(getDocs(query(collection(db, "analytics_guest_batches"))));
    await assertFails(getDoc(doc(db, "analytics_sessions/session-1")));
    await assertFails(getDocs(query(collection(db, "analytics_watch_sessions"))));
  });

  it("allows admins to read admin diagnostics and rollups in realtime panels", async () => {
    const db = testEnv.authenticatedContext("admin").firestore();

    await assertSucceeds(getDoc(doc(db, "adminSettings/debugAssistant")));
    await assertSucceeds(getDoc(doc(db, "analytics_commerce_rollup/summary")));
    await assertSucceeds(getDocs(query(collection(db, "server_diagnostics"))));
    await assertSucceeds(getDocs(query(collection(db, "route_runtime_health"))));
    await assertSucceeds(getDocs(query(collection(db, "runtime_warning_records"))));
    await assertSucceeds(getDocs(query(collection(db, "debug_evidence"))));
    await assertSucceeds(getDocs(query(collection(db, "debug_evidence_rollups"))));
    await assertSucceeds(getDocs(query(collection(db, "queue_job_heartbeats"))));
    await assertSucceeds(getDocs(query(collection(db, "orchestration_repair_proposals"))));
  });

  it("blocks non-admin reads for admin diagnostics and rollups", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();

    await assertFails(getDoc(doc(db, "adminSettings/debugAssistant")));
    await assertFails(getDoc(doc(db, "analytics_commerce_rollup/summary")));
    await assertFails(getDocs(query(collection(db, "server_diagnostics"))));
    await assertFails(getDocs(query(collection(db, "route_runtime_health"))));
    await assertFails(getDocs(query(collection(db, "runtime_warning_records"))));
    await assertFails(getDocs(query(collection(db, "debug_evidence"))));
    await assertFails(getDocs(query(collection(db, "debug_evidence_rollups"))));
    await assertFails(getDocs(query(collection(db, "queue_job_heartbeats"))));
    await assertFails(getDocs(query(collection(db, "orchestration_repair_proposals"))));
  });

  it("allows users to read their own support threads", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
      
    await assertSucceeds(getDoc(doc(db, "support_threads/thread-support")));
    await assertSucceeds(getDoc(doc(db, "support_threads/thread-support/support_messages/msg-support")));
    await assertSucceeds(getDocs(query(collection(db, "support_threads", "thread-support", "support_messages"))));
  });

  it("blocks users from reading other users support threads", async () => {
    const db = testEnv.authenticatedContext("bob").firestore();
      
    await assertFails(getDoc(doc(db, "support_threads/thread-support")));
    await assertFails(getDoc(doc(db, "support_threads/thread-support/support_messages/msg-support")));
    await assertFails(getDocs(query(collection(db, "support_threads", "thread-support", "support_messages"))));
  });

  it("blocks direct client writes everywhere", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();

    await assertFails(setDoc(doc(db, "drops/new-drop"), { title: "Nope" }));
    await assertFails(setDoc(doc(db, "users/alice"), { displayName: "Changed" }));
    await assertFails(setDoc(doc(db, "support_threads/thread-new"), { userId: "alice", subject: "Nope" }));
    await assertFails(setDoc(doc(db, "support_threads/thread-support/support_messages/msg-new"), { body: "Nope" }));
    await assertFails(setDoc(doc(db, "analytics_event_facts/event-new"), { eventName: "nope" }));
    await assertFails(setDoc(doc(db, "adminSettings/debugAssistant"), { enabled: false }));
    await assertFails(setDoc(doc(db, "runtime_warning_records/warning-new"), { lastSeenAt: 1710000000000 }));
    await assertFails(setDoc(doc(db, "debug_evidence/evidence-new"), { lastSeenAt: 1710000000000 }));
    await assertFails(setDoc(doc(db, "debug_evidence_rollups/rollup-new"), { lastSeenAt: 1710000000000 }));
  });
});
