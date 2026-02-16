import { User } from "firebase/auth";
import { UserProfile } from "@/types/db";

/**
 * Normalizes a raw Firestore user document into a typed UserProfile.
 * Merges data from the Firebase User object where applicable.
 */
export function normalizeUserProfile(raw: unknown, user: User): UserProfile | null {
    if (!raw || typeof raw !== "object") {
        return null;
    }

    const source = raw as Partial<UserProfile>;

    const toStringArray = (value: unknown) =>
        Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

    return {
        uid: typeof source.uid === "string" ? source.uid : user.uid,
        email: typeof source.email === "string" || source.email === null ? source.email : user.email,
        displayName:
            typeof source.displayName === "string" || source.displayName === null
                ? source.displayName
                : user.displayName,
        username: typeof source.username === "string" ? source.username : undefined,
        dateOfBirth: typeof source.dateOfBirth === "string" ? source.dateOfBirth : undefined,
        photoURL: typeof source.photoURL === "string" || source.photoURL === null ? source.photoURL : user.photoURL,
        bannerUrl: typeof source.bannerUrl === "string" ? source.bannerUrl : undefined,
        bio: typeof source.bio === "string" ? source.bio : undefined,
        socialLinks:
            source.socialLinks && typeof source.socialLinks === "object"
                ? {
                    twitter:
                        typeof (source.socialLinks as UserProfile["socialLinks"])?.twitter === "string"
                            ? (source.socialLinks as UserProfile["socialLinks"])?.twitter
                            : undefined,
                    instagram:
                        typeof (source.socialLinks as UserProfile["socialLinks"])?.instagram === "string"
                            ? (source.socialLinks as UserProfile["socialLinks"])?.instagram
                            : undefined,
                    website:
                        typeof (source.socialLinks as UserProfile["socialLinks"])?.website === "string"
                            ? (source.socialLinks as UserProfile["socialLinks"])?.website
                            : undefined,
                }
                : undefined,
        role: source.role === "admin" || source.role === "creator" || source.role === "user" ? source.role : "user",
        isVerified: source.isVerified === true,
        gumDropsBalance: Number.isFinite(source.gumDropsBalance) ? Number(source.gumDropsBalance) : 0,
        unlockedContent: toStringArray(source.unlockedContent),
        following: toStringArray(source.following),
        createdAt: Number.isFinite(source.createdAt) ? Number(source.createdAt) : Date.now(),
        lastCheckIn: Number.isFinite(source.lastCheckIn) ? Number(source.lastCheckIn) : undefined,
        streakCount: Number.isFinite(source.streakCount) ? Number(source.streakCount) : undefined,
        status: source.status === "active" || source.status === "suspended" || source.status === "banned" ? source.status : "active",
        statusReason: typeof source.statusReason === "string" ? source.statusReason : undefined,
    };
}
