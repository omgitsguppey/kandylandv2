"use client";

import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { Loader2, Lock } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GuestComponentBlurProps {
    children: ReactNode;
    className?: string;
    actionText?: string;
    supportText?: string;
}

export function GuestComponentBlur({
    children,
    className,
    actionText = "Unwrap now",
    supportText = "Create a free profile to start unwrapping exclusive KandyDrops."
}: GuestComponentBlurProps) {
    const { user, loading } = useAuth();
    const { openAuthModal } = useUI();

    if (loading) {
        return (
            <div className={cn("relative w-full h-full min-h-[150px] flex items-center justify-center bg-zinc-900 rounded-3xl", className)}>
                <Loader2 className="w-8 h-8 text-brand-purple animate-spin" aria-hidden="true" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className={cn("group relative h-full w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#140720]", className)}>
                <div className="pointer-events-none select-none opacity-45 blur-[10px] scale-[1.01] transition-all duration-300 group-hover:blur-[14px]">
                    {children}
                </div>

                <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(244,114,182,0.28),transparent_30%),linear-gradient(180deg,rgba(17,3,31,0.18),rgba(10,2,18,0.92))]" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-5 sm:p-6">
                    <div className="border-t border-pink-100/20 pt-4">
                        <div className="flex items-end justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-pink-100/75">Sealed for members</p>
                                <p className="mt-2 text-lg font-black tracking-tight text-white">{actionText}</p>
                                <p className="mt-1 max-w-md text-sm leading-6 text-purple-100/72">{supportText}</p>
                            </div>
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-pink-100/25 bg-pink-300/10 text-pink-100 shadow-[0_0_24px_rgba(236,72,153,0.22)]">
                                <Lock className="h-5 w-5" aria-hidden="true" />
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openAuthModal("signup");
                    }}
                    className="absolute inset-0 z-20 h-full w-full cursor-pointer rounded-[2rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-100 focus-visible:ring-inset"
                    aria-label={actionText}
                />
            </div>
        );
    }

    // Authenticated state: just render the children normally
    return <>{children}</>;
}
