import React from 'react';
import { cn } from '@/lib/utils';

interface IconProps {
    className?: string;
    size?: "sm" | "md" | "lg" | "xl";
}

export function CandyIcon({ className, size = "md" }: IconProps) {
    const sizes = {
        sm: "w-5 h-5",
        md: "w-10 h-10",
        lg: "w-16 h-16",
        xl: "w-24 h-24"
    };

    return (
        <div className={cn("relative flex items-center justify-center", sizes[size], className)}>
            {/* Wrapper for rotation/animation */}
            <div className="relative w-full h-full animate-float">
                {/* Main Candy Body - Diagonal Stripe Effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-brand-pink via-brand-purple to-brand-cyan shadow-[0_0_15px_rgba(236,72,153,0.5)] overflow-hidden border border-white/20">
                    <div className="absolute top-0 left-1/4 w-1/4 h-full bg-white/20 -skew-x-12 blur-[1px]"></div>
                    <div className="absolute top-0 right-1/4 w-1/4 h-full bg-white/10 -skew-x-12 blur-[1px]"></div>
                </div>
                {/* Shine */}
                <div className="absolute top-1/4 left-1/4 w-1/4 h-1/4 bg-white/60 rounded-full blur-[2px]"></div>
            </div>
        </div>
    );
}

export function GumDropIcon({ className, size = "md" }: IconProps) {
    const sizes = {
        sm: "w-5 h-5",
        md: "w-10 h-10",
        lg: "w-16 h-16",
        xl: "w-24 h-24"
    };

    return (
        <div className={cn("relative flex items-center justify-center", sizes[size], className)}>
            <div className="relative w-full h-full">
                {/* Drop Shape */}
                <div className="absolute inset-x-[15%] bottom-0 top-[10%] bg-gradient-to-b from-brand-cyan to-blue-600 rounded-t-full rounded-b-[40%] shadow-[0_0_20px_rgba(6,182,212,0.6)] border-t border-white/30">
                    {/* Inner texture/shine */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent rounded-t-full rounded-b-[40%]"></div>
                </div>
                {/* Highlight */}
                <div className="absolute top-[20%] left-[30%] w-[15%] h-[10%] bg-white/70 rounded-full blur-[1px]"></div>
            </div>
        </div>
    );
}
