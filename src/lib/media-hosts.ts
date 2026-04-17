import { FIREBASE_STORAGE_BUCKET } from "./firebase-runtime";

type RemoteImagePattern = {
  protocol: "https";
  hostname: string;
};

const BASE_REMOTE_MEDIA_HOSTS = [
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
  "lh3.googleusercontent.com",
  "lh4.googleusercontent.com",
  "lh5.googleusercontent.com",
  "lh6.googleusercontent.com",
] as const;

function normalizeBucketHost(bucket: string | undefined) {
  if (!bucket) {
    return null;
  }

  const trimmed = bucket.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("gs://")) {
    return trimmed.slice("gs://".length);
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).hostname;
    } catch {
      return null;
    }
  }

  return trimmed.replace(/^\/+|\/+$/g, "");
}

export function getAllowedRemoteMediaHosts() {
  const hosts = new Set<string>(BASE_REMOTE_MEDIA_HOSTS);
  const storageBucketHost = normalizeBucketHost(FIREBASE_STORAGE_BUCKET);
  if (storageBucketHost) {
    hosts.add(storageBucketHost);
  }

  return Array.from(hosts);
}

export function getAllowedRemoteImagePatterns(): RemoteImagePattern[] {
  return getAllowedRemoteMediaHosts().map((hostname) => ({
    protocol: "https",
    hostname,
  }));
}

export function isAllowedRemoteMediaUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && getAllowedRemoteMediaHosts().includes(url.hostname);
  } catch {
    return false;
  }
}

export function isFirebaseStorageMediaUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (
      url.hostname === "firebasestorage.googleapis.com"
      || url.hostname === "storage.googleapis.com"
    );
  } catch {
    return false;
  }
}
