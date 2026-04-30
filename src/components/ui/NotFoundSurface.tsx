import Link from "next/link";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type NotFoundSurfaceProps = {
    eyebrow?: string;
    title?: string;
    detail?: string;
    className?: string;
    action?: ReactNode;
};

export const NOT_FOUND_COPY = {
    eyebrow: "404",
    title: "Page Unavailable",
    detail: "This page is unavailable. Return to KandyDrops to continue.",
};
export const NOT_FOUND_RETURN_HREF = "/dashboard";

export function NotFoundSurface({
    eyebrow = NOT_FOUND_COPY.eyebrow,
    title = NOT_FOUND_COPY.title,
    detail = NOT_FOUND_COPY.detail,
    className,
    action,
}: NotFoundSurfaceProps) {
    return (
        <div
            className={cn("flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center bg-black px-4 py-12 text-center", className)}
            data-not-found-return-href={NOT_FOUND_RETURN_HREF}
            data-old-not-found-logo-removed="true"
        >
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-brand-purple/80">{eyebrow}</p>
            <h1 className="mb-4 text-3xl font-black text-white sm:text-5xl">{title}</h1>
            <p className="mb-8 max-w-md text-sm leading-6 text-gray-400 sm:text-base">{detail}</p>

            {action ?? (
                <Link
                    href={NOT_FOUND_RETURN_HREF}
                    className="inline-flex items-center justify-center rounded-full bg-brand-purple px-8 py-4 text-sm font-bold text-white shadow-lg shadow-brand-purple/20 transition-all active:scale-95 hover:text-white"
                >
                    Return to App
                </Link>
            )}
        </div>
    );
}
