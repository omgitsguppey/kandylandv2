import type { User } from "firebase/auth";

import type { Drop, UserProfile } from "@/types/db";

export const guestAuthState = {
  user: null,
  userProfile: null,
};

export function buildTestUser(uid = "user_1"): User {
  return {
    uid,
    email: `${uid}@example.com`,
    displayName: "Test User",
    photoURL: null,
  } as User;
}

export function buildTestProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    uid: "user_1",
    email: "user_1@example.com",
    displayName: "Test User",
    photoURL: null,
    role: "user",
    gumDropsBalance: 1_000,
    gumDropsPurchasedBalance: 1_000,
    gumDropsRewardBalance: 0,
    unlockedContent: [],
    createdAt: 1_700_000_000_000,
    onboardingCompleted: true,
    ...overrides,
  };
}

export function loggedInUserState(overrides: Partial<UserProfile> = {}) {
  const profile = buildTestProfile(overrides);
  return {
    user: buildTestUser(profile.uid),
    userProfile: profile,
  };
}

export function adminState(overrides: Partial<UserProfile> = {}) {
  const profile = buildTestProfile({
    uid: "admin_1",
    email: "admin@example.com",
    displayName: "Admin User",
    role: "admin",
    gumDropsBalance: 100_000,
    gumDropsPurchasedBalance: 100_000,
    ...overrides,
  });
  return {
    user: buildTestUser(profile.uid),
    userProfile: profile,
  };
}

export function enoughGumDropsState(unlockCost = 500, overrides: Partial<UserProfile> = {}) {
  return loggedInUserState({
    gumDropsBalance: unlockCost + 1_000,
    gumDropsPurchasedBalance: unlockCost + 1_000,
    gumDropsRewardBalance: 0,
    ...overrides,
  });
}

export function insufficientGumDropsState(unlockCost = 500, overrides: Partial<UserProfile> = {}) {
  return loggedInUserState({
    gumDropsBalance: Math.max(0, unlockCost - 1),
    gumDropsPurchasedBalance: Math.max(0, unlockCost - 1),
    gumDropsRewardBalance: 0,
    ...overrides,
  });
}

export function buildTestDrop(overrides: Partial<Drop> = {}): Drop {
  return {
    id: "drop_1",
    title: "Public Beta Drop",
    description: "A deterministic public beta drop.",
    imageUrl: "/test-cover.jpg",
    contentUrl: "/locked-content.jpg",
    unlockCost: 500,
    validFrom: 1_700_000_000_000,
    validUntil: Date.now() + 86_400_000,
    status: "active",
    approvalStatus: "approved",
    totalUnlocks: 12,
    totalViews: 42,
    type: "content",
    tags: ["Sweet"],
    mediaCounts: {
      images: 1,
      videos: 0,
    },
    ...overrides,
  };
}

export function ownedDropState(dropId = "drop_1", overrides: Partial<UserProfile> = {}) {
  return loggedInUserState({
    gumDropsBalance: 0,
    gumDropsPurchasedBalance: 0,
    gumDropsRewardBalance: 0,
    unlockedContent: [dropId],
    unlockedContentTimestamps: {
      [dropId]: 1_700_000_000_000,
    },
    ...overrides,
  });
}
