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
    signOut
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { UserProfile } from "@/types/db";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// --- Split Context Definitions ---

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

// --- Combined Context for Legacy Support ---
interface AuthContextType extends AuthIdentityContextType, UserProfileContextType, AuthLoadingContextType { }

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // 0. Ensure Persistence (First Priority)
    useEffect(() => {
        const setupPersistence = async () => {
            try {
                await setPersistence(auth, browserLocalPersistence);
            } catch (error) {
                console.error("Auth persistence failed:", error);
            }
        };
        setupPersistence();
    }, []);

    // 1. Auth Listener (Identity Only)
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                setUserProfile(null);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    // 2. Fetch Profile ONE-OFF when user changes
    const fetchProfile = useCallback(async () => {
        if (!user) return;
        try {
            const docRef = doc(db, "users", user.uid);
            const snapshot = await getDoc(docRef);
            if (snapshot.exists()) {
                const profile = snapshot.data() as UserProfile;

                // Check Status (Legacy Logic)
                if (profile.status === 'banned' || profile.status === 'suspended') {
                    if (window.location.pathname !== "/") {
                        await signOut(auth);
                        alert(`Your account has been ${profile.status}.\nReason: ${profile.statusReason || "Violation of terms."}`);
                        window.location.href = "/";
                        return;
                    }
                }

                setUserProfile(profile);
            } else {
                // Create basic profile if missing (Legacy Logic)
                const newProfile: UserProfile = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || "User",
                    photoURL: user.photoURL,
                    gumDropsBalance: 0,
                    unlockedContent: [],
                    createdAt: Date.now(),
                };
                await setDoc(docRef, newProfile, { merge: true });
                setUserProfile(newProfile);
            }
        } catch (err) {
            console.error("Error fetching profile:", err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchProfile();
        } else {
            setLoading(false);
        }
    }, [user, fetchProfile]);

    const refreshProfile = async () => {
        await fetchProfile();
    };

    // --- Auth Actions ---

    const signInWithGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            toast.success("Welcome back!");
            router.push("/dashboard");
        } catch (error: any) {
            console.error("Login failed", error);
            toast.error(error.message);
        }
    };

    const signInWithEmail = async (email: string, pass: string) => {
        await signInWithEmailAndPassword(auth, email, pass);
        toast.success("Welcome back!");
        router.push("/dashboard");
    };

    const signUpWithEmail = async (email: string, pass: string, username: string, dob: string) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const newUser = userCredential.user;

        await setDoc(doc(db, "users", newUser.uid), {
            uid: newUser.uid,
            email: newUser.email,
            displayName: username,
            dob,
            gumDropsBalance: 100, // Welcome bonus
            unlockedContent: [],
            createdAt: serverTimestamp()
        });

        toast.success("Account created! +100 Gum Drops");
        router.push("/dashboard");
    };

    const logout = async () => {
        await signOut(auth);
        router.push("/");
    };

    // --- Memoized Values ---

    const identityValue = useMemo(() => ({
        user,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        logout
    }), [user]);

    const profileValue = useMemo(() => ({
        userProfile,
        refreshProfile,
        setUserProfile
    }), [userProfile]);

    const loadingValue = useMemo(() => ({
        loading
    }), [loading]);

    // Legacy combined value (memoized)
    const combinedValue = useMemo(() => ({
        ...identityValue,
        ...profileValue,
        ...loadingValue
    }), [identityValue, profileValue, loadingValue]);

    return (
        <AuthContext.Provider value={combinedValue}>
            <AuthIdentityContext.Provider value={identityValue}>
                <UserProfileContext.Provider value={profileValue}>
                    <AuthLoadingContext.Provider value={loadingValue}>
                        {children}
                    </AuthLoadingContext.Provider>
                </UserProfileContext.Provider>
            </AuthIdentityContext.Provider>
        </AuthContext.Provider>
    );
}

// --- Specific Hooks ---

export const useAuthIdentity = () => {
    const context = useContext(AuthIdentityContext);
    if (!context) throw new Error("useAuthIdentity must be used within AuthProvider");
    return context;
};

export const useUserProfile = () => {
    const context = useContext(UserProfileContext);
    // Allow using userProfile in contexts where it might be null (though Provider always exists if wrapped)
    if (!context) throw new Error("useUserProfile must be used within AuthProvider");
    return context;
};

export const useAuthLoading = () => {
    const context = useContext(AuthLoadingContext);
    if (!context) throw new Error("useAuthLoading must be used within AuthProvider");
    return context;
};

// --- Legacy Hook ---
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};
