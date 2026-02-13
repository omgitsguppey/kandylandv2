export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    username?: string; // Explicit username (required by UI, optional in DB for initial auth)
    dateOfBirth?: string; // YYYY-MM-DD
    photoURL: string | null;
    bannerUrl?: string; // Profile Banner
    bio?: string; // Creator Bio
    socialLinks?: {
        twitter?: string;
        instagram?: string;
        website?: string;
    };
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
    validUntil: number; // Timestamp
    status: 'active' | 'expired' | 'scheduled';
    totalUnlocks: number;

    // Dynamic Content Fields
    type?: 'content' | 'promo' | 'external';
    ctaText?: string;
    actionUrl?: string;
    accentColor?: string;

    // File Metadata
    fileMetadata?: {
        size: number;
        type: string;
        dimensions?: string;
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
