type HistoricalAnalyticsUserEntry = {
  username: string;
  photoURL: string;
};

type HistoricalAnalyticsUserDoc = {
  id: string;
  data: () => Record<string, unknown>;
};

type HistoricalAnalyticsUsersCollection = {
  where: (fieldPath: string, opStr: string, value: string[]) => {
    get: () => Promise<{ docs: HistoricalAnalyticsUserDoc[] }>;
  };
};

function chunkUserIds(userIds: string[], chunkSize: number) {
  const chunks: string[][] = [];

  for (let index = 0; index < userIds.length; index += chunkSize) {
    chunks.push(userIds.slice(index, index + chunkSize));
  }

  return chunks;
}

export async function buildHistoricalAnalyticsUserMap({
  usersCollection,
  userIds,
  chunkSize = 30,
}: {
  usersCollection: HistoricalAnalyticsUsersCollection;
  userIds: Iterable<string>;
  chunkSize?: number;
}) {
  const uidArray = Array.from(userIds);
  const userMap: Record<string, HistoricalAnalyticsUserEntry> = {};

  if (uidArray.length === 0) {
    return userMap;
  }

  // Run independent chunk lookups together to avoid serial Firestore round-trips.
  const userSnapshots = await Promise.all(
    chunkUserIds(uidArray, chunkSize).map((chunk) =>
      usersCollection.where("__name__", "in", chunk).get(),
    ),
  );

  for (const snapshot of userSnapshots) {
    for (const doc of snapshot.docs) {
      const data = doc.data();
      userMap[doc.id] = {
        username: typeof data.username === "string" && data.username.length > 0
          ? data.username
          : typeof data.displayName === "string" && data.displayName.length > 0
            ? data.displayName
            : "Unknown User",
        photoURL: typeof data.photoURL === "string" ? data.photoURL : "",
      };
    }
  }

  return userMap;
}
