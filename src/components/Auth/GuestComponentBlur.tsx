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
}

export function GuestComponentBlur({ children, className, actionText = "Unlock to View" }: GuestComponentBlurProps) {
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
                {/* The Blur Layer */}
                <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-md transition-all duration-300 group-hover:bg-black/60 group-hover:backdrop-blur-lg flex flex-col items-center justify-center p-4">
                    <div className="bg-black/60 p-3 rounded-2xl border border-white/10 shadow-xl flex flex-col items-center justify-center gap-2 transform transition-transform duration-300 group-hover:scale-105">
                        <div className="w-10 h-10 bg-brand-purple/20 rounded-full flex items-center justify-center border border-brand-purple/30">
                            <Lock className="w-5 h-5 text-brand-purple" />
                        </div>
                        <span className="text-white font-bold text-sm text-center px-2">{actionText}</span>
                    </div>
                </div>

                {/* The Underlying Content (Blurred) */}
                <div className="pointer-events-none select-none opacity-40 blur-[8px] transition-all duration-300 group-hover:blur-[12px]">
                    {children}
                </div>

                {/* Click Catcher to trigger Auth */}
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openAuthModal();
                    }}
                    className="absolute inset-0 z-20 w-full h-full cursor-pointer focus:outline-none"
                    aria-label="Sign in to view"
                />
            </div>
        );
    }

    // Authenticated state: just render the children normally
    return <>{children}</>;
}
