import { describe, expect, it } from "vitest";
import {
  describeAdminCredentialSource,
  describeAdminPromotionError,
  describeAdminPromotionTarget,
  describeResolvedAdminPromotionUser,
  maskAdminPromotionIdentifier,
} from "@/lib/server/admin-cli-logging";

describe("admin-cli-logging", () => {
  it("masks email identifiers without exposing the full local part", () => {
    expect(maskAdminPromotionIdentifier("creator@example.com", "email")).toBe("cr***@example.com");
    expect(maskAdminPromotionIdentifier("ab@example.com", "email")).toBe("a***@example.com");
  });

  it("masks uid identifiers without exposing the full value", () => {
    expect(maskAdminPromotionIdentifier("abcd1234efgh5678", "uid")).toBe("abcd***");
    expect(maskAdminPromotionIdentifier("abc", "uid")).toBe("***");
  });

  it("sanitizes control characters before logging user-supplied values", () => {
    expect(describeAdminPromotionTarget("evil\r\nuser@example.com").maskedInput).toBe("ev***@example.com");
    expect(describeAdminPromotionTarget("uid\r\nwith-break").sanitizedInput).toBe("uid with-break");
  });

  it("builds masked summaries for resolved admin users", () => {
    expect(describeResolvedAdminPromotionUser({
      uid: "abcd1234efgh5678",
      email: "creator@example.com",
    })).toBe("abcd*** (cr***@example.com)");
    expect(describeResolvedAdminPromotionUser({
      uid: "abcd1234efgh5678",
      email: null,
    })).toBe("abcd***");
  });

  it("keeps credential source descriptions generic", () => {
    expect(describeAdminCredentialSource("environment")).toBe("Using credentials from GOOGLE_APPLICATION_CREDENTIALS.");
    expect(describeAdminCredentialSource("local_file")).toBe("Using the local service account key file.");
    expect(describeAdminCredentialSource("application_default")).toBe("Using application default credentials.");
  });

  it("sanitizes error messages before writing them to stderr", () => {
    expect(describeAdminPromotionError(new Error("bad\r\nnews"))).toBe("bad news");
    expect(describeAdminPromotionError("plain\tfailure")).toBe("plain failure");
  });
});
