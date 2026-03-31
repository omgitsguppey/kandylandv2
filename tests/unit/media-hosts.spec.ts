import { describe, expect, it, vi, beforeEach } from "vitest";

describe("media-hosts", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("getAllowedRemoteMediaHosts", () => {
    it("includes base hosts and the configured storage bucket", async () => {
      vi.doMock("@/lib/firebase-runtime", () => ({
        FIREBASE_STORAGE_BUCKET: "test-bucket.appspot.com",
      }));
      const { getAllowedRemoteMediaHosts } = await import("@/lib/media-hosts");
      const hosts = getAllowedRemoteMediaHosts();
      expect(hosts).toContain("firebasestorage.googleapis.com");
      expect(hosts).toContain("storage.googleapis.com");
      expect(hosts).toContain("test-bucket.appspot.com");
    });

    it("handles an undefined storage bucket correctly", async () => {
      vi.doMock("@/lib/firebase-runtime", () => ({
        FIREBASE_STORAGE_BUCKET: undefined,
      }));
      const { getAllowedRemoteMediaHosts } = await import("@/lib/media-hosts");
      const hosts = getAllowedRemoteMediaHosts();
      expect(hosts).not.toContain("undefined");
      expect(hosts).toContain("firebasestorage.googleapis.com");
    });

    it("handles a gs:// prefix in the storage bucket correctly", async () => {
      vi.doMock("@/lib/firebase-runtime", () => ({
        FIREBASE_STORAGE_BUCKET: "gs://some-bucket.appspot.com",
      }));
      const { getAllowedRemoteMediaHosts } = await import("@/lib/media-hosts");
      const hosts = getAllowedRemoteMediaHosts();
      expect(hosts).toContain("some-bucket.appspot.com");
      expect(hosts).not.toContain("gs://some-bucket.appspot.com");
    });

    it("handles https URL in the storage bucket correctly", async () => {
      vi.doMock("@/lib/firebase-runtime", () => ({
        FIREBASE_STORAGE_BUCKET: "https://my-bucket.storage.googleapis.com/v0/b",
      }));
      const { getAllowedRemoteMediaHosts } = await import("@/lib/media-hosts");
      const hosts = getAllowedRemoteMediaHosts();
      expect(hosts).toContain("my-bucket.storage.googleapis.com");
    });

    it("handles whitespace in the storage bucket correctly", async () => {
      vi.doMock("@/lib/firebase-runtime", () => ({
        FIREBASE_STORAGE_BUCKET: "  spaced-bucket.appspot.com  ",
      }));
      const { getAllowedRemoteMediaHosts } = await import("@/lib/media-hosts");
      const hosts = getAllowedRemoteMediaHosts();
      expect(hosts).toContain("spaced-bucket.appspot.com");
    });

    it("handles an empty storage bucket correctly", async () => {
      vi.doMock("@/lib/firebase-runtime", () => ({
        FIREBASE_STORAGE_BUCKET: "   ",
      }));
      const { getAllowedRemoteMediaHosts } = await import("@/lib/media-hosts");
      const hosts = getAllowedRemoteMediaHosts();
      expect(hosts.length).toBe(6); // Only the base 6
    });

    it("strips trailing/leading slashes", async () => {
      vi.doMock("@/lib/firebase-runtime", () => ({
        FIREBASE_STORAGE_BUCKET: "/slash-bucket.appspot.com/",
      }));
      const { getAllowedRemoteMediaHosts } = await import("@/lib/media-hosts");
      const hosts = getAllowedRemoteMediaHosts();
      expect(hosts).toContain("slash-bucket.appspot.com");
    });

    it("does not crash on malformed https URL and falls back to string replacement", async () => {
      vi.doMock("@/lib/firebase-runtime", () => ({
        FIREBASE_STORAGE_BUCKET: "https://", // new URL('https://') throws
      }));
      const { getAllowedRemoteMediaHosts } = await import("@/lib/media-hosts");
      const hosts = getAllowedRemoteMediaHosts();
      expect(hosts.length).toBe(6);
    });
  });

  describe("getAllowedRemoteImagePatterns", () => {
    it("returns correctly formatted remote image patterns for all allowed hosts", async () => {
      vi.doMock("@/lib/firebase-runtime", () => ({
        FIREBASE_STORAGE_BUCKET: "test-bucket.appspot.com",
      }));
      const { getAllowedRemoteImagePatterns, getAllowedRemoteMediaHosts } = await import("@/lib/media-hosts");
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
    it("returns true for a valid https URL with an allowed host", async () => {
      vi.doMock("@/lib/firebase-runtime", () => ({
        FIREBASE_STORAGE_BUCKET: "test-bucket.appspot.com",
      }));
      const { isAllowedRemoteMediaUrl } = await import("@/lib/media-hosts");
      expect(isAllowedRemoteMediaUrl("https://firebasestorage.googleapis.com/v0/b/test/image.png")).toBe(true);
      expect(isAllowedRemoteMediaUrl("https://test-bucket.appspot.com/image.jpg")).toBe(true);
      expect(isAllowedRemoteMediaUrl("https://lh3.googleusercontent.com/a/test")).toBe(true);
    });

    it("returns false for a valid http URL with an allowed host", async () => {
      vi.doMock("@/lib/firebase-runtime", () => ({
        FIREBASE_STORAGE_BUCKET: "test-bucket.appspot.com",
      }));
      const { isAllowedRemoteMediaUrl } = await import("@/lib/media-hosts");
      expect(isAllowedRemoteMediaUrl("http://firebasestorage.googleapis.com/v0/b/test/image.png")).toBe(false);
    });

    it("returns false for a valid https URL with a disallowed host", async () => {
      vi.doMock("@/lib/firebase-runtime", () => ({
        FIREBASE_STORAGE_BUCKET: "test-bucket.appspot.com",
      }));
      const { isAllowedRemoteMediaUrl } = await import("@/lib/media-hosts");
      expect(isAllowedRemoteMediaUrl("https://evil.com/image.png")).toBe(false);
      expect(isAllowedRemoteMediaUrl("https://example.com/test")).toBe(false);
    });

    it("returns false for malformed URLs", async () => {
      vi.doMock("@/lib/firebase-runtime", () => ({
        FIREBASE_STORAGE_BUCKET: "test-bucket.appspot.com",
      }));
      const { isAllowedRemoteMediaUrl } = await import("@/lib/media-hosts");
      expect(isAllowedRemoteMediaUrl("not-a-url")).toBe(false);
      expect(isAllowedRemoteMediaUrl("")).toBe(false);
    });
  });
});
