"use client";

import type { FormEvent, KeyboardEventHandler, ReactNode } from "react";
import type { FieldErrors, UseFormHandleSubmit, UseFormRegister } from "react-hook-form";
import {
    AlertCircle,
    Calendar,
    ChevronLeft,
    Loader2,
    Lock,
    Mail,
    User,
    X,
} from "lucide-react";

import type { AuthFormData, AuthMode } from "@/components/Auth/AuthHelpers";

type KandyAuthEntryExperienceProps = {
    mode: AuthMode;
    heading: string;
    supportCopy: string;
    isLoading: boolean;
    showGoogleButton: boolean;
    onGoogleSignIn: () => void;
    onClose: () => void;
    onSwitchMode: (mode: AuthMode) => void;
    resetSent: boolean;
    onPasswordReset: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
    register: UseFormRegister<AuthFormData>;
    handleSubmit: UseFormHandleSubmit<AuthFormData>;
    onSubmit: (data: AuthFormData) => Promise<void>;
    onCreatorKeyDown: KeyboardEventHandler<HTMLFormElement>;
    errors: FieldErrors<AuthFormData>;
    checkingUsername: boolean;
    usernameAvailable: boolean | null;
    markUsernameTouched: () => void;
    authError: string | null;
    authConflictPrimaryCta: string | null;
    authConflictSecondaryCta: string | null;
    onAuthConflictPrimaryCta: () => void;
    emailSignInBlocked: boolean;
    emailSignInCooldownSeconds: number;
    signupActionLabel: string;
    isCreatorSignupMode: boolean;
    creatorStep: number;
    creatorStepCount: number;
    isCreatorFinalStep: boolean;
    creatorIntake: ReactNode;
    onCreatorBack: () => void;
    onAdvanceCreatorStep: () => void;
};

function GoogleMark() {
    return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    );
}

const inputClassName = "block min-h-11 w-full rounded-2xl border border-white/12 bg-[#170326]/75 px-10 text-sm text-white shadow-inner shadow-purple-950/20 outline-none transition placeholder:text-purple-100/40 focus:border-pink-200/70 focus:ring-2 focus:ring-pink-300/20";
const labelClassName = "text-sm font-semibold text-purple-100/78";
const primaryActionClassName = "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-pink-100/30 bg-pink-300 px-4 text-sm font-bold text-purple-950 shadow-[0_14px_28px_rgba(236,72,153,0.24)] transition hover:bg-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-100 focus:ring-offset-2 focus:ring-offset-purple-950 disabled:cursor-not-allowed disabled:opacity-50";
const quietActionClassName = "inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.055] px-4 text-sm font-semibold text-purple-50 transition hover:bg-white/[0.11] focus:outline-none focus:ring-2 focus:ring-pink-200/60 disabled:cursor-not-allowed disabled:opacity-50";

export function KandyAuthEntryExperience({
    mode,
    heading,
    supportCopy,
    isLoading,
    showGoogleButton,
    onGoogleSignIn,
    onClose,
    onSwitchMode,
    resetSent,
    onPasswordReset,
    register,
    handleSubmit,
    onSubmit,
    onCreatorKeyDown,
    errors,
    checkingUsername,
    usernameAvailable,
    markUsernameTouched,
    authError,
    authConflictPrimaryCta,
    authConflictSecondaryCta,
    onAuthConflictPrimaryCta,
    emailSignInBlocked,
    emailSignInCooldownSeconds,
    signupActionLabel,
    isCreatorSignupMode,
    creatorStep,
    creatorStepCount,
    isCreatorFinalStep,
    creatorIntake,
    onCreatorBack,
    onAdvanceCreatorStep,
}: KandyAuthEntryExperienceProps) {
    const isForgotPasswordMode = mode === "forgot_password";

    return (
        <>
            <div
                aria-hidden="true"
                onClick={onClose}
                className="fixed inset-0 z-50 bg-[#10021f]/88 backdrop-blur-md"
            />

            <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
                <section
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="kandy-auth-entry-title"
                    aria-describedby="kandy-auth-entry-description"
                    className="pointer-events-auto max-h-[92dvh] w-full max-w-2xl overflow-hidden rounded-[2rem] border border-pink-100/15 bg-[#21083e] shadow-[0_32px_100px_rgba(8,1,23,0.66)]"
                >
                    <div className="relative flex min-w-0 flex-1 flex-col bg-[radial-gradient(circle_at_82%_0%,rgba(236,72,153,0.2),transparent_32%),linear-gradient(165deg,rgba(53,13,83,0.98),rgba(27,5,54,0.99))]">
                        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(115deg,rgba(255,255,255,0.08),transparent_58%)]" />
                        <header className="relative shrink-0 border-b border-white/10 px-5 pb-5 pt-5 sm:px-7 sm:pt-6">
                            <div className="flex items-center justify-between gap-3 pr-12">
                                <span className="inline-flex rounded-full border border-pink-200/20 bg-pink-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-pink-100">
                                    KandyDrops
                                </span>
                                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-purple-100/60">
                                    {isCreatorSignupMode ? "Creator entry" : "Account entry"}
                                </span>
                            </div>

                            <div className="mt-5 pr-12">
                                <h1 id="kandy-auth-entry-title" className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                                    {heading}
                                </h1>
                                <p id="kandy-auth-entry-description" className="mt-2 max-w-lg text-sm leading-6 text-purple-100/70">
                                    {supportCopy}
                                </p>
                            </div>

                            {isCreatorSignupMode ? (
                                <div className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-purple-100/60">
                                    <span>Creator journey</span>
                                    <span>Step {creatorStep + 1} of {creatorStepCount}</span>
                                </div>
                            ) : null}

                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close authentication modal"
                                title="Close authentication modal"
                                className="absolute right-4 top-4 inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-purple-100 transition hover:bg-white/[0.12] hover:text-white focus:outline-none focus:ring-2 focus:ring-pink-200/60 sm:right-6"
                            >
                                <X className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </header>

                        <div className="relative min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
                            {showGoogleButton ? (
                                <div className="space-y-4">
                                    <button
                                        type="button"
                                        onClick={onGoogleSignIn}
                                        disabled={isLoading}
                                        className="inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-2xl border border-pink-100/25 bg-white px-4 text-sm font-bold text-purple-950 shadow-[0_14px_30px_rgba(8,1,23,0.22)] transition hover:bg-pink-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-purple-950 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <GoogleMark />}
                                        Continue with Google
                                    </button>

                                    <div className="flex items-center gap-3" aria-hidden="true">
                                        <div className="h-px flex-1 bg-white/10" />
                                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-purple-100/48">
                                            Or email
                                        </span>
                                        <div className="h-px flex-1 bg-white/10" />
                                    </div>
                                </div>
                            ) : null}

                            {isForgotPasswordMode ? (
                                resetSent ? (
                                    <div className="mx-auto max-w-md py-7 text-center">
                                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl border border-pink-200/25 bg-pink-400/12 text-pink-100">
                                            <Mail className="h-6 w-6" aria-hidden="true" />
                                        </div>
                                        <h2 className="mt-5 text-xl font-semibold text-white">Check your inbox</h2>
                                        <p className="mt-2 text-sm leading-6 text-purple-100/70">
                                            We&apos;ve sent a password reset link to your email address.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => onSwitchMode("signin")}
                                            className={primaryActionClassName + " mt-6"}
                                        >
                                            Back to sign in
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={onPasswordReset} className="mx-auto max-w-md space-y-4 pt-5">
                                        <div className="rounded-2xl border border-pink-200/14 bg-pink-400/[0.06] p-4">
                                            <p className="text-sm leading-6 text-purple-100/75">
                                                Enter the email connected to your account and we&apos;ll send a reset link.
                                            </p>
                                        </div>
                                        <label className="block space-y-2">
                                            <span className={labelClassName}>Email</span>
                                            <span className="relative block">
                                                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-pink-100/55" aria-hidden="true" />
                                                <input
                                                    name="resetEmail"
                                                    type="email"
                                                    required
                                                    autoComplete="email"
                                                    className={inputClassName}
                                                    placeholder="Enter your email"
                                                />
                                            </span>
                                        </label>
                                        {authError ? (
                                            <div role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-200/25 bg-rose-400/10 p-3 text-sm leading-6 text-rose-100">
                                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                                <span>{authError}</span>
                                            </div>
                                        ) : null}
                                        <button type="submit" disabled={isLoading} className={primaryActionClassName}>
                                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : "Send reset link"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onSwitchMode("signin")}
                                            className={quietActionClassName + " w-full"}
                                        >
                                            Back to sign in
                                        </button>
                                    </form>
                                )
                            ) : (
                                <form
                                    onSubmit={handleSubmit(onSubmit)}
                                    onKeyDown={onCreatorKeyDown}
                                    className="space-y-4 pt-5"
                                >
                                    {isCreatorSignupMode ? (
                                        <div className="flex gap-2" aria-label={"Creator setup step " + (creatorStep + 1) + " of " + creatorStepCount}>
                                            {Array.from({ length: creatorStepCount }).map((_, index) => (
                                                <span
                                                    key={"creator-step-" + index}
                                                    className={[
                                                        "h-2 flex-1 rounded-full",
                                                        index <= creatorStep ? "bg-pink-300" : "bg-white/10",
                                                    ].join(" ")}
                                                />
                                            ))}
                                        </div>
                                    ) : null}

                                    {mode === "signin" ? (
                                        <>
                                            <label className="block space-y-2">
                                                <span className={labelClassName}>Email or username</span>
                                                <span className="relative block">
                                                    <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-pink-100/55" aria-hidden="true" />
                                                    <input
                                                        {...register("email")}
                                                        type="text"
                                                        autoComplete="username"
                                                        className={inputClassName}
                                                        placeholder="Email or username"
                                                    />
                                                </span>
                                                {errors.email ? <p className="pl-1 text-xs text-rose-200">{errors.email.message}</p> : null}
                                                {!errors.email ? <p className="pl-1 text-xs leading-5 text-purple-100/55">Use the email you signed up with or your exact username.</p> : null}
                                            </label>

                                            <label className="block space-y-2">
                                                <span className="flex items-center justify-between gap-3">
                                                    <span className={labelClassName}>Password</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => onSwitchMode("forgot_password")}
                                                        className="min-h-11 rounded-xl px-2 text-sm font-semibold text-pink-100 transition hover:text-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-200/60"
                                                    >
                                                        Forgot password?
                                                    </button>
                                                </span>
                                                <span className="relative block">
                                                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-pink-100/55" aria-hidden="true" />
                                                    <input
                                                        {...register("password")}
                                                        type="password"
                                                        autoComplete="current-password"
                                                        className={inputClassName}
                                                        placeholder="Password"
                                                    />
                                                </span>
                                                {errors.password ? <p className="pl-1 text-xs text-rose-200">{errors.password.message}</p> : null}
                                            </label>
                                        </>
                                    ) : null}

                                    {mode === "signup" ? (
                                        <>
                                            <label className="block space-y-2">
                                                <span className={labelClassName}>Email</span>
                                                <span className="relative block">
                                                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-pink-100/55" aria-hidden="true" />
                                                    <input
                                                        {...register("email")}
                                                        type="email"
                                                        autoComplete="email"
                                                        className={inputClassName}
                                                        placeholder="Email address"
                                                    />
                                                </span>
                                                {errors.email ? <p className="pl-1 text-xs text-rose-200">{errors.email.message}</p> : null}
                                            </label>

                                            <label className="block space-y-2">
                                                <span className={labelClassName}>Username</span>
                                                <span className="relative block">
                                                    <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-pink-100/55" aria-hidden="true" />
                                                    <input
                                                        {...register("username", { onChange: markUsernameTouched })}
                                                        type="text"
                                                        autoComplete="username"
                                                        className={inputClassName}
                                                        placeholder="Choose a username"
                                                    />
                                                </span>
                                                {errors.username ? <p className="pl-1 text-xs text-rose-200">{errors.username.message}</p> : null}
                                                {!errors.username && checkingUsername ? <p className="pl-1 text-xs text-purple-100/60">Checking username...</p> : null}
                                                {!errors.username && !checkingUsername && usernameAvailable === true ? <p className="pl-1 text-xs text-pink-100">Username available.</p> : null}
                                                {!errors.username && !checkingUsername && usernameAvailable === false ? <p className="pl-1 text-xs text-rose-200">Username already taken.</p> : null}
                                            </label>

                                            <label className="block space-y-2">
                                                <span className={labelClassName}>Date of birth</span>
                                                <span className="relative block">
                                                    <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-pink-100/55" aria-hidden="true" />
                                                    <input
                                                        {...register("dob")}
                                                        type="date"
                                                        className={inputClassName + " appearance-none pr-4 [color-scheme:dark]"}
                                                    />
                                                </span>
                                                {errors.dob ? <p className="pl-1 text-xs text-rose-200">{errors.dob.message}</p> : null}
                                            </label>

                                            <label className="block space-y-2">
                                                <span className={labelClassName}>Password</span>
                                                <span className="relative block">
                                                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-pink-100/55" aria-hidden="true" />
                                                    <input
                                                        {...register("password")}
                                                        type="password"
                                                        autoComplete="new-password"
                                                        className={inputClassName}
                                                        placeholder="Create a password"
                                                    />
                                                </span>
                                                {errors.password ? <p className="pl-1 text-xs text-rose-200">{errors.password.message}</p> : null}
                                            </label>
                                        </>
                                    ) : null}

                                    {isCreatorSignupMode ? creatorIntake : null}

                                    {authError ? (
                                        <div role="alert" className="rounded-2xl border border-rose-200/25 bg-rose-400/10 p-3 text-sm leading-6 text-rose-100">
                                            <div className="flex items-start gap-2">
                                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                                <span>{authError}</span>
                                            </div>
                                            {authConflictPrimaryCta ? (
                                                <div className="mt-3 flex flex-wrap items-center gap-2 pl-6">
                                                    <button
                                                        type="button"
                                                        onClick={onAuthConflictPrimaryCta}
                                                        className="inline-flex min-h-11 items-center rounded-xl border border-rose-100/30 bg-rose-50/10 px-3 text-sm font-semibold text-rose-50 transition hover:bg-rose-50/20 focus:outline-none focus:ring-2 focus:ring-rose-100/60"
                                                    >
                                                        {authConflictPrimaryCta}
                                                    </button>
                                                    {authConflictSecondaryCta ? <span className="text-xs text-rose-100/75">{authConflictSecondaryCta}</span> : null}
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}

                                    {mode === "signin" && emailSignInBlocked ? (
                                        <div className="rounded-2xl border border-pink-200/16 bg-pink-400/[0.06] p-3 text-sm leading-6 text-purple-100/76">
                                            Manual sign-in is temporarily paused on this device for about {emailSignInCooldownSeconds} seconds. Reset your password if you need a recovery path now.
                                        </div>
                                    ) : null}

                                    {mode === "signin" ? (
                                        <button type="submit" disabled={isLoading || emailSignInBlocked} className={primaryActionClassName}>
                                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : "Sign in"}
                                        </button>
                                    ) : null}

                                    {mode === "signup" ? (
                                        <button type="submit" disabled={isLoading} className={primaryActionClassName}>
                                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : signupActionLabel}
                                        </button>
                                    ) : null}

                                    {isCreatorSignupMode ? (
                                        <div className="sticky bottom-0 z-10 flex gap-3 rounded-3xl border border-pink-200/18 bg-[#2d0b50]/95 p-2 shadow-[0_-12px_28px_rgba(20,2,48,0.3)] backdrop-blur">
                                            <button type="button" onClick={onCreatorBack} className={quietActionClassName + " flex-1"}>
                                                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                                {creatorStep > 0 ? "Back" : "Sign in"}
                                            </button>
                                            {isCreatorFinalStep ? (
                                                <button type="submit" disabled={isLoading} className={primaryActionClassName + " flex-[1.25]"}>
                                                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : "Submit creator application"}
                                                </button>
                                            ) : (
                                                <button type="button" onClick={onAdvanceCreatorStep} disabled={isLoading} className={primaryActionClassName + " flex-[1.25]"}>
                                                    Continue
                                                </button>
                                            )}
                                        </div>
                                    ) : null}

                                    <div className="space-y-1.5 pt-1 text-center text-sm leading-6 text-purple-100/65">
                                        {mode === "signin" ? (
                                            <>
                                                <p>
                                                    Don&apos;t have an account?{" "}
                                                    <button type="button" onClick={() => onSwitchMode("signup")} className="min-h-11 rounded-xl px-1 font-semibold text-pink-100 transition hover:text-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-200/60">
                                                        Sign up
                                                    </button>
                                                </p>
                                                <p>
                                                    Joining as a creator?{" "}
                                                    <button type="button" onClick={() => onSwitchMode("creator_signup")} className="min-h-11 rounded-xl px-1 font-semibold text-pink-100 transition hover:text-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-200/60">
                                                        Start here
                                                    </button>
                                                </p>
                                            </>
                                        ) : null}

                                        {mode === "signup" ? (
                                            <>
                                                <p>
                                                    Already have an account?{" "}
                                                    <button type="button" onClick={() => onSwitchMode("signin")} className="min-h-11 rounded-xl px-1 font-semibold text-pink-100 transition hover:text-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-200/60">
                                                        Sign in
                                                    </button>
                                                </p>
                                                <p>
                                                    Signing up as a creator?{" "}
                                                    <button type="button" onClick={() => onSwitchMode("creator_signup")} className="min-h-11 rounded-xl px-1 font-semibold text-pink-100 transition hover:text-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-200/60">
                                                        Start here
                                                    </button>
                                                </p>
                                            </>
                                        ) : null}

                                        {isCreatorSignupMode ? (
                                            <>
                                                <p>
                                                    Want the regular fan signup instead?{" "}
                                                    <button type="button" onClick={() => onSwitchMode("signup")} className="min-h-11 rounded-xl px-1 font-semibold text-pink-100 transition hover:text-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-200/60">
                                                        Use the regular signup
                                                    </button>
                                                </p>
                                                <p>
                                                    Already have an account?{" "}
                                                    <button type="button" onClick={() => onSwitchMode("signin")} className="min-h-11 rounded-xl px-1 font-semibold text-pink-100 transition hover:text-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-200/60">
                                                        Sign in
                                                    </button>
                                                </p>
                                            </>
                                        ) : null}
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}
