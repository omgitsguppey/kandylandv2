import { adminDb } from "@/lib/server/firebase-admin";

export type DropReference = {
  id: string;
  title: string;
  status: string;
  imageUrl?: string;
};

function normalizeDropReference(id: string, raw: Record<string, unknown>): DropReference {
  return {
    id,
    title: typeof raw.title === "string" && raw.title.trim().length > 0 ? raw.title.trim() : id,
    status: typeof raw.status === "string" ? raw.status : "unknown",
    imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : undefined,
  };
}

export async function getDropReferenceMap(dropIds: string[]): Promise<Record<string, DropReference>> {
  const uniqueIds = Array.from(new Set(dropIds.map((id) => id.trim()).filter(Boolean)));
  if (uniqueIds.length === 0) {
    return {};
  }

  const snapshots = await Promise.all(
    uniqueIds.map(async (dropId) => {
      const snapshot = await adminDb.collection("drops").doc(dropId).get();
      if (!snapshot.exists) {
        return null;
      }

      return normalizeDropReference(snapshot.id, snapshot.data() as Record<string, unknown>);
    }),
  );

  return Object.fromEntries(
    snapshots
      .filter((entry): entry is DropReference => !!entry)
      .map((entry) => [entry.id, entry]),
  );
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
