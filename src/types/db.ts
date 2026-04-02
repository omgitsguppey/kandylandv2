import type { DailyTasksState } from "@/lib/tasks/task-catalog";
import type {
    CreatorOnboardingApprovalStatus,
    CreatorOnboardingIdStatus,
    CreatorOnboardingLegalStatus,
    CreatorOnboardingSegmentStatus,
    CreatorOnboardingSubmissionStatus,
} from "@/lib/creator-onboarding";

export type CreatorRequestCategoryConfig = {
    id: string;
    label: string;
    description?: string;
    priceGd: number;
    enabled: boolean;
};

export type CreatorAvailabilityWindow = {
    id: string;
    dayOfWeek: number; // 0-6
    startHour: number; // 0-23
    startMinute: number; // 0-59
    endHour: number; // 0-23
    endMinute: number; // 0-59
    serviceTypes: Array<"phone" | "video">;
};

export type CreatorSettings = {
    messagingEnabled: boolean;
    broadcastsEnabled: boolean;
    subscriptionsEnabled: boolean;
    bookingsEnabled: boolean;
    customRequestsEnabled: boolean;
    subscriptionPriceGd: number;
    phoneRatePerMinuteGd: number;
    videoRatePerMinuteGd: number;
    bookingMinimumMinutes: number;
    videoSubscriberDiscountPercent: number;
    chatFreeForSubscribers: boolean;
    requestCategories: CreatorRequestCategoryConfig[];
    availabilityTimezone: string;
    availabilityWindows: CreatorAvailabilityWindow[];
};

export type CreatorRestrictions = {
    messagingRestricted: boolean;
    broadcastsRestricted: boolean;
    subscriptionsRestricted: boolean;
    bookingsRestricted: boolean;
    customRequestsRestricted: boolean;
    dropSubmissionsRestricted: boolean;
    payoutsRestricted: boolean;
    moderationNote?: string;
};

export type CreatorRelationship = {
    id: string;
    userId: string;
    creatorId: string;
    following: boolean;
    favorited: boolean;
    notificationsEnabled: boolean;
    createdAt: number;
    updatedAt: number;
    creatorDisplayName?: string;
    creatorUsername?: string;
    creatorPhotoURL?: string | null;
};

export type CreatorRelationshipCounts = {
    followerCount: number;
    favoriteCount: number;
    notificationsEnabledCount: number;
};

export type CreatorSubscription = {
    id: string;
    creatorId: string;
    userId: string;
    status: "active" | "lapsed" | "canceled";
    priceGd: number;
    startedAt: number;
    renewAt: number;
    renewedAt?: number;
    canceledAt?: number;
    warningSentAt?: number;
    autoRenew: boolean;
    purchasedOnly: boolean;
};

export type CreatorMessageThread = {
    id: string;
    creatorId: string;
    userId: string;
    lastMessageAt: number;
    lastMessagePreview: string;
    messageCount: number;
    lastReadByUserAt?: number;
    lastReadByCreatorAt?: number;
    subscriberChatFree: boolean;
};

export type CreatorMessage = {
    id: string;
    threadId: string;
    creatorId: string;
    userId: string;
    senderRole: "user" | "creator" | "admin";
    messageKind: "text" | "image" | "video" | "broadcast";
    text?: string;
    assetUrl?: string;
    assetName?: string;
    assetMimeType?: string;
    costGd: number;
    creatorAccrualId?: string;
    createdAt: number;
    unsentAt?: number;
    unsentBy?: string;
    moderationRemovedAt?: number;
    moderationRemovedBy?: string;
};

export type CreatorBroadcast = {
    id: string;
    creatorId: string;
    title: string;
    body: string;
    mediaUrl?: string;
    mediaMimeType?: string;
    createdAt: number;
    followerCount: number;
};

export type CreatorCustomRequest = {
    id: string;
    creatorId: string;
    userId: string;
    categoryId: string;
    categoryLabel: string;
    details: string;
    priceGd: number;
    status: "pending" | "accepted" | "declined" | "fulfilled";
    creatorAccrualId?: string;
    createdAt: number;
    respondedAt?: number;
    responseNote?: string;
};

export type CreatorCallBooking = {
    id: string;
    creatorId: string;
    userId: string;
    serviceType: "phone" | "video";
    status: "booked" | "completed" | "canceled";
    startAt: number;
    endAt: number;
    durationMinutes: number;
    slotKey: string;
    priceGd: number;
    subscriberDiscountApplied: boolean;
    creatorAccrualId?: string;
    createdAt: number;
    externalHandle?: string;
};

export type CreatorLedgerAccrual = {
    id: string;
    creatorId: string;
    userId: string;
    sourceType: "message" | "subscription" | "custom_request" | "booking_phone" | "booking_video";
    sourceId: string;
    grossSpendGd: number;
    creatorShareGd: number;
    cashoutValueUsd: number;
    status: "accrued" | "requested" | "honored";
    createdAt: number;
    requestedAt?: number;
    honoredAt?: number;
};

export type CreatorPayoutRequest = {
    id: string;
    creatorId: string;
    requestedGd: number;
    requestedUsd: number;
    status: "pending" | "honored" | "rejected";
    createdAt: number;
    reviewedAt?: number;
    reviewNote?: string;
};

export type CreatorOnboardingBlockingReason =
    | "awaiting_legal"
    | "awaiting_id_request"
    | "awaiting_id_submission"
    | "awaiting_id_review"
    | "awaiting_segment_assignment"
    | "approval_needs_changes"
    | "approval_rejected"
    | "role_activation_blocked";

export type CreatorApplicationStatus = CreatorOnboardingSubmissionStatus;

export type CreatorLegalDocumentStatus = CreatorOnboardingLegalStatus;

export type CreatorIdVerificationStatus = CreatorOnboardingIdStatus;

export type CreatorSegmentationStatus = CreatorOnboardingSegmentStatus;

export type CreatorApprovalStatus = CreatorOnboardingApprovalStatus;

export type CreatorIdDocumentRecord = {
    fileName: string;
    storagePath: string;
    contentType: string;
    sizeBytes: number;
    uploadedAt: number;
    uploadedByUid: string;
    reviewNote?: string;
    reviewedAt?: number;
};

export type CreatorIdDocumentSide = "front" | "back";

export type CreatorIdDocuments = Partial<Record<CreatorIdDocumentSide, CreatorIdDocumentRecord>>;

export type CreatorApplication = {
    signupType: "creator";
    submissionStatus: CreatorApplicationStatus;
    approvalStatus: CreatorApprovalStatus;
    queuePosition: number;
    onboardingStartedAt: number;
    submittedAt: number;
    onboardingSubmittedAt: number;
    awaitingManualReviewAt: number;
    updatedAt: number;
    creatorDisplayName: string;
    creatorPrimaryPlatform?: string;
    creatorContentFocus?: string;
    bypassFanOnboarding: boolean;
    legalStatus: CreatorLegalDocumentStatus;
    legalDocumentUrl?: string;
    legalDocumentSentAt?: number;
    legalDocumentSignedAt?: number;
    idVerificationStatus: CreatorIdVerificationStatus;
    idVerificationRequestedAt?: number;
    idVerificationSubmittedAt?: number;
    idVerificationReviewedAt?: number;
    idDocument?: CreatorIdDocumentRecord;
    idDocuments?: CreatorIdDocuments;
    segmentationStatus: CreatorSegmentationStatus;
    segmentLabel?: string;
    segmentAssignedAt?: number;
    reviewedBy?: string;
    adminNotes?: string;
    blockingReasons?: CreatorOnboardingBlockingReason[];
    readyForApproval?: boolean;
    creatorReviewQueueVisible?: boolean;
};

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
    gumDropsPurchasedBalance?: number;
    gumDropsRewardBalance?: number;
    unlockedContent: string[]; // Array of Drop IDs
    unlockedContentTimestamps?: Record<string, number>; // Drop ID -> unwrap timestamp (ms)
    following?: string[]; // Array of Creator UIDs
    favoriteCreators?: string[];
    creatorNotificationPreferences?: Record<string, boolean>;
    createdAt: number; // Timestamp
    lastCheckIn?: number; // Timestamp of last daily reward claim
    streakCount?: number; // Current daily streak
    status?: 'active' | 'suspended' | 'banned'; // User account status
    statusReason?: string; // Reason for suspension/ban
    onboardingCompleted?: boolean; // Tracking if new user completed the flow
    creatorApplication?: CreatorApplication;
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
    creatorSettings?: CreatorSettings;
    creatorRestrictions?: CreatorRestrictions;
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
    approvalStatus?: 'approved' | 'pending_review' | 'rejected';
    approvalReviewedAt?: number;
    approvalReviewedBy?: string;
    approvalNote?: string;
    submittedByCreatorId?: string;
    requiresActiveSubscription?: boolean;
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
    coverFileName?: string;
    contentFileNames?: string[];
    mediaCounts?: {
        images: number;
        videos: number;
    };
}

export interface Transaction {
    id: string;
    userId: string;
    amount: number;
    type: 'purchase_currency' | 'unlock_content' | 'admin_adjustment' | 'daily_reward' | 'referral_bonus' | 'onboarding_reward' | 'creator_message_text' | 'creator_message_image' | 'creator_message_video' | 'creator_subscription' | 'creator_subscription_renewal' | 'creator_custom_request' | 'creator_booking_phone' | 'creator_booking_video';
    rewardSource?: 'check_in' | 'task' | 'onboarding';
    relatedDropId?: string; // If unlocking content
    creatorId?: string;
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
    purchasedAmountSpent?: number;
    rewardAmountSpent?: number;
    ledgerSource?: 'purchased' | 'reward' | 'mixed';
    creatorRevenueShareGd?: number;
    creatorRevenueShareUsd?: number;
    creatorAccrualId?: string;
}
