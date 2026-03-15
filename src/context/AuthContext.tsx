"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
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
import { auth, app } from "@/lib/firebase";
import { UserProfile } from "@/types/db";
import { normalizeUserProfile } from "@/lib/user-utils";
import { useRouter, usePathname } from "next/navigation";
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

interface AuthContextType extends AuthIdentityContextType, UserProfileContextType, AuthLoadingContextType { }

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



export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        ensureAuthPersistence().catch(() => { });

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);

            if (currentUser === null) {
                setUserProfile(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) {
            setUserProfile(null);
            setLoading(false);
            return;
        }

        let unsubscribe: () => void;

        const setupProfileListener = async () => {
            const { db } = await import("@/lib/firebase-data");
            const { doc, onSnapshot } = await import("firebase/firestore");

            const profileDocRef = doc(db, "users", user.uid);

            unsubscribe = onSnapshot(profileDocRef, async (snapshot) => {
                if (snapshot.exists()) {
                    const profile = normalizeUserProfile(snapshot.data(), user);

                    if (profile && (profile.status === "banned" || profile.status === "suspended") && window.location.pathname !== "/") {
                        await signOut(auth);
                        alert(`Your account has been ${profile.status}.\nReason: ${profile.statusReason || "Violation of terms."}`);
                        window.location.href = "/";
                        return;
                    }

                    if (profile) {
                        setUserProfile(profile);
                        setLoading(false);
                    }
                } else {

                    // Profile doesn't exist yet, trigger auto-registration
                    try {
                        const response = await authFetch("/api/user/register", {
                            method: "POST",
                            body: JSON.stringify({
                                displayName: user.displayName || "User",
                                referredBy: typeof window !== "undefined" ? sessionStorage.getItem("kandy_referral") : undefined,
                            }),
                        });
                        // Do not set loading false here immediately; let the onSnapshot retry handle it 
                        // when the creation resolves.
                    } catch (err) {
                        setLoading(false);
                    }
                    // onSnapshot will trigger again once the doc is created
                }
            }, () => {
                setLoading(false);
            });
        };

        setupProfileListener();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user]);

    const refreshProfile = useCallback(async () => {
        // No-op now as onSnapshot handles updates. 
        // Kept for backward compatibility if any component calls it.
    }, []);


    const signInWithGoogle = useCallback(async () => {
        try {
            await ensureAuthPersistence();
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: "select_account" });

            await signInWithPopup(auth, provider);

            toast.success("Welcome back!");
            if (pathname === "/") {
                router.push("/dashboard");
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Login failed";
            toast.error(message);
            throw error;
        }
    }, [pathname, router]);

    const signInWithEmail = useCallback(async (email: string, pass: string) => {
        try {
            await ensureAuthPersistence();
            await signInWithEmailAndPassword(auth, email, pass);


            toast.success("Welcome back!");
            if (pathname === "/") {
                router.push("/dashboard");
            }
        } catch (error: unknown) {
            throw error;
        }
    }, [pathname, router]);

    const signUpWithEmail = useCallback(async (email: string, pass: string, username: string, dob: string) => {
        try {
            await ensureAuthPersistence();
            await createUserWithEmailAndPassword(auth, email, pass);

            const response = await authFetch("/api/user/register", {
                method: "POST",
                body: JSON.stringify({
                    displayName: username,
                    username,
                    dateOfBirth: dob,
                    welcomeBonus: true,
                    referredBy: typeof window !== "undefined" ? sessionStorage.getItem("kandy_referral") : undefined,
                }),
            });

            if (!response.ok) {
                const result = (await response.json()) as { error?: string };
                throw new Error(result.error || "Registration failed");
            }


            toast.success("Account created! +100 Gum Drops");
            if (pathname === "/") {
                router.push("/dashboard");
            }
        } catch (error: unknown) {
            throw error;
        }
    }, [pathname, router]);

    const logout = useCallback(async () => {
        await signOut(auth);
        router.push("/");
    }, [router]);

    const identityValue = useMemo(
        () => ({
            user,
            signInWithGoogle,
            signInWithEmail,
            signUpWithEmail,
            logout,
        }),
        [logout, signInWithEmail, signInWithGoogle, signUpWithEmail, user]
    );

    const profileValue = useMemo(
        () => ({
            userProfile,
            refreshProfile,
            setUserProfile,
        }),
        [refreshProfile, userProfile]
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
