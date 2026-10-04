"use client";

import { type ReactNode, useId, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface AdminDashboardModuleProps {
    title: string;
    description?: string;
    summary?: ReactNode;
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}

export function AdminDashboardModule({
    title,
    description,
    summary,
    defaultOpen = false,
    open,
    onOpenChange,
    actions,
    children,
    className,
}: AdminDashboardModuleProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const contentId = useId();
    const resolvedOpen = typeof open === "boolean" ? open : isOpen;

    const handleOpenChange = (nextOpen: boolean) => {
        if (typeof open !== "boolean") {
            setIsOpen(nextOpen);
        }
        onOpenChange?.(nextOpen);
    };

    return (
        <section
            className={cn("min-w-0 space-y-4 border-t border-border pt-5", className)}
            data-admin-dashboard-module={title}
            aria-labelledby={contentId + "-title"}
        >
            <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 basis-48">
                    <h2 id={contentId + "-title"} className="wrap-anywhere text-xl font-semibold tracking-tight">{title}</h2>
                    {description ? <p className="mt-1 wrap-anywhere text-sm leading-6 text-muted-foreground">{description}</p> : null}
                    {summary ? <div className="mt-3 flex min-w-0 max-w-full flex-wrap gap-x-4 gap-y-2">{summary}</div> : null}
                </div>
                <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">
                    {actions ? <div className="hidden max-w-full flex-wrap items-center gap-2 md:flex">{actions}</div> : null}
                    <Button variant="ghost" size="icon"
                        type="button"
                        onClick={() => handleOpenChange(!resolvedOpen)}
                        aria-expanded={resolvedOpen}
                        aria-controls={contentId}
                        aria-label={`${resolvedOpen ? "Collapse" : "Expand"} ${title}`}
                        className="inline-flex h-11 w-11 items-center justify-center"
                    >
                        <ChevronDown aria-hidden="true" className={cn("h-4 w-4 transition-transform duration-200 motion-reduce:transition-none", resolvedOpen ? "rotate-180" : "rotate-0")} />
                    </Button>
                </div>
            </header>
            {resolvedOpen ? (
                <div id={contentId} className="min-w-0 space-y-4">
                    {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2 md:hidden">{actions}</div> : null}
                    {children}
                </div>
            ) : null}
        </section>
    );
}
