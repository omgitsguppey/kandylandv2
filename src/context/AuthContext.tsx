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
    buildFirebaseLikeAuthError,
    normalizeEmailAddress,
} from "@/lib/auth-errors";
import {
    emitAuthLifecycleEvent,
    type AuthOutcomeMethod,
} from "@/lib/auth-outcome-telemetry";
import { getClientAnalyticsIdentitySnapshot, syncClientSessionOwnership } from "@/lib/client-session";
import { clearTaskGuidanceStorage } from "@/lib/task-guidance";
import { syncIdentifiedTelemetryOwnership, trackEvent, trackIdentityLinked } from "@/lib/telemetry";
import {
    buildIdentityLinkPayload,
    hasSubmittedIdentityLink,
    markIdentityLinkSubmitted,
} from "@/lib/analytics/analytics-identity-link";
import { canUseIdentifiedAnalytics, readPrivacySettingsSnapshot } from "@/lib/privacy-consent";
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
    creatorMonetizationGoals?: string[];
    creatorPrimaryPlatform?: string;
    creatorFollowerRange?: string;
    creatorPostingFrequency?: string;
    creatorContentFocus?: string;
    fansAlreadyAskForAccess?: string;
    creatorRecommendedSetup?: string;
};

type SignUpResult = {
    welcomeBonus: number;
    signupIntent: SignupIntent;
};

interface AuthIdentityContextType {
    user: User | null;
    signInWithGoogle: (telemetry?: AuthFlowTelemetryInput) => Promise<{ completion: "signed_in" | "redirect_pending"; userId?: string }>;
    signInWithEmail: (identifier: string, pass: string, telemetry?: AuthFlowTelemetryInput) => Promise<{ userId: string }>;
    signUpWithEmail: (input: SignUpInput, telemetry?: AuthFlowTelemetryInput) => Promise<SignUpResult & { userId: string }>;
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

type AuthFlowTelemetryInput = {
    authAttemptId?: string;
    method?: AuthOutcomeMethod;
    route?: string;
    sourceComponent?: string;
    startedAtUtc?: string;
};

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

    const emitIdentityLinkContinuity = useCallback((userId: string, method: "login" | "signup" | "session_restore") => {
        trackIdentityLinked({
            userId,
            method,
        });

        if (typeof window === "undefined") {
            return;
        }

        const privacy = readPrivacySettingsSnapshot();
        const consentMode = privacy.consentMode;
        const identityLinkAllowed = canUseIdentifiedAnalytics(privacy);
        const consentState = identityLinkAllowed ? "granted" : "denied";
        const identity = getClientAnalyticsIdentitySnapshot(consentState);
        if (!identity.anonymousVisitorId || !identity.sessionId) {
            return;
        }

        const payload = buildIdentityLinkPayload({
            guestId: identity.anonymousVisitorId,
            userId,
            sessionId: identity.sessionId,
            linkedAt: new Date().toISOString(),
            reason: method,
            consentState,
            consentMode,
            eligiblePastSessionIds: [identity.sessionId],
        });

        if (hasSubmittedIdentityLink(payload)) {
            return;
        }

        markIdentityLinkSubmitted(payload);
        void payload.submit(authFetch).then((result) => {
            if (!result.success) {
                reportRealtimeIssue("analytics identity link transfer failed", result.reason ?? "identity_link_failed", {
                    userId,
                    method,
                    identityState: "guest_linked_to_user",
                });
            }
        }).catch((error) => {
            reportRealtimeIssue("analytics identity link transfer failed", error, {
                userId,
                method,
                identityState: "guest_linked_to_user",
            });
        });
    }, []);

    const ensureNavigationSessionEstablished = useCallback(async (input: {
        userId: string;
        method: AuthOutcomeMethod;
        telemetry?: AuthFlowTelemetryInput;
    }) => {
        const startedAtUtc = new Date().toISOString();
        emitAuthLifecycleEvent({
            eventName: "auth_navigation_session_started",
            authAttemptId: input.telemetry?.authAttemptId,
            method: input.method,
            route: input.telemetry?.route,
            sourceComponent: input.telemetry?.sourceComponent || "AuthContext",
            sourceTruth: "client_auth",
            actorUserId: input.userId,
            startedAtUtc,
        });

        let failureCode = "auth/navigation-session-failed";

        try {
            const response = await authFetch("/api/auth/navigation-session", {
                method: "POST",
            });
            const result = await response.json().catch(() => ({}));

            if (!response.ok || result?.success !== true) {
                failureCode = typeof result?.reason === "string" && result.reason.trim().length > 0
                    ? result.reason.trim()
                    : `auth/navigation-session-http-${response.status}`;
                throw buildFirebaseLikeAuthError(
                    failureCode,
                    "Sign-in completed, but the app session could not finish loading. Please try again.",
                );
            }

            const finishedAtUtc = new Date().toISOString();
            emitAuthLifecycleEvent({
                eventName: "auth_navigation_session_completed",
                authAttemptId: input.telemetry?.authAttemptId,
                method: input.method,
                route: input.telemetry?.route,
                sourceComponent: input.telemetry?.sourceComponent || "AuthContext",
                sourceTruth: "server_session",
                actorUserId: input.userId,
                startedAtUtc,
                finishedAtUtc,
            });
            emitAuthLifecycleEvent({
                eventName: "auth_session_established",
                authAttemptId: input.telemetry?.authAttemptId,
                method: input.method,
                route: input.telemetry?.route,
                sourceComponent: input.telemetry?.sourceComponent || "AuthContext",
                sourceTruth: "server_session",
                actorUserId: input.userId,
                startedAtUtc,
                finishedAtUtc,
            });
        } catch (error) {
            emitAuthLifecycleEvent({
                eventName: "auth_navigation_session_failed",
                authAttemptId: input.telemetry?.authAttemptId,
                method: input.method,
                route: input.telemetry?.route,
                sourceComponent: input.telemetry?.sourceComponent || "AuthContext",
                sourceTruth: "server_session",
                actorUserId: input.userId,
                startedAtUtc,
                finishedAtUtc: new Date().toISOString(),
                failureCode,
            });

            if (auth) {
                try {
                    await signOut(auth);
                } catch (signOutError) {
                    reportRealtimeIssue("auth navigation session rollback sign-out failed", signOutError, {
                        userId: input.userId,
                    });
                }
            }

            throw error;
        }
    }, []);

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
                        }).catch((error) => {
                            reportRealtimeIssue("auth navigation session delete failed", error);
                        });
                    }

                    setUser(currentUser);
                    setAuthStateResolved(true);

                    if (!initialAuthResolvedRef.current && currentUser) {
                        trackEvent("auth_session_restored", {
                            restoration_source: "browser_local_persistence",
                            auth_provider: currentUser.providerData[0]?.providerId || "unknown",
                        });
                        emitIdentityLinkContinuity(currentUser.uid, "session_restore");
                    }
                    initialAuthResolvedRef.current = true;

                    if (currentUser === null) {
                        setLoading(false);
                    }
                });
            } catch (error) {
                reportRealtimeIssue("auth initialization failed", error);
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
    }, [emitIdentityLinkContinuity]);

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
                        } catch (error) {
                            reportRealtimeIssue("auth profile bootstrap failed", error);
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
    }, [authStateResolved, router, user]);

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
            }).catch((error) => {
                reportRealtimeIssue("auth navigation session sync failed", error);
                navigationSessionSyncKeyRef.current = null;
            });
        }
    }, [user, userProfile]);

    const signInWithGoogle = useCallback(async (telemetry?: AuthFlowTelemetryInput) => {
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
                return { completion: "redirect_pending" as const };
            }

            const credential = await signInWithPopup(auth, provider);
            if (credential.user.uid) {
                emitIdentityLinkContinuity(credential.user.uid, "login");
                await ensureNavigationSessionEstablished({
                    userId: credential.user.uid,
                    method: "google_sign_in",
                    telemetry,
                });
            }
            toast.success("Welcome back!");
            return {
                completion: "signed_in" as const,
                userId: credential.user.uid,
            };
        } catch (error: unknown) {
            const firebaseError = error as { code?: string; message?: string };

            if (firebaseError?.code === "auth/popup-blocked") {
                const provider = new GoogleAuthProvider();
                provider.setCustomParameters({ prompt: "select_account" });
                setGoogleRedirectPending(true);
                await signInWithRedirect(auth, provider);
                return { completion: "redirect_pending" as const };
            }

            const message = normalizeAuthErrorMessage(error);
            toast.error(message);
            throw buildFirebaseLikeAuthError(firebaseError?.code || "auth/google-sign-in-failed", message);
        }
    }, [emitIdentityLinkContinuity, ensureNavigationSessionEstablished]);

    const signInWithEmail = useCallback(async (
        identifier: string,
        pass: string,
        telemetry?: AuthFlowTelemetryInput,
    ) => {
        if (!auth || !firebaseClientConfigured) {
            throw new Error("Authentication is unavailable in this environment.");
        }

        await ensureAuthPersistence();
        const resolvedIdentity = await resolveManualSignInIdentity(identifier);
        const credential = await signInWithEmailAndPassword(auth, resolvedIdentity.resolvedEmail, pass);
        emitIdentityLinkContinuity(credential.user.uid, "login");
        await ensureNavigationSessionEstablished({
            userId: credential.user.uid,
            method: "email_sign_in",
            telemetry,
        });
        toast.success("Welcome back!");
        return { userId: credential.user.uid };
    }, [emitIdentityLinkContinuity, ensureNavigationSessionEstablished]);

    const signUpWithEmail = useCallback(async (input: SignUpInput, telemetry?: AuthFlowTelemetryInput) => {
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
            emitIdentityLinkContinuity(credential.user.uid, "signup");
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
                    creatorMonetizationGoals: input.creatorMonetizationGoals,
                    creatorPrimaryPlatform: input.creatorPrimaryPlatform,
                    creatorFollowerRange: input.creatorFollowerRange,
                    creatorPostingFrequency: input.creatorPostingFrequency,
                    creatorContentFocus: input.creatorContentFocus,
                    fansAlreadyAskForAccess: input.fansAlreadyAskForAccess,
                    creatorRecommendedSetup: input.creatorRecommendedSetup,
                    referredBy: readSessionStorageValue(CLIENT_RUNTIME_STORAGE_KEYS.referralCode) ?? undefined,
                }),
            });
            shouldRollbackCreatedUser = !response.ok;

            const result = await readManualRegistrationResult(response);
            const welcomeBonus = result.welcomeBonus;
            await ensureNavigationSessionEstablished({
                userId: credential.user.uid,
                method: "email_sign_up",
                telemetry,
            });
            if (signupIntent === "creator") {
                toast.success("Creator intake received. Check your creator status page for next steps.");
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
                userId: credential.user.uid,
            };
        } catch (error: unknown) {
            if (shouldRollbackCreatedUser && createdUser && auth.currentUser?.uid === createdUser.uid) {
                try {
                    await deleteUser(createdUser);
                } catch (cleanupError) {
                    reportRealtimeIssue("auth signup rollback delete failed", cleanupError);
                    try {
                        await signOut(auth);
                    } catch (signOutError) {
                        reportRealtimeIssue("auth signup rollback sign-out failed", signOutError);
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
    }, [ensureNavigationSessionEstablished, getPostAuthDestination, pathname, router]);

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
        }).catch((error) => {
            reportRealtimeIssue("auth logout navigation session delete failed", error);
        });

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

