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
                "relative isolate min-w-0 overflow-x-clip border border-white/10 bg-[#100a24]/95 shadow-[0_18px_54px_rgba(0,0,0,0.3)]",
                compact
                    ? "mb-4 rounded-[1.45rem] px-3.5 py-3.5 md:mb-5 md:px-5 md:py-4"
                    : "mb-5 rounded-[1.6rem] px-4 py-4 md:mb-6 md:px-6 md:py-5",
                className
            )}
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(178,140,255,0.26),transparent_43%),radial-gradient(circle_at_100%_0%,rgba(236,72,153,0.12),transparent_36%)]"
            />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-purple/70 to-transparent" />
            <div className="relative z-10">
                {topSlot ? (
                    <div className={cn("border-b border-white/10", compact ? "mb-3 pb-2.5" : "mb-4 pb-3")}>{topSlot}</div>
                ) : null}
                <div className={cn(compact ? "flex min-w-0 flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between" : "flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between", contentClassName)}>
                    <div className="min-w-0">
                        {eyebrow ? (
                            <div className={cn("flex items-center gap-2", compact ? "mb-1" : "mb-1.5")}>
                                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-purple shadow-[0_0_12px_rgba(178,140,255,0.95)]" />
                                <p className={cn("font-semibold uppercase text-brand-purple", compact ? "text-[10px] tracking-[0.16em]" : "text-[11px] tracking-[0.18em]")}>
                                    {eyebrow}
                                </p>
                            </div>
                        ) : null}
                        <h1 className={cn("break-words font-black leading-tight tracking-tight text-white", compact ? "text-[1.65rem] md:text-[1.82rem]" : "text-2xl md:text-[2rem]")}>{title}</h1>
                        {subtitle ? (
                            <p className={cn("text-slate-300", compact ? "mt-0.5 max-w-2xl text-xs leading-5 md:text-[13px]" : "mt-1 max-w-3xl text-sm leading-6 md:text-[15px]")}>
                                {subtitle}
                            </p>
                        ) : null}
                    </div>
                    {actions ? (
                        <div className={cn("min-w-0 rounded-[1rem] border border-white/10 bg-black/20 shadow-inner shadow-black/20 backdrop-blur-md", compact ? "flex flex-wrap items-center gap-1.5 p-1.5 sm:gap-2" : "flex flex-wrap items-center gap-2 p-1.5 sm:gap-3 sm:p-2", "w-full lg:w-auto lg:justify-end")}>
                            {actions}
                        </div>
                    ) : null}
                </div>
            </div>
        </header>
    );
}
