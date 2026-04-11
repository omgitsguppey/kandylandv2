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
};

export function AdminPageHeader({
    title,
    subtitle,
    eyebrow = "Admin Console",
    actions,
    topSlot,
    className,
    contentClassName,
}: AdminPageHeaderProps) {
    return (
        <header
            className={cn(
                "mb-5 rounded-[1.6rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(178,140,255,0.14),rgba(0,0,0,0.08)_42%,rgba(0,0,0,0.92)_100%)] px-4 py-4 shadow-xl shadow-black/20 md:mb-6 md:px-6 md:py-5",
                className
            )}
        >
            {topSlot ? <div className="mb-3">{topSlot}</div> : null}
            <div className={cn("flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between", contentClassName)}>
                <div className="min-w-0">
                    {eyebrow ? (
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">
                            {eyebrow}
                        </p>
                    ) : null}
                    <h1 className="text-2xl font-black tracking-tight text-white md:text-[2rem]">{title}</h1>
                    {subtitle ? (
                        <p className="mt-1 max-w-3xl text-sm text-gray-300 md:text-[15px]">
                            {subtitle}
                        </p>
                    ) : null}
                </div>
                {actions ? (
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:justify-end">
                        {actions}
                    </div>
                ) : null}
            </div>
        </header>
    );
}
