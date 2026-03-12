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
                <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className={cn("relative w-full h-full overflow-hidden rounded-3xl group", className)}>
                <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_top,rgba(178,140,255,0.18),transparent_55%)] bg-black/55 backdrop-blur-md transition-all duration-300 group-hover:bg-black/70 group-hover:backdrop-blur-xl flex flex-col items-center justify-center p-4">
                    <div className="max-w-[240px] rounded-[1.75rem] border border-white/10 bg-black/75 px-4 py-5 shadow-[0_0_30px_rgba(164,118,255,0.15)] flex flex-col items-center justify-center gap-3 text-center transform transition-transform duration-300 group-hover:scale-[1.02]">
                        <div className="w-11 h-11 bg-brand-purple/20 rounded-full flex items-center justify-center border border-brand-purple/30 shadow-[0_0_20px_rgba(164,118,255,0.15)]">
                            <Lock className="w-5 h-5 text-brand-purple" />
                        </div>
                        <span className="text-white font-bold text-sm text-center px-2">{actionText}</span>
                        <p className="text-xs leading-relaxed text-gray-400">{supportText}</p>
                    </div>
                </div>

                <div className="pointer-events-none select-none opacity-50 blur-[10px] scale-[1.01] transition-all duration-300 group-hover:blur-[14px]">
                    {children}
                </div>

                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openAuthModal("signup");
                    }}
                    className="absolute inset-0 z-20 w-full h-full cursor-pointer focus:outline-none"
                    aria-label={actionText}
                />
            </div>
        );
    }

    // Authenticated state: just render the children normally
    return <>{children}</>;
}
