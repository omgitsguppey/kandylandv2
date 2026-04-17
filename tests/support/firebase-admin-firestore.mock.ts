import { vi } from "vitest";

type MockRecord = Record<string, unknown>;

class MockTimestamp {
  constructor(
    readonly seconds: number,
    readonly nanoseconds: number,
  ) {}

  static now() {
    return MockTimestamp.fromMillis(Date.now());
  }

  static fromDate(date: Date) {
    return MockTimestamp.fromMillis(date.getTime());
  }

  static fromMillis(ms: number) {
    const seconds = Math.floor(ms / 1000);
    const nanoseconds = Math.floor((ms % 1000) * 1_000_000);
    return new MockTimestamp(seconds, nanoseconds);
  }

  toDate() {
    return new Date(this.toMillis());
  }

  toMillis() {
    return (this.seconds * 1000) + Math.floor(this.nanoseconds / 1_000_000);
  }
}

const createFieldValueSentinel = (kind: string, payload?: MockRecord) => ({
  __mockFieldValue: kind,
  ...(payload ?? {}),
});

export const FieldValue = {
  serverTimestamp: vi.fn(() => createFieldValueSentinel("serverTimestamp")),
  increment: vi.fn((operand: number) => createFieldValueSentinel("increment", { operand })),
  arrayUnion: vi.fn((...values: unknown[]) => createFieldValueSentinel("arrayUnion", { values })),
  arrayRemove: vi.fn((...values: unknown[]) => createFieldValueSentinel("arrayRemove", { values })),
  delete: vi.fn(() => createFieldValueSentinel("delete")),
};

export const Timestamp = MockTimestamp;

export const FieldPath = {
  documentId: vi.fn(() => "__name__"),
};

export class GeoPoint {
  constructor(
    readonly latitude: number,
    readonly longitude: number,
  ) {}
}

function createDocSnapshot(data: MockRecord | null = null) {
  return {
    exists: data !== null,
    id: "mock-doc",
    data: vi.fn(() => data),
    get: vi.fn((key: string) => data?.[key]),
    ref: null,
  };
}

function createQuery() {
  const query: MockRecord = {
    where: vi.fn(() => query),
    orderBy: vi.fn(() => query),
    limit: vi.fn(() => query),
    limitToLast: vi.fn(() => query),
    offset: vi.fn(() => query),
    startAfter: vi.fn(() => query),
    startAt: vi.fn(() => query),
    endBefore: vi.fn(() => query),
    endAt: vi.fn(() => query),
    select: vi.fn(() => query),
    withConverter: vi.fn(() => query),
    get: vi.fn(async () => ({
      docs: [],
      empty: true,
      size: 0,
      forEach: vi.fn(),
    })),
  };
  return query;
}

function createDocRef() {
  const docRef: MockRecord = {
    id: "mock-doc",
    path: "mock/mock-doc",
    collection: vi.fn(() => createCollectionRef()),
    get: vi.fn(async () => createDocSnapshot({})),
    set: vi.fn(async () => undefined),
    update: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
    withConverter: vi.fn(() => docRef),
  };
  return docRef;
}

function createCollectionRef() {
  const query = createQuery();
  const collectionRef: MockRecord = {
    id: "mock-collection",
    path: "mock-collection",
    doc: vi.fn(() => createDocRef()),
    add: vi.fn(async () => createDocRef()),
    withConverter: vi.fn(() => collectionRef),
    ...query,
  };
  return collectionRef;
}

function createWriteBatch() {
  return {
    set: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    commit: vi.fn(async () => []),
  };
}

function createTransaction() {
  return {
    get: vi.fn(async () => createDocSnapshot({})),
    set: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
}

export const mockFirestore = {
  collection: vi.fn(() => createCollectionRef()),
  doc: vi.fn(() => createDocRef()),
  collectionGroup: vi.fn(() => createQuery()),
  batch: vi.fn(() => createWriteBatch()),
  runTransaction: vi.fn(async (callback: (transaction: ReturnType<typeof createTransaction>) => unknown) => (
    callback(createTransaction())
  )),
  recursiveDelete: vi.fn(async () => undefined),
  listCollections: vi.fn(async () => []),
  settings: vi.fn(),
};

export const getFirestore = vi.fn(() => mockFirestore);

