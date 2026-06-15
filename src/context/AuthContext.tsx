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
import type { AuthProviderConflict } from "@/lib/auth/auth-provider-conflict-contract";
import {
    buildAuthConflictTelemetry,
    classifyAuthError,
    resolveProviderConflictMessage,
} from "@/lib/auth/auth-provider-conflict-resolver";
import type { EmailPasswordSignupInput, EmailPasswordSignupIntent } from "@/lib/auth/email-password-auth-contract";
import {
    buildEmailAuthTelemetry,
    buildRegistrationRollbackPlan,
    classifyEmailAuthFailure,
    prepareEmailLogin,
    prepareEmailSignup,
    validateEmailSignupInput,
} from "@/lib/auth/email-password-auth-flow";
import type { AuthLogoutReason } from "@/lib/auth/auth-persistence-contract";
import {
    buildAuthPersistenceTelemetry,
    classifyAuthStateTransition,
    classifyLogoutReason,
    shouldClearUserState as shouldClearAuthUserState,
    shouldDeleteNavigationSession as shouldDeleteAuthNavigationSession,
    shouldRetryProfileSnapshot,
} from "@/lib/auth/auth-session-stability";
import {
    emitAuthLifecycleEvent,
    type AuthOutcomeMethod,
} from "@/lib/auth-outcome-telemetry";
import { buildAuthRuntimeTelemetry } from "@/lib/auth/auth-telemetry-contract";
import { getClientAnalyticsIdentitySnapshot, syncClientSessionOwnership } from "@/lib/client-session";
import { clearTaskGuidanceStorage } from "@/lib/task-guidance";
import { syncIdentifiedTelemetryOwnership, trackEvent, trackIdentityLinked } from "@/lib/telemetry";
import {
    buildIdentityLinkPayload,
    hasSubmittedIdentityLink,
} from "@/lib/analytics/analytics-identity-link";
import {
    clearAdminUiTestSession,
    readAdminUiTestSession,
} from "@/lib/admin/admin-ui-test-session";
import {
    buildAccountPrivacySettingsFromConsentSnapshot,
    canUseIdentifiedAnalytics,
    persistPrivacySettingsSnapshot,
    readPrivacySettingsSnapshot,
    shouldSyncGuestConsentToAccount,
} from "@/lib/privacy-consent";
import {
    ensureManualSignupUsername,
    readManualRegistrationResult,
    resolveManualSignInIdentity,
} from "@/lib/manual-email-auth";
import { createAutoHealingObserver } from "@/lib/self-healing";

type SignupIntent = EmailPasswordSignupIntent;
type SignUpInput = EmailPasswordSignupInput;

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

type AuthProviderConflictError = Error & {
    code?: string;
    authProviderConflict?: AuthProviderConflict;
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

function emitAuthProviderConflictTelemetry(input: {
    eventName?: "auth_provider_conflict_detected" | "auth_provider_conflict_resolution_shown" | "auth_provider_conflict_cta_clicked";
    conflict: AuthProviderConflict;
    telemetry?: AuthFlowTelemetryInput;
    sourceComponent?: string;
}) {
    const event = buildAuthConflictTelemetry(input.conflict, {
        authAttemptId: input.telemetry?.authAttemptId,
        route: input.telemetry?.route,
        sourceComponent: input.sourceComponent || input.telemetry?.sourceComponent || "AuthContext",
    }, input.eventName ?? "auth_provider_conflict_detected");
    trackEvent(event.eventName, event.params);
}

function buildAuthProviderConflictError(input: {
    error: unknown;
    attemptedMethod: "google" | "email_password";
    email?: string | null;
    telemetry?: AuthFlowTelemetryInput;
    sourceComponent?: string;
}) {
    const conflict = classifyAuthError(input.error, input.attemptedMethod, input.email);
    const firebaseError = input.error as { code?: string };
    const code = firebaseError?.code || conflict.firebaseCode;
    const message = resolveProviderConflictMessage(conflict);
    emitAuthProviderConflictTelemetry({
        conflict,
        telemetry: input.telemetry,
        sourceComponent: input.sourceComponent,
    });
    const nextError = buildFirebaseLikeAuthError(code, message) as AuthProviderConflictError;
    nextError.authProviderConflict = conflict;
    return nextError;
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

async function syncGuestConsentIntoAccountProfile(input: {
    userId: string;
    profile: UserProfile;
}) {
    if (typeof window === "undefined") {
        return input.profile;
    }

    const guestPrivacySnapshot = readPrivacySettingsSnapshot();
    if (!shouldSyncGuestConsentToAccount(guestPrivacySnapshot, input.profile.privacySettings)) {
        return input.profile;
    }

    const accountPrivacySettings = buildAccountPrivacySettingsFromConsentSnapshot(guestPrivacySnapshot);
    persistPrivacySettingsSnapshot({
        ...accountPrivacySettings,
        consentMode: guestPrivacySnapshot.consentMode,
        consentDecision: guestPrivacySnapshot.consentDecision,
        consentSource: "account_settings",
        consentPolicyVersion: guestPrivacySnapshot.consentPolicyVersion,
    }, { preserveTimestamp: true });

    try {
        await authFetch("/api/user/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ privacySettings: accountPrivacySettings }),
        });
    } catch (error) {
        reportRealtimeIssue("privacy consent account sync failed", error, {
            userId: input.userId,
            consentMode: guestPrivacySnapshot.consentMode,
            consentSource: guestPrivacySnapshot.consentSource,
            sourceComponent: "AuthContext",
        });
    }

    return {
        ...input.profile,
        privacySettings: {
            ...input.profile.privacySettings,
            ...accountPrivacySettings,
        },
    };
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [authStateResolved, setAuthStateResolved] = useState(false);
    const [adminUiTestSessionActive, setAdminUiTestSessionActive] = useState(false);
    const initialAuthResolvedRef = useRef(false);
    const autoRegisterInFlightRef = useRef<Set<string>>(new Set());
    const manualRegistrationStateRef = useRef<{ uid: string | null; email: string } | null>(null);
    const navigationSessionSyncKeyRef = useRef<string | null>(null);
    const currentAuthUidRef = useRef<string | null>(null);
    const explicitLogoutInFlightRef = useRef(false);
    const navigationSessionFailureInFlightRef = useRef(false);
    const persistenceTelemetryEmittedRef = useRef(false);
    const router = useRouter();
    const pathname = usePathname();
    const pathnameRef = useRef(pathname);

    useEffect(() => {
        pathnameRef.current = pathname;
    }, [pathname]);

    const emitIdentityLinkContinuity = useCallback((userId: string, method: "login" | "signup" | "session_restore") => {
        if (typeof window === "undefined") {
            return;
        }

        const privacy = readPrivacySettingsSnapshot();
        const consentMode = privacy.consentMode;
        const identityLinkAllowed = canUseIdentifiedAnalytics(privacy);
        const consentState = identityLinkAllowed ? "granted" : "denied";
        const identity = getClientAnalyticsIdentitySnapshot(consentState);
        if (!identity.anonymousVisitorId || !identity.sessionId) {
            syncIdentifiedTelemetryOwnership(userId);
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
            syncIdentifiedTelemetryOwnership(userId);
            return;
        }

        syncIdentifiedTelemetryOwnership(userId);
        trackIdentityLinked({
            userId,
            method,
            eligiblePastSessionIds: [identity.sessionId],
        });

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

    const emitAuthPersistenceEvent = useCallback((input: Parameters<typeof buildAuthPersistenceTelemetry>[0]) => {
        const event = buildAuthPersistenceTelemetry(input);
        trackEvent(event.eventName, event.params);
    }, []);

    const emitAuthRuntimeEvent = useCallback((input: Parameters<typeof buildAuthRuntimeTelemetry>[0]) => {
        const event = buildAuthRuntimeTelemetry(input);
        trackEvent(event.eventName, event.params);
    }, []);

    const deleteNavigationSession = useCallback(async (
        logoutReason: AuthLogoutReason,
        sourceComponent = "AuthContext",
    ) => {
        try {
            await fetch("/api/auth/navigation-session", {
                method: "DELETE",
                keepalive: true,
            });
            emitAuthPersistenceEvent({
                eventName: "auth_navigation_session_deleted",
                logoutReason,
                navigationSessionStatus: "deleted",
                sourceComponent,
                sourceTruth: "server_session",
            });
        } catch (error) {
            reportRealtimeIssue("auth navigation session delete failed", error, {
                logoutReason,
                sourceComponent,
            });
            emitAuthPersistenceEvent({
                eventName: "auth_navigation_session_deleted",
                logoutReason,
                navigationSessionStatus: "failed",
                sourceComponent,
                sourceTruth: "server_session",
                failureCode: "navigation_session_delete_failed",
            });
        }
    }, [emitAuthPersistenceEvent]);

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
                navigationSessionFailureInFlightRef.current = true;
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
                const adminUiTestSession = readAdminUiTestSession();
                if (adminUiTestSession.status === "ready" && adminUiTestSession.user && adminUiTestSession.userProfile) {
                    if (!cancelled) {
                        currentAuthUidRef.current = adminUiTestSession.user.uid;
                        setUser(adminUiTestSession.user);
                        setUserProfile(adminUiTestSession.userProfile);
                        setAdminUiTestSessionActive(true);
                        setAuthStateResolved(true);
                        setLoading(false);
                        syncClientSessionOwnership(`user:${adminUiTestSession.user.uid}`);
                        syncLastVisitedPathOwner(adminUiTestSession.user.uid);
                        syncIdentifiedTelemetryOwnership(null);
                    }
                    return;
                }

                setAdminUiTestSessionActive(false);

                if (!auth) {
                    if (!cancelled) {
                        setAuthStateResolved(true);
                        setLoading(false);
                    }
                    return;
                }

                await ensureAuthPersistence();
                if (!persistenceTelemetryEmittedRef.current) {
                    persistenceTelemetryEmittedRef.current = true;
                    emitAuthPersistenceEvent({
                        eventName: "auth_persistence_established",
                        navigationSessionStatus: "sync_pending",
                        sourceComponent: "AuthContext",
                        sourceTruth: "client_auth",
                    });
                }

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
                    const transition = classifyAuthStateTransition({
                        previousUserId,
                        nextUserId,
                        initialAuthResolved: initialAuthResolvedRef.current,
                        explicitLogoutInFlight: explicitLogoutInFlightRef.current,
                        navigationSessionFailureInFlight: navigationSessionFailureInFlightRef.current,
                    });

                    if (authIdentityChanged) {
                        currentAuthUidRef.current = nextUserId;
                        navigationSessionSyncKeyRef.current = null;
                        autoRegisterInFlightRef.current.clear();
                        emitAuthPersistenceEvent({
                            eventName: "auth_state_changed",
                            previousUserId,
                            nextUserId,
                            authProvider: currentUser?.providerData[0]?.providerId || "unknown",
                            logoutReason: transition.logoutReason,
                            sessionRestoreReason: transition.sessionRestoreReason,
                            sourceComponent: "AuthContext",
                            sourceTruth: transition.authStateSource,
                        });

                        if (nextUserId) {
                            setUserProfile(null);
                            setLoading(true);
                            syncClientSessionOwnership(`user:${nextUserId}`);
                            syncLastVisitedPathOwner(nextUserId);
                            if (previousUserId && previousUserId !== nextUserId) {
                                clearTaskGuidanceStorage();
                            }
                        } else if (shouldClearAuthUserState({ logoutReason: transition.logoutReason })) {
                            setUserProfile(null);
                            setLoading(false);
                            syncClientSessionOwnership(null);
                            syncIdentifiedTelemetryOwnership(null);
                            syncLastVisitedPathOwner(null);
                            clearTaskGuidanceStorage();
                        }

                        if (transition.unexpectedDrop) {
                            emitAuthPersistenceEvent({
                                eventName: "auth_unexpected_session_drop",
                                previousUserId,
                                nextUserId,
                                logoutReason: transition.logoutReason,
                                sourceComponent: "AuthContext",
                                sourceTruth: transition.authStateSource,
                            });
                        }

                        if (shouldDeleteAuthNavigationSession({
                            logoutReason: transition.logoutReason,
                            explicitLogoutAlreadyDeleted: explicitLogoutInFlightRef.current,
                        })) {
                            void deleteNavigationSession(transition.logoutReason ?? "unknown", "AuthContext");
                        }
                    }

                    setUser(currentUser);
                    setAuthStateResolved(true);

                    if (!initialAuthResolvedRef.current && currentUser) {
                        emitAuthPersistenceEvent({
                            eventName: "auth_session_restored",
                            userId: currentUser.uid,
                            authProvider: currentUser.providerData[0]?.providerId || "unknown",
                            sessionRestoreReason: "initial_browser_local_restore",
                            navigationSessionStatus: "sync_pending",
                            sourceComponent: "AuthContext",
                            sourceTruth: "browser_local_persistence",
                        });
                        emitIdentityLinkContinuity(currentUser.uid, "session_restore");
                    }
                    initialAuthResolvedRef.current = true;
                    if (currentUser === null) {
                        navigationSessionFailureInFlightRef.current = false;
                    }

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
    }, [deleteNavigationSession, emitAuthPersistenceEvent, emitIdentityLinkContinuity]);

    useEffect(() => {
        if (!authStateResolved) {
            return;
        }

        if (adminUiTestSessionActive) {
            setLoading(false);
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
        emitAuthRuntimeEvent({
            eventName: "auth_profile_bootstrap_started",
            method: "profile_bootstrap",
            provider: user.providerData[0]?.providerId || "unknown",
            sourceComponent: "AuthContext",
            sourceTruth: "profile_snapshot",
        });

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
                        const normalizedProfile = normalizeUserProfile(snapshot.data(), user);
                        const profile = normalizedProfile
                            ? await syncGuestConsentIntoAccountProfile({
                                userId: currentUserId,
                                profile: normalizedProfile,
                            })
                            : null;
                        autoRegisterInFlight.delete(currentUserId);

                        if (profile && (profile.status === "banned" || profile.status === "suspended")) {
                            const logoutReason = classifyLogoutReason({
                                securityStatus: profile.status,
                            });
                            emitAuthPersistenceEvent({
                                eventName: "auth_state_changed",
                                userId: currentUserId,
                                logoutReason,
                                profileSnapshotStatus: "security_blocked",
                                sourceComponent: "AuthContext",
                                sourceTruth: "profile_snapshot",
                            });
                            setUserProfile(profile);
                            setLoading(false);
                            if (pathnameRef.current !== "/banned") {
                                router.replace("/banned");
                            }
                            return;
                        }

                        if (profile) {
                            emitAuthRuntimeEvent({
                                eventName: "auth_profile_bootstrap_completed",
                                method: "profile_bootstrap",
                                provider: user.providerData[0]?.providerId || "unknown",
                                sourceComponent: "AuthContext",
                                sourceTruth: "profile_snapshot",
                            });
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
                                emitAuthPersistenceEvent({
                                    eventName: "auth_profile_snapshot_failed",
                                    userId: currentUserId,
                                    logoutReason: "backend_registration_failed",
                                    profileSnapshotStatus: "failed",
                                    sourceComponent: "AuthContext",
                                    sourceTruth: "profile_snapshot",
                                    failureCode: `profile_registration_http_${response.status}`,
                                });
                                emitAuthRuntimeEvent({
                                    eventName: "auth_profile_bootstrap_failed",
                                    method: "profile_bootstrap",
                                    provider: user.providerData[0]?.providerId || "unknown",
                                    sourceComponent: "AuthContext",
                                    sourceTruth: "profile_snapshot",
                                    failureCode: `profile_registration_http_${response.status}`,
                                });
                                setLoading(false);
                            }
                        } catch (error) {
                            reportRealtimeIssue("auth profile bootstrap failed", error);
                            if (!cancelled) {
                                autoRegisterInFlight.delete(currentUserId);
                                emitAuthPersistenceEvent({
                                    eventName: "auth_profile_snapshot_failed",
                                    userId: currentUserId,
                                    logoutReason: "backend_registration_failed",
                                    profileSnapshotStatus: "failed",
                                    sourceComponent: "AuthContext",
                                    sourceTruth: "profile_snapshot",
                                    failureCode: "profile_registration_exception",
                                });
                                emitAuthRuntimeEvent({
                                    eventName: "auth_profile_bootstrap_failed",
                                    method: "profile_bootstrap",
                                    provider: user.providerData[0]?.providerId || "unknown",
                                    sourceComponent: "AuthContext",
                                    sourceTruth: "profile_snapshot",
                                    failureCode: "profile_registration_exception",
                                });
                                setLoading(false);
                            }
                        }
                    }
                }, (error: unknown) => {
                    if (!cancelled) {
                        if (shouldRetryProfileSnapshot({
                            profileSnapshotStatus: "reconnecting",
                            hasAuthUser: auth?.currentUser?.uid === currentUserId,
                        })) {
                            emitAuthPersistenceEvent({
                                eventName: "auth_profile_snapshot_reconnect",
                                userId: currentUserId,
                                profileSnapshotStatus: "reconnecting",
                                sourceComponent: "AuthContext",
                                sourceTruth: "profile_snapshot",
                                failureCode: error instanceof Error ? error.name : "snapshot_error",
                            });
                            setLoading(true);
                        }
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
            emitAuthPersistenceEvent({
                eventName: "auth_profile_snapshot_failed",
                userId: currentUserId,
                profileSnapshotStatus: "failed",
                sourceComponent: "AuthContext",
                sourceTruth: "profile_snapshot",
                failureCode: error instanceof Error ? error.name : "snapshot_error",
            });
            emitAuthRuntimeEvent({
                eventName: "auth_profile_bootstrap_failed",
                method: "profile_bootstrap",
                provider: user.providerData[0]?.providerId || "unknown",
                sourceComponent: "AuthContext",
                sourceTruth: "profile_snapshot",
                failureCode: error instanceof Error ? error.name : "snapshot_error",
            });
        });

        return () => {
            cancelled = true;
            autoRegisterInFlight.delete(currentUserId);
            observerControl.cleanup();
        };
    }, [adminUiTestSessionActive, authStateResolved, emitAuthPersistenceEvent, emitAuthRuntimeEvent, router, user]);

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
            if (firebaseError?.code === "auth/account-exists-with-different-credential") {
                const conflictError = buildAuthProviderConflictError({
                    error,
                    attemptedMethod: "google",
                    email: null,
                    telemetry,
                    sourceComponent: "AuthContext",
                });
                toast.error(conflictError.message);
                throw conflictError;
            }
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
        const preparedLogin = prepareEmailLogin(identifier);
        let resolvedIdentity: Awaited<ReturnType<typeof resolveManualSignInIdentity>>;
        try {
            resolvedIdentity = await resolveManualSignInIdentity(preparedLogin.normalizedIdentifier);
        } catch (error) {
            const emailForHash = preparedLogin.identifierType === "email" ? preparedLogin.normalizedIdentifier : null;
            const failure = classifyEmailAuthFailure((error as { code?: string }).code ? error : {
                code: "auth/manual-lookup-failed",
                message: error instanceof Error ? error.message : undefined,
            });
            const event = buildEmailAuthTelemetry({
                eventName: "auth_email_sign_in_failed",
                failure,
                email: emailForHash,
                authAttemptId: telemetry?.authAttemptId || "",
                route: telemetry?.route || "",
                sourceComponent: telemetry?.sourceComponent || "AuthContext",
                identifierType: preparedLogin.identifierType,
            });
            trackEvent(event.eventName, event.params);
            throw buildAuthProviderConflictError({
                error,
                attemptedMethod: "email_password",
                email: emailForHash,
                telemetry,
                sourceComponent: "AuthContext",
            });
        }

        let credential: Awaited<ReturnType<typeof signInWithEmailAndPassword>>;
        try {
            credential = await signInWithEmailAndPassword(auth, resolvedIdentity.resolvedEmail, pass);
        } catch (error) {
            const failure = classifyEmailAuthFailure(error);
            const event = buildEmailAuthTelemetry({
                eventName: "auth_email_sign_in_failed",
                failure,
                email: resolvedIdentity.resolvedEmail,
                authAttemptId: telemetry?.authAttemptId || "",
                route: telemetry?.route || "",
                sourceComponent: telemetry?.sourceComponent || "AuthContext",
                identifierType: resolvedIdentity.identifierType,
            });
            trackEvent(event.eventName, event.params);
            throw buildAuthProviderConflictError({
                error,
                attemptedMethod: "email_password",
                email: resolvedIdentity.resolvedEmail,
                telemetry,
                sourceComponent: "AuthContext",
            });
        }
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

        const validation = validateEmailSignupInput(input);
        if (!validation.ok) {
            const failure = classifyEmailAuthFailure({ code: validation.failureCodes[0] });
            const event = buildEmailAuthTelemetry({
                eventName: "auth_email_sign_up_failed",
                failure,
                email: input.email,
                authAttemptId: telemetry?.authAttemptId,
                route: telemetry?.route,
                sourceComponent: telemetry?.sourceComponent || "AuthContext",
                signupIntent: input.signupIntent === "creator" ? "creator" : "fan",
            });
            trackEvent(event.eventName, event.params);
            throw buildFirebaseLikeAuthError(failure.firebaseCode, failure.safeUserMessage);
        }

        const preparedSignup = prepareEmailSignup(input);
        const signupIntent: SignupIntent = preparedSignup.signupIntent;
        const normalizedEmail = preparedSignup.normalizedEmail;
        let normalizedUsername: string;
        try {
            normalizedUsername = await ensureManualSignupUsername(preparedSignup.rawUsername);
        } catch (error) {
            const failure = classifyEmailAuthFailure(error);
            const event = buildEmailAuthTelemetry({
                eventName: "auth_email_sign_up_failed",
                failure,
                email: normalizedEmail,
                authAttemptId: telemetry?.authAttemptId,
                route: telemetry?.route,
                sourceComponent: telemetry?.sourceComponent || "AuthContext",
                signupIntent,
            });
            trackEvent(event.eventName, event.params);
            throw error;
        }
        let createdUser: User | null = null;
        let profileRegistrationSucceeded = false;
        let navigationSessionSucceeded = false;
        manualRegistrationStateRef.current = {
            uid: null,
            email: normalizedEmail,
        };

        try {
            await ensureAuthPersistence();
            let credential: Awaited<ReturnType<typeof createUserWithEmailAndPassword>>;
            try {
                credential = await createUserWithEmailAndPassword(auth, normalizedEmail, preparedSignup.password);
            } catch (error) {
                const failure = classifyEmailAuthFailure(error);
                const event = buildEmailAuthTelemetry({
                    eventName: "auth_email_sign_up_failed",
                    failure,
                    email: normalizedEmail,
                    authAttemptId: telemetry?.authAttemptId || "",
                    route: telemetry?.route || "",
                    sourceComponent: telemetry?.sourceComponent || "AuthContext",
                    signupIntent,
                });
                trackEvent(event.eventName, event.params);
                throw buildAuthProviderConflictError({
                    error,
                    attemptedMethod: "email_password",
                    email: normalizedEmail,
                    telemetry,
                    sourceComponent: "AuthContext",
                });
            }
            emitIdentityLinkContinuity(credential.user.uid, "signup");
            createdUser = credential.user;
            manualRegistrationStateRef.current = {
                uid: credential.user.uid,
                email: normalizedEmail,
            };

            const response = await authFetch("/api/user/register", {
                method: "POST",
                body: JSON.stringify({
                    ...preparedSignup.registrationPayload,
                    displayName: signupIntent === "creator"
                        ? preparedSignup.registrationPayload.creatorDisplayName || normalizedUsername
                        : normalizedUsername,
                    username: normalizedUsername,
                    referredBy: readSessionStorageValue(CLIENT_RUNTIME_STORAGE_KEYS.referralCode) ?? undefined,
                }),
            });
            const result = await readManualRegistrationResult(response);
            profileRegistrationSucceeded = true;
            const welcomeBonus = result.welcomeBonus;
            await ensureNavigationSessionEstablished({
                userId: credential.user.uid,
                method: "email_sign_up",
                telemetry,
            });
            navigationSessionSucceeded = true;
            if (signupIntent === "creator") {
                toast.success("Creator intake received. Check your creator status page for next steps.");
                router.push(CREATOR_WAITLIST_PATH);
            } else {
                toast.success(welcomeBonus > 0 ? `Account created! +${welcomeBonus} reward GumDrops` : "Account created!");
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
            const rollbackPlan = buildRegistrationRollbackPlan({
                firebaseUserCreated: Boolean(createdUser),
                profileRegistrationSucceeded,
                navigationSessionSucceeded,
            });

            if (createdUser && !profileRegistrationSucceeded) {
                const registrationFailure = classifyEmailAuthFailure({
                    code: (error as { code?: string }).code || "auth/profile-registration-failed",
                    message: error instanceof Error ? error.message : undefined,
                });
                const event = buildEmailAuthTelemetry({
                    eventName: "auth_email_sign_up_failed",
                    failure: registrationFailure,
                    email: normalizedEmail,
                    authAttemptId: telemetry?.authAttemptId,
                    route: telemetry?.route,
                    sourceComponent: telemetry?.sourceComponent || "AuthContext",
                    signupIntent,
                });
                trackEvent(event.eventName, event.params);
            }

            if (rollbackPlan.deleteFirebaseUser && createdUser && auth.currentUser?.uid === createdUser.uid) {
                try {
                    await deleteUser(createdUser);
                } catch (cleanupError) {
                    reportRealtimeIssue("auth signup rollback delete failed", cleanupError);
                    if (rollbackPlan.signOutAfterDeleteFailure) {
                        try {
                            await signOut(auth);
                        } catch (signOutError) {
                            reportRealtimeIssue("auth signup rollback sign-out failed", signOutError);
                        }
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
        if (adminUiTestSessionActive) {
            clearAdminUiTestSession();
            setAdminUiTestSessionActive(false);
            setUser(null);
            setUserProfile(null);
            setLoading(false);
            setAuthStateResolved(true);
            syncClientSessionOwnership(null);
            syncIdentifiedTelemetryOwnership(null);
            syncLastVisitedPathOwner(null);
            router.replace("/");
            return;
        }

        explicitLogoutInFlightRef.current = true;
        const authProvider = auth?.currentUser?.providerData[0]?.providerId || "unknown";
        emitAuthPersistenceEvent({
            eventName: "auth_logout_started",
            userId: auth?.currentUser?.uid ?? null,
            authProvider,
            logoutReason: "explicit_user_logout",
            navigationSessionStatus: "delete_pending",
            sourceComponent: "AuthContext",
            sourceTruth: "explicit_logout",
        });
        clearLastVisitedPath();
        navigationSessionSyncKeyRef.current = null;
        await deleteNavigationSession("explicit_user_logout", "AuthContext.logout");

        if (!auth) {
            emitAuthPersistenceEvent({
                eventName: "auth_logout_completed",
                logoutReason: "explicit_user_logout",
                sourceComponent: "AuthContext",
                sourceTruth: "explicit_logout",
            });
            explicitLogoutInFlightRef.current = false;
            router.replace("/");
            return;
        }

        if (auth.currentUser) {
            trackEvent("auth_logout", {
                auth_provider: auth.currentUser.providerData[0]?.providerId || "unknown",
            });
        }

        try {
            await signOut(auth);
            emitAuthPersistenceEvent({
                eventName: "auth_logout_completed",
                userId: null,
                authProvider,
                logoutReason: "explicit_user_logout",
                navigationSessionStatus: "deleted",
                sourceComponent: "AuthContext",
                sourceTruth: "explicit_logout",
            });
            router.replace("/");
        } finally {
            explicitLogoutInFlightRef.current = false;
        }
    }, [adminUiTestSessionActive, deleteNavigationSession, emitAuthPersistenceEvent, router]);

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

