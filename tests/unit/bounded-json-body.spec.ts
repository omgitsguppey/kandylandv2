import { describe, expect, it } from "vitest";

import {
  BoundedJsonBodyError,
  isBoundedJsonBodyError,
  readBoundedJsonBody,
} from "@/lib/server/bounded-json-body";

function requestWithBody(body: string, headers?: HeadersInit) {
  return new Request("http://localhost/api/test", {
    method: "POST",
    body,
    headers,
  });
}

async function expectBoundedError(
  promise: Promise<unknown>,
  status: 400 | 413,
  code: "payload_too_large" | "invalid_json",
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

  it("rejects measured body size over the max when content-length is missing", async () => {
    await expectBoundedError(
      readBoundedJsonBody(requestWithBody(JSON.stringify({ value: "abcdef" })), {
        maxBytes: 10,
        routeName: "test",
      }),
      413,
      "payload_too_large",
    );
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
    expect(error.status).toBe(413);
    expect(error.code).toBe("payload_too_large");
  });
});
