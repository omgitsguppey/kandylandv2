export type KnownAccessibilityBaseline = {
  id: string;
  expectedCount?: number;
  expectedCounts?: number[];
  expectedCountByProject?: Record<string, number>;
};

export const KNOWN_ACCESSIBILITY_BASELINE: Record<string, KnownAccessibilityBaseline[]> = {
  home: [],
  creatorApply: [
    { id: "landmark-main-is-top-level", expectedCount: 1 },
    { id: "landmark-no-duplicate-main", expectedCount: 1 },
    { id: "landmark-unique", expectedCount: 1 },
  ],
  creatorWaitlistGuest: [
    { id: "landmark-main-is-top-level", expectedCount: 1 },
    { id: "landmark-no-duplicate-main", expectedCount: 1 },
    { id: "landmark-unique", expectedCount: 1 },
  ],
  privacy: [
    { id: "link-in-text-block", expectedCount: 4 },
  ],
};
