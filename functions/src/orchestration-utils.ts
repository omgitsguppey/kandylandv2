import {encodeKeyFragment, readBoolean, readNumber, readString} from "./analytics-core.js"

export {readBoolean, readNumber, readString}

export function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

export function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
    : []
}

export function readTimestampMillis(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value)
  }

  if (!value || typeof value !== "object") {
    return 0
  }

  if ("toMillis" in value && typeof (value as {toMillis?: () => number}).toMillis === "function") {
    const millis = (value as {toMillis: () => number}).toMillis()
    return Number.isFinite(millis) ? Math.trunc(millis) : 0
  }

  const seconds = readNumber((value as {seconds?: unknown; _seconds?: unknown}).seconds)
    || readNumber((value as {seconds?: unknown; _seconds?: unknown})._seconds)
  if (!seconds) {
    return 0
  }

  const nanoseconds = readNumber((value as {nanoseconds?: unknown; _nanoseconds?: unknown}).nanoseconds)
    || readNumber((value as {nanoseconds?: unknown; _nanoseconds?: unknown})._nanoseconds)
  return Math.trunc(seconds * 1000 + nanoseconds / 1_000_000)
}

export function buildSourceDocumentKey(sourceDocumentPath: string) {
  return encodeKeyFragment(sourceDocumentPath)
}

export function deriveSurface(routePath: string) {
  if (!routePath) {
    return "background"
  }
  if (routePath.startsWith("/admin")) {
    return "admin"
  }
  if (routePath.startsWith("/dashboard")) {
    return "dashboard"
  }
  if (routePath.startsWith("/drops")) {
    return "drops"
  }
  if (routePath.startsWith("/experiences")) {
    return "experiences"
  }
  if (routePath.startsWith("/creators")) {
    return "creators"
  }
  return "site"
}
