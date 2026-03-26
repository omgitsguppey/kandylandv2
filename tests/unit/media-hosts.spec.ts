import { describe, expect, it, vi, afterEach } from "vitest";
import {
  getAllowedRemoteMediaHosts,
  getAllowedRemoteImagePatterns,
  isAllowedRemoteMediaUrl,
} from "@/lib/media-hosts";

// Mock the entire module to easily control FIREBASE_STORAGE_BUCKET
vi.mock("@/lib/firebase-runtime", () => ({
  FIREBASE_STORAGE_BUCKET: "test-bucket.appspot.com",
}));

describe("media-hosts", () => {
  describe("getAllowedRemoteMediaHosts", () => {
    it("includes base hosts and the configured storage bucket", () => {
      const hosts = getAllowedRemoteMediaHosts();
      expect(hosts).toContain("firebasestorage.googleapis.com");
      expect(hosts).toContain("storage.googleapis.com");
      expect(hosts).toContain("test-bucket.appspot.com");
    });
  });

  describe("getAllowedRemoteImagePatterns", () => {
    it("returns correctly formatted remote image patterns for all allowed hosts", () => {
      const patterns = getAllowedRemoteImagePatterns();
      const hosts = getAllowedRemoteMediaHosts();

      expect(patterns.length).toBe(hosts.length);
      patterns.forEach((pattern, index) => {
        expect(pattern.protocol).toBe("https");
        expect(pattern.hostname).toBe(hosts[index]);
      });
    });
  });

  describe("isAllowedRemoteMediaUrl", () => {
    it("returns true for a valid https URL with an allowed host", () => {
      expect(isAllowedRemoteMediaUrl("https://firebasestorage.googleapis.com/v0/b/test/image.png")).toBe(true);
      expect(isAllowedRemoteMediaUrl("https://test-bucket.appspot.com/image.jpg")).toBe(true);
      expect(isAllowedRemoteMediaUrl("https://lh3.googleusercontent.com/a/test")).toBe(true);
    });

    it("returns false for a valid http URL with an allowed host", () => {
      expect(isAllowedRemoteMediaUrl("http://firebasestorage.googleapis.com/v0/b/test/image.png")).toBe(false);
    });

    it("returns false for a valid https URL with a disallowed host", () => {
      expect(isAllowedRemoteMediaUrl("https://evil.com/image.png")).toBe(false);
      expect(isAllowedRemoteMediaUrl("https://example.com/test")).toBe(false);
    });

    it("returns false for malformed URLs", () => {
      expect(isAllowedRemoteMediaUrl("not-a-url")).toBe(false);
      expect(isAllowedRemoteMediaUrl("")).toBe(false);
    });
  });
});
