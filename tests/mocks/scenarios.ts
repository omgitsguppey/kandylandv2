import type { CreatorMessage, CreatorMessageThread, CreatorSettings, Drop, UserProfile } from "@/types/db";

export const KANDYDROPS_MSW_NOW = Date.UTC(2026, 4, 4, 16, 0, 0);

export type KandyDropsMswAuthState = "guest" | "authenticated";

export type KandyDropsMswNotification = {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  readBy: string[];
  createdAtMs: number;
  link?: string;
  dropContext?: {
    dropId: string;
    dropTitle: string;
    previewImageUrl: string;
  };
};

export type KandyDropsMswSupportMessage = {
  id: string;
  threadId: string;
  senderRole: "user" | "admin";
  senderId: string;
  senderLabel: string;
  body: string;
  createdAt: number;
};

export type KandyDropsMswSupportThread = {
  id: string;
  userId: string;
  userEmail: string | null;
  userDisplayName: string | null;
  subject: string;
  category: "general" | "bug" | "billing" | "creator" | "safety";
  status: "waiting_on_support" | "waiting_on_user" | "resolved";
  sourcePath: string | null;
  unreadForUser: number;
  unreadForAdmin: number;
  createdAt: number;
  updatedAt: number;
};

export type KandyDropsMswCreatorProfile = {
  uid: string;
  displayName: string;
  username: string;
  photoURL: string | null;
  bannerUrl?: string;
  bio?: string;
  isVerified: boolean;
  followerCount: number;
  creatorSettings: CreatorSettings;
};

export type KandyDropsMswWalletPackage = {
  id: string;
  name: string;
  drops: number;
  price: number;
  paidGumDrops: number;
  bonusGumDrops: number;
};

export type KandyDropsMswScenario = {
  name: string;
  label: string;
  authState: KandyDropsMswAuthState;
  viewerId: string | null;
  profile: UserProfile | null;
  balance: {
    totalGd: number;
    paidGd: number;
    rewardGd: number;
  };
  drops: Drop[];
  walletPackages: KandyDropsMswWalletPackage[];
  creatorProfile: KandyDropsMswCreatorProfile;
  creatorDrops: Drop[];
  notifications: KandyDropsMswNotification[];
  chat: {
    threads: CreatorMessageThread[];
    messagesByThreadId: Record<string, CreatorMessage[]>;
    pricingByThreadId: Record<string, {
      textPriceGd: number;
      imagePriceGd: number;
      videoPriceGd: number;
      purchasedBalanceGd: number;
      subscriberFreeChatApplies: boolean;
      subscriberFreeChatEnabled: boolean;
    }>;
  };
  support: {
    threads: KandyDropsMswSupportThread[];
    messagesByThreadId: Record<string, KandyDropsMswSupportMessage[]>;
  };
};

function buildProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    uid: "user_enough_gumdrops",
    email: "fan@example.com",
    displayName: "Kandy Fan",
    username: "kandyfan",
    photoURL: null,
    role: "user",
    gumDropsBalance: 2_500,
    gumDropsPurchasedBalance: 2_500,
    gumDropsRewardBalance: 0,
    unlockedContent: [],
    createdAt: KANDYDROPS_MSW_NOW - 30 * 86_400_000,
    onboardingCompleted: true,
    status: "active",
    ...overrides,
  };
}

const creatorSettings: CreatorSettings = {
  messagingEnabled: true,
  broadcastsEnabled: true,
  subscriptionsEnabled: true,
  bookingsEnabled: true,
  customRequestsEnabled: true,
  subscriptionPriceGd: 1_500,
  phoneRatePerMinuteGd: 125,
  videoRatePerMinuteGd: 200,
  bookingMinimumMinutes: 20,
  videoSubscriberDiscountPercent: 15,
  chatFreeForSubscribers: false,
  requestCategories: [
    {
      id: "sweet-note",
      label: "Sweet note",
      description: "A short custom note.",
      priceGd: 750,
      enabled: true,
    },
  ],
  availabilityTimezone: "America/Chicago",
  availabilityWindows: [
    {
      id: "friday-evening",
      dayOfWeek: 5,
      startHour: 18,
      startMinute: 0,
      endHour: 21,
      endMinute: 0,
      serviceTypes: ["phone", "video"],
    },
  ],
};

const creatorProfile: KandyDropsMswCreatorProfile = {
  uid: "creator_caramel",
  displayName: "Caramel Kandy",
  username: "caramelkandy",
  photoURL: "/fixtures/creator-caramel-avatar.jpg",
  bannerUrl: "/fixtures/creator-caramel-banner.jpg",
  bio: "Premium Drops and sweet access windows.",
  isVerified: true,
  followerCount: 128,
  creatorSettings,
};

function buildDrop(id: string, overrides: Partial<Drop> = {}): Drop {
  return {
    id,
    creatorId: creatorProfile.uid,
    title: id === "drop_affordable" ? "Caramel Vault Drop" : "Late Night Sugar Drop",
    description: "A deterministic Drop fixture for public beta user-flow tests.",
    imageUrl: `/fixtures/${id}-cover.jpg`,
    contentUrl: `/fixtures/${id}-locked-placeholder.jpg`,
    unlockCost: 500,
    validFrom: KANDYDROPS_MSW_NOW - 60_000,
    validUntil: KANDYDROPS_MSW_NOW + 86_400_000,
    status: "active",
    approvalStatus: "approved",
    totalUnlocks: 18,
    totalViews: 140,
    type: "content",
    tags: ["Sweet"],
    mediaCounts: {
      images: 2,
      videos: 1,
    },
    ...overrides,
  };
}

const drops = [
  buildDrop("drop_affordable"),
  buildDrop("drop_refill_needed", {
    title: "Purple Sugar Lockbox",
    unlockCost: 900,
    totalUnlocks: 7,
    totalViews: 92,
  }),
];

const creatorDrops = [
  buildDrop("creator_drop_caramel_1", {
    title: "Creator Caramel Set",
    unlockCost: 650,
    totalUnlocks: 21,
    totalViews: 210,
  }),
  buildDrop("creator_drop_caramel_2", {
    title: "Creator Behind The Wrapper",
    unlockCost: 850,
    totalUnlocks: 9,
    totalViews: 188,
  }),
];

const walletPackages: KandyDropsMswWalletPackage[] = [
  {
    id: "sweet-pack",
    name: "Sweet Pack",
    drops: 550,
    price: 5,
    paidGumDrops: 500,
    bonusGumDrops: 50,
  },
  {
    id: "vault-pack",
    name: "Vault Pack",
    drops: 5_000,
    price: 25,
    paidGumDrops: 2_500,
    bonusGumDrops: 2_500,
  },
];

const chatThreadId = "creator_creator_caramel__user_user_enough_gumdrops";

const chatThread: CreatorMessageThread = {
  id: chatThreadId,
  creatorId: creatorProfile.uid,
  userId: "user_enough_gumdrops",
  creatorDisplayName: creatorProfile.displayName,
  creatorUsername: creatorProfile.username,
  creatorPhotoURL: creatorProfile.photoURL,
  userDisplayName: "Kandy Fan",
  userUsername: "kandyfan",
  userPhotoURL: null,
  lastMessageAt: KANDYDROPS_MSW_NOW - 60_000,
  lastMessagePreview: "The next Drop window is open.",
  messageCount: 2,
  lastMessageSenderRole: "creator",
  lastReadByUserAt: KANDYDROPS_MSW_NOW - 120_000,
  lastReadByCreatorAt: KANDYDROPS_MSW_NOW - 90_000,
  unreadCountForUser: 1,
  unreadCountForCreator: 0,
  subscriberChatFree: false,
};

const chatMessages: CreatorMessage[] = [
  {
    id: "chat_message_1",
    threadId: chatThreadId,
    creatorId: creatorProfile.uid,
    userId: "user_enough_gumdrops",
    senderRole: "creator",
    messageKind: "text",
    text: "The next Drop window is open.",
    costGd: 0,
    createdAt: KANDYDROPS_MSW_NOW - 60_000,
  },
  {
    id: "chat_message_2",
    threadId: chatThreadId,
    creatorId: creatorProfile.uid,
    userId: "user_enough_gumdrops",
    senderRole: "user",
    messageKind: "text",
    text: "Saved it for tonight.",
    costGd: 25,
    createdAt: KANDYDROPS_MSW_NOW - 30_000,
  },
];

const supportThread: KandyDropsMswSupportThread = {
  id: "support_thread_bug_report",
  userId: "user_enough_gumdrops",
  userEmail: "fan@example.com",
  userDisplayName: "Kandy Fan",
  subject: "Bug report from Drops",
  category: "bug",
  status: "waiting_on_support",
  sourcePath: "/drops",
  unreadForUser: 0,
  unreadForAdmin: 1,
  createdAt: KANDYDROPS_MSW_NOW - 300_000,
  updatedAt: KANDYDROPS_MSW_NOW - 120_000,
};

const supportMessages: KandyDropsMswSupportMessage[] = [
  {
    id: "support_message_user_1",
    threadId: supportThread.id,
    senderRole: "user",
    senderId: supportThread.userId,
    senderLabel: "Kandy Fan",
    body: "The Drop preview CTA did not respond on first tap.",
    createdAt: KANDYDROPS_MSW_NOW - 300_000,
  },
];

function baseScenario(overrides: Partial<KandyDropsMswScenario> = {}): KandyDropsMswScenario {
  const profile = buildProfile();
  return {
    name: "logged-in-user-with-enough-gumdrops",
    label: "Logged-in user with enough GumDrops",
    authState: "authenticated",
    viewerId: profile.uid,
    profile,
    balance: {
      totalGd: profile.gumDropsBalance,
      paidGd: profile.gumDropsPurchasedBalance ?? 0,
      rewardGd: profile.gumDropsRewardBalance ?? 0,
    },
    drops,
    walletPackages,
    creatorProfile,
    creatorDrops,
    notifications: [
      {
        id: "notification_unread_drop",
        title: "Drop ready",
        message: "A Drop is ready to unwrap.",
        type: "success",
        readBy: [],
        createdAtMs: KANDYDROPS_MSW_NOW - 10_000,
        link: "/drops/drop_affordable/preview",
        dropContext: {
          dropId: "drop_affordable",
          dropTitle: "Caramel Vault Drop",
          previewImageUrl: "/fixtures/drop_affordable-cover.jpg",
        },
      },
    ],
    chat: {
      threads: [chatThread],
      messagesByThreadId: {
        [chatThreadId]: chatMessages,
      },
      pricingByThreadId: {
        [chatThreadId]: {
          textPriceGd: 25,
          imagePriceGd: 75,
          videoPriceGd: 150,
          purchasedBalanceGd: profile.gumDropsPurchasedBalance ?? 0,
          subscriberFreeChatApplies: false,
          subscriberFreeChatEnabled: false,
        },
      },
    },
    support: {
      threads: [supportThread],
      messagesByThreadId: {
        [supportThread.id]: supportMessages,
      },
    },
    ...overrides,
  };
}

export const kandyDropsMswScenarios = {
  guestBrowsingDrops: baseScenario({
    name: "guest-browsing-drops",
    label: "Guest browsing Drops",
    authState: "guest",
    viewerId: null,
    profile: null,
    balance: {
      totalGd: 0,
      paidGd: 0,
      rewardGd: 0,
    },
    notifications: [],
    chat: {
      threads: [],
      messagesByThreadId: {},
      pricingByThreadId: {},
    },
    support: {
      threads: [],
      messagesByThreadId: {},
    },
  }),
  loggedInEnoughGumDrops: baseScenario(),
  loggedInInsufficientGumDrops: baseScenario({
    name: "logged-in-user-with-insufficient-gumdrops",
    label: "Logged-in user with insufficient GumDrops",
    profile: buildProfile({
      uid: "user_insufficient_gumdrops",
      email: "shortfall@example.com",
      displayName: "Shortfall Fan",
      username: "shortfallfan",
      gumDropsBalance: 125,
      gumDropsPurchasedBalance: 125,
      gumDropsRewardBalance: 0,
    }),
    viewerId: "user_insufficient_gumdrops",
    balance: {
      totalGd: 125,
      paidGd: 125,
      rewardGd: 0,
    },
  }),
  paidRewardBalanceSplit: baseScenario({
    name: "paid-vs-reward-balance-split",
    label: "Paid balance versus reward balance split",
    profile: buildProfile({
      uid: "user_split_balance",
      email: "split@example.com",
      displayName: "Split Balance Fan",
      username: "splitbalance",
      gumDropsBalance: 1_500,
      gumDropsPurchasedBalance: 1_000,
      gumDropsRewardBalance: 500,
    }),
    viewerId: "user_split_balance",
    balance: {
      totalGd: 1_500,
      paidGd: 1_000,
      rewardGd: 500,
    },
  }),
  creatorProfileWithDropsAndExperiences: baseScenario({
    name: "creator-profile-with-drops-and-experiences-enabled",
    label: "Creator profile with Drops and Experiences enabled",
    profile: buildProfile({
      uid: "creator_caramel",
      email: "creator@example.com",
      displayName: creatorProfile.displayName,
      username: creatorProfile.username,
      role: "creator",
      isVerified: true,
      creatorSettings,
      gumDropsBalance: 8_000,
      gumDropsPurchasedBalance: 8_000,
      gumDropsRewardBalance: 0,
    }),
    viewerId: "creator_caramel",
    balance: {
      totalGd: 8_000,
      paidGd: 8_000,
      rewardGd: 0,
    },
    drops: creatorDrops,
  }),
  notificationInboxReadStates: baseScenario({
    name: "notification-inbox-with-unread-and-read-states",
    label: "Notification inbox with unread/read states",
    notifications: [
      {
        id: "notification_unread_drop",
        title: "Drop ready",
        message: "A Drop is ready to unwrap.",
        type: "success",
        readBy: [],
        createdAtMs: KANDYDROPS_MSW_NOW - 10_000,
        link: "/drops/drop_affordable/preview",
      },
      {
        id: "notification_read_creator",
        title: "Creator replied",
        message: "Caramel Kandy replied to your message.",
        type: "info",
        readBy: ["user_enough_gumdrops"],
        createdAtMs: KANDYDROPS_MSW_NOW - 120_000,
        link: "/dashboard/chat",
      },
    ],
  }),
  chatThreadWithPaidBalance: baseScenario({
    name: "chat-thread-with-paid-balance",
    label: "Chat thread with paid GumDrops balance",
  }),
  supportTicketBugReportStates: baseScenario({
    name: "support-ticket-and-bug-report-states",
    label: "Support ticket and bug report states",
  }),
} as const satisfies Record<string, KandyDropsMswScenario>;

export type KandyDropsMswScenarioName = keyof typeof kandyDropsMswScenarios;

export function cloneKandyDropsMswScenario(scenario: KandyDropsMswScenario): KandyDropsMswScenario {
  return JSON.parse(JSON.stringify(scenario)) as KandyDropsMswScenario;
}

export function getKandyDropsMswScenario(name: KandyDropsMswScenarioName): KandyDropsMswScenario {
  return cloneKandyDropsMswScenario(kandyDropsMswScenarios[name]);
}
