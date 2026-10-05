import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Content spacing is intrinsic; shell navigation reservation remains in RootLayout. */
export function ContentFrame({ className, ...props }: ComponentProps<"div">) {
    return <div className={cn("mx-auto w-full min-w-0 max-w-7xl px-4 py-8 md:px-6 md:py-12", className)} {...props} />;
}

export function ContentSection({ className, ...props }: ComponentProps<"section">) {
    return <section className={cn("min-w-0 space-y-6 scroll-mt-24", className)} {...props} />;
}

export function SectionHeader({ title, description, accessory, headingId, level = 2 }: {
    title: ReactNode;
    description?: ReactNode;
    accessory?: ReactNode;
    headingId?: string;
    level?: 1 | 2 | 3;
}) {
    const Heading = level === 1 ? "h1" : level === 3 ? "h3" : "h2";
    return (
        <header className="flex min-w-0 flex-wrap items-baseline justify-between gap-4">
            <div className="min-w-0 space-y-2">
                <Heading id={headingId} className={cn("font-semibold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere]", level === 1 ? "text-3xl md:text-4xl" : "text-2xl")}>{title}</Heading>
                {description ? <p className="max-w-xl text-base leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{description}</p> : null}
            </div>
            {accessory ? <div className="min-w-0 text-sm text-muted-foreground">{accessory}</div> : null}
        </header>
    );
}

export function ContentGrid({ className, ...props }: ComponentProps<"div">) {
    return <div className={cn("grid min-w-0 items-stretch gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))]", className)} {...props} />;
}
