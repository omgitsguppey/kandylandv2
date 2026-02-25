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
    following?: string[]; // Array of Creator UIDs
    createdAt: number; // Timestamp
    lastCheckIn?: number; // Timestamp of last daily reward claim
    streakCount?: number; // Current daily streak
    status?: 'active' | 'suspended' | 'banned'; // User account status
    statusReason?: string; // Reason for suspension/ban

    securityFlags?: {
        ripAttempts: number;
        lastViolation?: string; // ISO date
        lastViolationReason?: string; // e.g. 'screenshot_hotkey', 'window_blur'
        lastViolationDropId?: string;
    };
}

export interface Drop {
    id: string;
    creatorId?: string; // Link to UserProfile.uid
    title: string;
    description: string;
    imageUrl: string;
    contentUrl: string; // The secret content to unlock
    unlockCost: number;
    validFrom: number; // Timestamp
    validUntil?: number; // Timestamp (Optional - if missing, never expires)
    status: 'active' | 'expired' | 'scheduled';
    totalUnlocks: number;
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

    // Auto-Rotation Config
    rotationConfig?: {
        enabled: boolean;
        intervalDays: number;   // total cycle length (e.g., 7 = weekly)
        durationDays: number;   // how long each active window lasts
        maxRotations?: number;  // optional cap (undefined = forever)
        rotationCount: number;  // how many times it has rotated so far
    };
}

export interface Transaction {
    id: string;
    userId: string;
    amount: number;
    type: 'purchase_currency' | 'unlock_content' | 'admin_adjustment';
    relatedDropId?: string; // If unlocking content
    description: string;
    timestamp: number | any; // Firestore Timestamp or number
}
