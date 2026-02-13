"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, Calendar, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { differenceInYears, parseISO } from "date-fns";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type AuthMode = "signin" | "signup";

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
    const [mode, setMode] = useState<AuthMode>("signin");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form States
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [dob, setDob] = useState("");

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await signInWithGoogle();
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to sign in with Google.");
        } finally {
            setIsLoading(false);
        }
    };

    const calculateAge = (dateOfBirth: string) => {
        const birthDate = parseISO(dateOfBirth);
        return differenceInYears(new Date(), birthDate);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (mode === "signup") {
                // 1. Validate Age
                if (!dob) {
                    throw new Error("Date of birth is required.");
                }
                const age = calculateAge(dob);
                if (age < 18) {
                    throw new Error("You must be 18+ to join KandyDrops.");
                }

                // 2. Validate Username
                if (!username || username.length < 3) {
                    throw new Error("Username must be at least 3 characters.");
                }

                await signUpWithEmail(email, password, username, dob);
            } else {
                await signInWithEmail(email, password);
            }
            onClose();
        } catch (err: any) {
            console.error(err);
            if (err.code === "auth/email-already-in-use") {
                setError("Email is already registered.");
            } else if (err.code === "auth/invalid-credential") {
                setError("Invalid email or password.");
            } else {
                setError(err.message || "Authentication failed. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl pointer-events-auto overflow-hidden">
                            {/* Header */}
                            <div className="relative p-6 border-b border-white/5">
                                <h2 className="text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-brand-pink to-brand-cyan">
                                    {mode === "signin" ? "Welcome Back" : "Join the Drop"}
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/5 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-6">
                                {/* Social Auth */}
                                <button
                                    onClick={handleGoogleSignIn}
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-3 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
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
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-zinc-900 text-gray-500">Or continue with email</span>
                                    </div>
                                </div>

                                {/* Email Form */}
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {mode === "signup" && (
                                        <>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-400">Username</label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                                    <input
                                                        type="text"
                                                        value={username}
                                                        onChange={(e) => setUsername(e.target.value)}
                                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-10 py-3 text-white focus:outline-none focus:border-brand-pink transition-colors"
                                                        placeholder="Create a username"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-400">Date of Birth</label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                                    <input
                                                        type="date"
                                                        value={dob}
                                                        onChange={(e) => setDob(e.target.value)}
                                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-10 py-3 text-white focus:outline-none focus:border-brand-pink transition-colors [color-scheme:dark]"
                                                        required
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-500 pl-1">Must be 18 or older to join.</p>
                                            </div>
                                        </>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-400">Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full bg-black/50 border border-white/10 rounded-xl px-10 py-3 text-white focus:outline-none focus:border-brand-pink transition-colors"
                                                placeholder="Enter your email"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-400">Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full bg-black/50 border border-white/10 rounded-xl px-10 py-3 text-white focus:outline-none focus:border-brand-pink transition-colors"
                                                placeholder="••••••••"
                                                required
                                                minLength={6}
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-200 text-sm">
                                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-3 bg-gradient-to-r from-brand-pink to-brand-purple rounded-xl text-white font-bold shadow-lg shadow-brand-pink/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                        ) : mode === "signin" ? (
                                            "Sign In"
                                        ) : (
                                            "Create Account"
                                        )}
                                    </button>
                                </form>

                                {/* Footer / Toggle */}
                                <div className="text-center text-sm text-gray-400">
                                    {mode === "signin" ? (
                                        <p>
                                            Don't have an account?{" "}
                                            <button
                                                onClick={() => {
                                                    setMode("signup");
                                                    setError(null);
                                                }}
                                                className="text-brand-pink hover:underline font-medium"
                                            >
                                                Sign up
                                            </button>
                                        </p>
                                    ) : (
                                        <p>
                                            Already have an account?{" "}
                                            <button
                                                onClick={() => {
                                                    setMode("signin");
                                                    setError(null);
                                                }}
                                                className="text-brand-pink hover:underline font-medium"
                                            >
                                                Sign in
                                            </button>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
