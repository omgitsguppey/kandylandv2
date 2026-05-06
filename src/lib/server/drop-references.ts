import { adminDb } from "@/lib/server/firebase-admin";

export type DropReference = {
  id: string;
  title: string;
  status: string;
  imageUrl?: string;
  creatorName?: string;
};

type DropReferenceDocSnapshot = {
  id: string;
  data: () => Record<string, unknown>;
};

type DropReferenceCollection = {
  where: (fieldPath: string, opStr: string, value: string[]) => {
    get: () => Promise<{ docs: DropReferenceDocSnapshot[] }>;
  };
};

function normalizeDropReference(id: string, raw: Record<string, unknown>): DropReference {
  const creatorName = [
    raw.creatorDisplayName,
    raw.creatorName,
    raw.creatorUsername,
    raw.submittedByCreatorName,
    raw.submittedByCreatorUsername,
    raw.creatorId,
    raw.submittedByCreatorId,
  ].find((value): value is string => typeof value === "string" && value.trim().length > 0);
  return {
    id,
    title: typeof raw.title === "string" && raw.title.trim().length > 0 ? raw.title.trim() : id,
    status: typeof raw.status === "string" ? raw.status : "unknown",
    imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : undefined,
    creatorName: creatorName?.trim(),
  };
}

function chunkIds(ids: string[], chunkSize: number) {
  const chunks: string[][] = [];

  for (let index = 0; index < ids.length; index += chunkSize) {
    chunks.push(ids.slice(index, index + chunkSize));
  }

  return chunks;
}

export async function buildDropReferenceMapForIds({
  dropsCollection,
  dropIds,
  chunkSize = 30,
}: {
  dropsCollection: DropReferenceCollection;
  dropIds: string[];
  chunkSize?: number;
}): Promise<Record<string, DropReference>> {
  const uniqueIds = Array.from(new Set(dropIds.map((id) => id.trim()).filter(Boolean)));
  if (uniqueIds.length === 0) {
    return {};
  }

  // Chunked "in" queries reduce Firestore round-trips versus one doc.get per drop ID.
  const snapshots = await Promise.all(
    chunkIds(uniqueIds, chunkSize).map((chunk) =>
      dropsCollection.where("__name__", "in", chunk).get(),
    ),
  );

  return Object.fromEntries(
    snapshots.flatMap((snapshot) =>
      snapshot.docs.map((doc) => [doc.id, normalizeDropReference(doc.id, doc.data())] as const),
    ),
  );
}

export async function getDropReferenceMap(dropIds: string[]): Promise<Record<string, DropReference>> {
  return buildDropReferenceMapForIds({
    dropsCollection: adminDb.collection("drops"),
    dropIds,
  });
}

export async function getAllDropReferenceMap(): Promise<Record<string, DropReference>> {
  const snapshot = await adminDb.collection("drops").get();
  return Object.fromEntries(
    snapshot.docs.map((doc) => [doc.id, normalizeDropReference(doc.id, doc.data() as Record<string, unknown>)]),
  );
}

export function resolveDropTitle(
  dropReferences: Record<string, DropReference>,
  dropId: string,
  fallbackTitle?: string,
): string {
  return dropReferences[dropId]?.title || (fallbackTitle && fallbackTitle.trim()) || dropId;
}
