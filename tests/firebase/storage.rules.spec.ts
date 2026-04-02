import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let testEnv: RulesTestEnvironment;

const AVATAR_PATH = "avatars/alice.png";
const DELETE_PATH = "avatars/alice.webp";
const CREATOR_ID_PATH = "creator-onboarding/alice/id/government-id.png";
const CREATOR_MESSAGE_PATH = "creator/messages/alice/thread-1/upload.png";
const LEGACY_CREATOR_MESSAGE_PATH = "creator/messages/upload.png";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

type StorageLike = {
  ref: (path: string) => {
    putString: (value: string, format: string, metadata: { contentType: string }) => unknown;
  };
};

async function uploadStringWithRules(
  storage: StorageLike,
  path: string,
  value: string,
  contentType: string,
) {
  await storage.ref(path).putString(value, "raw", { contentType });
}

async function seedAvatar(path: string, content = "avatar-seed", contentType = "image/png") {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await uploadStringWithRules(context.storage(), path, content, contentType);
  });
}

beforeAll(async () => {
  if (!process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    throw new Error("FIREBASE_STORAGE_EMULATOR_HOST is required. Run this suite via `npm run test:rules:storage`.");
  }

  testEnv = await initializeTestEnvironment({
    projectId: "kandydrops-rules-test",
    storage: {
      rules: readFileSync(resolve(process.cwd(), "storage.rules"), "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearStorage();
  await seedAvatar(AVATAR_PATH);
  await seedAvatar(DELETE_PATH);
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("storage.rules", () => {
  it("blocks unauthenticated reads for avatars", async () => {
    const storage = testEnv.unauthenticatedContext().storage();
    await assertFails(storage.ref(AVATAR_PATH).getDownloadURL());
  });

  it("allows the avatar owner to read their raw avatar object", async () => {
    const storage = testEnv.authenticatedContext("alice").storage();
    await assertSucceeds(storage.ref(AVATAR_PATH).getDownloadURL());
  });

  it("blocks other authenticated users from reading another user's raw avatar object", async () => {
    const storage = testEnv.authenticatedContext("bob").storage();
    await assertFails(storage.ref(AVATAR_PATH).getDownloadURL());
  });

  it("allows the owner to upload a valid image avatar", async () => {
    const storage = testEnv.authenticatedContext("alice").storage();
    await assertSucceeds(
      uploadStringWithRules(storage, "avatars/alice.webp", "avatar-image", "image/webp"),
    );
  });

  it("allows the owner to delete their avatar", async () => {
    const storage = testEnv.authenticatedContext("alice").storage();
    await assertSucceeds(storage.ref(DELETE_PATH).delete());
  });

  it("blocks uploading another user's avatar path", async () => {
    const storage = testEnv.authenticatedContext("bob").storage();
    await assertFails(
      uploadStringWithRules(storage, AVATAR_PATH, "avatar-image", "image/png"),
    );
  });

  it("blocks non-image avatar uploads", async () => {
    const storage = testEnv.authenticatedContext("alice").storage();
    await assertFails(
      uploadStringWithRules(storage, "avatars/alice.txt", "not-an-image", "text/plain"),
    );
  });

  it("blocks oversized avatar uploads", async () => {
    const storage = testEnv.authenticatedContext("alice").storage();
    const oversizedPayload = "a".repeat(MAX_AVATAR_BYTES + 1);

    await assertFails(
      uploadStringWithRules(storage, "avatars/alice-large.png", oversizedPayload, "image/png"),
    );
  });

  it("blocks direct reads of creator onboarding ID documents", async () => {
    await seedAvatar(CREATOR_ID_PATH, "private-id", "image/png");
    const storage = testEnv.authenticatedContext("alice").storage();
    await assertFails(storage.ref(CREATOR_ID_PATH).getDownloadURL());
  });

  it("blocks direct writes to creator onboarding ID document paths", async () => {
    const storage = testEnv.authenticatedContext("alice").storage();
    await assertFails(
      uploadStringWithRules(storage, CREATOR_ID_PATH, "private-id", "image/png"),
    );
  });

  it("allows the uploader to read and write their own creator message attachment path", async () => {
    const storage = testEnv.authenticatedContext("alice").storage();
    await assertSucceeds(
      uploadStringWithRules(storage, CREATOR_MESSAGE_PATH, "message-asset", "image/png"),
    );
    await assertSucceeds(storage.ref(CREATOR_MESSAGE_PATH).getDownloadURL());
  });

  it("blocks other authenticated users from reading another user's creator message attachment path", async () => {
    await seedAvatar(CREATOR_MESSAGE_PATH, "message-asset", "image/png");
    const storage = testEnv.authenticatedContext("bob").storage();
    await assertFails(storage.ref(CREATOR_MESSAGE_PATH).getDownloadURL());
  });

  it("blocks other authenticated users from writing another user's creator message attachment path", async () => {
    const storage = testEnv.authenticatedContext("bob").storage();
    await assertFails(
      uploadStringWithRules(storage, CREATOR_MESSAGE_PATH, "message-asset", "image/png"),
    );
  });

  it("blocks legacy unscoped creator message attachment paths", async () => {
    const storage = testEnv.authenticatedContext("alice").storage();
    await assertFails(
      uploadStringWithRules(storage, LEGACY_CREATOR_MESSAGE_PATH, "message-asset", "image/png"),
    );
  });
});
