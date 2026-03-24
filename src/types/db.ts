import type { DailyTasksState } from "@/lib/tasks/task-catalog";

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    username?: string; // Explicit username (required by UI, optional in DB for initial auth)
    dateOfBirth?: string; // YYYY-MM-DD
    photoURL: string | null;
    bannerUrl?: string; // Profile Banner
    bio?: string; // Creator Bio
    role?: 'user' | 'creator' | 'admin'; // Default 'user'

    isVerified?: boolean; // Verified Creator badge
    gumDropsBalance: number;
    unlockedContent: string[]; // Array of Drop IDs
    unlockedContentTimestamps?: Record<string, number>; // Drop ID -> unwrap timestamp (ms)
    following?: string[]; // Array of Creator UIDs
    createdAt: number; // Timestamp
    lastCheckIn?: number; // Timestamp of last daily reward claim
    streakCount?: number; // Current daily streak
    status?: 'active' | 'suspended' | 'banned'; // User account status
    statusReason?: string; // Reason for suspension/ban
    onboardingCompleted?: boolean; // Tracking if new user completed the flow
    preferences?: {
        flavor: string; // 'Sweet', 'Spicy', 'RAW'
    };
    notificationSettings?: {
        inAppEnabled: boolean;
        browserPushEnabled: boolean;
        newDropAlerts: boolean;
        expiringSoonAlerts: boolean;
    };
    fcmTokens?: string[];

    privacySettings?: {
        allowRecommendations: boolean;
        showInAnonymousStats: boolean;
        anonymousAnalyticsEnabled: boolean;
        identifiedAnalyticsEnabled: boolean;
        honorGlobalPrivacyControl: boolean;
        consentUpdatedAt?: number;
        privacyPolicyVersion?: string;
    };

    accountSettings?: {
        timezone: string;
    };

    securityFlags?: {
        ripAttempts: number;
        lastViolation?: string; // ISO date
        lastViolationReason?: string; // e.g. 'screenshot_hotkey', 'window_blur'
        lastViolationDropId?: string;
        lastViolationMessage?: string;
        reasonCounts?: Record<string, number>;
    };

    dailyTasksState?: DailyTasksState;
}

export interface Drop {
    id: string;
    creatorId?: string; // Link to UserProfile.uid
    title: string;
    description: string;
    imageUrl: string;
    contentUrl: string; // Legacy fallback or preview content
    contentUrls?: string[]; // Up to 50 media payloads
    unlockCost: number;
    validFrom: number; // Timestamp
    validUntil?: number; // Timestamp (Optional - if missing, never expires)
    autoQueueOnExpire?: boolean;
    status: 'active' | 'expired' | 'scheduled';
    totalUnlocks: number;
    totalViews?: number; // Persistent viewport-based card views
    totalClicks?: number; // Promo/external link click counter
    createdAt?: number; // Added for sort/display

    // Dynamic Content Fields
    type?: 'content' | 'promo' | 'external';
    ctaText?: string;
    actionUrl?: string;
    accentColor?: string;

    // Tag System
    tags?: string[]; // 'Sweet', 'Spicy', 'RAW', etc.

    // File Metadata
    fileMetadata?: {
        size: number;
        type: string;
        dimensions?: string;
    };
    mediaCounts?: {
        images: number;
        videos: number;
    };
}

export interface Transaction {
    id: string;
    userId: string;
    amount: number;
    type: 'purchase_currency' | 'unlock_content' | 'admin_adjustment' | 'daily_reward' | 'referral_bonus' | 'onboarding_reward';
    rewardSource?: 'check_in' | 'task' | 'onboarding';
    relatedDropId?: string; // If unlocking content
    description: string;
    timestamp: number | Record<string, unknown>; // Firestore Timestamp or number
    timestampMs?: number;
    balanceBefore?: number;
    balanceAfter?: number;
    cost?: number; // USD cost for purchase transactions
    grossRevenueUsd?: number;
    grossRevenueCents?: number;
    paypalFeeUsd?: number;
    paypalFeeCents?: number;
    netRevenueUsd?: number;
    netRevenueCents?: number;
    deliveredGumDrops?: number;
    paidGumDrops?: number;
    bonusGumDrops?: number;
    retailValueUsd?: number;
    retailValueCents?: number;
    bonusValueUsd?: number;
    bonusValueCents?: number;
    adjustedProfitUsd?: number;
    adjustedProfitCents?: number;
    discountUsd?: number;
    discountCents?: number;
    effectiveUsdPer100Gd?: number;
    effectiveCentsPer100Gd?: number;
    effectiveYieldRatio?: number;
    bundleLabel?: string;
    bundleKey?: string;
    bundleTier?: string;
    currency?: string;
    status?: 'completed' | 'failed' | 'pending';
    verifiedServerSide?: boolean;
}
