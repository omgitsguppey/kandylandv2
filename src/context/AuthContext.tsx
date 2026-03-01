"use client";

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from "react";
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
import { normalizeUserProfile } from "@/lib/user-utils";
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

    useEffect(() => {
        ensureAuthPersistence().catch((error) => {
            console.error("Auth persistence failed:", error);
        });

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            console.info("[AuthProvider] onAuthStateChanged", {
                uid: currentUser?.uid ?? null,
                isLoading: false,
            });
            setUser(currentUser);
            setLoading(false);

            if (currentUser === null) {
                setUserProfile(null);
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
                            }),
                        });
                        if (!response.ok) console.error("Auto-registration failed");
                    } catch (err) {
                        console.error("Error in auto-registration:", err);
                    }
                    // onSnapshot will trigger again once the doc is created
                }
            }, (error) => {
                console.error("Profile listener error:", error);
                setLoading(false);
            });
        };

        setupProfileListener();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user]);

    const refreshProfile = async () => {
        // No-op now as onSnapshot handles updates. 
        // Kept for backward compatibility if any component calls it.
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
        console.info("[AuthProvider] logout called");
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
