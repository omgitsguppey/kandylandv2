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
                "mb-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(178,140,255,0.18),rgba(0,0,0,0.12)_48%,rgba(0,0,0,0.9)_100%)] px-5 py-6 shadow-xl shadow-black/20 md:mb-8 md:px-8 md:py-8",
                className
            )}
        >
            {topSlot ? <div className="mb-4 flex justify-center">{topSlot}</div> : null}
            <div className={cn("mx-auto flex max-w-3xl flex-col items-center text-center", contentClassName)}>
                {eyebrow ? (
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-purple">
                        {eyebrow}
                    </p>
                ) : null}
                <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">{title}</h1>
                {subtitle ? (
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400 md:text-base">
                        {subtitle}
                    </p>
                ) : null}
            </div>
            {actions ? (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                    {actions}
                </div>
            ) : null}
        </header>
    );
}
