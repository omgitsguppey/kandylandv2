import { vi } from "vitest";
import {
  FieldPath,
  FieldValue,
  GeoPoint,
  Timestamp,
  getFirestore,
  mockFirestore,
} from "./firebase-admin-firestore.mock";

const apps: Array<{ name: string }> = [];

const mockAuth = {
  verifyIdToken: vi.fn(),
  getUser: vi.fn(),
  getUserByEmail: vi.fn(),
  revokeRefreshTokens: vi.fn(),
  createCustomToken: vi.fn(),
};

const mockStorageBucket = {
  file: vi.fn(() => ({
    save: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(async () => [false]),
    getSignedUrl: vi.fn(async () => ["https://example.test/mock-file"]),
  })),
};

const mockStorage = {
  bucket: vi.fn(() => mockStorageBucket),
};

const credential = {
  cert: vi.fn((value?: unknown) => ({ kind: "cert", value })),
  applicationDefault: vi.fn(() => ({ kind: "applicationDefault" })),
};

const initializeApp = vi.fn(() => {
  const app = { name: `mock-app-${apps.length + 1}` };
  apps.push(app);
  return app;
});

const firestore = Object.assign(
  vi.fn(() => mockFirestore),
  {
    FieldValue,
    Timestamp,
    FieldPath,
    GeoPoint,
  },
);

const auth = vi.fn(() => mockAuth);
const storage = vi.fn(() => mockStorage);

const firebaseAdmin = {
  apps,
  credential,
  initializeApp,
  firestore,
  auth,
  storage,
};

export {
  apps,
  auth,
  credential,
  FieldPath,
  FieldValue,
  firestore,
  GeoPoint,
  initializeApp,
  mockAuth,
  mockFirestore,
  mockStorage,
  storage,
  Timestamp,
  getFirestore,
};

export default firebaseAdmin;
