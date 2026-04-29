import { CandyIcon } from "@/components/ui/Icon";
import { LegalBackLink } from "@/components/Legal/LegalBackLink";
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
    detail: "This route is not available. Return to KandyDrops or use navigation to continue.",
};

export function NotFoundSurface({
    eyebrow = NOT_FOUND_COPY.eyebrow,
    title = NOT_FOUND_COPY.title,
    detail = NOT_FOUND_COPY.detail,
    className,
    action,
}: NotFoundSurfaceProps) {
    return (
        <div className={cn("flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center bg-black px-4 py-12 text-center", className)}>
            <div className="relative mb-7">
                <div className="absolute inset-0 rounded-full bg-brand-purple/15 blur-3xl" aria-hidden="true" />
                <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
                    <CandyIcon className="h-12 w-12 text-brand-purple/70" />
                </div>
            </div>

            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-brand-purple/80">{eyebrow}</p>
            <h1 className="mb-4 text-3xl font-black text-white sm:text-5xl">{title}</h1>
            <p className="mb-8 max-w-md text-sm leading-6 text-gray-400 sm:text-base">{detail}</p>

            {action ?? (
                <LegalBackLink
                    variant="button"
                    signedInLabel="Return to App"
                    signedOutLabel="Return Home"
                />
            )}
        </div>
    );
}
