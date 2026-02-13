"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,
    User,
    GoogleAuthProvider,
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence
} from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserProfile } from "@/types/db";

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, pass: string) => Promise<void>;
    signUpWithEmail: (email: string, pass: string, username: string, dob: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    loading: true,
    signInWithGoogle: async () => { },
    signInWithEmail: async () => { },
    signUpWithEmail: async () => { },
    logout: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeProfile: (() => void) | null = null;

        // Ensure persistence is Local (default, but explicit helps with some edge cases)
        setPersistence(auth, browserLocalPersistence).catch((error) => {
            console.error("Auth Persistence Error:", error);
        });

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            // Clean up previous profile listener if it exists
            if (unsubscribeProfile) {
                unsubscribeProfile();
                unsubscribeProfile = null;
            }

            if (currentUser) {
                const userRef = doc(db, "users", currentUser.uid);
                unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const profile = docSnap.data() as UserProfile;

                        // Check Status
                        if (profile.status === 'banned' || profile.status === 'suspended') {
                            console.warn(`User is ${profile.status}: ${profile.statusReason}`);
                            // If we want to force logout immediately:
                            // auth.signOut();
                            // setUser(null);
                            // setUserProfile(null);
                            // But maybe we want to let them see a "Banned" screen?
                            // For now, let's just set the profile so the UI can react?
                            // Actually, auto-logout is safest to prevent unauthorized actions.
                            if (window.location.pathname !== "/") {
                                // Simple enforcement: Sign out.
                                auth.signOut().then(() => {
                                    alert(`Your account has been ${profile.status}.\nReason: ${profile.statusReason || "Violation of terms."}`);
                                    window.location.href = "/";
                                });
                                return;
                            }
                        }

                        setUserProfile(profile);
                    } else {
                        // Profile creation for Google Sign In happens here if needed, 
                        // but for Email Sign Up we handle it explicitly below to capture extra fields.
                        // If it doesn't exist yet (race condition or first Google login), create basic profile
                        const newProfile: UserProfile = {
                            uid: currentUser.uid,
                            email: currentUser.email,
                            displayName: currentUser.displayName || "User",
                            photoURL: currentUser.photoURL,
                            gumDropsBalance: 0,
                            unlockedContent: [],
                            createdAt: Date.now(),
                        };
                        // We use setDoc with merge true just in case another process is creating it
                        setDoc(userRef, newProfile, { merge: true });
                    }
                });
            } else {
                setUserProfile(null);
            }

            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeProfile) unsubscribeProfile();
        };
    }, []);

    const logout = async () => {
        await auth.signOut();
    };

    const signInWithGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in with Google", error);
            throw error;
        }
    };

    const signInWithEmail = async (email: string, pass: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (error) {
            console.error("Error signing in with Email", error);
            throw error;
        }
    };

    const signUpWithEmail = async (email: string, pass: string, username: string, dob: string) => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, pass);
            // Create rich profile immediately
            const userRef = doc(db, "users", result.user.uid);
            const newProfile: UserProfile = {
                uid: result.user.uid,
                email: email,
                displayName: username,
                username: username,
                dateOfBirth: dob,
                photoURL: null,
                gumDropsBalance: 0,
                unlockedContent: [],
                createdAt: Date.now(),
            };
            await setDoc(userRef, newProfile);
        } catch (error) {
            console.error("Error signing up", error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            userProfile,
            loading,
            signInWithGoogle,
            signInWithEmail,
            signUpWithEmail,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
