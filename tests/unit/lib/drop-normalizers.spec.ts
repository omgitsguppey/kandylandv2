import { describe, it, expect } from "vitest";
import { normalizeDropRecord } from "@/lib/drop-normalizers";

describe("drop-normalizers", () => {
  describe("normalizeDropRecord", () => {
    it("normalizes a minimal valid drop record", () => {
      const now = Date.now();
      const raw = {
        validFrom: now,
      };

      const drop = normalizeDropRecord(raw, "drop-1");

      expect(drop.id).toBe("drop-1");
      expect(drop.title).toBe("Untitled Drop");
      expect(drop.description).toBe("");
      expect(drop.imageUrl).toBe("");
      expect(drop.contentUrl).toBe("");
      expect(drop.contentUrls).toEqual([]);
      expect(drop.unlockCost).toBe(0);
      expect(drop.validFrom).toBe(now);
      expect(drop.validUntil).toBe(null);
      expect(drop.autoQueueOnExpire).toBe(false);
      expect(drop.status).toBe("scheduled");
      expect(drop.totalUnlocks).toBe(0);
    });

    it("parses different timestamp formats correctly", () => {
      const ms = 1600000000000;
      const seconds = 1600000000;

      // 1. Number
      const drop1 = normalizeDropRecord({ validFrom: ms }, "d1");
      expect(drop1.validFrom).toBe(ms);

      // 2. toMillis() interface
      const drop2 = normalizeDropRecord({ validFrom: { toMillis: () => ms } }, "d2");
      expect(drop2.validFrom).toBe(ms);

      // 3. REST API _seconds/_nanoseconds format
      const drop3 = normalizeDropRecord({ validFrom: { _seconds: seconds, _nanoseconds: 0 } }, "d3");
      expect(drop3.validFrom).toBe(ms);

      // 4. REST API seconds/nanoseconds format
      const drop4 = normalizeDropRecord({ validFrom: { seconds: seconds, nanoseconds: 0 } }, "d4");
      expect(drop4.validFrom).toBe(ms);
    });

    it("handles toMillis throwing an error gracefully and falls back to failure validation if needed", () => {
      // The validation schema requires validFrom to be a finite number or a valid TimestampLike.
      // If isTimestampLike fails (e.g., toMillis throws), it shouldn't pass the schema.
      expect(() => {
        normalizeDropRecord(
          {
            validFrom: {
              toMillis: () => {
                throw new Error("Simulated failure");
              },
            },
          },
          "d-err"
        );
      }).toThrow();
    });

    it("rejects timestamp objects when the validator's first toMillis call throws", () => {
      let callCount = 0;
      expect(() => {
        normalizeDropRecord(
          {
            validFrom: {
              toMillis: () => {
                callCount += 1;
                if (callCount === 1) {
                  throw new Error("Simulated failure");
                }

                return 1600000000000;
              },
              _seconds: 1600000000,
              _nanoseconds: 0,
            },
          },
          "d-err-validator-catch",
        );
      }).toThrow();
      expect(callCount).toBe(1);
    });

    it("deduplicates contentUrls and handles contentUrl fallback", () => {
      const raw = {
        validFrom: 1000,
        contentUrl: "https://example.com/fallback.jpg",
        contentUrls: [
          "https://example.com/1.jpg",
          "https://example.com/1.jpg",
          "",
          "https://example.com/2.jpg",
        ],
      };

      const drop = normalizeDropRecord(raw, "d-urls");
      // Empty strings removed, duplicates removed
      expect(drop.contentUrls).toEqual(["https://example.com/1.jpg", "https://example.com/2.jpg"]);
      // contentUrl takes the first from contentUrls
      expect(drop.contentUrl).toBe("https://example.com/1.jpg");
    });

    it("uses contentUrl to seed contentUrls if contentUrls is missing", () => {
      const raw = {
        validFrom: 1000,
        contentUrl: "https://example.com/only.jpg",
      };

      const drop = normalizeDropRecord(raw, "d-url-fallback");
      expect(drop.contentUrls).toEqual(["https://example.com/only.jpg"]);
      expect(drop.contentUrl).toBe("https://example.com/only.jpg");
    });

    it("calculates mediaCounts fallback from legacy URLs", () => {
      const raw = {
        validFrom: 1000,
        contentUrls: [
          "https://example.com/a.jpg",
          "https://example.com/b.PNG?token=123", // Query string & uppercase
          "https://example.com/c.mp4",
          "https://example.com/d.webm",
        ],
      };

      const drop = normalizeDropRecord(raw, "d-counts");
      expect(drop.mediaCounts).toEqual({
        images: 2,
        videos: 2,
      });
    });

    it("classifies invalid legacy URL strings through the catch-path parser", () => {
      const raw = {
        validFrom: 1000,
        contentUrls: [
          "not-a-url.jpg",
          "still-not-a-url.mp4?token=123",
        ],
      };

      const drop = normalizeDropRecord(raw, "d-counts-invalid-legacy");
      expect(drop.mediaCounts).toEqual({
        images: 1,
        videos: 1,
      });
    });

    it("uses fileMetadata.type as fallback for mediaCounts calculation", () => {
      const raw = {
        validFrom: 1000,
        contentUrls: ["https://example.com/unknown-extension"],
        fileMetadata: {
          size: 100,
          type: "video/mp4",
        },
      };

      const drop = normalizeDropRecord(raw, "d-counts-meta");
      expect(drop.mediaCounts).toEqual({
        images: 0,
        videos: 1,
      });
    });

    it("uses fileMetadata.type after invalid legacy URLs fail extension parsing", () => {
      const raw = {
        validFrom: 1000,
        contentUrls: ["not-a-url-without-extension"],
        fileMetadata: {
          size: 100,
          type: "video/mp4",
        },
      };

      const drop = normalizeDropRecord(raw, "d-counts-invalid-legacy-meta");
      expect(drop.mediaCounts).toEqual({
        images: 0,
        videos: 1,
      });
    });

    it("keeps existing mediaCounts if provided", () => {
      const raw = {
        validFrom: 1000,
        contentUrls: ["https://example.com/a.jpg"],
        mediaCounts: {
          images: 5,
          videos: 10,
        },
      };

      const drop = normalizeDropRecord(raw, "d-counts-existing");
      expect(drop.mediaCounts).toEqual({
        images: 5,
        videos: 10,
      });
    });
  });
});
