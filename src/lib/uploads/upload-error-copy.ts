type UploadFailureCode =
  | "storage/unauthorized"
  | "storage/canceled"
  | "storage/quota-exceeded"
  | "storage/retry-limit-exceeded"
  | "storage/invalid-checksum"
  | "upload_permission_denied"
  | "upload_stalled"
  | "upload_queue_stalled"
  | "server_unauthorized"
  | "unknown";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function getUploadErrorCopy(code: string | undefined): string {
  switch (code) {
    case "storage/unauthorized":
    case "upload_permission_denied":
    case "server_unauthorized":
      return "Upload permission failed. Refresh your admin session and retry.";
    case "storage/canceled":
      return "Upload canceled.";
    case "storage/quota-exceeded":
      return "Storage quota was reached.";
    case "storage/retry-limit-exceeded":
      return "Upload timed out. Try again.";
    case "storage/invalid-checksum":
      return "Upload verification failed. Try again.";
    case "upload_stalled":
      return "Upload stalled. Check connection and retry.";
    case "upload_queue_stalled":
      return "Upload never started. Retry this file.";
    default:
      return "Upload failed. Retry or report this.";
  }
}

export function classifyUploadErrorCode(
  error: unknown,
  uploadPath: "firebase_storage" | "server",
): UploadFailureCode {
  if (isRecord(error) && typeof error.code === "string") {
    if (error.code === "storage/unauthorized") return "upload_permission_denied";
    if (error.code === "storage/canceled") return "storage/canceled";
    if (error.code === "storage/quota-exceeded") return "storage/quota-exceeded";
    if (error.code === "storage/retry-limit-exceeded") return "storage/retry-limit-exceeded";
    if (error.code === "storage/invalid-checksum") return "storage/invalid-checksum";
  }

  if (isRecord(error) && typeof error.name === "string" && error.name === "AbortError") {
    return "storage/canceled";
  }

  if (uploadPath === "server" && isRecord(error) && typeof error.status === "number") {
    if (error.status === 401 || error.status === 403) {
      return "server_unauthorized";
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("permission") || message.includes("unauthorized")) {
      return uploadPath === "server" ? "server_unauthorized" : "upload_permission_denied";
    }
    if (message.includes("quota")) return "storage/quota-exceeded";
    if (message.includes("retry")) return "storage/retry-limit-exceeded";
    if (message.includes("checksum")) return "storage/invalid-checksum";
    if (message.includes("canceled") || message.includes("cancelled")) return "storage/canceled";
  }

  return "unknown";
}
