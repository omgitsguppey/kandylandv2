"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, Mail, Lock, User, Calendar, AlertCircle, Loader2 } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { differenceInYears, parseISO } from "date-fns";
import { clearTimedFlow, consumeTimedFlow, startTimedFlow, trackEvent } from "@/lib/telemetry";
import type { AuthModalEntryMode } from "@/context/UIContext";
import { SECONDARY_UNWRAP_CTA, SIGNUP_SUPPORT_COPY } from "@/lib/marketing-copy";

// Validation Schema - unified shape with conditional validation for sign-up fields
const authFormSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    username: z.string().optional(),
    dob: z.string().optional(),
});

type AuthFormData = z.infer<typeof authFormSchema>;

interface AuthModalProps {
    isOpen: boolean;
    mode: AuthModalEntryMode;
    onClose: () => void;
}

type AuthMode = "signin" | "signup" | "forgot_password";
const AUTH_SIGN_IN_FLOW = "auth_sign_in";
const AUTH_SIGN_UP_FLOW = "auth_sign_up";
const AUTH_GOOGLE_FLOW = "auth_google_sign_in";

export function AuthModal({ isOpen, mode: initialMode, onClose }: AuthModalProps) {
    const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
    const [mode, setMode] = useState<AuthMode>(initialMode);
    const [isLoading, setIsLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [resetSent, setResetSent] = useState(false);
    const wasOpenRef = useRef(false);

    useEffect(() => {
        if (isOpen && !wasOpenRef.current) {
            trackEvent("auth_modal_opened", { mode });
        }

        wasOpenRef.current = isOpen;
    }, [isOpen, mode]);

    const activeSchema = mode === "signup"
        ? authFormSchema.extend({
            username: z.string().min(3, "Username must be at least 3 characters"),
            dob: z.string().refine((val) => {
                const age = differenceInYears(new Date(), parseISO(val));
                return age >= 18;
            }, "You must be 18+ to join KandyDrops"),
        })
        : authFormSchema;

    const {
        register,
        handleSubmit,
        formState: { errors },
        clearErrors,
        reset,
    } = useForm<AuthFormData>({
        resolver: zodResolver(activeSchema),
        mode: "onBlur",
    });

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setMode(initialMode);
        setAuthError(null);
        setResetSent(false);
        clearErrors();
        reset();
        clearTimedFlow(AUTH_SIGN_IN_FLOW);
        clearTimedFlow(AUTH_SIGN_UP_FLOW);
        clearTimedFlow(AUTH_GOOGLE_FLOW);
    }, [clearErrors, initialMode, isOpen, reset]);

    const switchMode = (newMode: AuthMode) => {
        setMode(newMode);
        setAuthError(null);
        setResetSent(false);
        clearErrors();
        reset();
        trackEvent("auth_mode_switched", { from_mode: mode, to_mode: newMode });
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setAuthError(null);
        startTimedFlow(AUTH_GOOGLE_FLOW, { source_mode: mode });
        trackEvent("auth_google_sign_in_attempted", { source_mode: mode });
        try {
            await signInWithGoogle();
            const { mergedParams } = consumeTimedFlow(AUTH_GOOGLE_FLOW, { source_mode: mode });
            trackEvent("auth_google_sign_in_success", mergedParams);
            onClose();
        } catch (err: unknown) {
            const { mergedParams } = consumeTimedFlow(AUTH_GOOGLE_FLOW, { source_mode: mode });
            trackEvent("auth_google_sign_in_failed", mergedParams);
            setAuthError(err instanceof Error ? err.message : "Failed to sign in with Google.");
        } finally {
            setIsLoading(false);
        }
    };

    const onSubmit = async (data: AuthFormData) => {
        setIsLoading(true);
        setAuthError(null);

        try {
            if (mode === "signup") {
                startTimedFlow(AUTH_SIGN_UP_FLOW, { entry_mode: initialMode });
                trackEvent("auth_sign_up_attempted", { entry_mode: initialMode });
                await signUpWithEmail(data.email, data.password, data.username!, data.dob!);
                const { mergedParams } = consumeTimedFlow(AUTH_SIGN_UP_FLOW, {
                    entry_mode: initialMode,
                    username_length: data.username?.length ?? 0,
                });
                trackEvent("auth_sign_up_success", mergedParams);
            } else {
                startTimedFlow(AUTH_SIGN_IN_FLOW, { entry_mode: initialMode });
                trackEvent("auth_sign_in_attempted", { entry_mode: initialMode });
                await signInWithEmail(data.email, data.password);
                const { mergedParams } = consumeTimedFlow(AUTH_SIGN_IN_FLOW, { entry_mode: initialMode });
                trackEvent("auth_sign_in_success", mergedParams);
            }
            onClose();
            reset();
        } catch (err: unknown) {
            console.error(err);
            const firebaseErr = err as { code?: string; message?: string };
            const flowKey = mode === "signup" ? AUTH_SIGN_UP_FLOW : AUTH_SIGN_IN_FLOW;
            const { mergedParams } = consumeTimedFlow(flowKey, {
                error_code: firebaseErr.code || "unknown",
                entry_mode: initialMode,
            });
            trackEvent(mode === "signup" ? "auth_sign_up_failed" : "auth_sign_in_failed", mergedParams);
            if (firebaseErr.code === "auth/email-already-in-use") {
                setAuthError("Email is already registered.");
            } else if (firebaseErr.code === "auth/invalid-credential") {
                setAuthError("Invalid email or password.");
            } else {
                setAuthError(firebaseErr.message || "Authentication failed. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const email = (e.currentTarget.elements.namedItem("resetEmail") as HTMLInputElement).value;
        if (!email) {
            setAuthError("Please enter your email address.");
            return;
        }

        setIsLoading(true);
        setAuthError(null);
        trackEvent("password_reset_requested");
        try {
            const { sendPasswordResetEmail, getAuth } = await import("firebase/auth");
            const { auth } = await import("@/lib/firebase");
            await sendPasswordResetEmail(auth || getAuth(), email);
            trackEvent("password_reset_sent");
            setResetSent(true);
        } catch (err: unknown) {
            console.error("Password reset error:", err);
            const firebaseErr = err as { code?: string; message?: string };
            if (firebaseErr.code === "auth/user-not-found") {
                trackEvent("password_reset_sent");
                setResetSent(true);
            } else {
                trackEvent("password_reset_failed", {
                    error_code: firebaseErr.code || "unknown",
                });
                setAuthError(firebaseErr.message || "Failed to send reset email.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div
                onClick={onClose}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity"
            />

            <div className="fixed inset-0 z-50 flex items-end justify-center p-2 sm:items-center sm:p-4 pointer-events-none">
                <div className="w-full max-w-md max-h-[calc(100dvh-0.5rem)] sm:max-h-[min(90vh,44rem)] bg-zinc-900 border border-white/10 rounded-[1.75rem] sm:rounded-3xl shadow-2xl pointer-events-auto overflow-hidden flex flex-col">
                    <div className="relative shrink-0 px-5 py-4 sm:p-6 border-b border-white/5 bg-zinc-900/95 backdrop-blur-sm">
                        <h2 className="text-xl sm:text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-brand-purple to-purple-400">
                            {mode === "signin" ? "Welcome Back" : mode === "signup" ? "Unwrap your Kandy" : "Reset Password"}
                        </h2>
                        <p className="mt-2 px-6 text-center text-xs sm:text-sm text-gray-500">
                            {mode === "signin"
                                ? "Jump back into your stash and keep unwrapping."
                                : mode === "signup"
                                  ? SIGNUP_SUPPORT_COPY
                                  : "We&apos;ll send a secure reset link to your inbox."}
                        </p>
                        <button
                            onClick={onClose}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 rounded-full transition-colors sm:right-4"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 sm:p-6 sm:space-y-6">
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-3 rounded-xl border border-brand-purple/40 bg-gradient-to-r from-brand-purple to-purple-500 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-purple/20 transition-colors disabled:opacity-50 sm:py-3 sm:text-base"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                            )}
                            Continue with Google
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-xs sm:text-sm">
                                <span className="px-2 bg-zinc-900 text-gray-500">Or continue with email</span>
                            </div>
                        </div>

                        {mode === "forgot_password" ? (
                            resetSent ? (
                                <div className="space-y-5 sm:space-y-6 text-center">
                                    <div className="mx-auto w-12 h-12 bg-brand-purple/20 text-brand-purple flex items-center justify-center rounded-full">
                                        <Mail className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-2">Check your inbox</h3>
                                        <p className="text-gray-400 text-sm">We&apos;ve sent a password reset link to your email address.</p>
                                    </div>
                                    <button
                                        onClick={() => switchMode("signin")}
                                        className="w-full rounded-xl border border-brand-purple/40 bg-gradient-to-r from-brand-purple to-purple-500 py-3 font-bold text-white shadow-lg shadow-brand-purple/20 transition-colors hover:opacity-95"
                                    >
                                        Back to Sign In
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handlePasswordReset} className="space-y-3 sm:space-y-4">
                                    <p className="text-sm text-gray-400 text-center mb-5 sm:mb-6">
                                        Enter your email address and we&apos;ll send you a link to reset your password.
                                    </p>
                                    <div className="space-y-2">
                                        <label className="text-xs sm:text-sm font-medium text-gray-400">Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                            <input
                                                name="resetEmail"
                                                type="email"
                                                required
                                                className="w-full bg-black/50 border border-white/10 rounded-xl px-10 py-2.5 sm:py-3 text-white text-sm sm:text-base focus:outline-none focus:border-brand-purple transition-colors"
                                                placeholder="Enter your email"
                                            />
                                        </div>
                                    </div>
                                    {authError && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-200 text-sm">
                                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                            <span>{authError}</span>
                                        </div>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full rounded-xl bg-gradient-to-r from-brand-purple to-purple-500 py-3 font-bold text-white shadow-lg shadow-brand-purple/20 transition-all active:scale-[0.98] disabled:opacity-50 hover:opacity-95"
                                    >
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Send Reset Link"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => switchMode("signin")}
                                        className="w-full py-3 bg-transparent text-gray-400 hover:text-white font-bold transition-colors"
                                    >
                                        Back to Sign In
                                    </button>
                                </form>
                            )
                        ) : (
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
                                {mode === "signup" && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-xs sm:text-sm font-medium text-gray-400">Username</label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                                <input
                                                    {...register("username")}
                                                    type="text"
                                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-10 py-2.5 sm:py-3 text-white text-sm sm:text-base focus:outline-none focus:border-brand-purple transition-colors"
                                                    placeholder="Create a username"
                                                />
                                            </div>
                                            {errors.username && (
                                                <p className="text-red-400 text-xs pl-1">{errors.username.message}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs sm:text-sm font-medium text-gray-400">Date of Birth</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                                <input
                                                    {...register("dob")}
                                                    type="date"
                                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-10 py-2.5 sm:py-3 text-white text-sm sm:text-base focus:outline-none focus:border-brand-purple transition-colors [color-scheme:dark]"
                                                />
                                            </div>
                                            {errors.dob && (
                                                <p className="text-red-400 text-xs pl-1">{errors.dob.message}</p>
                                            )}
                                            <p className="text-xs text-gray-500 pl-1">Must be 18 or older to join.</p>
                                        </div>
                                    </>
                                )}

                                <div className="space-y-2">
                                    <label className="text-xs sm:text-sm font-medium text-gray-400">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                        <input
                                            {...register("email")}
                                            type="email"
                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-10 py-2.5 sm:py-3 text-white text-sm sm:text-base focus:outline-none focus:border-brand-purple transition-colors"
                                            placeholder="Enter your email"
                                        />
                                    </div>
                                    {errors.email && (
                                        <p className="text-red-400 text-xs pl-1">{errors.email.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs sm:text-sm font-medium text-gray-400">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                        <input
                                            {...register("password")}
                                            type="password"
                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-10 py-2.5 sm:py-3 text-white text-sm sm:text-base focus:outline-none focus:border-brand-purple transition-colors"
                                            placeholder="Password"
                                        />
                                    </div>
                                    {errors.password && (
                                        <p className="text-red-400 text-xs pl-1">{errors.password.message}</p>
                                    )}
                                    {mode === "signin" && (
                                        <div className="flex justify-end mt-2">
                                            <button
                                                type="button"
                                                onClick={() => switchMode("forgot_password")}
                                                className="text-xs text-gray-400 hover:text-brand-purple transition-colors"
                                            >
                                                Forgot password?
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {authError && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-200 text-sm">
                                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                        <span>{authError}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full rounded-xl bg-gradient-to-r from-brand-purple to-purple-500 py-3 text-base font-extrabold tracking-tight text-white shadow-lg shadow-brand-purple/20 transition-all active:scale-[0.98] disabled:opacity-50 hover:opacity-95 sm:py-3.5 sm:text-lg"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                    ) : mode === "signin" ? (
                                        "Sign In"
                                    ) : (
                                        SECONDARY_UNWRAP_CTA
                                    )}
                                </button>
                            </form>
                        )}

                        {mode !== "forgot_password" && (
                            <div className="text-center text-xs sm:text-sm text-gray-400">
                                {mode === "signin" ? (
                                    <p>
                                        Don&apos;t have an account?{" "}
                                        <button
                                            onClick={() => switchMode("signup")}
                                            className="text-brand-purple font-medium"
                                        >
                                            Sign up
                                        </button>
                                    </p>
                                ) : (
                                    <p>
                                        Already have an account?{" "}
                                        <button
                                            onClick={() => switchMode("signin")}
                                            className="text-brand-purple font-medium"
                                        >
                                            Sign in
                                        </button>
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
