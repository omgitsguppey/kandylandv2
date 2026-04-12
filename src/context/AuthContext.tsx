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
    deleteUser,
    sendPasswordResetEmail,
    setPersistence,
    browserLocalPersistence,
    signOut,
} from "firebase/auth";
import { auth, firebaseClientConfigured } from "@/lib/firebase";
import { CLIENT_RUNTIME_STORAGE_KEYS, readSessionStorageValue } from "@/hooks/client-runtime";
import { UserProfile } from "@/types/db";
import { normalizeUserProfile } from "@/lib/user-utils";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { authFetch } from "@/lib/authFetch";
import { reportRealtimeIssue } from "@/lib/client-error-reporting";
import {
    clearLastVisitedPath,
    syncLastVisitedPathOwner,
} from "@/lib/navigation-persistence";
import { CREATOR_WAITLIST_PATH, getPreferredAuthenticatedPathForProfile } from "@/lib/creator-application";
import {
    normalizeEmailAddress,
} from "@/lib/auth-errors";
import { buildFirestoreClientFallbackMessage, buildFirestoreClientIssueDetail } from "@/lib/firestore-client-errors";
import { syncClientSessionOwnership } from "@/lib/client-session";
import { clearTaskGuidanceStorage } from "@/lib/task-guidance";
import { syncIdentifiedTelemetryOwnership, trackEvent } from "@/lib/telemetry";
import {
    ensureManualSignupUsername,
    readManualRegistrationResult,
    resolveManualSignInIdentity,
} from "@/lib/manual-email-auth";
import { createAutoHealingObserver } from "@/lib/self-healing";

type SignupIntent = "fan" | "creator";

type SignUpInput = {
    email: string;
    password: string;
    username: string;
    dob: string;
    signupIntent?: SignupIntent;
    creatorDisplayName?: string;
    creatorPrimaryPlatform?: string;
    creatorContentFocus?: string;
};

type SignUpResult = {
    welcomeBonus: number;
    signupIntent: SignupIntent;
};

interface AuthIdentityContextType {
    user: User | null;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (identifier: string, pass: string) => Promise<void>;
    signUpWithEmail: (input: SignUpInput) => Promise<SignUpResult>;
    sendPasswordResetLink: (email: string) => Promise<void>;
    logout: () => Promise<void>;
}

interface UserProfileContextType {
    userProfile: UserProfile | null;
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

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [authStateResolved, setAuthStateResolved] = useState(false);
    const initialAuthResolvedRef = useRef(false);
    const autoRegisterInFlightRef = useRef<Set<string>>(new Set());
    const manualRegistrationStateRef = useRef<{ uid: string | null; email: string } | null>(null);
    const navigationSessionSyncKeyRef = useRef<string | null>(null);
    const currentAuthUidRef = useRef<string | null>(null);
    const router = useRouter();
    const pathname = usePathname();
    const pathnameRef = useRef(pathname);

    useEffect(() => {
        pathnameRef.current = pathname;
    }, [pathname]);

    const getPostAuthDestination = useCallback((profile?: Pick<UserProfile, "role" | "creatorApplication"> | null, ownerId?: string | null) => {
        return getPreferredAuthenticatedPathForProfile(profile ?? null, ownerId);
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
                    const nextUserId = currentUser?.uid ?? null;
                    const previousUserId = currentAuthUidRef.current;
                    const authIdentityChanged = previousUserId !== nextUserId;

                    if (authIdentityChanged) {
                        currentAuthUidRef.current = nextUserId;
                        navigationSessionSyncKeyRef.current = null;
                        autoRegisterInFlightRef.current.clear();
                        setUserProfile(null);
                        setLoading(Boolean(currentUser));
                        syncClientSessionOwnership(nextUserId ? `user:${nextUserId}` : null);
                        syncIdentifiedTelemetryOwnership(nextUserId);
                        syncLastVisitedPathOwner(nextUserId);
                        clearTaskGuidanceStorage();

                        void fetch("/api/auth/navigation-session", {
                            method: "DELETE",
                            keepalive: true,
                        }).catch(() => { });
                    }

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
            syncClientSessionOwnership(null);
            syncIdentifiedTelemetryOwnership(null);
            syncLastVisitedPathOwner(null);
            clearTaskGuidanceStorage();
            setUserProfile(null);
            setLoading(false);
            return;
        }

        const currentUserId = user.uid;
        const autoRegisterInFlight = autoRegisterInFlightRef.current;
        let cancelled = false;
        setUserProfile(null);
        setLoading(true);

        const observerControl = createAutoHealingObserver(() => {
            const connect = async () => {
                const { db } = await import("@/lib/firebase-data");
                const { doc, onSnapshot } = await import("firebase/firestore");
                if (cancelled) return null;

                const profileDocRef = doc(db, "users", currentUserId);

                return onSnapshot(profileDocRef, async (snapshot) => {
                    if (cancelled || auth?.currentUser?.uid !== currentUserId) {
                        return;
                    }

                    if (snapshot.exists()) {
                        const profile = normalizeUserProfile(snapshot.data(), user);
                        autoRegisterInFlight.delete(currentUserId);

                        if (profile && (profile.status === "banned" || profile.status === "suspended")) {
                            setUserProfile(profile);
                            setLoading(false);
                            if (pathnameRef.current !== "/banned") {
                                router.replace("/banned");
                            }
                            return;
                        }

                        if (profile) {
                            setUserProfile(profile);
                            setLoading(false);
                        }
                    } else {
                        const pendingManualRegistration = manualRegistrationStateRef.current;
                        if (
                            pendingManualRegistration
                            && (
                                pendingManualRegistration.uid === currentUserId
                                || (
                                    pendingManualRegistration.uid === null
                                    && normalizeEmailAddress(user.email ?? "") === pendingManualRegistration.email
                                )
                            )
                        ) {
                            return;
                        }

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
                            if (!response.ok && !cancelled) {
                                autoRegisterInFlight.delete(currentUserId);
                                setLoading(false);
                            }
                        } catch {
                            if (!cancelled) {
                                autoRegisterInFlight.delete(currentUserId);
                                setLoading(false);
                            }
                        }
                    }
                }, (error: unknown) => {
                    if (!cancelled) {
                        observerControl.triggerReconnect(error);
                    }
                });
            };

            let internalUnsubscribe: (() => void) | void = undefined;
            void connect().then((unsub) => {
                if (unsub) internalUnsubscribe = unsub;
            }).catch((error) => {
                if (!cancelled) {
                    observerControl.triggerReconnect(error);
                }
            });

            return () => {
                if (internalUnsubscribe) internalUnsubscribe();
            };
        }, (error: unknown) => {
            reportRealtimeIssue("auth profile snapshot", error, {
                userId: currentUserId,
            });
        });

        return () => {
            cancelled = true;
            autoRegisterInFlight.delete(currentUserId);
            observerControl.cleanup();
        };
    }, [authStateResolved, pathname, router, user]);

    useEffect(() => {
        if (!user) {
            navigationSessionSyncKeyRef.current = null;
            return;
        }

        if (userProfile) {
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

    const signInWithGoogle = useCallback(async () => {
        if (!auth || !firebaseClientConfigured) {
            throw new Error("Authentication is unavailable in this environment.");
        }

        try {
            await ensureAuthPersistence();
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

            const message = normalizeAuthErrorMessage(error);
            toast.error(message);
            throw new Error(message);
        }
    }, []);

    const signInWithEmail = useCallback(async (identifier: string, pass: string) => {
        if (!auth || !firebaseClientConfigured) {
            throw new Error("Authentication is unavailable in this environment.");
        }

        await ensureAuthPersistence();
        const resolvedIdentity = await resolveManualSignInIdentity(identifier);
        await signInWithEmailAndPassword(auth, resolvedIdentity.resolvedEmail, pass);
        toast.success("Welcome back!");
    }, []);

    const signUpWithEmail = useCallback(async (input: SignUpInput) => {
        if (!auth || !firebaseClientConfigured) {
            throw new Error("Authentication is unavailable in this environment.");
        }

        const signupIntent: SignupIntent = input.signupIntent === "creator" ? "creator" : "fan";
        const normalizedEmail = normalizeEmailAddress(input.email);
        const normalizedUsername = await ensureManualSignupUsername(input.username);
        let createdUser: User | null = null;
        let shouldRollbackCreatedUser = false;
        manualRegistrationStateRef.current = {
            uid: null,
            email: normalizedEmail,
        };

        try {
            await ensureAuthPersistence();
            const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, input.password);
            createdUser = credential.user;
            manualRegistrationStateRef.current = {
                uid: credential.user.uid,
                email: normalizedEmail,
            };

            const response = await authFetch("/api/user/register", {
                method: "POST",
                body: JSON.stringify({
                    displayName: signupIntent === "creator"
                        ? input.creatorDisplayName || normalizedUsername
                        : normalizedUsername,
                    username: normalizedUsername,
                    dateOfBirth: input.dob,
                    registrationMethod: "email",
                    signupIntent,
                    creatorDisplayName: input.creatorDisplayName,
                    creatorPrimaryPlatform: input.creatorPrimaryPlatform,
                    creatorContentFocus: input.creatorContentFocus,
                    referredBy: readSessionStorageValue(CLIENT_RUNTIME_STORAGE_KEYS.referralCode) ?? undefined,
                }),
            });
            shouldRollbackCreatedUser = !response.ok;

            const result = await readManualRegistrationResult(response);
            const welcomeBonus = result.welcomeBonus;
            if (signupIntent === "creator") {
                toast.success("Creator application received. Check your creator status page for review, legal, and ID updates.");
                router.push(CREATOR_WAITLIST_PATH);
            } else {
                toast.success(welcomeBonus > 0 ? `Account created! +${welcomeBonus} Gum Drops` : "Account created!");
                if (pathname === "/") {
                    router.push(getPostAuthDestination({ role: "user" }, auth.currentUser?.uid ?? null));
                }
            }
            return {
                welcomeBonus,
                signupIntent,
            };
        } catch (error: unknown) {
            if (shouldRollbackCreatedUser && createdUser && auth.currentUser?.uid === createdUser.uid) {
                try {
                    await deleteUser(createdUser);
                } catch (cleanupError) {
                    try {
                        await signOut(auth);
                    } catch {
                        // Best effort fallback after delete failure.
                    }
                }
            }
            throw error;
        } finally {
            if (
                manualRegistrationStateRef.current
                && manualRegistrationStateRef.current.email === normalizedEmail
            ) {
                manualRegistrationStateRef.current = null;
            }
        }
    }, [getPostAuthDestination, pathname, router]);

    const sendPasswordResetLink = useCallback(async (email: string) => {
        if (!auth || !firebaseClientConfigured) {
            throw new Error("Authentication is unavailable in this environment.");
        }

        await ensureAuthPersistence();
        await sendPasswordResetEmail(auth, normalizeEmailAddress(email));
    }, []);

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
            sendPasswordResetLink,
            logout,
        }),
        [logout, sendPasswordResetLink, signInWithEmail, signInWithGoogle, signUpWithEmail, user],
    );

    const profileValue = useMemo(
        () => ({
            userProfile,
            setUserProfile,
        }),
        [userProfile],
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

