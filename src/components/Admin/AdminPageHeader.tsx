"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AdminPageHeaderProps = {
    title: ReactNode;
    subtitle?: ReactNode;
    eyebrow?: ReactNode;
    actions?: ReactNode;
    topSlot?: ReactNode;
    className?: string;
    contentClassName?: string;
    compact?: boolean;
};

export function AdminPageHeader({
    title,
    subtitle,
    eyebrow = "Admin Console",
    actions,
    topSlot,
    className,
    contentClassName,
    compact = false,
}: AdminPageHeaderProps) {
    return (
        <header
            className={cn(
                compact
                    ? "mb-4 min-w-0 overflow-x-clip rounded-[1.45rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(178,140,255,0.14),rgba(0,0,0,0.08)_42%,rgba(0,0,0,0.92)_100%)] px-3.5 py-3.5 shadow-xl shadow-black/20 md:mb-5 md:px-5 md:py-4"
                    : "mb-5 min-w-0 overflow-x-clip rounded-[1.6rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(178,140,255,0.14),rgba(0,0,0,0.08)_42%,rgba(0,0,0,0.92)_100%)] px-4 py-4 shadow-xl shadow-black/20 md:mb-6 md:px-6 md:py-5",
                className
            )}
        >
            {topSlot ? <div className={compact ? "mb-2.5" : "mb-3"}>{topSlot}</div> : null}
            <div className={cn(compact ? "flex min-w-0 flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between" : "flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between", contentClassName)}>
                <div className="min-w-0">
                    {eyebrow ? (
                        <p className={cn("font-semibold uppercase text-brand-purple", compact ? "mb-1 text-[10px] tracking-[0.16em]" : "mb-1 text-[11px] tracking-[0.18em]")}>
                            {eyebrow}
                        </p>
                    ) : null}
                    <h1 className={cn("font-black tracking-tight text-white", compact ? "text-[1.65rem] md:text-[1.82rem]" : "text-2xl md:text-[2rem]")}>{title}</h1>
                    {subtitle ? (
                        <p className={cn("text-gray-300", compact ? "mt-0.5 max-w-2xl text-xs leading-5 md:text-[13px]" : "mt-1 max-w-3xl text-sm md:text-[15px]")}>
                            {subtitle}
                        </p>
                    ) : null}
                </div>
                {actions ? (
                    <div className={cn("min-w-0 flex flex-wrap items-center lg:justify-end", compact ? "gap-1.5 sm:gap-2" : "gap-2 sm:gap-3")}>
                        {actions}
                    </div>
                ) : null}
            </div>
        </header>
    );
}
