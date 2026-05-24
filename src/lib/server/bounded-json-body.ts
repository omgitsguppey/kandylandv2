export class BoundedJsonBodyError extends Error {
  status: 400 | 413;
  code: "payload_too_large" | "invalid_json";

  constructor(status: 400 | 413, code: "payload_too_large" | "invalid_json", message: string) {
    super(message);
    this.name = "BoundedJsonBodyError";
    this.status = status;
    this.code = code;
  }
}

export function isBoundedJsonBodyError(error: unknown): error is BoundedJsonBodyError {
  return error instanceof BoundedJsonBodyError;
}

export async function readBoundedJsonBody<T>(
  request: Request,
  options: {
    maxBytes: number;
    routeName: string;
    allowEmpty?: boolean;
    allowedContentTypes?: string[];
  },
): Promise<T> {
  const maxBytes = Math.max(1, Math.floor(options.maxBytes));
  const contentLength = request.headers.get("content-length");
  const allowedContentTypes = options.allowedContentTypes?.map((contentType) => contentType.toLowerCase()) ?? [];

  if (allowedContentTypes.length > 0) {
    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType || !allowedContentTypes.some((allowed) => contentType.startsWith(allowed))) {
      throw new BoundedJsonBodyError(400, "invalid_json", "JSON content type required.");
    }
  }

  // content-length guard
  if (contentLength) {
    const parsedLength = Number(contentLength);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      // payload_too_large
      throw new BoundedJsonBodyError(413, "payload_too_large", "Request payload is too large.");
    }
  }

  const text = await request.text();
  // bodyLimitBytes: enforced before JSON parsing
  const byteLength = new TextEncoder().encode(text).length;
  if (byteLength > maxBytes) {
    // payload_too_large
    throw new BoundedJsonBodyError(413, "payload_too_large", "Request payload is too large.");
  }

  if (text.trim().length === 0) {
    if (options.allowEmpty) {
      return {} as T;
    }
    throw new BoundedJsonBodyError(400, "invalid_json", "Invalid JSON body.");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new BoundedJsonBodyError(400, "invalid_json", "Invalid JSON body.");
  }
}
