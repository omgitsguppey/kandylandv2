import { describe, expect, it } from "vitest";

import {
  BoundedJsonBodyError,
  type BoundedBodyErrorCode,
  isBoundedJsonBodyError,
  isRequestBodyTooLargeError,
  readBoundedFormDataBody,
  readBoundedJsonBody,
} from "@/lib/server/bounded-json-body";

function requestWithBody(body: string, headers?: HeadersInit) {
  return new Request("http://localhost/api/test", {
    method: "POST",
    body,
    headers,
  });
}

function streamingRequest(
  chunks: Uint8Array[],
  input?: { headers?: HeadersInit; onCancel?: () => void },
) {
  let nextChunk = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks[nextChunk];
      nextChunk += 1;
      if (chunk) {
        controller.enqueue(chunk);
      } else {
        controller.close();
      }
    },
    cancel() {
      input?.onCancel?.();
    },
  }, { highWaterMark: 0 });

  return new Request("http://localhost/api/test", {
    method: "POST",
    body,
    headers: input?.headers,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

async function expectBoundedError(
  promise: Promise<unknown>,
  status: 400 | 413,
  code: BoundedBodyErrorCode,
) {
  await expect(promise).rejects.toMatchObject({
    name: "BoundedJsonBodyError",
    status,
    code,
  });
}

describe("readBoundedJsonBody", () => {
  it("rejects content-length over the configured max before parsing JSON", async () => {
    await expectBoundedError(
      readBoundedJsonBody(requestWithBody("x".repeat(12), { "content-length": "12" }), {
        maxBytes: 4,
        routeName: "test",
      }),
      413,
      "payload_too_large",
    );
  });

  it("rejects and cancels a streamed body over the max when content-length is missing", async () => {
    const encoder = new TextEncoder();
    let canceled = false;

    await expectBoundedError(
      readBoundedJsonBody(streamingRequest([
        encoder.encode('{"value":"'),
        encoder.encode('abcdef"}'),
      ], { onCancel: () => { canceled = true; } }), {
        maxBytes: 10,
        routeName: "test",
      }),
      413,
      "payload_too_large",
    );

    expect(canceled).toBe(true);
  });

  it("does not trust a smaller content-length header than the streamed body", async () => {
    const encoder = new TextEncoder();

    await expectBoundedError(
      readBoundedJsonBody(streamingRequest([
        encoder.encode(JSON.stringify({ value: "abcdef" })),
      ], { headers: { "content-length": "2" } }), {
        maxBytes: 10,
        routeName: "test",
      }),
      413,
      "payload_too_large",
    );
  });

  it("enforces the byte ceiling for multibyte UTF-8 rather than character count", async () => {
    const body = JSON.stringify({ value: "🍬🍬" });
    expect(body.length).toBeLessThan(new TextEncoder().encode(body).byteLength);

    await expectBoundedError(
      readBoundedJsonBody(requestWithBody(body), {
        maxBytes: body.length,
        routeName: "test",
      }),
      413,
      "payload_too_large",
    );

    await expect(readBoundedJsonBody<{ value: string }>(requestWithBody(body), {
      maxBytes: new TextEncoder().encode(body).byteLength,
      routeName: "test",
    })).resolves.toEqual({ value: "🍬🍬" });
  });

  it("rejects invalid JSON with a typed safe error", async () => {
    await expectBoundedError(
      readBoundedJsonBody(requestWithBody("{bad"), {
        maxBytes: 100,
        routeName: "test",
      }),
      400,
      "invalid_json",
    );
  });

  it("allows empty bodies only when the caller opts in", async () => {
    await expect(readBoundedJsonBody(requestWithBody(""), {
      maxBytes: 100,
      routeName: "test",
      allowEmpty: true,
    })).resolves.toEqual({});

    await expectBoundedError(
      readBoundedJsonBody(requestWithBody(""), {
        maxBytes: 100,
        routeName: "test",
        allowEmpty: false,
      }),
      400,
      "invalid_json",
    );
  });

  it("exposes an error guard for route handlers", async () => {
    const error = new BoundedJsonBodyError(413, "payload_too_large", "Request payload is too large.");

    expect(error).toBeInstanceOf(BoundedJsonBodyError);
    expect(isBoundedJsonBodyError(error)).toBe(true);
    expect(isBoundedJsonBodyError(new Error("other"))).toBe(false);
    expect(isRequestBodyTooLargeError(error)).toBe(true);
    expect(isRequestBodyTooLargeError(Object.assign(new Error("guard"), { status: 413 }))).toBe(true);
    expect(isRequestBodyTooLargeError(new Error("other"))).toBe(false);
    expect(error.status).toBe(413);
    expect(error.code).toBe("payload_too_large");
  });
});

function encodeMultipart(boundary: string, parts: Array<{
  name: string;
  value: string;
  fileName?: string;
  contentType?: string;
}>) {
  const lines = parts.flatMap((part) => [
    `--${boundary}`,
    `Content-Disposition: form-data; name="${part.name}"${part.fileName ? `; filename="${part.fileName}"` : ""}`,
    ...(part.contentType ? [`Content-Type: ${part.contentType}`] : []),
    "",
    part.value,
  ]);
  return new TextEncoder().encode(`${lines.join("\r\n")}\r\n--${boundary}--\r\n`);
}

describe("readBoundedFormDataBody", () => {
  const boundary = "bounded-form-data-test";
  const contentType = `multipart/form-data; boundary=${boundary}`;

  it("rejects lookalike non-multipart content types", async () => {
    await expectBoundedError(
      readBoundedFormDataBody(requestWithBody("not multipart", {
        "content-type": "multipart/form-data-archive",
      }), {
        maxBytes: 1_024,
        routeName: "test/multipart",
      }),
      400,
      "invalid_multipart_body",
    );
  });

  it("rejects an honestly declared oversized multipart request before parsing", async () => {
    await expectBoundedError(
      readBoundedFormDataBody(streamingRequest([
        encodeMultipart(boundary, [{ name: "title", value: "small" }]),
      ], { headers: { "content-type": contentType, "content-length": "500" } }), {
        maxBytes: 100,
        routeName: "test/multipart",
      }),
      413,
      "payload_too_large",
    );
  });

  it("cancels an oversized multipart stream when content-length is absent", async () => {
    let canceled = false;
    const payload = encodeMultipart(boundary, [{ name: "title", value: "x".repeat(200) }]);

    await expectBoundedError(
      readBoundedFormDataBody(streamingRequest([
        payload.slice(0, 64),
        payload.slice(64),
      ], {
        headers: { "content-type": contentType },
        onCancel: () => { canceled = true; },
      }), {
        maxBytes: 100,
        routeName: "test/multipart",
      }),
      413,
      "payload_too_large",
    );

    expect(canceled).toBe(true);
  });

  it("does not trust a smaller content-length than the multipart stream", async () => {
    const payload = encodeMultipart(boundary, [{ name: "title", value: "x".repeat(200) }]);

    await expectBoundedError(
      readBoundedFormDataBody(streamingRequest([payload], {
        headers: { "content-type": contentType, "content-length": "1" },
      }), {
        maxBytes: 100,
        routeName: "test/multipart",
      }),
      413,
      "payload_too_large",
    );
  });

  it("returns a typed 400 for malformed multipart bytes", async () => {
    await expectBoundedError(
      readBoundedFormDataBody(requestWithBody("not multipart", { "content-type": contentType }), {
        maxBytes: 1_024,
        routeName: "test/multipart",
      }),
      400,
      "invalid_multipart_body",
    );
  });

  it("preserves valid multibyte metadata and file fields within the raw-byte cap", async () => {
    const title = "Cr\u00e8me \ud83c\udf6c";
    const payload = encodeMultipart(boundary, [
      { name: "title", value: title },
      { name: "file", value: "image-bytes", fileName: "cover.txt", contentType: "text/plain" },
    ]);
    const formData = await readBoundedFormDataBody(streamingRequest([payload], {
      headers: { "content-type": contentType },
    }), {
      maxBytes: payload.byteLength,
      routeName: "test/multipart",
    });

    expect(formData.get("title")).toBe(title);
    const file = formData.get("file");
    expect(file).toBeInstanceOf(File);
    expect((file as File).name).toBe("cover.txt");
    expect(await (file as File).text()).toBe("image-bytes");
  });
});
