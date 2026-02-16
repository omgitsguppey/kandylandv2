"use client";

import { createContext, useContext, useEffect, useState, useMemo, useCallback, ReactNode } from "react";
import {
    onAuthStateChanged,
    User,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence,
    signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { UserProfile } from "@/types/db";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authFetch } from "@/lib/authFetch";

interface AuthIdentityContextType {
    user: User | null;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, pass: string) => Promise<void>;
    signUpWithEmail: (email: string, pass: string, username: string, dob: string) => Promise<void>;
    logout: () => Promise<void>;
}

interface UserProfileContextType {
    userProfile: UserProfile | null;
    refreshProfile: () => Promise<void>;
    setUserProfile: (profile: UserProfile | null) => void;
}

interface AuthLoadingContextType {
    loading: boolean;
}

const AuthIdentityContext = createContext<AuthIdentityContextType | null>(null);
const UserProfileContext = createContext<UserProfileContextType | null>(null);
const AuthLoadingContext = createContext<AuthLoadingContextType | null>(null);

interface AuthContextType extends AuthIdentityContextType, UserProfileContextType, AuthLoadingContextType {}

const AuthContext = createContext<AuthContextType | null>(null);

let persistencePromise: Promise<void> | null = null;

function ensureAuthPersistence() {
    if (!persistencePromise) {
        persistencePromise = setPersistence(auth, browserLocalPersistence).catch((error) => {
            persistencePromise = null;
            throw error;
        });
    }

    return persistencePromise;
}

function normalizeUserProfile(raw: unknown, user: User): UserProfile | null {
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

async function fetchUserProfile(user: User): Promise<UserProfile | null> {
    const [{ db }, { doc, getDoc }] = await Promise.all([
        import("@/lib/firebase-data"),
        import("firebase/firestore"),
    ]);

    const profileDocRef = doc(db, "users", user.uid);
    const profileSnapshot = await getDoc(profileDocRef);

    if (!profileSnapshot.exists()) {
        return null;
    }

    return normalizeUserProfile(profileSnapshot.data(), user);
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        ensureAuthPersistence().catch((error) => {
            console.error("Auth persistence failed:", error);
        });

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                setUserProfile(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const fetchProfile = useCallback(async () => {
        if (!user) return;

        try {
            const profile = await fetchUserProfile(user);

            if (profile) {
                if ((profile.status === "banned" || profile.status === "suspended") && window.location.pathname !== "/") {
                    await signOut(auth);
                    alert(`Your account has been ${profile.status}.\nReason: ${profile.statusReason || "Violation of terms."}`);
                    window.location.href = "/";
                    return;
                }

                setUserProfile(profile);
                return;
            }

            const response = await authFetch("/api/user/register", {
                method: "POST",
                body: JSON.stringify({
                    displayName: user.displayName || "User",
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to auto-create profile via API");
            }

            const refreshedProfile = await fetchUserProfile(user);
            setUserProfile(refreshedProfile);
        } catch (err) {
            console.error("Error fetching profile:", err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchProfile();
            return;
        }

        setLoading(false);
    }, [user, fetchProfile]);

    const refreshProfile = async () => {
        await fetchProfile();
    };

    const signInWithGoogle = async () => {
        try {
            await ensureAuthPersistence();
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: "select_account" });

            await signInWithPopup(auth, provider);
            toast.success("Welcome back!");
            router.push("/dashboard");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Login failed";
            console.error("Login failed", error);
            toast.error(message);
        }
    };

    const signInWithEmail = async (email: string, pass: string) => {
        await ensureAuthPersistence();
        await signInWithEmailAndPassword(auth, email, pass);
        toast.success("Welcome back!");
        router.push("/dashboard");
    };

    const signUpWithEmail = async (email: string, pass: string, username: string, dob: string) => {
        await ensureAuthPersistence();
        await createUserWithEmailAndPassword(auth, email, pass);

        const response = await authFetch("/api/user/register", {
            method: "POST",
            body: JSON.stringify({
                displayName: username,
                username: username.replace(/\s+/g, "").toLowerCase(),
                dateOfBirth: dob,
                welcomeBonus: true,
            }),
        });

        if (!response.ok) {
            const result = (await response.json()) as { error?: string };
            throw new Error(result.error || "Registration failed");
        }

        toast.success("Account created! +100 Gum Drops");
        router.push("/dashboard");
    };

    const logout = async () => {
        await signOut(auth);
        router.push("/");
    };

    const identityValue = useMemo(
        () => ({
            user,
            signInWithGoogle,
            signInWithEmail,
            signUpWithEmail,
            logout,
        }),
        [user]
    );

    const profileValue = useMemo(
        () => ({
            userProfile,
            refreshProfile,
            setUserProfile,
        }),
        [userProfile]
    );

    const loadingValue = useMemo(
        () => ({
            loading,
        }),
        [loading]
    );

    const combinedValue = useMemo(
        () => ({
            ...identityValue,
            ...profileValue,
            ...loadingValue,
        }),
        [identityValue, profileValue, loadingValue]
    );

    return (
        <AuthContext.Provider value={combinedValue}>
            <AuthIdentityContext.Provider value={identityValue}>
                <UserProfileContext.Provider value={profileValue}>
                    <AuthLoadingContext.Provider value={loadingValue}>{children}</AuthLoadingContext.Provider>
                </UserProfileContext.Provider>
            </AuthIdentityContext.Provider>
        </AuthContext.Provider>
    );
}

export const useAuthIdentity = () => {
    const context = useContext(AuthIdentityContext);
    if (!context) throw new Error("useAuthIdentity must be used within AuthProvider");
    return context;
};

export const useUserProfile = () => {
    const context = useContext(UserProfileContext);
    if (!context) throw new Error("useUserProfile must be used within AuthProvider");
    return context;
};

export const useAuthLoading = () => {
    const context = useContext(AuthLoadingContext);
    if (!context) throw new Error("useAuthLoading must be used within AuthProvider");
    return context;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};
