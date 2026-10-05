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

/** Intrinsic two-column detail composition; no viewport state or fetching. */
export function DetailLayout({ className, ...props }: ComponentProps<"div">) {
    return <div className={cn("grid min-w-0 items-start gap-8 md:grid-cols-2 md:gap-10", className)} {...props} />;
}

export function DetailGroup({ title, children, className, ...props }: ComponentProps<"section"> & { title: string }) {
    return (
        <section aria-label={title} className={cn("min-w-0 space-y-3 border-b border-border pb-6 last:border-b-0", className)} {...props}>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            {children}
        </section>
    );
}

/** Caller supplies the shell-owned clearance; this primitive owns material only. */
export function StickyActionDock({ className, ...props }: ComponentProps<"div">) {
    return <div className={cn("navigation-material sticky z-30 mt-8 min-w-0 rounded-2xl p-3 md:p-4", className)} {...props} />;
}

/** One opaque boundary for a collection; row dividers carry the hierarchy. */
export function GroupedList({ className, ...props }: ComponentProps<"div">) {
    return <div className={cn("min-w-0 overflow-hidden rounded-2xl bg-card text-card-foreground divide-y divide-border", className)} {...props} />;
}

export function GroupedRow({ className, ...props }: ComponentProps<"article">) {
    return <article className={cn("flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4", className)} {...props} />;
}

/** Values and labels are caller-owned; this primitive has no balance math. */
export function ValuePair({ values, className, ...props }: ComponentProps<"dl"> & {
    values: readonly { label: string; value: ReactNode }[];
}) {
    return (
        <dl className={cn("grid min-w-0 grid-cols-2 divide-x divide-border rounded-2xl bg-card text-card-foreground", className)} {...props}>
            {values.map(({ label, value }) => (
                <div key={label} className="min-w-0 px-4 py-3">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-1 break-words text-2xl font-semibold tracking-tight tabular-nums text-foreground md:text-3xl">{value}</dd>
                </div>
            ))}
        </dl>
    );
}
