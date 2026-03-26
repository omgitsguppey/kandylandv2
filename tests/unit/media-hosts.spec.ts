import { describe, it, expect } from "vitest";
import { isAllowedRemoteMediaUrl } from "@/lib/media-hosts";

describe("isAllowedRemoteMediaUrl", () => {
  it("returns true for allowed hosts", () => {
    expect(isAllowedRemoteMediaUrl("https://storage.googleapis.com/test-path")).toBe(true);
    expect(isAllowedRemoteMediaUrl("https://firebasestorage.googleapis.com/v0/b/bucket/o/path")).toBe(true);
  });

  it("returns false for disallowed hosts", () => {
    expect(isAllowedRemoteMediaUrl("https://example.com/image.png")).toBe(false);
    expect(isAllowedRemoteMediaUrl("https://malicious.com/storage.googleapis.com")).toBe(false);
  });

  it("returns false for non-https protocols", () => {
    expect(isAllowedRemoteMediaUrl("http://storage.googleapis.com/test-path")).toBe(false);
    expect(isAllowedRemoteMediaUrl("ftp://storage.googleapis.com/test-path")).toBe(false);
  });

  it("returns false for invalid URLs that throw", () => {
    expect(isAllowedRemoteMediaUrl("not-a-valid-url")).toBe(false);
    expect(isAllowedRemoteMediaUrl("")).toBe(false);
    expect(isAllowedRemoteMediaUrl("http://")).toBe(false);
    // Explicit test for exception path where new URL throws
    expect(isAllowedRemoteMediaUrl("1234")).toBe(false);
  });
});
