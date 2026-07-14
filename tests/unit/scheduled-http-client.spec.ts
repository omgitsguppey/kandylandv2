import { afterEach, describe, expect, it, vi } from "vitest";

import {
  parseScheduledAllowedHosts,
  requestScheduledJson,
  ScheduledHttpError,
  validateScheduledEndpoint,
} from "../../functions/src/scheduled-http-client";

const EXPECTED_PATH = "/api/internal/analytics/materialize-user-index";
const APPROVED_HOSTS = ["example.test"];

describe("scheduled HTTP client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("permits only allowlisted HTTPS and an explicit local-test loopback exception", () => {
    expect(parseScheduledAllowedHosts("Example.Test,app.example.test")).toEqual([
      "app.example.test",
      "example.test",
    ]);
    expect(validateScheduledEndpoint(`https://example.test${EXPECTED_PATH}`, {
      allowedHosts: APPROVED_HOSTS,
      expectedPath: EXPECTED_PATH,
    })).toBe(`https://example.test${EXPECTED_PATH}`);
    expect(validateScheduledEndpoint(`http://127.0.0.1:3000${EXPECTED_PATH}`, {
      allowedHosts: ["127.0.0.1"],
      expectedPath: EXPECTED_PATH,
      allowLoopback: true,
    })).toBe(`http://127.0.0.1:3000${EXPECTED_PATH}`);
    expect(() => validateScheduledEndpoint(`http://example.test${EXPECTED_PATH}`, {
      allowedHosts: APPROVED_HOSTS,
      expectedPath: EXPECTED_PATH,
    }))
      .toThrowError(new ScheduledHttpError("scheduled_endpoint_insecure"));
  });

  it.each([
    [`https://user:pass@example.test${EXPECTED_PATH}`, "scheduled_endpoint_credentials_disallowed"],
    [`https://example.test${EXPECTED_PATH}?target=other`, "scheduled_endpoint_query_disallowed"],
    [`https://example.test${EXPECTED_PATH}#fragment`, "scheduled_endpoint_fragment_disallowed"],
    ["https://example.test/other", "scheduled_endpoint_path_disallowed"],
    [`https://example.test:444${EXPECTED_PATH}`, "scheduled_endpoint_port_disallowed"],
    [`https://attacker.example${EXPECTED_PATH}`, "scheduled_endpoint_host_disallowed"],
  ])("rejects hostile or ambiguous scheduled endpoint %s", (endpoint, code) => {
    expect(() => validateScheduledEndpoint(endpoint, {
      allowedHosts: APPROVED_HOSTS,
      expectedPath: EXPECTED_PATH,
    })).toThrowError(new ScheduledHttpError(code));
  });

  it("fails closed when the explicit host allowlist is missing or malformed", () => {
    expect(() => parseScheduledAllowedHosts(""))
      .toThrowError(new ScheduledHttpError("scheduled_allowed_hosts_missing"));
    expect(() => parseScheduledAllowedHosts("example.test,"))
      .toThrowError(new ScheduledHttpError("scheduled_allowed_hosts_invalid"));
    expect(() => parseScheduledAllowedHosts("https://example.test"))
      .toThrowError(new ScheduledHttpError("scheduled_allowed_hosts_invalid"));
  });

  it("uses a canonical status code without persisting response-provided error detail", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      errorCode: "customer-email-secret@example.test",
    }), { status: 503, headers: { "content-type": "application/json" } })));

    await expect(requestScheduledJson({
      endpoint: `https://example.test${EXPECTED_PATH}`,
      token: "scheduler-secret",
      allowedHosts: APPROVED_HOSTS,
      expectedPath: EXPECTED_PATH,
      signal: new AbortController().signal,
    })).rejects.toMatchObject({ code: "scheduled_http_503" });
  });

  it("rejects response bodies that exceed the configured byte budget", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x".repeat(2_048), { status: 200 })));

    await expect(requestScheduledJson({
      endpoint: `https://example.test${EXPECTED_PATH}`,
      token: "scheduler-secret",
      allowedHosts: APPROVED_HOSTS,
      expectedPath: EXPECTED_PATH,
      signal: new AbortController().signal,
      responseLimitBytes: 1_024,
    })).rejects.toMatchObject({ code: "scheduled_response_too_large" });
  });

  it("never forwards scheduler credentials through a redirect", async () => {
    const fetchMock = vi.fn(async () => new Response(null, {
      status: 307,
      headers: { location: "https://attacker.example/steal" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestScheduledJson({
      endpoint: `https://example.test${EXPECTED_PATH}`,
      token: "scheduler-secret",
      allowedHosts: APPROVED_HOSTS,
      expectedPath: EXPECTED_PATH,
      signal: new AbortController().signal,
      authHeader: "x-kandydrops-scheduler-token",
    })).rejects.toMatchObject({ code: "scheduled_redirect_disallowed" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`https://example.test${EXPECTED_PATH}`, expect.objectContaining({
      redirect: "manual",
      headers: expect.objectContaining({
        "x-kandydrops-scheduler-token": "scheduler-secret",
      }),
    }));
  });

  it("rejects a response whose final URL has a different origin", async () => {
    const response = new Response("{}", { status: 200 });
    Object.defineProperty(response, "url", { value: "https://other.example/internal" });
    vi.stubGlobal("fetch", vi.fn(async () => response));

    await expect(requestScheduledJson({
      endpoint: `https://example.test${EXPECTED_PATH}`,
      token: "scheduler-secret",
      allowedHosts: APPROVED_HOSTS,
      expectedPath: EXPECTED_PATH,
      signal: new AbortController().signal,
    })).rejects.toMatchObject({ code: "scheduled_response_origin_mismatch" });
  });

  it("allows tokenless loopback tests but rejects any loopback credential before fetch", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const endpoint = `http://127.0.0.1:3000${EXPECTED_PATH}`;
    const localInput = {
      endpoint,
      allowedHosts: ["127.0.0.1"],
      expectedPath: EXPECTED_PATH,
      allowLoopback: true,
      signal: new AbortController().signal,
    };

    await expect(requestScheduledJson({ ...localInput, token: "" })).resolves.toEqual({});
    expect(fetchMock).toHaveBeenLastCalledWith(endpoint, expect.objectContaining({
      headers: { "content-type": "application/json" },
    }));

    await expect(requestScheduledJson({ ...localInput, token: "production-secret" }))
      .rejects.toMatchObject({ code: "scheduled_loopback_token_disallowed" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
