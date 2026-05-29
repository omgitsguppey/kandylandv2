import { describe, expect, it } from "vitest";

import {
  buildIdentity4xxResponse,
  IDENTITY_HANDOFF_4XX_POLICY,
  shouldRetryIdentity4xx,
  validateIdentityHandoff4xxPolicy,
} from "@/lib/identity-truth/identity-handoff-4xx-policy";

describe("identity handoff 4xx policy", () => {
  it("classifies permanent identity errors as non-retryable and duplicate handoff as idempotent", () => {
    expect(validateIdentityHandoff4xxPolicy()).toEqual([]);
    expect(shouldRetryIdentity4xx("malformed_identity_payload")).toBe(false);
    expect(shouldRetryIdentity4xx("expired_session", { refreshAttempted: false })).toBe(true);
    expect(shouldRetryIdentity4xx("expired_session", { refreshAttempted: true })).toBe(false);

    expect(IDENTITY_HANDOFF_4XX_POLICY.duplicate_handoff.recoveryAction).toContain("idempotent");
    expect(buildIdentity4xxResponse("missing_guest_id", { route: "auth/navigation-session" })).toMatchObject({
      statusCode: 422,
      retryable: false,
      diagnosticFingerprint: "auth/navigation-session:missing_guest_id:identity",
    });
  });
});
