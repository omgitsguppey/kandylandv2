import { FIREBASE_STORAGE_BUCKET } from "./firebase-runtime";

type RemoteImagePattern = {
  protocol: "https";
  hostname: string;
};

export type FirebaseStorageMediaLocation = {
  bucket: string;
  objectPath: string;
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

function normalizeBucketName(bucket: string | undefined) {
  if (!bucket) {
    return null;
  }

  const raw = bucket.trim();
  if (!raw) {
    return null;
  }

  if (raw.startsWith("gs://")) {
    return raw.slice("gs://".length).replace(/^\/+|\/+$/g, "") || null;
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (url.hostname === "firebasestorage.googleapis.com") {
        const match = url.pathname.match(/^\/v0\/b\/([^/]+)(?:\/|$)/u);
        return match ? decodeURIComponent(match[1]) : null;
      }
      if (url.hostname === "storage.googleapis.com") {
        const [bucketName] = url.pathname.split("/").filter(Boolean);
        return bucketName ? decodeURIComponent(bucketName) : null;
      }
      if (url.hostname.endsWith(".storage.googleapis.com")) {
        return url.hostname.slice(0, -".storage.googleapis.com".length) || null;
      }
      return url.hostname || null;
    } catch {
      return null;
    }
  }

  return raw.replace(/^\/+|\/+$/g, "") || null;
}

function decodeStoragePathPart(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function isSafeStorageObjectPath(value: string) {
  if (!value || value.startsWith("/") || value.includes("\\") || value.includes("\0")) {
    return false;
  }

  return value.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

export function resolveFirebaseStorageMediaLocation(value: string): FirebaseStorageMediaLocation | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:"
      || url.username
      || url.password
      || url.port
    ) {
      return null;
    }

    let bucket: string | null = null;
    let encodedObjectPath: string | null = null;
    if (url.hostname === "firebasestorage.googleapis.com") {
      const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/u);
      if (match) {
        bucket = decodeStoragePathPart(match[1]);
        encodedObjectPath = match[2];
      }
    } else if (url.hostname === "storage.googleapis.com") {
      const match = url.pathname.match(/^\/([^/]+)\/(.+)$/u);
      if (match) {
        bucket = decodeStoragePathPart(match[1]);
        encodedObjectPath = match[2];
      }
    } else if (url.hostname.endsWith(".storage.googleapis.com")) {
      bucket = url.hostname.slice(0, -".storage.googleapis.com".length) || null;
      encodedObjectPath = url.pathname.replace(/^\/+/, "") || null;
    }

    const objectPath = encodedObjectPath ? decodeStoragePathPart(encodedObjectPath) : null;
    if (!bucket || !objectPath || !isSafeStorageObjectPath(objectPath)) {
      return null;
    }

    return { bucket, objectPath };
  } catch {
    return null;
  }
}

export function getAllowedRemoteMediaHosts() {
  const hosts = new Set<string>(BASE_REMOTE_MEDIA_HOSTS);
  const storageBucketHost = normalizeBucketHost(FIREBASE_STORAGE_BUCKET);
  if (storageBucketHost) {
    hosts.add(storageBucketHost);
  }
  const storageBucketName = normalizeBucketName(FIREBASE_STORAGE_BUCKET);
  if (storageBucketName) {
    hosts.add(`${storageBucketName}.storage.googleapis.com`);
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
  return resolveFirebaseStorageMediaLocation(value) !== null;
}

export function isFirebaseStorageMediaUrlForBucket(value: string, expectedBucket: string | undefined) {
  const expectedBucketName = normalizeBucketName(expectedBucket);
  const location = resolveFirebaseStorageMediaLocation(value);
  return Boolean(expectedBucketName && location?.bucket === expectedBucketName);
}

export function isConfiguredFirebaseStorageMediaUrl(value: string) {
  return isFirebaseStorageMediaUrlForBucket(value, FIREBASE_STORAGE_BUCKET);
}
