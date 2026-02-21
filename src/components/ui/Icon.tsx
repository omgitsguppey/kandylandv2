import React from 'react';
import { cn } from '@/lib/utils';

interface IconProps {
    className?: string;
    size?: "sm" | "md" | "lg" | "xl";
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

export function CandyOutlineIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24" height="24" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            {...props}
        >
            <circle cx="12" cy="12" r="4" />
            <path d="M15 10l6-4-2 6 2 6-6-4" />
            <path d="M9 14l-6 4 2-6-2-6 6 4" />
        </svg>
    );
}
