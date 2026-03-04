"use client";

import { useAuth } from "@/context/AuthContext";
import { Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GuestBlurOverlayProps {
    children: ReactNode;
    className?: string;
}

export function GuestBlurOverlay({ children, className }: GuestBlurOverlayProps) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className={cn("relative w-full h-full min-h-[300px] flex items-center justify-center bg-zinc-900 rounded-3xl", className)}>
                <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className={cn("relative w-full h-full overflow-hidden rounded-3xl", className)}>
                <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
                    {/* The Blur Layer */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

                    {/* The CTA */}
                    <div className="relative z-20 flex flex-col items-center justify-center text-center max-w-sm bg-zinc-950/80 p-8 rounded-3xl border border-white/10 shadow-2xl">
                        <div className="w-16 h-16 bg-brand-purple/20 rounded-full flex items-center justify-center mb-6 border border-brand-purple/30">
                            <Lock className="w-8 h-8 text-brand-purple" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Sign in Required</h3>
                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                            Only members can unwrap. Create an account for free!
                        </p>
                        <div className="flex flex-col w-full gap-3">
                            <Link
                                href="/?auth=signup"
                                className="w-full py-3 px-4 rounded-xl bg-brand-purple text-black font-bold hover:bg-white transition-colors"
                            >
                                Create Free Account
                            </Link>
                            <Link
                                href="/?auth=login"
                                className="w-full py-3 px-4 rounded-xl border border-white/20 text-white font-bold hover:bg-white/10 transition-colors"
                            >
                                Log In
                            </Link>
                        </div>
                    </div>
                </div>

                {/* The Underlying Content (Blurred) */}
                <div className="pointer-events-none select-none opacity-50 blur-sm">
                    {children}
                </div>
            </div>
        );
    }

    // Authenticated state: just render the children normally
    return <>{children}</>;
}
