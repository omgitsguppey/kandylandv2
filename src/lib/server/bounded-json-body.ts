export type BoundedBodyErrorCode =
  | "payload_too_large"
  | "invalid_json"
  | "invalid_multipart_body";

export class BoundedJsonBodyError extends Error {
  status: 400 | 413;
  code: BoundedBodyErrorCode;

  constructor(status: 400 | 413, code: BoundedBodyErrorCode, message: string) {
    super(message);
    this.name = "BoundedJsonBodyError";
    this.status = status;
    this.code = code;
  }
}

export function isBoundedJsonBodyError(error: unknown): error is BoundedJsonBodyError {
  return error instanceof BoundedJsonBodyError;
}

export function isRequestBodyTooLargeError(error: unknown) {
  return isBoundedJsonBodyError(error)
    ? error.code === "payload_too_large"
    : error instanceof Error && Reflect.get(error, "status") === 413;
}

async function cancelBody(body: ReadableStream<Uint8Array> | null) {
  if (!body || body.locked) return;
  try {
    await body.cancel();
  } catch {
    // Cancellation is best-effort; preserve the typed request-size failure.
  }
}

async function readBodyBytes(request: Request, maxBytes: number) {
  if (!request.body) return new Uint8Array(0);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;

      if (value.byteLength > maxBytes - byteLength) {
        try {
          await reader.cancel();
        } catch {
          // Cancellation is best-effort; preserve the typed request-size failure.
        }
        throw new BoundedJsonBodyError(413, "payload_too_large", "Request payload is too large.");
      }

      chunks.push(value);
      byteLength += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }

  const bodyBytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bodyBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bodyBytes;
}

function buildByteCountingBodyStream(
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
  onOverflow: (error: BoundedJsonBodyError) => void,
) {
  const reader = body.getReader();
  let byteLength = 0;
  let released = false;

  const releaseReader = () => {
    if (released) return;
    released = true;
    reader.releaseLock();
  };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          releaseReader();
          controller.close();
          return;
        }
        if (!value || value.byteLength === 0) return;

        if (value.byteLength > maxBytes - byteLength) {
          const error = new BoundedJsonBodyError(413, "payload_too_large", "Request payload is too large.");
          onOverflow(error);
          try {
            await reader.cancel(error);
          } catch {
            // Cancellation is best-effort; preserve the typed request-size failure.
          }
          releaseReader();
          controller.error(error);
          return;
        }

        byteLength += value.byteLength;
        controller.enqueue(value);
      } catch (error) {
        releaseReader();
        controller.error(error);
      }
    },
    async cancel(reason) {
      if (released) return;
      try {
        await reader.cancel(reason);
      } finally {
        releaseReader();
      }
    },
  }, { highWaterMark: 0 });
}

export async function readBoundedFormDataBody(
  request: Request,
  options: {
    maxBytes: number;
    routeName: string;
  },
): Promise<FormData> {
  const maxBytes = Math.max(1, Math.floor(options.maxBytes));
  const contentType = request.headers.get("content-type")?.trim() ?? "";
  const mediaType = contentType.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "multipart/form-data") {
    throw new BoundedJsonBodyError(400, "invalid_multipart_body", "Multipart form data is required.");
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const parsedLength = Number(contentLength);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      await cancelBody(request.body);
      throw new BoundedJsonBodyError(413, "payload_too_large", "Request payload is too large.");
    }
  }

  if (!request.body) {
    throw new BoundedJsonBodyError(400, "invalid_multipart_body", "Invalid multipart form data.");
  }

  let overflowError: BoundedJsonBodyError | null = null;
  const boundedBody = buildByteCountingBodyStream(request.body, maxBytes, (error) => {
    overflowError = error;
  });

  try {
    return await new Response(boundedBody, {
      headers: { "content-type": contentType },
    }).formData();
  } catch {
    if (overflowError) throw overflowError;
    throw new BoundedJsonBodyError(400, "invalid_multipart_body", "Invalid multipart form data.");
  }
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
      await cancelBody(request.body);
      throw new BoundedJsonBodyError(413, "payload_too_large", "Request payload is too large.");
    }
  }

  // bodyLimitBytes: count raw stream bytes before buffering the complete body or parsing JSON.
  const bodyBytes = await readBodyBytes(request, maxBytes);
  const text = new TextDecoder().decode(bodyBytes);

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
