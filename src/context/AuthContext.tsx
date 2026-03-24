"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import {
    onAuthStateChanged,
    User,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence,
    signOut,
} from "firebase/auth";
import { auth, firebaseClientConfigured } from "@/lib/firebase";
import { getAppCheckToken } from "@/lib/app-check";
import { CLIENT_RUNTIME_STORAGE_KEYS, readSessionStorageValue } from "@/hooks/client-runtime";
import { UserProfile } from "@/types/db";
import { normalizeUserProfile } from "@/lib/user-utils";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { authFetch } from "@/lib/authFetch";
import { clearLastVisitedPath, readPreferredAuthenticatedPath, setNavigationAuthCookies } from "@/lib/navigation-persistence";
import { trackEvent } from "@/lib/telemetry";

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
    setUserProfile: Dispatch<SetStateAction<UserProfile | null>>;
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
const GOOGLE_REDIRECT_PENDING_KEY = "auth_google_redirect_pending";

function ensureAuthPersistence() {
    if (!auth) {
        return Promise.resolve();
    }

    if (!persistencePromise) {
        persistencePromise = setPersistence(auth, browserLocalPersistence).catch((error) => {
            persistencePromise = null;
            throw error;
        });
    }

    return persistencePromise;
}

function normalizeAuthErrorMessage(error: unknown) {
    const firebaseError = error as { code?: string; message?: string };

    switch (firebaseError?.code) {
        case "auth/popup-closed-by-user":
            return "Google sign-in was cancelled before it finished.";
        case "auth/popup-blocked":
            return "Your browser blocked the Google sign-in popup. Please allow popups and try again.";
        case "auth/cancelled-popup-request":
            return "Another sign-in request interrupted the Google popup. Please try again.";
        case "auth/internal-error":
            return "Google sign-in could not finish on this domain. Please refresh and try again.";
        default:
            return firebaseError?.message || "Authentication failed";
    }
}

function setGoogleRedirectPending(value: boolean) {
    if (typeof window === "undefined") {
        return;
    }

    if (value) {
        window.sessionStorage.setItem(GOOGLE_REDIRECT_PENDING_KEY, "1");
    } else {
        window.sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
    }
}

function hasGoogleRedirectPending() {
    if (typeof window === "undefined") {
        return false;
    }

    return window.sessionStorage.getItem(GOOGLE_REDIRECT_PENDING_KEY) === "1";
}

function shouldPreferRedirectGoogleSignIn() {
    return false;
}

async function prepareAuthAppCheck() {
    await getAppCheckToken();
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [authStateResolved, setAuthStateResolved] = useState(false);
    const initialAuthResolvedRef = useRef(false);
    const autoRegisterInFlightRef = useRef<Set<string>>(new Set());
    const navigationSessionSyncKeyRef = useRef<string | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    const getPostAuthDestination = useCallback((role?: UserProfile["role"] | null) => {
        return readPreferredAuthenticatedPath(role ?? "user");
    }, []);

    useEffect(() => {
        let unsubscribe = () => { };
        let cancelled = false;

        const initializeAuth = async () => {
            try {
                if (!auth) {
                    if (!cancelled) {
                        setAuthStateResolved(true);
                        setLoading(false);
                    }
                    return;
                }

                await ensureAuthPersistence();
                await prepareAuthAppCheck().catch(() => null);

                try {
                    const redirectResult = await getRedirectResult(auth);
                    if (!cancelled && redirectResult?.user) {
                        setGoogleRedirectPending(false);
                        toast.success("Welcome back!");
                    } else if (!cancelled && hasGoogleRedirectPending()) {
                        setGoogleRedirectPending(false);
                    }
                } catch (error: unknown) {
                    if (!cancelled) {
                        setGoogleRedirectPending(false);
                        toast.error(normalizeAuthErrorMessage(error));
                    }
                }

                unsubscribe = onAuthStateChanged(auth, (currentUser) => {
                    setUser(currentUser);
                    setAuthStateResolved(true);

                    if (!initialAuthResolvedRef.current && currentUser) {
                        trackEvent("auth_session_restored", {
                            restoration_source: "browser_local_persistence",
                            auth_provider: currentUser.providerData[0]?.providerId || "unknown",
                        });
                    }
                    initialAuthResolvedRef.current = true;

                    if (currentUser === null) {
                        autoRegisterInFlightRef.current.clear();
                        setUserProfile(null);
                        setLoading(false);
                    }
                });
            } catch {
                if (!cancelled) {
                    setAuthStateResolved(true);
                    setLoading(false);
                }
            }
        };

        void initializeAuth();

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!authStateResolved) {
            return;
        }

        if (!user) {
            navigationSessionSyncKeyRef.current = null;
            setNavigationAuthCookies(null);
            void fetch("/api/auth/navigation-session", {
                method: "DELETE",
                keepalive: true,
            }).catch(() => { });
            setUserProfile(null);
            setLoading(false);
            return;
        }

        const currentUserId = user.uid;
        const autoRegisterInFlight = autoRegisterInFlightRef.current;
        let unsubscribe: (() => void) | undefined;

        const setupProfileListener = async () => {
            const { db } = await import("@/lib/firebase-data");
            const { doc, onSnapshot } = await import("firebase/firestore");

            const profileDocRef = doc(db, "users", currentUserId);

            unsubscribe = onSnapshot(profileDocRef, async (snapshot) => {
                if (snapshot.exists()) {
                    const profile = normalizeUserProfile(snapshot.data(), user);
                    autoRegisterInFlight.delete(currentUserId);

                    if (profile && (profile.status === "banned" || profile.status === "suspended")) {
                        setUserProfile(profile);
                        setLoading(false);
                        if (pathname !== "/banned") {
                            router.replace("/banned");
                        }
                        return;
                    }

                    if (profile) {
                        setUserProfile(profile);
                        setLoading(false);
                    }
                } else {
                    if (autoRegisterInFlight.has(currentUserId)) {
                        return;
                    }

                    autoRegisterInFlight.add(currentUserId);

                    try {
                        const registrationMethod = user.providerData[0]?.providerId === "google.com" ? "google" : "email";
                        const response = await authFetch("/api/user/register", {
                            method: "POST",
                            body: JSON.stringify({
                                displayName: user.displayName || "User",
                                registrationMethod,
                                referredBy: readSessionStorageValue(CLIENT_RUNTIME_STORAGE_KEYS.referralCode) ?? undefined,
                            }),
                        });
                        if (!response.ok) {
                            autoRegisterInFlight.delete(currentUserId);
                            setLoading(false);
                        }
                    } catch {
                        autoRegisterInFlight.delete(currentUserId);
                        setLoading(false);
                    }
                }
            }, () => {
                setLoading(false);
            });
        };

        void setupProfileListener();

        return () => {
            autoRegisterInFlight.delete(currentUserId);
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [authStateResolved, pathname, router, user]);

    useEffect(() => {
        if (!user) {
            navigationSessionSyncKeyRef.current = null;
            setNavigationAuthCookies(null);
            return;
        }

        if (userProfile) {
            setNavigationAuthCookies(userProfile.role ?? "user", user.uid);
            const syncKey = `${user.uid}:${userProfile.role ?? "user"}`;
            if (navigationSessionSyncKeyRef.current === syncKey) {
                return;
            }

            navigationSessionSyncKeyRef.current = syncKey;
            void authFetch("/api/auth/navigation-session", {
                method: "POST",
            }).catch(() => {
                navigationSessionSyncKeyRef.current = null;
            });
        }
    }, [user, userProfile]);

    const refreshProfile = useCallback(async () => {
        // No-op now as onSnapshot handles updates.
        // Kept for backward compatibility if any component calls it.
    }, []);

    const signInWithGoogle = useCallback(async () => {
        if (!auth || !firebaseClientConfigured) {
            throw new Error("Authentication is unavailable in this environment.");
        }

        try {
            await ensureAuthPersistence();
            await prepareAuthAppCheck();
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: "select_account" });

            if (shouldPreferRedirectGoogleSignIn()) {
                setGoogleRedirectPending(true);
                await signInWithRedirect(auth, provider);
                return;
            }

            await signInWithPopup(auth, provider);
            toast.success("Welcome back!");
        } catch (error: unknown) {
            const firebaseError = error as { code?: string; message?: string };

            if (firebaseError?.code === "auth/popup-blocked") {
                const provider = new GoogleAuthProvider();
                provider.setCustomParameters({ prompt: "select_account" });
                setGoogleRedirectPending(true);
                await signInWithRedirect(auth, provider);
                return;
            }

            if (
                firebaseError?.code === "auth/app-check-token-is-invalid"
                || firebaseError?.message?.toLowerCase().includes("app check token")
                || firebaseError?.message?.toLowerCase().includes("recaptcha")
            ) {
                try {
                    toast.loading("Analyzing reCAPTCHA rejection reasons from Google...", { id: "recaptcha-debug" });
                    const { verifyManualRecaptchaToken } = await import("@/lib/manual-recaptcha");
                    const result = await verifyManualRecaptchaToken("LOGIN");
                    toast.dismiss("recaptcha-debug");

                    if (result.error) {
                        toast.error(`Google API Error: ${result.error}`, { duration: 8000 });
                    } else if (result.tokenProperties?.valid === false) {
                        toast.error(`App Check rejected your browser. Reason: ${result.tokenProperties?.invalidReason}`, { duration: 10000 });
                    } else {
                        toast.error(`App Check blocked Auth. Manual reCAPTCHA test succeeded (Score: ${result.riskAnalysis?.score}). Your Firebase Console is NOT linked to this key!`, { duration: 10000 });
                    }
                } catch (recaptchaErr: any) {
                    toast.dismiss("recaptcha-debug");
                    toast.error(`App Check Failed & Manual Check Failed: ${recaptchaErr.message}`, { duration: 8000 });
                }
                throw error;
            }

            const message = normalizeAuthErrorMessage(error);
            toast.error(message);
            throw new Error(message);
        }
    }, []);

    const signInWithEmail = useCallback(async (email: string, pass: string) => {
        if (!auth || !firebaseClientConfigured) {
            throw new Error("Authentication is unavailable in this environment.");
        }

        try {
            await ensureAuthPersistence();
            await prepareAuthAppCheck();
            await signInWithEmailAndPassword(auth, email, pass);
            toast.success("Welcome back!");
        } catch (error: unknown) {
            throw error;
        }
    }, []);

    const signUpWithEmail = useCallback(async (email: string, pass: string, username: string, dob: string) => {
        if (!auth || !firebaseClientConfigured) {
            throw new Error("Authentication is unavailable in this environment.");
        }

        try {
            await ensureAuthPersistence();
            await prepareAuthAppCheck();
            await createUserWithEmailAndPassword(auth, email, pass);

            const response = await authFetch("/api/user/register", {
                method: "POST",
                body: JSON.stringify({
                    displayName: username,
                    username,
                    dateOfBirth: dob,
                    registrationMethod: "email",
                    welcomeBonus: true,
                    referredBy: readSessionStorageValue(CLIENT_RUNTIME_STORAGE_KEYS.referralCode) ?? undefined,
                }),
            });

            if (!response.ok) {
                const result = (await response.json()) as { error?: string };
                throw new Error(result.error || "Registration failed");
            }

            toast.success("Account created! +100 Gum Drops");
            if (pathname === "/") {
                router.push(getPostAuthDestination("user"));
            }
        } catch (error: unknown) {
            throw error;
        }
    }, [getPostAuthDestination, pathname, router]);

    const logout = useCallback(async () => {
        clearLastVisitedPath();
        navigationSessionSyncKeyRef.current = null;
        await fetch("/api/auth/navigation-session", {
            method: "DELETE",
            keepalive: true,
        }).catch(() => { });

        if (!auth) {
            router.replace("/");
            return;
        }

        if (auth.currentUser) {
            trackEvent("auth_logout", {
                auth_provider: auth.currentUser.providerData[0]?.providerId || "unknown",
            });
        }

        await signOut(auth);
        router.replace("/");
    }, [router]);

    const identityValue = useMemo(
        () => ({
            user,
            signInWithGoogle,
            signInWithEmail,
            signUpWithEmail,
            logout,
        }),
        [logout, signInWithEmail, signInWithGoogle, signUpWithEmail, user],
    );

    const profileValue = useMemo(
        () => ({
            userProfile,
            refreshProfile,
            setUserProfile,
        }),
        [refreshProfile, userProfile],
    );

    const loadingValue = useMemo(
        () => ({
            loading,
        }),
        [loading],
    );

    const combinedValue = useMemo(
        () => ({
            ...identityValue,
            ...profileValue,
            ...loadingValue,
        }),
        [identityValue, loadingValue, profileValue],
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

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};
