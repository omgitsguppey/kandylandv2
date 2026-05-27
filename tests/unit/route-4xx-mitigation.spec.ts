import { describe, expect, it } from "vitest";

import {
  build4xxFingerprint,
  build4xxTelemetry,
  classify4xxError,
  explain4xxDecision,
  rollup4xxDiagnostic,
  shouldRetry4xx,
} from "@/lib/route-hardening/route-4xx-mitigation";

describe("route 4xx mitigation", () => {
  it("rolls up repeated 4xx diagnostics by safe hourly fingerprint", () => {
    const input = {
      route: "/api/wallet/packages",
      method: "POST",
      statusCode: 422,
      errorCode: "invalid_package",
      actorKind: "authenticated_user",
      featureId: "wallet",
      sourceSystem: "wallet",
      occurredAtUtc: "2026-05-27T15:24:00.000Z",
      requestBody: { email: "fan@example.com", token: "secret", providerPaymentId: "PAY-123" },
    } as const;

    expect(classify4xxError(input).errorClass).toBe("validation_error");
    expect(shouldRetry4xx(input)).toMatchObject({ retry: false });

    const fingerprint = build4xxFingerprint(input);
    expect(fingerprint).toContain("2026-05-27T15");
    expect(fingerprint).not.toContain("fan@example.com");
    expect(fingerprint).not.toContain("PAY-123");

    const diagnostic = rollup4xxDiagnostic(input);
    expect(diagnostic.writeMode).toBe("hourly_rollup");
    expect(diagnostic.rawRequestBodyIncluded).toBe(false);
    expect(diagnostic.redaction).toBe("redacted_no_body_no_tokens_no_provider_ids");
  });

  it("keeps telemetry safe and explains retry decisions", () => {
    const input = {
      route: "/api/notifications/push-token",
      method: "POST",
      statusCode: 429,
      errorCode: "rate_limited",
      actorKind: "authenticated_user",
      featureId: "notifications",
      sourceSystem: "notifications",
      retryAfterSeconds: 60,
    } as const;

    expect(shouldRetry4xx(input)).toMatchObject({ retry: true, backoffRequired: true });
    expect(build4xxTelemetry(input)).toMatchObject({
      eventName: "route_4xx_rate_limited",
      safe: true,
    });
    expect(explain4xxDecision(input)).toContain("hourly_rollup");
  });
});
