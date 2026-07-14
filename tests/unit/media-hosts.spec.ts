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
      expect(hosts).toContain("test-bucket.appspot.com.storage.googleapis.com");
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

  describe("Firebase Storage media URLs", () => {
    it("parses supported Firebase download URL forms without widening to arbitrary hosts", async () => {
      vi.doMock("@/lib/firebase-runtime", () => ({
        FIREBASE_STORAGE_BUCKET: "test-bucket.appspot.com",
      }));
      const {
        isFirebaseStorageMediaUrl,
        resolveFirebaseStorageMediaLocation,
      } = await import("@/lib/media-hosts");

      expect(resolveFirebaseStorageMediaLocation(
        "https://firebasestorage.googleapis.com/v0/b/test-bucket.appspot.com/o/creator%2Fmessages%2Ffan_1%2Fthread_1%2Fimage.png?alt=media&token=test",
      )).toEqual({
        bucket: "test-bucket.appspot.com",
        objectPath: "creator/messages/fan_1/thread_1/image.png",
      });
      expect(resolveFirebaseStorageMediaLocation(
        "https://storage.googleapis.com/test-bucket.appspot.com/creator/messages/fan_1/thread_1/video.mp4",
      )).toEqual({
        bucket: "test-bucket.appspot.com",
        objectPath: "creator/messages/fan_1/thread_1/video.mp4",
      });
      expect(resolveFirebaseStorageMediaLocation(
        "https://test-bucket.appspot.com.storage.googleapis.com/creator/messages/fan_1/thread_1/video.mp4",
      )).toEqual({
        bucket: "test-bucket.appspot.com",
        objectPath: "creator/messages/fan_1/thread_1/video.mp4",
      });
      expect(isFirebaseStorageMediaUrl("https://example.com/v0/b/test/o/image.png")).toBe(false);
      expect(isFirebaseStorageMediaUrl("javascript:alert(1)")).toBe(false);
      expect(isFirebaseStorageMediaUrl("data:text/html,test")).toBe(false);
    });

    it("fails closed for malformed object paths, credentials, ports, and the wrong bucket", async () => {
      vi.doMock("@/lib/firebase-runtime", () => ({
        FIREBASE_STORAGE_BUCKET: "test-bucket.appspot.com",
      }));
      const {
        isConfiguredFirebaseStorageMediaUrl,
        isFirebaseStorageMediaUrl,
        isFirebaseStorageMediaUrlForBucket,
      } = await import("@/lib/media-hosts");
      const validUrl = "https://firebasestorage.googleapis.com/v0/b/test-bucket.appspot.com/o/creator%2Fmessages%2Ffan_1%2Fthread_1%2Fimage.png?alt=media&token=test";

      expect(isConfiguredFirebaseStorageMediaUrl(validUrl)).toBe(true);
      expect(isFirebaseStorageMediaUrlForBucket(validUrl, "gs://test-bucket.appspot.com")).toBe(true);
      expect(isFirebaseStorageMediaUrlForBucket(validUrl, "other-bucket.appspot.com")).toBe(false);
      expect(isFirebaseStorageMediaUrl(
        "https://firebasestorage.googleapis.com/v0/b/test-bucket.appspot.com/o/creator%2Fmessages%2Ffan_1%2F..%2Fimage.png",
      )).toBe(false);
      expect(isFirebaseStorageMediaUrl(
        "https://user:pass@firebasestorage.googleapis.com/v0/b/test-bucket.appspot.com/o/image.png",
      )).toBe(false);
      expect(isFirebaseStorageMediaUrl(
        "https://firebasestorage.googleapis.com:444/v0/b/test-bucket.appspot.com/o/image.png",
      )).toBe(false);
    });
  });
});
